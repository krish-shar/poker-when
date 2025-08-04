"use client";

import { supabase } from '@/lib/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';

export interface GameState {
  id: string;
  status: 'waiting' | 'playing' | 'showdown';
  pot: number;
  current_bet: number;
  community_cards: any[];
  current_player_index: number;
  game_stage: 'preflop' | 'flop' | 'turn' | 'river';
  small_blind: number;
  big_blind: number;
  dealer_position: number;
  last_action?: {
    player_id: string;
    action: string;
    amount?: number;
    timestamp: string;
  };
}

export interface ChatMessage {
  id: string;
  session_id: string;
  user_id: string;
  username: string;
  message: string;
  message_type: 'chat' | 'game' | 'system';
  created_at: string;
}

export interface GameEvent {
  type: 'game_state_update' | 'player_action' | 'chat_message' | 'player_joined' | 'player_left' | 'hand_started';
  payload: any;
  timestamp: string;
}

export class PokerRealtimeClient {
  private gameChannel: RealtimeChannel | null = null;
  private chatChannel: RealtimeChannel | null = null;
  private sessionId: string;
  private userId: string;
  private onGameUpdate: (event: GameEvent) => void;
  private onChatMessage: (message: ChatMessage) => void;
  private onError: (error: string) => void;

  constructor(
    sessionId: string,
    userId: string,
    onGameUpdate: (event: GameEvent) => void,
    onChatMessage: (message: ChatMessage) => void,
    onError: (error: string) => void
  ) {
    this.sessionId = sessionId;
    this.userId = userId;
    this.onGameUpdate = onGameUpdate;
    this.onChatMessage = onChatMessage;
    this.onError = onError;
  }

  async connect() {
    try {
      // Subscribe to game state changes
      this.gameChannel = supabase
        .channel(`poker_session_${this.sessionId}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'poker_sessions',
            filter: `id=eq.${this.sessionId}`
          },
          (payload) => {
            console.log('Game state updated:', payload);
            this.onGameUpdate({
              type: 'game_state_update',
              payload: payload.new,
              timestamp: new Date().toISOString()
            });
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'game_actions',
            filter: `session_id=eq.${this.sessionId}`
          },
          (payload) => {
            console.log('Player action:', payload);
            this.onGameUpdate({
              type: 'player_action',
              payload: payload.new,
              timestamp: new Date().toISOString()
            });
          }
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'session_players',
            filter: `session_id=eq.${this.sessionId}`
          },
          (payload) => {
            console.log('Player update:', payload);
            const eventType = payload.eventType === 'INSERT' ? 'player_joined' : 
                             payload.eventType === 'DELETE' ? 'player_left' : 'player_update';
            this.onGameUpdate({
              type: eventType as any,
              payload: payload.new || payload.old,
              timestamp: new Date().toISOString()
            });
          }
        )
        .subscribe();

      // Subscribe to chat messages
      this.chatChannel = supabase
        .channel(`poker_chat_${this.sessionId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'chat_messages',
            filter: `session_id=eq.${this.sessionId}`
          },
          (payload) => {
            console.log('New chat message:', payload);
            this.onChatMessage(payload.new as ChatMessage);
          }
        )
        .subscribe();

      console.log('Connected to Supabase Realtime for session:', this.sessionId);

      // Join the session by updating player status
      await this.joinSession();

    } catch (error) {
      console.error('Error connecting to realtime:', error);
      this.onError('Failed to connect to game');
    }
  }

  async disconnect() {
    if (this.gameChannel) {
      await supabase.removeChannel(this.gameChannel);
      this.gameChannel = null;
    }
    if (this.chatChannel) {
      await supabase.removeChannel(this.chatChannel);
      this.chatChannel = null;
    }
    console.log('Disconnected from Supabase Realtime');
  }

  private async joinSession() {
    try {
      // Update player status to active
      const { error } = await supabase
        .from('session_players')
        .update({ 
          status: 'active',
          last_seen: new Date().toISOString()
        })
        .eq('session_id', this.sessionId)
        .eq('user_id', this.userId);

      if (error) {
        console.error('Error joining session:', error);
        this.onError('Failed to join session');
        return;
      }

      // Check if we need to start the game
      await this.checkGameStart();

    } catch (error) {
      console.error('Error in joinSession:', error);
      this.onError('Failed to join session');
    }
  }

  private async checkGameStart() {
    try {
      // Get current session and player count
      const { data: session, error: sessionError } = await supabase
        .from('poker_sessions')
        .select(`
          *,
          session_players(id, status)
        `)
        .eq('id', this.sessionId)
        .single();

      if (sessionError || !session) {
        console.error('Error fetching session:', sessionError);
        return;
      }

      const activePlayers = session.session_players?.filter((p: any) => p.status === 'active') || [];

      // Start game if we have enough players and game is waiting
      if (activePlayers.length >= 2 && session.status === 'waiting') {
        await this.startNewHand();
      }

    } catch (error) {
      console.error('Error checking game start:', error);
    }
  }

  async makeAction(action: string, amount?: number) {
    try {
      const response = await fetch(`/api/games/${this.sessionId}/action`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: this.userId,
          action,
          amount
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        this.onError(data.error || 'Action failed');
        return;
      }

      console.log('Action processed:', data);

    } catch (error) {
      console.error('Error making action:', error);
      this.onError('Failed to process action');
    }
  }

  async sendChatMessage(message: string) {
    try {
      const { error } = await supabase
        .from('chat_messages')
        .insert({
          session_id: this.sessionId,
          user_id: this.userId,
          message: message.trim(),
          message_type: 'chat'
        });

      if (error) {
        console.error('Error sending chat message:', error);
        this.onError('Failed to send message');
      }

    } catch (error) {
      console.error('Error sending chat message:', error);
      this.onError('Failed to send message');
    }
  }

  async sendSystemMessage(message: string) {
    try {
      const { error } = await supabase
        .from('chat_messages')
        .insert({
          session_id: this.sessionId,
          user_id: this.userId,
          message,
          message_type: 'system'
        });

      if (error) {
        console.error('Error sending system message:', error);
      }

    } catch (error) {
      console.error('Error sending system message:', error);
    }
  }

  async getGameState(): Promise<GameState | null> {
    try {
      const { data, error } = await supabase
        .from('poker_sessions')
        .select(`
          *,
          session_players (
            id,
            user_id,
            seat_number,
            current_chips,
            status,
            hole_cards,
            current_bet,
            has_folded,
            users (username)
          )
        `)
        .eq('id', this.sessionId)
        .single();

      if (error || !data) {
        console.error('Error getting game state:', error);
        return null;
      }

      return {
        id: data.id,
        status: data.status,
        pot: data.total_pot || 0,
        current_bet: data.current_bet || 0,
        community_cards: data.community_cards || [],
        current_player_index: data.current_player_index || 0,
        game_stage: data.game_stage || 'preflop',
        small_blind: data.game_config?.small_blind || 1,
        big_blind: data.game_config?.big_blind || 2,
        dealer_position: data.dealer_position || 0,
        last_action: data.last_action
      };

    } catch (error) {
      console.error('Error getting game state:', error);
      return null;
    }
  }

  async getChatHistory(): Promise<ChatMessage[]> {
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select(`
          *,
          users (username)
        `)
        .eq('session_id', this.sessionId)
        .order('created_at', { ascending: true })
        .limit(50);

      if (error) {
        console.error('Error getting chat history:', error);
        return [];
      }

      return data.map((msg: any) => ({
        ...msg,
        username: msg.users?.username || 'Anonymous'
      })) || [];

    } catch (error) {
      console.error('Error getting chat history:', error);
      return [];
    }
  }

  private async startNewHand() {
    try {
      const response = await fetch(`/api/games/${this.sessionId}/start-hand`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: this.userId
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('Error starting hand:', data.error);
        return;
      }

      console.log('New hand started:', data);

    } catch (error) {
      console.error('Error starting new hand:', error);
    }
  }
}