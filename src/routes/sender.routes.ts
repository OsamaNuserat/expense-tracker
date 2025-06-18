import { Router } from 'express';
import * as senderController from '../controllers/sender.controller';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

router.post('/', asyncHandler(senderController.mapSenderToCategory));

export default router;
