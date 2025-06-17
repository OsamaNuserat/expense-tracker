import { Request, Response } from 'express';
import prisma from '../prisma/client';
import { parseMessage } from '../services/parser';
import { CategoryType } from '@prisma/client';

export const parseSMS = async (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  const { content, timestamp } = req.body;

  const message = await prisma.message.create({ data: { content, userId } });
  const parsed = parseMessage(content, timestamp);

  if (!parsed)
    return res.json({ message, parsed: null, record: null, actionRequired: false, senderCategoryConfirmed: false });

  let category = await prisma.category.findFirst({
    where: {
      userId,
      type: parsed.type.toUpperCase() as CategoryType,
      OR: [
        { name: { equals: parsed.category, mode: 'insensitive' } },
        { keywords: { contains: parsed.category, mode: 'insensitive' } },
      ],
    },
  });

  let senderCategoryConfirmed = false;
  if (parsed.merchant) {
    const senderMap = await prisma.senderCategory.findFirst({
      where: { userId, sender: parsed.merchant },
    });

    if (senderMap) {
      senderCategoryConfirmed = true;
      category = await prisma.category.findUnique({ where: { id: senderMap.categoryId } });
    }
  }

  let record = null;
  const actionRequired = !category;

  if (category) {
    if (parsed.type === 'expense') {
      record = await prisma.expense.create({
        data: { amount: parsed.amount, categoryId: category.id, userId },
      });
    } else if (parsed.type === 'income') {
      record = await prisma.income.create({
        data: { amount: parsed.amount, categoryId: category.id, userId },
      });
    }
  }

  res.json({ message, parsed, record, actionRequired, senderCategoryConfirmed });
};

export const getMessages = async (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  const messages = await prisma.message.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });
  res.json(messages);
};
