import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { PokerGameEngine, HandEvaluator, CardUtils } from '@/lib/game/engine';

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
    const playerCurrentBet = player.current_bet || 0;
    let newPot = session.total_pot || 0;

    // Validate action and amount
    const validation = validatePlayerAction(action, amount, currentBet, playerCurrentBet, player.current_chips);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    switch (action) {
      case 'fold':
        playerUpdates.has_folded = true;
        playerUpdates.status = 'folded';
        break;

      case 'check':
        // No chips movement for check
        break;

      case 'call':
        const callAmount = Math.min(currentBet - playerCurrentBet, player.current_chips);
        playerUpdates.current_bet = playerCurrentBet + callAmount;
        playerUpdates.current_chips = player.current_chips - callAmount;
        newPot += callAmount;
        
        // Check if player is all-in
        if (playerUpdates.current_chips === 0) {
          playerUpdates.status = 'all_in';
        }
        break;

      case 'raise':
        const raiseAmount = amount!;
        const totalToPay = raiseAmount - playerCurrentBet;
        
        if (totalToPay >= player.current_chips) {
          // All-in scenario
          playerUpdates.current_bet = playerCurrentBet + player.current_chips;
          playerUpdates.current_chips = 0;
          playerUpdates.status = 'all_in';
          newPot += player.current_chips;
          updates.current_bet = Math.max(currentBet, playerUpdates.current_bet);
        } else {
          playerUpdates.current_bet = raiseAmount;
          playerUpdates.current_chips = player.current_chips - totalToPay;
          newPot += totalToPay;
          updates.current_bet = raiseAmount;
        }
        break;

      case 'all_in':
        playerUpdates.current_bet = playerCurrentBet + player.current_chips;
        playerUpdates.current_chips = 0;
        playerUpdates.status = 'all_in';
        newPot += player.current_chips;
        updates.current_bet = Math.max(currentBet, playerUpdates.current_bet);
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

function validatePlayerAction(
  action: string,
  amount: number | undefined,
  currentBet: number,
  playerCurrentBet: number,
  playerChips: number
): { valid: boolean; error?: string } {
  switch (action) {
    case 'fold':
      return { valid: true };

    case 'check':
      if (currentBet > playerCurrentBet) {
        return { valid: false, error: 'Cannot check when there is a bet to call' };
      }
      return { valid: true };

    case 'call':
      const callAmount = currentBet - playerCurrentBet;
      if (callAmount <= 0) {
        return { valid: false, error: 'No bet to call' };
      }
      if (callAmount > playerChips) {
        return { valid: false, error: 'Not enough chips to call' };
      }
      return { valid: true };

    case 'raise':
      if (!amount) {
        return { valid: false, error: 'Raise amount required' };
      }
      
      // Minimum raise = current bet + the size of the last raise (or big blind if no raise yet)
      const lastRaiseSize = Math.max(currentBet, 2); // Assume big blind is 2
      const minRaise = currentBet + lastRaiseSize;
      
      if (amount < minRaise) {
        return { valid: false, error: `Minimum raise is ${minRaise}` };
      }
      
      const totalToPay = amount - playerCurrentBet;
      if (totalToPay > playerChips) {
        return { valid: false, error: 'Not enough chips to raise' };
      }
      return { valid: true };

    case 'all_in':
      if (playerChips <= 0) {
        return { valid: false, error: 'No chips to go all-in' };
      }
      return { valid: true };

    default:
      return { valid: false, error: 'Invalid action type' };
  }
}

async function checkBettingRoundComplete(sessionId: string): Promise<boolean> {
  try {
    const { data: players, error } = await supabaseServer
      .from('session_players')
      .select('current_bet, has_folded, status')
      .eq('session_id', sessionId)
      .in('status', ['active', 'all_in']);

    if (error || !players) {
      return false;
    }

    const activePlayers = players.filter(p => !p.has_folded);
    if (activePlayers.length <= 1) {
      return true;
    }

    // Find the highest bet among active players
    const maxBet = Math.max(...activePlayers.map(p => p.current_bet || 0));
    
    // Check if all active players have either:
    // 1. Matched the highest bet, OR
    // 2. Are all-in with less chips
    return activePlayers.every(p => {
      const playerBet = p.current_bet || 0;
      return playerBet === maxBet || p.status === 'all_in';
    });

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
  try {
    // Get session with all player data
    const { data: session, error } = await supabaseServer
      .from('poker_sessions')
      .select(`
        *,
        session_players (
          id,
          user_id,
          current_chips,
          current_bet,
          has_folded,
          status,
          hole_cards,
          users (username)
        )
      `)
      .eq('id', sessionId)
      .single();

    if (error || !session) {
      console.error('Error getting session for showdown:', error);
      return;
    }

    // Find active players who haven't folded
    const activePlayers = session.session_players?.filter(
      (p: any) => !p.has_folded && (p.status === 'active' || p.status === 'all_in')
    ) || [];

    if (activePlayers.length <= 1) {
      // Only one player left, they win
      const winner = activePlayers[0];
      if (winner) {
        await distributePot(sessionId, [winner], session.total_pot || 0);
      }
    } else {
      // Multiple players - evaluate hands
      const winners = await evaluateShowdown(activePlayers, session.community_cards || []);
      await distributePot(sessionId, winners, session.total_pot || 0);
    }

    // Add showdown message to chat
    await supabaseServer
      .from('chat_messages')
      .insert({
        session_id: sessionId,
        user_id: 'system',
        message: `Hand complete. Starting new hand in 5 seconds...`,
        message_type: 'system'
      });

    // Start new hand after delay
    setTimeout(async () => {
      await startNewHand(sessionId);
    }, 5000);

  } catch (error) {
    console.error('Error in showdown:', error);
    // Fallback - just start new hand
    setTimeout(async () => {
      await startNewHand(sessionId);
    }, 5000);
  }
}

async function evaluateShowdown(players: any[], communityCards: any[]): Promise<any[]> {
  const playerHands = [];

  for (const player of players) {
    if (!player.hole_cards || player.hole_cards.length !== 2) {
      console.error(`Player ${player.user_id} has invalid hole cards`);
      continue;
    }

    try {
      // Combine hole cards and community cards
      const allCards = [...player.hole_cards, ...communityCards];
      
      // Convert to proper Card format if needed
      const cards = allCards.map(card => ({
        suit: card.suit,
        rank: card.rank === '10' ? 'T' : card.rank
      }));

      // Evaluate hand
      const handRanking = HandEvaluator.evaluateHand(cards);
      
      playerHands.push({
        player,
        ranking: handRanking,
        handDescription: `${handRanking.name} (${handRanking.cards.map(c => `${c.rank}${c.suit[0]}`).join(' ')})`
      });

    } catch (error) {
      console.error(`Error evaluating hand for player ${player.user_id}:`, error);
      // Give them high card ace as fallback
      playerHands.push({
        player,
        ranking: { rank: 0, name: 'High Card', cards: [] },
        handDescription: 'High Card (evaluation error)'
      });
    }
  }

  // Sort by hand strength (highest first)
  playerHands.sort((a, b) => {
    if (a.ranking.rank !== b.ranking.rank) {
      return b.ranking.rank - a.ranking.rank;
    }
    
    // If same rank, compare kickers
    if (a.ranking.kickers && b.ranking.kickers) {
      for (let i = 0; i < Math.min(a.ranking.kickers.length, b.ranking.kickers.length); i++) {
        const aKickerValue = CardUtils.getRankValue(a.ranking.kickers[i] as any);
        const bKickerValue = CardUtils.getRankValue(b.ranking.kickers[i] as any);
        if (aKickerValue !== bKickerValue) {
          return bKickerValue - aKickerValue;
        }
      }
    }
    
    return 0; // Exact tie
  });

  // Find all players with the best hand
  const bestRank = playerHands[0].ranking.rank;
  const winners = playerHands
    .filter(ph => ph.ranking.rank === bestRank)
    .map(ph => ph.player);

  // Log showdown results
  console.log('Showdown results:');
  for (const ph of playerHands) {
    console.log(`${ph.player.users?.username}: ${ph.handDescription}`);
  }

  return winners;
}

async function distributePot(sessionId: string, winners: any[], totalPot: number) {
  if (winners.length === 0 || totalPot <= 0) return;

  const potPerWinner = Math.floor(totalPot / winners.length);
  const remainder = totalPot % winners.length;

  for (let i = 0; i < winners.length; i++) {
    const winner = winners[i];
    const winAmount = potPerWinner + (i === 0 ? remainder : 0);

    // Update winner's chips
    await supabaseServer
      .from('session_players')
      .update({
        current_chips: winner.current_chips + winAmount
      })
      .eq('session_id', sessionId)
      .eq('user_id', winner.user_id);

    // Add winner message to chat
    await supabaseServer
      .from('chat_messages')
      .insert({
        session_id: sessionId,
        user_id: 'system',
        message: `${winner.users?.username || 'Player'} wins $${winAmount}!`,
        message_type: 'system'
      });
  }
}

async function startNewHand(sessionId: string) {
  try {
    // Reset session for new hand
    const { error: sessionError } = await supabaseServer
      .from('poker_sessions')
      .update({
        game_stage: 'preflop',
        community_cards: [],
        current_bet: 0,
        total_pot: 0,
        current_player_index: 0,
        last_action: {
          player_id: 'system',
          action: 'new_hand',
          timestamp: new Date().toISOString()
        }
      })
      .eq('id', sessionId);

    if (sessionError) {
      console.error('Error resetting session:', sessionError);
      return;
    }

    // Reset all players
    const { error: playersError } = await supabaseServer
      .from('session_players')
      .update({
        current_bet: 0,
        has_folded: false,
        hole_cards: null,
        status: 'active'
      })
      .eq('session_id', sessionId)
      .neq('status', 'sitting_out');

    if (playersError) {
      console.error('Error resetting players:', playersError);
      return;
    }

    // Start the new hand via the start-hand endpoint
    const response = await fetch(`/api/games/${sessionId}/start-hand`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId: 'system'
      }),
    });

    if (!response.ok) {
      console.error('Error starting new hand');
    }

  } catch (error) {
    console.error('Error in startNewHand:', error);
  }
}