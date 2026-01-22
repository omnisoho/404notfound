/*
  Warnings:

  - You are about to drop the `PackingItem` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "PackingItem" DROP CONSTRAINT "PackingItem_tripId_fkey";

-- DropTable
DROP TABLE "PackingItem";

-- CreateTable
CREATE TABLE "PackingItemTemplate" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "PackingItemTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PackingSelection" (
    "id" UUID NOT NULL,
    "tripId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "templateId" UUID,
    "customName" TEXT,
    "isChecked" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "PackingSelection_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "PackingSelection" ADD CONSTRAINT "PackingSelection_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PackingSelection" ADD CONSTRAINT "PackingSelection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PackingSelection" ADD CONSTRAINT "PackingSelection_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "PackingItemTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;
