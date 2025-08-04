import { NextRequest } from 'next/server'
import { WebSocketServer } from 'ws'
import { createClient } from '@supabase/supabase-js'

// Server-side Supabase client with service role key
const supabaseServer = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Active game sessions
export const gameSessions = new Map()
export const playerConnections = new Map()

export async function GET(request: NextRequest) {
  const upgradeHeader = request.headers.get('upgrade')
  
  if (upgradeHeader !== 'websocket') {
    return new Response('Expected Upgrade: websocket', { status: 426 })
  }

  try {
    // For development, return connection info
    // In production, you would use external WebSocket service
    return new Response('WebSocket server available on ws://localhost:8080', {
      status: 200,
      headers: {
        'Content-Type': 'text/plain',
        'Access-Control-Allow-Origin': '*',
      },
    })
  } catch (error) {
    console.error('WebSocket upgrade error:', error)
    return new Response('WebSocket upgrade failed', { status: 500 })
  }
}

export async function handleWebSocketMessage(ws: any, data: any) {
  const { type, sessionId, userId, ...payload } = data

  switch (type) {
    case 'join_session':
      await handleJoinSession(ws, sessionId, userId, payload)
      break
    
    case 'player_action':
      await handlePlayerAction(ws, sessionId, userId, payload)
      break
    
    case 'chat_message':
      await handleChatMessage(ws, sessionId, userId, payload)
      break
    
    case 'heartbeat':
      ws.send(JSON.stringify({ type: 'heartbeat_ack' }))
      break
    
    default:
      ws.send(JSON.stringify({ type: 'error', message: 'Unknown message type' }))
  }
}

async function handleJoinSession(ws: any, sessionId: string, userId: string, payload: any) {
  try {
    // Verify session exists and user is authorized
    const { data: session, error } = await supabaseServer
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
      .single()

    if (error || !session) {
      ws.send(JSON.stringify({ type: 'error', message: 'Session not found' }))
      return
    }

    // Check if user is a player in this session
    const player = session.session_players?.find((p: any) => p.user_id === userId)
    if (!player) {
      ws.send(JSON.stringify({ type: 'error', message: 'Not authorized to join this session' }))
      return
    }

    // Add player to connections
    playerConnections.set(userId, ws)

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
      })
    }

    const gameSession = gameSessions.get(sessionId)
    
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
    })

    // Send welcome message
    ws.send(JSON.stringify({
      type: 'session_joined',
      sessionId,
      gameState: gameSession,
      playerData: gameSession.players.get(userId)
    }))

    // Notify other players
    broadcastToSession(sessionId, {
      type: 'player_joined',
      player: {
        id: userId,
        seatNumber: player.seat_number,
        chips: player.current_chips
      }
    }, userId)

    // Start game if enough players
    if (gameSession.players.size >= 2 && gameSession.gameState === 'waiting') {
      await startNewHand(sessionId)
    }

  } catch (error) {
    console.error('Error joining session:', error)
    ws.send(JSON.stringify({ type: 'error', message: 'Failed to join session' }))
  }
}

async function handlePlayerAction(ws: any, sessionId: string, userId: string, payload: any) {
  const { action, amount } = payload
  const gameSession = gameSessions.get(sessionId)

  if (!gameSession) {
    ws.send(JSON.stringify({ type: 'error', message: 'Game session not found' }))
    return
  }

  const player = gameSession.players.get(userId)
  if (!player) {
    ws.send(JSON.stringify({ type: 'error', message: 'Player not in game' }))
    return
  }

  // Validate it's the player's turn
  const currentPlayer = getCurrentPlayer(gameSession)
  if (currentPlayer?.id !== userId) {
    ws.send(JSON.stringify({ type: 'error', message: 'Not your turn' }))
    return
  }

  try {
    await processPlayerAction(sessionId, userId, action, amount)
  } catch (error) {
    console.error('Error processing player action:', error)
    ws.send(JSON.stringify({ type: 'error', message: 'Invalid action' }))
  }
}

async function handleChatMessage(ws: any, sessionId: string, userId: string, payload: any) {
  const { message } = payload

  // Get user info
  const { data: user } = await supabaseServer
    .from('users')
    .select('username')
    .eq('id', userId)
    .single()

  // Broadcast chat message to all players in session
  broadcastToSession(sessionId, {
    type: 'chat_message',
    user: user?.username || 'Anonymous',
    message,
    timestamp: new Date().toISOString()
  })
}

function getCurrentPlayer(gameSession: any) {
  const players = Array.from(gameSession.players.values())
  return players.find((p: any) => p.seatNumber === gameSession.currentPlayerPosition)
}

async function processPlayerAction(sessionId: string, userId: string, action: string, amount?: number) {
  const gameSession = gameSessions.get(sessionId)
  const player = gameSession.players.get(userId)

  switch (action) {
    case 'fold':
      player.folded = true
      break
    
    case 'call':
      const callAmount = gameSession.currentBet - player.currentBet
      player.currentBet = gameSession.currentBet
      player.chips -= callAmount
      gameSession.pot += callAmount
      break
    
    case 'raise':
      const raiseAmount = amount || gameSession.currentBet * 2
      player.currentBet = raiseAmount
      player.chips -= raiseAmount
      gameSession.pot += raiseAmount
      gameSession.currentBet = raiseAmount
      break
    
    case 'check':
      // Only valid if no bet to call
      if (gameSession.currentBet > player.currentBet) {
        throw new Error('Cannot check when there is a bet to call')
      }
      break
    
    default:
      throw new Error('Invalid action')
  }

  // Move to next player
  moveToNextPlayer(gameSession)

  // Broadcast action to all players
  broadcastToSession(sessionId, {
    type: 'player_action',
    player: userId,
    action,
    amount,
    gameState: {
      pot: gameSession.pot,
      currentBet: gameSession.currentBet,
      currentPlayer: getCurrentPlayer(gameSession)?.id
    }
  })

  // Check if betting round is complete
  if (isBettingRoundComplete(gameSession)) {
    await advanceGameState(sessionId)
  }
}

async function startNewHand(sessionId: string) {
  const gameSession = gameSessions.get(sessionId)
  
  // Reset hand state
  gameSession.gameState = 'preflop'
  gameSession.pot = 0
  gameSession.currentBet = 0
  gameSession.communityCards = []
  gameSession.deck = shuffleDeck(createDeck())
  
  // Reset players
  for (const player of gameSession.players.values()) {
    player.holeCards = []
    player.currentBet = 0
    player.folded = false
    player.allIn = false
  }
  
  // Deal hole cards
  const players = Array.from(gameSession.players.values())
  for (let i = 0; i < 2; i++) {
    for (const player of players) {
      player.holeCards.push(gameSession.deck.pop())
    }
  }

  // Post blinds
  const smallBlindPlayer = players.find(p => p.seatNumber === gameSession.smallBlindPosition)
  const bigBlindPlayer = players.find(p => p.seatNumber === gameSession.bigBlindPosition)
  
  if (smallBlindPlayer && bigBlindPlayer) {
    smallBlindPlayer.currentBet = 1
    smallBlindPlayer.chips -= 1
    gameSession.pot += 1
    
    bigBlindPlayer.currentBet = 2
    bigBlindPlayer.chips -= 2
    gameSession.pot += 2
    gameSession.currentBet = 2
  }

  // Broadcast new hand started
  broadcastToSession(sessionId, {
    type: 'new_hand_started',
    gameState: gameSession.gameState,
    pot: gameSession.pot,
    currentBet: gameSession.currentBet
  })

  // Send hole cards to each player privately
  for (const [playerId, player] of gameSession.players) {
    const ws = playerConnections.get(playerId)
    if (ws) {
      ws.send(JSON.stringify({
        type: 'hole_cards',
        cards: player.holeCards
      }))
    }
  }
}

function moveToNextPlayer(gameSession: any) {
  const players = Array.from(gameSession.players.values())
  const activePlayers = players.filter((p: any) => !p.folded)
  
  let nextPosition = gameSession.currentPlayerPosition + 1
  if (nextPosition > Math.max(...players.map((p: any) => p.seatNumber))) {
    nextPosition = Math.min(...players.map((p: any) => p.seatNumber))
  }
  
  // Find next active player
  while (!activePlayers.find((p: any) => p.seatNumber === nextPosition)) {
    nextPosition++
    if (nextPosition > Math.max(...players.map((p: any) => p.seatNumber))) {
      nextPosition = Math.min(...players.map((p: any) => p.seatNumber))
    }
  }
  
  gameSession.currentPlayerPosition = nextPosition
}

function isBettingRoundComplete(gameSession: any) {
  const players = Array.from(gameSession.players.values())
  const activePlayers = players.filter((p: any) => !p.folded)
  
  return activePlayers.every((p: any) => p.currentBet === gameSession.currentBet)
}

async function advanceGameState(sessionId: string) {
  const gameSession = gameSessions.get(sessionId)
  
  switch (gameSession.gameState) {
    case 'preflop':
      // Deal flop
      gameSession.communityCards = gameSession.deck.splice(0, 3)
      gameSession.gameState = 'flop'
      break
    
    case 'flop':
      // Deal turn
      gameSession.communityCards.push(gameSession.deck.splice(0, 1)[0])
      gameSession.gameState = 'turn'
      break
    
    case 'turn':
      // Deal river
      gameSession.communityCards.push(gameSession.deck.splice(0, 1)[0])
      gameSession.gameState = 'river'
      break
    
    case 'river':
      // Showdown
      await handleShowdown(sessionId)
      return
  }

  // Reset betting for new round
  for (const player of gameSession.players.values()) {
    player.currentBet = 0
  }
  gameSession.currentBet = 0

  // Broadcast new game state
  broadcastToSession(sessionId, {
    type: 'game_state_update',
    gameState: gameSession.gameState,
    communityCards: gameSession.communityCards,
    pot: gameSession.pot
  })
}

async function handleShowdown(sessionId: string) {
  // Implement showdown logic here
  // For now, just start a new hand
  setTimeout(() => {
    startNewHand(sessionId)
  }, 5000)
}

function broadcastToSession(sessionId: string, message: any, excludeUserId?: string) {
  const gameSession = gameSessions.get(sessionId)
  if (!gameSession) return

  for (const [playerId] of gameSession.players) {
    if (excludeUserId && playerId === excludeUserId) continue
    
    const ws = playerConnections.get(playerId)
    if (ws) {
      ws.send(JSON.stringify(message))
    }
  }
}

function createDeck() {
  const suits = ['hearts', 'diamonds', 'clubs', 'spades']
  const ranks = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A']
  const deck = []

  for (const suit of suits) {
    for (const rank of ranks) {
      deck.push({ suit, rank })
    }
  }

  return deck
}

function shuffleDeck(deck: any[]) {
  const shuffled = [...deck]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

// For development/testing, you can create a separate WebSocket server
export function createWebSocketServer(port: number = 8080) {
  const wss = new WebSocketServer({ port })
  
  wss.on('connection', (ws, request) => {
    wsManager.handleConnection(ws, request)
  })

  console.log(`WebSocket server running on port ${port}`)
  return wss
}

// Alternative: Create WebSocket server that can be imported and used
export class NextWebSocketServer {
  private wss: WebSocketServer | null = null

  start(port: number = 8080) {
    if (this.wss) {
      console.log('WebSocket server already running')
      return
    }

    this.wss = new WebSocketServer({ port })
    
    this.wss.on('connection', (ws, request) => {
      wsManager.handleConnection(ws, request)
    })

    this.wss.on('error', (error) => {
      console.error('WebSocket server error:', error)
    })

    console.log(`WebSocket server started on port ${port}`)
  }

  stop() {
    if (this.wss) {
      this.wss.close()
      this.wss = null
      console.log('WebSocket server stopped')
    }
  }

  getServer() {
    return this.wss
  }
}

export const webSocketServer = new NextWebSocketServer()