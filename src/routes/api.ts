import { Router, Request, Response } from 'express';
import prisma from '../prisma/client';

const router = Router();

router.post('/parse-sms', async (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  const { content } = req.body;

  const message = await prisma.message.create({
    data: {
      content,
      userId,
    },
  });

  return res.json(message);
});

router.get('/messages', async (req: Request, res: Response) => {
  const userId = (req as any).user.id;

  const messages = await prisma.message.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });

  return res.json(messages);
});

export default router;
