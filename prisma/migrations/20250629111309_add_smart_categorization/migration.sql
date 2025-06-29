-- CreateTable
CREATE TABLE "UserCategorizationHistory" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "merchant" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "categoryId" INTEGER NOT NULL,
    "messageType" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "wasCorrect" BOOLEAN NOT NULL DEFAULT true,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserCategorizationHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MerchantLearning" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "merchant" TEXT NOT NULL,
    "normalizedName" TEXT NOT NULL,
    "categoryId" INTEGER NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "useCount" INTEGER NOT NULL DEFAULT 1,
    "lastUsed" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "messageType" TEXT NOT NULL,
    "averageAmount" DOUBLE PRECISION,
    "amountRange" JSONB,
    "timePatterns" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MerchantLearning_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CategoryPattern" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "categoryId" INTEGER NOT NULL,
    "messageType" TEXT NOT NULL,
    "typicalAmounts" JSONB NOT NULL,
    "timePatterns" JSONB NOT NULL,
    "keywordPatterns" JSONB NOT NULL,
    "confidenceWeight" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "transactionCount" INTEGER NOT NULL DEFAULT 0,
    "lastUpdated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CategoryPattern_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CliqPattern" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "senderName" TEXT NOT NULL,
    "normalizedSender" TEXT NOT NULL,
    "categoryId" INTEGER NOT NULL,
    "transactionType" TEXT NOT NULL,
    "isRecurring" BOOLEAN NOT NULL DEFAULT false,
    "frequency" TEXT,
    "averageAmount" DOUBLE PRECISION NOT NULL,
    "amountVariance" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "useCount" INTEGER NOT NULL DEFAULT 1,
    "lastSeen" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isBusinessLike" BOOLEAN NOT NULL DEFAULT false,
    "patterns" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CliqPattern_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UserCategorizationHistory_userId_merchant_idx" ON "UserCategorizationHistory"("userId", "merchant");

-- CreateIndex
CREATE INDEX "UserCategorizationHistory_userId_categoryId_idx" ON "UserCategorizationHistory"("userId", "categoryId");

-- CreateIndex
CREATE INDEX "UserCategorizationHistory_messageType_idx" ON "UserCategorizationHistory"("messageType");

-- CreateIndex
CREATE INDEX "MerchantLearning_userId_normalizedName_idx" ON "MerchantLearning"("userId", "normalizedName");

-- CreateIndex
CREATE UNIQUE INDEX "MerchantLearning_userId_merchant_categoryId_messageType_key" ON "MerchantLearning"("userId", "merchant", "categoryId", "messageType");

-- CreateIndex
CREATE INDEX "CategoryPattern_userId_categoryId_idx" ON "CategoryPattern"("userId", "categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "CategoryPattern_userId_categoryId_messageType_key" ON "CategoryPattern"("userId", "categoryId", "messageType");

-- CreateIndex
CREATE INDEX "CliqPattern_userId_senderName_idx" ON "CliqPattern"("userId", "senderName");

-- CreateIndex
CREATE INDEX "CliqPattern_isRecurring_idx" ON "CliqPattern"("isRecurring");

-- CreateIndex
CREATE UNIQUE INDEX "CliqPattern_userId_normalizedSender_transactionType_key" ON "CliqPattern"("userId", "normalizedSender", "transactionType");

-- AddForeignKey
ALTER TABLE "UserCategorizationHistory" ADD CONSTRAINT "UserCategorizationHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserCategorizationHistory" ADD CONSTRAINT "UserCategorizationHistory_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MerchantLearning" ADD CONSTRAINT "MerchantLearning_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MerchantLearning" ADD CONSTRAINT "MerchantLearning_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CategoryPattern" ADD CONSTRAINT "CategoryPattern_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CategoryPattern" ADD CONSTRAINT "CategoryPattern_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CliqPattern" ADD CONSTRAINT "CliqPattern_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CliqPattern" ADD CONSTRAINT "CliqPattern_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
