import express from 'express';
import { 
  getFinancialGoals,
  getFinancialGoal,
  createFinancialGoal,
  updateFinancialGoal,
  contributeToGoal,
  deleteFinancialGoal,
  getFinancialGoalsStats
} from '../controllers/financialGoals.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticate);

/**
 * @swagger
 * components:
 *   schemas:
 *     FinancialGoal:
 *       type: object
 *       required:
 *         - title
 *         - goalType
 *         - targetAmount
 *       properties:
 *         id:
 *           type: integer
 *           description: The auto-generated id of the goal
 *         title:
 *           type: string
 *           description: The goal title
 *           example: "Emergency Fund"
 *         description:
 *           type: string
 *           description: Optional goal description
 *           example: "3-6 months of expenses for unexpected situations"
 *         goalType:
 *           type: string
 *           enum: [EMERGENCY_FUND, VACATION, CAR_PURCHASE, HOUSE_DOWN_PAYMENT, DEBT_PAYOFF, WEDDING, EDUCATION, RETIREMENT, INVESTMENT, HOME_IMPROVEMENT, BUSINESS, GADGET, CUSTOM]
 *           description: The type of financial goal
 *           example: "EMERGENCY_FUND"
 *         targetAmount:
 *           type: number
 *           format: float
 *           description: The target amount to save
 *           example: 15000
 *         currentAmount:
 *           type: number
 *           format: float
 *           description: The current saved amount
 *           example: 5000
 *         targetDate:
 *           type: string
 *           format: date-time
 *           description: Target completion date
 *           example: "2024-12-31T00:00:00Z"
 *         priority:
 *           type: string
 *           enum: [LOW, MEDIUM, HIGH, URGENT]
 *           description: Goal priority level
 *           example: "HIGH"
 *         isActive:
 *           type: boolean
 *           description: Whether the goal is active
 *           example: true
 *         isCompleted:
 *           type: boolean
 *           description: Whether the goal is completed
 *           example: false
 *         autoContribute:
 *           type: boolean
 *           description: Whether to automatically contribute to this goal
 *           example: false
 *         monthlyTarget:
 *           type: number
 *           format: float
 *           description: Monthly contribution target
 *           example: 1250
 *         reminderEnabled:
 *           type: boolean
 *           description: Whether reminders are enabled
 *           example: true
 *         reminderDay:
 *           type: integer
 *           description: Day of month for reminders
 *           example: 1
 *         progress:
 *           type: number
 *           format: float
 *           description: Progress percentage (calculated)
 *           example: 33.33
 *         remaining:
 *           type: number
 *           format: float
 *           description: Remaining amount to target (calculated)
 *           example: 10000
 *         daysLeft:
 *           type: integer
 *           description: Days remaining to target date (calculated)
 *           example: 180
 *
 * /api/financial-goals:
 *   get:
 *     summary: Get all financial goals for the authenticated user
 *     tags: [Financial Goals]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of financial goals with progress calculations
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/FinancialGoal'
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 *
 *   post:
 *     summary: Create a new financial goal
 *     tags: [Financial Goals]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - goalType
 *               - targetAmount
 *             properties:
 *               title:
 *                 type: string
 *                 example: "Emergency Fund"
 *               description:
 *                 type: string
 *                 example: "3-6 months of expenses for unexpected situations"
 *               goalType:
 *                 type: string
 *                 enum: [EMERGENCY_FUND, VACATION, CAR_PURCHASE, HOUSE_DOWN_PAYMENT, DEBT_PAYOFF, WEDDING, EDUCATION, RETIREMENT, INVESTMENT, HOME_IMPROVEMENT, BUSINESS, GADGET, CUSTOM]
 *                 example: "EMERGENCY_FUND"
 *               targetAmount:
 *                 type: number
 *                 format: float
 *                 example: 15000
 *               targetDate:
 *                 type: string
 *                 format: date-time
 *                 example: "2024-12-31T00:00:00Z"
 *               currentAmount:
 *                 type: number
 *                 format: float
 *                 example: 0
 *               priority:
 *                 type: string
 *                 enum: [LOW, MEDIUM, HIGH, URGENT]
 *                 example: "HIGH"
 *               categoryId:
 *                 type: integer
 *                 example: 1
 *               autoContribute:
 *                 type: boolean
 *                 example: false
 *               monthlyTarget:
 *                 type: number
 *                 format: float
 *                 example: 1250
 *               reminderEnabled:
 *                 type: boolean
 *                 example: true
 *               reminderDay:
 *                 type: integer
 *                 example: 1
 *     responses:
 *       201:
 *         description: Financial goal created successfully
 *       400:
 *         description: Bad request - validation errors
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.route('/')
  .get(getFinancialGoals)
  .post(createFinancialGoal);

/**
 * @swagger
 * /api/financial-goals/stats:
 *   get:
 *     summary: Get financial goals statistics
 *     tags: [Financial Goals]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Financial goals statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                       description: Total number of goals
 *                     active:
 *                       type: integer
 *                       description: Number of active goals
 *                     completed:
 *                       type: integer
 *                       description: Number of completed goals
 *                     inactive:
 *                       type: integer
 *                       description: Number of inactive goals
 *                     totalTargetAmount:
 *                       type: number
 *                       format: float
 *                       description: Sum of all target amounts
 *                     totalCurrentAmount:
 *                       type: number
 *                       format: float
 *                       description: Sum of all current amounts
 *                     totalRemaining:
 *                       type: number
 *                       format: float
 *                       description: Total amount remaining across all goals
 *                     averageProgress:
 *                       type: number
 *                       format: float
 *                       description: Average progress percentage
 *                     goalsByType:
 *                       type: object
 *                       description: Count of goals by type
 *                     goalsByPriority:
 *                       type: object
 *                       description: Count of goals by priority
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/stats', getFinancialGoalsStats);

/**
 * @swagger
 * /api/financial-goals/{id}:
 *   get:
 *     summary: Get a specific financial goal by ID
 *     tags: [Financial Goals]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: The goal ID
 *     responses:
 *       200:
 *         description: Financial goal details with progress
 *       404:
 *         description: Goal not found
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 *
 *   put:
 *     summary: Update a financial goal
 *     tags: [Financial Goals]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: The goal ID
 *     responses:
 *       200:
 *         description: Goal updated successfully
 *       400:
 *         description: Bad request - validation errors
 *       404:
 *         description: Goal not found
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 *
 *   delete:
 *     summary: Delete a financial goal
 *     tags: [Financial Goals]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: The goal ID
 *     responses:
 *       200:
 *         description: Goal deleted successfully
 *       404:
 *         description: Goal not found
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.route('/:id')
  .get(getFinancialGoal)
  .put(updateFinancialGoal)
  .delete(deleteFinancialGoal);

/**
 * @swagger
 * /api/financial-goals/{id}/contribute:
 *   post:
 *     summary: Add money to a financial goal
 *     tags: [Financial Goals]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: The goal ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - amount
 *             properties:
 *               amount:
 *                 type: number
 *                 format: float
 *                 example: 500
 *               description:
 *                 type: string
 *                 example: "Monthly contribution"
 *               source:
 *                 type: string
 *                 example: "Salary savings"
 *     responses:
 *       200:
 *         description: Contribution added successfully
 *       400:
 *         description: Bad request - validation errors
 *       404:
 *         description: Goal not found
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.post('/:id/contribute', contributeToGoal);

export default router;
