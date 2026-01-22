/*
  Warnings:

  - The values [departed,arrived] on the enum `FlightStatus` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `arrivalTime` on the `Flight` table. All the data in the column will be lost.
  - You are about to drop the column `departureTime` on the `Flight` table. All the data in the column will be lost.
  - Added the required column `airlineCode` to the `Flight` table without a default value. This is not possible if the table is not empty.
  - Added the required column `destinationCity` to the `Flight` table without a default value. This is not possible if the table is not empty.
  - Added the required column `originCity` to the `Flight` table without a default value. This is not possible if the table is not empty.
  - Added the required column `scheduledArrival` to the `Flight` table without a default value. This is not possible if the table is not empty.
  - Added the required column `scheduledDeparture` to the `Flight` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Flight` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userId` to the `Flight` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "FlightStatus_new" AS ENUM ('scheduled', 'boarding', 'in_flight', 'landed', 'cancelled', 'delayed');
ALTER TABLE "public"."Flight" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Flight" ALTER COLUMN "status" TYPE "FlightStatus_new" USING ("status"::text::"FlightStatus_new");
ALTER TYPE "FlightStatus" RENAME TO "FlightStatus_old";
ALTER TYPE "FlightStatus_new" RENAME TO "FlightStatus";
DROP TYPE "public"."FlightStatus_old";
ALTER TABLE "Flight" ALTER COLUMN "status" SET DEFAULT 'scheduled';
COMMIT;

-- AlterTable
ALTER TABLE "Flight" DROP COLUMN "arrivalTime",
DROP COLUMN "departureTime",
ADD COLUMN     "actualArrival" TIMESTAMP(3),
ADD COLUMN     "actualDeparture" TIMESTAMP(3),
ADD COLUMN     "aircraftRegistration" TEXT,
ADD COLUMN     "aircraftType" TEXT,
ADD COLUMN     "airlineCode" TEXT NOT NULL,
ADD COLUMN     "apiFlightId" TEXT,
ADD COLUMN     "arrivalDelay" INTEGER,
ADD COLUMN     "bookingNumber" TEXT,
ADD COLUMN     "confirmationCode" TEXT,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "departureDelay" INTEGER,
ADD COLUMN     "destinationAirportFull" TEXT,
ADD COLUMN     "destinationCity" TEXT NOT NULL,
ADD COLUMN     "estimatedArrival" TIMESTAMP(3),
ADD COLUMN     "gate" TEXT,
ADD COLUMN     "originAirportFull" TEXT,
ADD COLUMN     "originCity" TEXT NOT NULL,
ADD COLUMN     "progress" INTEGER,
ADD COLUMN     "scheduledArrival" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "scheduledDeparture" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "seatAmenities" TEXT,
ADD COLUMN     "seatClass" TEXT,
ADD COLUMN     "seatNumber" TEXT,
ADD COLUMN     "ticketNumber" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "userId" UUID NOT NULL,
ALTER COLUMN "tripId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "isOnline" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lastActiveAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "ProfileTripVisibility" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "tripId" UUID NOT NULL,
    "isVisible" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProfileTripVisibility_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProfilePhotoVisibility" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "photoId" UUID NOT NULL,
    "isVisible" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProfilePhotoVisibility_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProfileTripVisibility_userId_idx" ON "ProfileTripVisibility"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ProfileTripVisibility_userId_tripId_key" ON "ProfileTripVisibility"("userId", "tripId");

-- CreateIndex
CREATE INDEX "ProfilePhotoVisibility_userId_idx" ON "ProfilePhotoVisibility"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ProfilePhotoVisibility_userId_photoId_key" ON "ProfilePhotoVisibility"("userId", "photoId");

-- CreateIndex
CREATE INDEX "Flight_userId_idx" ON "Flight"("userId");

-- CreateIndex
CREATE INDEX "Flight_tripId_idx" ON "Flight"("tripId");

-- AddForeignKey
ALTER TABLE "ProfileTripVisibility" ADD CONSTRAINT "ProfileTripVisibility_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfileTripVisibility" ADD CONSTRAINT "ProfileTripVisibility_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfilePhotoVisibility" ADD CONSTRAINT "ProfilePhotoVisibility_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfilePhotoVisibility" ADD CONSTRAINT "ProfilePhotoVisibility_photoId_fkey" FOREIGN KEY ("photoId") REFERENCES "DiaryPhoto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Flight" ADD CONSTRAINT "Flight_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
