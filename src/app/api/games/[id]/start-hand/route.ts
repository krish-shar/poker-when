import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Server-side Supabase client
const supabaseServer = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const sessionId = params.id;
    const { userId } = await request.json();

    if (!sessionId || !userId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get current session
    const { data: session, error: sessionError } = await supabaseServer
      .from('poker_sessions')
      .select(`
        *,
        session_players (
          id,
          user_id,
          seat_number,
          current_chips,
          status
        )
      `)
      .eq('id', sessionId)
      .single();

    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    // Check if user is in the session
    const player = session.session_players?.find((p: any) => p.user_id === userId);
    if (!player) {
      return NextResponse.json(
        { error: 'Player not in session' },
        { status: 403 }
      );
    }

    // Check if we have enough players
    const activePlayers = session.session_players?.filter((p: any) => p.status === 'active') || [];
    if (activePlayers.length < 2) {
      return NextResponse.json(
        { error: 'Need at least 2 players to start' },
        { status: 400 }
      );
    }

    // Start new hand
    const handResult = await startNewHand(sessionId, activePlayers);

    if (!handResult.success) {
      return NextResponse.json(
        { error: handResult.error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'New hand started',
      gameState: handResult.gameState
    });

  } catch (error) {
    console.error('Error starting hand:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function startNewHand(sessionId: string, players: any[]) {
  try {
    // Create a fresh deck
    const deck = createAndShuffleDeck();
    
    // Deal hole cards properly (2 cards per player, dealing one at a time around the table)
    const holeCardsByIndex = dealHoleCards(deck, players.length);
    const playerHoleCards: { [key: string]: any[] } = {};
    
    // Map hole cards to player user_ids
    for (let i = 0; i < players.length; i++) {
      playerHoleCards[players[i].user_id] = holeCardsByIndex[i];
    }

    // Determine blinds (simple rotation)
    const dealerPosition = 0; // For now, always start with first player as dealer
    const smallBlindPosition = (dealerPosition + 1) % players.length;
    const bigBlindPosition = (dealerPosition + 2) % players.length;

    const smallBlindPlayer = players[smallBlindPosition];
    const bigBlindPlayer = players[bigBlindPosition];

    const smallBlindAmount = 1;
    const bigBlindAmount = 2;

    // Update session state
    const { error: sessionError } = await supabaseServer
      .from('poker_sessions')
      .update({
        status: 'playing',
        game_stage: 'preflop',
        community_cards: [],
        current_bet: bigBlindAmount,
        total_pot: smallBlindAmount + bigBlindAmount,
        current_player_index: (bigBlindPosition + 1) % players.length,
        dealer_position: dealerPosition,
        last_action: {
          player_id: 'system',
          action: 'new_hand',
          timestamp: new Date().toISOString()
        }
      })
      .eq('id', sessionId);

    if (sessionError) {
      console.error('Error updating session:', sessionError);
      return { success: false, error: 'Failed to update session' };
    }

    // Update all players with hole cards and reset state
    for (const player of players) {
      const isSmallBlind = player.user_id === smallBlindPlayer.user_id;
      const isBigBlind = player.user_id === bigBlindPlayer.user_id;
      
      let currentBet = 0;
      let newChips = player.current_chips;

      if (isSmallBlind) {
        currentBet = smallBlindAmount;
        newChips -= smallBlindAmount;
      } else if (isBigBlind) {
        currentBet = bigBlindAmount;
        newChips -= bigBlindAmount;
      }

      const { error: playerError } = await supabaseServer
        .from('session_players')
        .update({
          hole_cards: playerHoleCards[player.user_id],
          current_bet: currentBet,
          current_chips: newChips,
          has_folded: false
        })
        .eq('session_id', sessionId)
        .eq('user_id', player.user_id);

      if (playerError) {
        console.error('Error updating player:', playerError);
      }
    }

    // Add system message to chat
    const { error: chatError } = await supabaseServer
      .from('chat_messages')
      .insert({
        session_id: sessionId,
        user_id: 'system',
        message: `New hand started! Small blind: $${smallBlindAmount}, Big blind: $${bigBlindAmount}`,
        message_type: 'system'
      });

    if (chatError) {
      console.error('Error adding chat message:', chatError);
    }

    return {
      success: true,
      gameState: {
        status: 'playing',
        stage: 'preflop',
        pot: smallBlindAmount + bigBlindAmount,
        currentBet: bigBlindAmount,
        currentPlayerIndex: (bigBlindPosition + 1) % players.length
      }
    };

  } catch (error) {
    console.error('Error starting new hand:', error);
    return { success: false, error: 'Failed to start new hand' };
  }
}

function createAndShuffleDeck() {
  const suits = ['hearts', 'diamonds', 'clubs', 'spades'];
  const ranks = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
  
  const deck = [];
  for (const suit of suits) {
    for (const rank of ranks) {
      deck.push({ suit, rank });
    }
  }

  // Fisher-Yates shuffle
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }

  return deck;
}

function dealHoleCards(deck: any[], playerCount: number) {
  const holeCards: { [key: number]: any[] } = {};
  
  // Initialize arrays for each player
  for (let i = 0; i < playerCount; i++) {
    holeCards[i] = [];
  }
  
  // Deal 2 cards to each player (one at a time)
  for (let round = 0; round < 2; round++) {
    for (let player = 0; player < playerCount; player++) {
      if (deck.length > 0) {
        holeCards[player].push(deck.pop());
      }
    }
  }
  
  return holeCards;
}