import admin from 'firebase-admin';
import { getMessaging, MulticastMessage, SendResponse } from 'firebase-admin/messaging';
import prisma from '../prisma/client';
import * as serviceAccount from '../../expense-tracker-6aec0-firebase-adminsdk-fbsvc-1fb0b2c9f3.json';

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
  });
}

export async function saveFCMToken(userId: number, token: string): Promise<void> {
  try {
    const exists = await prisma.pushToken.findUnique({ where: { token } });
    if (!exists) {
      await prisma.pushToken.create({ data: { token, userId } });
    }
  } catch (error) {
    console.error('Error saving FCM token:', error);
  }
}

export async function getUserTokens(userId: number): Promise<string[]> {
  const tokens = await prisma.pushToken.findMany({
    where: { userId },
    select: { token: true },
  });
  return tokens.map(t => t.token);
}

export async function sendPushToUser(
  userId: number,
  title: string,
  body: string,
  data: Record<string, string> = {}
): Promise<void> {
  const tokens = await getUserTokens(userId);
  if (tokens.length === 0) return;

  const message: MulticastMessage = { notification: { title, body }, data, tokens };

  try {
    const response = await (getMessaging() as any).sendMulticast(message);
    console.log('✅ FCM sent:', response.successCount, 'successes');

    if (response.failureCount > 0) {
      const failedTokens: string[] = [];
      response.responses.forEach((resp: SendResponse, idx: number) => {
        if (!resp.success) failedTokens.push(tokens[idx]);
      });
      console.warn('⚠️ Failed tokens:', failedTokens);
    }
  } catch (error) {
    console.error('❌ Error sending FCM message:', error);
  }
}
