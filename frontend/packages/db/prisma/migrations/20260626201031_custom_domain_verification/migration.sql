-- AlterTable
ALTER TABLE "custom_domains" ADD COLUMN     "verification_method" TEXT NOT NULL DEFAULT 'dns-txt',
ADD COLUMN     "verification_token" TEXT;
