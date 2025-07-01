-- AlterTable
ALTER TABLE "User" ADD COLUMN     "expoPushToken" TEXT,
ADD COLUMN     "name" TEXT,
ADD COLUMN     "notificationSettings" JSONB DEFAULT '{"enabled": true, "budgetAlerts": true, "transactionAlerts": true, "recurringPaymentReminders": true}';
