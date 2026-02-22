import type { MatchState } from '../../../shared/types/game';

/**
 * In-memory match state storage
 * In production, this could be replaced with Redis or a database
 */
class MatchStore {
  private matches: Map<string, MatchState>;

  constructor() {
    this.matches = new Map();
  }

  /**
   * Create a new match
   */
  createMatch(match: MatchState): void {
    this.matches.set(match.id, match);
  }

  /**
   * Get match by ID
   */
  getMatch(matchId: string): MatchState | undefined {
    return this.matches.get(matchId);
  }

  /**
   * Update match state
   */
  updateMatch(matchId: string, match: MatchState): void {
    this.matches.set(matchId, match);
  }

  /**
   * Delete a match
   */
  deleteMatch(matchId: string): void {
    this.matches.delete(matchId);
  }

  /**
   * Get all matches
   */
  getAllMatches(): MatchState[] {
    return Array.from(this.matches.values());
  }

  /**
   * Get active matches (not ended)
   */
  getActiveMatches(): MatchState[] {
    return this.getAllMatches().filter(m => m.phase !== 'ENDED');
  }

  /**
   * Clear all matches
   */
  clear(): void {
    this.matches.clear();
  }

  /**
   * Get match count
   */
  getMatchCount(): number {
    return this.matches.size;
  }
}

// Singleton instance
export const matchStore = new MatchStore();
