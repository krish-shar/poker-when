import type { 
  User, 
  UserProfile, 
  HomeGame, 
  SessionPlayer, 
  PokerSession, 
  GameConfig,
  Card 
} from '@/types'

// Test user fixtures
export const testUsers = {
  regularUser: {
    id: 'test-user-1',
    email: 'user@test.com',
    username: 'testuser',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    email_verified: true,
    metadata: {}
  } as User,

  adminUser: {
    id: 'test-admin-1',
    email: 'admin@test.com',
    username: 'admin',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    email_verified: true,
    metadata: { role: 'admin' }
  } as User,

  gameOwner: {
    id: 'test-owner-1',
    email: 'owner@test.com',
    username: 'gameowner',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    email_verified: true,
    metadata: {}
  } as User
}

// Test user profiles
export const testUserProfiles = {
  basicProfile: {
    id: 'profile-1',
    user_id: 'test-user-1',
    display_name: 'Test User',
    avatar_url: null,
    bio: null,
    preferences: {
      theme: 'light' as const,
      sound_enabled: true,
      notifications_enabled: true,
      auto_muck: false,
      show_hand_strength: true
    },
    privacy_settings: {
      show_stats: true,
      show_online_status: true,
      allow_friend_requests: true
    },
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  } as UserProfile
}

// Test game configurations
export const testGameConfigs = {
  standardHoldem: {
    game_variant: 'texas_holdem' as const,
    betting_structure: 'no_limit' as const,
    small_blind: 1,
    big_blind: 2,
    ante: 0,
    time_limit: 30
  } as GameConfig,

  potLimitOmaha: {
    game_variant: 'omaha' as const,
    betting_structure: 'pot_limit' as const,
    small_blind: 2,
    big_blind: 4,
    ante: 0,
    time_limit: 45
  } as GameConfig,

  fixedLimitStud: {
    game_variant: 'seven_card_stud' as const,
    betting_structure: 'fixed_limit' as const,
    small_blind: 1,
    big_blind: 2,
    ante: 0.5,
    time_limit: 60
  } as GameConfig
}

// Test home games
export const testHomeGames = {
  standardGame: {
    id: 'home-game-1',
    owner_id: 'test-owner-1',
    name: 'Friday Night Poker',
    description: 'Weekly poker game with friends',
    game_type: 'texas_holdem' as const,
    settings: {
      small_blind: 1,
      big_blind: 2,
      max_players: 8,
      buy_in_min: 100,
      buy_in_max: 500,
      allow_rebuys: true,
      time_bank: 30,
      special_rules: {
        run_it_twice: false,
        seven_two_bonus: false,
        straddle_allowed: true,
        ante: 0
      }
    },
    status: 'active' as const,
    invite_code: 'FRIDAY123',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  } as HomeGame,

  highStakesGame: {
    id: 'home-game-2',
    owner_id: 'test-owner-1',
    name: 'High Stakes Club',
    description: 'High stakes poker for serious players',
    game_type: 'texas_holdem' as const,
    settings: {
      small_blind: 25,
      big_blind: 50,
      max_players: 6,
      buy_in_min: 5000,
      buy_in_max: 20000,
      allow_rebuys: false,
      time_bank: 60,
      special_rules: {
        run_it_twice: true,
        seven_two_bonus: true,
        straddle_allowed: true,
        ante: 5
      }
    },
    status: 'active' as const,
    invite_code: 'STAKES456',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  } as HomeGame
}

// Test poker sessions
export const testPokerSessions = {
  cashGame: {
    id: 'session-1',
    home_game_id: 'home-game-1',
    created_by: 'test-owner-1',
    session_type: 'cash_game' as const,
    game_config: testGameConfigs.standardHoldem,
    status: 'active' as const,
    started_at: '2024-01-01T20:00:00Z',
    total_pot: 0,
    hand_count: 0
  } as PokerSession,

  tournament: {
    id: 'session-2',
    home_game_id: 'home-game-1',
    created_by: 'test-owner-1',
    session_type: 'tournament' as const,
    game_config: testGameConfigs.standardHoldem,
    status: 'waiting' as const,
    started_at: '2024-01-01T19:00:00Z',
    total_pot: 0,
    hand_count: 0
  } as PokerSession
}

// Test session players
export const testSessionPlayers = {
  player1: {
    id: 'session-player-1',
    session_id: 'session-1',
    user_id: 'test-user-1',
    seat_number: 1,
    buy_in_amount: 200,
    current_chips: 200,
    final_amount: 0,
    status: 'active' as const,
    joined_at: '2024-01-01T20:00:00Z',
    session_stats: {
      hands_played: 0,
      hands_won: 0,
      vpip: 0,
      pfr: 0,
      aggression_factor: 0,
      total_wagered: 0
    }
  } as SessionPlayer,

  player2: {
    id: 'session-player-2',
    session_id: 'session-1',
    user_id: 'test-admin-1',
    seat_number: 2,
    buy_in_amount: 300,
    current_chips: 300,
    final_amount: 0,
    status: 'active' as const,
    joined_at: '2024-01-01T20:01:00Z',
    session_stats: {
      hands_played: 0,
      hands_won: 0,
      vpip: 0,
      pfr: 0,
      aggression_factor: 0,
      total_wagered: 0
    }
  } as SessionPlayer,

  player3: {
    id: 'session-player-3',
    session_id: 'session-1',
    user_id: 'test-owner-1',
    seat_number: 3,
    buy_in_amount: 250,
    current_chips: 250,
    final_amount: 0,
    status: 'active' as const,
    joined_at: '2024-01-01T20:02:00Z',
    session_stats: {
      hands_played: 0,
      hands_won: 0,
      vpip: 0,
      pfr: 0,
      aggression_factor: 0,
      total_wagered: 0
    }
  } as SessionPlayer
}

// Test card combinations for hand evaluation
export const testCards = {
  royalFlushSpades: [
    { rank: 'A' as const, suit: 'spades' as const },
    { rank: 'K' as const, suit: 'spades' as const },
    { rank: 'Q' as const, suit: 'spades' as const },
    { rank: 'J' as const, suit: 'spades' as const },
    { rank: 'T' as const, suit: 'spades' as const }
  ] as Card[],

  straightFlushHearts: [
    { rank: '9' as const, suit: 'hearts' as const },
    { rank: '8' as const, suit: 'hearts' as const },
    { rank: '7' as const, suit: 'hearts' as const },
    { rank: '6' as const, suit: 'hearts' as const },
    { rank: '5' as const, suit: 'hearts' as const }
  ] as Card[],

  fourOfAKind: [
    { rank: 'A' as const, suit: 'spades' as const },
    { rank: 'A' as const, suit: 'hearts' as const },
    { rank: 'A' as const, suit: 'diamonds' as const },
    { rank: 'A' as const, suit: 'clubs' as const },
    { rank: 'K' as const, suit: 'spades' as const }
  ] as Card[],

  fullHouse: [
    { rank: 'K' as const, suit: 'spades' as const },
    { rank: 'K' as const, suit: 'hearts' as const },
    { rank: 'K' as const, suit: 'diamonds' as const },
    { rank: 'Q' as const, suit: 'spades' as const },
    { rank: 'Q' as const, suit: 'hearts' as const }
  ] as Card[],

  flush: [
    { rank: 'A' as const, suit: 'spades' as const },
    { rank: 'K' as const, suit: 'spades' as const },
    { rank: 'Q' as const, suit: 'spades' as const },
    { rank: 'J' as const, suit: 'spades' as const },
    { rank: '9' as const, suit: 'spades' as const }
  ] as Card[],

  straight: [
    { rank: 'A' as const, suit: 'spades' as const },
    { rank: 'K' as const, suit: 'hearts' as const },
    { rank: 'Q' as const, suit: 'diamonds' as const },
    { rank: 'J' as const, suit: 'clubs' as const },
    { rank: 'T' as const, suit: 'spades' as const }
  ] as Card[],

  wheelStraight: [
    { rank: 'A' as const, suit: 'spades' as const },
    { rank: '5' as const, suit: 'hearts' as const },
    { rank: '4' as const, suit: 'diamonds' as const },
    { rank: '3' as const, suit: 'clubs' as const },
    { rank: '2' as const, suit: 'spades' as const }
  ] as Card[],

  threeOfAKind: [
    { rank: 'A' as const, suit: 'spades' as const },
    { rank: 'A' as const, suit: 'hearts' as const },
    { rank: 'A' as const, suit: 'diamonds' as const },
    { rank: 'K' as const, suit: 'spades' as const },
    { rank: 'Q' as const, suit: 'hearts' as const }
  ] as Card[],

  twoPair: [
    { rank: 'A' as const, suit: 'spades' as const },
    { rank: 'A' as const, suit: 'hearts' as const },
    { rank: 'K' as const, suit: 'diamonds' as const },
    { rank: 'K' as const, suit: 'spades' as const },
    { rank: 'Q' as const, suit: 'hearts' as const }
  ] as Card[],

  onePair: [
    { rank: 'A' as const, suit: 'spades' as const },
    { rank: 'A' as const, suit: 'hearts' as const },
    { rank: 'K' as const, suit: 'diamonds' as const },
    { rank: 'Q' as const, suit: 'spades' as const },
    { rank: 'J' as const, suit: 'hearts' as const }
  ] as Card[],

  highCard: [
    { rank: 'A' as const, suit: 'spades' as const },
    { rank: 'K' as const, suit: 'hearts' as const },
    { rank: 'Q' as const, suit: 'diamonds' as const },
    { rank: 'J' as const, suit: 'clubs' as const },
    { rank: '9' as const, suit: 'spades' as const }
  ] as Card[]
}

// Test action sequences
export const testActionSequences = {
  preflopFold: [
    { player_id: 'test-user-1', action: 'fold' as const, timestamp: '2024-01-01T20:00:01Z' },
    { player_id: 'test-admin-1', action: 'call' as const, amount: 10, timestamp: '2024-01-01T20:00:02Z' },
    { player_id: 'test-owner-1', action: 'check' as const, timestamp: '2024-01-01T20:00:03Z' }
  ],

  preflopRaise: [
    { player_id: 'test-user-1', action: 'raise' as const, amount: 6, timestamp: '2024-01-01T20:00:01Z' },
    { player_id: 'test-admin-1', action: 'call' as const, amount: 6, timestamp: '2024-01-01T20:00:02Z' },
    { player_id: 'test-owner-1', action: 'call' as const, amount: 4, timestamp: '2024-01-01T20:00:03Z' }
  ],

  allInSequence: [
    { player_id: 'test-user-1', action: 'all_in' as const, timestamp: '2024-01-01T20:00:01Z' },
    { player_id: 'test-admin-1', action: 'call' as const, amount: 200, timestamp: '2024-01-01T20:00:02Z' },
    { player_id: 'test-owner-1', action: 'fold' as const, timestamp: '2024-01-01T20:00:03Z' }
  ]
}

// Authentication test data
export const testAuthData = {
  validCredentials: {
    email: 'user@test.com',
    password: 'SecurePassword123!'
  },

  invalidCredentials: {
    email: 'user@test.com',
    password: 'wrongpassword'
  },

  registrationData: {
    email: 'newuser@test.com',
    username: 'newuser',
    password: 'NewPassword123!',
    display_name: 'New User'
  },

  weakPassword: {
    email: 'user@test.com',
    password: '123'  // Too weak
  },

  invalidEmail: {
    email: 'not-an-email',
    password: 'SecurePassword123!'
  }
}