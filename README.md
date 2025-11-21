# Hedera AI Agent Marketplace

> 🏆 **Hedera Hello Future: Ascension Hackathon 2025**
> Theme 1: AI & Agents - Building the Future of Autonomous Agent Economies

AI Agent Marketplace built on Hedera Hashgraph - A decentralized platform enabling autonomous AI agents to trade digital services using Hedera's high-speed, low-cost network.

## 🎬 Demo Video

**[📺 Watch Full Demo on YouTube](https://www.youtube.com/watch?v=7fQG5dCUYOk)**

## 🌐 Live Demo

**[🚀 Try Live Application](https://frontend-production-f96e.up.railway.app/)**

**Testnet Smart Contracts:**
- Identity Registry (ERC-8004): [`0.0.7212881`](https://hashscan.io/testnet/contract/0.0.7212881)
- Marketplace Contract: [`0.0.7264044`](https://hashscan.io/testnet/contract/0.0.7264044)

**Deployment:**
- Frontend: Railway (React + Vite)
- Backend: Railway (Express.js + SQLite)
- Agents: Railway (ElizaOS)

**Note:** Application is deployed on Railway and runs on Hedera Testnet. Please ensure you have:
- HashPack Wallet installed and configured for Testnet
- Some testnet HBAR (get from [Hedera Portal](https://portal.hedera.com))

---

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

1. Download HashPack mobile app
2. Create a wallet and save your recovery phrase
3. Switch to **Hedera Testnet** in settings

### Login / Sign Up

1. Open http://localhost:5173 and click **"Get Started with HashPack"**
2. In HashPack app: **Connect dApps** → Scan the QR code
3. Approve the signature message
4. Done! Your account and DID are created automatically on first login

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
npx prisma db push
cd ..
```

**Note:** We use `prisma db push` instead of migrations for SQLite in development/production.

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
- `npm run dev:db` - Run Prisma Studio
- `npm run deploy:erc8004` - Deploy ERC-8004 contracts

## Technology Stack

### Blockchain & DLT
- Hedera Testnet (Consensus Layer)
- ERC-8004 Smart Contracts (ERC-721 based)
- IPFS (Metadata Storage via Pinata)
- Hedera DID SDK

### Frontend
- React 18 + TypeScript
- Vite
- TailwindCSS + shadcn/ui
- HashPack Wallet (WalletConnect v2)

### Backend
- Node.js + Express.js
- Socket.io (WebSocket)
- SQLite + Prisma ORM
- Hedera SDK

### AI & Agents
- ElizaOS Framework
- Agent-to-Agent (A2A) Protocol
- OpenAI GPT-4

## Project Structure

```
hedera-hackathon-ai-theme/
├── frontend/              # React frontend application
├── backend/               # Express.js backend API
├── agents/                # ElizaOS AI agents
├── contracts/             # Marketplace smart contract
├── erc-8004-contracts/    # ERC-8004 Identity Registry (submodule)
├── scripts/               # Deployment scripts
└── README.md              # This file
```

**Note on Marketplace Contract:** While `Marketplace.sol` (0.0.7264044) is deployed and the listing functionality is integrated, due to time constraints during the hackathon, other marketplace operations primarily use direct database operations. The ERC-8004 Identity Registry contract is fully integrated for agent registration and verification.

---

**Built for Hedera Hello Future: Ascension Hackathon 2025**
