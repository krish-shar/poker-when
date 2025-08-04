import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import { createClient } from '@supabase/supabase-js';

// Server-side Supabase client with service role key
const supabaseServer = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  try {
    const { data: cashGames, error } = await supabaseServer
      .from('poker_sessions')
      .select(`
        *,
        home_games (name),
        session_players (
          id,
          user_id,
          seat_number,
          status
        )
      `)
      .eq('session_type', 'cash_game')
      .in('status', ['waiting', 'active']);

    if (error) {
      console.error('Error fetching cash games:', error);
      return NextResponse.json(
        { error: 'Failed to fetch cash games' },
        { status: 500 }
      );
    }

    return NextResponse.json({ cashGames });

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      gameName, 
      gameType = 'texas_holdem',
      bettingStructure = 'no_limit',
      smallBlind = 1,
      bigBlind = 2,
      maxPlayers = 9,
      userId 
    } = body;

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // First, create a home game
    const { data: homeGame, error: homeGameError } = await supabaseServer
      .from('home_games')
      .insert({
        owner_id: userId,
        name: gameName || `${gameType} Game`,
        game_type: gameType,
        settings: {
          small_blind: smallBlind,
          big_blind: bigBlind,
          max_players: maxPlayers,
          buy_in_min: bigBlind * 50,
          buy_in_max: bigBlind * 200,
          allow_rebuys: true,
          time_bank: 30,
          special_rules: {
            run_it_twice: true,
            seven_two_bonus: false,
            straddle_allowed: true,
            ante: 0
          }
        }
      })
      .select()
      .single();

    if (homeGameError) {
      console.error('Error creating home game:', homeGameError);
      return NextResponse.json(
        { error: 'Failed to create home game' },
        { status: 500 }
      );
    }

    // Then create a poker session for this home game
    const { data: session, error: sessionError } = await supabaseServer
      .from('poker_sessions')
      .insert({
        home_game_id: homeGame.id,
        created_by: userId,
        session_type: 'cash_game',
        game_config: {
          game_variant: gameType,
          betting_structure: bettingStructure,
          small_blind: smallBlind,
          big_blind: bigBlind,
          ante: 0,
          max_players: maxPlayers,
          time_limit: null
        },
        status: 'waiting'
      })
      .select()
      .single();

    if (sessionError) {
      console.error('Error creating poker session:', sessionError);
      return NextResponse.json(
        { error: 'Failed to create poker session' },
        { status: 500 }
      );
    }

    // Add the creator as a player
    const { error: playerError } = await supabaseServer
      .from('session_players')
      .insert({
        session_id: session.id,
        user_id: userId,
        seat_number: 1,
        buy_in_amount: bigBlind * 100, // Default 100 big blinds
        current_chips: bigBlind * 100,
        status: 'active'
      });

    if (playerError) {
      console.error('Error adding player to session:', playerError);
      // Continue anyway, session is created
    }

    return NextResponse.json({ 
      session: {
        ...session,
        home_game: homeGame
      }
    });

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}