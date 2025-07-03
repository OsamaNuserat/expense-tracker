import { Request, Response } from 'express';
import prisma from '../prisma/client';
import createError from 'http-errors';

/**
 * Get all expenses for the authenticated user
 */
export const getExpenses = async (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  const { 
    page = 1,
    limit = 10,
    startDate,
    endDate,
    categoryId,
    merchant
  } = req.query;

  const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
  const take = parseInt(limit as string);

  const whereClause: any = { userId };

  // Add date filtering
  if (startDate || endDate) {
    whereClause.createdAt = {};
    if (startDate) whereClause.createdAt.gte = new Date(startDate as string);
    if (endDate) whereClause.createdAt.lte = new Date(endDate as string);
  }

  // Add category filtering
  if (categoryId) {
    whereClause.categoryId = parseInt(categoryId as string);
  }

  // Add merchant filtering
  if (merchant) {
    whereClause.merchant = {
      contains: merchant as string,
      mode: 'insensitive'
    };
  }

  const [expenses, total] = await Promise.all([
    prisma.expense.findMany({
      where: whereClause,
      include: {
        category: true
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take
    }),
    prisma.expense.count({ where: whereClause })
  ]);

  const totalPages = Math.ceil(total / take);

  res.json({
    expenses,
    pagination: {
      page: parseInt(page as string),
      limit: take,
      total,
      totalPages,
      hasNext: parseInt(page as string) < totalPages,
      hasPrev: parseInt(page as string) > 1
    }
  });
};

/**
 * Get a specific expense by ID
 */
export const getExpense = async (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  const { id } = req.params;

  const expenseId = parseInt(id);
  if (isNaN(expenseId) || expenseId <= 0) {
    throw createError(400, 'Invalid expense ID');
  }

  const expense = await prisma.expense.findFirst({
    where: { 
      id: expenseId,
      userId 
    },
    include: {
      category: true
    }
  });

  if (!expense) {
    throw createError(404, 'Expense not found');
  }

  res.json(expense);
};

/**
 * Create a new expense
 */
export const createExpense = async (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  const { amount, categoryId, merchant, description } = req.body;

  // Validate required fields
  if (!amount || !categoryId) {
    throw createError(400, 'Amount and category are required');
  }

  if (amount <= 0) {
    throw createError(400, 'Amount must be greater than 0');
  }

  // Verify category exists and belongs to user
  const category = await prisma.category.findFirst({
    where: { 
      id: categoryId,
      userId,
      type: 'EXPENSE'
    }
  });

  if (!category) {
    throw createError(404, 'Category not found or not an expense category');
  }

  const expense = await prisma.expense.create({
    data: {
      amount: parseFloat(amount),
      categoryId,
      userId,
      merchant: merchant || null
    },
    include: {
      category: true
    }
  });

  res.status(201).json(expense);
};

/**
 * Update an expense
 */
export const updateExpense = async (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  const { id } = req.params;
  const { amount, categoryId, merchant } = req.body;

  const expenseId = parseInt(id);
  if (isNaN(expenseId) || expenseId <= 0) {
    throw createError(400, 'Invalid expense ID');
  }

  // Check if expense exists and belongs to user
  const existingExpense = await prisma.expense.findFirst({
    where: { 
      id: expenseId,
      userId 
    }
  });

  if (!existingExpense) {
    throw createError(404, 'Expense not found');
  }

  // Prepare update data
  const updateData: any = {};
  
  if (amount !== undefined) {
    if (amount <= 0) {
      throw createError(400, 'Amount must be greater than 0');
    }
    updateData.amount = parseFloat(amount);
  }

  if (categoryId !== undefined) {
    // Verify category exists and belongs to user
    const category = await prisma.category.findFirst({
      where: { 
        id: categoryId,
        userId,
        type: 'EXPENSE'
      }
    });

    if (!category) {
      throw createError(404, 'Category not found or not an expense category');
    }
    
    updateData.categoryId = categoryId;
  }

  if (merchant !== undefined) {
    updateData.merchant = merchant;
  }

  const updatedExpense = await prisma.expense.update({
    where: { id: expenseId },
    data: updateData,
    include: {
      category: true
    }
  });

  res.json(updatedExpense);
};

/**
 * Delete an expense
 */
export const deleteExpense = async (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  const { id } = req.params;

  const expenseId = parseInt(id);
  if (isNaN(expenseId) || expenseId <= 0) {
    throw createError(400, 'Invalid expense ID');
  }

  // Check if expense exists and belongs to user
  const existingExpense = await prisma.expense.findFirst({
    where: { 
      id: expenseId,
      userId 
    }
  });

  if (!existingExpense) {
    throw createError(404, 'Expense not found');
  }

  await prisma.expense.delete({
    where: { id: expenseId }
  });

  res.status(204).send();
};
