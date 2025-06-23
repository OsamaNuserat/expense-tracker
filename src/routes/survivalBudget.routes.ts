import { Router } from 'express';
import * as survivalBudget from '../controllers/survivalBudget.controller';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

router.post('/', asyncHandler(survivalBudget.createSurvivalBudget));
router.get('/', asyncHandler(survivalBudget.getSurvivalBudget));

export default router;
