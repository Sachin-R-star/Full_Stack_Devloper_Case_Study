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

const router = Router();

router.use(authenticateJWT);

router.get('/', authorizeRoles('ADMIN', 'SALES', 'WAREHOUSE', 'ACCOUNTS'), getProducts);
router.get('/:id', authorizeRoles('ADMIN', 'SALES', 'WAREHOUSE', 'ACCOUNTS'), getProductById);
router.post('/', authorizeRoles('ADMIN', 'WAREHOUSE'), validateBody(createProductSchema), createProduct);
router.put('/:id', authorizeRoles('ADMIN', 'WAREHOUSE'), validateBody(updateProductSchema), updateProduct);

export default router;
