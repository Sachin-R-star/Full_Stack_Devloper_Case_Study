import { Router } from 'express';
import { login, getMe } from '../controllers/auth.controller';
import { authenticateJWT } from '../middlewares/auth.middleware';
import { validateBody } from '../middlewares/validate.middleware';
import { loginSchema } from '../schemas/auth.schema';

const router = Router();

router.post('/login', validateBody(loginSchema), login);
router.get('/me', authenticateJWT, getMe);

export default router;
