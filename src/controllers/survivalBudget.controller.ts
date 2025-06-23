import { Request, Response } from 'express';
import prisma from '../prisma/client';
import createError from 'http-errors';

export const createSurvivalBudget = async (req: Request, res: Response) => {
    const userId = (req as any).user.id;
    const { amount, startDate, endDate } = req.body;

    if (!amount || !startDate || !endDate) {
        throw createError(400, 'amount, startDate, and endDate are required');
    }

    const budget = await prisma.survivalBudget.upsert({
        where: { userId_startDate: { userId, startDate: new Date(startDate) } },
        update: { amount, endDate: new Date(endDate) },
        create: {
            userId,
            amount,
            startDate: new Date(startDate),
            endDate: new Date(endDate),
        },
    });

    res.status(201).json(budget);
};
export const getSurvivalBudget = async (req: Request, res: Response) => {
    const userId = (req as any).user.id;
    const now = new Date();

    // Get active budget for current date
    const budget = await prisma.survivalBudget.findFirst({
        where: {
            userId,
            startDate: { lte: now },
            endDate: { gte: now },
        },
    });

    if (!budget) return res.status(404).json({ message: 'No active budget' });

    // Calculate total weeks properly
    const start = new Date(budget.startDate);
    const end = new Date(budget.endDate);
    const totalDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    const totalWeeks = Math.ceil(totalDays / 7);
    const weeklyBudget = budget.amount / totalWeeks;

    // Calculate current week boundaries (Sunday to Saturday)
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay()); // Sunday
    weekStart.setHours(0, 0, 0, 0); // Start of day

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6); // Saturday
    weekEnd.setHours(23, 59, 59, 999); // End of day

    // Get expenses for current week
    const expenses = await prisma.expense.findMany({
        where: {
            userId,
            createdAt: {
                gte: weekStart,
                lte: weekEnd,
            },
        },
    });

    const spent = expenses.reduce((sum, expense) => sum + expense.amount, 0);

    res.json({
        budget,
        totalWeeks,
        weeklyBudget,
        currentWeek: {
            start: weekStart,
            end: weekEnd,
            spent,
            remaining: weeklyBudget - spent,
        },
    });
};

export async function updateSurvivalBudget(userId: number, amount: number, expenseDate: Date) {
    // Find active budget for expense date
    const budget = await prisma.survivalBudget.findFirst({
        where: {
            userId,
            startDate: { lte: expenseDate },
            endDate: { gte: expenseDate },
        },
    });

    if (!budget) return;

    // Update budget amount
    await prisma.survivalBudget.update({
        where: { id: budget.id },
        data: {
            amount: budget.amount - amount,
            updatedAt: new Date(),
        },
    });
}
