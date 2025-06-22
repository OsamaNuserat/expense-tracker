import type { Request, Response } from 'express';
import createError from 'http-errors';
import { saveExpoToken, getUserTokens } from '../utils/expoPush';
import fetch from 'node-fetch';

export const saveToken = async (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  const { token } = req.body as { token?: string };
  if (!token) throw createError(400, 'Expo push token is required');
  await saveExpoToken(userId, token);
  res.status(200).json({ message: 'Token saved' });
};

export const sendPushToUser = async (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  const { title, body, data } = req.body;

  const tokens = await getUserTokens(userId);
  if (tokens.length === 0) return res.status(204).send();

  const messages = tokens.map(token => ({
    to: token,
    sound: 'default',
    title,
    body,
    data,
  }));

  const response = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Accept-encoding': 'gzip, deflate',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(messages),
  });

  const result = await response.json();
  res.json({ result });
};
