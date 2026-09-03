import { Router } from 'express';
import { register, login, getMe } from '../controllers/auth.controller';
import { getInvitationByToken, acceptInvitation } from '../controllers/teamController';
import { authenticateJWT } from '../middlewares/auth.middleware';
import { validateBody } from '../middlewares/validate.middleware';
import { loginSchema, registerSchema } from '../schemas/auth.schema';
import { acceptInvitationSchema } from '../schemas/team.schema';

const router = Router();

router.post('/register', validateBody(registerSchema), register);
router.post('/login', validateBody(loginSchema), login);
router.get('/me', authenticateJWT, getMe);

// Public Invitation Endpoints
router.get('/invitation/:token', getInvitationByToken);
router.post('/accept-invitation', validateBody(acceptInvitationSchema), acceptInvitation);

export default router;
