import { Request, Response } from 'express';
import prisma from '../prisma/client';
import { smartCategorizationService } from '../services/smartCategorization';
import createError from 'http-errors';
import { sendPushToUser } from '../utils/fcmPush';

export interface CliqWorkflowData {
  messageId: number;
  amount: number;
  senderName: string;
  transactionType: 'income' | 'expense';
  suggestedCategory?: {
    id: number;
    name: string;
    confidence: number;
  };
  isRecurring?: boolean;
  businessLikeSender?: boolean;
}

/**
 * Get CLIQ transaction details for popup workflow
 */
export const getCliqTransactionDetails = async (req: Request, res: Response) => {
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

  if (parsedData.source !== 'CliQ') {
    throw createError(400, 'Not a CLIQ transaction');
  }

  // Get smart categorization suggestions
  const categorization = await smartCategorizationService.categorizeTransaction(userId, {
    originalMessage: parsedData.originalMessage,
    timestamp: parsedData.timestamp,
    amount: parsedData.amount,
    merchant: parsedData.merchant,
    category: parsedData.category,
    type: parsedData.type,
    source: parsedData.source
  });

  // Check if this is a recurring pattern
  const existingPattern = await prisma.cliqPattern.findFirst({
    where: {
      userId,
      normalizedSender: parsedData.merchant?.toLowerCase().trim(),
      transactionType: parsedData.type
    }
  });

  // Get user's categories for the transaction type
  const categories = await prisma.category.findMany({
    where: {
      userId,
      type: parsedData.type.toUpperCase()
    },
    orderBy: { name: 'asc' }
  });

  const workflowData: CliqWorkflowData = {
    messageId: Number(messageId),
    amount: parsedData.amount,
    senderName: parsedData.merchant,
    transactionType: parsedData.type,
    isRecurring: existingPattern?.isRecurring || false,
    businessLikeSender: existingPattern?.isBusinessLike || 
      parsedData.merchant?.toLowerCase().includes('company') ||
      parsedData.merchant?.toLowerCase().includes('شركة')
  };

  if (categorization.categoryId && categorization.confidence > 0.5) {
    workflowData.suggestedCategory = {
      id: categorization.categoryId,
      name: categorization.categoryName!,
      confidence: categorization.confidence
    };
  }

  res.json({
    transaction: workflowData,
    suggestions: categorization.suggestions.slice(0, 5),
    categories: categories.map(cat => ({
      id: cat.id,
      name: cat.name,
      type: cat.type
    })),
    confidence: categorization.confidence,
    reason: categorization.reason
  });
};

/**
 * Complete CLIQ categorization workflow
 */
export const completeCliqCategorization = async (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  const { 
    messageId, 
    categoryId, 
    transactionType, 
    amount,
    createNewCategory,
    newCategoryName 
  } = req.body;

  if (!messageId || (!categoryId && !createNewCategory)) {
    throw createError(400, 'Message ID and category selection are required');
  }

  // Get the message
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
  let finalCategoryId = categoryId;

  // Create new category if requested
  if (createNewCategory && newCategoryName) {
    const newCategory = await prisma.category.create({
      data: {
        name: newCategoryName,
        type: transactionType.toUpperCase(),
        userId
      }
    });
    finalCategoryId = newCategory.id;
  }

  // Validate categoryId
  if (!finalCategoryId || isNaN(Number(finalCategoryId))) {
    throw createError(400, 'Valid category ID is required');
  }

  // Verify category exists and belongs to user
  const category = await prisma.category.findUnique({
    where: { id: Number(finalCategoryId) }
  });

  if (!category || category.userId !== userId) {
    throw createError(404, 'Category not found or you do not have permission to use this category');
  }

  // Create the transaction record
  let record = null;
  const transactionAmount = amount || parsedData.amount;
  const timestamp = new Date(parsedData.timestamp);

  if (transactionType === 'expense') {
    record = await prisma.expense.create({
      data: {
        amount: transactionAmount,
        merchant: parsedData.merchant,
        categoryId: Number(finalCategoryId),
        userId,
        createdAt: timestamp,
      },
    });
  } else if (transactionType === 'income') {
    record = await prisma.income.create({
      data: {
        amount: transactionAmount,
        merchant: parsedData.merchant,
        categoryId: Number(finalCategoryId),
        userId,
        createdAt: timestamp,
      },
    });
  }

  // Learn from this CLIQ categorization
  await smartCategorizationService.learnFromUserDecision(
    userId,
    {
      originalMessage: parsedData.originalMessage,
      timestamp: parsedData.timestamp,
      amount: transactionAmount,
      merchant: parsedData.merchant,
      category: parsedData.category,
      type: transactionType,
      source: 'CliQ'
    },
    Number(finalCategoryId),
    false
  );

  // Send confirmation notification
  await sendPushToUser(
    userId,
    'CLIQ Transaction Categorized',
    `${transactionAmount} JOD ${transactionType === 'income' ? 'from' : 'to'} ${parsedData.merchant} → ${category.name}`,
    { 
      transactionId: record?.id.toString() || '',
      categoryName: category.name,
      type: 'cliq_completed'
    }
  );

  res.json({
    success: true,
    transaction: {
      id: record?.id,
      type: transactionType,
      amount: transactionAmount,
      merchant: parsedData.merchant,
      categoryId: Number(finalCategoryId),
      categoryName: category.name,
      timestamp: parsedData.timestamp,
      source: 'CliQ'
    },
    learned: true,
    newCategoryCreated: !!createNewCategory
  });
};

/**
 * Get CLIQ transaction patterns for a user
 */
export const getCliqPatterns = async (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  const { type } = req.query; // 'income' or 'expense'

  const whereClause: any = { userId };
  if (type) {
    whereClause.transactionType = type;
  }

  const patterns = await prisma.cliqPattern.findMany({
    where: whereClause,
    include: { category: true },
    orderBy: [
      { isRecurring: 'desc' },
      { useCount: 'desc' },
      { lastSeen: 'desc' }
    ]
  });

  const patternsSummary = patterns.map(pattern => ({
    senderName: pattern.senderName,
    categoryName: pattern.category.name,
    transactionType: pattern.transactionType,
    averageAmount: pattern.averageAmount,
    isRecurring: pattern.isRecurring,
    frequency: pattern.frequency,
    useCount: pattern.useCount,
    lastSeen: pattern.lastSeen,
    confidence: pattern.confidence,
    isBusinessLike: pattern.isBusinessLike
  }));

  res.json({
    patterns: patternsSummary,
    total: patterns.length,
    recurring: patterns.filter(p => p.isRecurring).length,
    business: patterns.filter(p => p.isBusinessLike).length
  });
};

/**
 * Update CLIQ pattern preferences
 */
export const updateCliqPattern = async (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  const { senderName, transactionType, isRecurring, categoryId } = req.body;

  if (!senderName || !transactionType) {
    throw createError(400, 'Sender name and transaction type are required');
  }

  const normalizedSender = senderName.toLowerCase().trim();

  // Find existing pattern
  const existingPattern = await prisma.cliqPattern.findUnique({
    where: {
      userId_normalizedSender_transactionType: {
        userId,
        normalizedSender,
        transactionType
      }
    }
  });

  if (!existingPattern) {
    throw createError(404, 'CLIQ pattern not found');
  }

  // Update the pattern
  const updateData: any = {};
  
  if (typeof isRecurring === 'boolean') {
    updateData.isRecurring = isRecurring;
  }

  if (categoryId) {
    // Validate categoryId format
    if (isNaN(Number(categoryId))) {
      throw createError(400, 'Valid category ID is required');
    }
    
    // Verify category belongs to user
    const category = await prisma.category.findUnique({
      where: { id: Number(categoryId) }
    });

    if (!category || category.userId !== userId) {
      throw createError(404, 'Category not found or you do not have permission to use this category');
    }

    updateData.categoryId = Number(categoryId);
  }

  const updatedPattern = await prisma.cliqPattern.update({
    where: { id: existingPattern.id },
    data: updateData,
    include: { category: true }
  });

  res.json({
    success: true,
    pattern: {
      senderName: updatedPattern.senderName,
      categoryName: updatedPattern.category.name,
      transactionType: updatedPattern.transactionType,
      isRecurring: updatedPattern.isRecurring,
      confidence: updatedPattern.confidence
    }
  });
};
