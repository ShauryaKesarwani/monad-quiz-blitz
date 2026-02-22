import type { GamePhase, TimerConfig, Category } from '../../../shared/types/game';
import categories from '../data/categories.json';

export class TurnEngine {
  private timerConfig: TimerConfig;
  private usedCategoryIds: Set<string>;

  constructor(timerConfig: TimerConfig) {
    this.timerConfig = timerConfig;
    this.usedCategoryIds = new Set();
  }

  /**
   * Calculate timer for current round
   */
  calculateTimer(roundNumber: number, isBlitzMode: boolean): number {
    if (isBlitzMode) {
      return this.timerConfig.blitzTime;
    }

    const baseTime = this.timerConfig.initialTime;
    const decrement = this.timerConfig.decrementPerRound * (roundNumber - 1);
    const calculatedTime = baseTime - decrement;

    return Math.max(calculatedTime, this.timerConfig.minimumTime);
  }

  /**
   * Determine if blitz mode should activate (random probability)
   */
  shouldActivateBlitz(blitzProbability: number): boolean {
    return Math.random() < blitzProbability;
  }

  /**
   * Get a random category that hasn't been used yet
   */
  getRandomCategory(excludeUsed: boolean = true): Category {
    const availableCategories = excludeUsed
      ? (categories as Category[]).filter(c => !this.usedCategoryIds.has(c.id))
      : categories as Category[];

    // If all categories used, reset
    if (availableCategories.length === 0) {
      this.usedCategoryIds.clear();
      return this.getRandomCategory(true);
    }

    const randomIndex = Math.floor(Math.random() * availableCategories.length);
    const selectedCategory = availableCategories[randomIndex];
    
    this.usedCategoryIds.add(selectedCategory.id);
    
    return selectedCategory;
  }

  /**
   * Switch to a new category
   */
  switchCategory(): Category {
    return this.getRandomCategory(true);
  }

  /**
   * Get a random banned letter
   */
  getRandomBannedLetter(existingBanned: string[] = []): string {
    // Common letters that make the game challenging but not impossible
    const candidateLetters = ['E', 'A', 'R', 'T', 'I', 'O', 'S', 'N'];
    
    const availableLetters = candidateLetters.filter(
      letter => !existingBanned.includes(letter)
    );

    if (availableLetters.length === 0) {
      // All common letters banned, return a random letter
      const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
      const randomIndex = Math.floor(Math.random() * alphabet.length);
      return alphabet[randomIndex];
    }

    const randomIndex = Math.floor(Math.random() * availableLetters.length);
    return availableLetters[randomIndex];
  }

  /**
   * Determine the next game phase based on current state
   */
  determineNextPhase(
    currentPhase: GamePhase,
    roundNumber: number,
    remainingPlayers: number
  ): GamePhase {
    if (remainingPlayers <= 1) {
      return 'ENDED' as GamePhase;
    }

    switch (currentPhase) {
      case 'PREDICTION':
        return 'NORMAL' as GamePhase;
      
      case 'NORMAL':
        // Move to acceleration after a few rounds
        if (roundNumber >= 3) {
          return 'ACCELERATION' as GamePhase;
        }
        return 'NORMAL' as GamePhase;
      
      case 'ACCELERATION':
      case 'BLITZ':
        return 'ACCELERATION' as GamePhase;
      
      default:
        return currentPhase;
    }
  }

  /**
   * Reset turn engine state
   */
  reset(): void {
    this.usedCategoryIds.clear();
  }

  /**
   * Get used category IDs
   */
  getUsedCategoryIds(): string[] {
    return Array.from(this.usedCategoryIds);
  }
}
