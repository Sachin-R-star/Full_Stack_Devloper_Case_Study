import { Router } from 'express';
import {
  getStockMovements,
  createStockMovement,
} from '../controllers/inventoryController';
import { authenticateJWT, authorizeRoles } from '../middlewares/auth.middleware';
import { validateBody } from '../middlewares/validate.middleware';
import { createStockMovementSchema } from '../schemas/inventory.schema';

const router = Router();

router.use(authenticateJWT);

router.get('/movements', authorizeRoles('ADMIN', 'SALES', 'WAREHOUSE', 'ACCOUNTS'), getStockMovements);
router.post('/movements', authorizeRoles('ADMIN', 'WAREHOUSE'), validateBody(createStockMovementSchema), createStockMovement);

export default router;
