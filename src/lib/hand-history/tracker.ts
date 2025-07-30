import type { 
  Hand, 
  HandAction, 
  HandPlayer, 
  Card, 
  SessionPlayer,
  PlayerAction,
  GameState 
} from '@/types'

export interface HandHistoryEntry {
  handId: string
  sessionId: string
  homeGameId: string
  handNumber: number
  timestamp: string
  gameVariant: string
  bettingStructure: string
  blinds: {
    smallBlind: number
    bigBlind: number
    ante: number
  }
  players: HandHistoryPlayer[]
  actions: HandHistoryAction[]
  boardCards: Card[]
  pots: HandPot[]
  results: HandResult[]
  metadata: {
    dealerPosition: number
    duration: number
    totalPot: number
    rake: number
    handType: 'regular' | 'all_in' | 'heads_up' | 'final_table'
    tournamentInfo?: {
      tournamentId: string
      blindLevel: number
      playersRemaining: number
    }
  }
}

export interface HandHistoryPlayer {
  userId: string
  seatNumber: number
  startingChips: number
  endingChips: number
  holeCards?: Card[] // Only visible to player or in showdown
  position: string // 'UTG', 'MP', 'CO', 'BTN', 'SB', 'BB'
  isDealer: boolean
  postedSmallBlind: boolean
  postedBigBlind: boolean
  finalAction: 'fold' | 'call' | 'raise' | 'check' | 'all_in' | 'timeout'
  showedCards: boolean
  wonPot: boolean
  netAmount: number
  stats: HandPlayerStats
}

export interface HandHistoryAction {
  sequenceNumber: number
  userId: string
  action: 'fold' | 'check' | 'call' | 'raise' | 'bet' | 'all_in' | 'small_blind' | 'big_blind' | 'ante'
  amount: number
  bettingRound: 'preflop' | 'flop' | 'turn' | 'river' | 'showdown'
  potSizeAfter: number
  timestamp: string
  timeToAct?: number // seconds taken to make decision
  isAllIn: boolean
  facingBet: number
  description: string // Human-readable description
}

export interface HandPot {
  potNumber: number
  amount: number
  eligiblePlayers: string[]
  winners: string[]
  type: 'main' | 'side'
}

export interface HandResult {
  userId: string
  position: number
  handRank: number
  handName: string
  bestHand: Card[]
  amountWon: number
  showedCards: boolean
}

export interface HandPlayerStats {
  vpip: boolean // Voluntarily Put Money In Pot
  pfr: boolean // Pre-Flop Raise
  threeBet: boolean
  cbet: boolean // Continuation Bet
  foldToCbet: boolean
  aggression: number // Number of aggressive actions
  sawFlop: boolean
  wentToShowdown: boolean
  wonAtShowdown: boolean
}

export interface HandReplayStep {
  stepNumber: number
  type: 'deal' | 'action' | 'community_cards' | 'showdown' | 'pot_award'
  description: string
  gameState: {
    players: HandHistoryPlayer[]
    pot: number
    communityCards: Card[]
    activePlayer?: string
    bettingRound: string
  }
  timestamp: string
}

/**
 * Hand History Tracking System
 */
export class HandHistoryTracker {
  private currentHand?: HandHistoryEntry
  private actionSequence: number = 0
  private handStartTime?: Date

  /**
   * Start tracking a new hand
   */
  startHand(
    handId: string,
    sessionId: string,
    homeGameId: string,
    handNumber: number,
    players: SessionPlayer[],
    gameConfig: any,
    gameState: GameState,
    tournamentInfo?: any
  ): void {
    this.handStartTime = new Date()
    this.actionSequence = 0

    // Map session players to hand history players
    const handPlayers: HandHistoryPlayer[] = players.map((player, index) => ({
      userId: player.user_id,
      seatNumber: player.seat_number,
      startingChips: player.current_chips,
      endingChips: player.current_chips,
      position: this.getPlayerPosition(player.seat_number, players.length, gameState.dealer_position),
      isDealer: player.seat_number === gameState.dealer_position,
      postedSmallBlind: player.seat_number === gameState.small_blind_position,
      postedBigBlind: player.seat_number === gameState.big_blind_position,
      finalAction: 'fold',
      showedCards: false,
      wonPot: false,
      netAmount: 0,
      stats: {
        vpip: false,
        pfr: false,
        threeBet: false,
        cbet: false,
        foldToCbet: false,
        aggression: 0,
        sawFlop: false,
        wentToShowdown: false,
        wonAtShowdown: false
      }
    }))

    this.currentHand = {
      handId,
      sessionId,
      homeGameId,
      handNumber,
      timestamp: this.handStartTime.toISOString(),
      gameVariant: gameConfig.game_variant || 'texas_holdem',
      bettingStructure: gameConfig.betting_structure || 'no_limit',
      blinds: {
        smallBlind: gameConfig.small_blind || 0,
        bigBlind: gameConfig.big_blind || 0,
        ante: gameConfig.ante || 0
      },
      players: handPlayers,
      actions: [],
      boardCards: [],
      pots: [],
      results: [],
      metadata: {
        dealerPosition: gameState.dealer_position,
        duration: 0,
        totalPot: 0,
        rake: 0,
        handType: 'regular',
        tournamentInfo
      }
    }
  }

  /**
   * Record a player action
   */
  recordAction(
    userId: string,
    action: PlayerAction,
    gameState: GameState,
    potSize: number,
    facingBet: number = 0,
    timeToAct?: number
  ): void {
    if (!this.currentHand) {
      throw new Error('No active hand to record action')
    }

    const isAllIn = action.action === 'all_in' || 
      (action.amount && this.getPlayerChips(userId) <= action.amount)

    const historyAction: HandHistoryAction = {
      sequenceNumber: ++this.actionSequence,
      userId,
      action: action.action,
      amount: action.amount || 0,
      bettingRound: gameState.current_betting_round,
      potSizeAfter: potSize,
      timestamp: new Date().toISOString(),
      timeToAct,
      isAllIn,
      facingBet,
      description: this.generateActionDescription(userId, action, facingBet, isAllIn)
    }

    this.currentHand.actions.push(historyAction)

    // Update player stats
    this.updatePlayerStats(userId, action, gameState.current_betting_round, facingBet)

    // Update player final action
    const playerIndex = this.currentHand.players.findIndex(p => p.userId === userId)
    if (playerIndex !== -1) {
      this.currentHand.players[playerIndex].finalAction = action.action
      if (action.amount) {
        this.currentHand.players[playerIndex].endingChips -= action.amount
      }
    }
  }

  /**
   * Record community cards being dealt
   */
  recordCommunityCards(cards: Card[], bettingRound: string): void {
    if (!this.currentHand) return

    this.currentHand.boardCards.push(...cards)

    // Record as a special action
    const cardsDescription = cards.map(card => `${card.rank}${card.suit[0].toUpperCase()}`).join('')
    
    const historyAction: HandHistoryAction = {
      sequenceNumber: ++this.actionSequence,
      userId: 'dealer',
      action: 'bet', // Using 'bet' as placeholder for dealing cards
      amount: 0,
      bettingRound: bettingRound as any,
      potSizeAfter: this.currentHand.metadata.totalPot,
      timestamp: new Date().toISOString(),
      isAllIn: false,
      facingBet: 0,
      description: `Dealer deals ${bettingRound} cards: ${cardsDescription}`
    }

    this.currentHand.actions.push(historyAction)

    // Update player stats for those who saw the flop
    if (bettingRound === 'flop') {
      this.currentHand.players.forEach(player => {
        if (player.finalAction !== 'fold') {
          player.stats.sawFlop = true
        }
      })
    }
  }

  /**
   * Record hole cards for a player
   */
  recordHoleCards(userId: string, cards: Card[]): void {
    if (!this.currentHand) return

    const playerIndex = this.currentHand.players.findIndex(p => p.userId === userId)
    if (playerIndex !== -1) {
      this.currentHand.players[playerIndex].holeCards = cards
    }
  }

  /**
   * Complete the hand recording
   */
  completeHand(
    winners: Array<{ userId: string; amount: number; handRank?: number; handName?: string; bestHand?: Card[] }>,
    pots: Array<{ amount: number; eligiblePlayers: string[]; winners: string[] }>,
    rake: number = 0
  ): HandHistoryEntry {
    if (!this.currentHand || !this.handStartTime) {
      throw new Error('No active hand to complete')
    }

    // Calculate hand duration
    this.currentHand.metadata.duration = Date.now() - this.handStartTime.getTime()
    this.currentHand.metadata.rake = rake

    // Record pots
    this.currentHand.pots = pots.map((pot, index) => ({
      potNumber: index + 1,
      amount: pot.amount,
      eligiblePlayers: pot.eligiblePlayers,
      winners: pot.winners,
      type: index === 0 ? 'main' : 'side'
    }))

    // Record results
    this.currentHand.results = winners.map((winner, index) => ({
      userId: winner.userId,
      position: index + 1,
      handRank: winner.handRank || 0,
      handName: winner.handName || 'Unknown',
      bestHand: winner.bestHand || [],
      amountWon: winner.amount,
      showedCards: true
    }))

    // Update player final states
    this.currentHand.players.forEach(player => {
      const winner = winners.find(w => w.userId === player.userId)
      if (winner) {
        player.wonPot = true
        player.netAmount = winner.amount - (player.startingChips - player.endingChips)
        player.stats.wonAtShowdown = true
        player.stats.wentToShowdown = true
        player.showedCards = true
      } else {
        player.netAmount = -(player.startingChips - player.endingChips)
        if (this.currentHand.boardCards.length >= 3 && player.finalAction !== 'fold') {
          player.stats.wentToShowdown = true
        }
      }
    })

    // Calculate total pot
    this.currentHand.metadata.totalPot = pots.reduce((sum, pot) => sum + pot.amount, 0)

    // Determine hand type
    this.currentHand.metadata.handType = this.determineHandType()

    const completedHand = { ...this.currentHand }
    this.currentHand = undefined
    this.actionSequence = 0
    this.handStartTime = undefined

    return completedHand
  }

  /**
   * Generate replay steps for hand visualization
   */
  generateReplaySteps(handHistory: HandHistoryEntry): HandReplayStep[] {
    const steps: HandReplayStep[] = []
    let stepNumber = 0
    let currentPot = 0
    const communityCards: Card[] = []

    // Step 1: Initial deal
    steps.push({
      stepNumber: ++stepNumber,
      type: 'deal',
      description: 'Cards dealt to players',
      gameState: {
        players: handHistory.players.map(p => ({ ...p, endingChips: p.startingChips })),
        pot: 0,
        communityCards: [],
        bettingRound: 'preflop'
      },
      timestamp: handHistory.timestamp
    })

    // Process each action
    let currentBettingRound = 'preflop'
    const playerChips = new Map(handHistory.players.map(p => [p.userId, p.startingChips]))

    handHistory.actions.forEach(action => {
      // Check for betting round changes
      if (action.bettingRound !== currentBettingRound) {
        currentBettingRound = action.bettingRound

        // Add community cards step
        const newCards = this.getCommunityCardsForRound(action.bettingRound, handHistory.boardCards)
        if (newCards.length > 0) {
          communityCards.push(...newCards)
          steps.push({
            stepNumber: ++stepNumber,
            type: 'community_cards',
            description: `${this.capitalizeFirst(action.bettingRound)} cards dealt`,
            gameState: {
              players: handHistory.players.map(p => ({
                ...p,
                endingChips: playerChips.get(p.userId) || p.startingChips
              })),
              pot: currentPot,
              communityCards: [...communityCards],
              bettingRound: action.bettingRound
            },
            timestamp: action.timestamp
          })
        }
      }

      // Add action step
      if (action.userId !== 'dealer') {
        if (action.amount > 0) {
          const currentChips = playerChips.get(action.userId) || 0
          playerChips.set(action.userId, currentChips - action.amount)
          currentPot += action.amount
        }

        steps.push({
          stepNumber: ++stepNumber,
          type: 'action',
          description: action.description,
          gameState: {
            players: handHistory.players.map(p => ({
              ...p,
              endingChips: playerChips.get(p.userId) || p.startingChips
            })),
            pot: currentPot,
            communityCards: [...communityCards],
            activePlayer: action.userId,
            bettingRound: action.bettingRound
          },
          timestamp: action.timestamp
        })
      }
    })

    // Final showdown step
    if (handHistory.results.length > 0) {
      steps.push({
        stepNumber: ++stepNumber,
        type: 'showdown',
        description: 'Showdown and pot distribution',
        gameState: {
          players: handHistory.players,
          pot: handHistory.metadata.totalPot,
          communityCards: handHistory.boardCards,
          bettingRound: 'showdown'
        },
        timestamp: handHistory.actions[handHistory.actions.length - 1]?.timestamp || handHistory.timestamp
      })
    }

    return steps
  }

  /**
   * Search hand history with filters
   */
  static searchHandHistory(
    hands: HandHistoryEntry[],
    filters: {
      userId?: string
      dateRange?: { start: Date; end: Date }
      gameVariant?: string
      handType?: string
      minPot?: number
      maxPot?: number
      wonOnly?: boolean
      showdownOnly?: boolean
    }
  ): HandHistoryEntry[] {
    return hands.filter(hand => {
      // User filter
      if (filters.userId && !hand.players.some(p => p.userId === filters.userId)) {
        return false
      }

      // Date range filter
      if (filters.dateRange) {
        const handDate = new Date(hand.timestamp)
        if (handDate < filters.dateRange.start || handDate > filters.dateRange.end) {
          return false
        }
      }

      // Game variant filter
      if (filters.gameVariant && hand.gameVariant !== filters.gameVariant) {
        return false
      }

      // Hand type filter
      if (filters.handType && hand.metadata.handType !== filters.handType) {
        return false
      }

      // Pot size filters
      if (filters.minPot && hand.metadata.totalPot < filters.minPot) {
        return false
      }

      if (filters.maxPot && hand.metadata.totalPot > filters.maxPot) {
        return false
      }

      // Won only filter
      if (filters.wonOnly && filters.userId) {
        const userPlayer = hand.players.find(p => p.userId === filters.userId)
        if (!userPlayer || !userPlayer.wonPot) {
          return false
        }
      }

      // Showdown only filter
      if (filters.showdownOnly) {
        if (!hand.results.length || hand.results.length < 2) {
          return false
        }
      }

      return true
    })
  }

  /**
   * Get hand statistics for a player
   */
  static getPlayerHandStats(hands: HandHistoryEntry[], userId: string): {
    totalHands: number
    vpip: number
    pfr: number
    aggression: number
    handsWon: number
    showdownPercentage: number
    winningsTotal: number
    avgPotWon: number
    bestHand: string
    favoritePosition: string
  } {
    const playerHands = hands.filter(hand => 
      hand.players.some(p => p.userId === userId)
    )

    if (playerHands.length === 0) {
      return {
        totalHands: 0,
        vpip: 0,
        pfr: 0,
        aggression: 0,
        handsWon: 0,
        showdownPercentage: 0,
        winningsTotal: 0,
        avgPotWon: 0,
        bestHand: 'None',
        favoritePosition: 'Unknown'
      }
    }

    let vpipCount = 0
    let pfrCount = 0
    let aggressionCount = 0
    let handsWonCount = 0
    let showdownCount = 0
    let totalWinnings = 0
    const handTypes: Record<string, number> = {}
    const positions: Record<string, number> = {}

    playerHands.forEach(hand => {
      const player = hand.players.find(p => p.userId === userId)
      if (!player) return

      if (player.stats.vpip) vpipCount++
      if (player.stats.pfr) pfrCount++
      if (player.stats.aggression > 0) aggressionCount += player.stats.aggression
      if (player.wonPot) {
        handsWonCount++
        totalWinnings += player.netAmount
      }
      if (player.stats.wentToShowdown) showdownCount++

      // Track hand types for best hand
      const result = hand.results.find(r => r.userId === userId)
      if (result) {
        handTypes[result.handName] = (handTypes[result.handName] || 0) + 1
      }

      // Track positions
      positions[player.position] = (positions[player.position] || 0) + 1
    })

    const bestHand = Object.entries(handTypes).reduce((a, b) => a[1] > b[1] ? a : b, ['None', 0])[0]
    const favoritePosition = Object.entries(positions).reduce((a, b) => a[1] > b[1] ? a : b, ['Unknown', 0])[0]

    return {
      totalHands: playerHands.length,
      vpip: (vpipCount / playerHands.length) * 100,
      pfr: (pfrCount / playerHands.length) * 100,
      aggression: aggressionCount / playerHands.length,
      handsWon: handsWonCount,
      showdownPercentage: (showdownCount / playerHands.length) * 100,
      winningsTotal: totalWinnings,
      avgPotWon: handsWonCount > 0 ? totalWinnings / handsWonCount : 0,
      bestHand,
      favoritePosition
    }
  }

  // Private helper methods

  private getPlayerPosition(seatNumber: number, totalPlayers: number, dealerPosition: number): string {
    const relativePosition = (seatNumber - dealerPosition + totalPlayers) % totalPlayers

    if (totalPlayers <= 2) {
      return relativePosition === 0 ? 'BTN' : 'BB'
    }

    const positions = ['BTN', 'SB', 'BB', 'UTG', 'MP', 'MP2', 'CO']
    
    if (totalPlayers <= positions.length) {
      return positions[relativePosition] || 'MP'
    }

    // For larger tables, use general position names
    if (relativePosition === 0) return 'BTN'
    if (relativePosition === 1) return 'SB'
    if (relativePosition === 2) return 'BB'
    if (relativePosition === 3) return 'UTG'
    if (relativePosition === totalPlayers - 1) return 'CO'
    return 'MP'
  }

  private getPlayerChips(userId: string): number {
    if (!this.currentHand) return 0
    const player = this.currentHand.players.find(p => p.userId === userId)
    return player ? player.endingChips : 0
  }

  private generateActionDescription(userId: string, action: PlayerAction, facingBet: number, isAllIn: boolean): string {
    const playerName = this.getPlayerName(userId)
    
    switch (action.action) {
      case 'fold':
        return `${playerName} folds`
      case 'check':
        return `${playerName} checks`
      case 'call':
        if (isAllIn) {
          return `${playerName} calls all-in for ${action.amount}`
        }
        return `${playerName} calls ${action.amount}`
      case 'raise':
        if (isAllIn) {
          return `${playerName} raises all-in to ${action.amount}`
        }
        return `${playerName} raises to ${action.amount}`
      case 'bet':
        if (isAllIn) {
          return `${playerName} bets all-in ${action.amount}`
        }
        return `${playerName} bets ${action.amount}`
      case 'all_in':
        return `${playerName} goes all-in for ${action.amount}`
      case 'small_blind':
        return `${playerName} posts small blind ${action.amount}`
      case 'big_blind':
        return `${playerName} posts big blind ${action.amount}`
      default:
        return `${playerName} ${action.action}`
    }
  }

  private getPlayerName(userId: string): string {
    // In a real implementation, this would look up the player's display name
    return `Player ${userId.substring(0, 8)}`
  }

  private updatePlayerStats(userId: string, action: PlayerAction, bettingRound: string, facingBet: number): void {
    if (!this.currentHand) return

    const playerIndex = this.currentHand.players.findIndex(p => p.userId === userId)
    if (playerIndex === -1) return

    const player = this.currentHand.players[playerIndex]

    // VPIP: Voluntarily put money in pot (preflop, not blinds)
    if (bettingRound === 'preflop' && ['call', 'raise', 'bet'].includes(action.action) && !player.postedSmallBlind && !player.postedBigBlind) {
      player.stats.vpip = true
    }

    // PFR: Pre-flop raise
    if (bettingRound === 'preflop' && ['raise', 'bet'].includes(action.action)) {
      player.stats.pfr = true
    }

    // Three-bet (raise after a raise preflop)
    if (bettingRound === 'preflop' && action.action === 'raise' && facingBet > 0) {
      player.stats.threeBet = true
    }

    // Aggression (betting/raising)
    if (['raise', 'bet'].includes(action.action)) {
      player.stats.aggression++
    }

    // Continuation bet (bet on flop after being preflop aggressor)
    if (bettingRound === 'flop' && action.action === 'bet' && player.stats.pfr) {
      player.stats.cbet = true
    }

    // Fold to continuation bet
    if (bettingRound === 'flop' && action.action === 'fold' && facingBet > 0) {
      player.stats.foldToCbet = true
    }
  }

  private determineHandType(): 'regular' | 'all_in' | 'heads_up' | 'final_table' {
    if (!this.currentHand) return 'regular'

    // Check for all-in
    if (this.currentHand.actions.some(action => action.isAllIn)) {
      return 'all_in'
    }

    // Check for heads-up
    if (this.currentHand.players.length === 2) {
      return 'heads_up'
    }

    // Check for final table (would need tournament context)
    if (this.currentHand.metadata.tournamentInfo && this.currentHand.metadata.tournamentInfo.playersRemaining <= 9) {
      return 'final_table'
    }

    return 'regular'
  }

  private getCommunityCardsForRound(bettingRound: string, allCards: Card[]): Card[] {
    switch (bettingRound) {
      case 'flop':
        return allCards.slice(0, 3)
      case 'turn':
        return allCards.slice(3, 4)
      case 'river':
        return allCards.slice(4, 5)
      default:
        return []
    }
  }

  private capitalizeFirst(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1)
  }
}

/**
 * Hand History Storage Interface
 */
export interface HandHistoryStorage {
  saveHand(handHistory: HandHistoryEntry): Promise<void>
  getHand(handId: string): Promise<HandHistoryEntry | null>
  getHandsForPlayer(userId: string, limit?: number, offset?: number): Promise<HandHistoryEntry[]>
  getHandsForSession(sessionId: string): Promise<HandHistoryEntry[]>
  searchHands(filters: any): Promise<HandHistoryEntry[]>
  deleteHand(handId: string): Promise<void>
}

/**
 * Export utilities for hand history analysis
 */
export class HandHistoryExporter {
  /**
   * Export hands to various formats
   */
  static exportToJSON(hands: HandHistoryEntry[]): string {
    return JSON.stringify(hands, null, 2)
  }

  static exportToCSV(hands: HandHistoryEntry[]): string {
    const headers = [
      'Hand ID', 'Date', 'Game', 'Players', 'Total Pot', 'Winner', 'Duration'
    ]

    const rows = hands.map(hand => [
      hand.handId,
      new Date(hand.timestamp).toISOString(),
      `${hand.gameVariant} ${hand.bettingStructure}`,
      hand.players.length.toString(),
      hand.metadata.totalPot.toString(),
      hand.results[0]?.userId || 'Unknown',
      `${Math.round(hand.metadata.duration / 1000)}s`
    ])

    return [headers, ...rows].map(row => row.join(',')).join('\n')
  }

  static exportToPokerTracker(hands: HandHistoryEntry[]): string {
    // Convert to PokerTracker format (simplified)
    return hands.map(hand => {
      const lines = [
        `Game #${hand.handId} - ${hand.timestamp}`,
        `Table '${hand.sessionId}' ${hand.players.length}-max`,
        `Seat info and actions would go here...`,
        ''
      ]
      return lines.join('\n')
    }).join('\n')
  }
}