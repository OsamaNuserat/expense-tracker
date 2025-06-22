import { Request, Response } from 'express';
import prisma from '../prisma/client';
import { parseMessage } from '../services/parser';
import { CategoryType } from '@prisma/client';
import createError from 'http-errors';
import { sendPushToUser } from '../utils/expoPush';

export const parseSMS = async (req: Request, res: Response) => {
    const userId = (req as any).user.id;
    const { content, timestamp } = req.body;

    if (!content) throw createError(400, 'Message content is required');

    const message = await prisma.message.create({
        data: { content, userId },
    });

    const parsed = parseMessage(content, timestamp);

    if (!parsed) {
        return res.json({
            message,
            parsed: null,
            record: null,
            actionRequired: false,
        });
    }

    if (parsed.source === 'CliQ') {
        await sendPushToUser(userId, 'New CliQ SMS', `From: ${parsed.merchant}. Tap to categorize.`, {
            messageId: message.id,
        });
        return res.json({
            message,
            parsed,
            record: null,
            actionRequired: true,
        });
    }

    let category = null;
    const senderMap = await prisma.senderCategory.findFirst({
        where: { userId, sender: parsed.merchant },
    });

    if (senderMap) {
        category = await prisma.category.findUnique({
            where: { id: senderMap.categoryId },
        });
    }

    if (!category) {
        category = await prisma.category.findFirst({
            where: {
                userId,
                type: parsed.type.toUpperCase() as CategoryType,
                OR: [
                    { name: { equals: parsed.category, mode: 'insensitive' } },
                    { keywords: { contains: parsed.category, mode: 'insensitive' } },
                ],
            },
        });
    }

    const actionRequired = !category;
    let record = null;

    if (category) {
        if (parsed.type === 'expense') {
            record = await prisma.expense.create({
                data: {
                    amount: parsed.amount,
                    categoryId: category.id,
                    userId,
                },
            });
        } else if (parsed.type === 'income') {
            record = await prisma.income.create({
                data: {
                    amount: parsed.amount,
                    categoryId: category.id,
                    userId,
                },
            });
        }
    }

    res.json({ message, parsed, record, actionRequired });
};

export const getMessages = async (req: Request, res: Response) => {
    const userId = (req as any).user.id;
    const messages = await prisma.message.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
    });

    res.json(messages);
};

export const getMessageById = async (req: Request, res: Response) => {
  const userId = (req as any).user.id; 
  const { id } = req.params;

  // 👇 Log for debugging
  console.log(`🔍 Fetching message ID: ${id} for user ID: ${userId}`);

  const message = await prisma.message.findUnique({
    where: { id: Number(id) },
  });

  if (!message) {
    console.warn(`❌ No message found with ID ${id}`);
    throw createError(404, 'Message not found');
  }

  if (message.userId !== userId) {
    console.warn(`⛔ User ${userId} tried to access message ${id} owned by ${message.userId}`);
    throw createError(403, 'Access denied');
  }

  console.log(`✅ Found message for user ${userId}:`, message);
  res.json(message);
};

