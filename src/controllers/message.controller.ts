import { Request, Response } from 'express';
import prisma from '../prisma/client';
import { parseMessage } from '../services/parser';
import createError from 'http-errors';
import { sendPushToUser } from '../utils/fcmPush';
import { CategoryType, Prisma } from '@prisma/client';
import { updateSurvivalBudget } from './survivalBudget.controller';

export const parseSMS = async (req: Request, res: Response) => {
    const userId = (req as any).user.id;
    const { content, timestamp } = req.body;

    if (!content) throw createError(400, 'Message content is required');

    const parsed = parseMessage(content, timestamp);

    const message = await prisma.message.create({
        data: {
            content,
            userId,
            parsedData: parsed
                ? ({
                      originalMessage: parsed.originalMessage,
                      timestamp: parsed.timestamp,
                      amount: parsed.amount,
                      merchant: parsed.merchant,
                      category: parsed.category,
                      type: parsed.type,
                      source: parsed.source,
                  } as Prisma.JsonObject)
                : Prisma.DbNull,
        },
    });

    if (!parsed) {
        return res.json({
            actionRequired: false,
            message: {
                id: message.id,
                content: message.content,
                createdAt: message.createdAt,
            },
        });
    }

    const responseBase = {
        actionRequired: false,
        message: {
            id: message.id,
            content: message.content,
            createdAt: message.createdAt,
        },
        transaction: {
            type: parsed.type,
            amount: parsed.amount,
            merchant: parsed.merchant,
            category: parsed.category,
            timestamp: parsed.timestamp,
        },
    };

    if (parsed.source === 'CliQ') {
        await sendPushToUser(
            userId,
            'Categorize CliQ Transaction',
            `From: ${parsed.merchant}. Amount: ${parsed.amount} JOD. Tap to categorize.`,
            { messageId: message.id.toString() }
        );
        return res.json({
            ...responseBase,
            actionRequired: true,
        });
    }

    const category = await prisma.category.findFirst({
        where: {
            userId,
            type: parsed.type.toUpperCase() as CategoryType,
            OR: [
                { name: { equals: parsed.category, mode: 'insensitive' } },
                { keywords: { contains: parsed.category, mode: 'insensitive' } },
            ],
        },
    });

    if (!category) {
        await sendPushToUser(
            userId,
            'Categorize Transaction',
            `From: ${parsed.merchant}. Amount: ${parsed.amount} JOD. Tap to categorize.`,
            { messageId: message.id.toString() }
        );
        return res.json({
            ...responseBase,
            actionRequired: true,
        });
    }

    let record = null;
    if (parsed.type === 'expense') {
        record = await prisma.expense.create({
            data: {
                amount: parsed.amount,
                merchant: parsed.merchant,
                categoryId: category.id,
                userId,
                createdAt: new Date(parsed.timestamp),
            },
        });
        
        await updateSurvivalBudget(userId, parsed.amount, new Date(parsed.timestamp));
    } else if (parsed.type === 'income') {
        record = await prisma.income.create({
            data: {
                amount: parsed.amount,
                merchant: parsed.merchant,
                categoryId: category.id,
                userId,
                createdAt: new Date(parsed.timestamp),
            },
        });
    }

    const response = {
        ...responseBase,
        transaction: {
            ...responseBase.transaction,
            id: record?.id,
        },
    };

    res.json(response);
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

    const message = await prisma.message.findUnique({
        where: { id: Number(id) },
    });

    if (!message) {
        console.warn(`❌ No message found with ID ${id}`);
        throw createError(404, 'Message not found');
    }

    console.log(`✅ Found message for user ${userId}:`, message);
    res.json(message);
};
