import { Response, NextFunction } from 'express';
import { prisma } from '../config/db';
import { AuthRequest } from '../middlewares/auth.middleware';
import { AppError } from '../middlewares/error.middleware';

export const getStockMovements = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return next(new AppError('Authentication required', 401));
    }

    const organizationId = req.user.organizationId;
    const { productId, movementType, page = '1', limit = '50' } = req.query;

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.max(1, Math.min(100, parseInt(limit as string, 10) || 50));
    const skip = (pageNum - 1) * limitNum;

    const where: any = { organizationId };

    if (productId) where.productId = productId as string;
    if (movementType) where.movementType = movementType as string;

    const [total, logs] = await Promise.all([
      prisma.stockMovement.count({ where }),
      prisma.stockMovement.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
        include: {
          product: { select: { id: true, name: true, sku: true, category: true } },
          createdBy: { select: { id: true, name: true, role: true } },
        },
      }),
    ]);

    return res.json({
      status: 'success',
      data: logs,
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

export const createStockMovement = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return next(new AppError('Authentication required', 401));
    }

    const organizationId = req.user.organizationId;
    const { productId, quantityChanged, movementType, reason } = req.body;

    const qty = parseInt(quantityChanged, 10);

    const result = await prisma.$transaction(async (tx) => {
      const product = await tx.product.findFirst({
        where: { id: productId, organizationId },
      });
      if (!product) {
        throw new AppError('Product not found in catalog', 404);
      }

      let newStock = product.currentStock;
      if (movementType === 'IN') {
        newStock += qty;
      } else {
        if (product.currentStock < qty) {
          throw new AppError(
            `Insufficient stock for product '${product.name}' (SKU: ${product.sku}). Available stock: ${product.currentStock}, Requested OUT: ${qty}.`,
            400
          );
        }
        newStock -= qty;
      }

      const updatedProduct = await tx.product.update({
        where: { id: productId },
        data: { currentStock: newStock },
      });

      const movement = await tx.stockMovement.create({
        data: {
          organizationId, // Derived strictly from authenticated JWT context
          productId,
          quantityChanged: qty,
          movementType: movementType as 'IN' | 'OUT',
          reason: reason.trim(),
          createdById: req.user!.id,
        },
        include: {
          product: { select: { id: true, name: true, sku: true } },
          createdBy: { select: { id: true, name: true, role: true } },
        },
      });

      return { product: updatedProduct, movement };
    });

    return res.status(201).json({
      status: 'success',
      message: `Stock movement ${movementType} ${qty} recorded successfully`,
      ...result,
    });
  } catch (error) {
    next(error);
  }
};
