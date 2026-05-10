# 🌊 SolShadow — Shadow the Smartest Wallets on Ethereum & Base

> **Real-time whale copy-trading intelligence, powered by GoldRush.**

[![Live Demo](https://img.shields.io/badge/Live%20Demo-solshadow.vercel.app-00f5a0?style=for-the-badge)](https://solshadow.vercel.app)
[![GoldRush](https://img.shields.io/badge/Powered%20by-GoldRush-0066ff?style=for-the-badge)](https://goldrush.dev)
[![Hackathon](https://img.shields.io/badge/GoldRush-Hackathon%202025-ff6b00?style=for-the-badge)](https://goldrush.dev)

---

## 🎯 The Problem

Every day, whale wallets move **millions of dollars** on-chain while retail traders are left guessing. On-chain data has always been available — but it's raw, unstructured, and nearly impossible to act on in real time. Most copy-trading solutions are centralized, expensive, or require running your own nodes and indexing infrastructure.

**SolShadow changes that.**

---

## 💡 What is SolShadow?

SolShadow is a **real-time whale copy-trading signal agent** built entirely on GoldRush's API suite. It lets you:

1. **Discover** the top token holders on Ethereum & Base — your whale candidates
2. **Assess** each wallet's risk profile — Trust Score, Value at Risk, approval hygiene
3. **Shadow** any whale wallet — our agent monitors their on-chain activity in real time
4. **React** — get live trade signals the moment a whale moves, with AI-powered analysis

No nodes. No indexing. No infrastructure. Just GoldRush.

---

## 🚀 Live Demo

👉 **[solshadow.vercel.app](https://solshadow.vercel.app)**

---

## ⚡ GoldRush APIs Used

SolShadow uses **6 GoldRush endpoints** across **3 API services** and **2 chains**:

### 1. 🐋 Whale Discovery
**`GET /v1/{chain}/tokens/{tokenAddress}/token_holders_v2/`**
Returns the top token holders for any ERC-20. Core of SolShadow's whale discovery.
**Chains:** `eth-mainnet`, `base-mainnet`

### 2. 💼 Portfolio Holdings & 24h PnL
**`GET /v1/{chain}/address/{walletAddress}/balances_v2/`**
All token balances with USD pricing and 24h changes. Powers the portfolio view and PnL estimation.
**Chains:** `eth-mainnet`, `base-mainnet`

### 3. 📊 Trade History & Wallet Age
**`GET /v1/{chain}/address/{walletAddress}/transactions_summary/`**
Total transaction count, earliest and latest transaction dates.
**Chains:** `eth-mainnet`, `base-mainnet`

### 4. 📋 Recent Transactions
**`GET /v1/{chain}/address/{walletAddress}/transactions_v3/`**
Paginated transaction history with USD values.
**Chains:** `eth-mainnet`, `base-mainnet`

### 5. 🛡️ Trust Score & Security Assessment
**`GET /v1/{chain}/approvals/{walletAddress}/`** — **Security Service**
Token approvals with `risk_factor` labels, `value_at_risk_quote`, and spender metadata.
Powers SolShadow's Trust Score (0-100), Value at Risk, and approval breakdown.
This is the most unique endpoint — no other copy-trading tool uses approval hygiene as a wallet quality signal.
**Chains:** `eth-mainnet`, `base-mainnet`

### 6. 📈 PnL Data via GraphQL
**`upnlForToken` + `upnlForWallet`** — **Streaming API GraphQL**
Realized and unrealized PnL per token for enriched wallet profiles.
**URL:** `https://streaming.goldrushdata.com/graphql`

---

## 🏗️ Architecture

```
┌──────────────────────────────────────────────────┐
│                   SolShadow                      │
├──────────────────┬───────────────────────────────┤
│  Frontend        │  Backend                      │
│  Next.js 14      │  Node.js + Express            │
│  Vercel          │  Render                       │
├──────────────────┴───────────────────────────────┤
│              GoldRush APIs (6 endpoints)         │
│  token_holders_v2    →  Whale Discovery          │
│  balances_v2         →  Portfolio + PnL          │
│  transactions_summary→  Trade Count + Age        │
│  transactions_v3     →  Recent Activity          │
│  approvals           →  Trust Score + Risk       │
│  GraphQL             →  PnL Data                 │
├──────────────────────────────────────────────────┤
│          Groq + LLaMA 3.1 8B Instant            │
│        AI-powered signal analysis                │
└──────────────────────────────────────────────────┘
```

---

## 🌊 How It Works

**Step 1 — Discover:** Select a token. SolShadow calls `token_holders_v2` and returns top whale wallets ranked by holding size with tier labels (Mega Whale 🐳, Whale 🐋, Shark 🦈, Dolphin 🐬).

**Step 2 — Assess:** Click any whale card. SolShadow simultaneously fetches their portfolio (`balances_v2`), trade history (`transactions_summary`), and runs a full security assessment (`approvals`) showing Trust Score and Value at Risk.

**Step 3 — Shadow:** Click SHADOW. The agent begins monitoring that wallet for on-chain activity.

**Step 4 — Signal:** When the whale moves, a live signal fires — token swapped, amount, chain, wallet. Click AI Explain for Groq-powered analysis: what the trade means, whether to copy, key risk.

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14, TypeScript, Tailwind CSS |
| Backend | Node.js, Express.js |
| Blockchain Data | GoldRush by Covalent (6 endpoints) |
| AI Analysis | Groq API + LLaMA 3.1 8B Instant |
| Deployment | Vercel + Render |
| Networks | Ethereum Mainnet + Base Mainnet |

---

## 🔧 Running Locally

### Prerequisites
- Node.js v20+
- GoldRush API key — free at [goldrush.dev](https://goldrush.dev)
- Groq API key — free at [console.groq.com](https://console.groq.com)

### Backend
```bash
cd backend
npm install
# Create .env with your keys:
# GOLDRUSH_API_KEY=your_key
# GROQ_API_KEY=your_key
# PORT=4000
npm run dev
```

### Frontend
```bash
cd frontend
npm install
# Create .env.local:
# NEXT_PUBLIC_BACKEND_URL=http://localhost:4000
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## 📡 Backend API

| Method | Endpoint | Description |
|---|---|---|
| GET | `/health` | Health check |
| GET | `/api/whales/discover` | Top whale wallets for a token |
| GET | `/api/whales/profile` | Full wallet profile + holdings |
| GET | `/api/whales/risk` | Trust score + security data |
| POST | `/api/whales/watch` | Start monitoring a wallet |
| GET | `/api/whales/signals` | Latest trade signals |
| POST | `/api/whales/explain` | AI analysis of a signal |

---

## 🎯 Hackathon

Built for the **GoldRush Hackathon 2026** — DeFi & Trading Tools track.

SolShadow directly addresses the brief:
> *"Build whale tracking feeds that monitor wallets and fire signals to copy-trading agents the moment positions shift"* ✅
> *"Score wallet risk from token balances, approval hygiene, and full transaction history"* ✅
> *"Generate counterparty trust scores from on-chain history"* ✅

---

*Shadow the smart money. Ride the tide.* 🌊