import { Request, Response } from 'express';
import prisma from '../prisma/client';

export const mapSenderToCategory = async (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  const { sender, categoryId } = req.body;

  if (!sender || !categoryId || isNaN(Number(categoryId))) {
    return res.status(400).json({ error: 'Invalid sender or categoryId' });
  }

  const categoryIdNumber = Number(categoryId);

  const mapping = await prisma.senderCategory.upsert({
    where: {
      userId_sender: {
        userId,
        sender,
      },
    },
    update: {
      categoryId: categoryIdNumber,
    },
    create: {
      userId,
      sender,
      categoryId: categoryIdNumber,
    },
  });

  res.status(201).json(mapping);
};
