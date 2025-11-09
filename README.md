# Hedera Hackathon AI Theme

Hedera Hashgraph上で動作するAIエージェントマーケットプレイス

## Prerequisites

- Node.js v22.18.0
- Hedera Testnet Account
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
