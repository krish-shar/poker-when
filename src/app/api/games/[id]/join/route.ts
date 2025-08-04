import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Server-side Supabase client with service role key
const supabaseServer = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId, buyInAmount } = await request.json();
    const sessionId = params.id;

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Check if session exists and has space
    const { data: session, error: sessionError } = await supabaseServer
      .from('poker_sessions')
      .select(`
        *,
        session_players (
          id,
          user_id,
          seat_number
        )
      `)
      .eq('id', sessionId)
      .single();

    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'Game session not found' },
        { status: 404 }
      );
    }

    // Check if user is already in the session
    const existingPlayer = session.session_players?.find(
      (player: any) => player.user_id === userId
    );

    if (existingPlayer) {
      return NextResponse.json(
        { error: 'You are already in this game' },
        { status: 400 }
      );
    }

    // Check if session is full
    const maxPlayers = session.game_config?.max_players || 9;
    const currentPlayers = session.session_players?.length || 0;

    if (currentPlayers >= maxPlayers) {
      return NextResponse.json(
        { error: 'Game is full' },
        { status: 400 }
      );
    }

    // Find next available seat
    const occupiedSeats = session.session_players?.map((p: any) => p.seat_number) || [];
    let nextSeat = 1;
    while (occupiedSeats.includes(nextSeat) && nextSeat <= maxPlayers) {
      nextSeat++;
    }

    if (nextSeat > maxPlayers) {
      return NextResponse.json(
        { error: 'No available seats' },
        { status: 400 }
      );
    }

    // Calculate buy-in amount
    const minBuyIn = (session.game_config?.big_blind || 2) * 50;
    const maxBuyIn = (session.game_config?.big_blind || 2) * 200;
    const finalBuyIn = buyInAmount || minBuyIn;

    if (finalBuyIn < minBuyIn || finalBuyIn > maxBuyIn) {
      return NextResponse.json(
        { error: `Buy-in must be between $${minBuyIn} and $${maxBuyIn}` },
        { status: 400 }
      );
    }

    // Add player to session
    const { data: newPlayer, error: playerError } = await supabaseServer
      .from('session_players')
      .insert({
        session_id: sessionId,
        user_id: userId,
        seat_number: nextSeat,
        buy_in_amount: finalBuyIn,
        current_chips: finalBuyIn,
        status: 'active'
      })
      .select()
      .single();

    if (playerError) {
      console.error('Error adding player:', playerError);
      return NextResponse.json(
        { error: 'Failed to join game' },
        { status: 500 }
      );
    }

    // Update session status to active if it was waiting
    if (session.status === 'waiting') {
      await supabaseServer
        .from('poker_sessions')
        .update({ status: 'active' })
        .eq('id', sessionId);
    }

    return NextResponse.json({ 
      success: true,
      player: newPlayer,
      seatNumber: nextSeat,
      buyIn: finalBuyIn
    });

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}