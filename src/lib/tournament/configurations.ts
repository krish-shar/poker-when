import type { TournamentConfig, BlindLevel, PayoutStructure } from './engine'

/**
 * Default tournament configurations for different formats
 */

// Standard Sit & Go (9 players)
export const SIT_N_GO_9_STANDARD: TournamentConfig = {
  tournamentType: 'sit_n_go',
  maxPlayers: 9,
  buyIn: 10,
  prizePool: 90,
  blindStructure: [
    { level: 1, smallBlind: 10, bigBlind: 20, ante: 0, duration: 10 },
    { level: 2, smallBlind: 15, bigBlind: 30, ante: 0, duration: 10 },
    { level: 3, smallBlind: 25, bigBlind: 50, ante: 0, duration: 10 },
    { level: 4, smallBlind: 50, bigBlind: 100, ante: 0, duration: 10 },
    { level: 5, smallBlind: 75, bigBlind: 150, ante: 0, duration: 10 },
    { level: 6, smallBlind: 100, bigBlind: 200, ante: 25, duration: 10 },
    { level: 7, smallBlind: 150, bigBlind: 300, ante: 25, duration: 10 },
    { level: 8, smallBlind: 200, bigBlind: 400, ante: 50, duration: 10 },
    { level: 9, smallBlind: 300, bigBlind: 600, ante: 50, duration: 10 },
    { level: 10, smallBlind: 400, bigBlind: 800, ante: 75, duration: 10 },
    { level: 11, smallBlind: 600, bigBlind: 1200, ante: 75, duration: 10 },
    { level: 12, smallBlind: 800, bigBlind: 1600, ante: 100, duration: 10 },
    { level: 13, smallBlind: 1000, bigBlind: 2000, ante: 100, duration: 10 },
    { level: 14, smallBlind: 1500, bigBlind: 3000, ante: 150, duration: 10 },
    { level: 15, smallBlind: 2000, bigBlind: 4000, ante: 200, duration: 10 }
  ],
  blindLevelDuration: 10,
  startingChips: 1500,
  payoutStructure: [
    { position: 1, percentage: 50 },
    { position: 2, percentage: 30 },
    { position: 3, percentage: 20 }
  ],
  lateRegistration: false,
  rebuyAllowed: false,
  addonAllowed: false
}

// Turbo Sit & Go (6 players)
export const SIT_N_GO_6_TURBO: TournamentConfig = {
  tournamentType: 'sit_n_go',
  maxPlayers: 6,
  buyIn: 20,
  prizePool: 120,
  blindStructure: [
    { level: 1, smallBlind: 10, bigBlind: 20, ante: 0, duration: 5 },
    { level: 2, smallBlind: 15, bigBlind: 30, ante: 0, duration: 5 },
    { level: 3, smallBlind: 25, bigBlind: 50, ante: 0, duration: 5 },
    { level: 4, smallBlind: 50, bigBlind: 100, ante: 0, duration: 5 },
    { level: 5, smallBlind: 75, bigBlind: 150, ante: 0, duration: 5 },
    { level: 6, smallBlind: 100, bigBlind: 200, ante: 25, duration: 5 },
    { level: 7, smallBlind: 150, bigBlind: 300, ante: 25, duration: 5 },
    { level: 8, smallBlind: 200, bigBlind: 400, ante: 50, duration: 5 },
    { level: 9, smallBlind: 300, bigBlind: 600, ante: 50, duration: 5 },
    { level: 10, smallBlind: 500, bigBlind: 1000, ante: 75, duration: 5 },
    { level: 11, smallBlind: 750, bigBlind: 1500, ante: 100, duration: 5 },
    { level: 12, smallBlind: 1000, bigBlind: 2000, ante: 100, duration: 5 }
  ],
  blindLevelDuration: 5,
  startingChips: 1500,
  payoutStructure: [
    { position: 1, percentage: 65 },
    { position: 2, percentage: 35 }
  ],
  lateRegistration: false,
  rebuyAllowed: false,
  addonAllowed: false
}

// Heads-Up Tournament
export const HEADS_UP_TOURNAMENT: TournamentConfig = {
  tournamentType: 'heads_up',
  maxPlayers: 2,
  buyIn: 50,
  prizePool: 100,
  blindStructure: [
    { level: 1, smallBlind: 10, bigBlind: 20, ante: 0, duration: 10 },
    { level: 2, smallBlind: 15, bigBlind: 30, ante: 0, duration: 10 },
    { level: 3, smallBlind: 25, bigBlind: 50, ante: 0, duration: 10 },
    { level: 4, smallBlind: 50, bigBlind: 100, ante: 0, duration: 10 },
    { level: 5, smallBlind: 75, bigBlind: 150, ante: 0, duration: 10 },
    { level: 6, smallBlind: 100, bigBlind: 200, ante: 0, duration: 10 },
    { level: 7, smallBlind: 150, bigBlind: 300, ante: 0, duration: 10 },
    { level: 8, smallBlind: 200, bigBlind: 400, ante: 0, duration: 10 },
    { level: 9, smallBlind: 300, bigBlind: 600, ante: 0, duration: 10 },
    { level: 10, smallBlind: 500, bigBlind: 1000, ante: 0, duration: 10 }
  ],
  blindLevelDuration: 10,
  startingChips: 3000,
  payoutStructure: [
    { position: 1, percentage: 100 }
  ],
  lateRegistration: false,
  rebuyAllowed: false,
  addonAllowed: false
}

// Multi-Table Tournament (50 players)
export const MULTI_TABLE_50: TournamentConfig = {
  tournamentType: 'multi_table',
  maxPlayers: 50,
  buyIn: 100,
  prizePool: 5000,
  blindStructure: [
    { level: 1, smallBlind: 25, bigBlind: 50, ante: 0, duration: 15 },
    { level: 2, smallBlind: 50, bigBlind: 100, ante: 0, duration: 15 },
    { level: 3, smallBlind: 75, bigBlind: 150, ante: 0, duration: 15 },
    { level: 4, smallBlind: 100, bigBlind: 200, ante: 0, duration: 15 },
    { level: 5, smallBlind: 150, bigBlind: 300, ante: 0, duration: 15 },
    { level: 6, smallBlind: 200, bigBlind: 400, ante: 25, duration: 15 },
    { level: 7, smallBlind: 300, bigBlind: 600, ante: 50, duration: 15 },
    { level: 8, smallBlind: 400, bigBlind: 800, ante: 75, duration: 15 },
    { level: 9, smallBlind: 500, bigBlind: 1000, ante: 100, duration: 15 },
    { level: 10, smallBlind: 750, bigBlind: 1500, ante: 150, duration: 15 },
    { level: 11, smallBlind: 1000, bigBlind: 2000, ante: 200, duration: 15 },
    { level: 12, smallBlind: 1500, bigBlind: 3000, ante: 300, duration: 15 },
    { level: 13, smallBlind: 2000, bigBlind: 4000, ante: 400, duration: 15 },
    { level: 14, smallBlind: 3000, bigBlind: 6000, ante: 600, duration: 15 },
    { level: 15, smallBlind: 4000, bigBlind: 8000, ante: 800, duration: 15 },
    { level: 16, smallBlind: 6000, bigBlind: 12000, ante: 1200, duration: 15 },
    { level: 17, smallBlind: 8000, bigBlind: 16000, ante: 1600, duration: 15 },
    { level: 18, smallBlind: 10000, bigBlind: 20000, ante: 2000, duration: 15 }
  ],
  blindLevelDuration: 15,
  startingChips: 10000,
  payoutStructure: [
    { position: 1, percentage: 30 },
    { position: 2, percentage: 20 },
    { position: 3, percentage: 15 },
    { position: 4, percentage: 10 },
    { position: 5, percentage: 8 },
    { position: 6, percentage: 6 },
    { position: 7, percentage: 5 },
    { position: 8, percentage: 3 },
    { position: 9, percentage: 3 }
  ],
  lateRegistration: true,
  lateRegistrationMinutes: 60,
  rebuyAllowed: true,
  rebuyPeriod: 90,
  addonAllowed: true,
  addonAmount: 5000
}

// Rebuy Tournament
export const REBUY_TOURNAMENT: TournamentConfig = {
  tournamentType: 'multi_table',
  maxPlayers: 20,
  buyIn: 25,
  prizePool: 500,
  blindStructure: [
    { level: 1, smallBlind: 10, bigBlind: 20, ante: 0, duration: 20 },
    { level: 2, smallBlind: 15, bigBlind: 30, ante: 0, duration: 20 },
    { level: 3, smallBlind: 25, bigBlind: 50, ante: 0, duration: 20 },
    { level: 4, smallBlind: 50, bigBlind: 100, ante: 0, duration: 20 },
    { level: 5, smallBlind: 75, bigBlind: 150, ante: 0, duration: 20 },
    { level: 6, smallBlind: 100, bigBlind: 200, ante: 25, duration: 15 },
    { level: 7, smallBlind: 150, bigBlind: 300, ante: 25, duration: 15 },
    { level: 8, smallBlind: 200, bigBlind: 400, ante: 50, duration: 15 },
    { level: 9, smallBlind: 300, bigBlind: 600, ante: 50, duration: 15 },
    { level: 10, smallBlind: 400, bigBlind: 800, ante: 75, duration: 15 },
    { level: 11, smallBlind: 600, bigBlind: 1200, ante: 100, duration: 15 },
    { level: 12, smallBlind: 800, bigBlind: 1600, ante: 100, duration: 15 }
  ],
  blindLevelDuration: 20,
  startingChips: 2000,
  payoutStructure: [
    { position: 1, percentage: 40 },
    { position: 2, percentage: 25 },
    { position: 3, percentage: 15 },
    { position: 4, percentage: 10 },
    { position: 5, percentage: 10 }
  ],
  lateRegistration: true,
  lateRegistrationMinutes: 60,
  rebuyAllowed: true,
  rebuyPeriod: 120,
  addonAllowed: true,
  addonAmount: 2000
}

/**
 * Helper functions for tournament configuration
 */

/**
 * Create custom payout structure based on number of players
 */
export function createPayoutStructure(playerCount: number, payoutPercentages?: number[]): PayoutStructure[] {
  // Default payout percentages based on player count
  const defaultPayouts: Record<number, number[]> = {
    2: [100],
    3: [50, 30, 20],
    4: [45, 30, 15, 10],
    5: [40, 25, 15, 12, 8],
    6: [40, 25, 15, 10, 6, 4],
    9: [50, 30, 20],
    18: [40, 25, 15, 10, 6, 4],
    27: [35, 22, 15, 10, 8, 5, 3, 2],
    45: [30, 20, 15, 10, 8, 6, 4, 3, 2, 2],
    90: [25, 18, 13, 10, 8, 6, 5, 4, 3, 2, 2, 2, 1, 1, 1]
  }

  // Find closest player count or use provided percentages
  const percentages = payoutPercentages || 
    defaultPayouts[playerCount] || 
    defaultPayouts[Object.keys(defaultPayouts).reduce((a, b) => 
      Math.abs(Number(a) - playerCount) < Math.abs(Number(b) - playerCount) ? a : b
    )]

  return percentages.map((percentage, index) => ({
    position: index + 1,
    percentage
  }))
}

/**
 * Create progressive blind structure
 */
export function createBlindStructure(
  startingBlinds: { small: number; big: number },
  levels: number,
  levelDuration: number,
  progression: 'standard' | 'turbo' | 'slow' = 'standard'
): BlindLevel[] {
  const progressionMultipliers = {
    slow: 1.25,
    standard: 1.5,
    turbo: 2.0
  }

  const multiplier = progressionMultipliers[progression]
  const blindStructure: BlindLevel[] = []

  let currentSmall = startingBlinds.small
  let currentBig = startingBlinds.big

  for (let i = 0; i < levels; i++) {
    const ante = i >= 5 ? Math.floor(currentBig * 0.125) : 0

    blindStructure.push({
      level: i + 1,
      smallBlind: currentSmall,
      bigBlind: currentBig,
      ante,
      duration: levelDuration
    })

    // Calculate next level blinds
    if (i < levels - 1) {
      if (i % 3 === 2) {
        // Every 3rd level, use the multiplier
        currentSmall = Math.floor(currentSmall * multiplier)
        currentBig = Math.floor(currentBig * multiplier)
      } else {
        // Otherwise, increase by ~25%
        currentSmall = Math.floor(currentSmall * 1.25)
        currentBig = Math.floor(currentBig * 1.25)
      }

      // Round to nice numbers
      currentSmall = Math.round(currentSmall / 5) * 5
      currentBig = Math.round(currentBig / 10) * 10
    }
  }

  return blindStructure
}

/**
 * Calculate tournament duration estimate
 */
export function estimateTournamentDuration(config: TournamentConfig): {
  minMinutes: number
  maxMinutes: number
  averageMinutes: number
} {
  const totalBlindTime = config.blindStructure.reduce((sum, level) => sum + level.duration, 0)
  
  // Estimates based on tournament type and structure
  const multipliers = {
    heads_up: { min: 0.3, max: 1.0, avg: 0.6 },
    sit_n_go: { min: 0.6, max: 1.5, avg: 1.0 },
    multi_table: { min: 1.2, max: 2.5, avg: 1.8 }
  }

  const mult = multipliers[config.tournamentType]
  
  return {
    minMinutes: Math.floor(totalBlindTime * mult.min),
    maxMinutes: Math.floor(totalBlindTime * mult.max),
    averageMinutes: Math.floor(totalBlindTime * mult.avg)
  }
}

/**
 * Validate tournament configuration
 */
export function validateTournamentConfig(config: TournamentConfig): {
  isValid: boolean
  errors: string[]
} {
  const errors: string[] = []

  // Basic validation
  if (config.maxPlayers < 2) {
    errors.push('Tournament must have at least 2 players')
  }

  if (config.maxPlayers > 1000) {
    errors.push('Tournament cannot have more than 1000 players')
  }

  if (config.buyIn <= 0) {
    errors.push('Buy-in must be greater than 0')
  }

  if (config.startingChips <= 0) {
    errors.push('Starting chips must be greater than 0')
  }

  if (config.blindLevelDuration < 1) {
    errors.push('Blind level duration must be at least 1 minute')
  }

  // Blind structure validation
  if (config.blindStructure.length === 0) {
    errors.push('Blind structure cannot be empty')
  }

  let prevBig = 0
  config.blindStructure.forEach((level, index) => {
    if (level.smallBlind <= 0 || level.bigBlind <= 0) {
      errors.push(`Level ${index + 1}: Blinds must be greater than 0`)
    }

    if (level.bigBlind <= level.smallBlind) {
      errors.push(`Level ${index + 1}: Big blind must be greater than small blind`)
    }

    if (level.bigBlind <= prevBig) {
      errors.push(`Level ${index + 1}: Blinds must increase from previous level`)
    }

    if (level.ante < 0) {
      errors.push(`Level ${index + 1}: Ante cannot be negative`)
    }

    if (level.duration <= 0) {
      errors.push(`Level ${index + 1}: Duration must be greater than 0`)
    }

    prevBig = level.bigBlind
  })

  // Payout structure validation
  if (config.payoutStructure.length === 0) {
    errors.push('Payout structure cannot be empty')
  }

  const totalPayout = config.payoutStructure.reduce((sum, payout) => sum + payout.percentage, 0)
  if (Math.abs(totalPayout - 100) > 0.01) {
    errors.push('Payout percentages must total 100%')
  }

  config.payoutStructure.forEach((payout, index) => {
    if (payout.position <= 0 || payout.position > config.maxPlayers) {
      errors.push(`Payout ${index + 1}: Invalid position`)
    }

    if (payout.percentage <= 0 || payout.percentage > 100) {
      errors.push(`Payout ${index + 1}: Percentage must be between 0 and 100`)
    }
  })

  // Late registration validation
  if (config.lateRegistration && (!config.lateRegistrationMinutes || config.lateRegistrationMinutes <= 0)) {
    errors.push('Late registration time must be specified and greater than 0')
  }

  // Rebuy validation
  if (config.rebuyAllowed && (!config.rebuyPeriod || config.rebuyPeriod <= 0)) {
    errors.push('Rebuy period must be specified and greater than 0')
  }

  // Addon validation
  if (config.addonAllowed && (!config.addonAmount || config.addonAmount <= 0)) {
    errors.push('Addon amount must be specified and greater than 0')
  }

  return {
    isValid: errors.length === 0,
    errors
  }
}

/**
 * Get appropriate tournament configuration by type
 */
export function getTournamentConfigByType(
  type: 'sit_n_go' | 'turbo' | 'heads_up' | 'multi_table' | 'rebuy',
  playerCount?: number
): TournamentConfig {
  switch (type) {
    case 'sit_n_go':
      return playerCount === 6 ? SIT_N_GO_6_TURBO : SIT_N_GO_9_STANDARD
    case 'turbo':
      return SIT_N_GO_6_TURBO
    case 'heads_up':
      return HEADS_UP_TOURNAMENT
    case 'multi_table':
      return MULTI_TABLE_50
    case 'rebuy':
      return REBUY_TOURNAMENT
    default:
      return SIT_N_GO_9_STANDARD
  }
}