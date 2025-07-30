import { faker } from '@faker-js/faker'
import type { 
  User, 
  UserProfile, 
  HomeGame, 
  SessionPlayer, 
  PokerSession, 
  GameConfig,
  Card,
  PlayerAction,
  Hand
} from '@/types'

// User factory
export function createTestUser(overrides: Partial<User> = {}): User {
  const baseUser: User = {
    id: faker.string.uuid(),
    email: faker.internet.email(),
    username: faker.internet.userName(),
    created_at: faker.date.past().toISOString(),
    updated_at: faker.date.recent().toISOString(),
    email_verified: faker.datatype.boolean(),
    metadata: {}
  }

  return { ...baseUser, ...overrides }
}

// User profile factory
export function createTestUserProfile(overrides: Partial<UserProfile> = {}): UserProfile {
  const baseProfile: UserProfile = {
    id: faker.string.uuid(),
    user_id: faker.string.uuid(),
    display_name: faker.person.fullName(),
    avatar_url: faker.image.avatar(),
    bio: faker.lorem.paragraph(),
    preferences: {
      theme: faker.helpers.arrayElement(['light', 'dark', 'system'] as const),
      sound_enabled: faker.datatype.boolean(),
      notifications_enabled: faker.datatype.boolean(),
      auto_muck: faker.datatype.boolean(),
      show_hand_strength: faker.datatype.boolean()
    },
    privacy_settings: {
      show_stats: faker.datatype.boolean(),
      show_online_status: faker.datatype.boolean(),
      allow_friend_requests: faker.datatype.boolean()
    },
    created_at: faker.date.past().toISOString(),
    updated_at: faker.date.recent().toISOString()
  }

  return { ...baseProfile, ...overrides }
}

// Home game factory
export function createTestHomeGame(overrides: Partial<HomeGame> = {}): HomeGame {
  const baseGame: HomeGame = {
    id: faker.string.uuid(),
    owner_id: faker.string.uuid(),
    name: faker.company.name() + ' Poker Game',
    description: faker.lorem.sentence(),
    game_type: faker.helpers.arrayElement(['texas_holdem', 'omaha', 'seven_card_stud'] as const),
    settings: {
      small_blind: faker.number.int({ min: 1, max: 25 }),
      big_blind: faker.number.int({ min: 2, max: 50 }),
      max_players: faker.number.int({ min: 2, max: 10 }),
      buy_in_min: faker.number.int({ min: 50, max: 500 }),
      buy_in_max: faker.number.int({ min: 100, max: 2000 }),
      allow_rebuys: faker.datatype.boolean(),
      time_bank: faker.number.int({ min: 15, max: 120 }),
      special_rules: {
        run_it_twice: faker.datatype.boolean(),
        seven_two_bonus: faker.datatype.boolean(),
        straddle_allowed: faker.datatype.boolean(),
        ante: faker.number.float({ min: 0, max: 5, fractionDigits: 2 })
      }
    },
    status: faker.helpers.arrayElement(['active', 'paused', 'archived'] as const),
    invite_code: faker.string.alphanumeric(8).toUpperCase(),
    created_at: faker.date.past().toISOString(),
    updated_at: faker.date.recent().toISOString()
  }

  return { ...baseGame, ...overrides }
}

// Game config factory
export function createTestGameConfig(overrides: Partial<GameConfig> = {}): GameConfig {
  const baseConfig: GameConfig = {
    game_variant: faker.helpers.arrayElement(['texas_holdem', 'omaha', 'seven_card_stud'] as const),
    betting_structure: faker.helpers.arrayElement(['no_limit', 'pot_limit', 'fixed_limit'] as const),
    small_blind: faker.number.int({ min: 1, max: 25 }),
    big_blind: faker.number.int({ min: 2, max: 50 }),
    ante: faker.number.float({ min: 0, max: 5, fractionDigits: 2 }),
    time_limit: faker.number.int({ min: 15, max: 120 })
  }

  return { ...baseConfig, ...overrides }
}

// Poker session factory
export function createTestPokerSession(overrides: Partial<PokerSession> = {}): PokerSession {
  const baseSession: PokerSession = {
    id: faker.string.uuid(),
    home_game_id: faker.string.uuid(),
    created_by: faker.string.uuid(),
    session_type: faker.helpers.arrayElement(['cash_game', 'tournament', 'sit_n_go'] as const),
    game_config: createTestGameConfig(),
    status: faker.helpers.arrayElement(['waiting', 'active', 'paused', 'completed', 'cancelled'] as const),
    started_at: faker.date.recent().toISOString(),
    total_pot: faker.number.int({ min: 0, max: 10000 }),
    hand_count: faker.number.int({ min: 0, max: 500 })
  }

  return { ...baseSession, ...overrides }
}

// Session player factory
export function createTestSessionPlayer(overrides: Partial<SessionPlayer> = {}): SessionPlayer {
  const buyInAmount = faker.number.int({ min: 100, max: 1000 })
  const basePlayer: SessionPlayer = {
    id: faker.string.uuid(),
    session_id: faker.string.uuid(),
    user_id: faker.string.uuid(),
    seat_number: faker.number.int({ min: 1, max: 10 }),
    buy_in_amount: buyInAmount,
    current_chips: faker.number.int({ min: 0, max: buyInAmount * 2 }),
    final_amount: 0,
    status: faker.helpers.arrayElement(['waiting', 'active', 'sitting_out', 'left'] as const),
    joined_at: faker.date.recent().toISOString(),
    session_stats: {
      hands_played: faker.number.int({ min: 0, max: 100 }),
      hands_won: faker.number.int({ min: 0, max: 50 }),
      vpip: faker.number.float({ min: 0, max: 100, fractionDigits: 1 }),
      pfr: faker.number.float({ min: 0, max: 50, fractionDigits: 1 }),
      aggression_factor: faker.number.float({ min: 0, max: 10, fractionDigits: 2 }),
      total_wagered: faker.number.int({ min: 0, max: 5000 })
    }
  }

  return { ...basePlayer, ...overrides }
}

// Card factory
export function createTestCard(overrides: Partial<Card> = {}): Card {
  const suits: Card['suit'][] = ['hearts', 'diamonds', 'clubs', 'spades']
  const ranks: Card['rank'][] = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A']
  
  const baseCard: Card = {
    suit: faker.helpers.arrayElement(suits),
    rank: faker.helpers.arrayElement(ranks)
  }

  return { ...baseCard, ...overrides }
}

// Hand factory
export function createTestHand(overrides: Partial<Hand> = {}): Hand {
  const baseHand: Hand = {
    id: faker.string.uuid(),
    session_id: faker.string.uuid(),
    hand_number: faker.number.int({ min: 1, max: 1000 }),
    game_variant: 'texas_holdem',
    pot_size: faker.number.int({ min: 0, max: 5000 }),
    rake_amount: faker.number.float({ min: 0, max: 50, fractionDigits: 2 }),
    board_cards: Array.from({ length: faker.number.int({ min: 0, max: 5 }) }, () => createTestCard()),
    game_state: {
      dealer_position: faker.number.int({ min: 1, max: 10 }),
      small_blind_position: faker.number.int({ min: 1, max: 10 }),
      big_blind_position: faker.number.int({ min: 1, max: 10 }),
      current_betting_round: faker.helpers.arrayElement(['preflop', 'flop', 'turn', 'river', 'showdown'] as const),
      community_cards: Array.from({ length: faker.number.int({ min: 0, max: 5 }) }, () => createTestCard()),
      side_pots: [],
      action_on: faker.string.uuid(),
      current_bet: faker.number.int({ min: 0, max: 200 }),
      min_raise: faker.number.int({ min: 0, max: 100 })
    },
    started_at: faker.date.recent().toISOString()
  }

  return { ...baseHand, ...overrides }
}

// Player action factory
export function createTestPlayerAction(overrides: Partial<PlayerAction> = {}): PlayerAction {
  const actions: PlayerAction['action'][] = ['fold', 'check', 'call', 'raise', 'bet', 'all_in']
  const action = faker.helpers.arrayElement(actions)
  
  const baseAction: PlayerAction = {
    player_id: faker.string.uuid(),
    action,
    timestamp: faker.date.recent().toISOString(),
    ...((['raise', 'bet', 'all_in'].includes(action)) && {
      amount: faker.number.int({ min: 1, max: 500 })
    })
  }

  return { ...baseAction, ...overrides }
}

// Batch factory functions
export function createTestUsers(count: number, overrides: Partial<User> = {}): User[] {
  return Array.from({ length: count }, () => createTestUser(overrides))
}

export function createTestSessionPlayers(count: number, sessionId: string, overrides: Partial<SessionPlayer> = {}): SessionPlayer[] {
  return Array.from({ length: count }, (_, index) => 
    createTestSessionPlayer({
      session_id: sessionId,
      seat_number: index + 1,
      status: 'active',
      ...overrides
    })
  )
}

export function createTestCards(count: number): Card[] {
  const usedCards = new Set<string>()
  const cards: Card[] = []

  while (cards.length < count) {
    const card = createTestCard()
    const cardKey = `${card.rank}${card.suit}`
    
    if (!usedCards.has(cardKey)) {
      usedCards.add(cardKey)
      cards.push(card)
    }
  }

  return cards
}

// Poker-specific helpers
export function createStandardDeck(): Card[] {
  const suits: Card['suit'][] = ['hearts', 'diamonds', 'clubs', 'spades']
  const ranks: Card['rank'][] = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A']
  
  const deck: Card[] = []
  for (const suit of suits) {
    for (const rank of ranks) {
      deck.push({ rank, suit })
    }
  }
  
  return deck
}

export function createTestGameScenario(playerCount: number = 3): {
  users: User[]
  homeGame: HomeGame
  session: PokerSession
  players: SessionPlayer[]
} {
  const users = createTestUsers(playerCount)
  const owner = users[0]
  
  const homeGame = createTestHomeGame({
    owner_id: owner.id,
    settings: {
      ...createTestHomeGame().settings,
      max_players: playerCount
    }
  })
  
  const session = createTestPokerSession({
    home_game_id: homeGame.id,
    created_by: owner.id,
    status: 'active'
  })
  
  const players = users.map((user, index) => 
    createTestSessionPlayer({
      session_id: session.id,
      user_id: user.id,
      seat_number: index + 1,
      status: 'active'
    })
  )
  
  return { users, homeGame, session, players }
}

// Performance test data generators
export function createLargeDataset(entityType: 'users' | 'games' | 'sessions', count: number): any[] {
  switch (entityType) {
    case 'users':
      return createTestUsers(count)
    case 'games':
      return Array.from({ length: count }, () => createTestHomeGame())
    case 'sessions':
      return Array.from({ length: count }, () => createTestPokerSession())
    default:
      throw new Error(`Unknown entity type: ${entityType}`)
  }
}

// Authentication test data
export function createAuthTestData() {
  return {
    validUser: createTestUser({
      email: 'valid@test.com',
      username: 'validuser',
      email_verified: true
    }),
    invalidUser: createTestUser({
      email: 'invalid@test.com',
      username: 'invaliduser',
      email_verified: false
    }),
    adminUser: createTestUser({
      email: 'admin@test.com',
      username: 'admin',
      email_verified: true,
      metadata: { role: 'admin' }
    })
  }
}