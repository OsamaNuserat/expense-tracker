import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { asyncHandler } from '../utils/asyncHandler';
import {
  getBills,
  getBillById,
  createBill,
  updateBill,
  deleteBill,
  markBillAsPaid,
  getBillPayments,
  getUpcomingBills,
  getOverdueBills,
  sendManualReminder,
  getBillsCalendar,
  exportBillsToCalendar,
  getBillsDashboard
} from '../controllers/bills.controller';

const router = Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     Bill:
 *       type: object
 *       required:
 *         - name
 *         - payee
 *         - dueDate
 *         - frequency
 *       properties:
 *         id:
 *           type: integer
 *           description: Unique identifier
 *         name:
 *           type: string
 *           description: Bill name
 *           example: "Electric Bill"
 *         description:
 *           type: string
 *           description: Optional description
 *         payee:
 *           type: string
 *           description: Company or person to pay
 *           example: "Jordan Electric Power Company"
 *         amount:
 *           type: number
 *           description: Expected amount (optional for variable bills)
 *           example: 75.50
 *         isFixedAmount:
 *           type: boolean
 *           description: Whether the bill has a fixed amount
 *           default: true
 *         categoryId:
 *           type: integer
 *           description: Category ID for the bill
 *         dueDate:
 *           type: string
 *           format: date-time
 *           description: Due date
 *         frequency:
 *           type: string
 *           enum: [WEEKLY, MONTHLY, QUARTERLY, YEARLY, CUSTOM]
 *           description: How often the bill occurs
 *         dayOfMonth:
 *           type: integer
 *           minimum: 1
 *           maximum: 31
 *           description: Day of month for monthly bills
 *         dayOfWeek:
 *           type: integer
 *           minimum: 1
 *           maximum: 7
 *           description: Day of week for weekly bills (Monday = 1)
 *         isActive:
 *           type: boolean
 *           description: Whether the bill is active
 *           default: true
 *         autoReminder:
 *           type: boolean
 *           description: Whether to send automatic reminders
 *           default: true
 *         reminderDays:
 *           type: array
 *           items:
 *             type: integer
 *           description: Days before due date to send reminders
 *           example: [7, 3, 1]
 *         nextDueDate:
 *           type: string
 *           format: date-time
 *           description: Next calculated due date
 *         isOverdue:
 *           type: boolean
 *           description: Whether the bill is overdue
 *         overdueByDays:
 *           type: integer
 *           description: Number of days overdue
 *         lastPaidDate:
 *           type: string
 *           format: date-time
 *           description: Last payment date
 *         lastPaidAmount:
 *           type: number
 *           description: Last payment amount
 *     
 *     BillPayment:
 *       type: object
 *       required:
 *         - amount
 *         - paidDate
 *       properties:
 *         id:
 *           type: integer
 *         amount:
 *           type: number
 *           example: 75.50
 *         paidDate:
 *           type: string
 *           format: date-time
 *         wasOnTime:
 *           type: boolean
 *         daysLate:
 *           type: integer
 *         notes:
 *           type: string
 *         paymentMethod:
 *           type: string
 *           example: "Bank Transfer"
 *         confirmationCode:
 *           type: string
 *           example: "TXN123456789"
 */

/**
 * @swagger
 * /api/bills:
 *   get:
 *     summary: Get all bills for user
 *     tags: [Bills]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: string
 *           enum: [true, false, all]
 *           default: true
 *         description: Filter by active status
 *       - in: query
 *         name: isOverdue
 *         schema:
 *           type: boolean
 *         description: Filter overdue bills
 *       - in: query
 *         name: upcoming
 *         schema:
 *           type: boolean
 *         description: Filter upcoming bills (next 7 days)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Number of bills to return
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Number of bills to skip
 *     responses:
 *       200:
 *         description: List of bills
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 bills:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Bill'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     offset:
 *                       type: integer
 *                     hasMore:
 *                       type: boolean
 */
router.get('/', authenticate, asyncHandler(getBills));

/**
 * @swagger
 * /api/bills/upcoming:
 *   get:
 *     summary: Get upcoming bills
 *     tags: [Bills]
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
 *         description: List of upcoming bills
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Bill'
 */
router.get('/upcoming', authenticate, asyncHandler(getUpcomingBills));

/**
 * @swagger
 * /api/bills/overdue:
 *   get:
 *     summary: Get overdue bills
 *     tags: [Bills]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of overdue bills
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Bill'
 */
router.get('/overdue', authenticate, asyncHandler(getOverdueBills));

/**
 * @swagger
 * /api/bills/dashboard:
 *   get:
 *     summary: Get bills dashboard summary
 *     tags: [Bills]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard summary data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalBills:
 *                   type: integer
 *                 activeBills:
 *                   type: integer
 *                 overdueBills:
 *                   type: object
 *                   properties:
 *                     count:
 *                       type: integer
 *                     totalAmount:
 *                       type: number
 *                     bills:
 *                       type: array
 *                 dueThisWeek:
 *                   type: object
 *                   properties:
 *                     count:
 *                       type: integer
 *                     totalAmount:
 *                       type: number
 *                     bills:
 *                       type: array
 *                 totalPaidThisMonth:
 *                   type: number
 *                 averageMonthlyAmount:
 *                   type: number
 */
router.get('/dashboard', authenticate, asyncHandler(getBillsDashboard));

/**
 * @swagger
 * /api/bills/calendar:
 *   get:
 *     summary: Get bills in calendar format
 *     tags: [Bills]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for calendar view
 *       - in: query
 *         name: endDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for calendar view
 *       - in: query
 *         name: view
 *         schema:
 *           type: string
 *           enum: [month, week, day]
 *           default: month
 *         description: Calendar view type
 *     responses:
 *       200:
 *         description: Calendar events data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 events:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       title:
 *                         type: string
 *                       start:
 *                         type: string
 *                         format: date-time
 *                       end:
 *                         type: string
 *                         format: date-time
 *                       description:
 *                         type: string
 *                       backgroundColor:
 *                         type: string
 *                       extendedProps:
 *                         type: object
 *                 totalBills:
 *                   type: integer
 *                 overdueBills:
 *                   type: integer
 *                 upcomingBills:
 *                   type: integer
 */
router.get('/calendar', authenticate, asyncHandler(getBillsCalendar));

/**
 * @swagger
 * /api/bills/export/calendar:
 *   get:
 *     summary: Export bills to iCal format
 *     tags: [Bills]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: months
 *         schema:
 *           type: integer
 *           default: 12
 *         description: Number of months to include
 *       - in: query
 *         name: includeOverdue
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Include overdue bills
 *     responses:
 *       200:
 *         description: iCal file download
 *         content:
 *           text/calendar:
 *             schema:
 *               type: string
 *               format: binary
 */
router.get('/export/calendar', authenticate, asyncHandler(exportBillsToCalendar));

/**
 * @swagger
 * /api/bills/{id}:
 *   get:
 *     summary: Get a specific bill
 *     tags: [Bills]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Bill details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Bill'
 *       404:
 *         description: Bill not found
 */
router.get('/:id', authenticate, asyncHandler(getBillById));

/**
 * @swagger
 * /api/bills:
 *   post:
 *     summary: Create a new bill
 *     tags: [Bills]
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
 *               - payee
 *               - dueDate
 *               - frequency
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Electric Bill"
 *               description:
 *                 type: string
 *               payee:
 *                 type: string
 *                 example: "Jordan Electric Power Company"
 *               amount:
 *                 type: number
 *                 example: 75.50
 *               isFixedAmount:
 *                 type: boolean
 *                 default: true
 *               categoryId:
 *                 type: integer
 *               dueDate:
 *                 type: string
 *                 format: date-time
 *               frequency:
 *                 type: string
 *                 enum: [WEEKLY, MONTHLY, QUARTERLY, YEARLY, CUSTOM]
 *               dayOfMonth:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 31
 *               dayOfWeek:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 7
 *               autoReminder:
 *                 type: boolean
 *                 default: true
 *               reminderDays:
 *                 type: array
 *                 items:
 *                   type: integer
 *                 example: [7, 3, 1]
 *     responses:
 *       201:
 *         description: Bill created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Bill'
 *       400:
 *         description: Invalid input data
 */
router.post('/', authenticate, asyncHandler(createBill));

/**
 * @swagger
 * /api/bills/{id}:
 *   put:
 *     summary: Update a bill
 *     tags: [Bills]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
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
 *               payee:
 *                 type: string
 *               amount:
 *                 type: number
 *               isFixedAmount:
 *                 type: boolean
 *               categoryId:
 *                 type: integer
 *               dueDate:
 *                 type: string
 *                 format: date-time
 *               frequency:
 *                 type: string
 *                 enum: [WEEKLY, MONTHLY, QUARTERLY, YEARLY, CUSTOM]
 *               dayOfMonth:
 *                 type: integer
 *               dayOfWeek:
 *                 type: integer
 *               autoReminder:
 *                 type: boolean
 *               reminderDays:
 *                 type: array
 *                 items:
 *                   type: integer
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Bill updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Bill'
 *       404:
 *         description: Bill not found
 */
router.put('/:id', authenticate, asyncHandler(updateBill));

/**
 * @swagger
 * /api/bills/{id}:
 *   delete:
 *     summary: Delete a bill
 *     tags: [Bills]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Bill deleted successfully
 *       404:
 *         description: Bill not found
 */
router.delete('/:id', authenticate, asyncHandler(deleteBill));

/**
 * @swagger
 * /api/bills/{id}/pay:
 *   post:
 *     summary: Mark a bill as paid
 *     tags: [Bills]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
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
 *                 example: 75.50
 *               paidDate:
 *                 type: string
 *                 format: date-time
 *               paymentMethod:
 *                 type: string
 *                 example: "Bank Transfer"
 *               confirmationCode:
 *                 type: string
 *                 example: "TXN123456789"
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Bill marked as paid
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 bill:
 *                   $ref: '#/components/schemas/Bill'
 *                 payment:
 *                   type: object
 *                   properties:
 *                     amount:
 *                       type: number
 *                     paidDate:
 *                       type: string
 *                       format: date-time
 *                     wasOnTime:
 *                       type: boolean
 *                     daysLate:
 *                       type: integer
 */
router.post('/:id/pay', authenticate, asyncHandler(markBillAsPaid));

/**
 * @swagger
 * /api/bills/{id}/payments:
 *   get:
 *     summary: Get payment history for a bill
 *     tags: [Bills]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *     responses:
 *       200:
 *         description: Payment history
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 payments:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/BillPayment'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     offset:
 *                       type: integer
 *                     hasMore:
 *                       type: boolean
 */
router.get('/:id/payments', authenticate, asyncHandler(getBillPayments));

/**
 * @swagger
 * /api/bills/{id}/remind:
 *   post:
 *     summary: Send manual reminder for a bill
 *     tags: [Bills]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Reminder sent
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 */
router.post('/:id/remind', authenticate, asyncHandler(sendManualReminder));

export default router;
