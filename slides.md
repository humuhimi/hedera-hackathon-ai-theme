---
theme: default
background: https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=1920
title: Hedera AI Agent Marketplace
info: |
  ## Hedera AI Agent Marketplace
  Decentralized AI Agent marketplace built on Hedera Hashgraph
  Theme 1: AI & Agents - Hedera Hello Future Hackathon
class: text-center
highlighter: shiki
drawings:
  persist: false
transition: slide-left
mdc: true
---

# Hedera AI Agent Marketplace

Autonomous AI Agents Trading on Decentralized Infrastructure

<div class="pt-12">
  <span @click="$slidev.nav.next" class="px-2 py-1 rounded cursor-pointer" hover="bg-white bg-opacity-10">
    Hedera Hello Future: Ascension Hackathon 2025 <carbon:arrow-right class="inline"/>
  </span>
</div>

<div class="abs-bl m-6 flex gap-2">
  <a href="https://github.com/humuhimi/hedera-hackathon-ai-theme" target="_blank" alt="GitHub"
    class="text-xl slidev-icon-btn opacity-50 !border-none !hover:text-white">
    <carbon-logo-github />
  </a>
</div>

<div class="abs-br m-6 text-sm opacity-70">
  <div class="mb-2 font-bold text-base">Team</div>
  <div><strong>Humu</strong> - Technical Lead & Development</div>
  <div><strong>Emmy</strong> - Frontend Dev Support</div>
  <div><strong>Sham</strong> - Setup & Testing</div>
</div>

---

# The Problem

Autonomous AI agent economies face two critical barriers:

<v-clicks>

## 🔐 Trust Barrier: Agent Identity & Verification

**Current State:**
- No cryptographic proof of agent ownership
- Agent metadata can be tampered with in centralized systems
- Cannot verify if listed agents are authentic
- No immutable record of agent identity and transactions

**Impact:**
- Buyers cannot verify seller's legitimacy
- Fraudulent listings cannot be detected
- Human verification needed for every purchase
- Cannot delegate buying decisions to AI agents

## 🤖 Autonomy Barrier: Agent-to-Agent Commerce

**Current State:**
- Existing marketplaces designed for human users only
- AI agents cannot autonomously discover and transact
- Micropayments (<$0.01) impossible due to high fees (Ethereum: $50/tx)
- No protocol for agent-to-agent negotiation

**Impact:**
- Agents cannot act independently
- Human must approve each transaction
- AI delegation potential remains unrealized

</v-clicks>

<div v-click class="mt-8 p-4 bg-red-500 bg-opacity-20 rounded">

**Combined Effect:** AI agent market ($47B by 2030) cannot scale without solving both barriers

</div>

---

# The Solution

<div class="text-sm leading-tight space-y-1">

**Hedera AI Agent Marketplace** - Solving Trust & Autonomy barriers through implementation:

<v-clicks>

## 🔐 Breaking the Trust Barrier

<div class="space-y-0.5">

**ERC-8004 Smart Contracts on Hedera**
- On-chain agent registration with NFT-based identity
- Each agent represented as ERC-721 NFT
- Immutable proof of capabilities and ownership

**Decentralized Identity (DID) Integration**
- W3C DID standard implementation
- Cryptographic signature verification
- Portable identity across platforms

**IPFS Metadata Storage**
- Permanent, tamper-proof agent metadata storage
- Content-addressed (CID) linked to NFT
- Agent Card includes: capabilities, A2A endpoint, description
- Decentralized file system - no central server dependency

</div>

## 🤖 Breaking the Autonomy Barrier

<div class="space-y-0.5">

**Agent-to-Agent (A2A) Protocol**
- JSON-RPC 2.0 standard for agent communication
- ElizaOS framework for autonomous behavior
- Direct agent-to-agent negotiation and trading

**Hedera's Micropayment Infrastructure**
- $0.0001 per transaction (vs Ethereum's $50)
- 3-5 second finality
- 10,000+ TPS capacity
- Enables true micropayments (<$0.01)

**Real-Time Communication**
- WebSocket for instant updates
- Autonomous transaction processing
- No human intervention required

</div>

</v-clicks>

</div>

---

# Challenge Level Coverage

<div class="grid grid-cols-3 gap-4 mt-8">

<div v-click class="p-4 border-2 border-green-500 rounded">

### ✅ Basic Challenge
**Verifiable On-Chain Agent**

- ERC-8004 Smart Contract deployment
- NFT-based agent representation
- DID integration for identity
- Immutable on-chain identity proof

</div>

<div v-click class="p-4 border-2 border-blue-500 rounded">

### ✅ Intermediate Challenge
**Multi-Agent Marketplace**

- Agent-to-Agent (A2A) protocol
- ElizaOS framework integration
- Autonomous buying & selling
- Digital goods exchange

</div>

<div v-click class="p-4 border-2 border-purple-500 rounded">

### ✅ Main Track
**Complete Ecosystem**

- Full-stack marketplace platform
- IPFS metadata storage
- WebSocket real-time messaging
- HashPack wallet integration

</div>

</div>

---

# Feasibility 🎯

<div class="grid grid-cols-2 gap-8 mt-8">

<div v-click>

## 🚫 Why Not Web2?

❌ Centralized fees (30-40%)

❌ No trustless verification

❌ Platform can change rules

❌ No true ownership

❌ No cross-platform migration

</div>

<div v-click>

## ✅ Why Hedera?

✅ **Speed**: 10,000+ TPS, 3-5s finality

✅ **Cost**: $0.0001 per transaction

✅ **Sustainability**: Carbon-negative

✅ **Security**: aBFT consensus

✅ **ERC-8004**: Agent verification

</div>

</div>

---

# Technical Architecture

```mermaid
flowchart LR
    subgraph User["👤 User Layer"]
        A[HashPack Wallet]
    end

    subgraph App["💻 Application Layer"]
        B[Frontend<br/>React + Vite]
        C[Backend<br/>Express.js]
        D[ElizaOS Agents<br/>AI Framework]
        E[(SQLite<br/>Off-chain)]
    end

    subgraph Hedera["⚡ Hedera Layer"]
        F[Hedera Testnet]
        G[ERC-8004<br/>Agent Registry]
        H[Marketplace<br/>Contract]
        I[IPFS<br/>Metadata]
    end

    A -->|WalletConnect| B
    B -->|REST/WebSocket| C
    C --> E
    C --> D
    C -->|Hedera SDK| F
    F --- G
    F --- H
    F --- I
    D -->|A2A Protocol| D

    style A fill:#4ade80,stroke:#2d6a4f,stroke-width:3px
    style F fill:#ff6b6b,stroke:#c92a2a,stroke-width:3px
    style G fill:#4dabf7,stroke:#1971c2,stroke-width:2px
    style H fill:#4dabf7,stroke:#1971c2,stroke-width:2px
    style D fill:#ffd93d,stroke:#f59f00,stroke-width:3px
```

---

# Technology Stack

<div class="grid grid-cols-2 gap-8 mt-8">

<div>

## 🔗 Blockchain Layer

<v-clicks>

- **Hedera Testnet** - L1 consensus layer
- **ERC-8004 Smart Contracts** (3 contracts):
  - Identity Registry (0.0.7212881)
  - Reputation Registry (0.0.7212889)
  - Validation Registry (0.0.7212892)
- **Marketplace Contract** (0.0.7264044)
  - Listing/Inquiry/Reservation/Completion
- **IPFS (Pinata)** - Decentralized metadata storage
- **Hedera DID SDK** - Identity management

</v-clicks>

</div>

<div>

## 💻 Application Layer

<v-clicks>

- **Frontend**: React + TypeScript + Vite
- **Backend**: Node.js + Express.js
- **Database**: SQLite + Prisma ORM
- **AI Agents**: ElizaOS Framework
- **A2A Protocol**: @a2a-js/sdk (JSON-RPC 2.0)
- **Wallet**: HashPack (WalletConnect v2)
- **Real-time**: WebSocket (Socket.io)

</v-clicks>

</div>

</div>

---

# A2A Protocol Implementation

## Agent-to-Agent Communication Standard

<div class="grid grid-cols-2 gap-8 mt-8">

<div v-click>

**Protocol Stack:**
- **@a2a-js/sdk** - Official A2A JavaScript SDK
- **JSON-RPC 2.0** - Standard remote procedure call protocol
- **Agent Card v0.3.0** - Standardized agent capability discovery

**Key Features Implemented:**
- ✅ Streaming message support
- ✅ Real-time negotiation logic
- ✅ Autonomous price discovery
- ✅ Decision criteria detection
- ✅ Mutual satisfaction checking

</div>

<div v-click>

**Use Cases:**
- Buyer agent discovers seller agent via Agent Card
- Autonomous negotiation with counter-offers
- Automatic price agreement without human intervention
- Transaction finalization through Hedera

</div>

</div>

---

# Execution ⚙️

## MVP Features Delivered

<div class="grid grid-cols-2 gap-6 mt-8">

<div v-click>

### 🎯 Core Marketplace
- Agent browsing & discovery
- Search and filtering
- Agent detail pages
- Purchase functionality
- Transaction history

### 🤖 AI Agent Features
- Agent registration (ERC-8004)
- NFT-based agent identity
- DID credential system
- IPFS metadata storage
- Agent-to-Agent messaging
- Autonomous trading logic

</div>

<div v-click>

### 🔐 Authentication & Wallet
- HashPack wallet integration
- WalletConnect v2 protocol
- DID-based authentication
- Signature verification

### 📊 User Experience
- Responsive design
- Real-time updates (WebSocket)
- Transaction confirmations
- Error handling
- Mobile-friendly UI

</div>

</div>

---

# Future Roadmap

## Key Focus Areas

<v-clicks>

**🔐 Verifiable Credentials for Participation Control**
- User VC-based marketplace access control
- Agent VC-based capability verification
- Automated eligibility checking for trades

**📊 Reputation-Based Auto-Judgment System**
- Leverage ERC-8004 Reputation Registry for on-chain reputation storage
- Transaction history analysis between different agent personalities
- Automated trustworthiness assessment based on past behavior

**💰 AP2 (Agent Payment Protocol) Integration**
- Autonomous payment execution by AI agents
- Automated transaction settlement
- Agent-to-agent value transfer

</v-clicks>

---

# Hedera Integration 🔗

<div class="grid grid-cols-2 gap-8 mt-8">

<div v-click>

## ⚡ Core Services Used

**Hedera Consensus Service (HCS)**
- Transaction ordering & immutable audit trail

**Smart Contract Service**
- ERC-8004 agent contracts (ERC-721 NFT)
- Marketplace contract logic

**File Service**
- IPFS integration & metadata storage

</div>

<div v-click>

## 📊 Network Impact

**Account Creation**
- 1 account per user (DID-based)
- Automatic on first login

**Transaction Types**
- Agent registration (ERC-721 NFT via smart contract)
- Marketplace transactions (listing, purchase)
- Smart contract interactions
- DID operations

</div>

</div>

---
layout: center
class: text-center
---

# Demo Video 🎬

## See It In Action

<div class="mt-12">

📺 **Watch our full demo on YouTube:**

<div class="mt-8 p-6 bg-red-500 bg-opacity-20 rounded-lg border-2 border-red-500">
  <div class="text-3xl mb-4">🎥</div>
  <a href="https://www.youtube.com/watch?v=7fQG5dCUYOk" target="_blank" class="text-2xl font-bold text-blue-400 hover:text-blue-300">
    Click Here to Watch Demo
  </a>
  <div class="mt-4 text-sm opacity-70">
    Comprehensive walkthrough
  </div>
</div>

</div>

<div class="mt-12 text-sm opacity-50">
Demo covers: HashPack login → Agent registration → Marketplace → Purchase flow → A2A trading
</div>

---
layout: center
class: text-center
---

# Thank You! 🙏

## Let's Build the Future of AI Commerce Together

<div class="mt-12 grid grid-cols-3 gap-8">

<div>
  <div class="text-4xl mb-2">🌐</div>
  <div class="font-bold">Live Demo</div>
  <a href="https://frontend-production-f96e.up.railway.app" target="_blank" class="text-sm opacity-70 mt-2 hover:text-blue-400">frontend-production-f96e.up.railway.app</a>
</div>

<div>
  <div class="text-4xl mb-2">📁</div>
  <div class="font-bold">GitHub</div>
  <a href="https://github.com/humuhimi/hedera-hackathon-ai-theme" target="_blank" class="text-sm opacity-70 mt-2 hover:text-blue-400">github.com/humuhimi/hedera-hackathon-ai-theme</a>
</div>

<div>
  <div class="text-4xl mb-2">📧</div>
  <div class="font-bold">Contact</div>
  <div class="text-sm opacity-70 mt-2">humu71918@gmail.com</div>
</div>

</div>

<div class="mt-12 p-4 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg">
  <div class="text-xl font-bold">Hedera Hello Future: Ascension Hackathon 2025</div>
  <div class="text-sm mt-2">Theme 1: AI & Agents</div>
</div>
