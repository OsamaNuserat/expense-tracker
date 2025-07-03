-- CreateEnum
CREATE TYPE "GoalType" AS ENUM ('EMERGENCY_FUND', 'VACATION', 'CAR_PURCHASE', 'HOUSE_DOWN_PAYMENT', 'DEBT_PAYOFF', 'WEDDING', 'EDUCATION', 'RETIREMENT', 'INVESTMENT', 'HOME_IMPROVEMENT', 'BUSINESS', 'GADGET', 'CUSTOM');

-- CreateEnum
CREATE TYPE "GoalPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('CONTRIBUTION', 'WITHDRAWAL', 'ADJUSTMENT');

-- CreateEnum
CREATE TYPE "BillFrequency" AS ENUM ('WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY', 'CUSTOM');

-- CreateEnum
CREATE TYPE "BillReminderType" AS ENUM ('UPCOMING', 'DUE_TODAY', 'OVERDUE');

-- CreateTable
CREATE TABLE "FinancialGoal" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "goalType" "GoalType" NOT NULL,
    "targetAmount" DOUBLE PRECISION NOT NULL,
    "currentAmount" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "targetDate" TIMESTAMP(3),
    "priority" "GoalPriority" NOT NULL DEFAULT 'MEDIUM',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "categoryId" INTEGER,
    "autoContribute" BOOLEAN NOT NULL DEFAULT false,
    "monthlyTarget" DOUBLE PRECISION,
    "reminderEnabled" BOOLEAN NOT NULL DEFAULT true,
    "reminderDay" INTEGER,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FinancialGoal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GoalTransaction" (
    "id" SERIAL NOT NULL,
    "goalId" INTEGER NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "type" "TransactionType" NOT NULL,
    "description" TEXT,
    "source" TEXT,
    "linkedExpenseId" INTEGER,
    "linkedIncomeId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GoalTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GoalMilestone" (
    "id" SERIAL NOT NULL,
    "goalId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "targetAmount" DOUBLE PRECISION NOT NULL,
    "isReached" BOOLEAN NOT NULL DEFAULT false,
    "reachedAt" TIMESTAMP(3),
    "rewardText" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GoalMilestone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Bill" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "payee" TEXT NOT NULL,
    "amount" DOUBLE PRECISION,
    "isFixedAmount" BOOLEAN NOT NULL DEFAULT true,
    "categoryId" INTEGER,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "frequency" "BillFrequency" NOT NULL,
    "dayOfMonth" INTEGER,
    "dayOfWeek" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "autoReminder" BOOLEAN NOT NULL DEFAULT true,
    "reminderDays" JSONB NOT NULL DEFAULT '[7, 3, 1]',
    "lastPaidDate" TIMESTAMP(3),
    "lastPaidAmount" DOUBLE PRECISION,
    "nextDueDate" TIMESTAMP(3) NOT NULL,
    "isOverdue" BOOLEAN NOT NULL DEFAULT false,
    "overdueByDays" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Bill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BillPayment" (
    "id" SERIAL NOT NULL,
    "billId" INTEGER NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "paidDate" TIMESTAMP(3) NOT NULL,
    "wasOnTime" BOOLEAN NOT NULL DEFAULT true,
    "daysLate" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "paymentMethod" TEXT,
    "confirmationCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BillPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BillReminder" (
    "id" SERIAL NOT NULL,
    "billId" INTEGER NOT NULL,
    "reminderDate" TIMESTAMP(3) NOT NULL,
    "daysBefore" INTEGER NOT NULL,
    "isSent" BOOLEAN NOT NULL DEFAULT false,
    "sentAt" TIMESTAMP(3),
    "reminderType" "BillReminderType" NOT NULL DEFAULT 'UPCOMING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BillReminder_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FinancialGoal_userId_isActive_idx" ON "FinancialGoal"("userId", "isActive");

-- CreateIndex
CREATE INDEX "FinancialGoal_userId_goalType_idx" ON "FinancialGoal"("userId", "goalType");

-- CreateIndex
CREATE INDEX "FinancialGoal_targetDate_idx" ON "FinancialGoal"("targetDate");

-- CreateIndex
CREATE INDEX "GoalTransaction_goalId_idx" ON "GoalTransaction"("goalId");

-- CreateIndex
CREATE INDEX "GoalTransaction_createdAt_idx" ON "GoalTransaction"("createdAt");

-- CreateIndex
CREATE INDEX "GoalMilestone_goalId_targetAmount_idx" ON "GoalMilestone"("goalId", "targetAmount");

-- CreateIndex
CREATE INDEX "Bill_userId_isActive_idx" ON "Bill"("userId", "isActive");

-- CreateIndex
CREATE INDEX "Bill_nextDueDate_idx" ON "Bill"("nextDueDate");

-- CreateIndex
CREATE INDEX "Bill_isOverdue_idx" ON "Bill"("isOverdue");

-- CreateIndex
CREATE INDEX "BillPayment_billId_paidDate_idx" ON "BillPayment"("billId", "paidDate");

-- CreateIndex
CREATE INDEX "BillReminder_reminderDate_isSent_idx" ON "BillReminder"("reminderDate", "isSent");

-- CreateIndex
CREATE INDEX "BillReminder_billId_idx" ON "BillReminder"("billId");

-- AddForeignKey
ALTER TABLE "FinancialGoal" ADD CONSTRAINT "FinancialGoal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialGoal" ADD CONSTRAINT "FinancialGoal_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoalTransaction" ADD CONSTRAINT "GoalTransaction_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "FinancialGoal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoalTransaction" ADD CONSTRAINT "GoalTransaction_linkedExpenseId_fkey" FOREIGN KEY ("linkedExpenseId") REFERENCES "Expense"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoalTransaction" ADD CONSTRAINT "GoalTransaction_linkedIncomeId_fkey" FOREIGN KEY ("linkedIncomeId") REFERENCES "Income"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoalMilestone" ADD CONSTRAINT "GoalMilestone_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "FinancialGoal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bill" ADD CONSTRAINT "Bill_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bill" ADD CONSTRAINT "Bill_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillPayment" ADD CONSTRAINT "BillPayment_billId_fkey" FOREIGN KEY ("billId") REFERENCES "Bill"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillReminder" ADD CONSTRAINT "BillReminder_billId_fkey" FOREIGN KEY ("billId") REFERENCES "Bill"("id") ON DELETE CASCADE ON UPDATE CASCADE;
