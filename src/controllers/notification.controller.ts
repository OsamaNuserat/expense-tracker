import type { Request, Response } from 'express';
import createError from 'http-errors';
import { saveExpoToken, sendPushToUser } from '../utils/expoPush';

export const saveToken = async (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  const { token } = req.body as { token?: string };
  if (!token) throw createError(400, 'Expo push token is required');
  await saveExpoToken(userId, token);
  res.status(200).json({ message: 'Token saved' });
};

export const sendNotification = async (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  const { title, body, data } = req.body;

  if (!title || !body) {
    return res.status(400).json({ message: 'Title and body are required' });
  }

  await sendPushToUser(userId, title, body, data);

  res.status(200).json({ message: 'Notification sent' });
}

