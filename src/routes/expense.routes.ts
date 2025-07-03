import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { asyncHandler } from '../utils/asyncHandler';
import {
  getExpenses,
  getExpense,
  createExpense,
  updateExpense,
  deleteExpense
} from '../controllers/expense.controller';

const router = Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     Expense:
 *       type: object
 *       required:
 *         - amount
 *         - categoryId
 *       properties:
 *         id:
 *           type: integer
 *           description: Unique identifier
 *         amount:
 *           type: number
 *           format: float
 *           description: Expense amount
 *           example: 25.50
 *         categoryId:
 *           type: integer
 *           description: Category ID
 *           example: 1
 *         merchant:
 *           type: string
 *           description: Merchant name
 *           example: "Starbucks"
 *         userId:
 *           type: integer
 *           description: User ID
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Creation timestamp
 *         category:
 *           type: object
 *           properties:
 *             id:
 *               type: integer
 *             name:
 *               type: string
 *             type:
 *               type: string
 *               enum: [EXPENSE, INCOME]
 */

/**
 * @swagger
 * /api/expenses:
 *   get:
 *     summary: Get all expenses
 *     tags: [Expenses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of items per page
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Start date filter
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: End date filter
 *       - in: query
 *         name: categoryId
 *         schema:
 *           type: integer
 *         description: Category ID filter
 *       - in: query
 *         name: merchant
 *         schema:
 *           type: string
 *         description: Merchant name filter
 *     responses:
 *       200:
 *         description: List of expenses
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 expenses:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Expense'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     total:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 *                     hasNext:
 *                       type: boolean
 *                     hasPrev:
 *                       type: boolean
 */
router.get('/', authenticate, asyncHandler(getExpenses));

/**
 * @swagger
 * /api/expenses:
 *   post:
 *     summary: Create a new expense
 *     tags: [Expenses]
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
 *               - categoryId
 *             properties:
 *               amount:
 *                 type: number
 *                 format: float
 *                 example: 25.50
 *               categoryId:
 *                 type: integer
 *                 example: 1
 *               merchant:
 *                 type: string
 *                 example: "Starbucks"
 *     responses:
 *       201:
 *         description: Expense created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Expense'
 *       400:
 *         description: Invalid input
 *       404:
 *         description: Category not found
 */
router.post('/', authenticate, asyncHandler(createExpense));

/**
 * @swagger
 * /api/expenses/{id}:
 *   get:
 *     summary: Get a specific expense
 *     tags: [Expenses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Expense ID
 *     responses:
 *       200:
 *         description: Expense details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Expense'
 *       404:
 *         description: Expense not found
 */
router.get('/:id', authenticate, asyncHandler(getExpense));

/**
 * @swagger
 * /api/expenses/{id}:
 *   put:
 *     summary: Update an expense
 *     tags: [Expenses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Expense ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               amount:
 *                 type: number
 *                 format: float
 *                 example: 30.00
 *               categoryId:
 *                 type: integer
 *                 example: 2
 *               merchant:
 *                 type: string
 *                 example: "McDonald's"
 *     responses:
 *       200:
 *         description: Expense updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Expense'
 *       404:
 *         description: Expense not found
 *       400:
 *         description: Invalid input
 */
router.put('/:id', authenticate, asyncHandler(updateExpense));

/**
 * @swagger
 * /api/expenses/{id}:
 *   delete:
 *     summary: Delete an expense
 *     tags: [Expenses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Expense ID
 *     responses:
 *       204:
 *         description: Expense deleted successfully
 *       404:
 *         description: Expense not found
 */
router.delete('/:id', authenticate, asyncHandler(deleteExpense));

export default router;
