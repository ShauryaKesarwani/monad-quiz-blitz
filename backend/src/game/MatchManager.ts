import { nanoid } from 'nanoid';
import type {
  MatchState,
  Player,
  GamePhase,
  GameConfig,
  Category,
  Prediction,
  Answer,
  GameConstraints,
  WSEvent,
  PredictionScore
} from '../../../shared/types/game';
import { TurnEngine } from './TurnEngine';
import { Validator } from './Validator';
import { Elimination } from './Elimination';
import { matchStore } from '../state/matches';

export interface MatchEventCallback {
  (event: WSEvent, payload: any): void;
}

export class MatchManager {
  private match: MatchState;
  private turnEngine: TurnEngine;
  private validator: Validator;
  private config: GameConfig;
  private eventCallback?: MatchEventCallback;
  private turnTimer?: Timer;
  private predictionTimer?: Timer;
  private blitzModeCount: number = 0;

  constructor(config: GameConfig, eventCallback?: MatchEventCallback) {
    this.config = config;
    this.eventCallback = eventCallback;
    
    this.turnEngine = new TurnEngine(config.timerConfig);
    this.validator = new Validator();

    // Initialize match state
    const initialCategory = this.turnEngine.getRandomCategory();
    
    this.match = {
      id: nanoid(),
      players: [],
      phase: 'PREDICTION' as GamePhase,
      currentCategory: initialCategory,
      currentPlayerId: '',
      currentTurnTimer: config.predictionDuration,
      usedAnswers: [],
      constraints: {
        bannedLetters: [],
      },
      roundNumber: 0,
      predictions: [],
      eliminationOrder: [],
      createdAt: Date.now()
    };

    matchStore.createMatch(this.match);
  }

  /**
   * Add a player to the match
   */
  addPlayer(player: Omit<Player, 'status'>): boolean {
    if (this.match.players.length >= this.config.maxPlayers) {
      return false;
    }

    if (this.match.phase !== 'PREDICTION') {
      return false;
    }

    const newPlayer: Player = {
      ...player,
      status: 'ALIVE'
    };

    this.match.players.push(newPlayer);
    this.updateMatch();
    this.emit('PLAYER_JOINED', { player: newPlayer });

    // Start prediction phase if we have enough players
    if (this.match.players.length >= this.config.minPlayers) {
      this.startPredictionPhase();
    }

    return true;
  }

  /**
   * Start the prediction phase
   */
  private startPredictionPhase(): void {
    this.emit('PREDICTION_PHASE_STARTED', {
      duration: this.config.predictionDuration
    });

    // Auto-start game after prediction duration
    this.predictionTimer = setTimeout(() => {
      this.startGame();
    }, this.config.predictionDuration);
  }

  /**
   * Submit a prediction
   */
  submitPrediction(prediction: Prediction): boolean {
    if (this.match.phase !== 'PREDICTION') {
      return false;
    }

    // Remove existing prediction from this player
    this.match.predictions = this.match.predictions.filter(
      p => p.playerId !== prediction.playerId
    );

    this.match.predictions.push(prediction);
    this.updateMatch();

    return true;
  }

  /**
   * Start the actual game
   */
  private startGame(): void {
    if (this.match.players.length < this.config.minPlayers) {
      return;
    }

    this.match.phase = 'NORMAL' as GamePhase;
    this.match.roundNumber = 1;
    this.match.startedAt = Date.now();
    
    // Set first player randomly
    const randomIndex = Math.floor(Math.random() * this.match.players.length);
    this.match.currentPlayerId = this.match.players[randomIndex].id;

    this.updateMatch();
    this.emit('GAME_STARTED', { match: this.match });

    this.startTurn();
  }

  /**
   * Start a new turn
   */
  private startTurn(): void {
    const isBlitzMode = this.match.phase === 'BLITZ';
    const timer = this.turnEngine.calculateTimer(this.match.roundNumber, isBlitzMode);
    
    this.match.currentTurnTimer = timer;
    this.updateMatch();

    this.emit('TURN_STARTED', {
      playerId: this.match.currentPlayerId,
      timer,
      category: this.match.currentCategory,
      constraints: this.match.constraints
    });

    // Set timeout for turn
    this.turnTimer = setTimeout(() => {
      this.handleTurnTimeout();
    }, timer * 1000);
  }

  /**
   * Handle turn timeout (player eliminated)
   */
  private handleTurnTimeout(): void {
    const currentPlayer = this.match.players.find(
      p => p.id === this.match.currentPlayerId
    );

    if (!currentPlayer) return;

    this.eliminatePlayer(currentPlayer.id, 'Time expired');
  }

  /**
   * Submit an answer
   */
  submitAnswer(playerId: string, answer: string): { success: boolean; reason?: string } {
    // Verify it's the correct player's turn
    if (playerId !== this.match.currentPlayerId) {
      return { success: false, reason: 'Not your turn' };
    }

    // Clear turn timer
    if (this.turnTimer) {
      clearTimeout(this.turnTimer);
    }

    // Validate answer
    const validation = this.validator.validateAnswer(
      answer,
      this.match.currentCategory,
      this.match.constraints
    );

    if (!validation.isValid) {
      // Invalid answer = elimination
      this.eliminatePlayer(playerId, validation.reason || 'Invalid answer');
      return { success: false, reason: validation.reason };
    }

    // Valid answer
    this.validator.markAnswerUsed(answer);
    this.match.usedAnswers.push(answer);
    this.updateMatch();

    this.emit('ANSWER_SUBMITTED', {
      playerId,
      answer,
      isValid: true
    });

    // Move to next player
    this.nextTurn();

    return { success: true };
  }

  /**
   * Eliminate a player
   */
  private eliminatePlayer(playerId: string, reason: string): void {
    const playerIndex = this.match.players.findIndex(p => p.id === playerId);
    if (playerIndex === -1) return;

    const player = this.match.players[playerIndex];
    this.match.players[playerIndex] = Elimination.eliminatePlayer(player, Date.now());
    this.match.eliminationOrder.push(playerId);

    this.emit('PLAYER_ELIMINATED', {
      playerId,
      reason
    });

    // Switch category on elimination
    const newCategory = this.turnEngine.switchCategory();
    this.match.currentCategory = newCategory;
    this.emit('CATEGORY_CHANGED', { category: newCategory });

    // Check if we should add banned letter
    if (Elimination.shouldActivateBannedLetter(
      this.match.players,
      this.config.bannedLetterThreshold,
      this.match.constraints.bannedLetters
    )) {
      const bannedLetter = this.turnEngine.getRandomBannedLetter(
        this.match.constraints.bannedLetters
      );
      this.match.constraints.bannedLetters.push(bannedLetter);
      this.emit('BANNED_LETTER_ADDED', { letter: bannedLetter });
    }

    // Check for winner
    const winner = Elimination.checkWinner(this.match.players);
    if (winner) {
      this.endGame(winner);
      return;
    }

    // Continue to next turn
    this.nextTurn();
  }

  /**
   * Move to next turn
   */
  private nextTurn(): void {
    // Determine if blitz mode should activate
    if (this.match.phase === 'ACCELERATION' && 
        this.turnEngine.shouldActivateBlitz(this.config.blitzProbability)) {
      
      this.match.phase = 'BLITZ' as GamePhase;
      this.blitzModeCount = 3; // 3 turns of blitz
      this.emit('BLITZ_MODE_ACTIVATED', {});
    }

    // Deactivate blitz mode after countdown
    if (this.match.phase === 'BLITZ') {
      this.blitzModeCount--;
      if (this.blitzModeCount <= 0) {
        this.match.phase = 'ACCELERATION' as GamePhase;
        this.emit('BLITZ_MODE_DEACTIVATED', {});
      }
    }

    // Get next player
    const nextPlayer = Elimination.getNextPlayer(
      this.match.players,
      this.match.currentPlayerId
    );

    if (!nextPlayer) {
      return;
    }

    this.match.currentPlayerId = nextPlayer.id;

    // Check if we should advance round (all players have had a turn)
    const alivePlayers = Elimination.getAlivePlayers(this.match.players);
    if (alivePlayers[0].id === this.match.currentPlayerId) {
      this.match.roundNumber++;
      
      // Update phase
      this.match.phase = this.turnEngine.determineNextPhase(
        this.match.phase,
        this.match.roundNumber,
        alivePlayers.length
      ) as GamePhase;
    }

    this.updateMatch();
    this.startTurn();
  }

  /**
   * End the game
   */
  private endGame(winner: Player): void {
    this.match.phase = 'ENDED' as GamePhase;
    this.match.endedAt = Date.now();
    
    // Mark winner
    const winnerIndex = this.match.players.findIndex(p => p.id === winner.id);
    if (winnerIndex !== -1) {
      this.match.players[winnerIndex] = Elimination.markWinner(winner);
    }

    // Calculate prediction scores
    const scores = Elimination.calculatePredictionScores(
      this.match.predictions,
      this.match.eliminationOrder,
      winner.id
    );

    this.updateMatch();

    this.emit('GAME_ENDED', {
      winner,
      eliminationOrder: this.match.eliminationOrder,
      predictionScores: scores,
      match: this.match
    });
  }

  /**
   * Get current match state
   */
  getMatch(): MatchState {
    return this.match;
  }

  /**
   * Update match in store
   */
  private updateMatch(): void {
    matchStore.updateMatch(this.match.id, this.match);
    this.emit('MATCH_UPDATED', { match: this.match });
  }

  /**
   * Emit event to callback
   */
  private emit(event: WSEvent, payload: any): void {
    if (this.eventCallback) {
      this.eventCallback(event, payload);
    }
  }

  /**
   * Cleanup timers
   */
  cleanup(): void {
    if (this.turnTimer) {
      clearTimeout(this.turnTimer);
    }
    if (this.predictionTimer) {
      clearTimeout(this.predictionTimer);
    }
  }
}
