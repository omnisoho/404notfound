-- AlterTable
ALTER TABLE "User" ADD COLUMN     "currency" VARCHAR(10) NOT NULL DEFAULT 'USD',
ADD COLUMN     "measurementSystem" VARCHAR(10) NOT NULL DEFAULT 'metric',
ADD COLUMN     "timezone" VARCHAR(50) NOT NULL DEFAULT 'Asia/Singapore';
