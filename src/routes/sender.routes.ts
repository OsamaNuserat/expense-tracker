import { Router } from 'express';
import * as senderController from '../controllers/sender.controller';

const router = Router();

router.post('/', senderController.mapSenderToCategory);

export default router;
