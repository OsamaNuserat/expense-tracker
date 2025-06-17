import { Router } from 'express';
import { mapSenderToCategory } from '../controllers/sender.controller';

const router = Router();

router.post('/', mapSenderToCategory);

export default router;
