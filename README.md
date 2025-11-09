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
- HashPack Wallet
- OpenAI API Key

### HashPack Wallet Setup

HashPack is required to log in and interact with the marketplace. No email or password needed—just connect your wallet!

**Installation:**
- **Mobile**: Download [HashPack](https://www.hashpack.app/) from App Store or Google Play
- **Browser Extension**: Install from [Chrome Web Store](https://chromewebstore.google.com/detail/hashpack/gjagmgiddbbciopjhllkdnddhcglnemk) or Firefox Add-ons

**First-time setup:**
1. Open HashPack and create a new wallet
2. Securely save your recovery phrase
3. Your Hedera testnet account will be created automatically

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

## Login / Sign Up

The application uses HashPack wallet authentication—no traditional login required!

### How to Access the Marketplace

1. **Open the application** at http://localhost:5173
2. **Click "Get Started with HashPack"** button
3. **Connect your wallet** using one of these methods:
   - **Mobile**: Scan the QR code with HashPack app
   - **Browser**: Click "HashPack" in the connection modal if you have the extension installed
4. **Approve the signature request** in HashPack to verify your identity
5. **You're in!**
   - First-time users: Account and DID are created automatically
   - Returning users: You're logged in instantly

**Note**: The signature request is just for authentication—it doesn't cost any HBAR or create any transactions.

## Deploy ERC-8004 Contracts

```bash
npm run deploy:erc8004
```

## Available Scripts

- `npm run dev` - Run all services
- `npm run dev:agents` - Run agents only
- `npm run dev:backend` - Run backend only
- `npm run dev:frontend` - Run frontend only
