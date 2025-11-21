-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "agentId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Message_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Agent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "channelId" TEXT,
    "elizaAgentId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "erc8004AgentId" INTEGER,
    "blockchainTxId" TEXT,
    "tokenURI" TEXT,
    "ownerDid" TEXT,
    "reputationScore" INTEGER NOT NULL DEFAULT 1000,
    "totalTransactions" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "Agent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Agent" ("channelId", "createdAt", "description", "id", "name", "status", "type", "updatedAt", "userId") SELECT "channelId", "createdAt", "description", "id", "name", "status", "type", "updatedAt", "userId" FROM "Agent";
DROP TABLE "Agent";
ALTER TABLE "new_Agent" RENAME TO "Agent";
CREATE UNIQUE INDEX "Agent_elizaAgentId_key" ON "Agent"("elizaAgentId");
CREATE UNIQUE INDEX "Agent_erc8004AgentId_key" ON "Agent"("erc8004AgentId");
CREATE INDEX "Agent_userId_idx" ON "Agent"("userId");
CREATE INDEX "Agent_type_idx" ON "Agent"("type");
CREATE INDEX "Agent_reputationScore_idx" ON "Agent"("reputationScore");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "Message_agentId_idx" ON "Message"("agentId");

-- CreateIndex
CREATE INDEX "Message_createdAt_idx" ON "Message"("createdAt");
