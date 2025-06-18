import { Router } from 'express';
import * as categoryController from '../controllers/category.controller';
import { authenticate } from '../middleware/auth.middleware';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

router.get('/', authenticate, asyncHandler(categoryController.getCategories));
router.post('/' , authenticate, asyncHandler(categoryController.addCategory))
router.put('/:id',authenticate, asyncHandler(categoryController.updateCategory));
router.delete('/:id',authenticate, asyncHandler(categoryController.deleteCategory));

export default router;
