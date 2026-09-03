import { z } from 'zod';

export const updateOrganizationSchema = z.object({
  name: z.string().trim().min(2, 'Organization name must be at least 2 characters long'),
});

export type UpdateOrganizationInput = z.infer<typeof updateOrganizationSchema>;
