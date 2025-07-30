import { describe, it, expect, beforeEach, vi } from 'vitest'
import { CardUtils } from '../engine'
import type { Card } from '@/types'

describe('CardUtils - Comprehensive Tests', () => {
  
  describe('Deck Creation', () => {
    it('should create a standard 52-card deck', () => {
      const deck = CardUtils.createDeck()
      
      expect(deck).toHaveLength(52)
      
      // Check all suits are present
      const suits = [...new Set(deck.map(card => card.suit))]
      expect(suits).toHaveLength(4)
      expect(suits).toEqual(expect.arrayContaining(['hearts', 'diamonds', 'clubs', 'spades']))
      
      // Check all ranks are present
      const ranks = [...new Set(deck.map(card => card.rank))]
      expect(ranks).toHaveLength(13)
      expect(ranks).toEqual(expect.arrayContaining(['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A']))
    })

    it('should create deck with correct distribution', () => {
      const deck = CardUtils.createDeck()
      
      // Each suit should have 13 cards
      const heartCards = deck.filter(card => card.suit === 'hearts')
      const diamondCards = deck.filter(card => card.suit === 'diamonds')
      const clubCards = deck.filter(card => card.suit === 'clubs')
      const spadeCards = deck.filter(card => card.suit === 'spades')
      
      expect(heartCards).toHaveLength(13)
      expect(diamondCards).toHaveLength(13)
      expect(clubCards).toHaveLength(13)
      expect(spadeCards).toHaveLength(13)
      
      // Each rank should have 4 cards
      for (const rank of CardUtils.RANKS) {
        const rankCards = deck.filter(card => card.rank === rank)
        expect(rankCards).toHaveLength(4)
      }
    })

    it('should create unique cards in deck', () => {
      const deck = CardUtils.createDeck()
      const cardStrings = deck.map(card => `${card.rank}${card.suit}`)
      const uniqueCardStrings = [...new Set(cardStrings)]
      
      expect(cardStrings).toHaveLength(uniqueCardStrings.length)
    })

    it('should create new deck instances', () => {
      const deck1 = CardUtils.createDeck()
      const deck2 = CardUtils.createDeck()
      
      expect(deck1).not.toBe(deck2) // Different object references
      expect(deck1).toEqual(deck2) // Same content
    })
  })

  describe('Deck Shuffling', () => {
    it('should shuffle deck and return different order', () => {
      const originalDeck = CardUtils.createDeck()
      const shuffledDeck = CardUtils.shuffleDeck(originalDeck)
      
      expect(shuffledDeck).toHaveLength(originalDeck.length)
      expect(shuffledDeck).not.toBe(originalDeck) // Different object reference
      
      // Should contain same cards but likely different order
      expect(shuffledDeck).toEqual(expect.arrayContaining(originalDeck))
      
      // High probability that order is different (not 100% guaranteed but very likely)
      const sameOrder = shuffledDeck.every((card, index) => 
        card.suit === originalDeck[index].suit && card.rank === originalDeck[index].rank
      )
      expect(sameOrder).toBe(false)
    })

    it('should not modify original deck', () => {
      const originalDeck = CardUtils.createDeck()
      const originalFirstCard = { ...originalDeck[0] }
      const originalLastCard = { ...originalDeck[51] }
      
      CardUtils.shuffleDeck(originalDeck)
      
      expect(originalDeck[0]).toEqual(originalFirstCard)
      expect(originalDeck[51]).toEqual(originalLastCard)
    })

    it('should produce different shuffles each time', () => {
      const deck = CardUtils.createDeck()
      const shuffle1 = CardUtils.shuffleDeck(deck)
      const shuffle2 = CardUtils.shuffleDeck(deck)
      const shuffle3 = CardUtils.shuffleDeck(deck)
      
      // High probability all three shuffles are different
      const shuffle1Str = shuffle1.map(c => `${c.rank}${c.suit}`).join('')
      const shuffle2Str = shuffle2.map(c => `${c.rank}${c.suit}`).join('')
      const shuffle3Str = shuffle3.map(c => `${c.rank}${c.suit}`).join('')
      
      expect(shuffle1Str).not.toBe(shuffle2Str)
      expect(shuffle2Str).not.toBe(shuffle3Str)
      expect(shuffle1Str).not.toBe(shuffle3Str)
    })

    it('should handle empty deck', () => {
      const emptyDeck: Card[] = []
      const shuffled = CardUtils.shuffleDeck(emptyDeck)
      
      expect(shuffled).toHaveLength(0)
      expect(shuffled).toEqual([])
    })

    it('should handle single card deck', () => {
      const singleCardDeck: Card[] = [{ suit: 'hearts', rank: 'A' }]
      const shuffled = CardUtils.shuffleDeck(singleCardDeck)
      
      expect(shuffled).toHaveLength(1)
      expect(shuffled[0]).toEqual({ suit: 'hearts', rank: 'A' })
    })

    it('should use deterministic shuffle with mocked random', () => {
      const mockRandom = vi.spyOn(Math, 'random')
      mockRandom.mockReturnValue(0.1) // Fixed value
      
      const deck = CardUtils.createDeck()
      const shuffle1 = CardUtils.shuffleDeck(deck)
      const shuffle2 = CardUtils.shuffleDeck(deck)
      
      expect(shuffle1).toEqual(shuffle2)
      
      mockRandom.mockRestore()
    })
  })

  describe('Card String Conversion', () => {
    it('should convert card to string correctly', () => {
      const testCases: Array<{ card: Card; expected: string }> = [
        { card: { suit: 'hearts', rank: 'A' }, expected: 'AH' },
        { card: { suit: 'diamonds', rank: 'K' }, expected: 'KD' },
        { card: { suit: 'clubs', rank: 'Q' }, expected: 'QC' },
        { card: { suit: 'spades', rank: 'J' }, expected: 'JS' },
        { card: { suit: 'hearts', rank: 'T' }, expected: 'TH' },
        { card: { suit: 'diamonds', rank: '9' }, expected: '9D' },
        { card: { suit: 'clubs', rank: '2' }, expected: '2C' }
      ]
      
      testCases.forEach(({ card, expected }) => {
        expect(CardUtils.cardToString(card)).toBe(expected)
      })
    })

    it('should convert all ranks correctly', () => {
      for (const rank of CardUtils.RANKS) {
        const card: Card = { suit: 'hearts', rank }
        const cardString = CardUtils.cardToString(card)
        
        expect(cardString).toBe(`${rank}H`)
        expect(cardString).toHaveLength(2)
      }
    })

    it('should convert all suits correctly', () => {
      for (const suit of CardUtils.SUITS) {
        const card: Card = { suit, rank: 'A' }
        const cardString = CardUtils.cardToString(card)
        const expectedSuit = suit[0].toUpperCase()
        
        expect(cardString).toBe(`A${expectedSuit}`)
      }
    })

    it('should handle case consistency', () => {
      const card: Card = { suit: 'hearts', rank: 'A' }
      const cardString = CardUtils.cardToString(card)
      
      expect(cardString).toBe('AH') // Uppercase
      expect(cardString).not.toBe('ah')
      expect(cardString).not.toBe('Ah')
    })
  })

  describe('String to Card Conversion', () => {
    it('should convert string to card correctly', () => {
      const testCases: Array<{ cardString: string; expected: Card }> = [
        { cardString: 'AH', expected: { suit: 'hearts', rank: 'A' } },
        { cardString: 'KD', expected: { suit: 'diamonds', rank: 'K' } },
        { cardString: 'QC', expected: { suit: 'clubs', rank: 'Q' } },
        { cardString: 'JS', expected: { suit: 'spades', rank: 'J' } },
        { cardString: 'TH', expected: { suit: 'hearts', rank: 'T' } },
        { cardString: '9D', expected: { suit: 'diamonds', rank: '9' } },
        { cardString: '2C', expected: { suit: 'clubs', rank: '2' } }
      ]
      
      testCases.forEach(({ cardString, expected }) => {
        expect(CardUtils.stringToCard(cardString)).toEqual(expected)
      })
    })

    it('should handle lowercase suit characters', () => {
      const testCases = [
        { input: 'Ah', expected: { suit: 'hearts', rank: 'A' } },
        { input: 'Kd', expected: { suit: 'diamonds', rank: 'K' } },
        { input: 'Qc', expected: { suit: 'clubs', rank: 'Q' } },
        { input: 'Js', expected: { suit: 'spades', rank: 'J' } }
      ]
      
      testCases.forEach(({ input, expected }) => {
        expect(CardUtils.stringToCard(input)).toEqual(expected)
      })
    })

    it('should be inverse of cardToString', () => {
      const originalCard: Card = { suit: 'spades', rank: 'K' }
      const cardString = CardUtils.cardToString(originalCard)
      const convertedCard = CardUtils.stringToCard(cardString)
      
      expect(convertedCard).toEqual(originalCard)
    })

    it('should handle all valid card combinations', () => {
      for (const suit of CardUtils.SUITS) {
        for (const rank of CardUtils.RANKS) {
          const originalCard: Card = { suit, rank }
          const cardString = CardUtils.cardToString(originalCard)
          const convertedCard = CardUtils.stringToCard(cardString)
          
          expect(convertedCard).toEqual(originalCard)
        }
      }
    })
  })

  describe('Rank Value Calculation', () => {
    it('should return correct numeric values for all ranks', () => {
      const expectedValues: Record<Card['rank'], number> = {
        '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9,
        'T': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14
      }
      
      for (const [rank, expectedValue] of Object.entries(expectedValues)) {
        expect(CardUtils.getRankValue(rank as Card['rank'])).toBe(expectedValue)
      }
    })

    it('should maintain proper ordering for comparisons', () => {
      const ranks: Card['rank'][] = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A']
      
      for (let i = 0; i < ranks.length - 1; i++) {
        const currentValue = CardUtils.getRankValue(ranks[i])
        const nextValue = CardUtils.getRankValue(ranks[i + 1])
        
        expect(nextValue).toBeGreaterThan(currentValue)
      }
    })

    it('should handle ace high properly', () => {
      const aceValue = CardUtils.getRankValue('A')
      const kingValue = CardUtils.getRankValue('K')
      const twoValue = CardUtils.getRankValue('2')
      
      expect(aceValue).toBeGreaterThan(kingValue)
      expect(aceValue).toBeGreaterThan(twoValue)
      expect(aceValue).toBe(14)
    })

    it('should be consistent across multiple calls', () => {
      const rank: Card['rank'] = 'Q'
      const value1 = CardUtils.getRankValue(rank)
      const value2 = CardUtils.getRankValue(rank)
      const value3 = CardUtils.getRankValue(rank)
      
      expect(value1).toBe(value2)
      expect(value2).toBe(value3)
      expect(value1).toBe(12)
    })
  })

  describe('Constants Validation', () => {
    it('should have correct SUITS constant', () => {
      expect(CardUtils.SUITS).toEqual(['hearts', 'diamonds', 'clubs', 'spades'])
      expect(CardUtils.SUITS).toHaveLength(4)
      
      // Should be readonly/immutable
      expect(() => {
        (CardUtils.SUITS as any).push('invalid')
      }).toThrow()
    })

    it('should have correct RANKS constant', () => {
      expect(CardUtils.RANKS).toEqual(['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A'])
      expect(CardUtils.RANKS).toHaveLength(13)
      
      // Should be readonly/immutable
      expect(() => {
        (CardUtils.RANKS as any).push('X')
      }).toThrow()
    })

    it('should have proper typing for constants', () => {
      // Type assertions to ensure proper TypeScript typing
      const suit: typeof CardUtils.SUITS[number] = 'hearts'
      const rank: typeof CardUtils.RANKS[number] = 'A'
      
      expect(CardUtils.SUITS.includes(suit)).toBe(true)
      expect(CardUtils.RANKS.includes(rank)).toBe(true)
    })
  })

  describe('Performance Tests', () => {
    it('should create deck efficiently', () => {
      const startTime = performance.now()
      
      for (let i = 0; i < 1000; i++) {
        CardUtils.createDeck()
      }
      
      const endTime = performance.now()
      const executionTime = endTime - startTime
      
      // Should create 1000 decks quickly (< 100ms)
      expect(executionTime).toBeLessThan(100)
    })

    it('should shuffle deck efficiently', () => {
      const deck = CardUtils.createDeck()
      const startTime = performance.now()
      
      for (let i = 0; i < 1000; i++) {
        CardUtils.shuffleDeck(deck)
      }
      
      const endTime = performance.now()
      const executionTime = endTime - startTime
      
      // Should shuffle 1000 times quickly (< 100ms)
      expect(executionTime).toBeLessThan(100)
    })

    it('should convert cards to strings efficiently', () => {
      const deck = CardUtils.createDeck()
      const startTime = performance.now()
      
      for (let i = 0; i < 10000; i++) {
        for (const card of deck) {
          CardUtils.cardToString(card)
        }
      }
      
      const endTime = performance.now()
      const executionTime = endTime - startTime
      
      // Should convert 520,000 cards quickly (< 500ms)
      expect(executionTime).toBeLessThan(500)
    })

    it('should calculate rank values efficiently', () => {
      const startTime = performance.now()
      
      for (let i = 0; i < 100000; i++) {
        for (const rank of CardUtils.RANKS) {
          CardUtils.getRankValue(rank)
        }
      }
      
      const endTime = performance.now()
      const executionTime = endTime - startTime
      
      // Should calculate 1,300,000 rank values quickly (< 100ms)
      expect(executionTime).toBeLessThan(100)
    })
  })

  describe('Memory and Resource Management', () => {
    it('should not leak memory when creating many decks', () => {
      const initialMemory = process.memoryUsage().heapUsed
      
      // Create and discard many decks
      for (let i = 0; i < 10000; i++) {
        const deck = CardUtils.createDeck()
        CardUtils.shuffleDeck(deck)
      }
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc()
      }
      
      const finalMemory = process.memoryUsage().heapUsed
      const memoryIncrease = finalMemory - initialMemory
      
      // Memory increase should be reasonable (< 50MB)
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024)
    })

    it('should handle large numbers of conversions without issues', () => {
      const deck = CardUtils.createDeck()
      
      // Convert each card many times
      for (let i = 0; i < 1000; i++) {
        for (const card of deck) {
          const cardString = CardUtils.cardToString(card)
          const convertedBack = CardUtils.stringToCard(cardString)
          expect(convertedBack).toEqual(card)
        }
      }
    })
  })

  describe('Edge Cases and Error Handling', () => {
    it('should handle invalid suit characters in stringToCard', () => {
      expect(() => CardUtils.stringToCard('AX')).not.toThrow()
      // Implementation might return undefined or default, but shouldn't crash
    })

    it('should handle invalid rank characters in stringToCard', () => {
      expect(() => CardUtils.stringToCard('XH')).not.toThrow()
      // Implementation might return undefined or default, but shouldn't crash
    })

    it('should handle empty string in stringToCard', () => {
      expect(() => CardUtils.stringToCard('')).not.toThrow()
    })

    it('should handle single character string in stringToCard', () => {
      expect(() => CardUtils.stringToCard('A')).not.toThrow()
    })

    it('should handle very large deck shuffling', () => {
      // Create abnormally large deck for stress testing
      const largeDeck: Card[] = []
      for (let i = 0; i < 1000; i++) {
        largeDeck.push(...CardUtils.createDeck())
      }
      
      expect(() => CardUtils.shuffleDeck(largeDeck)).not.toThrow()
      expect(CardUtils.shuffleDeck(largeDeck)).toHaveLength(52000)
    })
  })
})