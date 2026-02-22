import type { Player, PlayerStatus, PredictionScore, Prediction, PREDICTION_SCORING } from '../../../shared/types/game';

export class Elimination {
  /**
   * Eliminate a player from the match
   */
  static eliminatePlayer(player: Player, timestamp: number): Player {
    return {
      ...player,
      status: 'ELIMINATED' as PlayerStatus,
      eliminatedAt: timestamp
    };
  }

  /**
   * Get all alive players
   */
  static getAlivePlayers(players: Player[]): Player[] {
    return players.filter(p => p.status === 'ALIVE');
  }

  /**
   * Get eliminated players in order
   */
  static getEliminatedPlayers(players: Player[]): Player[] {
    return players
      .filter(p => p.status === 'ELIMINATED')
      .sort((a, b) => (a.eliminatedAt || 0) - (b.eliminatedAt || 0));
  }

  /**
   * Get the next player in turn order
   */
  static getNextPlayer(players: Player[], currentPlayerId: string): Player | null {
    const alivePlayers = this.getAlivePlayers(players);
    
    if (alivePlayers.length === 0) {
      return null;
    }

    if (alivePlayers.length === 1) {
      return alivePlayers[0];
    }

    const currentIndex = alivePlayers.findIndex(p => p.id === currentPlayerId);
    const nextIndex = (currentIndex + 1) % alivePlayers.length;
    
    return alivePlayers[nextIndex];
  }

  /**
   * Check if there's a winner (only one player left)
   */
  static checkWinner(players: Player[]): Player | null {
    const alivePlayers = this.getAlivePlayers(players);
    
    if (alivePlayers.length === 1) {
      return alivePlayers[0];
    }
    
    return null;
  }

  /**
   * Mark a player as winner
   */
  static markWinner(player: Player): Player {
    return {
      ...player,
      status: 'WINNER' as PlayerStatus
    };
  }

  /**
   * Calculate prediction scores
   */
  static calculatePredictionScores(
    predictions: Prediction[],
    eliminationOrder: string[],
    winnerId: string
  ): PredictionScore[] {
    const scores: PredictionScore[] = [];
    const firstEliminatedId = eliminationOrder[0];

    for (const prediction of predictions) {
      const correctWinner = prediction.predictedWinner === winnerId;
      const correctFirstElimination = prediction.predictedFirstElimination === firstEliminatedId;
      
      let totalScore = 0;
      
      if (correctWinner) {
        totalScore += 3; // PREDICTION_SCORING.CORRECT_WINNER
      } else {
        totalScore += -1; // PREDICTION_SCORING.WRONG_PREDICTION
      }
      
      if (correctFirstElimination) {
        totalScore += 2; // PREDICTION_SCORING.CORRECT_FIRST_ELIMINATION
      } else {
        totalScore += -1; // PREDICTION_SCORING.WRONG_PREDICTION
      }

      scores.push({
        playerId: prediction.playerId,
        correctWinner,
        correctFirstElimination,
        totalScore
      });
    }

    return scores;
  }

  /**
   * Get percentage of remaining players
   */
  static getRemainingPlayerPercentage(players: Player[]): number {
    const total = players.length;
    const alive = this.getAlivePlayers(players).length;
    
    return total > 0 ? (alive / total) * 100 : 0;
  }

  /**
   * Should activate banned letter constraint based on remaining players
   */
  static shouldActivateBannedLetter(
    players: Player[],
    threshold: number,
    currentlyBanned: string[]
  ): boolean {
    const percentage = this.getRemainingPlayerPercentage(players);
    return percentage <= threshold && currentlyBanned.length === 0;
  }
}
