import { Router } from 'express';
import {
  getMyOrganization,
  updateMyOrganization,
} from '../controllers/organizationController';
import {
  getTeamMembers,
  createInvitation,
  updateMemberRole,
  removeMember,
  revokeInvitation,
} from '../controllers/teamController';
import {
  getSubscriptionDetails,
  updateSubscriptionPlan,
} from '../controllers/subscriptionController';
import { authenticateJWT, authorizeRoles } from '../middlewares/auth.middleware';
import { validateBody } from '../middlewares/validate.middleware';
import { updateOrganizationSchema } from '../schemas/organization.schema';
import { inviteUserSchema, updateMemberRoleSchema } from '../schemas/team.schema';

const router = Router();

router.use(authenticateJWT);

// Organization Profile
router.get('/me', getMyOrganization);
router.put('/me', authorizeRoles('ADMIN'), validateBody(updateOrganizationSchema), updateMyOrganization);

// Subscription & Billing
router.get('/subscription', getSubscriptionDetails);
router.put('/subscription', authorizeRoles('ADMIN'), updateSubscriptionPlan);

// Team Members & Invitations
router.get('/members', getTeamMembers);
router.post('/invitations', authorizeRoles('ADMIN'), validateBody(inviteUserSchema), createInvitation);
router.patch('/members/:id/role', authorizeRoles('ADMIN'), validateBody(updateMemberRoleSchema), updateMemberRole);
router.delete('/members/:id', authorizeRoles('ADMIN'), removeMember);
router.delete('/invitations/:id', authorizeRoles('ADMIN'), revokeInvitation);

export default router;
