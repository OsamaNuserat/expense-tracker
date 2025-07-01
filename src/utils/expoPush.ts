import { Expo, ExpoPushMessage, ExpoPushTicket, ExpoPushReceiptId } from 'expo-server-sdk';
import prisma from '../prisma/client';

// Create a new Expo SDK client
let expo = new Expo();

/**
 * Save Expo push token for a user
 */
export async function saveExpoPushToken(userId: number, token: string): Promise<void> {
  try {
    // Validate the token format
    if (!Expo.isExpoPushToken(token)) {
      console.error('Invalid Expo push token format:', token);
      return;
    }

    // Update user's Expo push token
    await prisma.user.update({
      where: { id: userId },
      data: { expoPushToken: token }
    });

    console.log('✅ Expo push token saved for user:', userId);
  } catch (error) {
    console.error('Error saving Expo push token:', error);
  }
}

/**
 * Get user's Expo push token
 */
export async function getUserExpoPushToken(userId: number): Promise<string | null> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { expoPushToken: true, notificationSettings: true }
    });

    // Check if notifications are enabled
    const settings = user?.notificationSettings as any;
    if (!settings?.enabled) {
      console.log('Notifications disabled for user:', userId);
      return null;
    }

    return user?.expoPushToken || null;
  } catch (error) {
    console.error('Error getting Expo push token:', error);
    return null;
  }
}

/**
 * Send push notification to a user using Expo
 */
export async function sendPushToUser(
  userId: number,
  title: string,
  body: string,
  data: Record<string, string> = {},
  options: {
    sound?: 'default' | null;
    badge?: number;
    priority?: 'default' | 'normal' | 'high';
    channelId?: string;
  } = {}
): Promise<boolean> {
  try {
    const pushToken = await getUserExpoPushToken(userId);
    
    if (!pushToken) {
      console.log('No valid push token for user:', userId);
      return false;
    }

    // Create the message
    const message: ExpoPushMessage = {
      to: pushToken,
      sound: options.sound || 'default',
      title,
      body,
      data,
      badge: options.badge,
      priority: options.priority || 'default',
      channelId: options.channelId || 'default'
    };

    // Send the notification
    const tickets = await expo.sendPushNotificationsAsync([message]);
    
    // Handle the response
    const ticket = tickets[0];
    if (ticket.status === 'error') {
      console.error('Error sending push notification:', ticket.message);
      
      // If token is invalid, remove it
      if (ticket.details && ticket.details.error === 'DeviceNotRegistered') {
        await prisma.user.update({
          where: { id: userId },
          data: { expoPushToken: null }
        });
        console.log('Removed invalid push token for user:', userId);
      }
      
      return false;
    }

    console.log('✅ Push notification sent successfully to user:', userId);
    return true;

  } catch (error) {
    console.error('Error sending push notification:', error);
    return false;
  }
}

/**
 * Send push notifications to multiple users
 */
export async function sendPushToMultipleUsers(
  userIds: number[],
  title: string,
  body: string,
  data: Record<string, string> = {},
  options: {
    sound?: 'default' | null;
    badge?: number;
    priority?: 'default' | 'normal' | 'high';
    channelId?: string;
  } = {}
): Promise<{ success: number; failed: number }> {
  let success = 0;
  let failed = 0;

  const results = await Promise.allSettled(
    userIds.map(userId => sendPushToUser(userId, title, body, data, options))
  );

  results.forEach(result => {
    if (result.status === 'fulfilled' && result.value) {
      success++;
    } else {
      failed++;
    }
  });

  console.log(`Push notifications sent: ${success} success, ${failed} failed`);
  return { success, failed };
}

/**
 * Update user notification settings
 */
export async function updateNotificationSettings(
  userId: number,
  settings: {
    enabled?: boolean;
    budgetAlerts?: boolean;
    transactionAlerts?: boolean;
    recurringPaymentReminders?: boolean;
  }
): Promise<void> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { notificationSettings: true }
    });

    const currentSettings = (user?.notificationSettings as any) || {};
    const newSettings = { ...currentSettings, ...settings };

    await prisma.user.update({
      where: { id: userId },
      data: { notificationSettings: newSettings }
    });

    console.log('✅ Notification settings updated for user:', userId);
  } catch (error) {
    console.error('Error updating notification settings:', error);
  }
}

/**
 * Send recurring payment reminder
 */
export async function sendRecurringPaymentReminder(
  userId: number,
  paymentName: string,
  amount: number,
  dueDate: Date,
  daysUntilDue: number
): Promise<void> {
  const title = `💰 Payment Reminder: ${paymentName}`;
  const body = `${paymentName} (${amount} JOD) is due ${daysUntilDue === 0 ? 'today' : `in ${daysUntilDue} day${daysUntilDue > 1 ? 's' : ''}`}`;
  
  await sendPushToUser(userId, title, body, {
    type: 'recurring_payment_reminder',
    paymentName,
    amount: amount.toString(),
    dueDate: dueDate.toISOString(),
    daysUntilDue: daysUntilDue.toString()
  }, {
    priority: 'high',
    channelId: 'recurring_payments'
  });
}

/**
 * Send transaction categorization request
 */
export async function sendTransactionCategorizationRequest(
  userId: number,
  transactionType: string,
  merchant: string,
  amount: number,
  messageId: number
): Promise<void> {
  const title = `📊 Categorize Transaction`;
  const body = `${transactionType === 'income' ? 'Received' : 'Paid'} ${amount} JOD ${transactionType === 'income' ? 'from' : 'to'} ${merchant}. Tap to categorize.`;
  
  await sendPushToUser(userId, title, body, {
    type: 'transaction_categorization',
    messageId: messageId.toString(),
    merchant,
    amount: amount.toString(),
    transactionType
  }, {
    priority: 'high',
    channelId: 'transactions'
  });
}

/**
 * Send budget alert
 */
export async function sendBudgetAlert(
  userId: number,
  categoryName: string,
  spentAmount: number,
  budgetAmount: number,
  percentage: number
): Promise<void> {
  const title = `⚠️ Budget Alert: ${categoryName}`;
  const body = `You've spent ${spentAmount} JOD (${percentage}%) of your ${budgetAmount} JOD budget for ${categoryName}`;
  
  await sendPushToUser(userId, title, body, {
    type: 'budget_alert',
    categoryName,
    spentAmount: spentAmount.toString(),
    budgetAmount: budgetAmount.toString(),
    percentage: percentage.toString()
  }, {
    priority: 'high',
    channelId: 'budgets'
  });
}

// Legacy function names for backwards compatibility
export const saveFCMToken = saveExpoPushToken;
export const getUserTokens = async (userId: number): Promise<string[]> => {
  const token = await getUserExpoPushToken(userId);
  return token ? [token] : [];
};
