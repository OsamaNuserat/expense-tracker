import { Router, Request, Response } from 'express';
import prisma from '../prisma/client';
import { parseMessage } from '../services/parser';

const router = Router();

router.post('/parse-sms', async (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  const { content, timestamp } = req.body;

  // 1) Always save raw Message
  const savedMsg = await prisma.message.create({
    data: { content, userId },
  });

  // 2) Try to parse it
  const parsed = parseMessage(content, timestamp);
  if (!parsed) {
    // nothing to do beyond storing raw
    return res.json({ message: savedMsg, parsed: null });
  }

  // 3) Branch based on type
  let record;
  if (parsed.type === 'expense') {
    record = await prisma.expense.create({
      data: {
        amount: parsed.amount,
        category: parsed.merchant ?? 'Unknown',
        userId,
      },
    });
  } else if (parsed.type === 'income') {
    record = await prisma.income.create({
      data: {
        amount: parsed.amount,
        source: parsed.merchant ?? 'Unknown',
        userId,
      },
    });
  }

  return res.json({ message: savedMsg, parsed, record });
});
router.get('/messages', async (req: Request, res: Response) => {
  const userId = (req as any).user.id;

  const messages = await prisma.message.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });

  return res.json(messages);
});

router.get('/expenses/summary', async (req: Request, res: Response) => {
  const userId = (req as any).user.id;

  const summary = await prisma.expense.groupBy({
    by: ['createdAt'],
    where: { userId },
    _sum: { amount: true },
  });


  const rawSummary = await prisma.$queryRaw`
    SELECT
      DATE_TRUNC('month', "createdAt") AS month,
      SUM(amount) AS total
    FROM "Expense"
    WHERE "userId" = ${userId}
    GROUP BY month
    ORDER BY month DESC
  `;

  return res.json(rawSummary);
});

router.get('/incomes/summary', async (req: Request, res: Response) => {
  const userId = (req as any).user.id;

  const rawSummary = await prisma.$queryRaw`
    SELECT
      DATE_TRUNC('month', "createdAt") AS month,
      SUM(amount) AS total
    FROM "Income"
    WHERE "userId" = ${userId}
    GROUP BY month
    ORDER BY month DESC
  `;

  return res.json(rawSummary);
});

export default router;
