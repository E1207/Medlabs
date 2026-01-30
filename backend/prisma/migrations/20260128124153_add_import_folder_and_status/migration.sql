-- AlterEnum
ALTER TYPE "DocumentStatus" ADD VALUE 'IMPORTED';

-- AlterTable
ALTER TABLE "tenants" ADD COLUMN     "import_folder_path" TEXT;
