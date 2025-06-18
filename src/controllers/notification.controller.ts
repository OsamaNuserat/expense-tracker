import type { Request, Response } from 'express';
import { saveExpoToken } from '../utils/expoPush';

export const saveToken = (req: Request, res: Response) => {
  const { token } = req.body as { token?: string };
  if (!token) {
    return res.status(400).json({ message: 'Token is required' });
  }
  saveExpoToken(token);
  res.json({ message: 'Token saved successfully' });
};
