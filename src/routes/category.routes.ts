import { Router } from 'express';
import {
  getCategories,
  updateCategory,
  deleteCategory,
} from '../controllers/category.controller';

const router = Router();

router.get('/', getCategories);
router.put('/:id', updateCategory);
router.delete('/:id', deleteCategory);

export default router;
