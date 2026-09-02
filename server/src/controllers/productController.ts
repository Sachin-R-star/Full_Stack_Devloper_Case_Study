import { Response } from 'express';
import { prisma } from '../config/db';
import { AuthRequest } from '../middlewares/auth.middleware';
import { StockMovementType } from '@prisma/client';

export const getProducts = async (req: AuthRequest, res: Response) => {
  try {
    const { search, category, lowStockOnly, page = '1', limit = '50' } = req.query;

    const pageNum = parseInt(page as string, 10) || 1;
    const limitNum = parseInt(limit as string, 10) || 50;
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};

    if (search) {
      const query = (search as string).trim();
      where.OR = [
        { name: { contains: query, mode: 'insensitive' } },
        { sku: { contains: query, mode: 'insensitive' } },
        { category: { contains: query, mode: 'insensitive' } },
      ];
    }

    if (category) {
      where.category = category;
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
      data: enrichedProducts,
      pagination: {
        total: enrichedProducts.length,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error: any) {
    console.error('Error fetching products:', error);
    return res.status(500).json({ message: 'Error fetching products', error: error.message });
  }
};

export const getProductById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const product = await prisma.product.findUnique({
      where: { id },
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
      return res.status(404).json({ message: 'Product not found' });
    }

    return res.json({
      product: {
        ...product,
        isLowStock: product.currentStock <= product.minimumStock,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ message: 'Error fetching product', error: error.message });
  }
};

export const createProduct = async (req: AuthRequest, res: Response) => {
  try {
    const { name, sku, category, unitPrice, initialStock = 0, minimumStock = 10, location, warehouseLocation } = req.body;

    if (!name || !sku || !category || unitPrice === undefined) {
      return res.status(400).json({ message: 'Name, SKU, category, unit price are required.' });
    }

    const existingSku = await prisma.product.findUnique({ where: { sku: sku.toUpperCase().trim() } });
    if (existingSku) {
      return res.status(400).json({ message: `SKU '${sku}' already exists.` });
    }

    const parsedPrice = parseFloat(unitPrice);
    const parsedStock = parseInt(initialStock, 10) || 0;
    const parsedMinStock = parseInt(minimumStock, 10) || 10;
    const loc = warehouseLocation || location || 'Warehouse Main';

    const product = await prisma.$transaction(async (tx) => {
      const created = await tx.product.create({
        data: {
          name: name.trim(),
          sku: sku.toUpperCase().trim(),
          category: category.trim(),
          unitPrice: parsedPrice,
          currentStock: parsedStock,
          minimumStock: parsedMinStock,
          warehouseLocation: loc.trim(),
        },
      });

      if (parsedStock > 0 && req.user) {
        await tx.stockMovement.create({
          data: {
            productId: created.id,
            quantityChanged: parsedStock,
            movementType: StockMovementType.IN,
            reason: 'Initial Product Stock Entry',
            createdById: req.user.id,
          },
        });
      }

      return created;
    });

    return res.status(201).json({ message: 'Product created successfully', product });
  } catch (error: any) {
    return res.status(500).json({ message: 'Error creating product', error: error.message });
  }
};

export const updateProduct = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { name, sku, category, unitPrice, minimumStock, location, warehouseLocation } = req.body;

    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ message: 'Product not found' });
    }

    const loc = warehouseLocation || location;

    const updated = await prisma.product.update({
      where: { id },
      data: {
        ...(name && { name: name.trim() }),
        ...(sku && { sku: sku.toUpperCase().trim() }),
        ...(category && { category: category.trim() }),
        ...(unitPrice !== undefined && { unitPrice: parseFloat(unitPrice) }),
        ...(minimumStock !== undefined && { minimumStock: parseInt(minimumStock, 10) }),
        ...(loc && { warehouseLocation: loc.trim() }),
      },
    });

    return res.json({ message: 'Product updated successfully', product: updated });
  } catch (error: any) {
    return res.status(500).json({ message: 'Error updating product', error: error.message });
  }
};

export const adjustStock = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { quantity, movementType, reason } = req.body;

    if (!quantity || !movementType || !reason) {
      return res.status(400).json({ message: 'Quantity, movementType (IN/OUT), and reason are required.' });
    }

    const qty = parseInt(quantity, 10);
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const result = await prisma.$transaction(async (tx) => {
      const product = await tx.product.findUnique({ where: { id } });
      if (!product) {
        throw new Error('Product not found');
      }

      let newStock = product.currentStock;
      if (movementType === 'IN') {
        newStock += qty;
      } else {
        if (product.currentStock < qty) {
          throw new Error(`Insufficient stock. Current stock is ${product.currentStock}`);
        }
        newStock -= qty;
      }

      const updatedProduct = await tx.product.update({
        where: { id },
        data: { currentStock: newStock },
      });

      const log = await tx.stockMovement.create({
        data: {
          productId: id,
          quantityChanged: qty,
          movementType: movementType as StockMovementType,
          reason: reason.trim(),
          createdById: req.user!.id,
        },
        include: {
          createdBy: { select: { id: true, name: true, role: true } },
        },
      });

      return { product: updatedProduct, log };
    });

    return res.json({ message: `Stock adjusted successfully`, ...result });
  } catch (error: any) {
    return res.status(400).json({ message: error.message || 'Error adjusting stock' });
  }
};

export const getStockMovements = async (req: AuthRequest, res: Response) => {
  try {
    const { productId, movementType, page = '1', limit = '50' } = req.query;

    const pageNum = parseInt(page as string, 10) || 1;
    const limitNum = parseInt(limit as string, 10) || 50;
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};
    if (productId) where.productId = productId as string;
    if (movementType) where.movementType = movementType as StockMovementType;

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
      data: logs,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error: any) {
    return res.status(500).json({ message: 'Error fetching stock movements', error: error.message });
  }
};
