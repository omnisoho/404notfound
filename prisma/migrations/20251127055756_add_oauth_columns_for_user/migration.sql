-- CreateEnum
CREATE TYPE "AuthProvider" AS ENUM ('email', 'google', 'facebook');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "authProvider" "AuthProvider" NOT NULL DEFAULT 'email',
ADD COLUMN     "providerEmail" VARCHAR(255),
ADD COLUMN     "providerId" VARCHAR(255),
ALTER COLUMN "passwordHash" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "idx_auth_provider" ON "User"("authProvider", "providerId");

-- CreateIndex
CREATE INDEX "idx_provider_email" ON "User"("providerEmail");
