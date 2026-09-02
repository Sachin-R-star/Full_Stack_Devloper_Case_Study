import { Router } from 'express';
import { getDashboardSummary } from '../controllers/reportController';
import { authenticateJWT } from '../middlewares/auth';

const router = Router();

router.use(authenticateJWT);
router.get('/dashboard', getDashboardSummary);

export default router;
