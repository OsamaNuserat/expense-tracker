import { Router } from 'express';
import { parseSMS, getMessages } from '../controllers/message.controller';

const router = Router();

router.post('/parse-sms', parseSMS);
router.get('/', getMessages);

export default router;
