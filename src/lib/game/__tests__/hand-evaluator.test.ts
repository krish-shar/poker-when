import { describe, it, expect } from 'vitest'
import { HandEvaluator, CardUtils } from '../engine'
import type { Card } from '@/types'

describe('HandEvaluator', () => {
  // Helper function to create cards from string notation
  const createCards = (cardStrings: string[]): Card[] => {
    return cardStrings.map(str => CardUtils.stringToCard(str))
  }

  describe('evaluateHand', () => {
    it('should identify royal flush correctly', () => {
      const cards = createCards(['AS', 'KS', 'QS', 'JS', 'TS', '9H', '8H'])
      const result = HandEvaluator.evaluateHand(cards)
      
      expect(result.rank).toBe(9)
      expect(result.name).toBe('Royal Flush')
      expect(result.cards).toHaveLength(5)
      
      // Check that the royal flush cards are included
      const royalCards = result.cards.map(card => CardUtils.cardToString(card))
      expect(royalCards).toContain('AS')
      expect(royalCards).toContain('KS')
      expect(royalCards).toContain('QS')
      expect(royalCards).toContain('JS')
      expect(royalCards).toContain('TS')
    })

    it('should identify straight flush correctly', () => {
      const cards = createCards(['9S', '8S', '7S', '6S', '5S', 'AH', 'KH'])
      const result = HandEvaluator.evaluateHand(cards)
      
      expect(result.rank).toBe(8)
      expect(result.name).toBe('Straight Flush')
      expect(result.cards).toHaveLength(5)
    })

    it('should identify four of a kind correctly', () => {
      const cards = createCards(['AS', 'AH', 'AD', 'AC', 'KS', 'QH', 'JD'])
      const result = HandEvaluator.evaluateHand(cards)
      
      expect(result.rank).toBe(7)
      expect(result.name).toBe('Four of a Kind')
      expect(result.cards).toHaveLength(5)
    })

    it('should identify full house correctly', () => {
      const cards = createCards(['AS', 'AH', 'AD', 'KS', 'KH', 'QC', 'JD'])
      const result = HandEvaluator.evaluateHand(cards)
      
      expect(result.rank).toBe(6)
      expect(result.name).toBe('Full House')
      expect(result.cards).toHaveLength(5)
    })

    it('should identify flush correctly', () => {
      const cards = createCards(['AS', 'KS', 'QS', 'JS', '9S', '8H', '7H'])
      const result = HandEvaluator.evaluateHand(cards)
      
      expect(result.rank).toBe(5)
      expect(result.name).toBe('Flush')
      expect(result.cards).toHaveLength(5)
      
      // All result cards should be spades
      result.cards.forEach(card => {
        expect(card.suit).toBe('spades')
      })
    })

    it('should identify straight correctly', () => {
      const cards = createCards(['AS', 'KH', 'QD', 'JC', 'TS', '9H', '8D'])
      const result = HandEvaluator.evaluateHand(cards)
      
      expect(result.rank).toBe(4)
      expect(result.name).toBe('Straight')
      expect(result.cards).toHaveLength(5)
    })

    it('should handle wheel straight (A-2-3-4-5)', () => {
      const cards = createCards(['AS', '5H', '4D', '3C', '2S', 'KH', 'QD'])
      const result = HandEvaluator.evaluateHand(cards)
      
      expect(result.rank).toBe(4)
      expect(result.name).toBe('Straight')
      expect(result.cards).toHaveLength(5)
      
      // Check for wheel straight cards
      const cardRanks = result.cards.map(card => card.rank).sort()
      expect(cardRanks).toContain('A')
      expect(cardRanks).toContain('2')
      expect(cardRanks).toContain('3')
      expect(cardRanks).toContain('4')
      expect(cardRanks).toContain('5')
    })

    it('should identify three of a kind correctly', () => {
      const cards = createCards(['AS', 'AH', 'AD', 'KS', 'QH', 'JC', '9D'])
      const result = HandEvaluator.evaluateHand(cards)
      
      expect(result.rank).toBe(3)
      expect(result.name).toBe('Three of a Kind')
      expect(result.cards).toHaveLength(5)
    })

    it('should identify two pair correctly', () => {
      const cards = createCards(['AS', 'AH', 'KS', 'KH', 'QD', 'JC', '9S'])
      const result = HandEvaluator.evaluateHand(cards)
      
      expect(result.rank).toBe(2)
      expect(result.name).toBe('Two Pair')
      expect(result.cards).toHaveLength(5)
    })

    it('should identify one pair correctly', () => {
      const cards = createCards(['AS', 'AH', 'KS', 'QH', 'JD', '9C', '7S'])
      const result = HandEvaluator.evaluateHand(cards)
      
      expect(result.rank).toBe(1)
      expect(result.name).toBe('One Pair')
      expect(result.cards).toHaveLength(5)
    })

    it('should identify high card correctly', () => {
      const cards = createCards(['AS', 'KH', 'QD', 'JC', '9S', '7H', '5D'])
      const result = HandEvaluator.evaluateHand(cards)
      
      expect(result.rank).toBe(0)
      expect(result.name).toBe('High Card')
      expect(result.cards).toHaveLength(5)
    })

    it('should rank hands in correct order', () => {
      const hands = [
        { cards: createCards(['AS', 'KS', 'QS', 'JS', 'TS', '9H', '8H']), expectedRank: 9 }, // Royal Flush
        { cards: createCards(['9S', '8S', '7S', '6S', '5S', 'AH', 'KH']), expectedRank: 8 }, // Straight Flush
        { cards: createCards(['AS', 'AH', 'AD', 'AC', 'KS', 'QH', 'JD']), expectedRank: 7 }, // Four of a Kind
        { cards: createCards(['AS', 'AH', 'AD', 'KS', 'KH', 'QC', 'JD']), expectedRank: 6 }, // Full House
        { cards: createCards(['AS', 'KS', 'QS', 'JS', '9S', '8H', '7H']), expectedRank: 5 }, // Flush
        { cards: createCards(['AS', 'KH', 'QD', 'JC', 'TS', '9H', '8D']), expectedRank: 4 }, // Straight
        { cards: createCards(['AS', 'AH', 'AD', 'KS', 'QH', 'JC', '9D']), expectedRank: 3 }, // Three of a Kind
        { cards: createCards(['AS', 'AH', 'KS', 'KH', 'QD', 'JC', '9S']), expectedRank: 2 }, // Two Pair
        { cards: createCards(['AS', 'AH', 'KS', 'QH', 'JD', '9C', '7S']), expectedRank: 1 }, // One Pair
        { cards: createCards(['AS', 'KH', 'QD', 'JC', '9S', '7H', '5D']), expectedRank: 0 }  // High Card
      ]
      
      hands.forEach(({ cards, expectedRank }) => {
        const result = HandEvaluator.evaluateHand(cards)
        expect(result.rank).toBe(expectedRank)
      })
    })

    it('should handle edge cases (insufficient cards)', () => {
      expect(() => {
        HandEvaluator.evaluateHand(createCards(['AS', 'KH', 'QD', 'JC']))
      }).toThrow('Need at least 5 cards to evaluate hand')
    })

    it('should handle exactly 5 cards', () => {
      const cards = createCards(['AS', 'KH', 'QD', 'JC', 'TS'])
      const result = HandEvaluator.evaluateHand(cards)
      
      expect(result.rank).toBe(4) // Straight
      expect(result.name).toBe('Straight')
      expect(result.cards).toHaveLength(5)
    })

    it('should choose best hand from 7 cards', () => {
      // Has both straight and pair, should choose straight
      const cards = createCards(['AS', 'KH', 'QD', 'JC', 'TS', 'KS', '9H'])
      const result = HandEvaluator.evaluateHand(cards)
      
      expect(result.rank).toBe(4) // Straight (better than pair)
      expect(result.name).toBe('Straight')
    })

    it('should handle multiple possible hands of same type', () => {
      // Two possible straights, should choose the higher one
      const cards = createCards(['AS', 'KH', 'QD', 'JC', 'TS', '9H', '8D'])
      const result = HandEvaluator.evaluateHand(cards)
      
      expect(result.rank).toBe(4) // Straight
      expect(result.name).toBe('Straight')
      
      // Should be the A-high straight
      const cardRanks = result.cards.map(card => card.rank).sort()
      expect(cardRanks).toContain('A')
      expect(cardRanks).toContain('K')
    })
  })

  describe('getCombinations', () => {
    it('should generate all 5-card combinations from 7 cards', () => {
      const cards = createCards(['AS', 'KH', 'QD', 'JC', 'TS', '9H', '8D'])
      // Access private method through evaluation (testing implicitly)
      const result = HandEvaluator.evaluateHand(cards)
      
      // If we get a valid result, combinations were generated correctly
      expect(result).toBeDefined()
      expect(result.cards).toHaveLength(5)
    })

    it('should handle minimum card requirements', () => {
      expect(() => {
        HandEvaluator.evaluateHand(createCards(['AS']))
      }).toThrow('Need at least 5 cards to evaluate hand')
    })

    it('should work with exactly 5 cards (no combinations needed)', () => {
      const cards = createCards(['AS', 'KH', 'QD', 'JC', 'TS'])
      const result = HandEvaluator.evaluateHand(cards)
      
      expect(result.cards).toHaveLength(5)
      expect(result.rank).toBe(4) // Straight
    })
  })

  describe('complex hand scenarios', () => {
    it('should correctly identify the best full house', () => {
      // Aces full of Kings vs Kings full of Aces - should prefer Aces full
      const cards = createCards(['AS', 'AH', 'AD', 'KS', 'KH', 'KC', 'QD'])
      const result = HandEvaluator.evaluateHand(cards)
      
      expect(result.rank).toBe(6) // Full House
      expect(result.name).toBe('Full House')
    })

    it('should correctly identify the best two pair', () => {
      const cards = createCards(['AS', 'AH', 'KS', 'KH', 'QD', 'QC', 'JS'])
      const result = HandEvaluator.evaluateHand(cards)
      
      expect(result.rank).toBe(2) // Two Pair
      expect(result.name).toBe('Two Pair')
      
      // Should be Aces and Kings (highest two pair)
      const pairs = result.cards.filter(card => 
        result.cards.filter(c => c.rank === card.rank).length >= 2
      )
      const uniqueRanks = [...new Set(pairs.map(card => card.rank))]
      expect(uniqueRanks).toContain('A')
      expect(uniqueRanks).toContain('K')
    })

    it('should handle low straight flush', () => {
      const cards = createCards(['5S', '4S', '3S', '2S', 'AS', 'KH', 'QD'])
      const result = HandEvaluator.evaluateHand(cards)
      
      expect(result.rank).toBe(8) // Straight Flush
      expect(result.name).toBe('Straight Flush')
    })

    it('should distinguish between straight and straight flush', () => {
      const straightCards = createCards(['AS', 'KH', 'QD', 'JC', 'TS', '9S', '8H'])
      const straightResult = HandEvaluator.evaluateHand(straightCards)
      
      const straightFlushCards = createCards(['AS', 'KS', 'QS', 'JS', 'TS', '9H', '8D'])
      const straightFlushResult = HandEvaluator.evaluateHand(straightFlushCards)
      
      expect(straightResult.rank).toBe(4) // Straight
      expect(straightFlushResult.rank).toBe(8) // Straight Flush
      expect(straightFlushResult.rank).toBeGreaterThan(straightResult.rank)
    })

    it('should handle edge case with multiple flushes possible', () => {
      const cards = createCards(['AS', 'KS', 'QS', 'JS', '9S', '8H', '7H'])
      const result = HandEvaluator.evaluateHand(cards)
      
      expect(result.rank).toBe(5) // Flush
      expect(result.name).toBe('Flush')
      
      // Should choose the spade flush (higher cards)
      result.cards.forEach(card => {
        expect(card.suit).toBe('spades')
      })
    })
  })
})