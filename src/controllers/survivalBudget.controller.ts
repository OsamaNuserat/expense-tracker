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

    const budget = await prisma.survivalBudget.findFirst({
        where: {
            userId,
            startDate: { lte: now },
            endDate: { gte: now },
        },
    });

    if (!budget) {
        throw createError(404, 'No active survival budget found');
    }

    const { startDate, endDate, amount } = budget;

    const totalWeeks = Math.ceil((endDate.getTime() - startDate.getTime()) / (7 * 24 * 60 * 60 * 1000));

    const weeklyBudget = amount / totalWeeks;

    const daysSinceStart = Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const currentWeekIndex = Math.floor(daysSinceStart / 7);

    const weekStart = new Date(startDate);
    weekStart.setDate(weekStart.getDate() + currentWeekIndex * 7);

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);

    const weeklyExpenses = await prisma.expense.aggregate({
        _sum: {
            amount: true,
        },
        where: {
            userId,
            createdAt: {
                gte: weekStart,
                lt: weekEnd,
            },
        },
    });

    const spent = weeklyExpenses._sum?.amount ?? 0;

    const remaining = weeklyBudget - spent;

    res.json({
        budget,
        totalWeeks,
        weeklyBudget,
        currentWeek: {
            start: weekStart,
            end: weekEnd,
            spent,
            remaining,
        },
    });
};
