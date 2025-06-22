import fetch from 'node-fetch';
import prisma from '../prisma/client';

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
    return tokens.map((t) => t.token);
}

export async function sendPushToUser(userId: number, title: string, body: string, data: any = {}) {
    const tokens = await getUserTokens(userId);
    if (tokens.length === 0) return;

    const messages = tokens.map((token) => ({
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
}
