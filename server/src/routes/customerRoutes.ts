import { Router } from 'express';
import {
  getCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  addFollowUpNote,
} from '../controllers/customerController';
import { authenticateJWT, authorizeRoles, Role } from '../middlewares/auth.middleware';
import { validateBody } from '../middlewares/validate.middleware';
import {
  createCustomerSchema,
  updateCustomerSchema,
  createFollowUpSchema,
} from '../schemas/customer.schema';

const router = Router();

router.use(authenticateJWT);

router.get('/', authorizeRoles('ADMIN', 'SALES', 'ACCOUNTS'), getCustomers);
router.get('/:id', authorizeRoles('ADMIN', 'SALES', 'ACCOUNTS'), getCustomerById);
router.post('/', authorizeRoles('ADMIN', 'SALES'), validateBody(createCustomerSchema), createCustomer);
router.put('/:id', authorizeRoles('ADMIN', 'SALES'), validateBody(updateCustomerSchema), updateCustomer);
router.post('/:id/follow-ups', authorizeRoles('ADMIN', 'SALES'), validateBody(createFollowUpSchema), addFollowUpNote);

export default router;
