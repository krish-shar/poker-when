import { describe, it, expect, vi } from 'vitest'
import { CardUtils } from '../engine'
import type { Card } from '@/types'

describe('CardUtils', () => {
  describe('createDeck', () => {
    it('should create a standard 52-card deck', () => {
      const deck = CardUtils.createDeck()
      expect(deck).toHaveLength(52)
    })

    it('should contain all suits and ranks', () => {
      const deck = CardUtils.createDeck()
      const suits = new Set(deck.map(card => card.suit))
      const ranks = new Set(deck.map(card => card.rank))
      
      expect(suits).toEqual(new Set(['hearts', 'diamonds', 'clubs', 'spades']))
      expect(ranks).toEqual(new Set(['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A']))
    })

    it('should not contain duplicates', () => {
      const deck = CardUtils.createDeck()
      const cardStrings = deck.map(card => `${card.rank}${card.suit}`)
      const uniqueCards = new Set(cardStrings)
      
      expect(uniqueCards.size).toBe(52)
    })

    it('should have exactly 13 cards per suit', () => {
      const deck = CardUtils.createDeck()
      const suitCounts = {
        hearts: 0,
        diamonds: 0,
        clubs: 0,
        spades: 0
      }
      
      deck.forEach(card => {
        suitCounts[card.suit]++
      })
      
      expect(suitCounts.hearts).toBe(13)
      expect(suitCounts.diamonds).toBe(13)
      expect(suitCounts.clubs).toBe(13)
      expect(suitCounts.spades).toBe(13)
    })

    it('should have exactly 4 cards per rank', () => {
      const deck = CardUtils.createDeck()
      const rankCounts: Record<string, number> = {}
      
      deck.forEach(card => {
        rankCounts[card.rank] = (rankCounts[card.rank] || 0) + 1
      })
      
      CardUtils.RANKS.forEach(rank => {
        expect(rankCounts[rank]).toBe(4)
      })
    })
  })

  describe('shuffleDeck', () => {
    it('should maintain deck size', () => {
      const deck = CardUtils.createDeck()
      const shuffled = CardUtils.shuffleDeck(deck)
      
      expect(shuffled).toHaveLength(52)
    })

    it('should randomize card order', () => {
      const deck = CardUtils.createDeck()
      
      // Mock Math.random to return predictable values
      const mockRandom = vi.spyOn(Math, 'random')
      mockRandom.mockImplementation(() => 0.5)
      
      const shuffled = CardUtils.shuffleDeck(deck)
      
      // With predictable random, order should change
      expect(shuffled).not.toEqual(deck)
      
      mockRandom.mockRestore()
    })

    it('should not modify original deck', () => {
      const originalDeck = CardUtils.createDeck()
      const originalCopy = [...originalDeck]
      const shuffled = CardUtils.shuffleDeck(originalDeck)
      
      expect(originalDeck).toEqual(originalCopy)
      expect(shuffled).not.toBe(originalDeck)
    })

    it('should contain same cards as original', () => {
      const deck = CardUtils.createDeck()
      const shuffled = CardUtils.shuffleDeck(deck)
      
      const originalCardStrings = deck.map(card => `${card.rank}${card.suit}`).sort()
      const shuffledCardStrings = shuffled.map(card => `${card.rank}${card.suit}`).sort()
      
      expect(shuffledCardStrings).toEqual(originalCardStrings)
    })

    it('should handle empty deck', () => {
      const emptyDeck: Card[] = []
      const shuffled = CardUtils.shuffleDeck(emptyDeck)
      
      expect(shuffled).toEqual([])
    })

    it('should handle single card deck', () => {
      const singleCard: Card[] = [{ rank: 'A', suit: 'spades' }]
      const shuffled = CardUtils.shuffleDeck(singleCard)
      
      expect(shuffled).toEqual(singleCard)
      expect(shuffled).not.toBe(singleCard)
    })
  })

  describe('cardToString', () => {
    it('should format cards correctly', () => {
      const testCases: Array<{ card: Card; expected: string }> = [
        { card: { rank: 'A', suit: 'spades' }, expected: 'AS' },
        { card: { rank: 'K', suit: 'hearts' }, expected: 'KH' },
        { card: { rank: 'Q', suit: 'diamonds' }, expected: 'QD' },
        { card: { rank: 'J', suit: 'clubs' }, expected: 'JC' },
        { card: { rank: 'T', suit: 'spades' }, expected: 'TS' },
        { card: { rank: '9', suit: 'hearts' }, expected: '9H' },
        { card: { rank: '2', suit: 'diamonds' }, expected: '2D' }
      ]
      
      testCases.forEach(({ card, expected }) => {
        expect(CardUtils.cardToString(card)).toBe(expected)
      })
    })

    it('should handle all suits and ranks', () => {
      for (const suit of CardUtils.SUITS) {
        for (const rank of CardUtils.RANKS) {
          const card: Card = { rank, suit }
          const result = CardUtils.cardToString(card)
          
          expect(result).toBe(`${rank}${suit[0].toUpperCase()}`)
          expect(result).toHaveLength(2)
        }
      }
    })
  })

  describe('stringToCard', () => {
    it('should parse card strings correctly', () => {
      const testCases: Array<{ input: string; expected: Card }> = [
        { input: 'AS', expected: { rank: 'A', suit: 'spades' } },
        { input: 'KH', expected: { rank: 'K', suit: 'hearts' } },
        { input: 'QD', expected: { rank: 'Q', suit: 'diamonds' } },
        { input: 'JC', expected: { rank: 'J', suit: 'clubs' } },
        { input: 'Ts', expected: { rank: 'T', suit: 'spades' } },
        { input: '9h', expected: { rank: '9', suit: 'hearts' } },
        { input: '2d', expected: { rank: '2', suit: 'diamonds' } }
      ]
      
      testCases.forEach(({ input, expected }) => {
        expect(CardUtils.stringToCard(input)).toEqual(expected)
      })
    })

    it('should handle lowercase suit letters', () => {
      expect(CardUtils.stringToCard('Ah')).toEqual({ rank: 'A', suit: 'hearts' })
      expect(CardUtils.stringToCard('Kd')).toEqual({ rank: 'K', suit: 'diamonds' })
      expect(CardUtils.stringToCard('Qc')).toEqual({ rank: 'Q', suit: 'clubs' })
      expect(CardUtils.stringToCard('Js')).toEqual({ rank: 'J', suit: 'spades' })
    })

    it('should be inverse of cardToString', () => {
      const deck = CardUtils.createDeck()
      
      deck.forEach(card => {
        const cardString = CardUtils.cardToString(card)
        const parsedCard = CardUtils.stringToCard(cardString)
        expect(parsedCard).toEqual(card)
      })
    })
  })

  describe('getRankValue', () => {
    it('should return correct numeric values', () => {
      const expectedValues: Record<Card['rank'], number> = {
        '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9,
        'T': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14
      }
      
      Object.entries(expectedValues).forEach(([rank, expectedValue]) => {
        expect(CardUtils.getRankValue(rank as Card['rank'])).toBe(expectedValue)
      })
    })

    it('should handle ace as high card (14)', () => {
      expect(CardUtils.getRankValue('A')).toBe(14)
    })

    it('should return values in ascending order', () => {
      const ranks: Card['rank'][] = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A']
      const values = ranks.map(rank => CardUtils.getRankValue(rank))
      
      for (let i = 1; i < values.length; i++) {
        expect(values[i]).toBeGreaterThan(values[i - 1])
      }
    })

    it('should have face cards in correct order', () => {
      expect(CardUtils.getRankValue('J')).toBeLessThan(CardUtils.getRankValue('Q'))
      expect(CardUtils.getRankValue('Q')).toBeLessThan(CardUtils.getRankValue('K'))
      expect(CardUtils.getRankValue('K')).toBeLessThan(CardUtils.getRankValue('A'))
    })
  })
})