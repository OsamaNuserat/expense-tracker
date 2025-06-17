import { Router } from 'express';
import {
  getExpenseSummary,
  getIncomeSummary,
  getExpensesByCategory,
  getIncomesByCategory,
} from '../controllers/summary.controller';

const router = Router();

router.get('/expenses', getExpenseSummary);
router.get('/incomes', getIncomeSummary);
router.get('/expenses/by-category', getExpensesByCategory);
router.get('/incomes/by-category', getIncomesByCategory);

export default router;
