import { Router } from 'express';
import * as recurringPaymentController from '../controllers/recurringPayment.controller';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

/**
 * @swagger
 * /recurring-payments:
 *   get:
 *     summary: Get all recurring payments
 *     description: Retrieves all recurring payments for the authenticated user, grouped by auto-detected and user-added
 *     tags: [Recurring Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: active
 *         schema:
 *           type: boolean
 *         description: Filter by active status
 *     responses:
 *       200:
 *         description: Recurring payments retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 detected:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/RecurringPayment'
 *                 userAdded:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/RecurringPayment'
 *                 total:
 *                   type: integer
 *                 active:
 *                   type: integer
 */
router.get('/', asyncHandler(recurringPaymentController.getRecurringPayments));

/**
 * @swagger
 * /recurring-payments:
 *   post:
 *     summary: Create a new recurring payment
 *     description: Creates a new user-defined recurring payment
 *     tags: [Recurring Payments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - amount
 *               - categoryId
 *               - frequency
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Gym Membership"
 *               description:
 *                 type: string
 *                 example: "Monthly gym membership fee"
 *               amount:
 *                 type: number
 *                 example: 50.00
 *               categoryId:
 *                 type: integer
 *                 example: 5
 *               frequency:
 *                 type: string
 *                 enum: [WEEKLY, MONTHLY, QUARTERLY, YEARLY]
 *                 example: "MONTHLY"
 *               dayOfMonth:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 31
 *                 example: 1
 *                 description: Required for MONTHLY frequency
 *               dayOfWeek:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 7
 *                 example: 1
 *                 description: Required for WEEKLY frequency (1=Monday, 7=Sunday)
 *               merchant:
 *                 type: string
 *                 example: "Fitness Club"
 *               reminders:
 *                 type: object
 *                 properties:
 *                   enabled:
 *                     type: boolean
 *                   daysBefore:
 *                     type: array
 *                     items:
 *                       type: integer
 *     responses:
 *       201:
 *         description: Recurring payment created successfully
 *       400:
 *         description: Validation error
 *       404:
 *         description: Category not found
 */
router.post('/', asyncHandler(recurringPaymentController.createRecurringPayment));

/**
 * @swagger
 * /recurring-payments/upcoming:
 *   get:
 *     summary: Get upcoming payments
 *     description: Get recurring payments due in the next specified number of days
 *     tags: [Recurring Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: days
 *         schema:
 *           type: integer
 *           default: 30
 *         description: Number of days to look ahead
 *     responses:
 *       200:
 *         description: Upcoming payments retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 upcomingPayments:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/RecurringPayment'
 *                 total:
 *                   type: integer
 */
router.get('/upcoming', asyncHandler(recurringPaymentController.getUpcomingPayments));

/**
 * @swagger
 * /recurring-payments/detect:
 *   post:
 *     summary: Detect recurring patterns
 *     description: Analyze transaction history to detect potential recurring payments
 *     tags: [Recurring Payments]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Detection completed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 detectedPatterns:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       merchant:
 *                         type: string
 *                       suggestedName:
 *                         type: string
 *                       averageAmount:
 *                         type: number
 *                       frequency:
 *                         type: string
 *                       confidence:
 *                         type: number
 *                       dayOfMonth:
 *                         type: integer
 *                 total:
 *                   type: integer
 */
router.post('/detect', asyncHandler(recurringPaymentController.detectRecurringPayments));

/**
 * @swagger
 * /recurring-payments/create-from-detection:
 *   post:
 *     summary: Create from detected pattern
 *     description: Create a recurring payment from a detected pattern
 *     tags: [Recurring Payments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - merchant
 *               - amount
 *               - categoryId
 *               - frequency
 *               - name
 *             properties:
 *               merchant:
 *                 type: string
 *               amount:
 *                 type: number
 *               categoryId:
 *                 type: integer
 *               frequency:
 *                 type: string
 *               dayOfMonth:
 *                 type: integer
 *               name:
 *                 type: string
 *     responses:
 *       201:
 *         description: Recurring payment created from detection
 *       400:
 *         description: Validation error
 *       404:
 *         description: Category not found
 */
router.post('/create-from-detection', asyncHandler(recurringPaymentController.createFromDetection));

/**
 * @swagger
 * /recurring-payments/{id}:
 *   put:
 *     summary: Update a recurring payment
 *     description: Update an existing recurring payment
 *     tags: [Recurring Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Recurring payment ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               amount:
 *                 type: number
 *               categoryId:
 *                 type: integer
 *               frequency:
 *                 type: string
 *                 enum: [WEEKLY, MONTHLY, QUARTERLY, YEARLY]
 *               dayOfMonth:
 *                 type: integer
 *               dayOfWeek:
 *                 type: integer
 *               isActive:
 *                 type: boolean
 *               merchant:
 *                 type: string
 *               reminders:
 *                 type: object
 *     responses:
 *       200:
 *         description: Recurring payment updated successfully
 *       404:
 *         description: Recurring payment not found
 */
router.put('/:id', asyncHandler(recurringPaymentController.updateRecurringPayment));

/**
 * @swagger
 * /recurring-payments/{id}:
 *   delete:
 *     summary: Delete a recurring payment
 *     description: Delete an existing recurring payment
 *     tags: [Recurring Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Recurring payment ID
 *     responses:
 *       200:
 *         description: Recurring payment deleted successfully
 *       404:
 *         description: Recurring payment not found
 */
router.delete('/:id', asyncHandler(recurringPaymentController.deleteRecurringPayment));

export default router;
