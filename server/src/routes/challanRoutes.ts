import { Router } from 'express';
import {
  getChallans,
  getChallanById,
  createChallan,
  updateChallan,
} from '../controllers/challanController';
import { authenticateJWT, authorizeRoles } from '../middlewares/auth.middleware';
import { validateBody } from '../middlewares/validate.middleware';
import { createChallanSchema, updateChallanSchema } from '../schemas/challan.schema';
import { Role } from '@prisma/client';

const router = Router();

router.use(authenticateJWT);

router.get('/', authorizeRoles(Role.ADMIN, Role.SALES, Role.WAREHOUSE, Role.ACCOUNTS), getChallans);
router.get('/:id', authorizeRoles(Role.ADMIN, Role.SALES, Role.WAREHOUSE, Role.ACCOUNTS), getChallanById);
router.post('/', authorizeRoles(Role.ADMIN, Role.SALES), validateBody(createChallanSchema), createChallan);
router.put('/:id', authorizeRoles(Role.ADMIN, Role.SALES, Role.ACCOUNTS), validateBody(updateChallanSchema), updateChallan);

export default router;
