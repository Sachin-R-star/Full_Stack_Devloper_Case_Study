import { Response, NextFunction } from 'express';
import { prisma } from '../config/db';
import { AuthRequest } from '../middlewares/auth.middleware';
import { AppError } from '../middlewares/error.middleware';

const generateChallanNumber = async (organizationId: string): Promise<string> => {
  const year = new Date().getFullYear();
  const prefix = `SCH-${year}-`;

  const lastChallan = await prisma.challan.findFirst({
    where: {
      organizationId,
      challanNumber: { startsWith: prefix },
    },
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

export const getChallans = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return next(new AppError('Authentication required', 401));
    }

    const organizationId = req.user.organizationId;
    const { status, customerId, search, page = '1', limit = '20' } = req.query;

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.max(1, Math.min(100, parseInt(limit as string, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const where: any = { organizationId };

    if (status) {
      where.status = status as string;
    }

    if (customerId) {
      where.customerId = customerId as string;
    }

    if (search) {
      const query = (search as string).trim();
      where.OR = [
        { challanNumber: { contains: query } },
        { customer: { name: { contains: query } } },
        { customer: { businessName: { contains: query } } },
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
      status: 'success',
      data: challans,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getChallanById = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return next(new AppError('Authentication required', 401));
    }

    const { id } = req.params;
    const organizationId = req.user.organizationId;

    const challan = await prisma.challan.findFirst({
      where: {
        id,
        organizationId,
      },
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
      return next(new AppError('Sales challan not found', 404));
    }

    return res.json({ status: 'success', challan });
  } catch (error) {
    next(error);
  }
};

export const createChallan = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return next(new AppError('Authentication required', 401));
    }

    const organizationId = req.user.organizationId;
    const { customerId, items, status = 'DRAFT' } = req.body;

    // Validate customer belongs to authenticated user's organization
    const customer = await prisma.customer.findFirst({
      where: { id: customerId, organizationId },
    });
    if (!customer) {
      return next(new AppError('Selected customer does not exist.', 404));
    }

    const result = await prisma.$transaction(async (tx) => {
      const productIds = items.map((i: any) => i.productId);
      
      // Validate products belong to authenticated user's organization
      const dbProducts = await tx.product.findMany({
        where: { organizationId, id: { in: productIds } },
      });

      const productMap = new Map(dbProducts.map((p) => [p.id, p]));

      let totalQuantity = 0;
      let totalAmount = 0;
      const challanItemsData: any[] = [];

      for (const item of items) {
        const product = productMap.get(item.productId);
        if (!product) {
          throw new AppError(`Product with ID '${item.productId}' not found.`, 404);
        }

        const qty = parseInt(item.quantity, 10);
        if (isNaN(qty) || qty <= 0) {
          throw new AppError(`Invalid quantity for product '${product.name}'.`, 400);
        }

        if (status === 'CONFIRMED' && product.currentStock < qty) {
          throw new AppError(
            `Insufficient stock for product '${product.name}' (SKU: ${product.sku}). Available: ${product.currentStock}, Requested: ${qty}. Transaction aborted to prevent negative stock.`,
            400
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

      const challanNumber = await generateChallanNumber(organizationId);

      const createdChallan = await tx.challan.create({
        data: {
          organizationId, // Derived strictly from authenticated JWT context
          challanNumber,
          customerId,
          status: status as string,
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
              organizationId,
              productId: item.productId,
              quantityChanged: item.quantity,
              movementType: 'OUT',
              reason: `Sales Challan Confirmation (${challanNumber})`,
              createdById: req.user!.id,
            },
          });
        }
      }

      return createdChallan;
    });

    return res.status(201).json({
      status: 'success',
      message: `Sales Challan ${result.challanNumber} created successfully (${result.status})`,
      challan: result,
    });
  } catch (error) {
    next(error);
  }
};

export const updateChallan = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return next(new AppError('Authentication required', 401));
    }

    const { id } = req.params;
    const organizationId = req.user.organizationId;
    const { status } = req.body;

    const updated = await prisma.$transaction(async (tx) => {
      const challan = await tx.challan.findFirst({
        where: { id, organizationId },
        include: { items: true },
      });

      if (!challan) {
        throw new AppError('Sales challan not found', 404);
      }

      const currentStatus = challan.status;
      const targetStatus = status;

      const isValidTransition =
        (currentStatus === 'DRAFT' && targetStatus === 'CONFIRMED') ||
        (currentStatus === 'DRAFT' && targetStatus === 'CANCELLED') ||
        (currentStatus === 'CONFIRMED' && targetStatus === 'CANCELLED');

      if (!isValidTransition) {
        throw new AppError(
          `Invalid status transition from '${currentStatus}' to '${targetStatus}'. Allowed transitions: DRAFT -> CONFIRMED, DRAFT -> CANCELLED, CONFIRMED -> CANCELLED.`,
          400
        );
      }

      // Transition: DRAFT -> CONFIRMED (Deducts stock atomically)
      if (currentStatus === 'DRAFT' && targetStatus === 'CONFIRMED') {
        for (const item of challan.items) {
          const product = await tx.product.findUnique({ where: { id: item.productId } });
          if (!product || product.currentStock < item.quantity) {
            throw new AppError(
              `Insufficient stock for item '${item.productNameSnapshot}'. Available: ${
                product?.currentStock || 0
              }, Requested: ${item.quantity}. Transaction aborted.`,
              400
            );
          }

          await tx.product.update({
            where: { id: item.productId },
            data: { currentStock: { decrement: item.quantity } },
          });

          await tx.stockMovement.create({
            data: {
              organizationId,
              productId: item.productId,
              quantityChanged: item.quantity,
              movementType: 'OUT',
              reason: `Sales Challan Confirmation (${challan.challanNumber})`,
              createdById: req.user!.id,
            },
          });
        }
      }

      // Transition: CONFIRMED -> CANCELLED (Restores stock atomically)
      if (currentStatus === 'CONFIRMED' && targetStatus === 'CANCELLED') {
        for (const item of challan.items) {
          await tx.product.update({
            where: { id: item.productId },
            data: { currentStock: { increment: item.quantity } },
          });

          await tx.stockMovement.create({
            data: {
              organizationId,
              productId: item.productId,
              quantityChanged: item.quantity,
              movementType: 'IN',
              reason: `Sales Challan Cancellation Restock (${challan.challanNumber})`,
              createdById: req.user!.id,
            },
          });
        }
      }

      const updatedChallan = await tx.challan.update({
        where: { id },
        data: { status: targetStatus as string },
        include: { customer: true, items: true },
      });

      return updatedChallan;
    });

    return res.json({
      status: 'success',
      message: `Challan ${updated.challanNumber} status updated to ${updated.status}`,
      challan: updated,
    });
  } catch (error) {
    next(error);
  }
};
