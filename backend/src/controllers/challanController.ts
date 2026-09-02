import { Response } from 'express';
import { prisma } from '../config/db';
import { AuthRequest } from '../middlewares/auth';
import { ChallanStatus, StockMovementType } from '@prisma/client';

// Auto-generate sequential challan number e.g. SCH-2026-0001
const generateChallanNumber = async (): Promise<string> => {
  const year = new Date().getFullYear();
  const prefix = `SCH-${year}-`;

  const lastChallan = await prisma.salesChallan.findFirst({
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
      prisma.salesChallan.count({ where }),
      prisma.salesChallan.findMany({
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

    const challan = await prisma.salesChallan.findUnique({
      where: { id },
      include: {
        customer: true,
        createdBy: { select: { id: true, name: true, email: true, role: true } },
        items: {
          include: {
            product: { select: { id: true, currentStock: true, minStockAlertQty: true } },
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

    // Verify Customer exists
    const customer = await prisma.customer.findUnique({ where: { id: customerId } });
    if (!customer) {
      return res.status(404).json({ message: 'Customer not found.' });
    }

    // Validate status parameter
    if (!['DRAFT', 'CONFIRMED'].includes(status)) {
      return res.status(400).json({ message: "Initial status must be 'DRAFT' or 'CONFIRMED'." });
    }

    // Run database transaction to create challan and update stock if confirmed
    const result = await prisma.$transaction(async (tx) => {
      // Fetch products to snapshot data and check stock availability
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
        if (isNaN(qty) || qty <= 0) {
          throw new Error(`Invalid quantity for product '${product.name}'. Must be greater than 0.`);
        }

        // If status is CONFIRMED, check stock sufficiency
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
          snapshotName: product.name,
          snapshotSku: product.sku,
          snapshotPrice: unitPriceNum,
          quantity: qty,
          subtotal: subtotal,
        });
      }

      const challanNumber = await generateChallanNumber();

      // Create Challan with items
      const createdChallan = await tx.salesChallan.create({
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

      // If CONFIRMED, update inventory stock and write audit logs
      if (status === 'CONFIRMED') {
        for (const item of challanItemsData) {
          await tx.product.update({
            where: { id: item.productId },
            data: {
              currentStock: { decrement: item.quantity },
            },
          });

          await tx.stockMovementLog.create({
            data: {
              productId: item.productId,
              quantity: item.quantity,
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

    if (!status || !['DRAFT', 'CONFIRMED', 'CANCELLED'].includes(status)) {
      return res.status(400).json({ message: "Status must be 'DRAFT', 'CONFIRMED', or 'CANCELLED'." });
    }

    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const challan = await tx.salesChallan.findUnique({
        where: { id },
        include: { items: true },
      });

      if (!challan) {
        throw new Error('Sales challan not found');
      }

      if (challan.status === status) {
        return challan;
      }

      if (challan.status === 'CANCELLED') {
        throw new Error('Cancelled challans cannot be reactivated or changed.');
      }

      // Transition from DRAFT to CONFIRMED
      if (challan.status === 'DRAFT' && status === 'CONFIRMED') {
        for (const item of challan.items) {
          const product = await tx.product.findUnique({ where: { id: item.productId } });
          if (!product) {
            throw new Error(`Product '${item.snapshotName}' no longer exists.`);
          }
          if (product.currentStock < item.quantity) {
            throw new Error(
              `Insufficient stock for product '${product.name}' (SKU: ${product.sku}). Available: ${product.currentStock}, Requested: ${item.quantity}.`
            );
          }

          // Deduct stock
          await tx.product.update({
            where: { id: item.productId },
            data: { currentStock: { decrement: item.quantity } },
          });

          // Log stock OUT
          await tx.stockMovementLog.create({
            data: {
              productId: item.productId,
              quantity: item.quantity,
              movementType: StockMovementType.OUT,
              reason: `Sales Challan Confirmation (${challan.challanNumber})`,
              createdById: req.user!.id,
            },
          });
        }
      }

      // Transition from CONFIRMED to CANCELLED (Restock items)
      if (challan.status === 'CONFIRMED' && status === 'CANCELLED') {
        for (const item of challan.items) {
          // Restore stock
          await tx.product.update({
            where: { id: item.productId },
            data: { currentStock: { increment: item.quantity } },
          });

          // Log stock IN
          await tx.stockMovementLog.create({
            data: {
              productId: item.productId,
              quantity: item.quantity,
              movementType: StockMovementType.IN,
              reason: `Sales Challan Cancellation Restock (${challan.challanNumber})`,
              createdById: req.user!.id,
            },
          });
        }
      }

      const updatedChallan = await tx.salesChallan.update({
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
