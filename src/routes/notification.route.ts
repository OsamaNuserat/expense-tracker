import express from 'express';
import * as notificationController from '../controllers/notification.controller';
import { asyncHandler } from '../utils/asyncHandler';
import { authenticate } from '../middleware/auth.middleware';

const router = express.Router();

router.post('/save-token', authenticate, asyncHandler(notificationController.saveToken));

router.post('/send', authenticate, asyncHandler(notificationController.sendNotification));

export default router;
