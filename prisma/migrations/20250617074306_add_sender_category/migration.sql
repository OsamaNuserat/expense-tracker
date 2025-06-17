-- CreateTable
CREATE TABLE "SenderCategory" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "sender" TEXT NOT NULL,
    "categoryId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SenderCategory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SenderCategory_userId_sender_key" ON "SenderCategory"("userId", "sender");

-- AddForeignKey
ALTER TABLE "SenderCategory" ADD CONSTRAINT "SenderCategory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SenderCategory" ADD CONSTRAINT "SenderCategory_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
