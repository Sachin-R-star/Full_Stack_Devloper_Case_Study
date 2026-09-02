import { z } from 'zod';

export const createStockMovementSchema = z.object({
  productId: z.string().uuid('Invalid Product ID'),
  quantityChanged: z.number().int().positive('Quantity must be greater than 0'),
  movementType: z.enum(['IN', 'OUT']),
  reason: z.string().min(1, 'Reason for movement is required'),
});
