import type { HandHistoryEntry, HandHistoryPlayer } from '@/lib/hand-history/tracker'
import type { DetailedStats } from '@/types'

export interface StatisticsFilters {
  userId?: string
  homeGameId?: string
  sessionIds?: string[]
  dateRange?: {
    start: Date
    end: Date
  }
  gameVariant?: string
  minHands?: number
  tournamentOnly?: boolean
  cashGameOnly?: boolean
}

export interface PlayerStatistics extends DetailedStats {
  // Additional advanced statistics
  threeBetPercentage: number
  foldToThreeBet: number
  cBetPercentage: number
  foldToCBet: number
  checkRaisePercentage: number
  donkBetPercentage: number
  
  // Position-based statistics
  positionStats: Record<string, PositionStats>
  
  // Timing statistics
  avgDecisionTime: number
  fastPlays: number // Decisions under 5 seconds
  slowPlays: number // Decisions over 30 seconds
  
  // Variance and consistency metrics
  standardDeviation: number
  biggestWin: number
  biggestLoss: number
  longestWinStreak: number
  longestLoseStreak: number
  
  // Recent form (last 100 hands)
  recentForm: {
    hands: number
    winRate: number
    vpip: number
    pfr: number
    aggression: number
  }
}

export interface PositionStats {
  handsPlayed: number
  vpip: number
  pfr: number
  threeBet: number
  winRate: number
  avgWinning: number
  profitability: number
}

export interface SessionStatistics {
  sessionId: string
  startTime: Date
  endTime: Date
  duration: number // minutes
  handsPlayed: number
  totalWinnings: number
  bigBlindWinRate: number
  vpip: number
  pfr: number
  aggression: number
  showdownWinRate: number
  largestPot: number
  bestHand: string
  hourlyRate: number
}

export interface GameStatistics {
  homeGameId: string
  gameName: string
  totalSessions: number
  totalHands: number
  totalPlayers: number
  avgSessionLength: number
  totalVolume: number // Total money in play
  topWinner: {
    userId: string
    amount: number
  }
  topLoser: {
    userId: string
    amount: number
  }
  mostActivePlayer: {
    userId: string
    hands: number
  }
  gameHealth: {
    regularPlayers: number // Players with 50+ hands
    retention: number // Players who played multiple sessions
    avgPotSize: number
    actionRate: number // Actions per hand
  }
}

export interface TournamentStatistics {
  tournamentId: string
  tournamentType: string
  totalEntrants: number
  prizePool: number
  avgFinishPosition: number
  moneyFinishes: number
  totalWinnings: number
  roi: number // Return on investment
  itm: number // In the money percentage
  avgStackAtElimination: number
  earlyExitRate: number // Eliminated in first 25% of field
  bubbleRate: number // Eliminated near money
  finalTableRate: number
}

export interface LeaderboardEntry {
  userId: string
  displayName: string
  value: number
  rank: number
  hands: number
  change?: number // Change from previous period
}

/**
 * Advanced Statistics Calculation Engine
 */
export class StatisticsEngine {
  /**
   * Calculate comprehensive player statistics
   */
  static calculatePlayerStatistics(
    hands: HandHistoryEntry[],
    userId: string,
    filters?: StatisticsFilters
  ): PlayerStatistics {
    const filteredHands = this.filterHands(hands, { ...filters, userId })
    
    if (filteredHands.length === 0) {
      return this.getEmptyPlayerStats()
    }

    const playerHands = this.getPlayerHandData(filteredHands, userId)
    
    // Basic statistics
    const totalHands = playerHands.length
    const handsWon = playerHands.filter(h => h.wonPot).length
    const totalWinnings = playerHands.reduce((sum, h) => sum + h.netAmount, 0)
    const totalInvested = playerHands.reduce((sum, h) => sum + (h.startingChips - h.endingChips + h.netAmount), 0)
    
    // Calculate core statistics
    const vpipHands = playerHands.filter(h => h.stats.vpip).length
    const pfrHands = playerHands.filter(h => h.stats.pfr).length
    const threeBetHands = playerHands.filter(h => h.stats.threeBet).length
    const showdownHands = playerHands.filter(h => h.stats.wentToShowdown).length
    const showdownWins = playerHands.filter(h => h.stats.wonAtShowdown).length
    const aggressionActions = playerHands.reduce((sum, h) => sum + h.stats.aggression, 0)
    const cBetHands = playerHands.filter(h => h.stats.cbet).length
    const foldToCBetHands = playerHands.filter(h => h.stats.foldToCbet).length

    // Calculate win rates and percentages
    const vpip = (vpipHands / totalHands) * 100
    const pfr = (pfrHands / totalHands) * 100
    const wtsd = (showdownHands / totalHands) * 100
    const wsd = showdownHands > 0 ? (showdownWins / showdownHands) * 100 : 0
    const aggression = aggressionActions / Math.max(1, vpipHands)

    // Position-based statistics
    const positionStats = this.calculatePositionStats(playerHands)
    
    // Advanced statistics
    const threeBetPercentage = this.calculateThreeBetPercentage(playerHands)
    const foldToThreeBet = this.calculateFoldToThreeBet(playerHands)
    const cBetPercentage = this.calculateCBetPercentage(playerHands)
    const foldToCBet = this.calculateFoldToCBet(playerHands)
    
    // Timing statistics
    const timingStats = this.calculateTimingStats(filteredHands, userId)
    
    // Variance and streaks
    const varianceStats = this.calculateVarianceStats(playerHands)
    
    // Recent form (last 100 hands)
    const recentHands = playerHands.slice(-100)
    const recentForm = this.calculateRecentForm(recentHands)

    // Calculate ROI and win rate
    const roi = totalInvested > 0 ? ((totalWinnings / totalInvested) * 100) : 0
    const winRateBB100 = this.calculateBigBlindWinRate(playerHands, filteredHands)

    // Find biggest win/loss and best hand
    const biggestWin = Math.max(...playerHands.map(h => h.netAmount), 0)
    const biggestLoss = Math.min(...playerHands.map(h => h.netAmount), 0)

    return {
      hands_played: totalHands,
      hands_won: handsWon,
      total_winnings: totalWinnings,
      total_invested: totalInvested,
      roi,
      vpip,
      pfr,
      aggression_factor: aggression,
      wtsd,
      w$sd: wsd,
      sessions_played: this.countUniqueSessions(filteredHands),
      avg_session_length: this.calculateAvgSessionLength(filteredHands),
      biggest_win: biggestWin,
      biggest_loss: Math.abs(biggestLoss),
      win_rate_bb_100: winRateBB100,
      
      // Advanced statistics
      threeBetPercentage,
      foldToThreeBet,
      cBetPercentage,
      foldToCBet,
      checkRaisePercentage: this.calculateCheckRaisePercentage(playerHands),
      donkBetPercentage: this.calculateDonkBetPercentage(playerHands),
      
      positionStats,
      
      avgDecisionTime: timingStats.avgDecisionTime,
      fastPlays: timingStats.fastPlays,
      slowPlays: timingStats.slowPlays,
      
      standardDeviation: varianceStats.standardDeviation,
      longestWinStreak: varianceStats.longestWinStreak,
      longestLoseStreak: varianceStats.longestLoseStreak,
      
      recentForm
    }
  }

  /**
   * Calculate session statistics
   */
  static calculateSessionStatistics(
    hands: HandHistoryEntry[],
    sessionId: string,
    userId?: string
  ): SessionStatistics {
    const sessionHands = hands.filter(h => h.sessionId === sessionId)
    
    if (sessionHands.length === 0) {
      throw new Error('No hands found for session')
    }

    const startTime = new Date(Math.min(...sessionHands.map(h => new Date(h.timestamp).getTime())))
    const endTime = new Date(Math.max(...sessionHands.map(h => new Date(h.timestamp).getTime())))
    const duration = (endTime.getTime() - startTime.getTime()) / (1000 * 60) // minutes

    let playerData: HandHistoryPlayer[] = []
    let totalWinnings = 0
    
    if (userId) {
      playerData = sessionHands
        .map(h => h.players.find(p => p.userId === userId))
        .filter(Boolean) as HandHistoryPlayer[]
      
      totalWinnings = playerData.reduce((sum, p) => sum + p.netAmount, 0)
    }

    const handsPlayed = sessionHands.length
    const largestPot = Math.max(...sessionHands.map(h => h.metadata.totalPot))
    const avgBigBlind = sessionHands.reduce((sum, h) => sum + h.blinds.bigBlind, 0) / handsPlayed
    const bigBlindWinRate = avgBigBlind > 0 ? (totalWinnings / avgBigBlind) / handsPlayed * 100 : 0
    
    // Calculate player-specific stats if userId provided
    let vpip = 0, pfr = 0, aggression = 0, showdownWinRate = 0
    if (playerData.length > 0) {
      vpip = (playerData.filter(p => p.stats.vpip).length / playerData.length) * 100
      pfr = (playerData.filter(p => p.stats.pfr).length / playerData.length) * 100
      
      const aggressionActions = playerData.reduce((sum, p) => sum + p.stats.aggression, 0)
      const vpipActions = playerData.filter(p => p.stats.vpip).length
      aggression = vpipActions > 0 ? aggressionActions / vpipActions : 0
      
      const showdownHands = playerData.filter(p => p.stats.wentToShowdown).length
      const showdownWins = playerData.filter(p => p.stats.wonAtShowdown).length
      showdownWinRate = showdownHands > 0 ? (showdownWins / showdownHands) * 100 : 0
    }

    const hourlyRate = duration > 0 ? (totalWinnings / duration) * 60 : 0
    
    // Find best hand for the session
    const bestHand = userId ? this.findBestHandInSession(sessionHands, userId) : 'N/A'

    return {
      sessionId,
      startTime,
      endTime,
      duration,
      handsPlayed,
      totalWinnings,
      bigBlindWinRate,
      vpip,
      pfr,
      aggression,
      showdownWinRate,
      largestPot,
      bestHand,
      hourlyRate
    }
  }

  /**
   * Calculate game-wide statistics
   */
  static calculateGameStatistics(
    hands: HandHistoryEntry[],
    homeGameId: string,
    gameName: string = 'Unknown Game'
  ): GameStatistics {
    const gameHands = hands.filter(h => h.homeGameId === homeGameId)
    
    if (gameHands.length === 0) {
      throw new Error('No hands found for game')
    }

    const uniqueSessions = new Set(gameHands.map(h => h.sessionId)).size
    const uniquePlayers = new Set(gameHands.flatMap(h => h.players.map(p => p.userId)))
    const totalVolume = gameHands.reduce((sum, h) => sum + h.metadata.totalPot, 0)
    
    // Calculate session lengths
    const sessionLengths = this.calculateSessionLengthsForGame(gameHands)
    const avgSessionLength = sessionLengths.reduce((sum, len) => sum + len, 0) / sessionLengths.length

    // Find top winner and loser
    const playerWinnings = this.calculatePlayerWinningsForGame(gameHands)
    const sortedWinnings = Array.from(playerWinnings.entries()).sort((a, b) => b[1] - a[1])
    
    const topWinner = sortedWinnings[0] || ['', 0]
    const topLoser = sortedWinnings[sortedWinnings.length - 1] || ['', 0]
    
    // Find most active player
    const playerHandCounts = this.calculatePlayerHandCounts(gameHands)
    const mostActive = Array.from(playerHandCounts.entries()).sort((a, b) => b[1] - a[1])[0] || ['', 0]
    
    // Calculate game health metrics
    const regularPlayers = Array.from(playerHandCounts.values()).filter(count => count >= 50).length
    const multiSessionPlayers = this.countMultiSessionPlayers(gameHands)
    const retention = uniquePlayers.size > 0 ? (multiSessionPlayers / uniquePlayers.size) * 100 : 0
    const avgPotSize = totalVolume / gameHands.length
    const actionRate = this.calculateActionRate(gameHands)

    return {
      homeGameId,
      gameName,
      totalSessions: uniqueSessions,
      totalHands: gameHands.length,
      totalPlayers: uniquePlayers.size,
      avgSessionLength,
      totalVolume,
      topWinner: {
        userId: topWinner[0],
        amount: topWinner[1]
      },
      topLoser: {
        userId: topLoser[0],
        amount: Math.abs(topLoser[1])
      },
      mostActivePlayer: {
        userId: mostActive[0],
        hands: mostActive[1]
      },
      gameHealth: {
        regularPlayers,
        retention,
        avgPotSize,
        actionRate
      }
    }
  }

  /**
   * Generate leaderboards
   */
  static generateLeaderboard(
    hands: HandHistoryEntry[],
    type: 'winnings' | 'hands' | 'vpip' | 'pfr' | 'aggression',
    filters?: StatisticsFilters,
    limit: number = 10
  ): LeaderboardEntry[] {
    const filteredHands = this.filterHands(hands, filters)
    const playerStats = this.calculateAllPlayerStats(filteredHands)
    
    let entries: LeaderboardEntry[]
    
    switch (type) {
      case 'winnings':
        entries = playerStats.map(stat => ({
          userId: stat.userId,
          displayName: stat.displayName,
          value: stat.totalWinnings,
          rank: 0,
          hands: stat.handsPlayed
        })).sort((a, b) => b.value - a.value)
        break
        
      case 'hands':
        entries = playerStats.map(stat => ({
          userId: stat.userId,
          displayName: stat.displayName,
          value: stat.handsPlayed,
          rank: 0,
          hands: stat.handsPlayed
        })).sort((a, b) => b.value - a.value)
        break
        
      case 'vpip':
        entries = playerStats
          .filter(stat => stat.handsPlayed >= 50) // Minimum hands for statistical relevance
          .map(stat => ({
            userId: stat.userId,
            displayName: stat.displayName,
            value: stat.vpip,
            rank: 0,
            hands: stat.handsPlayed
          })).sort((a, b) => b.value - a.value)
        break
        
      case 'pfr':
        entries = playerStats
          .filter(stat => stat.handsPlayed >= 50)
          .map(stat => ({
            userId: stat.userId,
            displayName: stat.displayName,
            value: stat.pfr,
            rank: 0,
            hands: stat.handsPlayed
          })).sort((a, b) => b.value - a.value)
        break
        
      case 'aggression':
        entries = playerStats
          .filter(stat => stat.handsPlayed >= 50)
          .map(stat => ({
            userId: stat.userId,
            displayName: stat.displayName,
            value: stat.aggression,
            rank: 0,
            hands: stat.handsPlayed
          })).sort((a, b) => b.value - a.value)
        break
        
      default:
        entries = []
    }
    
    // Assign ranks
    entries.forEach((entry, index) => {
      entry.rank = index + 1
    })
    
    return entries.slice(0, limit)
  }

  // Private helper methods

  private static filterHands(hands: HandHistoryEntry[], filters?: StatisticsFilters): HandHistoryEntry[] {
    if (!filters) return hands

    return hands.filter(hand => {
      // User filter
      if (filters.userId && !hand.players.some(p => p.userId === filters.userId)) {
        return false
      }

      // Home game filter
      if (filters.homeGameId && hand.homeGameId !== filters.homeGameId) {
        return false
      }

      // Session filter
      if (filters.sessionIds && !filters.sessionIds.includes(hand.sessionId)) {
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

      // Tournament/cash game filter
      if (filters.tournamentOnly && !hand.metadata.tournamentInfo) {
        return false
      }

      if (filters.cashGameOnly && hand.metadata.tournamentInfo) {
        return false
      }

      return true
    })
  }

  private static getPlayerHandData(hands: HandHistoryEntry[], userId: string): HandHistoryPlayer[] {
    return hands
      .map(hand => hand.players.find(p => p.userId === userId))
      .filter(Boolean) as HandHistoryPlayer[]
  }

  private static getEmptyPlayerStats(): PlayerStatistics {
    return {
      hands_played: 0,
      hands_won: 0,
      total_winnings: 0,
      total_invested: 0,
      roi: 0,
      vpip: 0,
      pfr: 0,
      aggression_factor: 0,
      wtsd: 0,
      w$sd: 0,
      sessions_played: 0,
      avg_session_length: 0,
      biggest_win: 0,
      biggest_loss: 0,
      win_rate_bb_100: 0,
      threeBetPercentage: 0,
      foldToThreeBet: 0,
      cBetPercentage: 0,
      foldToCBet: 0,
      checkRaisePercentage: 0,
      donkBetPercentage: 0,
      positionStats: {},
      avgDecisionTime: 0,
      fastPlays: 0,
      slowPlays: 0,
      standardDeviation: 0,
      longestWinStreak: 0,
      longestLoseStreak: 0,
      recentForm: {
        hands: 0,
        winRate: 0,
        vpip: 0,
        pfr: 0,
        aggression: 0
      }
    }
  }

  private static calculatePositionStats(playerHands: HandHistoryPlayer[]): Record<string, PositionStats> {
    const positionData: Record<string, HandHistoryPlayer[]> = {}
    
    // Group hands by position
    playerHands.forEach(hand => {
      if (!positionData[hand.position]) {
        positionData[hand.position] = []
      }
      positionData[hand.position].push(hand)
    })
    
    const positionStats: Record<string, PositionStats> = {}
    
    // Calculate stats for each position
    Object.entries(positionData).forEach(([position, hands]) => {
      const handsPlayed = hands.length
      const vpipHands = hands.filter(h => h.stats.vpip).length
      const pfrHands = hands.filter(h => h.stats.pfr).length
      const threeBetHands = hands.filter(h => h.stats.threeBet).length
      const winningHands = hands.filter(h => h.wonPot).length
      const totalWinnings = hands.reduce((sum, h) => sum + h.netAmount, 0)
      const avgWinning = winningHands > 0 ? totalWinnings / winningHands : 0
      
      positionStats[position] = {
        handsPlayed,
        vpip: (vpipHands / handsPlayed) * 100,
        pfr: (pfrHands / handsPlayed) * 100,
        threeBet: (threeBetHands / handsPlayed) * 100,
        winRate: (winningHands / handsPlayed) * 100,
        avgWinning,
        profitability: totalWinnings / handsPlayed
      }
    })
    
    return positionStats
  }

  private static calculateThreeBetPercentage(playerHands: HandHistoryPlayer[]): number {
    const opportunities = playerHands.filter(h => h.stats.vpip).length
    const threeBets = playerHands.filter(h => h.stats.threeBet).length
    return opportunities > 0 ? (threeBets / opportunities) * 100 : 0
  }

  private static calculateFoldToThreeBet(playerHands: HandHistoryPlayer[]): number {
    // This would require more detailed action data to implement properly
    // For now, return a placeholder calculation
    return 0
  }

  private static calculateCBetPercentage(playerHands: HandHistoryPlayer[]): number {
    const opportunities = playerHands.filter(h => h.stats.pfr && h.stats.sawFlop).length
    const cBets = playerHands.filter(h => h.stats.cbet).length
    return opportunities > 0 ? (cBets / opportunities) * 100 : 0
  }

  private static calculateFoldToCBet(playerHands: HandHistoryPlayer[]): number {
    const opportunities = playerHands.filter(h => h.stats.foldToCbet).length
    return opportunities > 0 ? 100 : 0 // Simplified calculation
  }

  private static calculateCheckRaisePercentage(playerHands: HandHistoryPlayer[]): number {
    // Would require detailed action sequences to implement properly
    return 0
  }

  private static calculateDonkBetPercentage(playerHands: HandHistoryPlayer[]): number {
    // Would require detailed action sequences to implement properly
    return 0
  }

  private static calculateTimingStats(hands: HandHistoryEntry[], userId: string): {
    avgDecisionTime: number
    fastPlays: number
    slowPlays: number
  } {
    const userActions = hands
      .flatMap(h => h.actions.filter(a => a.userId === userId))
      .filter(a => a.timeToAct !== undefined)
    
    if (userActions.length === 0) {
      return { avgDecisionTime: 0, fastPlays: 0, slowPlays: 0 }
    }
    
    const avgDecisionTime = userActions.reduce((sum, a) => sum + (a.timeToAct || 0), 0) / userActions.length
    const fastPlays = userActions.filter(a => (a.timeToAct || 0) < 5).length
    const slowPlays = userActions.filter(a => (a.timeToAct || 0) > 30).length
    
    return { avgDecisionTime, fastPlays, slowPlays }
  }

  private static calculateVarianceStats(playerHands: HandHistoryPlayer[]): {
    standardDeviation: number
    longestWinStreak: number
    longestLoseStreak: number
  } {
    const results = playerHands.map(h => h.netAmount)
    
    // Calculate standard deviation
    const mean = results.reduce((sum, r) => sum + r, 0) / results.length
    const variance = results.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / results.length
    const standardDeviation = Math.sqrt(variance)
    
    // Calculate streaks
    let longestWinStreak = 0
    let longestLoseStreak = 0
    let currentWinStreak = 0
    let currentLoseStreak = 0
    
    results.forEach(result => {
      if (result > 0) {
        currentWinStreak++
        currentLoseStreak = 0
        longestWinStreak = Math.max(longestWinStreak, currentWinStreak)
      } else if (result < 0) {
        currentLoseStreak++
        currentWinStreak = 0
        longestLoseStreak = Math.max(longestLoseStreak, currentLoseStreak)
      } else {
        currentWinStreak = 0
        currentLoseStreak = 0
      }
    })
    
    return { standardDeviation, longestWinStreak, longestLoseStreak }
  }

  private static calculateRecentForm(recentHands: HandHistoryPlayer[]): {
    hands: number
    winRate: number
    vpip: number
    pfr: number
    aggression: number
  } {
    if (recentHands.length === 0) {
      return { hands: 0, winRate: 0, vpip: 0, pfr: 0, aggression: 0 }
    }
    
    const hands = recentHands.length
    const wins = recentHands.filter(h => h.wonPot).length
    const vpipHands = recentHands.filter(h => h.stats.vpip).length
    const pfrHands = recentHands.filter(h => h.stats.pfr).length
    const aggressionActions = recentHands.reduce((sum, h) => sum + h.stats.aggression, 0)
    
    return {
      hands,
      winRate: (wins / hands) * 100,
      vpip: (vpipHands / hands) * 100,
      pfr: (pfrHands / hands) * 100,
      aggression: aggressionActions / Math.max(1, vpipHands)
    }
  }

  private static calculateBigBlindWinRate(playerHands: HandHistoryPlayer[], allHands: HandHistoryEntry[]): number {
    // Calculate win rate in big blinds per 100 hands
    const totalWinnings = playerHands.reduce((sum, h) => sum + h.netAmount, 0)
    const avgBigBlind = allHands.reduce((sum, h) => sum + h.blinds.bigBlind, 0) / allHands.length
    
    if (avgBigBlind === 0 || playerHands.length === 0) return 0
    
    return (totalWinnings / avgBigBlind) / playerHands.length * 100
  }

  private static countUniqueSessions(hands: HandHistoryEntry[]): number {
    return new Set(hands.map(h => h.sessionId)).size
  }

  private static calculateAvgSessionLength(hands: HandHistoryEntry[]): number {
    const sessions = new Map<string, { start: Date; end: Date }>()
    
    hands.forEach(hand => {
      const handTime = new Date(hand.timestamp)
      const session = sessions.get(hand.sessionId)
      
      if (!session) {
        sessions.set(hand.sessionId, { start: handTime, end: handTime })
      } else {
        if (handTime < session.start) session.start = handTime
        if (handTime > session.end) session.end = handTime
      }
    })
    
    const durations = Array.from(sessions.values()).map(s => 
      (s.end.getTime() - s.start.getTime()) / (1000 * 60) // minutes
    )
    
    return durations.length > 0 ? durations.reduce((sum, d) => sum + d, 0) / durations.length : 0
  }

  private static findBestHandInSession(hands: HandHistoryEntry[], userId: string): string {
    const userResults = hands
      .flatMap(h => h.results.filter(r => r.userId === userId))
      .sort((a, b) => b.handRank - a.handRank)
    
    return userResults[0]?.handName || 'None'
  }

  private static calculateSessionLengthsForGame(hands: HandHistoryEntry[]): number[] {
    const sessions = new Map<string, { start: Date; end: Date }>()
    
    hands.forEach(hand => {
      const handTime = new Date(hand.timestamp)
      const session = sessions.get(hand.sessionId)
      
      if (!session) {
        sessions.set(hand.sessionId, { start: handTime, end: handTime })
      } else {
        if (handTime < session.start) session.start = handTime
        if (handTime > session.end) session.end = handTime
      }
    })
    
    return Array.from(sessions.values()).map(s => 
      (s.end.getTime() - s.start.getTime()) / (1000 * 60) // minutes
    )
  }

  private static calculatePlayerWinningsForGame(hands: HandHistoryEntry[]): Map<string, number> {
    const winnings = new Map<string, number>()
    
    hands.forEach(hand => {
      hand.players.forEach(player => {
        const current = winnings.get(player.userId) || 0
        winnings.set(player.userId, current + player.netAmount)
      })
    })
    
    return winnings
  }

  private static calculatePlayerHandCounts(hands: HandHistoryEntry[]): Map<string, number> {
    const counts = new Map<string, number>()
    
    hands.forEach(hand => {
      hand.players.forEach(player => {
        const current = counts.get(player.userId) || 0
        counts.set(player.userId, current + 1)
      })
    })
    
    return counts
  }

  private static countMultiSessionPlayers(hands: HandHistoryEntry[]): number {
    const playerSessions = new Map<string, Set<string>>()
    
    hands.forEach(hand => {
      hand.players.forEach(player => {
        if (!playerSessions.has(player.userId)) {
          playerSessions.set(player.userId, new Set())
        }
        playerSessions.get(player.userId)!.add(hand.sessionId)
      })
    })
    
    return Array.from(playerSessions.values()).filter(sessions => sessions.size > 1).length
  }

  private static calculateActionRate(hands: HandHistoryEntry[]): number {
    const totalActions = hands.reduce((sum, h) => sum + h.actions.length, 0)
    return totalActions / hands.length
  }

  private static calculateAllPlayerStats(hands: HandHistoryEntry[]): Array<{
    userId: string
    displayName: string
    handsPlayed: number
    totalWinnings: number
    vpip: number
    pfr: number
    aggression: number
  }> {
    const playerData = new Map<string, HandHistoryPlayer[]>()
    
    // Group player data by userId
    hands.forEach(hand => {
      hand.players.forEach(player => {
        if (!playerData.has(player.userId)) {
          playerData.set(player.userId, [])
        }
        playerData.get(player.userId)!.push(player)
      })
    })
    
    // Calculate stats for each player
    return Array.from(playerData.entries()).map(([userId, playerHands]) => {
      const handsPlayed = playerHands.length
      const totalWinnings = playerHands.reduce((sum, p) => sum + p.netAmount, 0)
      const vpipHands = playerHands.filter(p => p.stats.vpip).length
      const pfrHands = playerHands.filter(p => p.stats.pfr).length
      const aggressionActions = playerHands.reduce((sum, p) => sum + p.stats.aggression, 0)
      
      return {
        userId,
        displayName: `Player ${userId.substring(0, 8)}`, // Would come from user lookup
        handsPlayed,
        totalWinnings,
        vpip: (vpipHands / handsPlayed) * 100,
        pfr: (pfrHands / handsPlayed) * 100,
        aggression: aggressionActions / Math.max(1, vpipHands)
      }
    })
  }
}