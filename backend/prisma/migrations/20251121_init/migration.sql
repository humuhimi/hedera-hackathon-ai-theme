-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "hederaAccountId" TEXT NOT NULL,
    "did" TEXT,
    "didPublicKey" TEXT,
    "didRegistered" BOOLEAN NOT NULL DEFAULT false,
    "userName" TEXT,
    "region" TEXT,
    "avatarUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastLoginAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Agent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "channelId" TEXT,
    "elizaAgentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "erc8004AgentId" INTEGER,
    "blockchainTxId" TEXT,
    "tokenURI" TEXT,
    "ownerDid" TEXT,
    "reputationScore" INTEGER NOT NULL DEFAULT 1000,
    "totalTransactions" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Agent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Listing" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "sellerAgentId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "basePrice" DOUBLE PRECISION NOT NULL,
    "expectedPrice" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "transactionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Listing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Inquiry" (
    "id" TEXT NOT NULL,
    "inquiryId" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "buyerAgentId" INTEGER NOT NULL,
    "offerPrice" DOUBLE PRECISION NOT NULL,
    "message" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "transactionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Inquiry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BuyRequest" (
    "id" TEXT NOT NULL,
    "buyerAgentId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "minPrice" DOUBLE PRECISION NOT NULL,
    "maxPrice" DOUBLE PRECISION NOT NULL,
    "category" TEXT,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "searchStep" TEXT NOT NULL DEFAULT 'idle',
    "searchMessage" TEXT,
    "matchedListingId" INTEGER,
    "sellerAgentId" INTEGER,
    "a2aEndpoint" TEXT,
    "searchError" TEXT,
    "negotiationRoomId" TEXT,

    CONSTRAINT "BuyRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NegotiationRoom" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "sellerAgentId" INTEGER NOT NULL,
    "buyerAgentId" INTEGER,
    "sellerA2AEndpoint" TEXT NOT NULL,
    "buyerA2AEndpoint" TEXT,
    "status" TEXT NOT NULL DEFAULT 'WAITING',
    "agreedPrice" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NegotiationRoom_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NegotiationMessage" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "sender" TEXT NOT NULL,
    "senderAgentId" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "messageType" TEXT NOT NULL DEFAULT 'text',
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NegotiationMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_hederaAccountId_key" ON "User"("hederaAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "User_did_key" ON "User"("did");

-- CreateIndex
CREATE UNIQUE INDEX "Agent_elizaAgentId_key" ON "Agent"("elizaAgentId");

-- CreateIndex
CREATE UNIQUE INDEX "Agent_erc8004AgentId_key" ON "Agent"("erc8004AgentId");

-- CreateIndex
CREATE INDEX "Agent_userId_idx" ON "Agent"("userId");

-- CreateIndex
CREATE INDEX "Agent_type_idx" ON "Agent"("type");

-- CreateIndex
CREATE INDEX "Agent_reputationScore_idx" ON "Agent"("reputationScore");

-- CreateIndex
CREATE INDEX "Message_agentId_idx" ON "Message"("agentId");

-- CreateIndex
CREATE INDEX "Message_createdAt_idx" ON "Message"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Listing_listingId_key" ON "Listing"("listingId");

-- CreateIndex
CREATE INDEX "Listing_listingId_idx" ON "Listing"("listingId");

-- CreateIndex
CREATE INDEX "Listing_status_idx" ON "Listing"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Inquiry_inquiryId_key" ON "Inquiry"("inquiryId");

-- CreateIndex
CREATE INDEX "Inquiry_inquiryId_idx" ON "Inquiry"("inquiryId");

-- CreateIndex
CREATE INDEX "Inquiry_listingId_idx" ON "Inquiry"("listingId");

-- CreateIndex
CREATE INDEX "Inquiry_status_idx" ON "Inquiry"("status");

-- CreateIndex
CREATE INDEX "BuyRequest_buyerAgentId_idx" ON "BuyRequest"("buyerAgentId");

-- CreateIndex
CREATE INDEX "BuyRequest_status_idx" ON "BuyRequest"("status");

-- CreateIndex
CREATE INDEX "BuyRequest_category_idx" ON "BuyRequest"("category");

-- CreateIndex
CREATE UNIQUE INDEX "NegotiationRoom_listingId_key" ON "NegotiationRoom"("listingId");

-- CreateIndex
CREATE INDEX "NegotiationRoom_listingId_idx" ON "NegotiationRoom"("listingId");

-- CreateIndex
CREATE INDEX "NegotiationRoom_sellerAgentId_idx" ON "NegotiationRoom"("sellerAgentId");

-- CreateIndex
CREATE INDEX "NegotiationRoom_buyerAgentId_idx" ON "NegotiationRoom"("buyerAgentId");

-- CreateIndex
CREATE INDEX "NegotiationRoom_status_idx" ON "NegotiationRoom"("status");

-- CreateIndex
CREATE INDEX "NegotiationMessage_roomId_idx" ON "NegotiationMessage"("roomId");

-- CreateIndex
CREATE INDEX "NegotiationMessage_createdAt_idx" ON "NegotiationMessage"("createdAt");

-- AddForeignKey
ALTER TABLE "Agent" ADD CONSTRAINT "Agent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inquiry" ADD CONSTRAINT "Inquiry_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("listingId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NegotiationMessage" ADD CONSTRAINT "NegotiationMessage_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "NegotiationRoom"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

