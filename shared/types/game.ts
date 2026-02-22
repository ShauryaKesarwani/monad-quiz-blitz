// Shared game types for Category Bomb Arena

export enum GamePhase {
  PREDICTION = 'PREDICTION',
  NORMAL = 'NORMAL',
  ACCELERATION = 'ACCELERATION',
  BLITZ = 'BLITZ',
  ENDED = 'ENDED'
}

export enum PlayerStatus {
  ALIVE = 'ALIVE',
  ELIMINATED = 'ELIMINATED',
  WINNER = 'WINNER'
}

export interface Player {
  id: string;
  address: string;
  username: string;
  status: PlayerStatus;
  eliminatedAt?: number;
}

export interface Prediction {
  playerId: string;
  predictedWinner: string;
  predictedFirstElimination: string;
}

export interface Answer {
  playerId: string;
  answer: string;
  submittedAt: number;
  isValid: boolean;
}

export interface Category {
  id: string;
  name: string;
  description: string;
  examples: string[];
}

export interface GameConstraints {
  bannedLetters: string[];
  maxAnswerLength?: number;
  minAnswerLength?: number;
}

export interface MatchState {
  id: string;
  players: Player[];
  phase: GamePhase;
  currentCategory: Category;
  currentPlayerId: string;
  currentTurnTimer: number;
  usedAnswers: string[];
  constraints: GameConstraints;
  roundNumber: number;
  predictions: Prediction[];
  eliminationOrder: string[];
  createdAt: number;
  startedAt?: number;
  endedAt?: number;
}

export interface TimerConfig {
  initialTime: number;
  decrementPerRound: number;
  blitzTime: number;
  minimumTime: number;
}

export interface GameConfig {
  maxPlayers: number;
  minPlayers: number;
  predictionDuration: number;
  timerConfig: TimerConfig;
  bannedLetterThreshold: number; // percentage of players remaining
  blitzProbability: number;
}

// WebSocket Events
export enum WSEvent {
  // Client -> Server
  JOIN_MATCH = 'JOIN_MATCH',
  SUBMIT_PREDICTION = 'SUBMIT_PREDICTION',
  SUBMIT_ANSWER = 'SUBMIT_ANSWER',
  
  // Server -> Client
  MATCH_UPDATED = 'MATCH_UPDATED',
  PLAYER_JOINED = 'PLAYER_JOINED',
  PREDICTION_PHASE_STARTED = 'PREDICTION_PHASE_STARTED',
  GAME_STARTED = 'GAME_STARTED',
  TURN_STARTED = 'TURN_STARTED',
  ANSWER_SUBMITTED = 'ANSWER_SUBMITTED',
  PLAYER_ELIMINATED = 'PLAYER_ELIMINATED',
  CATEGORY_CHANGED = 'CATEGORY_CHANGED',
  BLITZ_MODE_ACTIVATED = 'BLITZ_MODE_ACTIVATED',
  BLITZ_MODE_DEACTIVATED = 'BLITZ_MODE_DEACTIVATED',
  BANNED_LETTER_ADDED = 'BANNED_LETTER_ADDED',
  GAME_ENDED = 'GAME_ENDED',
  ERROR = 'ERROR'
}

export interface WSMessage {
  event: WSEvent;
  payload: any;
}

// Prediction scoring
export interface PredictionScore {
  playerId: string;
  correctWinner: boolean;
  correctFirstElimination: boolean;
  totalScore: number;
}

export const PREDICTION_SCORING = {
  CORRECT_WINNER: 3,
  CORRECT_FIRST_ELIMINATION: 2,
  WRONG_PREDICTION: -1
} as const;
