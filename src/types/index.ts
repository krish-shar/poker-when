// Core User Types
export interface User {
  id: string;
  email: string;
  username: string;
  created_at: string;
  updated_at: string;
  last_login?: string;
  email_verified: boolean;
  metadata?: Record<string, any>;
}

export interface UserProfile {
  id: string;
  user_id: string;
  display_name?: string;
  avatar_url?: string;
  bio?: string;
  preferences: UserPreferences;
  privacy_settings: PrivacySettings;
  created_at: string;
  updated_at: string;
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  sound_enabled: boolean;
  notifications_enabled: boolean;
  auto_muck: boolean;
  show_hand_strength: boolean;
}

export interface PrivacySettings {
  show_stats: boolean;
  show_online_status: boolean;
  allow_friend_requests: boolean;
}

// Home Game Types
export interface HomeGame {
  id: string;
  owner_id: string;
  name: string;
  description?: string;
  game_type: 'texas_holdem' | 'omaha' | 'seven_card_stud';
  settings: GameSettings;
  status: 'active' | 'paused' | 'archived';
  invite_code: string;
  created_at: string;
  updated_at: string;
  archived_at?: string;
}

export interface GameSettings {
  small_blind: number;
  big_blind: number;
  max_players: number;
  buy_in_min: number;
  buy_in_max: number;
  allow_rebuys: boolean;
  time_bank: number;
  special_rules?: SpecialRules;
}

export interface SpecialRules {
  run_it_twice: boolean;
  seven_two_bonus: boolean;
  straddle_allowed: boolean;
  ante: number;
}

export interface GameMembership {
  id: string;
  home_game_id: string;
  user_id: string;
  role: 'owner' | 'admin' | 'member';
  status: 'active' | 'inactive' | 'banned';
  buy_in_amount: number;
  joined_at: string;
  updated_at: string;
}

// Poker Session Types
export interface PokerSession {
  id: string;
  home_game_id: string;
  created_by: string;
  session_type: 'cash_game' | 'tournament' | 'sit_n_go';
  game_config: GameConfig;
  status: 'waiting' | 'active' | 'paused' | 'completed' | 'cancelled';
  started_at: string;
  ended_at?: string;
  total_pot: number;
  hand_count: number;
  final_results?: Record<string, any>;
}

export interface GameConfig {
  game_variant: 'texas_holdem' | 'omaha' | 'seven_card_stud';
  betting_structure: 'no_limit' | 'pot_limit' | 'fixed_limit';
  small_blind: number;
  big_blind: number;
  ante: number;
  time_limit?: number;
}

export interface SessionPlayer {
  id: string;
  session_id: string;
  user_id: string;
  seat_number: number;
  buy_in_amount: number;
  current_chips: number;
  final_amount: number;
  status: 'waiting' | 'active' | 'sitting_out' | 'left';
  joined_at: string;
  left_at?: string;
  session_stats: SessionStats;
}

export interface SessionStats {
  hands_played: number;
  hands_won: number;
  vpip: number;
  pfr: number;
  aggression_factor: number;
  total_wagered: number;
}

// Hand and Card Types
export interface Card {
  suit: 'hearts' | 'diamonds' | 'clubs' | 'spades';
  rank: 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | 'T' | 'J' | 'Q' | 'K';
}

export interface Hand {
  id: string;
  session_id: string;
  hand_number: number;
  game_variant: string;
  pot_size: number;
  rake_amount: number;
  board_cards: Card[];
  game_state: GameState;
  started_at: string;
  ended_at?: string;
  metadata?: Record<string, any>;
}

export interface GameState {
  dealer_position: number;
  small_blind_position: number;
  big_blind_position: number;
  current_betting_round: 'preflop' | 'flop' | 'turn' | 'river' | 'showdown';
  community_cards: Card[];
  side_pots: SidePot[];
  action_on?: string; // player_id
  current_bet: number;
  min_raise: number;
}

export interface SidePot {
  amount: number;
  eligible_players: string[];
}

export interface HandPlayer {
  id: string;
  hand_id: string;
  session_player_id: string;
  hole_cards: Card[];
  starting_chips: number;
  final_chips: number;
  net_amount: number;
  final_action?: 'fold' | 'call' | 'raise' | 'check' | 'all_in' | 'timeout';
  is_winner: boolean;
  hand_stats: HandStats;
}

export interface HandStats {
  vpip: boolean;
  pfr: boolean;
  three_bet: boolean;
  cbet: boolean;
  fold_to_cbet: boolean;
  total_invested: number;
  showdown_reached: boolean;
}

export interface HandAction {
  id: string;
  hand_id: string;
  session_player_id: string;
  sequence_number: number;
  action_type: 'fold' | 'check' | 'call' | 'raise' | 'bet' | 'all_in' | 'small_blind' | 'big_blind' | 'ante';
  amount: number;
  betting_round: 'preflop' | 'flop' | 'turn' | 'river' | 'showdown';
  action_data?: Record<string, any>;
  created_at: string;
}

// Financial Types
export interface Transaction {
  id: string;
  user_id: string;
  home_game_id?: string;
  session_id?: string;
  transaction_type: 'buy_in' | 'cash_out' | 'deposit' | 'withdrawal' | 'transfer' | 'fee' | 'rake' | 'tip' | 'settlement';
  amount: number;
  currency: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled' | 'refunded';
  payment_method?: string;
  transaction_data?: Record<string, any>;
  created_at: string;
  processed_at?: string;
}

export interface FinancialPeriod {
  id: string;
  home_game_id: string;
  period_type: 'weekly' | 'monthly' | 'quarterly' | 'yearly' | 'custom';
  start_date: string;
  end_date: string;
  status: 'active' | 'closed' | 'archived';
  summary_data: FinancialSummary;
  created_at: string;
  closed_at?: string;
}

export interface FinancialSummary {
  total_buy_ins: number;
  total_cash_outs: number;
  total_rake: number;
  net_profit_loss: number;
  player_count: number;
  session_count: number;
}

// WebSocket Types
export interface WebSocketMessage {
  type: string;
  payload: any;
  timestamp: string;
  from?: string;
}

export interface GameUpdate {
  type: 'game_state' | 'player_action' | 'hand_complete' | 'player_join' | 'player_leave';
  data: any;
}

export interface PlayerAction {
  player_id: string;
  action: 'fold' | 'check' | 'call' | 'raise' | 'bet' | 'all_in';
  amount?: number;
  timestamp: string;
}

// UI State Types
export interface GameTableState {
  session: PokerSession;
  players: SessionPlayer[];
  current_hand?: Hand;
  my_player?: SessionPlayer;
  is_my_turn: boolean;
  available_actions: AvailableAction[];
}

export interface AvailableAction {
  type: 'fold' | 'check' | 'call' | 'raise' | 'bet' | 'all_in';
  amount?: number;
  min_amount?: number;
  max_amount?: number;
}

// Analytics Types
export interface UserStatistics {
  id: string;
  user_id: string;
  home_game_id?: string;
  period_type: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'all_time' | 'custom';
  period_start?: string;
  period_end?: string;
  stats_data: DetailedStats;
  calculated_at: string;
  updated_at: string;
}

export interface DetailedStats {
  hands_played: number;
  hands_won: number;
  total_winnings: number;
  total_invested: number;
  roi: number;
  vpip: number;
  pfr: number;
  aggression_factor: number;
  wtsd: number; // Went to showdown
  w$sd: number; // Won money at showdown
  sessions_played: number;
  avg_session_length: number;
  biggest_win: number;
  biggest_loss: number;
  win_rate_bb_100: number;
}

// API Response Types
export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
  status: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    has_more: boolean;
  };
}

// Form Types
export interface CreateHomeGameForm {
  name: string;
  description?: string;
  game_type: 'texas_holdem' | 'omaha' | 'seven_card_stud';
  small_blind: number;
  big_blind: number;
  max_players: number;
  buy_in_min: number;
  buy_in_max: number;
  allow_rebuys: boolean;
  time_bank: number;
}

export interface UserRegistrationForm {
  email: string;
  username: string;
  password: string;
  display_name?: string;
}

export interface UserLoginForm {
  email: string;
  password: string;
  remember_me?: boolean;
}