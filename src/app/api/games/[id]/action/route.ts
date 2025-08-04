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
    const { userId, action, amount } = await request.json();

    if (!sessionId || !userId || !action) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get current session and validate player
    const { data: session, error: sessionError } = await supabaseServer
      .from('poker_sessions')
      .select(`
        *,
        session_players (
          id,
          user_id,
          seat_number,
          current_chips,
          status,
          current_bet,
          has_folded
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

    // Find the player
    const player = session.session_players?.find((p: any) => p.user_id === userId);
    if (!player) {
      return NextResponse.json(
        { error: 'Player not in session' },
        { status: 403 }
      );
    }

    // Validate it's the player's turn
    const currentPlayerIndex = session.current_player_index || 0;
    const players = session.session_players?.sort((a: any, b: any) => a.seat_number - b.seat_number) || [];
    const currentPlayer = players[currentPlayerIndex];

    if (currentPlayer?.user_id !== userId) {
      return NextResponse.json(
        { error: 'Not your turn' },
        { status: 400 }
      );
    }

    // Process the action
    const actionResult = await processPlayerAction(sessionId, userId, action, amount, session, player);

    if (!actionResult.success) {
      return NextResponse.json(
        { error: actionResult.error },
        { status: 400 }
      );
    }

    // Record the action
    const { error: actionError } = await supabaseServer
      .from('game_actions')
      .insert({
        session_id: sessionId,
        user_id: userId,
        action_type: action,
        amount: amount || 0,
        created_at: new Date().toISOString()
      });

    if (actionError) {
      console.error('Error recording action:', actionError);
    }

    return NextResponse.json({
      success: true,
      action,
      amount,
      gameState: actionResult.gameState
    });

  } catch (error) {
    console.error('Error processing action:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function processPlayerAction(
  sessionId: string,
  userId: string,
  action: string,
  amount: number | undefined,
  session: any,
  player: any
) {
  try {
    let updates: any = {};
    let playerUpdates: any = {};
    const currentBet = session.current_bet || 0;
    let newPot = session.total_pot || 0;

    switch (action) {
      case 'fold':
        playerUpdates.has_folded = true;
        break;

      case 'check':
        if (currentBet > (player.current_bet || 0)) {
          return { success: false, error: 'Cannot check when there is a bet to call' };
        }
        break;

      case 'call':
        const callAmount = currentBet - (player.current_bet || 0);
        if (callAmount > player.current_chips) {
          return { success: false, error: 'Not enough chips to call' };
        }
        
        playerUpdates.current_bet = currentBet;
        playerUpdates.current_chips = player.current_chips - callAmount;
        newPot += callAmount;
        break;

      case 'raise':
        if (!amount || amount < currentBet * 2) {
          return { success: false, error: 'Invalid raise amount' };
        }
        
        if (amount > player.current_chips + (player.current_bet || 0)) {
          return { success: false, error: 'Not enough chips to raise' };
        }

        const totalRaise = amount - (player.current_bet || 0);
        playerUpdates.current_bet = amount;
        playerUpdates.current_chips = player.current_chips - totalRaise;
        newPot += totalRaise;
        updates.current_bet = amount;
        break;

      default:
        return { success: false, error: 'Invalid action' };
    }

    // Update player
    if (Object.keys(playerUpdates).length > 0) {
      const { error: playerError } = await supabaseServer
        .from('session_players')
        .update(playerUpdates)
        .eq('session_id', sessionId)
        .eq('user_id', userId);

      if (playerError) {
        console.error('Error updating player:', playerError);
        return { success: false, error: 'Failed to update player' };
      }
    }

    // Move to next player
    const players = session.session_players?.sort((a: any, b: any) => a.seat_number - b.seat_number) || [];
    const activePlayers = players.filter((p: any) => !p.has_folded && p.status === 'active');
    
    let nextPlayerIndex = (session.current_player_index || 0) + 1;
    if (nextPlayerIndex >= activePlayers.length) {
      nextPlayerIndex = 0;
    }

    updates.current_player_index = nextPlayerIndex;
    updates.total_pot = newPot;
    updates.last_action = {
      player_id: userId,
      action,
      amount,
      timestamp: new Date().toISOString()
    };

    // Check if betting round is complete
    const bettingComplete = await checkBettingRoundComplete(sessionId);
    if (bettingComplete) {
      await advanceGameStage(sessionId);
    }

    // Update session
    const { error: sessionError } = await supabaseServer
      .from('poker_sessions')
      .update(updates)
      .eq('id', sessionId);

    if (sessionError) {
      console.error('Error updating session:', sessionError);
      return { success: false, error: 'Failed to update game state' };
    }

    return {
      success: true,
      gameState: {
        pot: newPot,
        currentBet: updates.current_bet || currentBet,
        currentPlayerIndex: nextPlayerIndex
      }
    };

  } catch (error) {
    console.error('Error processing player action:', error);
    return { success: false, error: 'Failed to process action' };
  }
}

async function checkBettingRoundComplete(sessionId: string): Promise<boolean> {
  try {
    const { data: players, error } = await supabaseServer
      .from('session_players')
      .select('current_bet, has_folded, status')
      .eq('session_id', sessionId)
      .eq('status', 'active');

    if (error || !players) {
      return false;
    }

    const activePlayers = players.filter(p => !p.has_folded);
    if (activePlayers.length <= 1) {
      return true;
    }

    // Check if all active players have the same bet
    const currentBets = activePlayers.map(p => p.current_bet || 0);
    return currentBets.every(bet => bet === currentBets[0]);

  } catch (error) {
    console.error('Error checking betting round:', error);
    return false;
  }
}

async function advanceGameStage(sessionId: string) {
  try {
    const { data: session, error } = await supabaseServer
      .from('poker_sessions')
      .select('game_stage, community_cards')
      .eq('id', sessionId)
      .single();

    if (error || !session) {
      return;
    }

    let newStage = session.game_stage;
    let newCommunityCards = session.community_cards || [];

    switch (session.game_stage) {
      case 'preflop':
        // Deal flop (3 cards)
        newCommunityCards = generateCommunityCards(3);
        newStage = 'flop';
        break;
      
      case 'flop':
        // Deal turn (1 card)
        newCommunityCards = [...newCommunityCards, ...generateCommunityCards(1)];
        newStage = 'turn';
        break;
      
      case 'turn':
        // Deal river (1 card)
        newCommunityCards = [...newCommunityCards, ...generateCommunityCards(1)];
        newStage = 'river';
        break;
      
      case 'river':
        // Showdown - determine winner and start new hand
        await handleShowdown(sessionId);
        return;
    }

    // Update session with new stage and community cards
    const { error: updateError } = await supabaseServer
      .from('poker_sessions')
      .update({
        game_stage: newStage,
        community_cards: newCommunityCards,
        current_bet: 0,
        current_player_index: 0
      })
      .eq('id', sessionId);

    if (updateError) {
      console.error('Error advancing game stage:', updateError);
    }

    // Reset all player bets for new betting round
    const { error: playerError } = await supabaseServer
      .from('session_players')
      .update({ current_bet: 0 })
      .eq('session_id', sessionId);

    if (playerError) {
      console.error('Error resetting player bets:', playerError);
    }

  } catch (error) {
    console.error('Error advancing game stage:', error);
  }
}

function generateCommunityCards(count: number) {
  // Simple card generation - in a real app, you'd use a proper deck
  const suits = ['hearts', 'diamonds', 'clubs', 'spades'];
  const ranks = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
  
  const cards = [];
  for (let i = 0; i < count; i++) {
    cards.push({
      suit: suits[Math.floor(Math.random() * suits.length)],
      rank: ranks[Math.floor(Math.random() * ranks.length)]
    });
  }
  
  return cards;
}

async function handleShowdown(sessionId: string) {
  // Implement showdown logic
  // For now, just start a new hand after 5 seconds
  setTimeout(async () => {
    // Reset for new hand
    const { error } = await supabaseServer
      .from('poker_sessions')
      .update({
        game_stage: 'preflop',
        community_cards: [],
        current_bet: 0,
        total_pot: 0,
        current_player_index: 0
      })
      .eq('id', sessionId);

    if (!error) {
      // Reset all players
      await supabaseServer
        .from('session_players')
        .update({
          current_bet: 0,
          has_folded: false,
          hole_cards: null
        })
        .eq('session_id', sessionId);
    }
  }, 5000);
}