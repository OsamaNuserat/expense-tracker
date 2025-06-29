import { Router } from 'express';
import * as cliqController from '../controllers/cliq.controller';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

/**
 * @swagger
 * /cliq/{messageId}/details:
 *   get:
 *     summary: Get CLIQ transaction details for popup workflow
 *     description: Retrieves CLIQ transaction details with smart categorization suggestions for the popup workflow
 *     tags: [CLIQ Workflow]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: messageId
 *         required: true
 *         schema:
 *           type: integer
 *         description: The message ID of the CLIQ transaction
 *     responses:
 *       200:
 *         description: CLIQ transaction details retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 transaction:
 *                   type: object
 *                   properties:
 *                     messageId:
 *                       type: integer
 *                     amount:
 *                       type: number
 *                     senderName:
 *                       type: string
 *                     transactionType:
 *                       type: string
 *                       enum: [income, expense]
 *                     suggestedCategory:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: integer
 *                         name:
 *                           type: string
 *                         confidence:
 *                           type: number
 *                     isRecurring:
 *                       type: boolean
 *                     businessLikeSender:
 *                       type: boolean
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
 *                 categories:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       name:
 *                         type: string
 *                       type:
 *                         type: string
 *                 confidence:
 *                   type: number
 *                 reason:
 *                   type: string
 *       400:
 *         description: Not a CLIQ transaction or invalid message
 *       404:
 *         description: Message not found
 */
router.get('/:messageId/details', asyncHandler(cliqController.getCliqTransactionDetails));

/**
 * @swagger
 * /cliq/categorize:
 *   post:
 *     summary: Complete CLIQ categorization workflow
 *     description: Finalizes the CLIQ transaction categorization and creates the transaction record
 *     tags: [CLIQ Workflow]
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
 *               - transactionType
 *             properties:
 *               messageId:
 *                 type: integer
 *                 example: 123
 *               categoryId:
 *                 type: integer
 *                 example: 5
 *                 description: Required if not creating new category
 *               transactionType:
 *                 type: string
 *                 enum: [income, expense]
 *                 example: "expense"
 *               amount:
 *                 type: number
 *                 description: Optional, uses parsed amount if not provided
 *               createNewCategory:
 *                 type: boolean
 *                 default: false
 *               newCategoryName:
 *                 type: string
 *                 description: Required if createNewCategory is true
 *     responses:
 *       200:
 *         description: CLIQ transaction categorized successfully
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
 *                     source:
 *                       type: string
 *                 learned:
 *                   type: boolean
 *                 newCategoryCreated:
 *                   type: boolean
 *       400:
 *         description: Invalid request data
 *       404:
 *         description: Message or category not found
 */
router.post('/categorize', asyncHandler(cliqController.completeCliqCategorization));

/**
 * @swagger
 * /cliq/patterns:
 *   get:
 *     summary: Get CLIQ transaction patterns
 *     description: Retrieves learned CLIQ patterns for the user with filtering options
 *     tags: [CLIQ Workflow]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [income, expense]
 *         description: Filter patterns by transaction type
 *     responses:
 *       200:
 *         description: CLIQ patterns retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 patterns:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       senderName:
 *                         type: string
 *                       categoryName:
 *                         type: string
 *                       transactionType:
 *                         type: string
 *                       averageAmount:
 *                         type: number
 *                       isRecurring:
 *                         type: boolean
 *                       frequency:
 *                         type: string
 *                       useCount:
 *                         type: integer
 *                       lastSeen:
 *                         type: string
 *                         format: date-time
 *                       confidence:
 *                         type: number
 *                       isBusinessLike:
 *                         type: boolean
 *                 total:
 *                   type: integer
 *                 recurring:
 *                   type: integer
 *                 business:
 *                   type: integer
 */
router.get('/patterns', asyncHandler(cliqController.getCliqPatterns));

/**
 * @swagger
 * /cliq/patterns/update:
 *   put:
 *     summary: Update CLIQ pattern preferences
 *     description: Updates user preferences for a specific CLIQ pattern
 *     tags: [CLIQ Workflow]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - senderName
 *               - transactionType
 *             properties:
 *               senderName:
 *                 type: string
 *                 example: "Ahmad Ali"
 *               transactionType:
 *                 type: string
 *                 enum: [income, expense]
 *               isRecurring:
 *                 type: boolean
 *                 description: Mark this pattern as recurring or not
 *               categoryId:
 *                 type: integer
 *                 description: Change the default category for this pattern
 *     responses:
 *       200:
 *         description: CLIQ pattern updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 pattern:
 *                   type: object
 *                   properties:
 *                     senderName:
 *                       type: string
 *                     categoryName:
 *                       type: string
 *                     transactionType:
 *                       type: string
 *                     isRecurring:
 *                       type: boolean
 *                     confidence:
 *                       type: number
 *       400:
 *         description: Invalid request data
 *       404:
 *         description: CLIQ pattern or category not found
 */
router.put('/patterns/update', asyncHandler(cliqController.updateCliqPattern));

export default router;
