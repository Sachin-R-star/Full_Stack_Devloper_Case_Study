import { z } from 'zod';

export const challanItemSchema = z.object({
  productId: z.string().uuid('Invalid Product ID'),
  quantity: z.number().int().positive('Quantity must be greater than 0'),
});

export const createChallanSchema = z.object({
  customerId: z.string().uuid('Invalid Customer ID'),
  items: z.array(challanItemSchema).min(1, 'At least one item is required in a challan'),
  status: z.enum(['DRAFT', 'CONFIRMED']).default('DRAFT'),
});

export const updateChallanSchema = z.object({
  status: z.enum(['DRAFT', 'CONFIRMED', 'CANCELLED']),
});
