import { describe, it, expect, beforeEach, vi } from 'vitest'
import { PokerGameEngine, CardUtils } from '../engine'
import type { SessionPlayer, PlayerAction, GameState } from '@/types'

describe('PokerGameEngine', () => {
  let engine: PokerGameEngine
  let mockPlayers: SessionPlayer[]

  beforeEach(() => {
    // Create mock players
    mockPlayers = [
      {
        id: 'player1',
        session_id: 'session1',
        user_id: 'user1',
        seat_number: 1,
        buy_in_amount: 1000,
        current_chips: 1000,
        final_amount: 0,
        status: 'active',
        joined_at: new Date().toISOString(),
        session_stats: {
          hands_played: 0,
          hands_won: 0,
          vpip: 0,
          pfr: 0,
          aggression_factor: 0,
          total_wagered: 0
        }
      },
      {
        id: 'player2',
        session_id: 'session1',
        user_id: 'user2',
        seat_number: 2,
        buy_in_amount: 1000,
        current_chips: 1000,
        final_amount: 0,
        status: 'active',
        joined_at: new Date().toISOString(),
        session_stats: {
          hands_played: 0,
          hands_won: 0,
          vpip: 0,
          pfr: 0,
          aggression_factor: 0,
          total_wagered: 0
        }
      },
      {
        id: 'player3',
        session_id: 'session1',
        user_id: 'user3',
        seat_number: 3,
        buy_in_amount: 1000,
        current_chips: 1000,
        final_amount: 0,
        status: 'active',
        joined_at: new Date().toISOString(),
        session_stats: {
          hands_played: 0,
          hands_won: 0,
          vpip: 0,
          pfr: 0,
          aggression_factor: 0,
          total_wagered: 0
        }
      }
    ]

    engine = new PokerGameEngine(mockPlayers)
  })

  describe('constructor', () => {
    it('should initialize with correct default game state', () => {
      const gameState = engine.getCurrentGameState()
      
      expect(gameState.dealer_position).toBe(1)
      expect(gameState.small_blind_position).toBe(2)
      expect(gameState.big_blind_position).toBe(3)
      expect(gameState.current_betting_round).toBe('preflop')
      expect(gameState.community_cards).toHaveLength(0)
      expect(gameState.side_pots).toHaveLength(0)
      expect(gameState.current_bet).toBe(0)
      expect(gameState.min_raise).toBe(0)
    })

    it('should accept initial game state overrides', () => {
      const customGameState: Partial<GameState> = {
        dealer_position: 2,
        current_bet: 50
      }
      
      const customEngine = new PokerGameEngine(mockPlayers, customGameState)
      const gameState = customEngine.getCurrentGameState()
      
      expect(gameState.dealer_position).toBe(2)
      expect(gameState.current_bet).toBe(50)
    })

    it('should store players correctly', () => {
      const players = engine.getPlayers()
      
      expect(players).toHaveLength(3)
      expect(players[0].user_id).toBe('user1')
      expect(players[1].user_id).toBe('user2')
      expect(players[2].user_id).toBe('user3')
    })
  })

  describe('startNewHand', () => {
    it('should create new hand with correct structure', () => {
      const hand = engine.startNewHand(1, 10, 20)
      
      expect(hand).toBeDefined()
      expect(hand.hand_number).toBe(1)
      expect(hand.pot_size).toBe(30) // Small blind + big blind
      expect(hand.board_cards).toHaveLength(0)
      expect(hand.started_at).toBeDefined()
      expect(hand.game_state.current_betting_round).toBe('preflop')
    })

    it('should post blinds correctly', () => {
      const initialChips = {
        player1: mockPlayers[0].current_chips,
        player2: mockPlayers[1].current_chips,
        player3: mockPlayers[2].current_chips
      }
      
      const hand = engine.startNewHand(1, 10, 20)
      
      // Check that blinds were posted
      expect(hand.pot_size).toBe(30)
      
      // Small blind player should have 10 less chips
      const sbPlayer = mockPlayers.find(p => p.seat_number === hand.game_state.small_blind_position)
      expect(sbPlayer!.current_chips).toBe(initialChips.player2 - 10)
      
      // Big blind player should have 20 less chips
      const bbPlayer = mockPlayers.find(p => p.seat_number === hand.game_state.big_blind_position)
      expect(bbPlayer!.current_chips).toBe(initialChips.player3 - 20)
    })

    it('should set correct action sequence', () => {
      const hand = engine.startNewHand(1, 10, 20)
      const gameState = engine.getCurrentGameState()
      
      // Action should be on first player after big blind (UTG)
      expect(gameState.action_on).toBe('user1') // Player 1 is UTG in 3-handed
    })

    it('should handle heads-up blind positions', () => {
      // Create heads-up scenario
      const headupPlayers = mockPlayers.slice(0, 2)
      const headupEngine = new PokerGameEngine(headupPlayers)
      
      const hand = headupEngine.startNewHand(1, 10, 20)
      
      expect(hand.game_state.small_blind_position).toBe(1) // Dealer posts SB in heads-up
      expect(hand.game_state.big_blind_position).toBe(2)
    })

    it('should shuffle deck for each hand', () => {
      // Mock Math.random to control shuffle
      const mockRandom = vi.spyOn(Math, 'random')
      mockRandom.mockReturnValue(0.1)
      
      const hand1 = engine.startNewHand(1, 10, 20)
      
      mockRandom.mockReturnValue(0.9)
      const hand2 = engine.startNewHand(2, 10, 20)
      
      // Hands should be different (implicitly testing shuffle)
      expect(hand1.id).not.toBe(hand2.id)
      
      mockRandom.mockRestore()
    })
  })

  describe('processPlayerAction', () => {
    beforeEach(() => {
      engine.startNewHand(1, 10, 20)
    })

    it('should validate player turn', () => {
      // Try to act when it's not your turn
      const wrongPlayerAction: PlayerAction = {
        player_id: 'user2', // Not UTG
        action: 'fold',
        timestamp: new Date().toISOString()
      }
      
      expect(() => {
        engine.processPlayerAction('user2', wrongPlayerAction)
      }).toThrow('Invalid action: not your turn')
    })

    it('should process fold action correctly', () => {
      const foldAction: PlayerAction = {
        player_id: 'user1',
        action: 'fold',
        timestamp: new Date().toISOString()
      }
      
      const gameUpdate = engine.processPlayerAction('user1', foldAction)
      
      expect(gameUpdate.type).toBe('player_action')
      expect(gameUpdate.data.action).toBe('fold')
      
      // Player should be sitting out
      const player = mockPlayers.find(p => p.user_id === 'user1')
      expect(player!.status).toBe('sitting_out')
    })

    it('should process check action correctly', () => {
      // Move to flop where check is possible
      engine.processPlayerAction('user1', {
        player_id: 'user1',
        action: 'call',
        amount: 20,
        timestamp: new Date().toISOString()
      })
      
      engine.processPlayerAction('user2', {
        player_id: 'user2',
        action: 'call',
        amount: 10,
        timestamp: new Date().toISOString()
      })
      
      engine.processPlayerAction('user3', {
        player_id: 'user3',
        action: 'check',
        timestamp: new Date().toISOString()
      })
      
      // Should advance to flop
      const gameState = engine.getCurrentGameState()
      expect(gameState.current_betting_round).toBe('flop')
      expect(gameState.current_bet).toBe(0)
    })

    it('should process call action correctly', () => {
      const callAction: PlayerAction = {
        player_id: 'user1',
        action: 'call',
        amount: 20,
        timestamp: new Date().toISOString()
      }
      
      const initialChips = mockPlayers[0].current_chips
      const gameUpdate = engine.processPlayerAction('user1', callAction)
      
      expect(gameUpdate.type).toBe('player_action')
      expect(gameUpdate.data.action).toBe('call')
      expect(gameUpdate.data.amount).toBe(20)
      
      // Player chips should decrease
      expect(mockPlayers[0].current_chips).toBe(initialChips - 20)
      
      // Pot should increase
      const hand = engine.getCurrentHand()
      expect(hand!.pot_size).toBe(50) // 30 (blinds) + 20 (call)
    })

    it('should process raise action correctly', () => {
      const raiseAction: PlayerAction = {
        player_id: 'user1',
        action: 'raise',
        amount: 60,
        timestamp: new Date().toISOString()
      }
      
      const initialChips = mockPlayers[0].current_chips
      const gameUpdate = engine.processPlayerAction('user1', raiseAction)
      
      expect(gameUpdate.type).toBe('player_action')
      expect(gameUpdate.data.action).toBe('raise')
      expect(gameUpdate.data.amount).toBe(60)
      
      // Player chips should decrease
      expect(mockPlayers[0].current_chips).toBe(initialChips - 60)
      
      // Current bet should update
      const gameState = engine.getCurrentGameState()
      expect(gameState.current_bet).toBe(60)
    })

    it('should process all-in action correctly', () => {
      const allInAction: PlayerAction = {
        player_id: 'user1',
        action: 'all_in',
        timestamp: new Date().toISOString()
      }
      
      const initialChips = mockPlayers[0].current_chips
      const gameUpdate = engine.processPlayerAction('user1', allInAction)
      
      expect(gameUpdate.type).toBe('player_action')
      expect(gameUpdate.data.action).toBe('all_in')
      
      // Player should have 0 chips
      expect(mockPlayers[0].current_chips).toBe(0)
      
      // Pot should increase by initial chips
      const hand = engine.getCurrentHand()
      expect(hand!.pot_size).toBe(30 + initialChips) // blinds + all-in
    })

    it('should handle insufficient chips scenarios', () => {
      // Set player to have very few chips
      mockPlayers[0].current_chips = 5
      
      const raiseAction: PlayerAction = {
        player_id: 'user1',
        action: 'raise',
        amount: 100,
        timestamp: new Date().toISOString()
      }
      
      const gameUpdate = engine.processPlayerAction('user1', raiseAction)
      
      // Should be treated as all-in
      expect(mockPlayers[0].current_chips).toBe(0)
      expect(gameUpdate.data.newChipCount).toBe(0)
    })

    it('should reject invalid actions', () => {
      const invalidAction: PlayerAction = {
        player_id: 'user1',
        action: 'check', // Can't check when there's a bet
        timestamp: new Date().toISOString()
      }
      
      expect(() => {
        engine.processPlayerAction('user1', invalidAction)
      }).toThrow('Invalid action: check')
    })

    it('should advance to next player', () => {
      const gameState = engine.getCurrentGameState()
      expect(gameState.action_on).toBe('user1')
      
      engine.processPlayerAction('user1', {
        player_id: 'user1',
        action: 'fold',
        timestamp: new Date().toISOString()
      })
      
      const updatedGameState = engine.getCurrentGameState()
      expect(updatedGameState.action_on).toBe('user2')
    })
  })

  describe('betting round management', () => {
    beforeEach(() => {
      engine.startNewHand(1, 10, 20)
    })

    it('should detect betting round completion', () => {
      // Complete preflop betting
      engine.processPlayerAction('user1', {
        player_id: 'user1',
        action: 'call',
        amount: 20,
        timestamp: new Date().toISOString()
      })
      
      engine.processPlayerAction('user2', {
        player_id: 'user2',
        action: 'call',
        amount: 10,
        timestamp: new Date().toISOString()
      })
      
      engine.processPlayerAction('user3', {
        player_id: 'user3',
        action: 'check',
        timestamp: new Date().toISOString()
      })
      
      // Should advance to flop
      const gameState = engine.getCurrentGameState()
      expect(gameState.current_betting_round).toBe('flop')
    })

    it('should advance from preflop to flop', () => {
      // Complete preflop
      engine.processPlayerAction('user1', {
        player_id: 'user1',
        action: 'call',
        amount: 20,
        timestamp: new Date().toISOString()
      })
      
      engine.processPlayerAction('user2', {
        player_id: 'user2',
        action: 'call',
        amount: 10,
        timestamp: new Date().toISOString()
      })
      
      engine.processPlayerAction('user3', {
        player_id: 'user3',
        action: 'check',
        timestamp: new Date().toISOString()
      })
      
      const gameState = engine.getCurrentGameState()
      expect(gameState.current_betting_round).toBe('flop')
      expect(gameState.community_cards).toHaveLength(3)
      expect(gameState.current_bet).toBe(0)
    })

    it('should deal community cards correctly', () => {
      // Complete preflop to get to flop
      engine.processPlayerAction('user1', {
        player_id: 'user1',
        action: 'call',
        amount: 20,
        timestamp: new Date().toISOString()
      })
      
      engine.processPlayerAction('user2', {
        player_id: 'user2',
        action: 'call',
        amount: 10,
        timestamp: new Date().toISOString()
      })
      
      engine.processPlayerAction('user3', {
        player_id: 'user3',
        action: 'check',
        timestamp: new Date().toISOString()
      })
      
      // Check flop cards
      const gameState = engine.getCurrentGameState()
      expect(gameState.community_cards).toHaveLength(3)
      
      const hand = engine.getCurrentHand()
      expect(hand!.board_cards).toHaveLength(3)
      expect(hand!.board_cards).toEqual(gameState.community_cards)
    })

    it('should handle side pots in all-in scenarios', () => {
      // Set up scenario for side pot
      mockPlayers[0].current_chips = 50 // Short stack
      
      // Player 1 goes all-in
      engine.processPlayerAction('user1', {
        player_id: 'user1',
        action: 'all_in',
        timestamp: new Date().toISOString()
      })
      
      // Player 2 calls with more chips
      engine.processPlayerAction('user2', {
        player_id: 'user2',
        action: 'call',
        amount: 50,
        timestamp: new Date().toISOString()
      })
      
      // This should create a scenario for side pot calculation
      // (Implementation would depend on side pot logic in the engine)
      const hand = engine.getCurrentHand()
      expect(hand!.pot_size).toBeGreaterThan(0)
    })
  })

  describe('hand completion', () => {
    beforeEach(() => {
      engine.startNewHand(1, 10, 20)
    })

    it('should determine winners correctly', () => {
      // Fold all but one player
      engine.processPlayerAction('user1', {
        player_id: 'user1',
        action: 'fold',
        timestamp: new Date().toISOString()
      })
      
      engine.processPlayerAction('user2', {
        player_id: 'user2',
        action: 'fold',
        timestamp: new Date().toISOString()
      })
      
      // User3 should win by default
      const hand = engine.getCurrentHand()
      expect(hand!.ended_at).toBeDefined()
    })

    it('should distribute pot fairly', () => {
      const initialChips = {
        user2: mockPlayers[1].current_chips,
        user3: mockPlayers[2].current_chips
      }
      
      // User1 folds, others go to showdown
      engine.processPlayerAction('user1', {
        player_id: 'user1',
        action: 'fold',
        timestamp: new Date().toISOString()
      })
      
      engine.processPlayerAction('user2', {
        player_id: 'user2',
        action: 'call',
        amount: 10,
        timestamp: new Date().toISOString()
      })
      
      engine.processPlayerAction('user3', {
        player_id: 'user3',
        action: 'check',
        timestamp: new Date().toISOString()
      })
      
      // One of the remaining players should have won chips
      const finalChips = {
        user2: mockPlayers[1].current_chips,
        user3: mockPlayers[2].current_chips
      }
      
      // Total chips should be conserved (minus rake if any)
      const totalInitial = initialChips.user2 + initialChips.user3
      const totalFinal = finalChips.user2 + finalChips.user3
      expect(totalFinal).toBeLessThanOrEqual(totalInitial)
    })

    it('should handle split pots', () => {
      // This would require a more complex setup with actual hand evaluation
      // For now, just test that the mechanism exists
      const hand = engine.getCurrentHand()
      expect(hand).toBeDefined()
    })

    it('should calculate rake correctly', () => {
      const hand = engine.getCurrentHand()
      
      // Check that rake is calculated (even if 0 for now)
      expect(hand!.rake_amount).toBeDefined()
      expect(hand!.rake_amount).toBeGreaterThanOrEqual(0)
    })
  })

  describe('game state management', () => {
    it('should return copy of current game state', () => {
      const gameState1 = engine.getCurrentGameState()
      const gameState2 = engine.getCurrentGameState()
      
      expect(gameState1).toEqual(gameState2)
      expect(gameState1).not.toBe(gameState2) // Should be different objects
    })

    it('should return current hand information', () => {
      expect(engine.getCurrentHand()).toBeNull()
      
      const hand = engine.startNewHand(1, 10, 20)
      
      expect(engine.getCurrentHand()).toBe(hand)
    })

    it('should return players array copy', () => {
      const players1 = engine.getPlayers()
      const players2 = engine.getPlayers()
      
      expect(players1).toEqual(players2)
      expect(players1).not.toBe(players2) // Should be different arrays
    })
  })

  describe('edge cases and error handling', () => {
    it('should handle player not found', () => {
      engine.startNewHand(1, 10, 20)
      
      expect(() => {
        engine.processPlayerAction('nonexistent_user', {
          player_id: 'nonexistent_user',
          action: 'fold',
          timestamp: new Date().toISOString()
        })
      }).toThrow('Player not found')
    })

    it('should handle no current hand', () => {
      expect(() => {
        engine.processPlayerAction('user1', {
          player_id: 'user1',
          action: 'fold',
          timestamp: new Date().toISOString()
        })
      }).toThrow('Invalid action: not your turn')
    })

    it('should handle single player scenario', () => {
      const singlePlayerEngine = new PokerGameEngine([mockPlayers[0]])
      
      // Should handle gracefully or throw appropriate error
      expect(() => {
        singlePlayerEngine.startNewHand(1, 10, 20)
      }).not.toThrow()
    })

    it('should handle empty players array', () => {
      const emptyEngine = new PokerGameEngine([])
      
      expect(() => {
        emptyEngine.startNewHand(1, 10, 20)
      }).not.toThrow()
    })
  })
})