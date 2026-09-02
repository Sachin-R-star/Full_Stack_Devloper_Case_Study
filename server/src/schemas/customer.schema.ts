import { z } from 'zod';

export const createCustomerSchema = z.object({
  name: z.string().min(1, 'Customer name is required'),
  mobile: z.string().min(1, 'Mobile number is required'),
  email: z.string().email('Invalid email address').optional().nullable(),
  businessName: z.string().min(1, 'Business name is required'),
  gstNumber: z.string().optional().nullable(),
  customerType: z.enum(['RETAIL', 'WHOLESALE', 'DISTRIBUTOR']).default('RETAIL'),
  address: z.string().min(1, 'Address is required'),
  status: z.enum(['LEAD', 'ACTIVE', 'INACTIVE']).default('LEAD'),
  followUpDate: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const updateCustomerSchema = createCustomerSchema.partial();

export const createFollowUpSchema = z.object({
  note: z.string().min(1, 'Follow-up note content is required'),
  nextFollowUpDate: z.string().optional().nullable(),
});
