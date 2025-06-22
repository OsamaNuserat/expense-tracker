import fetch from 'node-fetch';
import prisma from '../prisma/client';

let expoPushTokens: string[] = [];


export async function saveExpoToken(userId: number, token: string) {
  const exists = await prisma.pushToken.findUnique({ where: { token } });
  if (!exists) {
    await prisma.pushToken.create({ data: { token, userId } });
  }
}

export async function getUserTokens(userId: number) {
  const tokens = await prisma.pushToken.findMany({
    where: { userId },
    select: { token: true },
  });
  return tokens.map(t => t.token);
}

export async function sendPushToAll(title: string, body: string, data: any = {}) {
  if (expoPushTokens.length === 0) return;

  const messages = expoPushTokens.map(token => ({
    to: token,
    sound: 'default',
    title,
    body,
    data,
  }));

  const chunkSize = 100;
  for (let i = 0; i < messages.length; i += chunkSize) {
    const chunk = messages.slice(i, i + chunkSize);
    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(chunk),
    }).then(res => res.json())
      .then(result => console.log('Expo push result:', result))
      .catch(err => console.error('Expo push error:', err));
  }
}
