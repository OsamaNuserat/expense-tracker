import prisma from '../prisma/client';
import { sendPushToUser } from './expoPush';
import { getDaysUntilDue, formatCurrency, getBillStatusText } from './billUtils';

// Import the enum from Prisma
const BillReminderType = {
  UPCOMING: 'UPCOMING' as const,
  DUE_TODAY: 'DUE_TODAY' as const,
  OVERDUE: 'OVERDUE' as const
};

/**
 * Send bill reminder notification to user
 */
export async function sendBillReminder(
  bill: {
    id: number;
    userId: number;
    name: string;
    payee: string;
    amount?: number | null;
    nextDueDate: Date;
    isOverdue: boolean;
    overdueByDays: number;
  }
): Promise<boolean> {
  const daysUntil = getDaysUntilDue(bill.nextDueDate);
  const statusText = getBillStatusText(bill);
  
  let title: string;
  let body: string;
  let priority: 'default' | 'normal' | 'high' = 'normal';

  if (bill.isOverdue) {
    title = `🚨 Overdue Bill: ${bill.name}`;
    body = `Your ${bill.name} payment to ${bill.payee} is overdue by ${bill.overdueByDays} day${bill.overdueByDays > 1 ? 's' : ''}`;
    priority = 'high';
  } else if (daysUntil === 0) {
    title = `📅 Bill Due Today: ${bill.name}`;
    body = `Your ${bill.name} payment to ${bill.payee} is due today`;
    priority = 'high';
  } else {
    title = `💰 Bill Reminder: ${bill.name}`;
    body = `Your ${bill.name} payment to ${bill.payee} is due in ${daysUntil} day${daysUntil > 1 ? 's' : ''}`;
    priority = daysUntil <= 3 ? 'high' : 'normal';
  }

  if (bill.amount) {
    body += ` (${formatCurrency(bill.amount)})`;
  }

  const success = await sendPushToUser(
    bill.userId,
    title,
    body,
    {
      type: 'bill_reminder',
      billId: bill.id.toString(),
      billName: bill.name,
      payee: bill.payee,
      dueDate: bill.nextDueDate.toISOString(),
      daysUntil: daysUntil.toString(),
      isOverdue: bill.isOverdue.toString(),
      amount: bill.amount?.toString() || ''
    },
    {
      priority,
      channelId: 'bills'
    }
  );

  return success;
}

/**
 * Send overdue bill alert
 */
export async function sendBillOverdueAlert(
  bill: {
    id: number;
    userId: number;
    name: string;
    payee: string;
    amount?: number | null;
    overdueByDays: number;
  }
): Promise<boolean> {
  const title = `🚨 Payment Overdue: ${bill.name}`;
  let body = `Your ${bill.name} payment to ${bill.payee} is ${bill.overdueByDays} day${bill.overdueByDays > 1 ? 's' : ''} overdue`;
  
  if (bill.amount) {
    body += ` (${formatCurrency(bill.amount)})`;
  }
  
  body += '. Please make the payment as soon as possible to avoid late fees.';

  const success = await sendPushToUser(
    bill.userId,
    title,
    body,
    {
      type: 'bill_overdue',
      billId: bill.id.toString(),
      billName: bill.name,
      payee: bill.payee,
      overdueByDays: bill.overdueByDays.toString(),
      amount: bill.amount?.toString() || ''
    },
    {
      priority: 'high',
      channelId: 'bills'
    }
  );

  return success;
}

/**
 * Schedule bill reminders for a specific bill
 */
export async function scheduleNextBillReminders(billId: number): Promise<void> {
  const bill = await prisma.bill.findUnique({
    where: { id: billId },
    select: {
      id: true,
      nextDueDate: true,
      autoReminder: true,
      reminderDays: true
    }
  });

  if (!bill || !bill.autoReminder) {
    return;
  }

  // Delete existing unsent reminders
  await prisma.billReminder.deleteMany({
    where: {
      billId,
      isSent: false
    }
  });

  const reminderDays = (bill.reminderDays as number[]) || [7, 3, 1];
  const now = new Date();

  // Create new reminders
  const remindersToCreate = [];
  
  for (const daysBefore of reminderDays) {
    const reminderDate = new Date(bill.nextDueDate);
    reminderDate.setDate(reminderDate.getDate() - daysBefore);
    
    // Only create reminders for future dates
    if (reminderDate > now) {
      remindersToCreate.push({
        billId,
        reminderDate,
        daysBefore,
        reminderType: daysBefore === 0 ? BillReminderType.DUE_TODAY : BillReminderType.UPCOMING
      });
    }
  }

  // Add due date reminder if not already included
  if (!reminderDays.includes(0)) {
    const dueDateReminder = new Date(bill.nextDueDate);
    dueDateReminder.setHours(9, 0, 0, 0); // Set to 9 AM on due date
    
    if (dueDateReminder > now) {
      remindersToCreate.push({
        billId,
        reminderDate: dueDateReminder,
        daysBefore: 0,
        reminderType: BillReminderType.DUE_TODAY
      });
    }
  }

  if (remindersToCreate.length > 0) {
    await prisma.billReminder.createMany({
      data: remindersToCreate
    });
  }
}

/**
 * Process all pending bill reminders
 */
export async function processPendingBillReminders(): Promise<{ sent: number; failed: number }> {
  const now = new Date();
  let sent = 0;
  let failed = 0;

  try {
    // Get all pending reminders that are due
    const pendingReminders = await prisma.billReminder.findMany({
      where: {
        isSent: false,
        reminderDate: {
          lte: now
        }
      },
      include: {
        bill: {
          include: {
            user: {
              select: {
                id: true,
                notificationSettings: true,
                expoPushToken: true
              }
            }
          }
        }
      },
      orderBy: {
        reminderDate: 'asc'
      }
    });

  for (const reminder of pendingReminders) {
    try {
      // Check if user has notifications enabled
      const userSettings = reminder.bill.user.notificationSettings as any;
      if (!userSettings?.enabled || !userSettings?.billReminders) {
        continue;
      }

      // Send the reminder
      const success = await sendBillReminder(reminder.bill);
      
      if (success) {
        sent++;
      } else {
        failed++;
      }

      // Mark reminder as sent regardless of success to avoid spam
      await prisma.billReminder.update({
        where: { id: reminder.id },
        data: {
          isSent: true,
          sentAt: now
        }
      });

    } catch (error) {
      console.error(`Failed to process bill reminder ${reminder.id}:`, error);
      failed++;
      
      // Mark as sent to prevent retry spam
      await prisma.billReminder.update({
        where: { id: reminder.id },
        data: {
          isSent: true,
          sentAt: now
        }
      });
    }
  }

  return { sent, failed };
  } catch (error: any) {
    console.error('Error processing bill reminders:', error);
    
    // If the table doesn't exist (P2021), return gracefully
    if (error.code === 'P2021' && error.meta?.table === 'public.BillReminder') {
      console.log('BillReminder table does not exist yet. Skipping bill reminders processing.');
      return { sent: 0, failed: 0 };
    }
    
    // Re-throw other errors
    throw error;
  }
}

/**
 * Check for overdue bills and send alerts
 */
export async function checkOverdueBills(): Promise<{ updated: number; alertsSent: number }> {
  const now = new Date();
  let updated = 0;
  let alertsSent = 0;

  try {
    // Find bills that should be marked as overdue
    const overdueBills = await prisma.bill.findMany({
      where: {
        isActive: true,
        nextDueDate: {
          lt: now
        },
        isOverdue: false // Not already marked as overdue
      },
      include: {
        user: {
          select: {
            id: true,
            notificationSettings: true,
            expoPushToken: true
          }
        }
      }
    });

  for (const bill of overdueBills) {
    try {
      const overdueByDays = Math.floor((now.getTime() - bill.nextDueDate.getTime()) / (1000 * 60 * 60 * 24));
      
      // Update bill status
      await prisma.bill.update({
        where: { id: bill.id },
        data: {
          isOverdue: true,
          overdueByDays
        }
      });
      updated++;

      // Send overdue alert if user has notifications enabled
      const userSettings = bill.user.notificationSettings as any;
      if (userSettings?.enabled && userSettings?.billReminders) {
        const success = await sendBillOverdueAlert({
          ...bill,
          overdueByDays
        });
        
        if (success) {
          alertsSent++;
        }
      }

    } catch (error) {
      console.error(`Failed to process overdue bill ${bill.id}:`, error);
    }
  }

  return { updated, alertsSent };
  } catch (error: any) {
    console.error('Error checking overdue bills:', error);
    
    // If the table doesn't exist (P2021), return gracefully
    if (error.code === 'P2021' && (error.meta?.table === 'public.Bill' || error.meta?.table === 'public.BillReminder')) {
      console.log('Bill tables do not exist yet. Skipping overdue bills check.');
      return { updated: 0, alertsSent: 0 };
    }
    
    // Re-throw other errors
    throw error;
  }
}

/**
 * Send daily bill summary notification
 */
export async function sendDailyBillSummary(userId: number): Promise<boolean> {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const nextWeek = new Date(now);
  nextWeek.setDate(nextWeek.getDate() + 7);

  // Get bills due today, tomorrow, and this week
  const [dueToday, dueTomorrow, dueThisWeek, overdue] = await Promise.all([
    // Due today
    prisma.bill.findMany({
      where: {
        userId,
        isActive: true,
        nextDueDate: {
          gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
          lt: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
        }
      }
    }),
    // Due tomorrow
    prisma.bill.findMany({
      where: {
        userId,
        isActive: true,
        nextDueDate: {
          gte: new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate()),
          lt: new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate() + 1)
        }
      }
    }),
    // Due this week
    prisma.bill.findMany({
      where: {
        userId,
        isActive: true,
        nextDueDate: {
          gte: now,
          lte: nextWeek
        }
      }
    }),
    // Overdue
    prisma.bill.findMany({
      where: {
        userId,
        isActive: true,
        isOverdue: true
      }
    })
  ]);

  if (dueToday.length === 0 && dueTomorrow.length === 0 && dueThisWeek.length === 0 && overdue.length === 0) {
    return true; // No bills to report
  }

  let title = '📊 Daily Bill Summary';
  let body = '';

  if (overdue.length > 0) {
    body += `${overdue.length} overdue bill${overdue.length > 1 ? 's' : ''}`;
  }

  if (dueToday.length > 0) {
    if (body) body += ', ';
    body += `${dueToday.length} due today`;
  }

  if (dueTomorrow.length > 0) {
    if (body) body += ', ';
    body += `${dueTomorrow.length} due tomorrow`;
  }

  if (dueThisWeek.length > 2) { // More than just today and tomorrow
    if (body) body += ', ';
    body += `${dueThisWeek.length - dueToday.length - dueTomorrow.length} due this week`;
  }

  if (body) {
    body = body.charAt(0).toUpperCase() + body.slice(1);
  }

  const success = await sendPushToUser(
    userId,
    title,
    body,
    {
      type: 'bill_summary',
      dueToday: dueToday.length.toString(),
      dueTomorrow: dueTomorrow.length.toString(),
      dueThisWeek: dueThisWeek.length.toString(),
      overdue: overdue.length.toString()
    },
    {
      priority: overdue.length > 0 ? 'high' : 'normal',
      channelId: 'bills'
    }
  );

  return success;
}
