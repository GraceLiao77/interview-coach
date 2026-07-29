/*
  Warnings:

  - A unique constraint covering the columns `[sessionId,text]` on the table `Question` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Question" ADD COLUMN     "resumeBased" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE UNIQUE INDEX "Question_sessionId_text_key" ON "Question"("sessionId", "text");
