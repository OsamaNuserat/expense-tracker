import { Request, Response } from 'express';
import prisma from '../prisma/client';

export const mapSenderToCategory = async (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  const { sender, categoryId, messageId } = req.body;

  if (!sender || !categoryId || isNaN(+categoryId) || !messageId || isNaN(+messageId)) {
    return res.status(400).json({ error: 'sender, categoryId, and messageId are required' });
  }

  const categoryIdNum = +categoryId;
  const messageIdNum  = +messageId;

  const mapping = await prisma.senderCategory.upsert({
    where: {
      userId_sender: { userId, sender },
    },
    update: {
      categoryId: categoryIdNum,
    },
    create: {
      userId,
      sender,
      categoryId: categoryIdNum,
    },
  });

  await prisma.message.update({
    where: { id: messageIdNum },
    data: { actionRequired: false },
  });

  return res.status(201).json(mapping);
};
