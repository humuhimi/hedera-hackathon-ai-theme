# Hedera Hackathon AI Theme

A full-stack decentralized AI agent marketplace built on Hedera Hashgraph with ERC-8004 standard integration. This project enables users to create, register, and trade AI agents on the blockchain with DID (Decentralized Identity) support.

## 📋 Table of Contents

- [Features](#-features)
- [Prerequisites](#-prerequisites)
- [Project Structure](#-project-structure)
- [Getting Started](#-getting-started)
- [Environment Variables](#-environment-variables)
- [Database Setup](#-database-setup)
- [Running the Application](#-running-the-application)
- [ERC-8004 Contract Deployment](#-erc-8004-contract-deployment)
- [Available Scripts](#-available-scripts)
- [Tech Stack](#-tech-stack)

## ✨ Features

- **Decentralized AI Agent Marketplace**: Create and trade AI agents on Hedera network
- **ERC-8004 Standard Integration**: On-chain agent registration with NFT representation
- **Hedera DID Support**: Decentralized identity management for users
- **ElizaOS Integration**: AI agent framework for intelligent agent behavior
- **Real-time Communication**: WebSocket-based agent messaging via Socket.io
- **IPFS Metadata Storage**: Decentralized storage for agent metadata via Pinata
- **Wallet Connect**: Hedera wallet integration for seamless blockchain interactions

## 🔧 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js**: v22.18.0 (required)
- **npm**: v10.x or higher
- **Hedera Testnet Account**: For blockchain interactions
- **OpenAI API Key**: For AI agent functionality (optional but recommended)
- **Pinata Account**: For IPFS metadata storage

### Installing Node.js v22.18.0

You can use [nvm (Node Version Manager)](https://github.com/nvm-sh/nvm) to install the required Node.js version:

```bash
# Install nvm (if not already installed)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Install Node.js v22.18.0
nvm install 22.18.0

# Use Node.js v22.18.0
nvm use 22.18.0

# Verify installation
node --version  # Should output: v22.18.0
```

## 📁 Project Structure

```
hedera-hackathon-ai-theme/
├── agents/                 # ElizaOS AI agents service
│   ├── src/               # Agent source code
│   └── package.json
├── backend/               # Express.js backend API
│   ├── src/              # Backend source code
│   ├── prisma/           # Database schema and migrations
│   │   └── schema.prisma # Prisma schema (SQLite for dev)
│   └── package.json
├── frontend/             # React + Vite frontend
│   ├── src/             # Frontend source code
│   └── package.json
├── scripts/             # Deployment and utility scripts
│   └── deploy-erc8004.ts # ERC-8004 contract deployment
├── erc-8004-contracts/  # ERC-8004 smart contracts (submodule)
├── .env.example         # Environment variables template
└── package.json         # Root package.json with workspace scripts
```

## 🚀 Getting Started

### 1. Clone the Repository

```bash
git clone <repository-url>
cd hedera-hackathon-ai-theme
```

### 2. Initialize Submodules

This project uses git submodules for ERC-8004 contracts:

```bash
git submodule update --init --recursive
```

### 3. Install Dependencies

Install dependencies for all workspaces:

```bash
# Install root dependencies
npm install

# Install frontend dependencies
cd frontend && npm install && cd ..

# Install backend dependencies
cd backend && npm install && cd ..

# Install agents dependencies
cd agents && npm install && cd ..
```

## 🔐 Environment Variables

### Root Level Configuration

Create a `.env` file in the root directory:

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

```env
# Hedera Account Configuration
HEDERA_MANAGER_ACCOUNT_ID=0.0.xxxxxx
HEDERA_MANAGER_PRIVATE_KEY=0x-your-private-key
HEDERA_NETWORK=testnet

# ERC-8004 Contract Addresses (filled after deployment)
ERC8004_IDENTITY_REGISTRY=
ERC8004_IDENTITY_REGISTRY_ADDRESS=
ERC8004_REPUTATION_REGISTRY=
ERC8004_REPUTATION_REGISTRY_ADDRESS=
ERC8004_VALIDATION_REGISTRY=
ERC8004_VALIDATION_REGISTRY_ADDRESS=

# OpenAI API Key (for AI agents)
OPENAI_API_KEY=sk-xxxx
```

### Backend Configuration

Create a `.env` file in the `backend` directory:

```bash
cp backend/.env.example backend/.env
```

Configure the backend environment variables (refer to `backend/.env.example` for required variables).

### Frontend Configuration

If needed, create environment variables for the frontend. Check `frontend/.env.example` if it exists.

## 🗄️ Database Setup

The backend uses Prisma ORM with SQLite for development.

### Initialize the Database

```bash
cd backend

# Generate Prisma Client
npx prisma generate

# Create and migrate the database
npx prisma migrate dev --name init

# (Optional) Open Prisma Studio to view/edit data
npx prisma studio
```

The database file will be created at `backend/dev.db` (SQLite).

## 🏃 Running the Application

### Development Mode (All Services)

Run all services concurrently with Prisma Studio:

```bash
npm run dev
```

This will start:
- **Agents** service on port `3333` (ElizaOS)
- **Backend** API on port `5001` (Express)
- **Frontend** on port `5173` (Vite)
- **Prisma Studio** on port `5555` (Database GUI)

### Running Services Individually

```bash
# Run only agents
npm run dev:agents

# Run only backend
npm run dev:backend

# Run only frontend
npm run dev:frontend

# Run only Prisma Studio
npm run dev:db
```

### Production Mode

```bash
npm run start
```

This starts the agents, backend, and frontend in production mode.

## 🔗 ERC-8004 Contract Deployment

Deploy ERC-8004 smart contracts to Hedera testnet:

```bash
npm run deploy:erc8004
```

After deployment, the contract addresses will be saved to `erc8004-deployment-testnet.json` and automatically updated in your `.env` file.

## 📜 Available Scripts

### Root Level

| Script | Description |
|--------|-------------|
| `npm run dev` | Run all services in development mode with Prisma Studio |
| `npm run start` | Run all services in production mode |
| `npm run dev:agents` | Run only the agents service |
| `npm run dev:backend` | Run only the backend service |
| `npm run dev:frontend` | Run only the frontend |
| `npm run dev:db` | Open Prisma Studio |
| `npm run deploy:erc8004` | Deploy ERC-8004 contracts to Hedera |

### Frontend

```bash
cd frontend
npm run dev      # Start development server
npm run build    # Build for production
npm run preview  # Preview production build
```

### Backend

```bash
cd backend
npm run dev      # Start development server with hot reload
npm run build    # Compile TypeScript
npm run start    # Run compiled JavaScript
npm test         # Run tests with Vitest
npm run test:ui  # Run tests with UI
```

### Agents

```bash
cd agents
npm run dev      # Start agents in development mode
npm run start    # Start agents in production mode
npm run build    # Build agents
npm run lint     # Format code with Prettier
npm test         # Run tests
```

## 🛠️ Tech Stack

### Frontend
- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Utility-first CSS framework
- **React Router** - Client-side routing
- **Hedera Wallet Connect** - Wallet integration
- **Socket.io Client** - Real-time communication

### Backend
- **Express.js** - Web framework
- **TypeScript** - Type safety
- **Prisma** - ORM with SQLite (dev) / PostgreSQL (prod)
- **Hedera SDK** - Blockchain integration
- **Socket.io** - WebSocket server
- **JWT** - Authentication
- **Pinata** - IPFS integration
- **Vitest** - Testing framework

### Agents
- **ElizaOS** - AI agent framework
- **Socket.io** - Real-time communication
- **React Query** - Data fetching and caching

### Blockchain
- **Hedera Hashgraph** - Layer 1 blockchain
- **ERC-8004** - Agent registration standard
- **Hedera DID SDK** - Decentralized identity

## 📝 Notes

- **Development Database**: Uses SQLite for ease of development. Data is stored in `backend/dev.db`.
- **Production Database**: Configured for PostgreSQL (e.g., Railway).
- **Hedera Network**: Currently configured for testnet. Update `HEDERA_NETWORK` in `.env` for mainnet.
- **Node Version**: This project requires Node.js v22.18.0. Using other versions may cause compatibility issues.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is part of the Hedera Hackathon AI Theme.

---

**Need Help?** Check the individual README files in each subdirectory for more detailed documentation on specific components.
