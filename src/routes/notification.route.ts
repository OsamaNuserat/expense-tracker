import express from 'express';
import * as notificationsController from "../controllers/notification.controller"

const router = express.Router();

router.post('/save-token', notificationsController.saveToken);

export default router;
