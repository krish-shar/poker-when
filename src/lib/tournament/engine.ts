import type { 
  PokerSession, 
  SessionPlayer, 
  GameConfig, 
  Card,
  GameState 
} from '@/types'

export interface TournamentConfig {
  tournamentType: 'sit_n_go' | 'multi_table' | 'heads_up'
  maxPlayers: number
  buyIn: number
  prizePool: number
  blindStructure: BlindLevel[]
  blindLevelDuration: number // in minutes
  startingChips: number
  payoutStructure: PayoutStructure[]
  lateRegistration: boolean
  lateRegistrationMinutes?: number
  rebuyAllowed: boolean
  rebuyPeriod?: number // in minutes
  addonAllowed: boolean
  addonAmount?: number
}

export interface BlindLevel {
  level: number
  smallBlind: number
  bigBlind: number
  ante: number
  duration: number // in minutes
}

export interface PayoutStructure {
  position: number
  percentage: number
  amount?: number
}

export interface TournamentState {
  id: string
  status: 'waiting' | 'registering' | 'running' | 'final_table' | 'completed' | 'cancelled'
  currentLevel: number
  levelStartTime: Date
  nextLevelTime: Date
  totalPrizePool: number
  playersRemaining: number
  playersEliminated: TournamentPlayer[]
  currentPlayers: TournamentPlayer[]
  tables: TournamentTable[]
  payouts: TournamentPayout[]
  blindHistory: BlindLevel[]
  isLateRegistrationOpen: boolean
  rebuyPeriodActive: boolean
  addonPeriodActive: boolean
  statistics: TournamentStatistics
}

export interface TournamentPlayer extends SessionPlayer {
  tournamentPosition?: number
  eliminatedAt?: Date
  rebuysUsed: number
  addonsUsed: number
  finalPosition?: number
  prizeMoney: number
  isChipLeader: boolean
  tableId?: string
  seatPosition: number
}

export interface TournamentTable {
  id: string
  tableNumber: number
  players: TournamentPlayer[]
  gameState: GameState
  isActive: boolean
  isFinalTable: boolean
  averageStack: number
}

export interface TournamentPayout {
  position: number
  playerId: string
  playerName: string
  amount: number
  paidAt: Date
}

export interface TournamentStatistics {
  totalEntrants: number
  totalRebuys: number
  totalAddons: number
  averageStack: number
  chipLeader: {
    playerId: string
    playerName: string
    chips: number
  }
  eliminationsThisLevel: number
  handsPlayed: number
  averageHandTime: number
  levelProgress: number // percentage
}

/**
 * Tournament Management Engine
 */
export class TournamentEngine {
  private tournamentState: TournamentState
  private config: TournamentConfig
  private levelTimer?: NodeJS.Timeout
  private eventHandlers: Map<string, Function[]> = new Map()

  constructor(config: TournamentConfig, tournamentId: string) {
    this.config = config
    this.tournamentState = this.initializeTournamentState(tournamentId)
    this.setupEventHandlers()
  }

  /**
   * Initialize tournament state
   */
  private initializeTournamentState(tournamentId: string): TournamentState {
    return {
      id: tournamentId,
      status: 'waiting',
      currentLevel: 0,
      levelStartTime: new Date(),
      nextLevelTime: new Date(Date.now() + this.config.blindLevelDuration * 60000),
      totalPrizePool: 0,
      playersRemaining: 0,
      playersEliminated: [],
      currentPlayers: [],
      tables: [],
      payouts: [],
      blindHistory: [],
      isLateRegistrationOpen: false,
      rebuyPeriodActive: false,
      addonPeriodActive: false,
      statistics: {
        totalEntrants: 0,
        totalRebuys: 0,
        totalAddons: 0,
        averageStack: this.config.startingChips,
        chipLeader: {
          playerId: '',
          playerName: '',
          chips: 0
        },
        eliminationsThisLevel: 0,
        handsPlayed: 0,
        averageHandTime: 0,
        levelProgress: 0
      }
    }
  }

  /**
   * Setup event handlers
   */
  private setupEventHandlers(): void {
    this.on('playerEliminated', this.handlePlayerElimination.bind(this))
    this.on('levelAdvanced', this.handleLevelAdvancement.bind(this))
    this.on('finalTableReached', this.handleFinalTable.bind(this))
    this.on('tournamentCompleted', this.handleTournamentCompletion.bind(this))
  }

  /**
   * Register a player for the tournament
   */
  registerPlayer(player: Omit<TournamentPlayer, 'tournamentPosition' | 'eliminatedAt' | 'rebuysUsed' | 'addonsUsed' | 'prizeMoney' | 'isChipLeader' | 'seatPosition'>): boolean {
    // Check if registration is open
    if (this.tournamentState.status !== 'waiting' && this.tournamentState.status !== 'registering') {
      if (!this.tournamentState.isLateRegistrationOpen) {
        throw new Error('Registration is closed')
      }
    }

    // Check if tournament is full
    if (this.tournamentState.currentPlayers.length >= this.config.maxPlayers) {
      throw new Error('Tournament is full')
    }

    // Check if player is already registered
    if (this.tournamentState.currentPlayers.some(p => p.user_id === player.user_id)) {
      throw new Error('Player is already registered')
    }

    // Create tournament player
    const tournamentPlayer: TournamentPlayer = {
      ...player,
      current_chips: this.config.startingChips,
      rebuysUsed: 0,
      addonsUsed: 0,
      prizeMoney: 0,
      isChipLeader: false,
      seatPosition: 0
    }

    // Add player to tournament
    this.tournamentState.currentPlayers.push(tournamentPlayer)
    this.tournamentState.playersRemaining = this.tournamentState.currentPlayers.length
    
    // Update prize pool
    this.updatePrizePool(this.config.buyIn)
    
    // Update statistics
    this.tournamentState.statistics.totalEntrants++
    
    // Emit event
    this.emit('playerRegistered', { player: tournamentPlayer })
    
    // Check if we can start the tournament
    this.checkTournamentStart()
    
    return true
  }

  /**
   * Start the tournament
   */
  startTournament(): boolean {
    if (this.tournamentState.status !== 'waiting' && this.tournamentState.status !== 'registering') {
      throw new Error('Tournament cannot be started in current state')
    }

    if (this.tournamentState.currentPlayers.length < 2) {
      throw new Error('Not enough players to start tournament')
    }

    // Update status
    this.tournamentState.status = 'running'
    
    // Create tables and seat players
    this.createTablesAndSeatPlayers()
    
    // Start first blind level
    this.startBlindLevel(0)
    
    // Enable late registration if configured
    if (this.config.lateRegistration) {
      this.tournamentState.isLateRegistrationOpen = true
      setTimeout(() => {
        this.tournamentState.isLateRegistrationOpen = false
        this.emit('lateRegistrationClosed')
      }, (this.config.lateRegistrationMinutes || 30) * 60000)
    }
    
    // Enable rebuy period if configured
    if (this.config.rebuyAllowed) {
      this.tournamentState.rebuyPeriodActive = true
      setTimeout(() => {
        this.tournamentState.rebuyPeriodActive = false
        this.emit('rebuyPeriodEnded')
      }, (this.config.rebuyPeriod || 60) * 60000)
    }
    
    // Emit event
    this.emit('tournamentStarted')
    
    return true
  }

  /**
   * Create tables and seat players
   */
  private createTablesAndSeatPlayers(): void {
    const playersPerTable = this.config.tournamentType === 'heads_up' ? 2 : 9
    const tableCount = Math.ceil(this.tournamentState.currentPlayers.length / playersPerTable)
    
    // Shuffle players for random seating
    const shuffledPlayers = [...this.tournamentState.currentPlayers].sort(() => Math.random() - 0.5)
    
    // Create tables
    for (let i = 0; i < tableCount; i++) {
      const table: TournamentTable = {
        id: `table_${i + 1}`,
        tableNumber: i + 1,
        players: [],
        gameState: this.createInitialGameState(),
        isActive: true,
        isFinalTable: false,
        averageStack: this.config.startingChips
      }
      
      // Assign players to table
      const startIndex = i * playersPerTable
      const endIndex = Math.min(startIndex + playersPerTable, shuffledPlayers.length)
      
      for (let j = startIndex; j < endIndex; j++) {
        const player = shuffledPlayers[j]
        player.tableId = table.id
        player.seatPosition = j - startIndex + 1
        table.players.push(player)
      }
      
      this.tournamentState.tables.push(table)
    }
  }

  /**
   * Start a blind level
   */
  private startBlindLevel(level: number): void {
    if (level >= this.config.blindStructure.length) {
      level = this.config.blindStructure.length - 1 // Stay at highest level
    }
    
    const blindLevel = this.config.blindStructure[level]
    
    // Update tournament state
    this.tournamentState.currentLevel = level
    this.tournamentState.levelStartTime = new Date()
    this.tournamentState.nextLevelTime = new Date(Date.now() + blindLevel.duration * 60000)
    this.tournamentState.blindHistory.push(blindLevel)
    this.tournamentState.statistics.eliminationsThisLevel = 0
    
    // Update all table game states with new blinds
    this.tournamentState.tables.forEach(table => {
      if (table.isActive) {
        table.gameState.current_bet = blindLevel.bigBlind
        table.gameState.min_raise = blindLevel.bigBlind
        // Update small/big blind positions would be handled by game engine
      }
    })
    
    // Start level timer
    this.startLevelTimer(blindLevel.duration * 60000)
    
    // Emit event
    this.emit('levelStarted', { level, blindLevel })
  }

  /**
   * Start level timer
   */
  private startLevelTimer(duration: number): void {
    if (this.levelTimer) {
      clearTimeout(this.levelTimer)
    }
    
    this.levelTimer = setTimeout(() => {
      this.advanceBlindLevel()
    }, duration)
  }

  /**
   * Advance to next blind level
   */
  private advanceBlindLevel(): void {
    const nextLevel = this.tournamentState.currentLevel + 1
    
    if (nextLevel < this.config.blindStructure.length) {
      this.startBlindLevel(nextLevel)
      this.emit('levelAdvanced', { level: nextLevel })
    } else {
      // Stay at current level but continue timer
      this.startLevelTimer(this.config.blindLevelDuration * 60000)
    }
  }

  /**
   * Handle player elimination
   */
  eliminatePlayer(playerId: string, eliminatedBy?: string): void {
    const playerIndex = this.tournamentState.currentPlayers.findIndex(p => p.user_id === playerId)
    if (playerIndex === -1) {
      throw new Error('Player not found in tournament')
    }
    
    const player = this.tournamentState.currentPlayers[playerIndex]
    
    // Update player info
    player.eliminatedAt = new Date()
    player.finalPosition = this.tournamentState.playersRemaining
    player.status = 'left'
    
    // Move to eliminated players
    this.tournamentState.playersEliminated.push(player)
    this.tournamentState.currentPlayers.splice(playerIndex, 1)
    this.tournamentState.playersRemaining--
    this.tournamentState.statistics.eliminationsThisLevel++
    
    // Remove from table
    const table = this.tournamentState.tables.find(t => t.id === player.tableId)
    if (table) {
      const tablePlayerIndex = table.players.findIndex(p => p.user_id === playerId)
      if (tablePlayerIndex !== -1) {
        table.players.splice(tablePlayerIndex, 1)
      }
    }
    
    // Check for payouts
    this.checkAndProcessPayouts(player)
    
    // Emit event
    this.emit('playerEliminated', { 
      player, 
      eliminatedBy, 
      position: player.finalPosition,
      playersRemaining: this.tournamentState.playersRemaining 
    })
    
    // Check tournament end conditions
    this.checkTournamentEndConditions()
    
    // Rebalance tables if needed
    this.rebalanceTables()
  }

  /**
   * Process rebuy for a player
   */
  processRebuy(playerId: string): boolean {
    if (!this.tournamentState.rebuyPeriodActive) {
      throw new Error('Rebuy period is not active')
    }
    
    const player = this.tournamentState.currentPlayers.find(p => p.user_id === playerId)
    if (!player) {
      throw new Error('Player not found in tournament')
    }
    
    if (player.current_chips > 0) {
      throw new Error('Player must be eliminated to rebuy')
    }
    
    // Add chips and update stats
    player.current_chips = this.config.startingChips
    player.rebuysUsed++
    player.status = 'active'
    
    // Update tournament stats
    this.tournamentState.statistics.totalRebuys++
    this.updatePrizePool(this.config.buyIn)
    
    // Emit event
    this.emit('playerRebuyed', { player })
    
    return true
  }

  /**
   * Process addon for a player
   */
  processAddon(playerId: string): boolean {
    if (!this.tournamentState.addonPeriodActive) {
      throw new Error('Addon period is not active')
    }
    
    const player = this.tournamentState.currentPlayers.find(p => p.user_id === playerId)
    if (!player) {
      throw new Error('Player not found in tournament')
    }
    
    if (player.addonsUsed > 0) {
      throw new Error('Player has already used addon')
    }
    
    // Add chips and update stats
    player.current_chips += this.config.addonAmount || this.config.startingChips
    player.addonsUsed++
    
    // Update tournament stats
    this.tournamentState.statistics.totalAddons++
    this.updatePrizePool(this.config.addonAmount || this.config.buyIn)
    
    // Emit event
    this.emit('playerAddedOn', { player })
    
    return true
  }

  /**
   * Update tournament statistics
   */
  updateStatistics(): void {
    const allPlayers = [...this.tournamentState.currentPlayers, ...this.tournamentState.playersEliminated]
    
    // Calculate average stack
    const totalChips = this.tournamentState.currentPlayers.reduce((sum, p) => sum + p.current_chips, 0)
    this.tournamentState.statistics.averageStack = totalChips / this.tournamentState.playersRemaining || 0
    
    // Find chip leader
    const chipLeader = this.tournamentState.currentPlayers.reduce((leader, player) => {
      if (player.current_chips > leader.current_chips) {
        return player
      }
      return leader
    }, this.tournamentState.currentPlayers[0])
    
    if (chipLeader) {
      this.tournamentState.statistics.chipLeader = {
        playerId: chipLeader.user_id,
        playerName: chipLeader.id, // Should be display name
        chips: chipLeader.current_chips
      }
      
      // Update chip leader flag
      this.tournamentState.currentPlayers.forEach(p => {
        p.isChipLeader = p.user_id === chipLeader.user_id
      })
    }
    
    // Calculate level progress
    const now = Date.now()
    const levelStart = this.tournamentState.levelStartTime.getTime()
    const levelEnd = this.tournamentState.nextLevelTime.getTime()
    this.tournamentState.statistics.levelProgress = 
      Math.min(100, ((now - levelStart) / (levelEnd - levelStart)) * 100)
  }

  /**
   * Check and process payouts
   */
  private checkAndProcessPayouts(eliminatedPlayer: TournamentPlayer): void {
    const payoutStructure = this.config.payoutStructure.find(
      p => p.position === eliminatedPlayer.finalPosition
    )
    
    if (payoutStructure) {
      const payoutAmount = Math.floor(
        (this.tournamentState.totalPrizePool * payoutStructure.percentage) / 100
      )
      
      eliminatedPlayer.prizeMoney = payoutAmount
      
      const payout: TournamentPayout = {
        position: eliminatedPlayer.finalPosition!,
        playerId: eliminatedPlayer.user_id,
        playerName: eliminatedPlayer.id, // Should be display name
        amount: payoutAmount,
        paidAt: new Date()
      }
      
      this.tournamentState.payouts.push(payout)
      
      // Emit payout event
      this.emit('payoutProcessed', { payout, player: eliminatedPlayer })
    }
  }

  /**
   * Rebalance tables
   */
  private rebalanceTables(): void {
    const activeTables = this.tournamentState.tables.filter(t => t.isActive)
    const totalPlayers = this.tournamentState.currentPlayers.length
    
    if (totalPlayers <= 1) return
    
    // Check if we need to break a table
    const emptyTables = activeTables.filter(t => t.players.length === 0)
    emptyTables.forEach(table => {
      table.isActive = false
    })
    
    // Check if we're at final table
    if (totalPlayers <= 9 && !this.tournamentState.tables.some(t => t.isFinalTable)) {
      this.createFinalTable()
    }
    
    // Balance remaining tables
    const playersPerTable = Math.floor(totalPlayers / activeTables.filter(t => t.isActive).length)
    const remainingPlayers = totalPlayers % activeTables.filter(t => t.isActive).length
    
    // Redistribute players if needed
    const activeTablesWithPlayers = activeTables.filter(t => t.isActive)
    let playerIndex = 0
    
    activeTablesWithPlayers.forEach((table, tableIndex) => {
      const targetPlayerCount = playersPerTable + (tableIndex < remainingPlayers ? 1 : 0)
      
      while (table.players.length < targetPlayerCount && playerIndex < totalPlayers) {
        const player = this.tournamentState.currentPlayers[playerIndex]
        if (!table.players.some(p => p.user_id === player.user_id)) {
          // Move player to this table
          const oldTable = this.tournamentState.tables.find(t => t.id === player.tableId)
          if (oldTable) {
            const oldPlayerIndex = oldTable.players.findIndex(p => p.user_id === player.user_id)
            if (oldPlayerIndex !== -1) {
              oldTable.players.splice(oldPlayerIndex, 1)
            }
          }
          
          player.tableId = table.id
          player.seatPosition = table.players.length + 1
          table.players.push(player)
        }
        playerIndex++
      }
    })
  }

  /**
   * Create final table
   */
  private createFinalTable(): void {
    // Deactivate all current tables
    this.tournamentState.tables.forEach(table => {
      table.isActive = false
    })
    
    // Create final table
    const finalTable: TournamentTable = {
      id: 'final_table',
      tableNumber: 999,
      players: [...this.tournamentState.currentPlayers],
      gameState: this.createInitialGameState(),
      isActive: true,
      isFinalTable: true,
      averageStack: this.tournamentState.statistics.averageStack
    }
    
    // Update player table assignments
    finalTable.players.forEach((player, index) => {
      player.tableId = finalTable.id
      player.seatPosition = index + 1
    })
    
    this.tournamentState.tables.push(finalTable)
    this.tournamentState.status = 'final_table'
    
    // Emit event
    this.emit('finalTableReached', { players: finalTable.players })
  }

  /**
   * Check tournament end conditions
   */
  private checkTournamentEndConditions(): void {
    if (this.tournamentState.playersRemaining === 1) {
      this.completeTournament()
    } else if (this.tournamentState.playersRemaining === 0) {
      // Edge case - should not happen but handle gracefully
      this.cancelTournament('No players remaining')
    }
  }

  /**
   * Complete the tournament
   */
  private completeTournament(): void {
    this.tournamentState.status = 'completed'
    
    // Award winner
    const winner = this.tournamentState.currentPlayers[0]
    if (winner) {
      winner.finalPosition = 1
      const winnerPayout = this.config.payoutStructure.find(p => p.position === 1)
      if (winnerPayout) {
        const payoutAmount = Math.floor(
          (this.tournamentState.totalPrizePool * winnerPayout.percentage) / 100
        )
        winner.prizeMoney = payoutAmount
        
        const payout: TournamentPayout = {
          position: 1,
          playerId: winner.user_id,
          playerName: winner.id, // Should be display name
          amount: payoutAmount,
          paidAt: new Date()
        }
        
        this.tournamentState.payouts.push(payout)
      }
    }
    
    // Clear timer
    if (this.levelTimer) {
      clearTimeout(this.levelTimer)
    }
    
    // Emit completion event
    this.emit('tournamentCompleted', { 
      winner, 
      payouts: this.tournamentState.payouts,
      statistics: this.tournamentState.statistics 
    })
  }

  /**
   * Cancel the tournament
   */
  cancelTournament(reason: string): void {
    this.tournamentState.status = 'cancelled'
    
    // Clear timer
    if (this.levelTimer) {
      clearTimeout(this.levelTimer)
    }
    
    // Refund players (would be handled by payment system)
    this.emit('tournamentCancelled', { reason })
  }

  /**
   * Check if tournament can start
   */
  private checkTournamentStart(): void {
    if (this.config.tournamentType === 'sit_n_go') {
      if (this.tournamentState.currentPlayers.length === this.config.maxPlayers) {
        this.startTournament()
      }
    }
  }

  /**
   * Update prize pool
   */
  private updatePrizePool(amount: number): void {
    this.tournamentState.totalPrizePool += amount
  }

  /**
   * Create initial game state
   */
  private createInitialGameState(): GameState {
    const firstLevel = this.config.blindStructure[0]
    return {
      dealer_position: 1,
      small_blind_position: 1,
      big_blind_position: 2,
      current_betting_round: 'preflop',
      community_cards: [],
      side_pots: [],
      current_bet: firstLevel.bigBlind,
      min_raise: firstLevel.bigBlind
    }
  }

  /**
   * Event handling
   */
  on(eventName: string, handler: Function): void {
    if (!this.eventHandlers.has(eventName)) {
      this.eventHandlers.set(eventName, [])
    }
    this.eventHandlers.get(eventName)!.push(handler)
  }

  private emit(eventName: string, data?: any): void {
    const handlers = this.eventHandlers.get(eventName)
    if (handlers) {
      handlers.forEach(handler => handler(data))
    }
  }

  /**
   * Event handler implementations
   */
  private handlePlayerElimination(data: any): void {
    this.updateStatistics()
    console.log(`Player eliminated: ${data.player.id} in position ${data.position}`)
  }

  private handleLevelAdvancement(data: any): void {
    this.updateStatistics()
    console.log(`Tournament advanced to level ${data.level}`)
  }

  private handleFinalTable(data: any): void {
    console.log(`Final table reached with ${data.players.length} players`)
  }

  private handleTournamentCompletion(data: any): void {
    console.log(`Tournament completed. Winner: ${data.winner?.id}`)
  }

  /**
   * Get current tournament state
   */
  getTournamentState(): TournamentState {
    this.updateStatistics()
    return { ...this.tournamentState }
  }

  /**
   * Get tournament configuration
   */
  getTournamentConfig(): TournamentConfig {
    return { ...this.config }
  }

  /**
   * Pause tournament
   */
  pauseTournament(): void {
    if (this.levelTimer) {
      clearTimeout(this.levelTimer)
    }
    // Tournament would be paused at game level
    this.emit('tournamentPaused')
  }

  /**
   * Resume tournament
   */
  resumeTournament(): void {
    const timeRemaining = this.tournamentState.nextLevelTime.getTime() - Date.now()
    if (timeRemaining > 0) {
      this.startLevelTimer(timeRemaining)
    } else {
      this.advanceBlindLevel()
    }
    this.emit('tournamentResumed')
  }

  /**
   * Get leaderboard
   */
  getLeaderboard(): TournamentPlayer[] {
    return [...this.tournamentState.currentPlayers]
      .sort((a, b) => b.current_chips - a.current_chips)
      .map((player, index) => ({
        ...player,
        tournamentPosition: index + 1
      }))
  }

  /**
   * Get payout information
   */
  getPayoutInfo(): PayoutStructure[] {
    return this.config.payoutStructure.map(payout => ({
      ...payout,
      amount: Math.floor((this.tournamentState.totalPrizePool * payout.percentage) / 100)
    }))
  }

  /**
   * Cleanup tournament resources
   */
  cleanup(): void {
    if (this.levelTimer) {
      clearTimeout(this.levelTimer)
    }
    this.eventHandlers.clear()
  }
}