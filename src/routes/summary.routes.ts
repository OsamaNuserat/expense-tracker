import { Router } from 'express';
import * as summaryController from '../controllers/summary.controller';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

router.get('/expenses', asyncHandler(summaryController.getExpenseSummary));
router.get('/incomes', asyncHandler(summaryController.getIncomeSummary));
router.get('/expenses/by-category', asyncHandler(summaryController.getExpensesByCategory));
router.get('/incomes/by-category', asyncHandler(summaryController.getIncomesByCategory));

export default router;
