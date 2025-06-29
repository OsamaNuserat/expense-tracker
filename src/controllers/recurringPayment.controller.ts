import { Request, Response } from 'express';
import prisma from '../prisma/client';
import createError from 'http-errors';
import { RecurringFrequency } from '@prisma/client';

/**
 * Get all recurring payments for a user
 */
export const getRecurringPayments = async (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  const { active } = req.query;

  const whereClause: any = { userId };
  if (active !== undefined) {
    whereClause.isActive = active === 'true';
  }

  const recurringPayments = await prisma.recurringPayment.findMany({
    where: whereClause,
    include: {
      category: {
        select: {
          id: true,
          name: true,
          type: true
        }
      }
    },
    orderBy: [
      { isActive: 'desc' },
      { nextDue: 'asc' },
      { name: 'asc' }
    ]
  });

  // Group by auto-detected vs user-added
  const detected = recurringPayments.filter(rp => rp.isAutoDetected);
  const userAdded = recurringPayments.filter(rp => !rp.isAutoDetected);

  res.json({
    detected: detected.map(formatRecurringPayment),
    userAdded: userAdded.map(formatRecurringPayment),
    total: recurringPayments.length,
    active: recurringPayments.filter(rp => rp.isActive).length
  });
};

/**
 * Create a new recurring payment
 */
export const createRecurringPayment = async (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  const {
    name,
    description,
    amount,
    categoryId,
    frequency,
    dayOfMonth,
    dayOfWeek,
    merchant,
    reminders
  } = req.body;

  if (!name || !amount || !categoryId || !frequency) {
    throw createError(400, 'Name, amount, category, and frequency are required');
  }

  // Validate category belongs to user
  const category = await prisma.category.findUnique({
    where: { id: Number(categoryId) }
  });

  if (!category || category.userId !== userId) {
    throw createError(404, 'Category not found');
  }

  // Validate frequency-specific fields
  if (frequency === 'MONTHLY' && (!dayOfMonth || dayOfMonth < 1 || dayOfMonth > 31)) {
    throw createError(400, 'Day of month must be between 1-31 for monthly payments');
  }

  if (frequency === 'WEEKLY' && (!dayOfWeek || dayOfWeek < 1 || dayOfWeek > 7)) {
    throw createError(400, 'Day of week must be between 1-7 for weekly payments');
  }

  // Calculate next due date
  const nextDue = calculateNextDueDate(frequency, dayOfMonth, dayOfWeek);

  const recurringPayment = await prisma.recurringPayment.create({
    data: {
      userId,
      name: name.trim(),
      description: description?.trim(),
      amount: Number(amount),
      categoryId: Number(categoryId),
      frequency,
      dayOfMonth: frequency === 'MONTHLY' ? Number(dayOfMonth) : null,
      dayOfWeek: frequency === 'WEEKLY' ? Number(dayOfWeek) : null,
      merchant: merchant?.trim(),
      nextDue,
      reminders: reminders || { enabled: true, daysBefore: [3, 1] }
    },
    include: {
      category: {
        select: {
          id: true,
          name: true,
          type: true
        }
      }
    }
  });

  res.status(201).json({
    success: true,
    recurringPayment: formatRecurringPayment(recurringPayment)
  });
};

/**
 * Update a recurring payment
 */
export const updateRecurringPayment = async (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  const { id } = req.params;
  const {
    name,
    description,
    amount,
    categoryId,
    frequency,
    dayOfMonth,
    dayOfWeek,
    isActive,
    merchant,
    reminders
  } = req.body;

  // Find existing payment
  const existingPayment = await prisma.recurringPayment.findUnique({
    where: { id: Number(id) }
  });

  if (!existingPayment || existingPayment.userId !== userId) {
    throw createError(404, 'Recurring payment not found');
  }

  // Validate category if provided
  if (categoryId) {
    const category = await prisma.category.findUnique({
      where: { id: Number(categoryId) }
    });

    if (!category || category.userId !== userId) {
      throw createError(404, 'Category not found');
    }
  }

  // Build update data
  const updateData: any = {};
  
  if (name !== undefined) updateData.name = name.trim();
  if (description !== undefined) updateData.description = description?.trim();
  if (amount !== undefined) updateData.amount = Number(amount);
  if (categoryId !== undefined) updateData.categoryId = Number(categoryId);
  if (frequency !== undefined) updateData.frequency = frequency;
  if (dayOfMonth !== undefined) updateData.dayOfMonth = frequency === 'MONTHLY' ? Number(dayOfMonth) : null;
  if (dayOfWeek !== undefined) updateData.dayOfWeek = frequency === 'WEEKLY' ? Number(dayOfWeek) : null;
  if (isActive !== undefined) updateData.isActive = Boolean(isActive);
  if (merchant !== undefined) updateData.merchant = merchant?.trim();
  if (reminders !== undefined) updateData.reminders = reminders;

  // Recalculate next due date if frequency or timing changed
  if (frequency || dayOfMonth || dayOfWeek) {
    updateData.nextDue = calculateNextDueDate(
      frequency || existingPayment.frequency,
      dayOfMonth || existingPayment.dayOfMonth,
      dayOfWeek || existingPayment.dayOfWeek
    );
  }

  const updatedPayment = await prisma.recurringPayment.update({
    where: { id: Number(id) },
    data: updateData,
    include: {
      category: {
        select: {
          id: true,
          name: true,
          type: true
        }
      }
    }
  });

  res.json({
    success: true,
    recurringPayment: formatRecurringPayment(updatedPayment)
  });
};

/**
 * Delete a recurring payment
 */
export const deleteRecurringPayment = async (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  const { id } = req.params;

  const existingPayment = await prisma.recurringPayment.findUnique({
    where: { id: Number(id) }
  });

  if (!existingPayment || existingPayment.userId !== userId) {
    throw createError(404, 'Recurring payment not found');
  }

  await prisma.recurringPayment.delete({
    where: { id: Number(id) }
  });

  res.json({
    success: true,
    message: 'Recurring payment deleted successfully'
  });
};

/**
 * Get upcoming recurring payments (due in next 30 days)
 */
export const getUpcomingPayments = async (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  const { days = 30 } = req.query;

  const upcomingDate = new Date();
  upcomingDate.setDate(upcomingDate.getDate() + Number(days));

  const upcomingPayments = await prisma.recurringPayment.findMany({
    where: {
      userId,
      isActive: true,
      nextDue: {
        lte: upcomingDate
      }
    },
    include: {
      category: {
        select: {
          id: true,
          name: true,
          type: true
        }
      }
    },
    orderBy: { nextDue: 'asc' }
  });

  res.json({
    upcomingPayments: upcomingPayments.map(formatRecurringPayment),
    total: upcomingPayments.length
  });
};

/**
 * Auto-detect recurring payments from transaction history
 */
export const detectRecurringPayments = async (req: Request, res: Response) => {
  const userId = (req as any).user.id;

  // Look for patterns in expenses over the last 6 months
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const expenses = await prisma.expense.findMany({
    where: {
      userId,
      createdAt: {
        gte: sixMonthsAgo
      }
    },
    include: {
      category: true
    },
    orderBy: { createdAt: 'asc' }
  });

  // Group by merchant and look for patterns
  const merchantGroups = groupBy(expenses, 'merchant');
  const detectedPatterns = [];

  for (const [merchant, transactions] of Object.entries(merchantGroups)) {
    if (!merchant || transactions.length < 2) continue;

    const pattern = analyzeTransactionPattern(transactions);
    if (pattern.isRecurring && pattern.confidence > 0.7) {
      // Check if we already have this as a recurring payment
      const existing = await prisma.recurringPayment.findFirst({
        where: {
          userId,
          merchant: merchant,
          isAutoDetected: true
        }
      });

      if (!existing) {
        detectedPatterns.push({
          merchant,
          ...pattern,
          suggestedName: generatePaymentName(merchant, pattern)
        });
      }
    }
  }

  res.json({
    detectedPatterns,
    total: detectedPatterns.length
  });
};

/**
 * Create recurring payment from detected pattern
 */
export const createFromDetection = async (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  const { merchant, amount, categoryId, frequency, dayOfMonth, name } = req.body;

  if (!merchant || !amount || !categoryId || !frequency || !name) {
    throw createError(400, 'All fields are required for creating from detection');
  }

  // Validate category
  const category = await prisma.category.findUnique({
    where: { id: Number(categoryId) }
  });

  if (!category || category.userId !== userId) {
    throw createError(404, 'Category not found');
  }

  const nextDue = calculateNextDueDate(frequency, dayOfMonth);

  const recurringPayment = await prisma.recurringPayment.create({
    data: {
      userId,
      name: name.trim(),
      amount: Number(amount),
      categoryId: Number(categoryId),
      frequency,
      dayOfMonth: frequency === 'MONTHLY' ? Number(dayOfMonth) : null,
      merchant: merchant.trim(),
      nextDue,
      isAutoDetected: true,
      detectionPattern: {
        confidence: 0.8,
        transactionCount: 3,
        detectedAt: new Date()
      }
    },
    include: {
      category: {
        select: {
          id: true,
          name: true,
          type: true
        }
      }
    }
  });

  res.status(201).json({
    success: true,
    recurringPayment: formatRecurringPayment(recurringPayment)
  });
};

// Helper functions
function formatRecurringPayment(payment: any) {
  return {
    id: payment.id,
    name: payment.name,
    description: payment.description,
    amount: payment.amount,
    category: payment.category,
    frequency: payment.frequency,
    dayOfMonth: payment.dayOfMonth,
    dayOfWeek: payment.dayOfWeek,
    isActive: payment.isActive,
    isAutoDetected: payment.isAutoDetected,
    merchant: payment.merchant,
    nextDue: payment.nextDue,
    dueIn: Math.ceil((payment.nextDue.getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
    reminders: payment.reminders,
    createdAt: payment.createdAt
  };
}

function calculateNextDueDate(frequency: RecurringFrequency, dayOfMonth?: number | null, dayOfWeek?: number | null): Date {
  const now = new Date();
  const nextDue = new Date();

  switch (frequency) {
    case 'WEEKLY':
      if (dayOfWeek) {
        const currentDay = nextDue.getDay() || 7; // Convert Sunday from 0 to 7
        const daysUntilNext = ((dayOfWeek - currentDay) + 7) % 7;
        if (daysUntilNext === 0) {
          nextDue.setDate(nextDue.getDate() + 7); // Next week
        } else {
          nextDue.setDate(nextDue.getDate() + daysUntilNext);
        }
      }
      break;

    case 'MONTHLY':
      if (dayOfMonth) {
        nextDue.setDate(dayOfMonth);
        if (nextDue <= now) {
          nextDue.setMonth(nextDue.getMonth() + 1);
        }
        // Handle month overflow (e.g., Feb 31 -> Mar 3)
        if (nextDue.getDate() !== dayOfMonth) {
          nextDue.setDate(0); // Last day of previous month
        }
      }
      break;

    case 'QUARTERLY':
      nextDue.setMonth(nextDue.getMonth() + 3);
      break;

    case 'YEARLY':
      nextDue.setFullYear(nextDue.getFullYear() + 1);
      break;
  }

  return nextDue;
}

function groupBy<T>(array: T[], key: keyof T): Record<string, T[]> {
  return array.reduce((groups, item) => {
    const value = String(item[key] || 'unknown');
    groups[value] = groups[value] || [];
    groups[value].push(item);
    return groups;
  }, {} as Record<string, T[]>);
}

function analyzeTransactionPattern(transactions: any[]) {
  if (transactions.length < 2) {
    return { isRecurring: false, confidence: 0 };
  }

  // Sort by date
  transactions.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  // Calculate intervals between transactions
  const intervals = [];
  for (let i = 1; i < transactions.length; i++) {
    const prev = new Date(transactions[i - 1].createdAt);
    const curr = new Date(transactions[i].createdAt);
    intervals.push(Math.round((curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24)));
  }

  // Check for regular intervals
  const avgInterval = intervals.reduce((sum, int) => sum + int, 0) / intervals.length;
  const variance = intervals.reduce((sum, int) => sum + Math.pow(int - avgInterval, 2), 0) / intervals.length;
  const stdDev = Math.sqrt(variance);

  // Check amount consistency
  const amounts = transactions.map(t => t.amount);
  const avgAmount = amounts.reduce((sum, amt) => sum + amt, 0) / amounts.length;
  const amountVariance = amounts.reduce((sum, amt) => sum + Math.pow(amt - avgAmount, 2), 0) / amounts.length;

  // Determine if it's recurring
  const intervalConsistency = stdDev / avgInterval;
  const amountConsistency = Math.sqrt(amountVariance) / avgAmount;

  const isRecurring = intervalConsistency < 0.2 && amountConsistency < 0.1;
  const confidence = Math.max(0, 1 - (intervalConsistency + amountConsistency));

  // Determine frequency
  let frequency: RecurringFrequency = 'MONTHLY';
  let dayOfMonth = null;

  if (avgInterval >= 25 && avgInterval <= 35) {
    frequency = 'MONTHLY';
    // Calculate most common day of month
    const daysOfMonth = transactions.map(t => new Date(t.createdAt).getDate());
    dayOfMonth = Math.round(daysOfMonth.reduce((sum, day) => sum + day, 0) / daysOfMonth.length);
  } else if (avgInterval >= 6 && avgInterval <= 8) {
    frequency = 'WEEKLY';
  } else if (avgInterval >= 85 && avgInterval <= 95) {
    frequency = 'QUARTERLY';
  } else if (avgInterval >= 360 && avgInterval <= 370) {
    frequency = 'YEARLY';
  }

  return {
    isRecurring,
    confidence,
    frequency,
    dayOfMonth,
    averageAmount: avgAmount,
    transactionCount: transactions.length,
    categoryId: transactions[0].categoryId
  };
}

function generatePaymentName(merchant: string, pattern: any): string {
  // Generate a friendly name based on merchant and pattern
  const cleanMerchant = merchant.replace(/[^a-zA-Z\s]/g, '').trim();
  
  if (cleanMerchant.toLowerCase().includes('rent')) return 'Rent';
  if (cleanMerchant.toLowerCase().includes('loan')) return 'Loan Payment';
  if (cleanMerchant.toLowerCase().includes('insurance')) return 'Insurance';
  if (cleanMerchant.toLowerCase().includes('utility') || cleanMerchant.toLowerCase().includes('electric')) return 'Utilities';
  if (cleanMerchant.toLowerCase().includes('internet') || cleanMerchant.toLowerCase().includes('telecom')) return 'Internet';
  if (cleanMerchant.toLowerCase().includes('gym') || cleanMerchant.toLowerCase().includes('fitness')) return 'Gym Membership';
  if (cleanMerchant.toLowerCase().includes('streaming') || cleanMerchant.toLowerCase().includes('netflix') || cleanMerchant.toLowerCase().includes('subscription')) return 'Streaming Service';
  
  return cleanMerchant || 'Recurring Payment';
}
