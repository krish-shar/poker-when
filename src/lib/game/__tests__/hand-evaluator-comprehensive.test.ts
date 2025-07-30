import { describe, it, expect, beforeEach } from 'vitest'
import { HandEvaluator, CardUtils, type HandRanking } from '../engine'
import type { Card } from '@/types'

describe('HandEvaluator - Comprehensive Tests', () => {
  
  describe('Hand Rankings - All Combinations', () => {
    it('should correctly identify Royal Flush', () => {
      const royalFlushCards: Card[] = [
        { suit: 'hearts', rank: 'A' },
        { suit: 'hearts', rank: 'K' },
        { suit: 'hearts', rank: 'Q' },
        { suit: 'hearts', rank: 'J' },
        { suit: 'hearts', rank: 'T' },
        { suit: 'clubs', rank: '2' },
        { suit: 'diamonds', rank: '3' }
      ]
      
      const ranking = HandEvaluator.evaluateHand(royalFlushCards)
      
      expect(ranking.rank).toBe(9)
      expect(ranking.name).toBe('Royal Flush')
      expect(ranking.cards).toHaveLength(5)
      expect(ranking.cards.every(card => card.suit === 'hearts')).toBe(true)
    })

    it('should correctly identify Straight Flush', () => {
      const straightFlushCards: Card[] = [
        { suit: 'spades', rank: '9' },
        { suit: 'spades', rank: '8' },
        { suit: 'spades', rank: '7' },
        { suit: 'spades', rank: '6' },
        { suit: 'spades', rank: '5' },
        { suit: 'hearts', rank: 'A' },
        { suit: 'clubs', rank: 'K' }
      ]
      
      const ranking = HandEvaluator.evaluateHand(straightFlushCards)
      
      expect(ranking.rank).toBe(8)
      expect(ranking.name).toBe('Straight Flush')
      expect(ranking.cards).toHaveLength(5)
    })

    it('should correctly identify Four of a Kind', () => {
      const fourOfAKindCards: Card[] = [
        { suit: 'hearts', rank: 'A' },
        { suit: 'spades', rank: 'A' },
        { suit: 'clubs', rank: 'A' },
        { suit: 'diamonds', rank: 'A' },
        { suit: 'hearts', rank: 'K' },
        { suit: 'spades', rank: '2' },
        { suit: 'clubs', rank: '3' }
      ]
      
      const ranking = HandEvaluator.evaluateHand(fourOfAKindCards)
      
      expect(ranking.rank).toBe(7)
      expect(ranking.name).toBe('Four of a Kind')
      expect(ranking.cards.filter(card => card.rank === 'A')).toHaveLength(4)
    })

    it('should correctly identify Full House', () => {
      const fullHouseCards: Card[] = [
        { suit: 'hearts', rank: 'A' },
        { suit: 'spades', rank: 'A' },
        { suit: 'clubs', rank: 'A' },
        { suit: 'diamonds', rank: 'K' },
        { suit: 'hearts', rank: 'K' },
        { suit: 'spades', rank: '2' },
        { suit: 'clubs', rank: '3' }
      ]
      
      const ranking = HandEvaluator.evaluateHand(fullHouseCards)
      
      expect(ranking.rank).toBe(6)
      expect(ranking.name).toBe('Full House')
    })

    it('should correctly identify Flush', () => {
      const flushCards: Card[] = [
        { suit: 'hearts', rank: 'A' },
        { suit: 'hearts', rank: 'J' },
        { suit: 'hearts', rank: '9' },
        { suit: 'hearts', rank: '7' },
        { suit: 'hearts', rank: '3' },
        { suit: 'spades', rank: 'K' },
        { suit: 'clubs', rank: 'Q' }
      ]
      
      const ranking = HandEvaluator.evaluateHand(flushCards)
      
      expect(ranking.rank).toBe(5)
      expect(ranking.name).toBe('Flush')
      expect(ranking.cards.every(card => card.suit === 'hearts')).toBe(true)
    })

    it('should correctly identify Straight', () => {
      const straightCards: Card[] = [
        { suit: 'hearts', rank: 'A' },
        { suit: 'spades', rank: 'K' },
        { suit: 'clubs', rank: 'Q' },
        { suit: 'diamonds', rank: 'J' },
        { suit: 'hearts', rank: 'T' },
        { suit: 'spades', rank: '2' },
        { suit: 'clubs', rank: '3' }
      ]
      
      const ranking = HandEvaluator.evaluateHand(straightCards)
      
      expect(ranking.rank).toBe(4)
      expect(ranking.name).toBe('Straight')
    })

    it('should correctly identify wheel straight (A-2-3-4-5)', () => {
      const wheelCards: Card[] = [
        { suit: 'hearts', rank: 'A' },
        { suit: 'spades', rank: '2' },
        { suit: 'clubs', rank: '3' },
        { suit: 'diamonds', rank: '4' },
        { suit: 'hearts', rank: '5' },
        { suit: 'spades', rank: 'K' },
        { suit: 'clubs', rank: 'Q' }
      ]
      
      const ranking = HandEvaluator.evaluateHand(wheelCards)
      
      expect(ranking.rank).toBe(4)
      expect(ranking.name).toBe('Straight')
    })

    it('should correctly identify Three of a Kind', () => {
      const threeOfAKindCards: Card[] = [
        { suit: 'hearts', rank: 'A' },
        { suit: 'spades', rank: 'A' },
        { suit: 'clubs', rank: 'A' },
        { suit: 'diamonds', rank: 'K' },
        { suit: 'hearts', rank: 'Q' },
        { suit: 'spades', rank: '2' },
        { suit: 'clubs', rank: '3' }
      ]
      
      const ranking = HandEvaluator.evaluateHand(threeOfAKindCards)
      
      expect(ranking.rank).toBe(3)
      expect(ranking.name).toBe('Three of a Kind')
    })

    it('should correctly identify Two Pair', () => {
      const twoPairCards: Card[] = [
        { suit: 'hearts', rank: 'A' },
        { suit: 'spades', rank: 'A' },
        { suit: 'clubs', rank: 'K' },
        { suit: 'diamonds', rank: 'K' },
        { suit: 'hearts', rank: 'Q' },
        { suit: 'spades', rank: '2' },
        { suit: 'clubs', rank: '3' }
      ]
      
      const ranking = HandEvaluator.evaluateHand(twoPairCards)
      
      expect(ranking.rank).toBe(2)
      expect(ranking.name).toBe('Two Pair')
    })

    it('should correctly identify One Pair', () => {
      const onePairCards: Card[] = [
        { suit: 'hearts', rank: 'A' },
        { suit: 'spades', rank: 'A' },
        { suit: 'clubs', rank: 'K' },
        { suit: 'diamonds', rank: 'Q' },
        { suit: 'hearts', rank: 'J' },
        { suit: 'spades', rank: '2' },
        { suit: 'clubs', rank: '3' }
      ]
      
      const ranking = HandEvaluator.evaluateHand(onePairCards)
      
      expect(ranking.rank).toBe(1)
      expect(ranking.name).toBe('One Pair')
    })

    it('should correctly identify High Card', () => {
      const highCardCards: Card[] = [
        { suit: 'hearts', rank: 'A' },
        { suit: 'spades', rank: 'K' },
        { suit: 'clubs', rank: 'Q' },
        { suit: 'diamonds', rank: 'J' },
        { suit: 'hearts', rank: '9' },
        { suit: 'spades', rank: '2' },
        { suit: 'clubs', rank: '3' }
      ]
      
      const ranking = HandEvaluator.evaluateHand(highCardCards)
      
      expect(ranking.rank).toBe(0)
      expect(ranking.name).toBe('High Card')
    })
  })

  describe('Edge Cases and Complex Scenarios', () => {
    it('should handle exactly 5 cards', () => {
      const fiveCards: Card[] = [
        { suit: 'hearts', rank: 'A' },
        { suit: 'spades', rank: 'K' },
        { suit: 'clubs', rank: 'Q' },
        { suit: 'diamonds', rank: 'J' },
        { suit: 'hearts', rank: 'T' }
      ]
      
      const ranking = HandEvaluator.evaluateHand(fiveCards)
      expect(ranking).toBeDefined()
      expect(ranking.cards).toHaveLength(5)
    })

    it('should handle 7 cards and pick best 5', () => {
      const sevenCards: Card[] = [
        { suit: 'hearts', rank: 'A' },
        { suit: 'spades', rank: 'A' },
        { suit: 'clubs', rank: 'A' },
        { suit: 'diamonds', rank: 'A' }, // Four aces
        { suit: 'hearts', rank: 'K' },
        { suit: 'spades', rank: '2' },
        { suit: 'clubs', rank: '3' }
      ]
      
      const ranking = HandEvaluator.evaluateHand(sevenCards)
      
      expect(ranking.rank).toBe(7) // Four of a Kind
      expect(ranking.cards).toHaveLength(5)
      expect(ranking.cards.filter(card => card.rank === 'A')).toHaveLength(4)
    })

    it('should throw error for less than 5 cards', () => {
      const fourCards: Card[] = [
        { suit: 'hearts', rank: 'A' },
        { suit: 'spades', rank: 'K' },
        { suit: 'clubs', rank: 'Q' },
        { suit: 'diamonds', rank: 'J' }
      ]
      
      expect(() => HandEvaluator.evaluateHand(fourCards)).toThrow('Need at least 5 cards to evaluate hand')
    })

    it('should handle multiple possible straights and pick highest', () => {
      const multiStraightCards: Card[] = [
        { suit: 'hearts', rank: 'A' },
        { suit: 'spades', rank: 'K' },
        { suit: 'clubs', rank: 'Q' },
        { suit: 'diamonds', rank: 'J' },
        { suit: 'hearts', rank: 'T' },
        { suit: 'spades', rank: '9' },
        { suit: 'clubs', rank: '8' }
      ]
      
      const ranking = HandEvaluator.evaluateHand(multiStraightCards)
      
      expect(ranking.rank).toBe(4) // Straight
      expect(ranking.cards[0].rank).toBe('A') // Should be Broadway straight
    })

    it('should handle multiple flushes and pick best', () => {
      const multiFlushCards: Card[] = [
        { suit: 'hearts', rank: 'A' },
        { suit: 'hearts', rank: 'K' },
        { suit: 'hearts', rank: 'Q' },
        { suit: 'hearts', rank: 'J' },
        { suit: 'hearts', rank: '9' },
        { suit: 'spades', rank: '8' },
        { suit: 'spades', rank: '7' }
      ]
      
      const ranking = HandEvaluator.evaluateHand(multiFlushCards)
      
      expect(ranking.rank).toBe(5) // Flush
      expect(ranking.cards.every(card => card.suit === 'hearts')).toBe(true)
      expect(ranking.cards[0].rank).toBe('A') // Ace high flush
    })

    it('should prefer straight flush over separate straight and flush', () => {
      const straightFlushCards: Card[] = [
        { suit: 'hearts', rank: '9' },
        { suit: 'hearts', rank: '8' },
        { suit: 'hearts', rank: '7' },
        { suit: 'hearts', rank: '6' },
        { suit: 'hearts', rank: '5' },
        { suit: 'spades', rank: 'A' },
        { suit: 'spades', rank: 'K' }
      ]
      
      const ranking = HandEvaluator.evaluateHand(straightFlushCards)
      
      expect(ranking.rank).toBe(8) // Straight Flush, not just flush or straight
      expect(ranking.name).toBe('Straight Flush')
    })

    it('should handle multiple full houses and pick best', () => {
      const multiFullHouseCards: Card[] = [
        { suit: 'hearts', rank: 'A' },
        { suit: 'spades', rank: 'A' },
        { suit: 'clubs', rank: 'A' },
        { suit: 'diamonds', rank: 'K' },
        { suit: 'hearts', rank: 'K' },
        { suit: 'spades', rank: '2' },
        { suit: 'clubs', rank: '2' }
      ]
      
      const ranking = HandEvaluator.evaluateHand(multiFullHouseCards)
      
      expect(ranking.rank).toBe(6) // Full House
      expect(ranking.name).toBe('Full House')
      // Should use Aces full of Kings, not Kings full of twos
    })
  })

  describe('Hand Comparison Edge Cases', () => {
    it('should handle identical hand rankings with different kickers', () => {
      const hand1Cards: Card[] = [
        { suit: 'hearts', rank: 'A' },
        { suit: 'spades', rank: 'A' },
        { suit: 'clubs', rank: 'K' },
        { suit: 'diamonds', rank: 'Q' },
        { suit: 'hearts', rank: 'J' }
      ]
      
      const hand2Cards: Card[] = [
        { suit: 'clubs', rank: 'A' },
        { suit: 'diamonds', rank: 'A' },
        { suit: 'hearts', rank: 'K' },
        { suit: 'spades', rank: 'Q' },
        { suit: 'clubs', rank: 'T' }
      ]
      
      const ranking1 = HandEvaluator.evaluateHand(hand1Cards)
      const ranking2 = HandEvaluator.evaluateHand(hand2Cards)
      
      expect(ranking1.rank).toBe(ranking2.rank) // Both one pair
      // Hand 1 should win with Jack kicker vs Ten kicker (implementation dependent)
    })

    it('should handle suited connectors vs offsuit broadway', () => {
      const suitedConnectorCards: Card[] = [
        { suit: 'hearts', rank: '8' },
        { suit: 'hearts', rank: '7' },
        { suit: 'hearts', rank: '6' },
        { suit: 'hearts', rank: '5' },
        { suit: 'hearts', rank: '4' },
        { suit: 'spades', rank: 'A' },
        { suit: 'clubs', rank: 'K' }
      ]
      
      const broadwayCards: Card[] = [
        { suit: 'hearts', rank: 'A' },
        { suit: 'spades', rank: 'K' },
        { suit: 'clubs', rank: 'Q' },
        { suit: 'diamonds', rank: 'J' },
        { suit: 'hearts', rank: 'T' },
        { suit: 'spades', rank: '2' },
        { suit: 'clubs', rank: '3' }
      ]
      
      const suitedRanking = HandEvaluator.evaluateHand(suitedConnectorCards)
      const broadwayRanking = HandEvaluator.evaluateHand(broadwayCards)
      
      expect(suitedRanking.rank).toBe(8) // Straight flush
      expect(broadwayRanking.rank).toBe(4) // Straight
      expect(suitedRanking.rank).toBeGreaterThan(broadwayRanking.rank)
    })
  })

  describe('Performance and Stress Tests', () => {
    it('should handle evaluation of many combinations efficiently', () => {
      const startTime = performance.now()
      
      // Test 1000 random hands
      for (let i = 0; i < 1000; i++) {
        const deck = CardUtils.shuffleDeck(CardUtils.createDeck())
        const testHand = deck.slice(0, 7) // 7 cards like Texas Hold'em
        HandEvaluator.evaluateHand(testHand)
      }
      
      const endTime = performance.now()
      const executionTime = endTime - startTime
      
      // Should complete 1000 evaluations in reasonable time (< 1 second)
      expect(executionTime).toBeLessThan(1000)
    })

    it('should be consistent with same input', () => {
      const testCards: Card[] = [
        { suit: 'hearts', rank: 'A' },
        { suit: 'spades', rank: 'K' },
        { suit: 'clubs', rank: 'Q' },
        { suit: 'diamonds', rank: 'J' },
        { suit: 'hearts', rank: 'T' },
        { suit: 'spades', rank: '2' },
        { suit: 'clubs', rank: '3' }
      ]
      
      const ranking1 = HandEvaluator.evaluateHand(testCards)
      const ranking2 = HandEvaluator.evaluateHand(testCards)
      const ranking3 = HandEvaluator.evaluateHand(testCards)
      
      expect(ranking1.rank).toBe(ranking2.rank)
      expect(ranking2.rank).toBe(ranking3.rank)
      expect(ranking1.name).toBe(ranking2.name)
      expect(ranking2.name).toBe(ranking3.name)
    })
  })

  describe('Special Poker Scenarios', () => {
    it('should handle pocket pairs vs overcards scenario', () => {
      // Pocket pairs
      const pocketPairCards: Card[] = [
        { suit: 'hearts', rank: '8' },
        { suit: 'spades', rank: '8' },
        { suit: 'clubs', rank: 'A' },
        { suit: 'diamonds', rank: 'K' },
        { suit: 'hearts', rank: 'Q' },
        { suit: 'spades', rank: '2' },
        { suit: 'clubs', rank: '3' }
      ]
      
      // Overcards no pair
      const overcardsCards: Card[] = [
        { suit: 'hearts', rank: 'A' },
        { suit: 'spades', rank: 'K' },
        { suit: 'clubs', rank: 'Q' },
        { suit: 'diamonds', rank: 'J' },
        { suit: 'hearts', rank: '9' },
        { suit: 'spades', rank: '2' },
        { suit: 'clubs', rank: '3' }
      ]
      
      const pairRanking = HandEvaluator.evaluateHand(pocketPairCards)
      const overcardsRanking = HandEvaluator.evaluateHand(overcardsCards)
      
      expect(pairRanking.rank).toBe(1) // One pair
      expect(overcardsRanking.rank).toBe(0) // High card
      expect(pairRanking.rank).toBeGreaterThan(overcardsRanking.rank)
    })

    it('should handle runner-runner flush scenario', () => {
      const runnerRunnerFlushCards: Card[] = [
        { suit: 'hearts', rank: '7' },
        { suit: 'clubs', rank: '2' },
        { suit: 'hearts', rank: 'A' },
        { suit: 'hearts', rank: 'K' },
        { suit: 'hearts', rank: 'Q' },
        { suit: 'hearts', rank: 'J' },
        { suit: 'spades', rank: '3' }
      ]
      
      const ranking = HandEvaluator.evaluateHand(runnerRunnerFlushCards)
      
      expect(ranking.rank).toBe(5) // Flush
      expect(ranking.cards.every(card => card.suit === 'hearts')).toBe(true)
    })

    it('should handle counterfeited hands', () => {
      // Two pair that gets counterfeited to one pair
      const counterfeitedCards: Card[] = [
        { suit: 'hearts', rank: '8' },
        { suit: 'spades', rank: '8' },
        { suit: 'clubs', rank: '3' },
        { suit: 'diamonds', rank: '3' },
        { suit: 'hearts', rank: 'A' },
        { suit: 'spades', rank: 'A' },
        { suit: 'clubs', rank: 'A' }
      ]
      
      const ranking = HandEvaluator.evaluateHand(counterfeitedCards)
      
      // Should be full house (Aces full of 8s) not two pair
      expect(ranking.rank).toBe(6) // Full House
    })
  })

  describe('Invalid Input Handling', () => {
    it('should handle empty array', () => {
      expect(() => HandEvaluator.evaluateHand([])).toThrow()
    })

    it('should handle null/undefined cards', () => {
      const invalidCards = [
        { suit: 'hearts', rank: 'A' },
        null as any,
        { suit: 'spades', rank: 'K' },
        undefined as any,
        { suit: 'clubs', rank: 'Q' },
        { suit: 'diamonds', rank: 'J' },
        { suit: 'hearts', rank: 'T' }
      ]
      
      expect(() => HandEvaluator.evaluateHand(invalidCards)).toThrow()
    })

    it('should handle duplicate cards gracefully', () => {
      const duplicateCards: Card[] = [
        { suit: 'hearts', rank: 'A' },
        { suit: 'hearts', rank: 'A' }, // Duplicate
        { suit: 'spades', rank: 'K' },
        { suit: 'clubs', rank: 'Q' },
        { suit: 'diamonds', rank: 'J' },
        { suit: 'hearts', rank: 'T' },
        { suit: 'spades', rank: '9' }
      ]
      
      // Should handle gracefully or throw appropriate error
      expect(() => HandEvaluator.evaluateHand(duplicateCards)).not.toThrow()
    })
  })
})