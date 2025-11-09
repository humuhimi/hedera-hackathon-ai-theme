# Hedera Hackathon AI Theme

AI Agent Marketplace built on Hedera Hashgraph

## About This Project

This project is built for **Hedera Hackathon - Theme 1: AI & Agents**, exploring the fusion of AI-driven agents with decentralized infrastructure by creating marketplaces, coordination layers, and tools where autonomous actors can think, transact, and collaborate—leveraging Hedera's fast, low-cost microtransactions and secure consensus.

### Challenge Track

**Theme 1: AI & Agents** - Unlocking the rise of transparent, autonomous economies through AI agents on decentralized infrastructure.

### Our Approach

This project comprehensively addresses all challenge levels in a progressive manner:

**1. Basic Challenge: Verifiable On-Chain Agent**
- Deploy trustless AI Agents on-chain using Hedera ERC-8004 Smart Contracts
- Implementation: Agent registration with NFT representation and DID integration

**2. Intermediate Challenge: Collaborative Multi-Agent Marketplace**
- Create a network of AI agents that buy and sell digital goods using Agent-to-Agent (A2A) protocol
- Implementation: Marketplace platform with ElizaOS framework for autonomous agent behavior

**3. Main Track: Complete AI Agent Ecosystem**
- Full-stack decentralized marketplace combining on-chain verification, multi-agent collaboration, and real-time communication
- Implementation: Integrated platform with IPFS metadata storage, WebSocket messaging, and Hedera wallet integration

## Prerequisites

- Node.js v22.18.0
- Hedera Testnet Account (for backend and contract deployment)
- HashPack Wallet (Mobile App, for end users)
- OpenAI API Key

### Node.js v22.18.0 Installation

```bash
# Install nvm if not already installed
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Install and use Node.js v22.18.0
nvm install 22.18.0
nvm use 22.18.0

# Verify
node --version  # Should output: v22.18.0
```

### HashPack Wallet Setup

1. Download HashPack from [App Store](https://apps.apple.com/app/hashpack/id1548199928) or [Google Play](https://play.google.com/store/apps/details?id=com.hashpack.mobile)
2. Create a wallet and save your recovery phrase
3. Switch to **Hedera Testnet** in settings

### Login / Sign Up

1. Open http://localhost:5173 and click **"Get Started with HashPack"**
2. In HashPack app: **Connect dApps** → Scan the QR code
3. Approve the signature message
4. Done! Your account is created automatically on first login (free, no HBAR cost)

## Setup

### 1. Clone and Install Dependencies

```bash
git clone <repository-url>
cd hedera-hackathon-ai-theme

# Initialize submodules
git submodule update --init --recursive

# Install dependencies
npm install
cd frontend && npm install && cd ..
cd backend && npm install && cd ..
cd agents && npm install && cd ..
```

### 2. Environment Variables

```bash
# Root directory
cp .env.example .env

# Backend directory
cp backend/.env.example backend/.env
```

Edit `.env` files with your credentials:
- Hedera Account ID and Private Key
- OpenAI API Key

### 3. Database Setup

```bash
cd backend
npx prisma generate
npx prisma migrate dev --name init
cd ..
```

## Running the Application

### Development Mode

```bash
npm run dev
```

This starts all services:
- Agents: http://localhost:3333
- Backend: http://localhost:5001
- Frontend: http://localhost:5173
- Prisma Studio: http://localhost:5555

## Deploy ERC-8004 Contracts

```bash
npm run deploy:erc8004
```

## Available Scripts

- `npm run dev` - Run all services
- `npm run dev:agents` - Run agents only
- `npm run dev:backend` - Run backend only
- `npm run dev:frontend` - Run frontend only
