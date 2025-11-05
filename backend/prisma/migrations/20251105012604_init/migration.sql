-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "hederaAccountId" TEXT NOT NULL,
    "did" TEXT,
    "didPublicKey" TEXT,
    "didRegistered" BOOLEAN NOT NULL DEFAULT false,
    "userName" TEXT,
    "region" TEXT,
    "avatarUrl" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "lastLoginAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "User_hederaAccountId_key" ON "User"("hederaAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "User_did_key" ON "User"("did");
