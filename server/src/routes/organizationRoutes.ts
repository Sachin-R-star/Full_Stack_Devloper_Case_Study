import { Router } from 'express';
import {
  getMyOrganization,
  updateMyOrganization,
} from '../controllers/organizationController';
import { authenticateJWT, authorizeRoles } from '../middlewares/auth.middleware';
import { validateBody } from '../middlewares/validate.middleware';
import { updateOrganizationSchema } from '../schemas/organization.schema';

const router = Router();

router.use(authenticateJWT);

router.get('/me', getMyOrganization);
router.put('/me', authorizeRoles('ADMIN'), validateBody(updateOrganizationSchema), updateMyOrganization);

export default router;
