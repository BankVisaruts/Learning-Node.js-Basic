/*
  Warnings:

  - You are about to drop the column `registerData` on the `Book` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Book" DROP COLUMN "registerData",
ADD COLUMN     "registerDate" TIMESTAMP(3);
