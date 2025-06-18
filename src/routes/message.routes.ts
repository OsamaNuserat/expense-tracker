import { Router } from 'express';
import * as messagesController from '../controllers/message.controller';

const router = Router();

router.post('/parse-sms', messagesController.parseSMS);
router.get('/', messagesController.getMessages);

export default router;
