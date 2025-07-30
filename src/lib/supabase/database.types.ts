export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          username: string
          created_at: string
          updated_at: string
          last_login: string | null
          email_verified: boolean
          metadata: Json
        }
        Insert: {
          id?: string
          email: string
          username: string
          created_at?: string
          updated_at?: string
          last_login?: string | null
          email_verified?: boolean
          metadata?: Json
        }
        Update: {
          id?: string
          email?: string
          username?: string
          created_at?: string
          updated_at?: string
          last_login?: string | null
          email_verified?: boolean
          metadata?: Json
        }
      }
      user_profiles: {
        Row: {
          id: string
          user_id: string
          display_name: string | null
          avatar_url: string | null
          bio: string | null
          preferences: Json
          privacy_settings: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          display_name?: string | null
          avatar_url?: string | null
          bio?: string | null
          preferences?: Json
          privacy_settings?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          display_name?: string | null
          avatar_url?: string | null
          bio?: string | null
          preferences?: Json
          privacy_settings?: Json
          created_at?: string
          updated_at?: string
        }
      }
      home_games: {
        Row: {
          id: string
          owner_id: string
          name: string
          description: string | null
          game_type: string
          settings: Json
          status: string
          invite_code: string
          created_at: string
          updated_at: string
          archived_at: string | null
        }
        Insert: {
          id?: string
          owner_id: string
          name: string
          description?: string | null
          game_type?: string
          settings?: Json
          status?: string
          invite_code?: string
          created_at?: string
          updated_at?: string
          archived_at?: string | null
        }
        Update: {
          id?: string
          owner_id?: string
          name?: string
          description?: string | null
          game_type?: string
          settings?: Json
          status?: string
          invite_code?: string
          created_at?: string
          updated_at?: string
          archived_at?: string | null
        }
      }
      game_memberships: {
        Row: {
          id: string
          home_game_id: string
          user_id: string
          role: string
          status: string
          buy_in_amount: number
          joined_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          home_game_id: string
          user_id: string
          role?: string
          status?: string
          buy_in_amount?: number
          joined_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          home_game_id?: string
          user_id?: string
          role?: string
          status?: string
          buy_in_amount?: number
          joined_at?: string
          updated_at?: string
        }
      }
      poker_sessions: {
        Row: {
          id: string
          home_game_id: string
          created_by: string
          session_type: string
          game_config: Json
          status: string
          started_at: string
          ended_at: string | null
          total_pot: number
          hand_count: number
          final_results: Json | null
        }
        Insert: {
          id?: string
          home_game_id: string
          created_by: string
          session_type?: string
          game_config?: Json
          status?: string
          started_at?: string
          ended_at?: string | null
          total_pot?: number
          hand_count?: number
          final_results?: Json | null
        }
        Update: {
          id?: string
          home_game_id?: string
          created_by?: string
          session_type?: string
          game_config?: Json
          status?: string
          started_at?: string
          ended_at?: string | null
          total_pot?: number
          hand_count?: number
          final_results?: Json | null
        }
      }
      session_players: {
        Row: {
          id: string
          session_id: string
          user_id: string
          seat_number: number
          buy_in_amount: number
          current_chips: number
          final_amount: number
          status: string
          joined_at: string
          left_at: string | null
          session_stats: Json
        }
        Insert: {
          id?: string
          session_id: string
          user_id: string
          seat_number: number
          buy_in_amount: number
          current_chips: number
          final_amount?: number
          status?: string
          joined_at?: string
          left_at?: string | null
          session_stats?: Json
        }
        Update: {
          id?: string
          session_id?: string
          user_id?: string
          seat_number?: number
          buy_in_amount?: number
          current_chips?: number
          final_amount?: number
          status?: string
          joined_at?: string
          left_at?: string | null
          session_stats?: Json
        }
      }
      hands: {
        Row: {
          id: string
          session_id: string
          hand_number: number
          game_variant: string
          pot_size: number
          rake_amount: number
          board_cards: Json
          game_state: Json
          started_at: string
          ended_at: string | null
          metadata: Json | null
        }
        Insert: {
          id?: string
          session_id: string
          hand_number: number
          game_variant?: string
          pot_size?: number
          rake_amount?: number
          board_cards?: Json
          game_state?: Json
          started_at?: string
          ended_at?: string | null
          metadata?: Json | null
        }
        Update: {
          id?: string
          session_id?: string
          hand_number?: number
          game_variant?: string
          pot_size?: number
          rake_amount?: number
          board_cards?: Json
          game_state?: Json
          started_at?: string
          ended_at?: string | null
          metadata?: Json | null
        }
      }
      hand_players: {
        Row: {
          id: string
          hand_id: string
          session_player_id: string
          hole_cards: Json
          starting_chips: number
          final_chips: number
          net_amount: number
          final_action: string | null
          is_winner: boolean
          hand_stats: Json
        }
        Insert: {
          id?: string
          hand_id: string
          session_player_id: string
          hole_cards?: Json
          starting_chips: number
          final_chips: number
          net_amount?: number
          final_action?: string | null
          is_winner?: boolean
          hand_stats?: Json
        }
        Update: {
          id?: string
          hand_id?: string
          session_player_id?: string
          hole_cards?: Json
          starting_chips?: number
          final_chips?: number
          net_amount?: number
          final_action?: string | null
          is_winner?: boolean
          hand_stats?: Json
        }
      }
      hand_actions: {
        Row: {
          id: string
          hand_id: string
          session_player_id: string
          sequence_number: number
          action_type: string
          amount: number
          betting_round: string
          action_data: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          hand_id: string
          session_player_id: string
          sequence_number: number
          action_type: string
          amount?: number
          betting_round: string
          action_data?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          hand_id?: string
          session_player_id?: string
          sequence_number?: number
          action_type?: string
          amount?: number
          betting_round?: string
          action_data?: Json | null
          created_at?: string
        }
      }
      transactions: {
        Row: {
          id: string
          user_id: string
          home_game_id: string | null
          session_id: string | null
          transaction_type: string
          amount: number
          currency: string
          status: string
          payment_method: string | null
          transaction_data: Json | null
          created_at: string
          processed_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          home_game_id?: string | null
          session_id?: string | null
          transaction_type: string
          amount: number
          currency?: string
          status?: string
          payment_method?: string | null
          transaction_data?: Json | null
          created_at?: string
          processed_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          home_game_id?: string | null
          session_id?: string | null
          transaction_type?: string
          amount?: number
          currency?: string
          status?: string
          payment_method?: string | null
          transaction_data?: Json | null
          created_at?: string
          processed_at?: string | null
        }
      }
      financial_periods: {
        Row: {
          id: string
          home_game_id: string
          period_type: string
          start_date: string
          end_date: string
          status: string
          summary_data: Json
          created_at: string
          closed_at: string | null
        }
        Insert: {
          id?: string
          home_game_id: string
          period_type?: string
          start_date: string
          end_date: string
          status?: string
          summary_data?: Json
          created_at?: string
          closed_at?: string | null
        }
        Update: {
          id?: string
          home_game_id?: string
          period_type?: string
          start_date?: string
          end_date?: string
          status?: string
          summary_data?: Json
          created_at?: string
          closed_at?: string | null
        }
      }
      user_statistics: {
        Row: {
          id: string
          user_id: string
          home_game_id: string | null
          period_type: string
          period_start: string | null
          period_end: string | null
          stats_data: Json
          calculated_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          home_game_id?: string | null
          period_type?: string
          period_start?: string | null
          period_end?: string | null
          stats_data: Json
          calculated_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          home_game_id?: string | null
          period_type?: string
          period_start?: string | null
          period_end?: string | null
          stats_data?: Json
          calculated_at?: string
          updated_at?: string
        }
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          notification_type: string
          title: string
          message: string
          data: Json | null
          is_read: boolean
          created_at: string
          read_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          notification_type: string
          title: string
          message: string
          data?: Json | null
          is_read?: boolean
          created_at?: string
          read_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          notification_type?: string
          title?: string
          message?: string
          data?: Json | null
          is_read?: boolean
          created_at?: string
          read_at?: string | null
        }
      }
      social_connections: {
        Row: {
          id: string
          user_id: string
          connected_user_id: string
          connection_type: string
          status: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          connected_user_id: string
          connection_type: string
          status?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          connected_user_id?: string
          connection_type?: string
          status?: string
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}