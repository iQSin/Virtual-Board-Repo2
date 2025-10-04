/*
  Warnings:

  - You are about to drop the column `author_id` on the `Note` table. All the data in the column will be lost.
  - You are about to drop the column `note` on the `Note` table. All the data in the column will be lost.
  - You are about to drop the `User` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `text` to the `Note` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userId` to the `Note` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "public"."Note" DROP CONSTRAINT "Note_author_id_fkey";

-- AlterTable
ALTER TABLE "public"."Note" DROP COLUMN "author_id",
DROP COLUMN "note",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "text" TEXT NOT NULL,
ADD COLUMN     "userId" INTEGER NOT NULL;

-- DropTable
DROP TABLE "public"."User";
