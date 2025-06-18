import { Request, Response } from 'express';
import prisma from '../prisma/client';
import createError from 'http-errors';

export const mapSenderToCategory = async (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  const { sender, categoryId, messageId } = req.body;

  if (!sender || !categoryId || isNaN(Number(categoryId)) || !messageId || isNaN(Number(messageId))) {
    throw createError(400, 'sender, categoryId, and messageId are required and must be valid');
  }

  const categoryIdNum = Number(categoryId);
  const messageIdNum = Number(messageId);

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

  return res.status(201).json({
    message: 'Sender-category mapping saved and message updated',
    mapping,
  });
};
