# Backend API Documentation for Frontend Team

**Server:** `http://localhost:3001`  
**WebSocket:** `ws://localhost:3001/ws`  
**Types:** All TypeScript types available in `../shared/types/game.ts`

---

## Development Setup

```bash
cd backend
bun install
bun run dev
```

---

## HTTP REST API

### `GET /health`
Server health check.

**Response:**
```json
{ "status": "ok", "timestamp": 1708600000000 }
```

### `POST /api/matches`
Create a new match and get match ID.

**Response:**
```json
{ "matchId": "x9k2m5n8p1" }
```

### `GET /api/matches`
Get all active matches.

**Response:**
```json
{ "matches": [ { "id": "abc123", "players": [...], ... } ] }
```

### `GET /api/matches/:id`
Get specific match details.

**Response:** Full `MatchState` object  
**Error (404):** `{ "error": "Match not found" }`

---

## WebSocket API

### Message Format
All WebSocket messages use this structure:
```typescript
{ "event": "EVENT_NAME", "payload": { ... } }
```

### Connect to WebSocket
```javascript
const ws = new WebSocket('ws://localhost:3001/ws');
ws.onmessage = (event) => {
  const { event, payload } = JSON.parse(event.data);
  // Handle events
};
```

---

## Client → Server Events

### `JOIN_MATCH`
Join or create a match.

```json
{
  "event": "JOIN_MATCH",
  "payload": {
    "matchId": "abc123",
    "player": {
      "id": "player1",
      "address": "0x1234...",
      "username": "Alice"
    }
  }
}
```

### `SUBMIT_PREDICTION`
Submit pre-game predictions (30s window).

```json
{
  "event": "SUBMIT_PREDICTION",
  "payload": {
    "matchId": "abc123",
    "prediction": {
      "playerId": "player1",
      "predictedWinner": "player2",
      "predictedFirstElimination": "player3"
    }
  }
}
```

### `SUBMIT_ANSWER`
Submit answer during your turn.

```json
{
  "event": "SUBMIT_ANSWER",
  "payload": {
    "matchId": "abc123",
    "playerId": "player1",
    "answer": "Ethereum"
  }
}
```

---

## Server → Client Events

### `MATCH_UPDATED`
Match state changed. Contains full `MatchState` object.

### `PLAYER_JOINED`
```json
{ "player": { "id": "player2", "username": "Bob", "status": "ALIVE" } }
```

### `PREDICTION_PHASE_STARTED`
```json
{ "duration": 30000 }
```

### `GAME_STARTED`
Game begins. Contains initial `MatchState`.

### `TURN_STARTED`
```json
{
  "playerId": "player1",
  "timer": 8,
  "category": { "name": "Crypto Tokens", ... },
  "constraints": { "bannedLetters": ["E"] }
}
```

### `ANSWER_SUBMITTED`
```json
{ "playerId": "player1", "answer": "Bitcoin", "isValid": true }
```

### `PLAYER_ELIMINATED`
```json
{ "playerId": "player1", "reason": "Time expired" }
```

**Reasons:**
- `"Time expired"`
- `"This answer has already been used"`
- `"Answer cannot contain the banned letter: X"`
- `"Invalid answer"`

### `CATEGORY_CHANGED`
```json
{ "category": { "id": "countries", "name": "Countries", ... } }
```

### `BANNED_LETTER_ADDED`
```json
{ "letter": "E" }
```

### `BLITZ_MODE_ACTIVATED` / `BLITZ_MODE_DEACTIVATED`
```json
{}
```
*Timer drops to 3s for 3 turns*

### `GAME_ENDED`
```json
{
  "winner": { "id": "player1", "username": "Alice", "status": "WINNER" },
  "eliminationOrder": ["player3", "player2"],
  "predictionScores": [
    { "playerId": "player1", "totalScore": 1 }
  ]
}
```

### `ERROR`
```json
{ "message": "Not your turn" }
```

---

## Game Flow

1. **Create Match:** `POST /api/matches` → get `matchId`
2. **Connect WebSocket:** `ws://localhost:3001/ws`
3. **Join Match:** Send `JOIN_MATCH` event
4. **Prediction Phase:** 30s to submit predictions (starts when 2+ players join)
5. **Game Starts:** Listen for `GAME_STARTED`
6. **Gameplay:** Listen for `TURN_STARTED`, submit answers with `SUBMIT_ANSWER`
7. **Game Ends:** Listen for `GAME_ENDED`

---

## Key Game Rules

- **Max Players:** 8
- **Min Players:** 2
- **Initial Timer:** 10s (decreases by 0.5s each round)
- **Blitz Mode:** 3s timer, 15% chance per turn, lasts 3 turns
- **Banned Letters:** Activated when 50% players remain
- **Prediction Scoring:** +3 correct winner, +2 correct first elimination, -1 wrong

---

## Game Phases

| Phase | Description |
|-------|-------------|
| `PREDICTION` | Lobby - players join & predict |
| `NORMAL` | Standard gameplay |
| `ACCELERATION` | Timer decreases |
| `BLITZ` | Ultra-fast 3s rounds |
| `ENDED` | Game complete |

---

## Testing with wscat

```bash
npm install -g wscat
wscat -c ws://localhost:3001/ws

# Send message:
{"event":"JOIN_MATCH","payload":{"matchId":"test123","player":{"id":"p1","address":"0x123","username":"Alice"}}}
```

---

## Important Notes

- All types are in `../shared/types/game.ts` - import and use them
- WebSocket connection is maintained per client - no reconnection logic implemented yet
- Match state is in-memory - will reset on server restart
- No authentication/authorization implemented - add in production
