import express from 'express';
import * as notificationController from '../controllers/notification.controller';
import { asyncHandler } from '../utils/asyncHandler';
import { authenticate } from '../middleware/auth.middleware';

const router = express.Router();

/**
 * @swagger
 * /notifications/save-token:
 *   post:
 *     summary: Save Expo push token
 *     description: Saves an Expo push token for push notifications
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
 *                 description: Expo push token
 *               expoPushToken:
 *                 type: string
 *                 example: "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]"
 *                 description: Alternative field name for Expo push token
 *     responses:
 *       200:
 *         description: Token saved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Push token registered successfully"
 *       400:
 *         description: Expo push token is required
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
 *               options:
 *                 type: object
 *                 properties:
 *                   priority:
 *                     type: string
 *                     enum: [default, normal, high]
 *                     example: "normal"
 *                   channelId:
 *                     type: string
 *                     example: "default"
 *     responses:
 *       200:
 *         description: Notification sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Notification sent successfully"
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

/**
 * @swagger
 * /notifications/settings:
 *   get:
 *     summary: Get notification settings
 *     description: Get user's notification preferences and token status
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Notification settings retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 settings:
 *                   type: object
 *                   properties:
 *                     enabled:
 *                       type: boolean
 *                       example: true
 *                     budgetAlerts:
 *                       type: boolean
 *                       example: true
 *                     transactionAlerts:
 *                       type: boolean
 *                       example: true
 *                     recurringPaymentReminders:
 *                       type: boolean
 *                       example: true
 *                 hasToken:
 *                   type: boolean
 *                   example: true
 *       401:
 *         description: Unauthorized
 *   put:
 *     summary: Update notification settings
 *     description: Update user's notification preferences
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               enabled:
 *                 type: boolean
 *                 example: true
 *               budgetAlerts:
 *                 type: boolean
 *                 example: true
 *               transactionAlerts:
 *                 type: boolean
 *                 example: true
 *               recurringPaymentReminders:
 *                 type: boolean
 *                 example: true
 *     responses:
 *       200:
 *         description: Settings updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Notification settings updated successfully"
 *                 settings:
 *                   type: object
 *       401:
 *         description: Unauthorized
 */
router.get('/settings', authenticate, asyncHandler(notificationController.getNotificationSettings));
router.put('/settings', authenticate, asyncHandler(notificationController.updateSettings));

/**
 * @swagger
 * /notifications/test:
 *   post:
 *     summary: Send test notification
 *     description: Send a test push notification to verify the setup
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Test notification sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Test notification sent successfully"
 *       401:
 *         description: Unauthorized
 */
router.post('/test', authenticate, asyncHandler(notificationController.sendTestNotification));

/**
 * @swagger
 * /notifications/remove-token:
 *   delete:
 *     summary: Remove push token
 *     description: Remove the user's push token (unregister from notifications)
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Push token removed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Push token removed successfully"
 *       401:
 *         description: Unauthorized
 */
router.delete('/remove-token', authenticate, asyncHandler(notificationController.removePushToken));

export default router;
