import { Response, NextFunction } from 'express';
import { prisma } from '../config/db';
import { AuthRequest } from '../middlewares/auth.middleware';
import { AppError } from '../middlewares/error.middleware';

export const getProducts = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { search, category, lowStockOnly, page = '1', limit = '50' } = req.query;

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.max(1, Math.min(100, parseInt(limit as string, 10) || 50));
    const skip = (pageNum - 1) * limitNum;

    const where: any = {
      ...(req.user?.organizationId && { organizationId: req.user.organizationId }),
    };

    if (search) {
      const query = (search as string).trim();
      where.OR = [
        { name: { contains: query } },
        { sku: { contains: query } },
        { category: { contains: query } },
      ];
    }

    if (category) {
      where.category = category as string;
    }

    const [total, products] = await Promise.all([
      prisma.product.count({ where }),
      prisma.product.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { name: 'asc' },
      }),
    ]);

    const enrichedProducts = products
      .map((p) => ({
        ...p,
        isLowStock: p.currentStock <= p.minimumStock,
      }))
      .filter((p) => (lowStockOnly === 'true' ? p.isLowStock : true));

    return res.json({
      status: 'success',
      data: enrichedProducts,
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

export const getProductById = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const product = await prisma.product.findFirst({
      where: {
        id,
        ...(req.user?.organizationId && { organizationId: req.user.organizationId }),
      },
      include: {
        stockMovements: {
          include: {
            createdBy: { select: { id: true, name: true, role: true } },
          },
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
    });

    if (!product) {
      return next(new AppError('Product not found in catalog', 404));
    }

    return res.json({
      status: 'success',
      product: {
        ...product,
        isLowStock: product.currentStock <= product.minimumStock,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const createProduct = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return next(new AppError('Authentication required', 401));
    }

    const {
      name,
      sku,
      category,
      unitPrice,
      initialStock = 0,
      minimumStock = 10,
      warehouseLocation,
    } = req.body;

    const organizationId = req.user.organizationId;
    const formattedSku = sku.toUpperCase().trim();

    const existingSku = await prisma.product.findFirst({
      where: { organizationId, sku: formattedSku },
    });
    if (existingSku) {
      return next(new AppError(`Product SKU '${sku}' already exists in catalog.`, 400));
    }

    const parsedPrice = parseFloat(unitPrice);
    const parsedStock = parseInt(initialStock, 10) || 0;
    const parsedMinStock = parseInt(minimumStock, 10) || 10;

    const product = await prisma.$transaction(async (tx) => {
      const created = await tx.product.create({
        data: {
          organizationId,
          name: name.trim(),
          sku: formattedSku,
          category: category.trim(),
          unitPrice: parsedPrice,
          currentStock: parsedStock,
          minimumStock: parsedMinStock,
          warehouseLocation: warehouseLocation.trim(),
        },
      });

      if (parsedStock > 0) {
        await tx.stockMovement.create({
          data: {
            organizationId,
            productId: created.id,
            quantityChanged: parsedStock,
            movementType: 'IN',
            reason: 'Initial Product Stock Entry',
            createdById: req.user!.id,
          },
        });
      }

      return created;
    });

    return res.status(201).json({
      status: 'success',
      message: 'Product created successfully',
      product,
    });
  } catch (error) {
    next(error);
  }
};

export const updateProduct = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    const organizationId = req.user?.organizationId;

    const existing = await prisma.product.findFirst({
      where: {
        id,
        ...(organizationId && { organizationId }),
      },
    });
    if (!existing) {
      return next(new AppError('Product not found in catalog', 404));
    }

    if (updateData.sku && updateData.sku.toUpperCase().trim() !== existing.sku) {
      const formattedSku = updateData.sku.toUpperCase().trim();
      const skuCheck = await prisma.product.findFirst({
        where: {
          organizationId: existing.organizationId,
          sku: formattedSku,
        },
      });
      if (skuCheck) {
        return next(new AppError(`SKU '${updateData.sku}' is already in use by another product.`, 400));
      }
    }

    const updated = await prisma.product.update({
      where: { id },
      data: {
        ...(updateData.name && { name: updateData.name.trim() }),
        ...(updateData.sku && { sku: updateData.sku.toUpperCase().trim() }),
        ...(updateData.category && { category: updateData.category.trim() }),
        ...(updateData.unitPrice !== undefined && { unitPrice: parseFloat(updateData.unitPrice) }),
        ...(updateData.minimumStock !== undefined && { minimumStock: parseInt(updateData.minimumStock, 10) }),
        ...(updateData.warehouseLocation && { warehouseLocation: updateData.warehouseLocation.trim() }),
      },
    });

    return res.json({
      status: 'success',
      message: 'Product updated successfully',
      product: updated,
    });
  } catch (error) {
    next(error);
  }
};
