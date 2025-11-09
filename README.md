# Hedera Hackathon AI Theme

Full-stack application for Hedera Hackathon with AI agents, built using monorepo architecture.

## 📁 Project Structure

```
hedera-hackathon-ai-theme/
├── frontend/          # React + Vite frontend application
├── backend/           # Express.js backend with Prisma
├── agents/            # ElizaOS AI agents
├── scripts/           # Utility scripts
└── erc-8004-contracts/ # ERC-8004 smart contracts (submodule)
```

## 🚀 Quick Start

### Prerequisites

- **Node.js** >= 18.x
- **npm** >= 9.x
- **Bun** (for agents workspace)

**Optional:**
- **PostgreSQL** (SQLite is used by default for development)

### 1. Clone the Repository

```bash
git clone --recurse-submodules <repository-url>
cd hedera-hackathon-ai-theme
```

If you've already cloned without submodules:
```bash
git submodule update --init --recursive
```

### 2. Initial Setup

Run the automated setup script:

```bash
npm run setup
```

This will:
- Install all dependencies for all workspaces
- Copy `.env.example` to `.env` in each workspace

**OR** follow these manual steps:

```bash
# Install dependencies
npm run install:all

# Set up environment variables
npm run env:setup
```

### 3. Configure Environment Variables

Update the `.env` files in each workspace with your actual values:

#### Root `.env`
```env
HEDERA_NETWORK=testnet
HEDERA_ACCOUNT_ID=your_account_id
HEDERA_PRIVATE_KEY=your_private_key
```

#### `backend/.env`
```env
# SQLite (default for development)
DATABASE_URL=file:./prisma/dev.db

# Or use PostgreSQL for production-like environment
# DATABASE_URL=postgresql://user:password@localhost:5432/hedera_hackathon

HEDERA_NETWORK=testnet
HEDERA_MANAGER_ACCOUNT_ID=your_account_id
HEDERA_MANAGER_PRIVATE_KEY=your_private_key
PINATA_JWT=your_pinata_jwt
JWT_SECRET=your-super-secret-jwt-key-min-32-characters-required
```

#### `frontend/.env`
```env
VITE_API_URL=http://localhost:3001
VITE_HEDERA_NETWORK=testnet
```

#### `agents/.env`
```env
SERVER_PORT=3333
DATABASE_URL=postgresql://user:password@localhost:5432/agents
```

### 4. Set Up Database

After configuring your environment variables, set up the database:

```bash
npm run db:setup
```

This will generate the Prisma client and sync your database schema.

### 5. Start Development

```bash
npm run dev
```

This will start all services concurrently:
- **Frontend**: http://localhost:5173
- **Backend**: http://localhost:3001
- **Agents**: http://localhost:3333
- **Prisma Studio**: http://localhost:5555

## 📦 Available Scripts

### Root Level Commands

| Command | Description |
|---------|-------------|
| `npm run setup` | Initial setup (install dependencies and copy .env files) |
| `npm run setup:full` | Complete setup including database |
| `npm run install:all` | Install dependencies for all workspaces |
| `npm run env:setup` | Copy .env.example files to .env |
| `npm run db:setup` | Generate Prisma client and sync database schema |
| `npm run db:reset` | Reset database (WARNING: deletes all data) |
| `npm run dev` | Start all services in development mode |
| `npm run start` | Start all services in production mode |
| `npm run build` | Build all workspaces |
| `npm run test` | Run tests in all workspaces |
| `npm run lint` | Lint all workspaces |
| `npm run clean` | Clean all node_modules and build artifacts |
| `npm run deploy:erc8004` | Deploy ERC-8004 contracts |

### Individual Workspace Commands

#### Frontend
```bash
npm run dev:frontend    # Start frontend dev server
npm run build:frontend  # Build frontend for production
```

#### Backend
```bash
npm run dev:backend     # Start backend dev server
npm run build:backend   # Build backend
npm run dev:db          # Open Prisma Studio
```

#### Agents
```bash
npm run dev:agents      # Start agents dev server
npm run build:agents    # Build agents
```

## 🗄️ Database Management

### Quick Database Commands

```bash
# Set up database (from root)
npm run db:setup

# Reset database - WARNING: deletes all data (from root)
npm run db:reset

# Open Prisma Studio (from root)
npm run dev:db
```

### Backend-specific Database Commands

```bash
cd backend

# Generate Prisma client only
npm run db:generate

# Sync schema without migrations (fast, for development)
npm run db:push

# Create and run migrations (recommended for production)
npm run db:migrate

# Reset database - WARNING: deletes all data
npm run db:reset

# Open Prisma Studio
npm run db:studio
```

## 🏗️ Architecture

### Frontend (React + Vite)
- React 18 with TypeScript
- Vite for fast development
- TailwindCSS for styling
- Hedera Wallet Connect integration
- Socket.IO client for real-time updates

### Backend (Express.js)
- Express.js with TypeScript
- Prisma ORM with PostgreSQL
- Hedera SDK integration
- Pinata for IPFS storage
- Socket.IO for real-time communication
- JWT authentication

### Agents (ElizaOS)
- AI agents powered by ElizaOS
- Socket.IO integration
- Ollama plugin for local LLMs
- SQL plugin for database interaction

## 🔧 Development Workflow

### Adding a New Package

To add a dependency to a specific workspace:

```bash
# Frontend
npm install <package> -w frontend

# Backend
npm install <package> -w backend

# Agents
npm install <package> -w agents
```

### Running Individual Tests

```bash
# Backend tests
cd backend && npm test

# Agents tests
cd agents && npm test
```

### Cleaning Up

```bash
# Clean all dependencies and build artifacts
npm run clean

# Clean only dependencies
npm run clean:deps

# Clean only build artifacts
npm run clean:build
```

## 🌐 Hedera Network

This project uses Hedera Testnet by default. To get started:

1. Create a Hedera testnet account at https://portal.hedera.com
2. Fund your account with testnet HBAR
3. Update your `.env` files with your account ID and private key

## 🤝 Contributing

### For New Developers

1. Follow the Quick Start guide above
2. Create a new branch for your feature: `git checkout -b feature/your-feature`
3. Make your changes
4. Run tests: `npm run test`
5. Lint your code: `npm run lint`
6. Commit your changes with a descriptive message
7. Push and create a pull request

### Code Style

- Use TypeScript for type safety
- Follow existing code conventions
- Write tests for new features
- Update documentation as needed

## 📝 License

[Add your license here]

## 🙏 Acknowledgments

- Hedera Hashgraph
- ElizaOS
- All contributors to this project

## 📞 Support

For questions and support, please open an issue on GitHub.
