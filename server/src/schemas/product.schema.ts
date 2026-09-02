import { z } from 'zod';

export const createProductSchema = z.object({
  name: z.string().min(1, 'Product name is required'),
  sku: z.string().min(1, 'SKU is required'),
  category: z.string().min(1, 'Category is required'),
  unitPrice: z.number().positive('Unit price must be positive'),
  initialStock: z.number().int().nonnegative().optional().default(0),
  minimumStock: z.number().int().nonnegative().optional().default(10),
  warehouseLocation: z.string().min(1, 'Warehouse location is required'),
});

export const updateProductSchema = createProductSchema.partial();
