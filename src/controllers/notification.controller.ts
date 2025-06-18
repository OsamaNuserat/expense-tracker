import type { Request, Response } from 'express';
import createError from 'http-errors';
import { saveExpoToken } from '../utils/expoPush';

export const saveToken = (req: Request, res: Response) => {
  const { token } = req.body as { token?: string };

  if (!token) {
    throw createError(400, 'Expo push token is required');
  }

  saveExpoToken(token);

  res.status(200).json({
    message: 'Token saved successfully',
  });
};
