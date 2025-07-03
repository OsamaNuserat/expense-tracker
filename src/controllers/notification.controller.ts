import type { Request, Response } from 'express';
import prisma from '../prisma/client';
import createError from 'http-errors';
import { 
  saveExpoPushToken, 
  updateNotificationSettings,
  sendPushToUser 
} from '../utils/expoPush';

/**
 * Register/Update Expo push token for user
 */
export const saveToken = async (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  const { token, expoPushToken } = req.body;
  
  // Support both 'token' and 'expoPushToken' for backwards compatibility
  const pushToken = expoPushToken || token;
  
  if (!pushToken) {
    throw createError(400, 'Expo push token is required');
  }

  await saveExpoPushToken(userId, pushToken);

  res.json({
    success: true,
    message: 'Push token registered successfully'
  });
};

/**
 * Send notification to user
 */
export const sendNotification = async (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  const { title, body, data, options } = req.body;

  if (!title || !body) {
    throw createError(400, 'Title and body are required');
  }

  const success = await sendPushToUser(userId, title, body, data || {}, options || {});

  res.json({
    success,
    message: success ? 'Notification sent successfully' : 'Failed to send notification'
  });
};

/**
 * Get user notification settings
 */
export const getNotificationSettings = async (req: Request, res: Response) => {
  const userId = (req as any).user.id;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { 
      notificationSettings: true,
      expoPushToken: true
    }
  });

  if (!user) {
    throw createError(404, 'User not found');
  }

  const settings = (user.notificationSettings as any) || {
    enabled: true,
    budgetAlerts: true,
    transactionAlerts: true,
    recurringPaymentReminders: true,
    billReminders: true
  };

  res.json({
    settings,
    hasToken: !!user.expoPushToken
  });
};

/**
 * Update notification settings
 */
export const updateSettings = async (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  const { 
    enabled, 
    budgetAlerts, 
    transactionAlerts, 
    recurringPaymentReminders,
    billReminders
  } = req.body;

  const settings = {
    ...(enabled !== undefined && { enabled }),
    ...(budgetAlerts !== undefined && { budgetAlerts }),
    ...(transactionAlerts !== undefined && { transactionAlerts }),
    ...(recurringPaymentReminders !== undefined && { recurringPaymentReminders }),
    ...(billReminders !== undefined && { billReminders })
  };

  await updateNotificationSettings(userId, settings);

  res.json({
    success: true,
    message: 'Notification settings updated successfully',
    settings
  });
};

/**
 * Send test notification
 */
export const sendTestNotification = async (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  
  const success = await sendPushToUser(
    userId,
    '🧪 Test Notification',
    'If you can see this, push notifications are working correctly!',
    { type: 'test' },
    { priority: 'normal' }
  );

  res.json({
    success,
    message: success 
      ? 'Test notification sent successfully' 
      : 'Failed to send test notification. Check if push token is registered.'
  });
};

/**
 * Remove push token (unregister)
 */
export const removePushToken = async (req: Request, res: Response) => {
  const userId = (req as any).user.id;

  await prisma.user.update({
    where: { id: userId },
    data: { expoPushToken: null }
  });

  res.json({
    success: true,
    message: 'Push token removed successfully'
  });
};