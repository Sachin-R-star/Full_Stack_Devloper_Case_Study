import { Router } from 'express';
import {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
} from '../controllers/productController';
import { authenticateJWT, authorizeRoles } from '../middlewares/auth.middleware';
import { validateBody } from '../middlewares/validate.middleware';
import { createProductSchema, updateProductSchema } from '../schemas/product.schema';
import { Role } from '@prisma/client';

const router = Router();

router.use(authenticateJWT);

router.get('/', authorizeRoles(Role.ADMIN, Role.SALES, Role.WAREHOUSE, Role.ACCOUNTS), getProducts);
router.get('/:id', authorizeRoles(Role.ADMIN, Role.SALES, Role.WAREHOUSE, Role.ACCOUNTS), getProductById);
router.post('/', authorizeRoles(Role.ADMIN, Role.WAREHOUSE), validateBody(createProductSchema), createProduct);
router.put('/:id', authorizeRoles(Role.ADMIN, Role.WAREHOUSE), validateBody(updateProductSchema), updateProduct);

export default router;
