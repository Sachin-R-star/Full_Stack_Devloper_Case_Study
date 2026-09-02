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

const router = Router();

router.use(authenticateJWT);

router.get('/', authorizeRoles('ADMIN', 'SALES', 'WAREHOUSE', 'ACCOUNTS'), getChallans);
router.get('/:id', authorizeRoles('ADMIN', 'SALES', 'WAREHOUSE', 'ACCOUNTS'), getChallanById);
router.post('/', authorizeRoles('ADMIN', 'SALES'), validateBody(createChallanSchema), createChallan);
router.put('/:id', authorizeRoles('ADMIN', 'SALES', 'ACCOUNTS'), validateBody(updateChallanSchema), updateChallan);

export default router;
