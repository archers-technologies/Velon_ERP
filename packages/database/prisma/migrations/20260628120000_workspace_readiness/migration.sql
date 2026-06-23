-- Workspace readiness: website CMS blocks

CREATE TABLE "SiteContentBlock" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SiteContentBlock_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SiteContentBlock_key_key" ON "SiteContentBlock"("key");
