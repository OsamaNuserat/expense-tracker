import { Router, Request, Response } from 'express';
import { parseMessage } from '../services/parser';
import { ParsedMessage } from '../models/message';

const router = Router();
const messages: ParsedMessage[] = [];

router.post('/parse-sms', (req: Request, res: Response) => {
  const { message, timestamp } = req.body;

  if (!message) {
    return res.status(400).json({ error: '❌ Missing message or timestamp' });
  }

  try {
    const parsed = parseMessage(message, timestamp);
    if (!parsed) {
      return res.json({ skipped: true, reason: 'Irrelevant or invalid message' });
    }

    messages.push(parsed);
    return res.json({ success: true, data: parsed });
  } catch (err) {
    return res.status(400).json({ error: (err as Error).message });
  }
});

router.get('/messages', (req: Request, res: Response) => {
  res.json(messages);
});

router.get('/summary', (req: Request, res: Response) => {
  const income = messages
    .filter(m => m.type === 'income')
    .reduce((sum, m) => sum + m.amount, 0);
  const expense = messages
    .filter(m => m.type === 'expense')
    .reduce((sum, m) => sum + m.amount, 0);

  res.json({
    income,
    expense,
    balance: income - expense,
  });
});

export default router;
