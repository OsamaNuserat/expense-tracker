import { Router } from 'express';
import * as summaryController from '../controllers/summary.controller';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

/**
 * @swagger
 * /summary/expenses:
 *   get:
 *     summary: Get expense summary
 *     description: Retrieves expense analytics for a specified period
 *     tags: [Summary]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Start date (ISO format)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: End date (ISO format)
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [day, week, month, year]
 *         description: Period for summary
 *     responses:
 *       200:
 *         description: Expense summary retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalAmount:
 *                   type: number
 *                   format: float
 *                   example: 1250.75
 *                 transactionCount:
 *                   type: integer
 *                   example: 45
 *                 period:
 *                   type: object
 *                   properties:
 *                     startDate:
 *                       type: string
 *                       format: date-time
 *                       example: "2025-06-01T00:00:00Z"
 *                     endDate:
 *                       type: string
 *                       format: date-time
 *                       example: "2025-06-30T23:59:59Z"
 *                 trends:
 *                   type: object
 *                   properties:
 *                     previousPeriod:
 *                       type: number
 *                       format: float
 *                       example: 1100.50
 *                     changePercentage:
 *                       type: number
 *                       format: float
 *                       example: 13.65
 *                     trend:
 *                       type: string
 *                       enum: [increasing, decreasing, stable]
 *                       example: "increasing"
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/expenses', asyncHandler(summaryController.getExpenseSummary));

/**
 * @swagger
 * /summary/incomes:
 *   get:
 *     summary: Get income summary
 *     description: Retrieves income analytics for a specified period
 *     tags: [Summary]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Start date (ISO format)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: End date (ISO format)
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [day, week, month, year]
 *         description: Period for summary
 *     responses:
 *       200:
 *         description: Income summary retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalAmount:
 *                   type: number
 *                   format: float
 *                   example: 3500.00
 *                 transactionCount:
 *                   type: integer
 *                   example: 12
 *                 period:
 *                   type: object
 *                   properties:
 *                     startDate:
 *                       type: string
 *                       format: date-time
 *                     endDate:
 *                       type: string
 *                       format: date-time
 *                 trends:
 *                   type: object
 *                   properties:
 *                     previousPeriod:
 *                       type: number
 *                       format: float
 *                     changePercentage:
 *                       type: number
 *                       format: float
 *                     trend:
 *                       type: string
 *                       enum: [increasing, decreasing, stable]
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/incomes', asyncHandler(summaryController.getIncomeSummary));

/**
 * @swagger
 * /summary/expenses/by-category:
 *   get:
 *     summary: Get expenses by category
 *     description: Retrieves expense breakdown by category
 *     tags: [Summary]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Start date (ISO format)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: End date (ISO format)
 *     responses:
 *       200:
 *         description: Expenses by category retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 categories:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       categoryId:
 *                         type: integer
 *                         example: 1
 *                       categoryName:
 *                         type: string
 *                         example: "Food & Dining"
 *                       totalAmount:
 *                         type: number
 *                         format: float
 *                         example: 450.25
 *                       transactionCount:
 *                         type: integer
 *                         example: 18
 *                       percentage:
 *                         type: number
 *                         format: float
 *                         example: 36.02
 *                 totalAmount:
 *                   type: number
 *                   format: float
 *                   example: 1250.75
 *                 period:
 *                   type: object
 *                   properties:
 *                     startDate:
 *                       type: string
 *                       format: date-time
 *                     endDate:
 *                       type: string
 *                       format: date-time
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/expenses/by-category', asyncHandler(summaryController.getExpensesByCategory));

/**
 * @swagger
 * /summary/incomes/by-category:
 *   get:
 *     summary: Get incomes by category
 *     description: Retrieves income breakdown by category
 *     tags: [Summary]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Start date (ISO format)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: End date (ISO format)
 *     responses:
 *       200:
 *         description: Incomes by category retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 categories:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       categoryId:
 *                         type: integer
 *                       categoryName:
 *                         type: string
 *                       totalAmount:
 *                         type: number
 *                         format: float
 *                       transactionCount:
 *                         type: integer
 *                       percentage:
 *                         type: number
 *                         format: float
 *                 totalAmount:
 *                   type: number
 *                   format: float
 *                 period:
 *                   type: object
 *                   properties:
 *                     startDate:
 *                       type: string
 *                       format: date-time
 *                     endDate:
 *                       type: string
 *                       format: date-time
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/incomes/by-category', asyncHandler(summaryController.getIncomesByCategory));

export default router;
