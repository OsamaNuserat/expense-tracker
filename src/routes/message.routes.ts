import { Router } from 'express';
import * as messagesController from '../controllers/message.controller';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

router.post('/parse-sms', asyncHandler(messagesController.parseSMS));
router.get('/', asyncHandler(messagesController.getMessages));
router.get('/:id', asyncHandler(messagesController.getMessageById));

export default router;
