import express from 'express';
import * as notificationsController from "../controllers/notification.controller"
import { asyncHandler } from '../utils/asyncHandler';

const router = express.Router();

router.post('/save-token', asyncHandler(notificationsController.saveToken));

export default router;
