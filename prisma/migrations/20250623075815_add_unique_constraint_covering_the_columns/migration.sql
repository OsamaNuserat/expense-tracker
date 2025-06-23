/*
  Warnings:

  - A unique constraint covering the columns `[userId,startDate]` on the table `SurvivalBudget` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "SurvivalBudget_userId_startDate_key" ON "SurvivalBudget"("userId", "startDate");
