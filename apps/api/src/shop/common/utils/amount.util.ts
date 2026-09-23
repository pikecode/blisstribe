export class AmountUtil {
  /**
   * Convert yuan to fen (cents)
   * @param yuan Amount in yuan (e.g., 10.5)
   * @returns Amount in fen (e.g., 1050)
   */
  static yuanToFen(yuan: number): number {
    return Math.round(yuan * 100)
  }

  /**
   * Convert fen (cents) to yuan
   * @param fen Amount in fen (e.g., 1050)
   * @returns Amount in yuan (e.g., 10.5)
   */
  static fenToYuan(fen: number): number {
    return fen / 100
  }

  /**
   * Add multiple fen amounts
   * @param amounts Array of fen amounts
   * @returns Sum of all amounts in fen
   */
  static addFen(...amounts: number[]): number {
    return amounts.reduce((sum, amount) => sum + amount, 0)
  }

  /**
   * Validate that an amount in fen is valid
   * @param fen Amount in fen to validate
   * @returns true if valid (positive integer), false otherwise
   */
  static isValidAmount(fen: number): boolean {
    return fen > 0 && Number.isInteger(fen)
  }
}
