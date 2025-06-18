import { Router } from 'express';
import * as summaryController from '../controllers/summary.controller';

const router = Router();

router.get('/expenses', summaryController.getExpenseSummary);
router.get('/incomes', summaryController.getIncomeSummary);
router.get('/expenses/by-category', summaryController.getExpensesByCategory);
router.get('/incomes/by-category', summaryController.getIncomesByCategory);

export default router;
