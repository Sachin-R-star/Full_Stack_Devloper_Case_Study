import { Router } from 'express';
import {
  getStockMovements,
  createStockMovement,
} from '../controllers/inventoryController';
import { authenticateJWT, authorizeRoles } from '../middlewares/auth.middleware';
import { validateBody } from '../middlewares/validate.middleware';
import { createStockMovementSchema } from '../schemas/inventory.schema';
import { Role } from '@prisma/client';

const router = Router();

router.use(authenticateJWT);

router.get('/movements', authorizeRoles(Role.ADMIN, Role.SALES, Role.WAREHOUSE, Role.ACCOUNTS), getStockMovements);
router.post('/movements', authorizeRoles(Role.ADMIN, Role.WAREHOUSE), validateBody(createStockMovementSchema), createStockMovement);

export default router;
