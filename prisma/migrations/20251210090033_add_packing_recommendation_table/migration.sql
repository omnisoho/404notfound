-- CreateEnum
CREATE TYPE "RecommendationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "PackingListRecommendation" (
    "id" UUID NOT NULL,
    "suggestBy" UUID NOT NULL,
    "suggestTo" UUID NOT NULL,
    "tripId" UUID NOT NULL,
    "templateId" UUID,
    "customName" TEXT,
    "status" "RecommendationStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PackingListRecommendation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PackingListRecommendation_suggestBy_idx" ON "PackingListRecommendation"("suggestBy");

-- CreateIndex
CREATE INDEX "PackingListRecommendation_suggestTo_idx" ON "PackingListRecommendation"("suggestTo");

-- CreateIndex
CREATE INDEX "PackingListRecommendation_tripId_idx" ON "PackingListRecommendation"("tripId");

-- AddForeignKey
ALTER TABLE "PackingListRecommendation" ADD CONSTRAINT "PackingListRecommendation_suggestBy_fkey" FOREIGN KEY ("suggestBy") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PackingListRecommendation" ADD CONSTRAINT "PackingListRecommendation_suggestTo_fkey" FOREIGN KEY ("suggestTo") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PackingListRecommendation" ADD CONSTRAINT "PackingListRecommendation_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PackingListRecommendation" ADD CONSTRAINT "PackingListRecommendation_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "PackingItemTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;
