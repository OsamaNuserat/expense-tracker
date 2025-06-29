import express from 'express';
import * as notificationController from '../controllers/notification.controller';
import { asyncHandler } from '../utils/asyncHandler';
import { authenticate } from '../middleware/auth.middleware';

const router = express.Router();

/**
 * @swagger
 * /notifications/save-token:
 *   post:
 *     summary: Save FCM token
 *     description: Saves a Firebase Cloud Messaging token for push notifications
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *             properties:
 *               token:
 *                 type: string
 *                 example: "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]"
 *                 description: Firebase Cloud Messaging token
 *     responses:
 *       200:
 *         description: Token saved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Token saved"
 *       400:
 *         description: FCM push token is required
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
router.post('/save-token', authenticate, asyncHandler(notificationController.saveToken));

/**
 * @swagger
 * /notifications/send:
 *   post:
 *     summary: Send push notification
 *     description: Sends a push notification to the authenticated user
 *     tags: [Notifications]
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
 *               - body
 *             properties:
 *               title:
 *                 type: string
 *                 example: "Transaction Alert"
 *               body:
 *                 type: string
 *                 example: "New expense detected - categorization needed"
 *               data:
 *                 type: object
 *                 properties:
 *                   messageId:
 *                     type: string
 *                     example: "123"
 *                   amount:
 *                     type: string
 *                     example: "50.00"
 *                   type:
 *                     type: string
 *                     example: "expense"
 *                   actionRequired:
 *                     type: boolean
 *                     example: true
 *     responses:
 *       200:
 *         description: Notification sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Notification sent"
 *       400:
 *         description: Title and body are required
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
router.post('/send', authenticate, asyncHandler(notificationController.sendNotification));

export default router;
