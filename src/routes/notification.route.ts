import express from 'express';
import { saveToken, sendPushToUser } from '../controllers/notification.controller';
import { asyncHandler } from '../utils/asyncHandler';
import { authenticate } from '../middleware/auth.middleware';

const router = express.Router();

router.post('/save-token', authenticate, asyncHandler(saveToken));
router.post('/send', authenticate, asyncHandler(sendPushToUser)); // for testing

export default router;
