import { Router } from 'express';
import {
  getCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  addFollowUpNote,
} from '../controllers/customerController';
import { authenticateJWT, authorizeRoles } from '../middlewares/auth.middleware';
import { validateBody } from '../middlewares/validate.middleware';
import {
  createCustomerSchema,
  updateCustomerSchema,
  createFollowUpSchema,
} from '../schemas/customer.schema';
import { Role } from '@prisma/client';

const router = Router();

router.use(authenticateJWT);

router.get('/', authorizeRoles(Role.ADMIN, Role.SALES, Role.ACCOUNTS), getCustomers);
router.get('/:id', authorizeRoles(Role.ADMIN, Role.SALES, Role.ACCOUNTS), getCustomerById);
router.post('/', authorizeRoles(Role.ADMIN, Role.SALES), validateBody(createCustomerSchema), createCustomer);
router.put('/:id', authorizeRoles(Role.ADMIN, Role.SALES), validateBody(updateCustomerSchema), updateCustomer);
router.post('/:id/follow-ups', authorizeRoles(Role.ADMIN, Role.SALES), validateBody(createFollowUpSchema), addFollowUpNote);

export default router;
