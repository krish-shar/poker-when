import { Card, Hand, GameState, SessionPlayer, PlayerAction, AvailableAction } from '@/types'

// Card utilities
export class CardUtils {
  static readonly SUITS = ['hearts', 'diamonds', 'clubs', 'spades'] as const
  static readonly RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A'] as const

  static createDeck(): Card[] {
    const deck: Card[] = []
    for (const suit of this.SUITS) {
      for (const rank of this.RANKS) {
        deck.push({ suit, rank })
      }
    }
    return deck
  }

  static shuffleDeck(deck: Card[]): Card[] {
    const shuffled = [...deck]
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }
    return shuffled
  }

  static cardToString(card: Card): string {
    return `${card.rank}${card.suit[0].toUpperCase()}`
  }

  static stringToCard(cardString: string): Card {
    const rank = cardString[0] as Card['rank']
    const suitChar = cardString[1].toLowerCase()
    const suitMap: Record<string, Card['suit']> = {
      'h': 'hearts',
      'd': 'diamonds',
      'c': 'clubs',
      's': 'spades'
    }
    return { rank, suit: suitMap[suitChar] }
  }

  static getRankValue(rank: Card['rank']): number {
    const rankValues: Record<Card['rank'], number> = {
      '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9,
      'T': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14
    }
    return rankValues[rank]
  }
}

// Hand evaluation
export class HandEvaluator {
  static evaluateHand(cards: Card[]): HandRanking {
    if (cards.length < 5) {
      throw new Error('Need at least 5 cards to evaluate hand')
    }

    // Get best 5-card combination
    const combinations = this.getCombinations(cards, 5)
    let bestRanking: HandRanking | null = null

    for (const combo of combinations) {
      const ranking = this.evaluateFiveCards(combo)
      if (!bestRanking || ranking.rank > bestRanking.rank) {
        bestRanking = ranking
      }
    }

    return bestRanking!
  }

  private static getCombinations(cards: Card[], size: number): Card[][] {
    if (size > cards.length) return []
    if (size === 1) return cards.map(card => [card])
    if (size === cards.length) return [cards]

    const combinations: Card[][] = []
    for (let i = 0; i <= cards.length - size; i++) {
      const smallerCombos = this.getCombinations(cards.slice(i + 1), size - 1)
      for (const combo of smallerCombos) {
        combinations.push([cards[i], ...combo])
      }
    }
    return combinations
  }

  private static evaluateFiveCards(cards: Card[]): HandRanking {
    const sortedCards = [...cards].sort((a, b) => CardUtils.getRankValue(b.rank) - CardUtils.getRankValue(a.rank))
    
    const isFlush = this.isFlush(sortedCards)
    const isStraight = this.isStraight(sortedCards)
    const rankCounts = this.getRankCounts(sortedCards)
    const counts = Object.values(rankCounts).sort((a, b) => b - a)

    if (isStraight && isFlush) {
      if (sortedCards[0].rank === 'A' && sortedCards[1].rank === 'K') {
        return { rank: 9, name: 'Royal Flush', cards: sortedCards }
      }
      return { rank: 8, name: 'Straight Flush', cards: sortedCards }
    }

    if (counts[0] === 4) {
      return { rank: 7, name: 'Four of a Kind', cards: sortedCards }
    }

    if (counts[0] === 3 && counts[1] === 2) {
      return { rank: 6, name: 'Full House', cards: sortedCards }
    }

    if (isFlush) {
      return { rank: 5, name: 'Flush', cards: sortedCards }
    }

    if (isStraight) {
      return { rank: 4, name: 'Straight', cards: sortedCards }
    }

    if (counts[0] === 3) {
      return { rank: 3, name: 'Three of a Kind', cards: sortedCards }
    }

    if (counts[0] === 2 && counts[1] === 2) {
      return { rank: 2, name: 'Two Pair', cards: sortedCards }
    }

    if (counts[0] === 2) {
      return { rank: 1, name: 'One Pair', cards: sortedCards }
    }

    return { rank: 0, name: 'High Card', cards: sortedCards }
  }

  private static isFlush(cards: Card[]): boolean {
    const firstSuit = cards[0].suit
    return cards.every(card => card.suit === firstSuit)
  }

  private static isStraight(cards: Card[]): boolean {
    const ranks = cards.map(card => CardUtils.getRankValue(card.rank)).sort((a, b) => b - a)
    
    // Check for normal straight
    for (let i = 0; i < ranks.length - 1; i++) {
      if (ranks[i] - ranks[i + 1] !== 1) {
        // Check for wheel straight (A-2-3-4-5)
        if (ranks[0] === 14 && ranks[1] === 5 && ranks[2] === 4 && ranks[3] === 3 && ranks[4] === 2) {
          return true
        }
        return false
      }
    }
    return true
  }

  private static getRankCounts(cards: Card[]): Record<string, number> {
    const counts: Record<string, number> = {}
    for (const card of cards) {
      counts[card.rank] = (counts[card.rank] || 0) + 1
    }
    return counts
  }
}

export interface HandRanking {
  rank: number
  name: string
  cards: Card[]
}

// Game engine
export class PokerGameEngine {
  private gameState: GameState
  private players: SessionPlayer[]
  private deck: Card[]
  private currentHand: Hand | null = null

  constructor(players: SessionPlayer[], initialGameState?: Partial<GameState>) {
    this.players = players
    this.gameState = {
      dealer_position: 1,
      small_blind_position: 2,
      big_blind_position: 3,
      current_betting_round: 'preflop',
      community_cards: [],
      side_pots: [],
      current_bet: 0,
      min_raise: 0,
      ...initialGameState
    }
    this.deck = CardUtils.shuffleDeck(CardUtils.createDeck())
  }

  startNewHand(handNumber: number, smallBlind: number, bigBlind: number): Hand {
    // Reset deck and shuffle
    this.deck = CardUtils.shuffleDeck(CardUtils.createDeck())
    
    // Create new hand
    this.currentHand = {
      id: `hand_${Date.now()}`,
      session_id: 'current_session',
      hand_number: handNumber,
      game_variant: 'texas_holdem',
      pot_size: 0,
      rake_amount: 0,
      board_cards: [],
      game_state: {
        dealer_position: this.gameState.dealer_position,
        small_blind_position: this.getNextActivePlayer(this.gameState.dealer_position),
        big_blind_position: this.getNextActivePlayer(this.getNextActivePlayer(this.gameState.dealer_position)),
        current_betting_round: 'preflop',
        community_cards: [],
        side_pots: [],
        current_bet: bigBlind,
        min_raise: bigBlind
      },
      started_at: new Date().toISOString()
    }

    // Update game state
    this.gameState = this.currentHand.game_state

    // Post blinds
    this.postBlinds(smallBlind, bigBlind)

    // Deal hole cards
    this.dealHoleCards()

    // Set action on first player after big blind
    this.gameState.action_on = this.getNextActivePlayer(this.gameState.big_blind_position)

    return this.currentHand
  }

  processPlayerAction(playerId: string, action: PlayerAction): GameUpdate {
    if (!this.currentHand || this.gameState.action_on !== playerId) {
      throw new Error('Invalid action: not your turn')
    }

    const player = this.players.find(p => p.user_id === playerId)
    if (!player) {
      throw new Error('Player not found')
    }

    const validActions = this.getValidActions(playerId)
    const isValidAction = validActions.some(a => a.type === action.action)

    if (!isValidAction) {
      throw new Error(`Invalid action: ${action.action}`)
    }

    const gameUpdate = this.executeAction(player, action)

    // Check if betting round is complete
    if (this.isBettingRoundComplete()) {
      this.advanceBettingRound()
    }

    // Check if hand is complete
    if (this.isHandComplete()) {
      this.completeHand()
    }

    return gameUpdate
  }

  private postBlinds(smallBlind: number, bigBlind: number) {
    const sbPlayer = this.players.find(p => p.seat_number === this.gameState.small_blind_position)
    const bbPlayer = this.players.find(p => p.seat_number === this.gameState.big_blind_position)

    if (sbPlayer) {
      sbPlayer.current_chips -= smallBlind
      this.currentHand!.pot_size += smallBlind
    }

    if (bbPlayer) {
      bbPlayer.current_chips -= bigBlind
      this.currentHand!.pot_size += bigBlind
    }
  }

  private dealHoleCards() {
    const activePlayers = this.players.filter(p => p.status === 'active')
    
    // Deal 2 cards to each active player
    for (let round = 0; round < 2; round++) {
      for (const player of activePlayers) {
        if (this.deck.length > 0) {
          // In a real implementation, you'd store hole cards securely
          const card = this.deck.pop()!
          // Store hole cards (this would be done securely)
        }
      }
    }
  }

  private executeAction(player: SessionPlayer, action: PlayerAction): GameUpdate {
    const actionAmount = action.amount || 0

    switch (action.action) {
      case 'fold':
        player.status = 'sitting_out'
        break

      case 'check':
        // No additional logic needed for check
        break

      case 'call':
        const callAmount = Math.min(this.gameState.current_bet, player.current_chips)
        player.current_chips -= callAmount
        this.currentHand!.pot_size += callAmount
        break

      case 'raise':
      case 'bet':
        if (actionAmount > player.current_chips) {
          // All-in scenario
          this.currentHand!.pot_size += player.current_chips
          player.current_chips = 0
        } else {
          player.current_chips -= actionAmount
          this.currentHand!.pot_size += actionAmount
          this.gameState.current_bet = actionAmount
          this.gameState.min_raise = actionAmount - this.gameState.current_bet
        }
        break

      case 'all_in':
        this.currentHand!.pot_size += player.current_chips
        player.current_chips = 0
        break
    }

    // Move to next player
    this.gameState.action_on = this.getNextActivePlayer(player.seat_number)

    return {
      type: 'player_action',
      data: {
        playerId: player.user_id,
        action: action.action,
        amount: actionAmount,
        newChipCount: player.current_chips,
        potSize: this.currentHand!.pot_size,
        nextToAct: this.gameState.action_on
      }
    }
  }

  private getValidActions(playerId: string): AvailableAction[] {
    const player = this.players.find(p => p.user_id === playerId)
    if (!player) return []

    const actions: AvailableAction[] = []
    const currentBet = this.gameState.current_bet
    const playerChips = player.current_chips

    // Can always fold (except when it's free to check)
    if (currentBet > 0) {
      actions.push({ type: 'fold' })
    }

    // Can check if no bet to call
    if (currentBet === 0) {
      actions.push({ type: 'check' })
    }

    // Can call if there's a bet and player has chips
    if (currentBet > 0 && playerChips >= currentBet) {
      actions.push({ 
        type: 'call',
        amount: currentBet
      })
    }

    // Can bet/raise if player has enough chips
    if (playerChips > currentBet) {
      const minRaise = currentBet + this.gameState.min_raise
      if (playerChips >= minRaise) {
        actions.push({
          type: currentBet === 0 ? 'bet' : 'raise',
          min_amount: minRaise,
          max_amount: playerChips
        })
      }
    }

    // Can always go all-in if player has chips
    if (playerChips > 0) {
      actions.push({
        type: 'all_in',
        amount: playerChips
      })
    }

    return actions
  }

  private getNextActivePlayer(currentPosition: number): string {
    const activePlayers = this.players.filter(p => p.status === 'active')
    if (activePlayers.length === 0) return ''

    // Find next active player in seat order
    let nextPosition = currentPosition
    for (let i = 0; i < this.players.length; i++) {
      nextPosition = (nextPosition % this.players.length) + 1
      const player = this.players.find(p => p.seat_number === nextPosition && p.status === 'active')
      if (player) {
        return player.user_id
      }
    }

    return activePlayers[0].user_id
  }

  private isBettingRoundComplete(): boolean {
    const activePlayers = this.players.filter(p => p.status === 'active')
    
    // Check if all players have acted and matched the current bet
    // This is a simplified check - real implementation would track individual player bets
    return activePlayers.length <= 1 || this.gameState.action_on === ''
  }

  private advanceBettingRound() {
    const rounds: GameState['current_betting_round'][] = ['preflop', 'flop', 'turn', 'river', 'showdown']
    const currentIndex = rounds.indexOf(this.gameState.current_betting_round)
    
    if (currentIndex < rounds.length - 1) {
      this.gameState.current_betting_round = rounds[currentIndex + 1]
      this.gameState.current_bet = 0
      this.gameState.min_raise = 0

      // Deal community cards
      this.dealCommunityCards()

      // Reset action to first active player after dealer
      this.gameState.action_on = this.getNextActivePlayer(this.gameState.dealer_position)
    }
  }

  private dealCommunityCards() {
    const cardsToAdd = this.gameState.current_betting_round === 'flop' ? 3 : 1

    for (let i = 0; i < cardsToAdd; i++) {
      if (this.deck.length > 0) {
        const card = this.deck.pop()!
        this.gameState.community_cards.push(card)
        this.currentHand!.board_cards.push(card)
      }
    }
  }

  private isHandComplete(): boolean {
    const activePlayers = this.players.filter(p => p.status === 'active')
    return activePlayers.length <= 1 || this.gameState.current_betting_round === 'showdown'
  }

  private completeHand() {
    if (!this.currentHand) return

    // Determine winners and distribute pot
    const winners = this.determineWinners()
    this.distributePot(winners)

    // Update hand end time
    this.currentHand.ended_at = new Date().toISOString()

    // Move dealer button
    this.gameState.dealer_position = (this.gameState.dealer_position % this.players.length) + 1
  }

  private determineWinners(): SessionPlayer[] {
    const activePlayers = this.players.filter(p => p.status === 'active')
    
    if (activePlayers.length === 1) {
      return activePlayers
    }

    // Evaluate hands for showdown
    const playerHands: Array<{ player: SessionPlayer, ranking: HandRanking }> = []
    
    for (const player of activePlayers) {
      // Get player's hole cards (this would come from secure storage)
      const holeCards: Card[] = [] // Placeholder
      const allCards = [...holeCards, ...this.gameState.community_cards]
      const ranking = HandEvaluator.evaluateHand(allCards)
      playerHands.push({ player, ranking })
    }

    // Sort by hand strength (highest first)
    playerHands.sort((a, b) => b.ranking.rank - a.ranking.rank)

    // Return all players with the best hand
    const bestRank = playerHands[0].ranking.rank
    return playerHands
      .filter(ph => ph.ranking.rank === bestRank)
      .map(ph => ph.player)
  }

  private distributePot(winners: SessionPlayer[]) {
    if (!this.currentHand || winners.length === 0) return

    const potPerWinner = Math.floor(this.currentHand.pot_size / winners.length)
    
    for (const winner of winners) {
      winner.current_chips += potPerWinner
    }

    // Handle any remaining chips due to rounding
    const remainder = this.currentHand.pot_size % winners.length
    if (remainder > 0) {
      winners[0].current_chips += remainder
    }
  }

  // Getters
  getCurrentGameState(): GameState {
    return { ...this.gameState }
  }

  getCurrentHand(): Hand | null {
    return this.currentHand
  }

  getPlayers(): SessionPlayer[] {
    return [...this.players]
  }
}

export interface GameUpdate {
  type: 'player_action' | 'game_state' | 'hand_complete' | 'betting_round_advance'
  data: any
}