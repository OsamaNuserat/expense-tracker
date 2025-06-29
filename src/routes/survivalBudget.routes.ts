import { Router } from 'express';
import * as survivalBudget from '../controllers/survivalBudget.controller';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

/**
 * @swagger
 * /budget/survival:
 *   post:
 *     summary: Create survival budget
 *     description: Sets up a survival budget for a specific period
 *     tags: [Survival Budget]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - amount
 *               - startDate
 *               - endDate
 *             properties:
 *               amount:
 *                 type: number
 *                 format: float
 *                 example: 1000.00
 *               startDate:
 *                 type: string
 *                 format: date-time
 *                 example: "2025-07-01T00:00:00Z"
 *               endDate:
 *                 type: string
 *                 format: date-time
 *                 example: "2025-07-31T23:59:59Z"
 *     responses:
 *       201:
 *         description: Survival budget created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SurvivalBudget'
 *       400:
 *         description: Invalid input data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/', asyncHandler(survivalBudget.createSurvivalBudget));

/**
 * @swagger
 * /budget/survival:
 *   get:
 *     summary: Get survival budget
 *     description: Retrieves current survival budget with spending progress
 *     tags: [Survival Budget]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: date
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Specific date to check budget for
 *     responses:
 *       200:
 *         description: Survival budget retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SurvivalBudget'
 *       404:
 *         description: No survival budget found for the specified period
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/', asyncHandler(survivalBudget.getSurvivalBudget));

export default router;
