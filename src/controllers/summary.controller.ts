import { Request, Response } from 'express';
import prisma from '../prisma/client';

export const getExpenseSummary = async (req: Request, res: Response) => {
  const userId = (req as any).user.id;

  const results = await prisma.expense.groupBy({
    by: ['createdAt'],
    where: { userId },
    _sum: { amount: true },
  });

  const formatted = results.map(r => ({
    month: r.createdAt.toISOString().slice(0, 7), // YYYY-MM
    total: r._sum.amount ?? 0,
  }));

  res.json(formatted);
};

export const getIncomeSummary = async (req: Request, res: Response) => {
  const userId = (req as any).user.id;

  const rawSummary = await prisma.$queryRaw<{ month: string; total: number }[]>`
    SELECT
      TO_CHAR(DATE_TRUNC('month', "createdAt"), 'YYYY-MM') AS month,
      SUM(amount)::float AS total
    FROM "Income"
    WHERE "userId" = ${userId}
    GROUP BY month
    ORDER BY month DESC;
  `;

  res.json(rawSummary);
};

export const getExpensesByCategory = async (req: Request, res: Response) => {
  const userId = (req as any).user.id;

  const byCategory = await prisma.expense.groupBy({
    by: ['categoryId'],
    where: { userId },
    _sum: { amount: true },
  });

  const categories = await prisma.category.findMany({ where: { userId } });

  const result = byCategory.map(row => {
    const category = categories.find(c => c.id === row.categoryId);
    return {
      category: category?.name || 'Unknown',
      total: row._sum.amount ?? 0,
    };
  });

  res.json(result);
};

export const getIncomesByCategory = async (req: Request, res: Response) => {
  const userId = (req as any).user.id;

  const byCategory = await prisma.income.groupBy({
    by: ['categoryId'],
    where: { userId },
    _sum: { amount: true },
  });

  const categories = await prisma.category.findMany({ where: { userId } });

  const result = byCategory.map(row => {
    const category = categories.find(c => c.id === row.categoryId);
    return {
      category: category?.name || 'Unknown',
      total: row._sum.amount ?? 0,
    };
  });

  res.json(result);
};
