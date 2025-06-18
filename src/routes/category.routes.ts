import { Router } from 'express';
import * as categoryController from '../controllers/category.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.get('/', authenticate, categoryController.getCategories);
router.post('/' , authenticate, categoryController.addCategory)
router.put('/:id',authenticate, categoryController.updateCategory);
router.delete('/:id',authenticate, categoryController.deleteCategory);

export default router;
