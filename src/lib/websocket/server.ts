import { WebSocket } from 'ws'
import { IncomingMessage } from 'http'
import { CacheManager } from '@/lib/cache/redis'
import { supabaseAdmin } from '@/lib/supabase/client'
import { auth } from '@/lib/auth/config'

export interface WebSocketConnection {
  id: string
  userId: string
  ws: WebSocket
  sessionId?: string
  tableId?: string
  lastPing: Date
  isAlive: boolean
}

export interface GameMessage {
  type: 'game_action' | 'game_state' | 'player_join' | 'player_leave' | 'chat_message' | 'hand_complete' | 'error'
  payload: any
  timestamp: string
  from?: string
  to?: string // For targeted messages
}

export class WebSocketManager {
  private connections = new Map<string, WebSocketConnection>()
  private rooms = new Map<string, Set<string>>() // roomId -> connectionIds
  private heartbeatInterval: NodeJS.Timeout

  constructor() {
    // Start heartbeat to check connection health
    this.heartbeatInterval = setInterval(() => {
      this.heartbeat()
    }, 30000) // 30 seconds
  }

  async handleConnection(ws: WebSocket, request: IncomingMessage) {
    try {
      // Extract authentication from query parameters or headers
      const url = new URL(request.url || '', `http://${request.headers.host}`)
      const token = url.searchParams.get('token') || request.headers.authorization?.replace('Bearer ', '')

      if (!token) {
        ws.close(1008, 'Authentication required')
        return
      }

      // Verify authentication token
      const session = await this.verifyToken(token)
      if (!session) {
        ws.close(1008, 'Invalid authentication')
        return
      }

      const connectionId = this.generateConnectionId()
      const connection: WebSocketConnection = {
        id: connectionId,
        userId: session.user.id,
        ws,
        lastPing: new Date(),
        isAlive: true
      }

      this.connections.set(connectionId, connection)

      // Set up WebSocket event handlers
      ws.on('message', (data) => this.handleMessage(connectionId, data))
      ws.on('close', () => this.handleDisconnection(connectionId))
      ws.on('error', (error) => this.handleError(connectionId, error))
      ws.on('pong', () => this.handlePong(connectionId))

      // Send connection confirmation
      this.sendToConnection(connectionId, {
        type: 'connection_established',
        payload: { connectionId, userId: session.user.id },
        timestamp: new Date().toISOString()
      })

      console.log(`WebSocket connection established: ${connectionId} for user ${session.user.id}`)

    } catch (error) {
      console.error('WebSocket connection error:', error)
      ws.close(1011, 'Server error')
    }
  }

  private async verifyToken(token: string) {
    try {
      // Use better-auth to verify the token
      // This would need to be implemented based on better-auth's token verification
      // For now, we'll use a simple approach
      return { user: { id: 'user-id' } } // Placeholder
    } catch (error) {
      console.error('Token verification error:', error)
      return null
    }
  }

  private generateConnectionId(): string {
    return `ws_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private async handleMessage(connectionId: string, data: Buffer) {
    try {
      const connection = this.connections.get(connectionId)
      if (!connection) return

      const message = JSON.parse(data.toString()) as GameMessage

      switch (message.type) {
        case 'join_room':
          await this.handleJoinRoom(connectionId, message.payload)
          break
        case 'leave_room':
          await this.handleLeaveRoom(connectionId, message.payload)
          break
        case 'game_action':
          await this.handleGameAction(connectionId, message)
          break
        case 'chat_message':
          await this.handleChatMessage(connectionId, message)
          break
        case 'ping':
          this.handlePing(connectionId)
          break
        default:
          console.warn(`Unknown message type: ${message.type}`)
      }
    } catch (error) {
      console.error('Message handling error:', error)
      this.sendError(connectionId, 'Invalid message format')
    }
  }

  private async handleJoinRoom(connectionId: string, payload: { roomId: string, roomType: 'session' | 'lobby' }) {
    const connection = this.connections.get(connectionId)
    if (!connection) return

    const { roomId, roomType } = payload

    // Validate user has permission to join this room
    const hasPermission = await this.validateRoomAccess(connection.userId, roomId, roomType)
    if (!hasPermission) {
      this.sendError(connectionId, 'Access denied to room')
      return
    }

    // Add to room
    if (!this.rooms.has(roomId)) {
      this.rooms.set(roomId, new Set())
    }
    this.rooms.get(roomId)!.add(connectionId)

    // Update connection info
    if (roomType === 'session') {
      connection.sessionId = roomId
    }

    // Add to Redis for persistence
    await CacheManager.addToWebSocketRoom(roomId, connectionId)

    // Notify room members
    this.broadcastToRoom(roomId, {
      type: 'player_join',
      payload: { userId: connection.userId, connectionId },
      timestamp: new Date().toISOString()
    }, connectionId)

    // Send room state to new member
    const roomState = await this.getRoomState(roomId, roomType)
    this.sendToConnection(connectionId, {
      type: 'room_state',
      payload: roomState,
      timestamp: new Date().toISOString()
    })

    console.log(`User ${connection.userId} joined room ${roomId}`)
  }

  private async handleLeaveRoom(connectionId: string, payload: { roomId: string }) {
    const connection = this.connections.get(connectionId)
    if (!connection) return

    const { roomId } = payload

    // Remove from room
    this.rooms.get(roomId)?.delete(connectionId)
    
    // Remove from Redis
    await CacheManager.removeFromWebSocketRoom(roomId, connectionId)

    // Clear session/table info
    if (connection.sessionId === roomId) {
      connection.sessionId = undefined
    }

    // Notify room members
    this.broadcastToRoom(roomId, {
      type: 'player_leave',
      payload: { userId: connection.userId, connectionId },
      timestamp: new Date().toISOString()
    }, connectionId)

    console.log(`User ${connection.userId} left room ${roomId}`)
  }

  private async handleGameAction(connectionId: string, message: GameMessage) {
    const connection = this.connections.get(connectionId)
    if (!connection?.sessionId) return

    // Validate the game action
    const isValidAction = await this.validateGameAction(
      connection.userId,
      connection.sessionId,
      message.payload
    )

    if (!isValidAction) {
      this.sendError(connectionId, 'Invalid game action')
      return
    }

    // Process the game action (this would integrate with the game engine)
    const gameUpdate = await this.processGameAction(
      connection.sessionId,
      connection.userId,
      message.payload
    )

    if (gameUpdate) {
      // Broadcast game update to all players in the session
      this.broadcastToRoom(connection.sessionId, {
        type: 'game_state',
        payload: gameUpdate,
        timestamp: new Date().toISOString(),
        from: connection.userId
      })
    }
  }

  private async handleChatMessage(connectionId: string, message: GameMessage) {
    const connection = this.connections.get(connectionId)
    if (!connection?.sessionId) return

    // Validate and sanitize chat message
    const { text, type } = message.payload
    if (!text || text.length > 500) {
      this.sendError(connectionId, 'Invalid chat message')
      return
    }

    // Check rate limiting
    const canSendMessage = await CacheManager.checkRateLimit(
      `chat:${connection.userId}`,
      10, // 10 messages per minute
      60
    )

    if (!canSendMessage) {
      this.sendError(connectionId, 'Rate limit exceeded')
      return
    }

    // Broadcast chat message to room
    this.broadcastToRoom(connection.sessionId, {
      type: 'chat_message',
      payload: {
        userId: connection.userId,
        text: this.sanitizeText(text),
        type: type || 'public',
        timestamp: new Date().toISOString()
      },
      timestamp: new Date().toISOString(),
      from: connection.userId
    })
  }

  private handlePing(connectionId: string) {
    const connection = this.connections.get(connectionId)
    if (connection) {
      connection.lastPing = new Date()
      connection.isAlive = true
      this.sendToConnection(connectionId, {
        type: 'pong',
        payload: {},
        timestamp: new Date().toISOString()
      })
    }
  }

  private handlePong(connectionId: string) {
    const connection = this.connections.get(connectionId)
    if (connection) {
      connection.isAlive = true
    }
  }

  private handleDisconnection(connectionId: string) {
    const connection = this.connections.get(connectionId)
    if (!connection) return

    // Remove from all rooms
    for (const [roomId, connections] of this.rooms.entries()) {
      if (connections.has(connectionId)) {
        connections.delete(connectionId)
        
        // Notify room members
        this.broadcastToRoom(roomId, {
          type: 'player_leave',
          payload: { userId: connection.userId, connectionId },
          timestamp: new Date().toISOString()
        }, connectionId)

        // Remove from Redis
        CacheManager.removeFromWebSocketRoom(roomId, connectionId)
      }
    }

    this.connections.delete(connectionId)
    console.log(`WebSocket connection closed: ${connectionId}`)
  }

  private handleError(connectionId: string, error: Error) {
    console.error(`WebSocket error for connection ${connectionId}:`, error)
    this.handleDisconnection(connectionId)
  }

  private heartbeat() {
    for (const [connectionId, connection] of this.connections.entries()) {
      if (!connection.isAlive) {
        connection.ws.terminate()
        this.handleDisconnection(connectionId)
        continue
      }

      connection.isAlive = false
      connection.ws.ping()
    }
  }

  // Messaging methods
  sendToConnection(connectionId: string, message: GameMessage) {
    const connection = this.connections.get(connectionId)
    if (connection && connection.ws.readyState === WebSocket.OPEN) {
      connection.ws.send(JSON.stringify(message))
    }
  }

  broadcastToRoom(roomId: string, message: GameMessage, excludeConnectionId?: string) {
    const connections = this.rooms.get(roomId)
    if (!connections) return

    for (const connectionId of connections) {
      if (connectionId !== excludeConnectionId) {
        this.sendToConnection(connectionId, message)
      }
    }
  }

  private sendError(connectionId: string, error: string) {
    this.sendToConnection(connectionId, {
      type: 'error',
      payload: { error },
      timestamp: new Date().toISOString()
    })
  }

  // Validation methods
  private async validateRoomAccess(userId: string, roomId: string, roomType: string): Promise<boolean> {
    try {
      if (roomType === 'session') {
        // Check if user is a member of the session
        const { data, error } = await supabaseAdmin
          .from('session_players')
          .select('id')
          .eq('session_id', roomId)
          .eq('user_id', userId)
          .single()

        return !error && !!data
      }
      
      return true // Allow lobby access for now
    } catch (error) {
      console.error('Room access validation error:', error)
      return false
    }
  }

  private async validateGameAction(userId: string, sessionId: string, action: any): Promise<boolean> {
    // This would integrate with the game engine to validate actions
    // For now, return true
    return true
  }

  private async processGameAction(sessionId: string, userId: string, action: any) {
    // This would integrate with the game engine to process actions
    // For now, return a placeholder
    return { action, userId, sessionId, processed: true }
  }

  private async getRoomState(roomId: string, roomType: string) {
    // Get current room state from database/cache
    if (roomType === 'session') {
      return await CacheManager.getGameState(roomId)
    }
    return {}
  }

  private sanitizeText(text: string): string {
    // Basic text sanitization
    return text.replace(/[<>]/g, '').trim()
  }

  // Cleanup
  destroy() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
    }

    for (const connection of this.connections.values()) {
      connection.ws.close()
    }

    this.connections.clear()
    this.rooms.clear()
  }
}

// Singleton instance
export const wsManager = new WebSocketManager()