import type { Category, GameConstraints } from '../../../shared/types/game';

export class Validator {
  private usedAnswers: Set<string>;
  
  constructor(usedAnswers: string[] = []) {
    this.usedAnswers = new Set(usedAnswers.map(a => a.toLowerCase().trim()));
  }

  /**
   * Validate if an answer is acceptable for the current game state
   */
  validateAnswer(
    answer: string,
    category: Category,
    constraints: GameConstraints
  ): { isValid: boolean; reason?: string } {
    const trimmedAnswer = answer.trim();
    
    // Check if answer is empty
    if (!trimmedAnswer) {
      return { isValid: false, reason: 'Answer cannot be empty' };
    }

    // Check length constraints
    if (constraints.minAnswerLength && trimmedAnswer.length < constraints.minAnswerLength) {
      return { isValid: false, reason: `Answer must be at least ${constraints.minAnswerLength} characters` };
    }

    if (constraints.maxAnswerLength && trimmedAnswer.length > constraints.maxAnswerLength) {
      return { isValid: false, reason: `Answer cannot exceed ${constraints.maxAnswerLength} characters` };
    }

    // Check for banned letters
    if (constraints.bannedLetters.length > 0) {
      const lowerAnswer = trimmedAnswer.toLowerCase();
      for (const letter of constraints.bannedLetters) {
        if (lowerAnswer.includes(letter.toLowerCase())) {
          return { isValid: false, reason: `Answer cannot contain the banned letter: ${letter.toUpperCase()}` };
        }
      }
    }

    // Check if answer was already used
    const normalizedAnswer = trimmedAnswer.toLowerCase();
    if (this.usedAnswers.has(normalizedAnswer)) {
      return { isValid: false, reason: 'This answer has already been used' };
    }

    // Basic alphanumeric check (allow spaces and common punctuation)
    if (!/^[a-zA-Z0-9\s\-'\.]+$/.test(trimmedAnswer)) {
      return { isValid: false, reason: 'Answer contains invalid characters' };
    }

    // Category-specific validation (can be extended with external APIs)
    // For MVP, we'll accept any valid format
    const categoryValidation = this.validateCategory(trimmedAnswer, category);
    if (!categoryValidation.isValid) {
      return categoryValidation;
    }

    return { isValid: true };
  }

  /**
   * Category-specific validation logic
   * In production, this could call external APIs or use a dictionary
   */
  private validateCategory(answer: string, category: Category): { isValid: boolean; reason?: string } {
    // MVP: Basic validation - just check it's a reasonable answer
    // In production, integrate with dictionary APIs or category-specific validators
    
    const minLength = 2;
    if (answer.length < minLength) {
      return { isValid: false, reason: 'Answer is too short' };
    }

    // Check against examples to ensure it's not suspiciously different
    // This is a basic heuristic - real implementation would use proper validation
    if (category.id === 'crypto-tokens') {
      // Could integrate with CoinGecko API or similar
      return { isValid: true };
    }

    if (category.id === 'programming-languages') {
      // Could maintain a list of known programming languages
      return { isValid: true };
    }

    // Default: accept the answer (can be improved with ML/APIs)
    return { isValid: true };
  }

  /**
   * Mark an answer as used
   */
  markAnswerUsed(answer: string): void {
    this.usedAnswers.add(answer.toLowerCase().trim());
  }

  /**
   * Reset used answers
   */
  reset(): void {
    this.usedAnswers.clear();
  }

  /**
   * Get all used answers
   */
  getUsedAnswers(): string[] {
    return Array.from(this.usedAnswers);
  }
}
