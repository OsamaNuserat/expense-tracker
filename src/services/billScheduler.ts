import { 
  processPendingBillReminders, 
  checkOverdueBills,
  sendDailyBillSummary 
} from '../utils/billNotifications';
import prisma from '../prisma/client';

export class BillSchedulerService {
  private static reminderInterval: NodeJS.Timeout | null = null;
  private static dailySummaryInterval: NodeJS.Timeout | null = null;
  private static overdueCheckInterval: NodeJS.Timeout | null = null;

  /**
   * Start the bill reminder and overdue check services
   */
  public static startScheduler(): void {
    this.stopScheduler(); // Stop any existing schedulers

    // Check for pending reminders every 5 minutes
    this.reminderInterval = setInterval(async () => {
      try {
        const result = await processPendingBillReminders();
        if (result.sent > 0 || result.failed > 0) {
          console.log(`📅 Bill reminders processed: ${result.sent} sent, ${result.failed} failed`);
        }
      } catch (error) {
        console.error('Error processing bill reminders:', error);
      }
    }, 5 * 60 * 1000); // 5 minutes

    // Check for overdue bills every hour
    this.overdueCheckInterval = setInterval(async () => {
      try {
        const result = await checkOverdueBills();
        if (result.updated > 0 || result.alertsSent > 0) {
          console.log(`⚠️ Overdue bills processed: ${result.updated} updated, ${result.alertsSent} alerts sent`);
        }
      } catch (error) {
        console.error('Error checking overdue bills:', error);
      }
    }, 60 * 60 * 1000); // 1 hour

    // Send daily bill summary every day at 8 AM
    this.scheduleDailySummary();

    console.log('📅 Bill scheduler service started');
  }

  /**
   * Stop the scheduler services
   */
  public static stopScheduler(): void {
    if (this.reminderInterval) {
      clearInterval(this.reminderInterval);
      this.reminderInterval = null;
    }

    if (this.dailySummaryInterval) {
      clearInterval(this.dailySummaryInterval);
      this.dailySummaryInterval = null;
    }

    if (this.overdueCheckInterval) {
      clearInterval(this.overdueCheckInterval);
      this.overdueCheckInterval = null;
    }

    console.log('📅 Bill scheduler service stopped');
  }

  /**
   * Schedule daily summary notifications
   */
  private static scheduleDailySummary(): void {
    const scheduleNextSummary = () => {
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(8, 0, 0, 0); // 8 AM tomorrow

      const msUntilTomorrow = tomorrow.getTime() - now.getTime();

      this.dailySummaryInterval = setTimeout(async () => {
        try {
          await this.sendDailySummaryToAllUsers();
          // Schedule the next day's summary
          scheduleNextSummary();
        } catch (error) {
          console.error('Error sending daily bill summary:', error);
          // Still schedule the next day even if there was an error
          scheduleNextSummary();
        }
      }, msUntilTomorrow);

      console.log(`📊 Next daily bill summary scheduled for ${tomorrow.toLocaleString()}`);
    };

    scheduleNextSummary();
  }

  /**
   * Send daily bill summary to all users who have notifications enabled
   */
  private static async sendDailySummaryToAllUsers(): Promise<void> {
    try {
      // Get all users with notifications enabled
      const users = await prisma.user.findMany({
        where: {
          expoPushToken: { not: null },
          bills: {
            some: {
              isActive: true
            }
          }
        },
        select: {
          id: true,
          notificationSettings: true
        }
      });

      let summariesSent = 0;
      let summariesFailed = 0;

      for (const user of users) {
        try {
          const settings = user.notificationSettings as any;
          if (!settings?.enabled || !settings?.billReminders) {
            continue;
          }

          const success = await sendDailyBillSummary(user.id);
          if (success) {
            summariesSent++;
          } else {
            summariesFailed++;
          }
        } catch (error) {
          console.error(`Error sending daily summary to user ${user.id}:`, error);
          summariesFailed++;
        }
      }

      console.log(`📊 Daily bill summaries sent: ${summariesSent} sent, ${summariesFailed} failed`);
    } catch (error) {
      console.error('Error in sendDailySummaryToAllUsers:', error);
    }
  }

  /**
   * Manual trigger for testing - process all pending reminders now
   */
  public static async processPendingRemindersNow(): Promise<{ sent: number; failed: number }> {
    try {
      return await processPendingBillReminders();
    } catch (error) {
      console.error('Error in manual reminder processing:', error);
      return { sent: 0, failed: 1 };
    }
  }

  /**
   * Manual trigger for testing - check overdue bills now
   */
  public static async checkOverdueBillsNow(): Promise<{ updated: number; alertsSent: number }> {
    try {
      return await checkOverdueBills();
    } catch (error) {
      console.error('Error in manual overdue check:', error);
      return { updated: 0, alertsSent: 0 };
    }
  }

  /**
   * Get scheduler status
   */
  public static getStatus(): {
    reminderSchedulerActive: boolean;
    dailySummarySchedulerActive: boolean;
    overdueCheckSchedulerActive: boolean;
  } {
    return {
      reminderSchedulerActive: this.reminderInterval !== null,
      dailySummarySchedulerActive: this.dailySummaryInterval !== null,
      overdueCheckSchedulerActive: this.overdueCheckInterval !== null
    };
  }
}
