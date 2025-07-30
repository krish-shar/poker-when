-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(50) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP WITH TIME ZONE,
    email_verified BOOLEAN DEFAULT FALSE,
    metadata JSONB DEFAULT '{}'::jsonb,
    
    CONSTRAINT users_email_check CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    CONSTRAINT users_username_check CHECK (LENGTH(username) >= 3 AND username ~* '^[a-zA-Z0-9_-]+$')
);

-- User profiles table
CREATE TABLE user_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    display_name VARCHAR(100),
    avatar_url TEXT,
    bio TEXT,
    preferences JSONB DEFAULT '{
        "theme": "light",
        "sound_enabled": true,
        "notifications_enabled": true,
        "auto_muck": false,
        "show_hand_strength": true
    }'::jsonb,
    privacy_settings JSONB DEFAULT '{
        "show_stats": true,
        "show_online_status": true,
        "allow_friend_requests": true
    }'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT user_profiles_user_id_unique UNIQUE(user_id),
    CONSTRAINT user_profiles_display_name_length CHECK (LENGTH(display_name) >= 2)
);

-- Home games table
CREATE TABLE home_games (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    game_type VARCHAR(50) NOT NULL DEFAULT 'texas_holdem',
    settings JSONB DEFAULT '{
        "small_blind": 1,
        "big_blind": 2,
        "max_players": 9,
        "buy_in_min": 100,
        "buy_in_max": 500,
        "allow_rebuys": true,
        "time_bank": 30,
        "special_rules": {
            "run_it_twice": false,
            "seven_two_bonus": false,
            "straddle_allowed": false,
            "ante": 0
        }
    }'::jsonb,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    invite_code VARCHAR(20) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    archived_at TIMESTAMP WITH TIME ZONE,
    
    CONSTRAINT home_games_status_check CHECK (status IN ('active', 'paused', 'archived')),
    CONSTRAINT home_games_game_type_check CHECK (game_type IN ('texas_holdem', 'omaha', 'seven_card_stud')),
    CONSTRAINT home_games_name_length CHECK (LENGTH(name) >= 3)
);

-- Game memberships table
CREATE TABLE game_memberships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    home_game_id UUID NOT NULL REFERENCES home_games(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL DEFAULT 'member',
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    buy_in_amount DECIMAL(10,2) DEFAULT 0.00,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT game_memberships_unique_membership UNIQUE(home_game_id, user_id),
    CONSTRAINT game_memberships_role_check CHECK (role IN ('owner', 'admin', 'member')),
    CONSTRAINT game_memberships_status_check CHECK (status IN ('active', 'inactive', 'banned')),
    CONSTRAINT game_memberships_buy_in_check CHECK (buy_in_amount >= 0)
);

-- Poker sessions table
CREATE TABLE poker_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    home_game_id UUID NOT NULL REFERENCES home_games(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_type VARCHAR(20) NOT NULL DEFAULT 'cash_game',
    game_config JSONB DEFAULT '{
        "game_variant": "texas_holdem",
        "betting_structure": "no_limit",
        "small_blind": 1,
        "big_blind": 2,
        "ante": 0,
        "time_limit": null
    }'::jsonb,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMP WITH TIME ZONE,
    total_pot DECIMAL(12,2) DEFAULT 0.00,
    hand_count INTEGER DEFAULT 0,
    final_results JSONB DEFAULT '{}'::jsonb,
    
    CONSTRAINT poker_sessions_session_type_check CHECK (session_type IN ('cash_game', 'tournament', 'sit_n_go')),
    CONSTRAINT poker_sessions_status_check CHECK (status IN ('waiting', 'active', 'paused', 'completed', 'cancelled')),
    CONSTRAINT poker_sessions_total_pot_check CHECK (total_pot >= 0),
    CONSTRAINT poker_sessions_hand_count_check CHECK (hand_count >= 0)
);

-- Session players table
CREATE TABLE session_players (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES poker_sessions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    seat_number INTEGER NOT NULL,
    buy_in_amount DECIMAL(10,2) NOT NULL,
    current_chips DECIMAL(10,2) NOT NULL,
    final_amount DECIMAL(10,2) DEFAULT 0.00,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    left_at TIMESTAMP WITH TIME ZONE,
    session_stats JSONB DEFAULT '{
        "hands_played": 0,
        "hands_won": 0,
        "vpip": 0,
        "pfr": 0,
        "aggression_factor": 0,
        "total_wagered": 0
    }'::jsonb,
    
    CONSTRAINT session_players_unique_seat UNIQUE(session_id, seat_number),
    CONSTRAINT session_players_unique_user UNIQUE(session_id, user_id),
    CONSTRAINT session_players_seat_number_check CHECK (seat_number BETWEEN 1 AND 10),
    CONSTRAINT session_players_status_check CHECK (status IN ('waiting', 'active', 'sitting_out', 'left')),
    CONSTRAINT session_players_amounts_check CHECK (
        buy_in_amount > 0 AND 
        current_chips >= 0 AND 
        final_amount >= 0
    )
);

-- Hands table
CREATE TABLE hands (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES poker_sessions(id) ON DELETE CASCADE,
    hand_number INTEGER NOT NULL,
    game_variant VARCHAR(30) NOT NULL DEFAULT 'texas_holdem',
    pot_size DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    rake_amount DECIMAL(8,2) DEFAULT 0.00,
    board_cards JSONB DEFAULT '[]'::jsonb,
    game_state JSONB DEFAULT '{
        "dealer_position": 1,
        "small_blind_position": 2,
        "big_blind_position": 3,
        "current_betting_round": "preflop",
        "community_cards": [],
        "side_pots": []
    }'::jsonb,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}'::jsonb,
    
    CONSTRAINT hands_unique_hand_number UNIQUE(session_id, hand_number),
    CONSTRAINT hands_hand_number_check CHECK (hand_number > 0),
    CONSTRAINT hands_pot_size_check CHECK (pot_size >= 0),
    CONSTRAINT hands_rake_amount_check CHECK (rake_amount >= 0)
);

-- Hand players table
CREATE TABLE hand_players (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hand_id UUID NOT NULL REFERENCES hands(id) ON DELETE CASCADE,
    session_player_id UUID NOT NULL REFERENCES session_players(id) ON DELETE CASCADE,
    hole_cards JSONB DEFAULT '[]'::jsonb,
    starting_chips DECIMAL(10,2) NOT NULL,
    final_chips DECIMAL(10,2) NOT NULL,
    net_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    final_action VARCHAR(20),
    is_winner BOOLEAN DEFAULT FALSE,
    hand_stats JSONB DEFAULT '{
        "vpip": false,
        "pfr": false,
        "three_bet": false,
        "cbet": false,
        "fold_to_cbet": false,
        "total_invested": 0,
        "showdown_reached": false
    }'::jsonb,
    
    CONSTRAINT hand_players_unique_hand_player UNIQUE(hand_id, session_player_id),
    CONSTRAINT hand_players_chips_check CHECK (starting_chips >= 0 AND final_chips >= 0),
    CONSTRAINT hand_players_final_action_check CHECK (
        final_action IS NULL OR 
        final_action IN ('fold', 'call', 'raise', 'check', 'all_in', 'timeout')
    )
);

-- Hand actions table
CREATE TABLE hand_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hand_id UUID NOT NULL REFERENCES hands(id) ON DELETE CASCADE,
    session_player_id UUID NOT NULL REFERENCES session_players(id) ON DELETE CASCADE,
    sequence_number INTEGER NOT NULL,
    action_type VARCHAR(20) NOT NULL,
    amount DECIMAL(10,2) DEFAULT 0.00,
    betting_round VARCHAR(20) NOT NULL,
    action_data JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT hand_actions_unique_sequence UNIQUE(hand_id, sequence_number),
    CONSTRAINT hand_actions_action_type_check CHECK (
        action_type IN ('fold', 'check', 'call', 'raise', 'bet', 'all_in', 'small_blind', 'big_blind', 'ante')
    ),
    CONSTRAINT hand_actions_betting_round_check CHECK (
        betting_round IN ('preflop', 'flop', 'turn', 'river', 'showdown')
    ),
    CONSTRAINT hand_actions_amount_check CHECK (amount >= 0),
    CONSTRAINT hand_actions_sequence_check CHECK (sequence_number > 0)
);

-- Transactions table
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    home_game_id UUID REFERENCES home_games(id) ON DELETE CASCADE,
    session_id UUID REFERENCES poker_sessions(id) ON DELETE CASCADE,
    transaction_type VARCHAR(30) NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    payment_method VARCHAR(30),
    transaction_data JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP WITH TIME ZONE,
    
    CONSTRAINT transactions_transaction_type_check CHECK (
        transaction_type IN (
            'buy_in', 'cash_out', 'deposit', 'withdrawal', 
            'transfer', 'fee', 'rake', 'tip', 'settlement'
        )
    ),
    CONSTRAINT transactions_status_check CHECK (
        status IN ('pending', 'processing', 'completed', 'failed', 'cancelled', 'refunded')
    ),
    CONSTRAINT transactions_amount_check CHECK (amount != 0),
    CONSTRAINT transactions_currency_check CHECK (LENGTH(currency) = 3)
);

-- Financial periods table
CREATE TABLE financial_periods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    home_game_id UUID NOT NULL REFERENCES home_games(id) ON DELETE CASCADE,
    period_type VARCHAR(20) NOT NULL DEFAULT 'monthly',
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    summary_data JSONB DEFAULT '{
        "total_buy_ins": 0,
        "total_cash_outs": 0,
        "total_rake": 0,
        "net_profit_loss": 0,
        "player_count": 0,
        "session_count": 0
    }'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    closed_at TIMESTAMP WITH TIME ZONE,
    
    CONSTRAINT financial_periods_period_type_check CHECK (
        period_type IN ('weekly', 'monthly', 'quarterly', 'yearly', 'custom')
    ),
    CONSTRAINT financial_periods_status_check CHECK (
        status IN ('active', 'closed', 'archived')
    ),
    CONSTRAINT financial_periods_dates_check CHECK (end_date >= start_date),
    CONSTRAINT financial_periods_unique_period UNIQUE(home_game_id, period_type, start_date)
);

-- User statistics table
CREATE TABLE user_statistics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    home_game_id UUID REFERENCES home_games(id) ON DELETE CASCADE,
    period_type VARCHAR(20) NOT NULL DEFAULT 'all_time',
    period_start DATE,
    period_end DATE,
    stats_data JSONB NOT NULL DEFAULT '{
        "hands_played": 0,
        "hands_won": 0,
        "total_winnings": 0,
        "total_invested": 0,
        "roi": 0,
        "vpip": 0,
        "pfr": 0,
        "aggression_factor": 0,
        "wtsd": 0,
        "w$sd": 0,
        "sessions_played": 0,
        "avg_session_length": 0,
        "biggest_win": 0,
        "biggest_loss": 0,
        "win_rate_bb_100": 0
    }'::jsonb,
    calculated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT user_statistics_period_type_check CHECK (
        period_type IN ('daily', 'weekly', 'monthly', 'yearly', 'all_time', 'custom')
    ),
    CONSTRAINT user_statistics_unique_period UNIQUE(user_id, home_game_id, period_type, period_start),
    CONSTRAINT user_statistics_dates_check CHECK (
        (period_start IS NULL AND period_end IS NULL) OR 
        (period_start IS NOT NULL AND period_end IS NOT NULL AND period_end >= period_start)
    )
);

-- Notifications table
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    notification_type VARCHAR(30) NOT NULL,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    data JSONB DEFAULT '{}'::jsonb,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    read_at TIMESTAMP WITH TIME ZONE,
    
    CONSTRAINT notifications_notification_type_check CHECK (
        notification_type IN (
            'game_invite', 'session_start', 'session_end', 'hand_won', 
            'payment_received', 'payment_due', 'system_update', 'achievement'
        )
    )
);

-- Social connections table
CREATE TABLE social_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    connected_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    connection_type VARCHAR(20) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT social_connections_unique_connection UNIQUE(user_id, connected_user_id),
    CONSTRAINT social_connections_not_self CHECK (user_id != connected_user_id),
    CONSTRAINT social_connections_type_check CHECK (connection_type IN ('friend', 'blocked')),
    CONSTRAINT social_connections_status_check CHECK (status IN ('pending', 'accepted', 'rejected', 'blocked'))
);

-- Create indexes for performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_created_at ON users(created_at);

CREATE INDEX idx_user_profiles_user_id ON user_profiles(user_id);

CREATE INDEX idx_home_games_owner_id ON home_games(owner_id);
CREATE INDEX idx_home_games_status ON home_games(status);
CREATE INDEX idx_home_games_invite_code ON home_games(invite_code);

CREATE INDEX idx_game_memberships_home_game_id ON game_memberships(home_game_id);
CREATE INDEX idx_game_memberships_user_id ON game_memberships(user_id);

CREATE INDEX idx_poker_sessions_home_game_id ON poker_sessions(home_game_id);
CREATE INDEX idx_poker_sessions_status ON poker_sessions(status);

CREATE INDEX idx_session_players_session_id ON session_players(session_id);
CREATE INDEX idx_session_players_user_id ON session_players(user_id);

CREATE INDEX idx_hands_session_id ON hands(session_id);
CREATE INDEX idx_hands_started_at ON hands(started_at);

CREATE INDEX idx_hand_actions_hand_id ON hand_actions(hand_id);
CREATE INDEX idx_hand_actions_sequence_number ON hand_actions(sequence_number);

CREATE INDEX idx_transactions_user_id ON transactions(user_id);
CREATE INDEX idx_transactions_status ON transactions(status);

CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);

-- Create updated_at triggers
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_home_games_updated_at BEFORE UPDATE ON home_games
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_game_memberships_updated_at BEFORE UPDATE ON game_memberships
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_statistics_updated_at BEFORE UPDATE ON user_statistics
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_social_connections_updated_at BEFORE UPDATE ON social_connections
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to generate unique invite codes
CREATE OR REPLACE FUNCTION generate_invite_code()
RETURNS TEXT AS $$
DECLARE
    chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    result TEXT := '';
    i INTEGER;
BEGIN
    FOR i IN 1..8 LOOP
        result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
    END LOOP;
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate invite codes for home games
CREATE OR REPLACE FUNCTION set_invite_code()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.invite_code IS NULL OR NEW.invite_code = '' THEN
        LOOP
            NEW.invite_code := generate_invite_code();
            EXIT WHEN NOT EXISTS (SELECT 1 FROM home_games WHERE invite_code = NEW.invite_code);
        END LOOP;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_home_games_invite_code BEFORE INSERT ON home_games
    FOR EACH ROW EXECUTE FUNCTION set_invite_code();

-- Row Level Security (RLS) policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE home_games ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE poker_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE hands ENABLE ROW LEVEL SECURITY;
ALTER TABLE hand_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE hand_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_statistics ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_connections ENABLE ROW LEVEL SECURITY;

-- Fixed RLS policies with proper UUID casting
-- Users can read their own data
CREATE POLICY "Users can view own profile" ON users FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON users FOR UPDATE
    USING (auth.uid() = id);

-- User profiles policies
CREATE POLICY "Users can view own user profile" ON user_profiles FOR ALL
    USING (auth.uid() = user_id);

-- Home games policies
CREATE POLICY "Users can view games they're members of" ON home_games FOR SELECT
    USING (
        id IN (
            SELECT home_game_id FROM game_memberships 
            WHERE user_id = auth.uid() AND status = 'active'
        )
    );

CREATE POLICY "Users can create home games" ON home_games FOR INSERT
    WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Game owners can update their games" ON home_games FOR UPDATE
    USING (auth.uid() = owner_id);

-- Game memberships policies
CREATE POLICY "Users can view memberships for their games" ON game_memberships FOR SELECT
    USING (
        user_id = auth.uid() OR
        home_game_id IN (
            SELECT id FROM home_games WHERE owner_id = auth.uid()
        )
    );

CREATE POLICY "Users can join games" ON game_memberships FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Poker sessions policies
CREATE POLICY "Users can view sessions for their games" ON poker_sessions FOR SELECT
    USING (
        home_game_id IN (
            SELECT home_game_id FROM game_memberships 
            WHERE user_id = auth.uid() AND status = 'active'
        )
    );

CREATE POLICY "Game members can create sessions" ON poker_sessions FOR INSERT
    WITH CHECK (
        auth.uid() = created_by AND
        home_game_id IN (
            SELECT home_game_id FROM game_memberships 
            WHERE user_id = auth.uid() AND status = 'active'
        )
    );

-- Session players policies
CREATE POLICY "Users can view session players for their sessions" ON session_players FOR SELECT
    USING (
        user_id = auth.uid() OR
        session_id IN (
            SELECT ps.id FROM poker_sessions ps
            JOIN game_memberships gm ON ps.home_game_id = gm.home_game_id
            WHERE gm.user_id = auth.uid() AND gm.status = 'active'
        )
    );

-- Transactions policies
CREATE POLICY "Users can view their own transactions" ON transactions FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Users can create their own transactions" ON transactions FOR INSERT
    WITH CHECK (user_id = auth.uid());

-- Notifications policies
CREATE POLICY "Users can view their own notifications" ON notifications FOR ALL
    USING (user_id = auth.uid());

-- Social connections policies
CREATE POLICY "Users can view their own connections" ON social_connections FOR ALL
    USING (user_id = auth.uid() OR connected_user_id = auth.uid());

-- User statistics policies
CREATE POLICY "Users can view their own statistics" ON user_statistics FOR SELECT
    USING (user_id = auth.uid());

-- Hand-related policies (read-only for game members)
CREATE POLICY "Game members can view hands" ON hands FOR SELECT
    USING (
        session_id IN (
            SELECT ps.id FROM poker_sessions ps
            JOIN game_memberships gm ON ps.home_game_id = gm.home_game_id
            WHERE gm.user_id = auth.uid() AND gm.status = 'active'
        )
    );

CREATE POLICY "Game members can view hand players" ON hand_players FOR SELECT
    USING (
        hand_id IN (
            SELECT h.id FROM hands h
            JOIN poker_sessions ps ON h.session_id = ps.id
            JOIN game_memberships gm ON ps.home_game_id = gm.home_game_id
            WHERE gm.user_id = auth.uid() AND gm.status = 'active'
        )
    );

CREATE POLICY "Game members can view hand actions" ON hand_actions FOR SELECT
    USING (
        hand_id IN (
            SELECT h.id FROM hands h
            JOIN poker_sessions ps ON h.session_id = ps.id
            JOIN game_memberships gm ON ps.home_game_id = gm.home_game_id
            WHERE gm.user_id = auth.uid() AND gm.status = 'active'
        )
    );