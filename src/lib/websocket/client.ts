"use client"

import { GameMessage } from './server'

export type WebSocketStatus = 'connecting' | 'connected' | 'disconnected' | 'error'

export interface WebSocketClientOptions {
  url?: string
  token?: string
  reconnectInterval?: number
  maxReconnectAttempts?: number
  pingInterval?: number
}

export type MessageHandler = (message: GameMessage) => void
export type StatusHandler = (status: WebSocketStatus) => void

export class WebSocketClient {
  private ws: WebSocket | null = null
  private url: string
  private token: string | null
  private reconnectInterval: number
  private maxReconnectAttempts: number
  private pingInterval: number
  private reconnectAttempts = 0
  private isManuallyDisconnected = false
  private reconnectTimer: NodeJS.Timeout | null = null
  private pingTimer: NodeJS.Timeout | null = null

  private messageHandlers = new Set<MessageHandler>()
  private statusHandlers = new Set<StatusHandler>()
  private status: WebSocketStatus = 'disconnected'

  constructor(options: WebSocketClientOptions = {}) {
    this.url = options.url || this.getDefaultWebSocketUrl()
    this.token = options.token || null
    this.reconnectInterval = options.reconnectInterval || 5000
    this.maxReconnectAttempts = options.maxReconnectAttempts || 10
    this.pingInterval = options.pingInterval || 30000
  }

  private getDefaultWebSocketUrl(): string {
    if (typeof window === 'undefined') return ''
    
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const host = window.location.host
    
    // For development, use a separate WebSocket port
    if (process.env.NODE_ENV === 'development') {
      return `${protocol}//${host.split(':')[0]}:8080`
    }
    
    // For production, this would typically be an external WebSocket service
    return `${protocol}//${host}/api/websocket`
  }

  connect(token?: string) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      return
    }

    if (token) {
      this.token = token
    }

    this.isManuallyDisconnected = false
    this.setStatus('connecting')

    try {
      const wsUrl = new URL(this.url)
      if (this.token) {
        wsUrl.searchParams.set('token', this.token)
      }

      this.ws = new WebSocket(wsUrl.toString())
      this.setupEventHandlers()
      
    } catch (error) {
      console.error('WebSocket connection error:', error)
      this.setStatus('error')
      this.scheduleReconnect()
    }
  }

  disconnect() {
    this.isManuallyDisconnected = true
    this.clearTimers()
    
    if (this.ws) {
      this.ws.close(1000, 'Manual disconnect')
    }
    
    this.setStatus('disconnected')
  }

  send(message: Omit<GameMessage, 'timestamp'>) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      const fullMessage: GameMessage = {
        ...message,
        timestamp: new Date().toISOString()
      }
      this.ws.send(JSON.stringify(fullMessage))
    } else {
      console.warn('WebSocket is not connected')
    }
  }

  // Convenience methods for common message types
  joinRoom(roomId: string, roomType: 'session' | 'lobby' = 'session') {
    this.send({
      type: 'join_room',
      payload: { roomId, roomType }
    })
  }

  leaveRoom(roomId: string) {
    this.send({
      type: 'leave_room',
      payload: { roomId }
    })
  }

  sendGameAction(action: any) {
    this.send({
      type: 'game_action',
      payload: action
    })
  }

  sendChatMessage(text: string, type: 'public' | 'private' = 'public') {
    this.send({
      type: 'chat_message',
      payload: { text, type }
    })
  }

  ping() {
    this.send({
      type: 'ping',
      payload: {}
    })
  }

  // Event handlers
  onMessage(handler: MessageHandler) {
    this.messageHandlers.add(handler)
    return () => this.messageHandlers.delete(handler)
  }

  onStatusChange(handler: StatusHandler) {
    this.statusHandlers.add(handler)
    return () => this.statusHandlers.delete(handler)
  }

  getStatus(): WebSocketStatus {
    return this.status
  }

  isConnected(): boolean {
    return this.status === 'connected'
  }

  private setupEventHandlers() {
    if (!this.ws) return

    this.ws.onopen = () => {
      this.setStatus('connected')
      this.reconnectAttempts = 0
      this.startPing()
      console.log('WebSocket connected')
    }

    this.ws.onmessage = (event) => {
      try {
        const message: GameMessage = JSON.parse(event.data)
        this.handleMessage(message)
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error)
      }
    }

    this.ws.onclose = (event) => {
      this.clearTimers()
      
      if (!this.isManuallyDisconnected) {
        this.setStatus('disconnected')
        console.log(`WebSocket closed: ${event.code} - ${event.reason}`)
        this.scheduleReconnect()
      }
    }

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error)
      this.setStatus('error')
    }
  }

  private handleMessage(message: GameMessage) {
    // Handle internal message types
    switch (message.type) {
      case 'pong':
        // Handle pong response
        break
      case 'connection_established':
        console.log('WebSocket connection established:', message.payload)
        break
      case 'error':
        console.error('WebSocket server error:', message.payload)
        break
      default:
        // Forward to message handlers
        this.messageHandlers.forEach(handler => {
          try {
            handler(message)
          } catch (error) {
            console.error('Message handler error:', error)
          }
        })
        break
    }
  }

  private setStatus(status: WebSocketStatus) {
    if (this.status !== status) {
      this.status = status
      this.statusHandlers.forEach(handler => {
        try {
          handler(status)
        } catch (error) {
          console.error('Status handler error:', error)
        }
      })
    }
  }

  private scheduleReconnect() {
    if (this.isManuallyDisconnected || this.reconnectAttempts >= this.maxReconnectAttempts) {
      return
    }

    const delay = Math.min(
      this.reconnectInterval * Math.pow(2, this.reconnectAttempts),
      30000 // Max 30 seconds
    )

    this.reconnectTimer = setTimeout(() => {
      this.reconnectAttempts++
      console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`)
      this.connect()
    }, delay)
  }

  private startPing() {
    this.pingTimer = setInterval(() => {
      this.ping()
    }, this.pingInterval)
  }

  private clearTimers() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
    
    if (this.pingTimer) {
      clearInterval(this.pingTimer)
      this.pingTimer = null
    }
  }

  destroy() {
    this.disconnect()
    this.messageHandlers.clear()
    this.statusHandlers.clear()
  }
}

// React hook for WebSocket connection
import { useEffect, useRef, useState, useCallback } from 'react'

export interface UseWebSocketOptions extends WebSocketClientOptions {
  autoConnect?: boolean
}

export function useWebSocket(options: UseWebSocketOptions = {}) {
  const [status, setStatus] = useState<WebSocketStatus>('disconnected')
  const [lastMessage, setLastMessage] = useState<GameMessage | null>(null)
  const clientRef = useRef<WebSocketClient | null>(null)

  const { autoConnect = true, ...clientOptions } = options

  useEffect(() => {
    clientRef.current = new WebSocketClient(clientOptions)

    const unsubscribeStatus = clientRef.current.onStatusChange(setStatus)
    const unsubscribeMessage = clientRef.current.onMessage(setLastMessage)

    if (autoConnect) {
      clientRef.current.connect()
    }

    return () => {
      unsubscribeStatus()
      unsubscribeMessage()
      clientRef.current?.destroy()
    }
  }, [])

  const connect = useCallback((token?: string) => {
    clientRef.current?.connect(token)
  }, [])

  const disconnect = useCallback(() => {
    clientRef.current?.disconnect()
  }, [])

  const send = useCallback((message: Omit<GameMessage, 'timestamp'>) => {
    clientRef.current?.send(message)
  }, [])

  const joinRoom = useCallback((roomId: string, roomType: 'session' | 'lobby' = 'session') => {
    clientRef.current?.joinRoom(roomId, roomType)
  }, [])

  const leaveRoom = useCallback((roomId: string) => {
    clientRef.current?.leaveRoom(roomId)
  }, [])

  const sendGameAction = useCallback((action: any) => {
    clientRef.current?.sendGameAction(action)
  }, [])

  const sendChatMessage = useCallback((text: string, type: 'public' | 'private' = 'public') => {
    clientRef.current?.sendChatMessage(text, type)
  }, [])

  const onMessage = useCallback((handler: MessageHandler) => {
    return clientRef.current?.onMessage(handler) || (() => {})
  }, [])

  return {
    status,
    lastMessage,
    isConnected: status === 'connected',
    connect,
    disconnect,
    send,
    joinRoom,
    leaveRoom,
    sendGameAction,
    sendChatMessage,
    onMessage,
    client: clientRef.current
  }
}