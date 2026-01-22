-- Add timezone columns to Flight table
-- These columns already exist in the database but need to be documented in migration history
ALTER TABLE "Flight" ADD COLUMN IF NOT EXISTS "originTimezone" TEXT;
ALTER TABLE "Flight" ADD COLUMN IF NOT EXISTS "destinationTimezone" TEXT;
