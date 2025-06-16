import { Router, Request, Response } from 'express';
import prisma from '../prisma/client';
import { parseMessage } from '../services/parser';

const router = Router();


router.post('/parse-sms', async (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  const { content, timestamp } = req.body;

  const message = await prisma.message.create({
    data: { content, userId },
  });

  const parsed = parseMessage(content, timestamp);
  if (!parsed) {
    return res.json({ message, parsed: null, record: null });
  }

  let record = null;
  if (parsed.type === 'expense') {
    record = await prisma.expense.create({
      data: {
        amount: parsed.amount,
        category: parsed.category,  
        userId,
      },
    });
  } else if (parsed.type === 'income') {
    record = await prisma.income.create({
      data: {
        amount: parsed.amount,
        source: parsed.category,  
        userId,
      },
    });
  }

  return res.json({ message, parsed, record });
});


router.get('/messages', async (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  const messages = await prisma.message.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });
  res.json(messages);
});


router.get('/expenses/summary', async (req, res) => {
  const userId = (req as any).user.id;

  const results = await prisma.expense.groupBy({
    by: ['createdAt'],
    where: { userId },
    _sum: { amount: true },
  });

  const formatted = results.map(r => ({
    month: r.createdAt.toISOString().slice(0, 7),
    total: r._sum.amount!,
  }));

  res.json(formatted);
});



router.get('/incomes/summary', async (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  const rawSummary = await prisma.$queryRaw<{ month: string; total: number }[]>`
    SELECT
      DATE_TRUNC('month', "createdAt") AS month,
      SUM(amount)::float AS total
    FROM "Income"
    WHERE "userId" = ${userId}
    GROUP BY month
    ORDER BY month DESC;
  `;
  res.json(rawSummary);
});


// GET /api/expenses/by-category
router.get('/expenses/by-category', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const byCategory = await prisma.expense.groupBy({
      by: ['category'],
      where: { userId },
      _sum: { amount: true },
    });
    res.json(byCategory.map(row => ({ category: row.category, total: row._sum.amount! })));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


router.get('/incomes/by-category', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const byCategory = await prisma.income.groupBy({
      by: ['source'],
      where: { userId },
      _sum: { amount: true },
    });
    res.json(byCategory.map(row => ({ category: row.source, total: row._sum.amount! })));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
