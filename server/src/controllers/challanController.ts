import { Response } from 'express';
import { prisma } from '../config/db';
import { AuthRequest } from '../middlewares/auth.middleware';
import { ChallanStatus, StockMovementType } from '@prisma/client';

const generateChallanNumber = async (): Promise<string> => {
  const year = new Date().getFullYear();
  const prefix = `SCH-${year}-`;

  const lastChallan = await prisma.challan.findFirst({
    where: { challanNumber: { startsWith: prefix } },
    orderBy: { createdAt: 'desc' },
  });

  let nextSequence = 1;
  if (lastChallan) {
    const parts = lastChallan.challanNumber.split('-');
    const lastSeqStr = parts[parts.length - 1];
    const lastSeq = parseInt(lastSeqStr, 10);
    if (!isNaN(lastSeq)) {
      nextSequence = lastSeq + 1;
    }
  }

  const paddedSeq = String(nextSequence).padStart(4, '0');
  return `${prefix}${paddedSeq}`;
};

export const getChallans = async (req: AuthRequest, res: Response) => {
  try {
    const { status, customerId, search, page = '1', limit = '20' } = req.query;

    const pageNum = parseInt(page as string, 10) || 1;
    const limitNum = parseInt(limit as string, 10) || 20;
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};

    if (status) {
      where.status = status as ChallanStatus;
    }

    if (customerId) {
      where.customerId = customerId as string;
    }

    if (search) {
      const query = (search as string).trim();
      where.OR = [
        { challanNumber: { contains: query, mode: 'insensitive' } },
        { customer: { name: { contains: query, mode: 'insensitive' } } },
        { customer: { businessName: { contains: query, mode: 'insensitive' } } },
      ];
    }

    const [total, challans] = await Promise.all([
      prisma.challan.count({ where }),
      prisma.challan.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: { select: { id: true, name: true, businessName: true, mobile: true } },
          createdBy: { select: { id: true, name: true, role: true } },
          _count: { select: { items: true } },
        },
      }),
    ]);

    return res.json({
      data: challans,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error: any) {
    console.error('Error fetching sales challans:', error);
    return res.status(500).json({ message: 'Error fetching sales challans', error: error.message });
  }
};

export const getChallanById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const challan = await prisma.challan.findUnique({
      where: { id },
      include: {
        customer: true,
        createdBy: { select: { id: true, name: true, email: true, role: true } },
        items: {
          include: {
            product: { select: { id: true, currentStock: true, minimumStock: true } },
          },
        },
      },
    });

    if (!challan) {
      return res.status(404).json({ message: 'Sales challan not found' });
    }

    return res.json({ challan });
  } catch (error: any) {
    return res.status(500).json({ message: 'Error fetching challan details', error: error.message });
  }
};

export const createChallan = async (req: AuthRequest, res: Response) => {
  try {
    const { customerId, items, status = 'DRAFT' } = req.body;

    if (!customerId) {
      return res.status(400).json({ message: 'Customer ID is required.' });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'At least one product item is required.' });
    }

    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const customer = await prisma.customer.findUnique({ where: { id: customerId } });
    if (!customer) {
      return res.status(404).json({ message: 'Customer not found.' });
    }

    const result = await prisma.$transaction(async (tx) => {
      const productIds = items.map((i: any) => i.productId);
      const dbProducts = await tx.product.findMany({
        where: { id: { in: productIds } },
      });

      const productMap = new Map(dbProducts.map((p) => [p.id, p]));

      let totalQuantity = 0;
      let totalAmount = 0;
      const challanItemsData: any[] = [];

      for (const item of items) {
        const product = productMap.get(item.productId);
        if (!product) {
          throw new Error(`Product with ID '${item.productId}' not found.`);
        }

        const qty = parseInt(item.quantity, 10);
        if (status === 'CONFIRMED' && product.currentStock < qty) {
          throw new Error(
            `Insufficient stock for product '${product.name}' (SKU: ${product.sku}). Available: ${product.currentStock}, Requested: ${qty}.`
          );
        }

        const unitPriceNum = Number(product.unitPrice);
        const subtotal = unitPriceNum * qty;

        totalQuantity += qty;
        totalAmount += subtotal;

        challanItemsData.push({
          productId: product.id,
          productNameSnapshot: product.name,
          skuSnapshot: product.sku,
          unitPriceSnapshot: unitPriceNum,
          quantity: qty,
          subtotal: subtotal,
        });
      }

      const challanNumber = await generateChallanNumber();

      const createdChallan = await tx.challan.create({
        data: {
          challanNumber,
          customerId,
          status: status as ChallanStatus,
          totalQuantity,
          totalAmount,
          createdById: req.user!.id,
          items: {
            create: challanItemsData,
          },
        },
        include: {
          customer: true,
          items: true,
        },
      });

      if (status === 'CONFIRMED') {
        for (const item of challanItemsData) {
          await tx.product.update({
            where: { id: item.productId },
            data: {
              currentStock: { decrement: item.quantity },
            },
          });

          await tx.stockMovement.create({
            data: {
              productId: item.productId,
              quantityChanged: item.quantity,
              movementType: StockMovementType.OUT,
              reason: `Sales Challan Confirmation (${challanNumber})`,
              createdById: req.user!.id,
            },
          });
        }
      }

      return createdChallan;
    });

    return res.status(201).json({
      message: `Sales Challan ${result.challanNumber} created successfully (${result.status})`,
      challan: result,
    });
  } catch (error: any) {
    return res.status(400).json({ message: error.message || 'Error creating sales challan' });
  }
};

export const updateChallanStatus = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const challan = await tx.challan.findUnique({
        where: { id },
        include: { items: true },
      });

      if (!challan) {
        throw new Error('Sales challan not found');
      }

      if (challan.status === status) {
        return challan;
      }

      if (challan.status === 'DRAFT' && status === 'CONFIRMED') {
        for (const item of challan.items) {
          const product = await tx.product.findUnique({ where: { id: item.productId } });
          if (!product || product.currentStock < item.quantity) {
            throw new Error(`Insufficient stock for item '${item.productNameSnapshot}'`);
          }

          await tx.product.update({
            where: { id: item.productId },
            data: { currentStock: { decrement: item.quantity } },
          });

          await tx.stockMovement.create({
            data: {
              productId: item.productId,
              quantityChanged: item.quantity,
              movementType: StockMovementType.OUT,
              reason: `Sales Challan Confirmation (${challan.challanNumber})`,
              createdById: req.user!.id,
            },
          });
        }
      }

      if (challan.status === 'CONFIRMED' && status === 'CANCELLED') {
        for (const item of challan.items) {
          await tx.product.update({
            where: { id: item.productId },
            data: { currentStock: { increment: item.quantity } },
          });

          await tx.stockMovement.create({
            data: {
              productId: item.productId,
              quantityChanged: item.quantity,
              movementType: StockMovementType.IN,
              reason: `Sales Challan Cancellation Restock (${challan.challanNumber})`,
              createdById: req.user!.id,
            },
          });
        }
      }

      const updatedChallan = await tx.challan.update({
        where: { id },
        data: { status: status as ChallanStatus },
        include: { customer: true, items: true },
      });

      return updatedChallan;
    });

    return res.json({
      message: `Challan ${updated.challanNumber} status updated to ${updated.status}`,
      challan: updated,
    });
  } catch (error: any) {
    return res.status(400).json({ message: error.message || 'Error updating challan status' });
  }
};
