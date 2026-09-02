import { Router } from 'express';
import {
  getChallans,
  getChallanById,
  createChallan,
  updateChallanStatus,
} from '../controllers/challanController';
import { authenticateJWT, authorizeRoles } from '../middlewares/auth';
import { Role } from '@prisma/client';

const router = Router();

router.use(authenticateJWT);

router.get('/', authorizeRoles(Role.ADMIN, Role.SALES, Role.WAREHOUSE, Role.ACCOUNTS), getChallans);
router.get('/:id', authorizeRoles(Role.ADMIN, Role.SALES, Role.WAREHOUSE, Role.ACCOUNTS), getChallanById);
router.post('/', authorizeRoles(Role.ADMIN, Role.SALES), createChallan);
router.patch('/:id/status', authorizeRoles(Role.ADMIN, Role.SALES, Role.ACCOUNTS), updateChallanStatus);

export default router;
