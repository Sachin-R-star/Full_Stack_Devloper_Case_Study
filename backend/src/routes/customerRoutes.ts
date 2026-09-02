import { Router } from 'express';
import {
  getCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  addFollowUpNote,
} from '../controllers/customerController';
import { authenticateJWT, authorizeRoles } from '../middlewares/auth';
import { Role } from '@prisma/client';

const router = Router();

router.use(authenticateJWT);

router.get('/', authorizeRoles(Role.ADMIN, Role.SALES, Role.ACCOUNTS), getCustomers);
router.get('/:id', authorizeRoles(Role.ADMIN, Role.SALES, Role.ACCOUNTS), getCustomerById);
router.post('/', authorizeRoles(Role.ADMIN, Role.SALES), createCustomer);
router.put('/:id', authorizeRoles(Role.ADMIN, Role.SALES), updateCustomer);
router.post('/:id/follow-ups', authorizeRoles(Role.ADMIN, Role.SALES), addFollowUpNote);

export default router;
