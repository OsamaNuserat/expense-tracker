import { Request, Response } from 'express';
import prisma from '../prisma/client';
import { parseMessage } from '../services/parser';
import createError from 'http-errors';
import { sendPushToUser } from '../utils/fcmPush';
import { CategoryType, Prisma } from '@prisma/client';
import { updateSurvivalBudget } from './survivalBudget.controller';
import { smartCategorizationService } from '../services/smartCategorization';

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

    // Use smart categorization service
    const categorizationResult = await smartCategorizationService.categorizeTransaction(userId, parsed);

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
        smartCategorization: {
            confidence: categorizationResult.confidence,
            suggestedCategory: categorizationResult.categoryName,
            reason: categorizationResult.reason,
            suggestions: categorizationResult.suggestions.slice(0, 3) // Top 3 suggestions
        }
    };

    // CLIQ transactions always require user confirmation
    if (parsed.source === 'CliQ') {
        const notificationMessage = categorizationResult.confidence > 0.7 
            ? `CliQ from ${parsed.merchant}: ${parsed.amount} JOD. Suggested: ${categorizationResult.categoryName}. Tap to confirm or change.`
            : `CliQ from ${parsed.merchant}: ${parsed.amount} JOD. Tap to categorize.`;

        await sendPushToUser(
            userId,
            'Categorize CliQ Transaction',
            notificationMessage,
            { 
                messageId: message.id.toString(),
                suggestedCategoryId: categorizationResult.categoryId?.toString() || '',
                confidence: categorizationResult.confidence.toString()
            }
        );
        
        return res.json({
            ...responseBase,
            actionRequired: true,
            cliqWorkflow: true
        });
    }

    // For non-CLIQ transactions, auto-categorize if confidence is high
    if (categorizationResult.confidence > 0.8 && categorizationResult.categoryId) {
        let record = null;
        if (parsed.type === 'expense') {
            record = await prisma.expense.create({
                data: {
                    amount: parsed.amount,
                    merchant: parsed.merchant,
                    categoryId: categorizationResult.categoryId,
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
                    categoryId: categorizationResult.categoryId,
                    userId,
                    createdAt: new Date(parsed.timestamp),
                },
            });
        }

        // Learn from this auto-categorization
        await smartCategorizationService.learnFromUserDecision(
            userId, 
            parsed, 
            categorizationResult.categoryId,
            false
        );

        const response = {
            ...responseBase,
            transaction: {
                ...responseBase.transaction,
                id: record?.id,
                categoryId: categorizationResult.categoryId,
                categoryName: categorizationResult.categoryName
            },
            autoCategorized: true
        };

        // Send a success notification
        await sendPushToUser(
            userId,
            'Transaction Auto-Categorized',
            `${parsed.amount} JOD from ${parsed.merchant} → ${categorizationResult.categoryName}`,
            { transactionId: record?.id.toString() || '' }
        );

        return res.json(response);
    }

    // For medium confidence or failed categorization, ask user
    const notificationMessage = categorizationResult.confidence > 0.5
        ? `From: ${parsed.merchant}. Amount: ${parsed.amount} JOD. Suggested: ${categorizationResult.categoryName}. Tap to confirm or change.`
        : `From: ${parsed.merchant}. Amount: ${parsed.amount} JOD. Tap to categorize.`;

    await sendPushToUser(
        userId,
        'Categorize Transaction',
        notificationMessage,
        { 
            messageId: message.id.toString(),
            suggestedCategoryId: categorizationResult.categoryId?.toString() || '',
            confidence: categorizationResult.confidence.toString()
        }
    );

    return res.json({
        ...responseBase,
        actionRequired: true
    });
};

/**
 * Handle user categorization decision (for CLIQ and manual categorization)
 */
export const categorizeTransaction = async (req: Request, res: Response) => {
    const userId = (req as any).user.id;
    const { messageId, categoryId, wasCorrection = false } = req.body;

    if (!messageId || !categoryId) {
        throw createError(400, 'Message ID and category ID are required');
    }

    // Get the message and its parsed data
    const message = await prisma.message.findUnique({
        where: { id: Number(messageId) }
    });

    if (!message || message.userId !== userId) {
        throw createError(404, 'Message not found');
    }

    if (!message.parsedData) {
        throw createError(400, 'Message has no parsed data');
    }

    const parsedData = message.parsedData as any;
    
    // Validate categoryId
    if (!categoryId || isNaN(Number(categoryId))) {
        throw createError(400, 'Valid category ID is required');
    }
    
    const category = await prisma.category.findUnique({
        where: { id: Number(categoryId) }
    });

    if (!category || category.userId !== userId) {
        throw createError(404, 'Category not found or you do not have permission to use this category');
    }

    // Create the transaction record
    let record = null;
    if (parsedData.type === 'expense') {
        record = await prisma.expense.create({
            data: {
                amount: parsedData.amount,
                merchant: parsedData.merchant,
                categoryId: Number(categoryId),
                userId,
                createdAt: new Date(parsedData.timestamp),
            },
        });
        
        await updateSurvivalBudget(userId, parsedData.amount, new Date(parsedData.timestamp));
    } else if (parsedData.type === 'income') {
        record = await prisma.income.create({
            data: {
                amount: parsedData.amount,
                merchant: parsedData.merchant,
                categoryId: Number(categoryId),
                userId,
                createdAt: new Date(parsedData.timestamp),
            },
        });
    }

    // Learn from user decision
    await smartCategorizationService.learnFromUserDecision(
        userId, 
        {
            originalMessage: parsedData.originalMessage,
            timestamp: parsedData.timestamp,
            amount: parsedData.amount,
            merchant: parsedData.merchant,
            category: parsedData.category,
            type: parsedData.type,
            source: parsedData.source
        }, 
        Number(categoryId),
        wasCorrection
    );

    res.json({
        success: true,
        transaction: {
            id: record?.id,
            type: parsedData.type,
            amount: parsedData.amount,
            merchant: parsedData.merchant,
            categoryId: Number(categoryId),
            categoryName: category.name,
            timestamp: parsedData.timestamp
        },
        learned: true
    });
};

/**
 * Get smart categorization suggestions for a transaction
 */
export const getCategorySuggestions = async (req: Request, res: Response) => {
    const userId = (req as any).user.id;
    const { messageId } = req.params;

    const message = await prisma.message.findUnique({
        where: { id: Number(messageId) }
    });

    if (!message || message.userId !== userId) {
        throw createError(404, 'Message not found');
    }

    if (!message.parsedData) {
        throw createError(400, 'Message has no parsed data');
    }

    const parsedData = message.parsedData as any;
    const categorizationResult = await smartCategorizationService.categorizeTransaction(
        userId, 
        {
            originalMessage: parsedData.originalMessage,
            timestamp: parsedData.timestamp,
            amount: parsedData.amount,
            merchant: parsedData.merchant,
            category: parsedData.category,
            type: parsedData.type,
            source: parsedData.source
        }
    );

    res.json(categorizationResult);
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
