/*
  Warnings:

  - You are about to drop the column `is_active` on the `users` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('INVITED', 'ACTIVE', 'SUSPENDED');

-- AlterTable
ALTER TABLE "documents" ADD COLUMN     "is_anonymized" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "tenants" ADD COLUMN     "configured_retention_days" INTEGER NOT NULL DEFAULT 30,
ADD COLUMN     "max_retention_days" INTEGER NOT NULL DEFAULT 30;

-- AlterTable
ALTER TABLE "users" DROP COLUMN "is_active",
ADD COLUMN     "deleted_at" TIMESTAMP(3),
ADD COLUMN     "last_login_at" TIMESTAMP(3),
ADD COLUMN     "status" "UserStatus" NOT NULL DEFAULT 'INVITED';
