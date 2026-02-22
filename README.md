# Category Bomb Arena (Monad Stake Study)

Fast-paced, elimination-style multiplayer word game with a prediction-staking layer.

This repo is a small monorepo:

- **Frontend**: Next.js App Router UI
- **Backend**: Bun + Hono HTTP + WebSocket server (server-authoritative match state)
- **Contracts**: Solidity prediction contract(s)
- **Shared**: TypeScript types shared by frontend + backend

## Description

Category Bomb Arena is a real-time, turn-based elimination word game: players join a match, make quick predictions before the round starts, then take turns submitting valid answers for the current category under a shrinking timer. The backend is the source of truth for match state (REST + WebSocket), the frontend renders the live state, and Solidity contracts provide a path to prediction staking / rewards.

## Features

- Real-time matches over WebSockets (server-authoritative state)
- Lobby + prediction window (predict winner + first elimination)
- Turn-based category answering with timers + validation
- Multiple match phases: `PREDICTION`, `NORMAL`, `ACCELERATION`, `BLITZ`, `ENDED`
- Shared TypeScript types across frontend/backend
- Solidity contract(s) in `contracts/` + frontend contract config

## Repo structure

```text
frontend/   Next.js app (UI)
backend/    Bun server (REST + WS)
contracts/  Solidity contracts
shared/     Shared TS types used across apps
```

## Prerequisites

- Node.js (for Next.js tooling)
- Bun (for the backend; also works for the frontend if you prefer)

## Local development

### 1) Backend (port 3001)

```bash
cd backend
bun install
bun run dev
```

- Health check: http://localhost:3001/health
- WebSocket: ws://localhost:3001/ws

### 2) Frontend (port 3000)

```bash
cd frontend
bun install
bun run dev
```

Open http://localhost:3000

## Root scripts

From the repo root:

```bash
npm run dev:backend
npm run dev:frontend
```

## Smart contracts

- Solidity sources live in `contracts/`
- The frontend contract address is configured in `frontend/lib/contracts.ts`

## Docs / references

- Game design notes: `GAME_IDEA.md`
- Backend API + WS protocol: `BACKEND_SUMMARY.md` (and `backend/README.md`)
