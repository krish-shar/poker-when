// WebSocket server for development
const { WebSocketServer } = require('ws');
const { createClient } = require('@supabase/supabase-js');

// Environment variables
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing required environment variables');
  process.exit(1);
}

// Server-side Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Active game sessions and player connections
const gameSessions = new Map();
const playerConnections = new Map();

// WebSocket server
const wss = new WebSocketServer({ port: 8080 });

console.log('🃏 Poker WebSocket server starting on port 8080...');

wss.on('connection', (ws, request) => {
  const url = new URL(request.url, `http://${request.headers.host}`);
  const sessionId = url.searchParams.get('sessionId');
  const userId = url.searchParams.get('userId');

  console.log(`New connection: sessionId=${sessionId}, userId=${userId}`);

  if (!sessionId || !userId) {
    ws.send(JSON.stringify({ type: 'error', message: 'Missing sessionId or userId' }));
    ws.close();
    return;
  }

  ws.on('message', async (message) => {
    try {
      const data = JSON.parse(message.toString());
      console.log('Received message:', data);
      await handleWebSocketMessage(ws, data);
    } catch (error) {
      console.error('Error handling WebSocket message:', error);
      ws.send(JSON.stringify({ type: 'error', message: 'Invalid message format' }));
    }
  });

  ws.on('close', (code, reason) => {
    console.log(`Connection closed: ${code} ${reason}`);
    // Remove player from active connections
    for (const [playerId, connection] of playerConnections.entries()) {
      if (connection === ws) {
        playerConnections.delete(playerId);
        console.log(`Removed player ${playerId} from connections`);
        break;
      }
    }
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });

  // Send initial connection confirmation
  ws.send(JSON.stringify({
    type: 'connection_established',
    sessionId,
    userId,
    timestamp: new Date().toISOString()
  }));
});

async function handleWebSocketMessage(ws, data) {
  const { type, sessionId, userId, ...payload } = data;

  switch (type) {
    case 'join_session':
      await handleJoinSession(ws, sessionId, userId, payload);
      break;
    
    case 'player_action':
      await handlePlayerAction(ws, sessionId, userId, payload);
      break;
    
    case 'chat_message':
      await handleChatMessage(ws, sessionId, userId, payload);
      break;
    
    case 'heartbeat':
      ws.send(JSON.stringify({ type: 'heartbeat_ack' }));
      break;
    
    default:
      ws.send(JSON.stringify({ type: 'error', message: 'Unknown message type' }));
  }
}

async function handleJoinSession(ws, sessionId, userId, payload) {
  try {
    // Verify session exists and user is authorized
    const { data: session, error } = await supabase
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

    if (error || !session) {
      ws.send(JSON.stringify({ type: 'error', message: 'Session not found' }));
      return;
    }

    // Check if user is a player in this session
    const player = session.session_players?.find((p) => p.user_id === userId);
    if (!player) {
      ws.send(JSON.stringify({ type: 'error', message: 'Not authorized to join this session' }));
      return;
    }

    // Add player to connections
    playerConnections.set(userId, ws);

    // Initialize or get game session
    if (!gameSessions.has(sessionId)) {
      gameSessions.set(sessionId, {
        id: sessionId,
        players: new Map(),
        gameState: 'waiting',
        currentHand: null,
        pot: 0,
        currentBet: 0,
        dealerPosition: 0,
        smallBlindPosition: 1,
        bigBlindPosition: 2,
        currentPlayerPosition: 3,
        communityCards: [],
        deck: shuffleDeck(createDeck())
      });
    }

    const gameSession = gameSessions.get(sessionId);
    
    // Add player to game session
    gameSession.players.set(userId, {
      id: userId,
      seatNumber: player.seat_number,
      chips: player.current_chips,
      holeCards: [],
      status: 'active',
      currentBet: 0,
      folded: false,
      allIn: false
    });

    // Send welcome message
    ws.send(JSON.stringify({
      type: 'session_joined',
      sessionId,
      gameState: gameSession,
      playerData: gameSession.players.get(userId)
    }));

    // Notify other players
    broadcastToSession(sessionId, {
      type: 'player_joined',
      player: {
        id: userId,
        seatNumber: player.seat_number,
        chips: player.current_chips
      }
    }, userId);

    // Start game if enough players
    if (gameSession.players.size >= 2 && gameSession.gameState === 'waiting') {
      await startNewHand(sessionId);
    }

  } catch (error) {
    console.error('Error joining session:', error);
    ws.send(JSON.stringify({ type: 'error', message: 'Failed to join session' }));
  }
}

async function handlePlayerAction(ws, sessionId, userId, payload) {
  const { action, amount } = payload;
  const gameSession = gameSessions.get(sessionId);

  if (!gameSession) {
    ws.send(JSON.stringify({ type: 'error', message: 'Game session not found' }));
    return;
  }

  const player = gameSession.players.get(userId);
  if (!player) {
    ws.send(JSON.stringify({ type: 'error', message: 'Player not in game' }));
    return;
  }

  try {
    await processPlayerAction(sessionId, userId, action, amount);
  } catch (error) {
    console.error('Error processing player action:', error);
    ws.send(JSON.stringify({ type: 'error', message: 'Invalid action' }));
  }
}

async function handleChatMessage(ws, sessionId, userId, payload) {
  const { message } = payload;

  // Get user info
  const { data: user } = await supabase
    .from('users')
    .select('username')
    .eq('id', userId)
    .single();

  // Broadcast chat message to all players in session
  broadcastToSession(sessionId, {
    type: 'chat_message',
    user: user?.username || 'Anonymous',
    message,
    timestamp: new Date().toISOString()
  });
}

async function processPlayerAction(sessionId, userId, action, amount) {
  const gameSession = gameSessions.get(sessionId);
  const player = gameSession.players.get(userId);

  switch (action) {
    case 'fold':
      player.folded = true;
      break;
    
    case 'call':
      const callAmount = gameSession.currentBet - player.currentBet;
      player.currentBet = gameSession.currentBet;
      player.chips -= callAmount;
      gameSession.pot += callAmount;
      break;
    
    case 'raise':
      const raiseAmount = amount || gameSession.currentBet * 2;
      player.currentBet = raiseAmount;
      player.chips -= raiseAmount;
      gameSession.pot += raiseAmount;
      gameSession.currentBet = raiseAmount;
      break;
    
    case 'check':
      if (gameSession.currentBet > player.currentBet) {
        throw new Error('Cannot check when there is a bet to call');
      }
      break;
    
    default:
      throw new Error('Invalid action');
  }

  // Broadcast action to all players
  broadcastToSession(sessionId, {
    type: 'player_action',
    player: userId,
    action,
    amount,
    gameState: {
      pot: gameSession.pot,
      currentBet: gameSession.currentBet,
    }
  });

  console.log(`Player ${userId} ${action}${amount ? ` ${amount}` : ''}`);
}

async function startNewHand(sessionId) {
  const gameSession = gameSessions.get(sessionId);
  
  // Reset hand state
  gameSession.gameState = 'preflop';
  gameSession.pot = 0;
  gameSession.currentBet = 0;
  gameSession.communityCards = [];
  gameSession.deck = shuffleDeck(createDeck());
  
  // Reset players
  for (const player of gameSession.players.values()) {
    player.holeCards = [];
    player.currentBet = 0;
    player.folded = false;
    player.allIn = false;
  }
  
  // Deal hole cards
  const players = Array.from(gameSession.players.values());
  for (let i = 0; i < 2; i++) {
    for (const player of players) {
      player.holeCards.push(gameSession.deck.pop());
    }
  }

  // Post blinds
  const smallBlindPlayer = players.find(p => p.seatNumber === gameSession.smallBlindPosition);
  const bigBlindPlayer = players.find(p => p.seatNumber === gameSession.bigBlindPosition);
  
  if (smallBlindPlayer && bigBlindPlayer) {
    smallBlindPlayer.currentBet = 1;
    smallBlindPlayer.chips -= 1;
    gameSession.pot += 1;
    
    bigBlindPlayer.currentBet = 2;
    bigBlindPlayer.chips -= 2;
    gameSession.pot += 2;
    gameSession.currentBet = 2;
  }

  // Broadcast new hand started
  broadcastToSession(sessionId, {
    type: 'new_hand_started',
    gameState: gameSession.gameState,
    pot: gameSession.pot,
    currentBet: gameSession.currentBet
  });

  // Send hole cards to each player privately
  for (const [playerId, player] of gameSession.players) {
    const ws = playerConnections.get(playerId);
    if (ws) {
      ws.send(JSON.stringify({
        type: 'hole_cards',
        cards: player.holeCards
      }));
    }
  }

  console.log(`New hand started for session ${sessionId}`);
}

function broadcastToSession(sessionId, message, excludeUserId) {
  const gameSession = gameSessions.get(sessionId);
  if (!gameSession) return;

  for (const [playerId] of gameSession.players) {
    if (excludeUserId && playerId === excludeUserId) continue;
    
    const ws = playerConnections.get(playerId);
    if (ws) {
      ws.send(JSON.stringify(message));
    }
  }
}

function createDeck() {
  const suits = ['hearts', 'diamonds', 'clubs', 'spades'];
  const ranks = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
  const deck = [];

  for (const suit of suits) {
    for (const rank of ranks) {
      deck.push({ suit, rank });
    }
  }

  return deck;
}

function shuffleDeck(deck) {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

wss.on('error', (error) => {
  console.error('WebSocket server error:', error);
});

console.log('🃏 Poker WebSocket server is running on ws://localhost:8080');
console.log('Ready to accept connections...');

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down WebSocket server...');
  wss.close(() => {
    console.log('WebSocket server closed');
    process.exit(0);
  });
});