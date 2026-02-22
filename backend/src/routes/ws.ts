import type { ServerWebSocket } from "bun";
import { WSEvent } from "../../../shared/types/game";
import type { WSMessage, Player, Prediction } from "../../../shared/types/game";
import { MatchManager } from "../game/MatchManager";
import { matchStore } from "../state/matches";

// Game configuration
const GAME_CONFIG = {
  maxPlayers: 8,
  minPlayers: 2,
  predictionDuration: 30000, // 30 seconds
  timerConfig: {
    initialTime: 10,
    decrementPerRound: 0.5,
    blitzTime: 3,
    minimumTime: 3,
  },
  bannedLetterThreshold: 50, // 50% players remaining
  blitzProbability: 0.15, // 15% chance per turn
};

// Store active matches and their managers
const activeMatches = new Map<string, MatchManager>();

// Store WebSocket connections by match
const matchConnections = new Map<string, Set<ServerWebSocket>>();

/**
 * Broadcast message to all clients in a match
 */
function broadcastToMatch(matchId: string, event: WSEvent, payload: any) {
  const connections = matchConnections.get(matchId);
  if (!connections) return;

  const message: WSMessage = { event, payload };
  const messageStr = JSON.stringify(message);

  for (const ws of connections) {
    ws.send(messageStr);
  }
}

/**
 * Send message to specific client
 */
function sendToClient(ws: ServerWebSocket, event: WSEvent, payload: any) {
  const message: WSMessage = { event, payload };
  ws.send(JSON.stringify(message));
}

/**
 * Handle WebSocket message
 */
export function handleWSMessage(ws: ServerWebSocket, message: string) {
  try {
    const data: WSMessage = JSON.parse(message);
    const { event, payload } = data;

    switch (event) {
      case WSEvent.JOIN_MATCH:
        handleJoinMatch(ws, payload);
        break;

      case WSEvent.SUBMIT_PREDICTION:
        handleSubmitPrediction(ws, payload);
        break;

      case WSEvent.SUBMIT_ANSWER:
        handleSubmitAnswer(ws, payload);
        break;

      default:
        sendToClient(ws, WSEvent.ERROR, { message: "Unknown event type" });
    }
  } catch (error) {
    console.error("Error handling WebSocket message:", error);
    sendToClient(ws, WSEvent.ERROR, { message: "Invalid message format" });
  }
}

/**
 * Handle player joining a match
 */
function handleJoinMatch(ws: ServerWebSocket, payload: any) {
  const { matchId, player } = payload;

  // Get or create match
  let matchManager = activeMatches.get(matchId);

  if (!matchManager) {
    // Create new match
    matchManager = new MatchManager(matchId, GAME_CONFIG, (event, eventPayload) => {
      broadcastToMatch(matchId, event, eventPayload);
    });
    activeMatches.set(matchId, matchManager);
    matchConnections.set(matchId, new Set());
  }

  // Add player to match
  const playerData: Omit<Player, "status"> = {
    id: player.id,
    address: player.address,
    username: player.username,
  };

  const success = matchManager.addPlayer(playerData);

  if (!success) {
    sendToClient(ws, WSEvent.ERROR, {
      message: "Cannot join match (full or already started)",
    });
    return;
  }

  // Add WebSocket connection to match
  matchConnections.get(matchId)?.add(ws);
  (ws as any).matchId = matchId; // Store matchId in WebSocket for cleanup

  // Send current match state to player
  sendToClient(ws, WSEvent.MATCH_UPDATED, { match: matchManager.getMatch() });
}

/**
 * Handle prediction submission
 */
function handleSubmitPrediction(ws: ServerWebSocket, payload: any) {
  const { matchId, prediction } = payload;

  const matchManager = activeMatches.get(matchId);
  if (!matchManager) {
    sendToClient(ws, WSEvent.ERROR, { message: "Match not found" });
    return;
  }

  const predictionData: Prediction = {
    playerId: prediction.playerId,
    predictedWinner: prediction.predictedWinner,
    predictedFirstElimination: prediction.predictedFirstElimination,
  };

  const success = matchManager.submitPrediction(predictionData);

  if (!success) {
    sendToClient(ws, WSEvent.ERROR, { message: "Cannot submit prediction" });
    return;
  }

  // Confirmation sent via MATCH_UPDATED event
}

/**
 * Handle answer submission
 */
function handleSubmitAnswer(ws: ServerWebSocket, payload: any) {
  const { matchId, playerId, answer } = payload;

  const matchManager = activeMatches.get(matchId);
  if (!matchManager) {
    sendToClient(ws, WSEvent.ERROR, { message: "Match not found" });
    return;
  }

  const result = matchManager.submitAnswer(playerId, answer);

  if (!result.success) {
    sendToClient(ws, WSEvent.ERROR, {
      message: result.reason || "Invalid answer",
    });
  }

  // State updates sent via events from MatchManager
}

/**
 * Handle WebSocket close
 */
export function handleWSClose(ws: ServerWebSocket) {
  const matchId = (ws as any).matchId;
  if (!matchId) return;

  const connections = matchConnections.get(matchId);
  if (connections) {
    connections.delete(ws);

    // Clean up empty matches
    if (connections.size === 0) {
      const matchManager = activeMatches.get(matchId);
      if (matchManager) {
        matchManager.cleanup();
      }
      activeMatches.delete(matchId);
      matchConnections.delete(matchId);
      matchStore.deleteMatch(matchId);
    }
  }
}

/**
 * Handle WebSocket error
 */
export function handleWSError(ws: ServerWebSocket, error: Error) {
  console.error("WebSocket error:", error);
}
