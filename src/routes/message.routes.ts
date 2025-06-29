import { Router } from 'express';
import * as messagesController from '../controllers/message.controller';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

/**
 * @swagger
 * /messages/parse-sms:
 *   post:
 *     summary: Parse SMS message
 *     description: Processes and categorizes an SMS message for expense/income tracking
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - content
 *             properties:
 *               content:
 *                 type: string
 *                 example: "CLIQ: You received 100.00 JOD from Ahmad Ali at 2025-06-29 14:30"
 *               timestamp:
 *                 type: string
 *                 format: date-time
 *                 example: "2025-06-29T14:30:00Z"
 *     responses:
 *       200:
 *         description: Message parsed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 actionRequired:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   $ref: '#/components/schemas/Message'
 *                 parsedData:
 *                   $ref: '#/components/schemas/ParsedData'
 *                 transaction:
 *                   $ref: '#/components/schemas/Transaction'
 *                 suggestedCategories:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Category'
 *       400:
 *         description: Message content is required
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
router.post('/parse-sms', asyncHandler(messagesController.parseSMS));

/**
 * @swagger
 * /messages/parse:
 *   post:
 *     summary: Parse SMS message (alternative endpoint)
 *     description: Alternative endpoint for parsing SMS messages
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - content
 *             properties:
 *               content:
 *                 type: string
 *                 example: "CLIQ: You received 100.00 JOD from Ahmad Ali at 2025-06-29 14:30"
 *               timestamp:
 *                 type: string
 *                 format: date-time
 *                 example: "2025-06-29T14:30:00Z"
 *     responses:
 *       200:
 *         description: Message parsed successfully
 */
router.post('/parse', asyncHandler(messagesController.parseSMS));

/**
 * @swagger
 * /messages/categorize:
 *   post:
 *     summary: Categorize a transaction
 *     description: Handles user categorization decision for CLIQ and manual categorization
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - messageId
 *               - categoryId
 *             properties:
 *               messageId:
 *                 type: integer
 *                 example: 123
 *               categoryId:
 *                 type: integer
 *                 example: 5
 *               wasCorrection:
 *                 type: boolean
 *                 default: false
 *                 description: True if user is correcting an auto-categorization
 *     responses:
 *       200:
 *         description: Transaction categorized successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 transaction:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                     type:
 *                       type: string
 *                       enum: [income, expense]
 *                     amount:
 *                       type: number
 *                     merchant:
 *                       type: string
 *                     categoryId:
 *                       type: integer
 *                     categoryName:
 *                       type: string
 *                     timestamp:
 *                       type: string
 *                 learned:
 *                   type: boolean
 *                   description: Whether the system learned from this categorization
 *       400:
 *         description: Invalid request data
 *       404:
 *         description: Message or category not found
 */
router.post('/categorize', asyncHandler(messagesController.categorizeTransaction));

/**
 * @swagger
 * /messages/{messageId}/suggestions:
 *   get:
 *     summary: Get category suggestions
 *     description: Get smart categorization suggestions for a specific message
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: messageId
 *         required: true
 *         schema:
 *           type: integer
 *         description: The message ID to get suggestions for
 *     responses:
 *       200:
 *         description: Category suggestions retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 categoryId:
 *                   type: integer
 *                   nullable: true
 *                 categoryName:
 *                   type: string
 *                   nullable: true
 *                 confidence:
 *                   type: number
 *                   minimum: 0
 *                   maximum: 1
 *                 reason:
 *                   type: string
 *                 suggestions:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       categoryId:
 *                         type: integer
 *                       categoryName:
 *                         type: string
 *                       confidence:
 *                         type: number
 *                       reason:
 *                         type: string
 *       400:
 *         description: Message has no parsed data
 *       404:
 *         description: Message not found
 */
router.get('/:messageId/suggestions', asyncHandler(messagesController.getCategorySuggestions));

/**
 * @swagger
 * /messages:
 *   get:
 *     summary: Get messages
 *     description: Retrieves user's messages with optional filtering and pagination
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Items per page
 *       - in: query
 *         name: actionRequired
 *         schema:
 *           type: boolean
 *         description: Filter by action required status
 *     responses:
 *       200:
 *         description: Messages retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 messages:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Message'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                       example: 1
 *                     limit:
 *                       type: integer
 *                       example: 20
 *                     total:
 *                       type: integer
 *                       example: 156
 *                     totalPages:
 *                       type: integer
 *                       example: 8
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/', asyncHandler(messagesController.getMessages));

/**
 * @swagger
 * /messages/{id}:
 *   get:
 *     summary: Get message by ID
 *     description: Retrieves a specific message by its ID
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Message ID
 *     responses:
 *       200:
 *         description: Message retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Message'
 *       404:
 *         description: Message not found
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
router.get('/:id', asyncHandler(messagesController.getMessageById));

export default router;
