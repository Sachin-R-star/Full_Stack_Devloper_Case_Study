import { Router } from 'express';
import {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  adjustStock,
  getStockMovements,
} from '../controllers/productController';
import { authenticateJWT, authorizeRoles } from '../middlewares/auth';
import { Role } from '@prisma/client';

const router = Router();

router.use(authenticateJWT);

router.get('/', authorizeRoles(Role.ADMIN, Role.SALES, Role.WAREHOUSE, Role.ACCOUNTS), getProducts);
router.get('/movements', authorizeRoles(Role.ADMIN, Role.SALES, Role.WAREHOUSE, Role.ACCOUNTS), getStockMovements);
router.get('/:id', authorizeRoles(Role.ADMIN, Role.SALES, Role.WAREHOUSE, Role.ACCOUNTS), getProductById);
router.post('/', authorizeRoles(Role.ADMIN, Role.WAREHOUSE), createProduct);
router.put('/:id', authorizeRoles(Role.ADMIN, Role.WAREHOUSE), updateProduct);
router.post('/:id/stock', authorizeRoles(Role.ADMIN, Role.WAREHOUSE), adjustStock);

export default router;
