# Backend (Frontend Integration)

**Base URL:** `http://localhost:3001`  
**WebSocket:** `ws://localhost:3001/ws`  
**Shared types:** `shared/types/game.ts`

## Quick start (local)

```bash
cd backend
bun install
bun run dev
```

Backend runs on port **3001**. CORS is enabled for common local dev origins (Next.js/Vite).

## REST

- `GET /health` → `{ status: 'ok', timestamp: number }`
- `POST /api/matches` → `{ matchId: string }` (creates a new match)
- `GET /api/matches` → `{ matches: MatchState[] }` (active matches)
- `GET /api/matches/:id` → `{ match: MatchState }` (404: `{ error: string }`)

## WebSocket protocol

All WS messages are JSON:

```ts
type WSMessage = {
  event: WSEvent;
  payload: unknown;
};
```

Frontend should treat `MATCH_UPDATED` as the **source of truth** for UI state (other events are useful for toasts/FX but are redundant).

### Client → Server events

#### `JOIN_MATCH`

```ts
{
  matchId: string;
  player: {
    id: string;
    address: string;
    username: string;
  }
}
```

Notes:

- Max players: **8**
- Join is expected while the match is still in the lobby/prediction stage.

#### `SUBMIT_PREDICTION`

```ts
{
  matchId: string;
  prediction: {
    playerId: string;
    predictedWinner: string;
    predictedFirstElimination: string;
  }
}
```

Only valid during prediction window (see game flow).

#### `SUBMIT_ANSWER`

```ts
{
  matchId: string;
  playerId: string;
  answer: string;
}
```

Only valid for the current player’s turn.

### Server → Client events

#### `MATCH_UPDATED`

```ts
{
  match: MatchState;
}
```

Sent after any state change (join, prediction, turn, elimination, etc.).

Other events you may want for UX:

- `PLAYER_JOINED` → `{ player: Player }`
- `PREDICTION_PHASE_STARTED` → `{ duration: number }` (ms)
- `GAME_STARTED` → `{ firstPlayerId: string; category: Category; turnTimer: number }`
- `TURN_STARTED` → `{ playerId: string; category: Category; timer: number; constraints: GameConstraints }`
- `ANSWER_SUBMITTED` → `{ playerId: string; answer: string; isValid: boolean; submittedAt: number }`
- `PLAYER_ELIMINATED` → `{ playerId: string; reason: 'timeout' | 'invalid_answer' | 'duplicate'; eliminatedAt: number }`
- `CATEGORY_CHANGED` → `{ category: Category }`
- `BANNED_LETTER_ADDED` → `{ letter: string; allBannedLetters: string[] }`
- `BLITZ_MODE_ACTIVATED` → `{ duration: number }` (ms)
- `BLITZ_MODE_DEACTIVATED` → `{ normalTimer: number }`
- `GAME_ENDED` → `{ winner: Player; eliminationOrder: string[]; predictionScores: PredictionScore[]; finalMatch: MatchState }`
- `ERROR` → `{ message: string }`

## Game flow (UI-relevant)

`match.phase` is one of: `PREDICTION`, `NORMAL`, `ACCELERATION`, `BLITZ`, `ENDED`.

- **PREDICTION**: lobby + predictions; lasts **30s**.
- **NORMAL / ACCELERATION / BLITZ**: active gameplay (turn-based answering). You can generally render these the same screen and just react to timer/constraints/blitz indicators.
- **ENDED**: winner decided.

Timers / pressure:

- Turn timer starts at **10s**, decreases by **0.5s per round**, minimum **3s**.
- Category changes **every 3 rounds**.
- “Blitz mode” can trigger (about **15%** chance per turn): timer becomes **3s** for that moment.
- When about **50%+** of players have been eliminated, the server may add a new banned starting letter (`BANNED_LETTER_ADDED`).

## Types

See `shared/types/game.ts` for:

- `MatchState`, `Player`, `Category`, `GameConstraints`, `PredictionScore`
- `WSEvent` / `WSMessage`

## Practical frontend checklist

- Create match with `POST /api/matches`, then open WS and send `JOIN_MATCH`.
- Always apply `MATCH_UPDATED` to your store; derive screens from `match.phase` and `match.currentPlayerId`.
- Show prediction UI only during prediction; enable answer input only for the current turn player.
- Display timers/constraints/banned letters from the match state.
