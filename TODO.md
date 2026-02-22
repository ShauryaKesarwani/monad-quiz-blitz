# Category Bomb Arena — TODO

---

## Project Overview

Category Bomb Arena is a fast-paced, elimination-style word game built for Farcaster.
Players submit valid answers within a category while a ticking bomb timer accelerates.
Onchain mechanics on Monad Testnet handle prediction staking and reward distribution.

**Stack:**
- Frontend: Next.js (App Router), Farcaster Frame — handled separately
- Backend: Bun + Hono, server-authoritative real-time multiplayer — handled separately
- Smart Contracts: Solidity on Monad Testnet (EVM-compatible)
- Web3 Client: wagmi + viem
- Database: MonadDB — offchain match storage + leaderboard indexing

---

## Current Architecture Summary

```
Category Bomb Arena
├── Frontend (Next.js App Router)     — not this responsibility
├── Backend (Bun + Hono, WebSocket)   — not this responsibility
│   └── writes match result to MonadDB after game ends
│   └── calls resolveGame() on PredictionPool after MonadDB write
├── MonadDB                            — offchain match + leaderboard store
│   ├── matches collection             — full match record per game
│   └── leaderboard collection         — indexed win/loss/streak/elim data
└── Web3 Layer (this scope)
    ├── contracts/
    │   ├── PredictionPool.sol         — core MVP contract
    │   └── GameRegistry.sol           — optional MVP contract
    ├── src/lib/wagmi/
    │   ├── config.ts                  — Monad Testnet chain config
    │   └── hooks/
    │       ├── usePrediction.ts
    │       ├── useClaimReward.ts
    │       ├── useGameResult.ts
    │       └── useLeaderboard.ts      — reads from MonadDB via backend API
    └── src/lib/abi/
        └── PredictionPool.json
```

---

## Site Structure (App Routes)

| Route | Description |
|---|---|
| `/` | Landing / lobby |
| `/game/[id]` | Active game room |
| `/predict/[id]` | Pre-game prediction phase |
| `/leaderboard` | Global leaderboard |
| `/profile/[fid]` | Player stats |

---

## Smart Contract Design

### PredictionPool.sol (MVP — Core Contract)

Handles pre-match prediction staking and reward distribution.

**State:**
```solidity
struct Prediction {
    address player;
    address predictedWinner;
    address predictedFirstElim;
    uint256 stakeAmount;
    bool claimed;
}

mapping(bytes32 => Prediction[]) public predictions;    // gameId => predictions
mapping(bytes32 => GameResult) public results;          // gameId => result
mapping(bytes32 => bool) public gameResolved;
```

**Key functions:**
```
predict(gameId, predictedWinner, predictedFirstElim)   payable — player places prediction
resolveGame(gameId, winner, firstElim)                 onlyAuthorizedServer — called when game ends
claimReward(gameId)                                    — player claims their share after resolution
getGamePredictions(gameId)                             view — read all predictions for a game
```

**Scoring logic:**
- Correct winner prediction: 3 points weight toward reward share
- Correct first-elimination prediction: 2 points weight
- Incorrect: 0 (stake goes to pool, rewards winners proportionally)

**Events:**
```
PredictionPlaced(bytes32 indexed gameId, address indexed player, uint256 stake)
GameResolved(bytes32 indexed gameId, address winner, address firstElim)
RewardClaimed(bytes32 indexed gameId, address indexed player, uint256 amount)
```

**Access control:**
- `resolveGame` restricted to an authorized backend address (set at deploy)
- Owner can update authorized resolver address

---

### GameRegistry.sol (Optional MVP)

Registers game sessions onchain for auditability.

**Key functions:**
```
createGame(bytes32 gameId, address[] players)   onlyAuthorizedServer
getGame(bytes32 gameId)                         view
```

---

## MonadDB Integration Design

### Model 1 — Onchain Prediction + Offchain Match Resolution (Hybrid)

This is the primary architecture model for Category Bomb Arena.

**Problem:** Predictions are onchain but game logic runs in real-time — writing every turn onchain is too slow and expensive.

**Solution — what gets written to MonadDB after each match:**

| Field | Type | Notes |
|---|---|---|
| `matchId` | string | UUID from game server |
| `participants` | address[] | all player wallet addresses |
| `winner` | address | last player standing |
| `firstEliminated` | address | first player eliminated |
| `categorySequence` | string[] | categories used in order |
| `roundCount` | number | total rounds played |
| `timestamp` | number | unix epoch |
| `blitzEventsCount` | number | how many blitz events fired |

**Flow:**

```
Game ends (backend)
  → Backend writes full match record to MonadDB
  → Backend calls resolveGame(matchId, winner, firstElim) on PredictionPool
  → Smart contract settles prediction rewards
  → Frontend queries MonadDB via GET /matches/:id for match replay/display
  → Frontend calls claimReward() via wagmi hook
```

**Why this model:**
- Smart contract only stores minimal prediction state — stays cheap
- Full match history lives in MonadDB — fast to query
- No heavy RPC log parsing needed on frontend
- Single source of truth for match data

---

### Model 2 — Global Leaderboard Indexing via MonadDB

Instead of querying smart contract events repeatedly or parsing logs on the frontend, the backend indexes all game outcomes into MonadDB.

**Leaderboard record per player:**

| Field | Type |
|---|---|
| `address` | string |
| `wins` | number |
| `losses` | number |
| `totalEliminations` | number |
| `currentStreak` | number |
| `bestStreak` | number |
| `predictionAccuracy` | float |
| `totalStaked` | bigint (wei) |
| `totalEarned` | bigint (wei) |

**Backend updates leaderboard record after every match resolution.**

**Frontend consumes:**
```
GET /leaderboard              — top N players sorted by wins
GET /leaderboard/:address     — individual player stats
```

No RPC calls needed for leaderboard rendering. Next.js page hits backend API, backend reads MonadDB.

---

## Active Tasks

### Web3 — Smart Contracts

- [ ] Initialize Foundry project under `/contracts`
- [ ] Write `PredictionPool.sol` with full logic
- [ ] Write `GameRegistry.sol` (optional — if time allows)
- [ ] Write unit tests for `PredictionPool.sol` (prediction, resolve, claim)
- [ ] Write edge case tests (no correct predictions, single player, duplicate claim)
- [ ] Deploy `PredictionPool.sol` to Monad Testnet
- [ ] Verify contract on Monad Testnet block explorer
- [ ] Document deployed contract addresses in `contracts/deployments.json`

### Web3 — wagmi + viem Integration

- [ ] Add wagmi + viem to project (`bun add wagmi viem @tanstack/react-query`)
- [ ] Create `src/lib/wagmi/config.ts` with Monad Testnet chain definition
- [ ] Wrap app in `WagmiProvider` and `QueryClientProvider` in `app/layout.tsx`
- [ ] Export PredictionPool ABI to `src/lib/abi/PredictionPool.json`
- [ ] Write `usePrediction` hook — calls `predict()` on contract
- [ ] Write `useClaimReward` hook — calls `claimReward()` after game resolves
- [ ] Write `useGameResult` hook — reads resolved game state for UI display
- [ ] Write `usePlayerPredictions` hook — reads a player's predictions for a game
- [ ] Handle transaction pending / confirmed / failed states in hooks
- [ ] Test all hooks against deployed testnet contract

### Web3 — Backend Server Integration

- [ ] Expose backend private key / relayer address for `resolveGame` calls
- [ ] Backend calls `resolveGame(gameId, winner, firstElim)` on game end via viem `walletClient`
- [ ] Backend reads prediction pool balance before game to display in lobby
- [ ] Coordinate `gameId` format between backend (string/UUID) and contract (bytes32 hash)

### MonadDB — Backend Integration (coordinate with backend dev)

- [ ] Confirm MonadDB SDK/client being used in Bun + Hono backend
- [ ] Define `matches` collection schema and share with backend dev
- [ ] Define `leaderboard` collection schema and share with backend dev
- [ ] Backend writes match record to MonadDB on game end (before `resolveGame` call)
- [ ] Backend upserts leaderboard record per player after every match
- [ ] Backend exposes `GET /matches/:id` — returns full match record from MonadDB
- [ ] Backend exposes `GET /leaderboard` — returns sorted leaderboard from MonadDB
- [ ] Backend exposes `GET /leaderboard/:address` — returns individual player stats
- [ ] Confirm `matchId` / `gameId` format is consistent: backend UUID → `keccak256` for contract bytes32
- [ ] Test MonadDB read latency under match-end load

### Web3 — Wallet UX (Frontend Handoff)

- [ ] Provide `ConnectButton` component (wagmi `useConnect` / RainbowKit or custom) for frontend to place in layout
- [ ] Ensure prediction UI is gated: user must be connected to submit prediction
- [ ] Show transaction hash + Monad explorer link after prediction placed
- [ ] Show claimable reward amount on game results screen

---

## MVP Scope

| Feature | Status |
|---|---|
| `PredictionPool.sol` deployed on Monad Testnet | Not started |
| wagmi configured for Monad Testnet | Not started |
| Prediction placement (onchain) | Not started |
| Game resolution triggered by backend | Not started |
| Reward claim after resolution | Not started |
| Wallet connect flow | Not started |
| `GameRegistry.sol` | Not started |
| MonadDB match record written after game end | Not started |
| MonadDB leaderboard indexing per player | Not started |
| `GET /leaderboard` served from MonadDB | Not started |
| `GET /matches/:id` served from MonadDB | Not started |

---

## Completed Tasks

*(none yet — project initialized)*

---

## Known Technical Debt

- `resolveGame` currently relies on a trusted backend address — consider an onchain oracle or signed proof from game server for production
- No dispute mechanism if backend fails to call `resolveGame` — MonadDB record exists but contract is never settled
- If MonadDB write succeeds but `resolveGame` tx fails, predictions are stuck — backend needs retry logic with idempotency check
- Prediction rewards are proportional to stake weight — formula needs final balance review before mainnet
- Leaderboard data in MonadDB is backend-authoritative — no onchain verification of win/loss counts in MVP

---

## Future Scope (Post-Hackathon)

- Native MON token staking with lockup period
- ERC20 reward token for long-term player incentive
- Power-up NFTs (skip turn, force category change)
- Onchain leaderboard with NFT badges for top players
- Farcaster frame — embed game directly in a cast
- Cross-game tournament bracket contract

---

## Next Milestone

**Hackathon MVP delivery:**

1. `PredictionPool.sol` deployed and verified on Monad Testnet
2. wagmi hooks wired and tested
3. Backend writes match record to MonadDB on game end
4. Backend calls `resolveGame` on contract after MonadDB write confirms
5. `GET /leaderboard` and `GET /matches/:id` reading from MonadDB
6. Frontend team can place `ConnectButton`, call `usePrediction`, and call `useClaimReward`
7. Leaderboard page hits `/leaderboard` API — zero RPC calls required
