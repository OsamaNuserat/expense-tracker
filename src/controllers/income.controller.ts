import { Request, Response } from 'express';
import prisma from '../prisma/client';
import createError from 'http-errors';

/**
 * Get all incomes for the authenticated user
 */
export const getIncomes = async (req: Request, res: Response) => {
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

  const [incomes, total] = await Promise.all([
    prisma.income.findMany({
      where: whereClause,
      include: {
        category: true
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take
    }),
    prisma.income.count({ where: whereClause })
  ]);

  const totalPages = Math.ceil(total / take);

  res.json({
    incomes,
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
 * Get a specific income by ID
 */
export const getIncome = async (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  const { id } = req.params;

  const incomeId = parseInt(id);
  if (isNaN(incomeId) || incomeId <= 0) {
    throw createError(400, 'Invalid income ID');
  }

  const income = await prisma.income.findFirst({
    where: { 
      id: incomeId,
      userId 
    },
    include: {
      category: true
    }
  });

  if (!income) {
    throw createError(404, 'Income not found');
  }

  res.json(income);
};

/**
 * Create a new income
 */
export const createIncome = async (req: Request, res: Response) => {
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
      type: 'INCOME'
    }
  });

  if (!category) {
    throw createError(404, 'Category not found or not an income category');
  }

  const income = await prisma.income.create({
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

  res.status(201).json(income);
};

/**
 * Update an income
 */
export const updateIncome = async (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  const { id } = req.params;
  const { amount, categoryId, merchant } = req.body;

  const incomeId = parseInt(id);
  if (isNaN(incomeId) || incomeId <= 0) {
    throw createError(400, 'Invalid income ID');
  }

  // Check if income exists and belongs to user
  const existingIncome = await prisma.income.findFirst({
    where: { 
      id: incomeId,
      userId 
    }
  });

  if (!existingIncome) {
    throw createError(404, 'Income not found');
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
        type: 'INCOME'
      }
    });

    if (!category) {
      throw createError(404, 'Category not found or not an income category');
    }
    
    updateData.categoryId = categoryId;
  }

  if (merchant !== undefined) {
    updateData.merchant = merchant;
  }

  const updatedIncome = await prisma.income.update({
    where: { id: incomeId },
    data: updateData,
    include: {
      category: true
    }
  });

  res.json(updatedIncome);
};

/**
 * Delete an income
 */
export const deleteIncome = async (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  const { id } = req.params;

  const incomeId = parseInt(id);
  if (isNaN(incomeId) || incomeId <= 0) {
    throw createError(400, 'Invalid income ID');
  }

  // Check if income exists and belongs to user
  const existingIncome = await prisma.income.findFirst({
    where: { 
      id: incomeId,
      userId 
    }
  });

  if (!existingIncome) {
    throw createError(404, 'Income not found');
  }

  await prisma.income.delete({
    where: { id: incomeId }
  });

  res.status(204).send();
};
