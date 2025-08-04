-- Chat messages table
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES poker_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  message TEXT NOT NULL CHECK (LENGTH(message) > 0 AND LENGTH(message) <= 1000),
  message_type TEXT NOT NULL DEFAULT 'chat' CHECK (message_type IN ('chat', 'game', 'system')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Indexes for performance
  INDEX (session_id, created_at),
  INDEX (user_id, created_at)
);

-- Game actions table for tracking all player actions
CREATE TABLE IF NOT EXISTS game_actions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES poker_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL CHECK (action_type IN ('fold', 'check', 'call', 'raise', 'all_in')),
  amount INTEGER DEFAULT 0 CHECK (amount >= 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Indexes for performance
  INDEX (session_id, created_at),
  INDEX (user_id, created_at)
);

-- Add missing columns to poker_sessions if they don't exist
ALTER TABLE poker_sessions 
ADD COLUMN IF NOT EXISTS game_stage TEXT DEFAULT 'preflop' CHECK (game_stage IN ('preflop', 'flop', 'turn', 'river'));

ALTER TABLE poker_sessions 
ADD COLUMN IF NOT EXISTS current_bet INTEGER DEFAULT 0 CHECK (current_bet >= 0);

ALTER TABLE poker_sessions 
ADD COLUMN IF NOT EXISTS current_player_index INTEGER DEFAULT 0 CHECK (current_player_index >= 0);

ALTER TABLE poker_sessions 
ADD COLUMN IF NOT EXISTS dealer_position INTEGER DEFAULT 0 CHECK (dealer_position >= 0);

ALTER TABLE poker_sessions 
ADD COLUMN IF NOT EXISTS community_cards JSONB DEFAULT '[]';

ALTER TABLE poker_sessions 
ADD COLUMN IF NOT EXISTS last_action JSONB DEFAULT NULL;

-- Add missing columns to session_players if they don't exist
ALTER TABLE session_players 
ADD COLUMN IF NOT EXISTS hole_cards JSONB DEFAULT NULL;

ALTER TABLE session_players 
ADD COLUMN IF NOT EXISTS current_bet INTEGER DEFAULT 0 CHECK (current_bet >= 0);

ALTER TABLE session_players 
ADD COLUMN IF NOT EXISTS has_folded BOOLEAN DEFAULT FALSE;

ALTER TABLE session_players 
ADD COLUMN IF NOT EXISTS last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Row Level Security (RLS) policies
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_actions ENABLE ROW LEVEL SECURITY;

-- Chat messages policies
CREATE POLICY "Users can view chat messages from their sessions" ON chat_messages
  FOR SELECT USING (
    auth.uid() IN (
      SELECT user_id FROM session_players 
      WHERE session_id = chat_messages.session_id 
      AND status = 'active'
    )
  );

CREATE POLICY "Users can insert chat messages to their sessions" ON chat_messages
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND
    auth.uid() IN (
      SELECT user_id FROM session_players 
      WHERE session_id = chat_messages.session_id 
      AND status = 'active'
    )
  );

-- Game actions policies
CREATE POLICY "Users can view game actions from their sessions" ON game_actions
  FOR SELECT USING (
    auth.uid() IN (
      SELECT user_id FROM session_players 
      WHERE session_id = game_actions.session_id 
      AND status = 'active'
    )
  );

CREATE POLICY "Users can insert their own game actions" ON game_actions
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND
    auth.uid() IN (
      SELECT user_id FROM session_players 
      WHERE session_id = game_actions.session_id 
      AND status = 'active'
    )
  );

-- Enable realtime for new tables
ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE game_actions;

-- Update existing publications to include new columns
ALTER PUBLICATION supabase_realtime ADD TABLE poker_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE session_players;