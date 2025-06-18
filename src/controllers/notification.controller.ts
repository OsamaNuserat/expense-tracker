import fetch from 'node-fetch';
import type { Request, Response } from 'express';

const expoPushTokens: string[] = [];

export const saveToken = (req: Request, res: Response): void => {
  const { token } = req.body as { token?: string };

  if (!token) {
    res.status(400).json({ message: 'Token is required' });
    return;
  }

  if (!expoPushTokens.includes(token)) {
    expoPushTokens.push(token);
  }
  res.json({ message: 'Token saved successfully', tokens: expoPushTokens });
};

export const sendNotification = async (req: Request, res: Response): Promise<void> => {
  const { title, body } = req.body as { title?: string; body?: string };

  const messages = expoPushTokens.map(token => ({
    to: token,
    sound: 'default',
    title: title || 'Test Notification',
    body: body || 'This is a test notification from backend',
    data: { someData: 'goes here' },
  }));

  const chunkSize = 100; // Expo recommends sending in chunks of 100
  const chunks: typeof messages[] = [];

  for (let i = 0; i < messages.length; i += chunkSize) {
    chunks.push(messages.slice(i, i + chunkSize));
  }

  try {
    for (const chunk of chunks) {
      const response = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Accept-encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(chunk),
      });
      const data = await response.json();
      console.log('Push response:', data);
    }
    res.json({ message: 'Notifications sent' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error sending notifications' });
  }
};
