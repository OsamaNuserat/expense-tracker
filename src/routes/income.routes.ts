import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { asyncHandler } from '../utils/asyncHandler';
import {
  getIncomes,
  getIncome,
  createIncome,
  updateIncome,
  deleteIncome
} from '../controllers/income.controller';

const router = Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     Income:
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
 *           description: Income amount
 *           example: 1500.00
 *         categoryId:
 *           type: integer
 *           description: Category ID
 *           example: 1
 *         merchant:
 *           type: string
 *           description: Source of income
 *           example: "Company ABC"
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
 * /api/incomes:
 *   get:
 *     summary: Get all incomes
 *     tags: [Incomes]
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
 *         description: Income source filter
 *     responses:
 *       200:
 *         description: List of incomes
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 incomes:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Income'
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
router.get('/', authenticate, asyncHandler(getIncomes));

/**
 * @swagger
 * /api/incomes:
 *   post:
 *     summary: Create a new income
 *     tags: [Incomes]
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
 *                 example: 1500.00
 *               categoryId:
 *                 type: integer
 *                 example: 1
 *               merchant:
 *                 type: string
 *                 example: "Company ABC"
 *     responses:
 *       201:
 *         description: Income created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Income'
 *       400:
 *         description: Invalid input
 *       404:
 *         description: Category not found
 */
router.post('/', authenticate, asyncHandler(createIncome));

/**
 * @swagger
 * /api/incomes/{id}:
 *   get:
 *     summary: Get a specific income
 *     tags: [Incomes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Income ID
 *     responses:
 *       200:
 *         description: Income details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Income'
 *       404:
 *         description: Income not found
 */
router.get('/:id', authenticate, asyncHandler(getIncome));

/**
 * @swagger
 * /api/incomes/{id}:
 *   put:
 *     summary: Update an income
 *     tags: [Incomes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Income ID
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
 *                 example: 1600.00
 *               categoryId:
 *                 type: integer
 *                 example: 2
 *               merchant:
 *                 type: string
 *                 example: "Freelance Project"
 *     responses:
 *       200:
 *         description: Income updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Income'
 *       404:
 *         description: Income not found
 *       400:
 *         description: Invalid input
 */
router.put('/:id', authenticate, asyncHandler(updateIncome));

/**
 * @swagger
 * /api/incomes/{id}:
 *   delete:
 *     summary: Delete an income
 *     tags: [Incomes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Income ID
 *     responses:
 *       204:
 *         description: Income deleted successfully
 *       404:
 *         description: Income not found
 */
router.delete('/:id', authenticate, asyncHandler(deleteIncome));

export default router;
