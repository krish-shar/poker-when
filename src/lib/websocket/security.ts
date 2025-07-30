import { ZodError } from 'zod'
import { webSocketMessageSchema, chatMessageSchema } from '@/lib/validation/schemas'
import { RateLimiter } from '@/lib/security/rate-limit'
import { redis } from '@/lib/cache/redis'

export interface WebSocketAuthResult {
  isValid: boolean
  userId?: string
  sessionData?: any
  securityFlags: string[]
  permissions?: string[]
}

export interface MessageValidationResult {
  isValid: boolean
  sanitizedMessage?: any
  errors: string[]
  securityFlags?: string[]
}

export interface ConnectionSecurityConfig {
  maxConnectionsPerUser?: number
  maxConnectionsPerIP?: number
  allowedOrigins?: string[]
  requireSecureProtocol?: boolean
  connectionTimeout?: number
  heartbeatInterval?: number
}

/**
 * WebSocket Security Manager
 */
export class WebSocketSecurity {
  private static readonly DEFAULT_CONFIG: ConnectionSecurityConfig = {
    maxConnectionsPerUser: 3,
    maxConnectionsPerIP: 10,
    allowedOrigins: [],
    requireSecureProtocol: true,
    connectionTimeout: 30000, // 30 seconds
    heartbeatInterval: 30000   // 30 seconds
  }

  /**
   * Authenticate WebSocket connection
   */
  static async authenticateConnection(
    token: string,
    origin: string,
    userAgent: string,
    ip: string,
    config: ConnectionSecurityConfig = {}
  ): Promise<WebSocketAuthResult> {
    const fullConfig = { ...this.DEFAULT_CONFIG, ...config }
    const securityFlags: string[] = []

    try {
      // Basic token validation
      if (!token || token.length < 10) {
        securityFlags.push('invalid_token_format')
        return { isValid: false, securityFlags }
      }

      // TODO: Implement actual JWT/session token validation
      // For now, simulate token validation
      const session = await this.validateSessionToken(token)
      if (!session.isValid) {
        securityFlags.push('invalid_token')
        return { isValid: false, securityFlags }
      }

      // Origin validation
      if (fullConfig.allowedOrigins && fullConfig.allowedOrigins.length > 0) {
        if (!fullConfig.allowedOrigins.includes(origin)) {
          securityFlags.push('invalid_origin')
          return { isValid: false, securityFlags }
        }
      }

      // User agent validation (basic bot detection)
      if (!userAgent || userAgent.length < 10 || this.detectSuspiciousUserAgent(userAgent)) {
        securityFlags.push('suspicious_user_agent')
      }

      // Protocol validation
      if (fullConfig.requireSecureProtocol && !origin.startsWith('https://')) {
        securityFlags.push('insecure_protocol')
        return { isValid: false, securityFlags }
      }

      // Rate limit check for WebSocket connections
      const rateLimitResult = await RateLimiter.checkWebSocketRateLimit(session.userId!, {
        ip,
        userAgent,
        endpoint: 'websocket_connect'
      })

      if (!rateLimitResult.allowed) {
        securityFlags.push('connection_rate_limit')
        return { isValid: false, securityFlags }
      }

      // Check connection limits
      const connectionCheck = await this.checkConnectionLimits(session.userId!, ip, fullConfig)
      if (!connectionCheck.allowed) {
        securityFlags.push(connectionCheck.reason!)
        return { isValid: false, securityFlags }
      }

      // Check user status and permissions
      const userStatus = await this.getUserStatus(session.userId!)
      if (userStatus.isBanned || userStatus.isSuspended) {
        securityFlags.push('user_banned_or_suspended')
        return { isValid: false, securityFlags }
      }

      return {
        isValid: true,
        userId: session.userId,
        sessionData: session.data,
        securityFlags,
        permissions: userStatus.permissions
      }

    } catch (error) {
      console.error('WebSocket authentication error:', error)
      securityFlags.push('authentication_error')
      return { isValid: false, securityFlags }
    }
  }

  /**
   * Validate and sanitize WebSocket messages
   */
  static validateMessage(message: any, userId?: string): MessageValidationResult {
    const errors: string[] = []
    const securityFlags: string[] = []

    try {
      // Basic structure validation
      const validatedMessage = webSocketMessageSchema.parse(message)

      // Message-specific validation
      let sanitizedPayload = validatedMessage.payload

      switch (validatedMessage.type) {
        case 'chat_message':
          const chatResult = this.validateChatMessage(validatedMessage.payload, userId)
          if (!chatResult.isValid) {
            errors.push(...chatResult.errors)
            return { isValid: false, errors, securityFlags }
          }
          sanitizedPayload = chatResult.sanitizedPayload
          break

        case 'game_action':
          const gameResult = this.validateGameAction(validatedMessage.payload, userId)
          if (!gameResult.isValid) {
            errors.push(...gameResult.errors)
            return { isValid: false, errors, securityFlags }
          }
          sanitizedPayload = gameResult.sanitizedPayload
          break

        case 'join_room':
        case 'leave_room':
          const roomResult = this.validateRoomAction(validatedMessage.payload, userId)
          if (!roomResult.isValid) {
            errors.push(...roomResult.errors)
            return { isValid: false, errors, securityFlags }
          }
          sanitizedPayload = roomResult.sanitizedPayload
          break
      }

      // Security checks
      if (this.detectSuspiciousContent(JSON.stringify(sanitizedPayload))) {
        securityFlags.push('suspicious_content')
      }

      return {
        isValid: true,
        sanitizedMessage: {
          ...validatedMessage,
          payload: sanitizedPayload
        },
        errors: [],
        securityFlags
      }

    } catch (error) {
      if (error instanceof ZodError) {
        errors.push(...error.errors.map(e => e.message))
      } else {
        errors.push('Message validation failed')
      }
      
      return { isValid: false, errors, securityFlags }
    }
  }

  /**
   * Validate chat messages
   */
  private static validateChatMessage(payload: any, userId?: string): {
    isValid: boolean
    sanitizedPayload?: any
    errors: string[]
  } {
    const errors: string[] = []

    try {
      const validated = chatMessageSchema.parse(payload)
      
      // Sanitize text content
      const sanitizedText = this.sanitizeText(validated.text)
      
      // Check for spam patterns
      if (this.detectSpamPatterns(sanitizedText)) {
        errors.push('Message flagged as spam')
        return { isValid: false, errors }
      }

      // Check for profanity (basic implementation)
      if (this.detectProfanity(sanitizedText)) {
        errors.push('Message contains inappropriate content')
        return { isValid: false, errors }
      }

      // Check message frequency for this user
      if (userId) {
        // This would be checked via rate limiting in practice
      }

      return {
        isValid: true,
        sanitizedPayload: {
          ...validated,
          text: sanitizedText
        },
        errors: []
      }

    } catch (error) {
      errors.push('Invalid chat message format')
      return { isValid: false, errors }
    }
  }

  /**
   * Validate game actions
   */
  private static validateGameAction(payload: any, userId?: string): {
    isValid: boolean
    sanitizedPayload?: any
    errors: string[]
  } {
    const errors: string[] = []

    try {
      // Basic structure validation for game actions
      if (!payload || typeof payload !== 'object') {
        errors.push('Invalid game action payload')
        return { isValid: false, errors }
      }

      const { action, amount, sessionId, handId } = payload

      // Validate action types
      const validActions = ['fold', 'check', 'call', 'raise', 'bet', 'all_in']
      if (!validActions.includes(action)) {
        errors.push('Invalid game action type')
        return { isValid: false, errors }
      }

      // Validate amounts for betting actions
      if (['raise', 'bet', 'all_in'].includes(action)) {
        if (typeof amount !== 'number' || amount <= 0) {
          errors.push('Invalid bet amount')
          return { isValid: false, errors }
        }
      }

      // Validate session and hand IDs
      if (!sessionId || typeof sessionId !== 'string') {
        errors.push('Invalid session ID')
        return { isValid: false, errors }
      }

      return {
        isValid: true,
        sanitizedPayload: {
          action,
          amount: typeof amount === 'number' ? amount : undefined,
          sessionId,
          handId,
          timestamp: new Date().toISOString()
        },
        errors: []
      }

    } catch (error) {
      errors.push('Game action validation failed')
      return { isValid: false, errors }
    }
  }

  /**
   * Validate room actions (join/leave)
   */
  private static validateRoomAction(payload: any, userId?: string): {
    isValid: boolean
    sanitizedPayload?: any
    errors: string[]
  } {
    const errors: string[] = []

    try {
      if (!payload || typeof payload !== 'object') {
        errors.push('Invalid room action payload')
        return { isValid: false, errors }
      }

      const { roomId, roomType } = payload

      if (!roomId || typeof roomId !== 'string') {
        errors.push('Invalid room ID')
        return { isValid: false, errors }
      }

      const validRoomTypes = ['game', 'lobby', 'private']
      if (roomType && !validRoomTypes.includes(roomType)) {
        errors.push('Invalid room type')
        return { isValid: false, errors }
      }

      return {
        isValid: true,
        sanitizedPayload: {
          roomId,
          roomType: roomType || 'game'
        },
        errors: []
      }

    } catch (error) {
      errors.push('Room action validation failed')
      return { isValid: false, errors }
    }
  }

  /**
   * Sanitize text content
   */
  private static sanitizeText(text: string): string {
    return text
      // Remove HTML/script tags
      .replace(/<[^>]*>/g, '')
      // Remove potential XSS patterns
      .replace(/javascript:/gi, '')
      .replace(/on\w+=/gi, '')
      .replace(/data:/gi, '')
      // Remove excessive whitespace
      .replace(/\s+/g, ' ')
      .trim()
      // Limit length
      .substring(0, 500)
  }

  /**
   * Detect spam patterns in text
   */
  private static detectSpamPatterns(text: string): boolean {
    const spamPatterns = [
      /(.)\1{10,}/, // Repeated characters (10+)
      /^.{1,3}$/, // Too short (but this might be valid for some messages)
      /http[s]?:\/\/\S+/gi, // URLs (might want to allow some)
      /\b(SPAM|FREE|WIN|PRIZE|CLICK HERE|URGENT)\b/gi, // Common spam words
      /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/, // Credit card patterns
      /\b[A-Z]{5,}\b/g, // Excessive caps
    ]

    return spamPatterns.some(pattern => pattern.test(text))
  }

  /**
   * Basic profanity detection
   */
  private static detectProfanity(text: string): boolean {
    // This is a basic implementation - in production, use a proper profanity filter
    const profanityWords = [
      // Add profanity words here - keeping empty for example
    ]

    const lowerText = text.toLowerCase()
    return profanityWords.some(word => lowerText.includes(word))
  }

  /**
   * Detect suspicious content
   */
  private static detectSuspiciousContent(content: string): boolean {
    const suspiciousPatterns = [
      /<script/i,
      /javascript:/i,
      /on\w+=/i,
      /eval\(/i,
      /document\./i,
      /window\./i,
      /\.cookie/i,
      /localStorage/i,
      /sessionStorage/i
    ]

    return suspiciousPatterns.some(pattern => pattern.test(content))
  }

  /**
   * Detect suspicious user agents
   */
  private static detectSuspiciousUserAgent(userAgent: string): boolean {
    const suspiciousPatterns = [
      /bot/i,
      /crawler/i,
      /spider/i,
      /scraper/i,
      /curl/i,
      /wget/i,
      /python/i,
      /^$/
    ]

    return suspiciousPatterns.some(pattern => pattern.test(userAgent))
  }

  /**
   * Check connection limits
   */
  private static async checkConnectionLimits(
    userId: string,
    ip: string,
    config: ConnectionSecurityConfig
  ): Promise<{ allowed: boolean; reason?: string }> {
    try {
      // Check user connection limit
      if (config.maxConnectionsPerUser) {
        const userConnections = await redis.scard(`ws_connections:user:${userId}`)
        if (userConnections >= config.maxConnectionsPerUser) {
          return { allowed: false, reason: 'max_user_connections' }
        }
      }

      // Check IP connection limit
      if (config.maxConnectionsPerIP) {
        const ipConnections = await redis.scard(`ws_connections:ip:${ip}`)
        if (ipConnections >= config.maxConnectionsPerIP) {
          return { allowed: false, reason: 'max_ip_connections' }
        }
      }

      return { allowed: true }
    } catch (error) {
      console.error('Connection limit check failed:', error)
      return { allowed: true } // Fail open
    }
  }

  /**
   * Track WebSocket connection
   */
  static async trackConnection(connectionId: string, userId: string, ip: string): Promise<void> {
    try {
      const pipeline = redis.pipeline()
      
      // Track connection by user
      pipeline.sadd(`ws_connections:user:${userId}`, connectionId)
      pipeline.expire(`ws_connections:user:${userId}`, 3600) // 1 hour expiry
      
      // Track connection by IP
      pipeline.sadd(`ws_connections:ip:${ip}`, connectionId)
      pipeline.expire(`ws_connections:ip:${ip}`, 3600) // 1 hour expiry
      
      // Store connection metadata
      pipeline.hset(`ws_connection:${connectionId}`, {
        userId,
        ip,
        connectedAt: Date.now(),
        lastActivity: Date.now()
      })
      pipeline.expire(`ws_connection:${connectionId}`, 3600)
      
      await pipeline.exec()
    } catch (error) {
      console.error('Failed to track WebSocket connection:', error)
    }
  }

  /**
   * Remove connection tracking
   */
  static async removeConnectionTracking(connectionId: string): Promise<void> {
    try {
      // Get connection metadata
      const connectionData = await redis.hgetall(`ws_connection:${connectionId}`)
      
      if (connectionData.userId && connectionData.ip) {
        const pipeline = redis.pipeline()
        
        // Remove from user connections
        pipeline.srem(`ws_connections:user:${connectionData.userId}`, connectionId)
        
        // Remove from IP connections
        pipeline.srem(`ws_connections:ip:${connectionData.ip}`, connectionId)
        
        // Remove connection metadata
        pipeline.del(`ws_connection:${connectionId}`)
        
        await pipeline.exec()
      }
    } catch (error) {
      console.error('Failed to remove WebSocket connection tracking:', error)
    }
  }

  /**
   * Update connection activity
   */
  static async updateConnectionActivity(connectionId: string): Promise<void> {
    try {
      await redis.hset(`ws_connection:${connectionId}`, 'lastActivity', Date.now())
    } catch (error) {
      console.error('Failed to update connection activity:', error)
    }
  }

  /**
   * Get user status and permissions
   */
  private static async getUserStatus(userId: string): Promise<{
    isBanned: boolean
    isSuspended: boolean
    permissions: string[]
  }> {
    try {
      // TODO: Implement actual user status lookup
      // For now, return default status
      return {
        isBanned: false,
        isSuspended: false,
        permissions: ['basic_user']
      }
    } catch (error) {
      console.error('Failed to get user status:', error)
      return {
        isBanned: false,
        isSuspended: false,
        permissions: []
      }
    }
  }

  /**
   * Validate session token
   */
  private static async validateSessionToken(token: string): Promise<{
    isValid: boolean
    userId?: string
    data?: any
  }> {
    try {
      // TODO: Implement actual JWT/session validation
      // For now, simulate token validation
      
      if (token.startsWith('valid_')) {
        return {
          isValid: true,
          userId: token.replace('valid_', ''),
          data: { role: 'user' }
        }
      }
      
      return { isValid: false }
    } catch (error) {
      console.error('Token validation failed:', error)
      return { isValid: false }
    }
  }

  /**
   * Get connection statistics
   */
  static async getConnectionStats(): Promise<{
    totalConnections: number
    connectionsByUser: Record<string, number>
    connectionsByIP: Record<string, number>
  }> {
    try {
      // This would be more complex in a real implementation
      // For now, return basic stats structure
      return {
        totalConnections: 0,
        connectionsByUser: {},
        connectionsByIP: {}
      }
    } catch (error) {
      console.error('Failed to get connection stats:', error)
      return {
        totalConnections: 0,
        connectionsByUser: {},
        connectionsByIP: {}
      }
    }
  }

  /**
   * Clean up stale connections
   */
  static async cleanupStaleConnections(maxIdleTime: number = 300000): Promise<number> {
    try {
      const pattern = 'ws_connection:*'
      const keys = await redis.keys(pattern)
      let cleanedCount = 0
      
      for (const key of keys) {
        const connectionData = await redis.hgetall(key)
        const lastActivity = parseInt(connectionData.lastActivity || '0', 10)
        
        if (Date.now() - lastActivity > maxIdleTime) {
          const connectionId = key.replace('ws_connection:', '')
          await this.removeConnectionTracking(connectionId)
          cleanedCount++
        }
      }
      
      return cleanedCount
    } catch (error) {
      console.error('Failed to cleanup stale connections:', error)
      return 0
    }
  }
}

/**
 * Connection Security Manager for monitoring and enforcement
 */
export class ConnectionSecurityManager {
  private suspiciousConnections = new Map<string, number>()
  private readonly MAX_VIOLATIONS = 10
  private readonly VIOLATION_WINDOW = 300000 // 5 minutes
  
  /**
   * Monitor connection for suspicious activity
   */
  async monitorConnection(connectionId: string, userId: string, event: string, data?: any): Promise<void> {
    const key = `${userId}:${event}`
    const count = this.suspiciousConnections.get(key) || 0
    
    // Define suspicious thresholds
    const thresholds: Record<string, number> = {
      rapid_reconnect: 5,
      message_flood: 100,
      invalid_action: 10,
      rate_limit_violation: 3,
      suspicious_content: 5
    }

    if (count >= (thresholds[event] || 10)) {
      await this.handleSuspiciousActivity(userId, event, count, data)
    }

    this.suspiciousConnections.set(key, count + 1)
    
    // Clean up old entries
    setTimeout(() => {
      this.suspiciousConnections.delete(key)
    }, this.VIOLATION_WINDOW)
  }

  /**
   * Handle suspicious activity
   */
  private async handleSuspiciousActivity(
    userId: string,
    event: string,
    count: number,
    data?: any
  ): Promise<void> {
    console.warn(`Suspicious activity detected: ${userId} - ${event} (${count} times)`)
    
    // Progressive penalties
    if (count >= 20) {
      await this.temporarilyBanUser(userId, 3600) // 1 hour
    } else if (count >= 15) {
      await this.applyStrictRateLimit(userId, 1800) // 30 minutes
    } else if (count >= 10) {
      await this.issueWarning(userId, event)
    }
    
    // Log for security monitoring
    await this.logSecurityEvent({
      userId,
      event: 'suspicious_activity',
      type: event,
      count,
      data,
      timestamp: new Date().toISOString(),
      severity: count >= 20 ? 'high' : count >= 10 ? 'medium' : 'low'
    })
  }

  /**
   * Temporarily ban user
   */
  private async temporarilyBanUser(userId: string, durationSeconds: number): Promise<void> {
    const key = `banned:${userId}`
    await redis.setex(key, durationSeconds, JSON.stringify({
      reason: 'suspicious_activity',
      bannedAt: Date.now(),
      duration: durationSeconds
    }))
  }

  /**
   * Apply strict rate limiting
   */
  private async applyStrictRateLimit(userId: string, durationSeconds: number): Promise<void> {
    const key = `strict_limit:${userId}`
    await redis.setex(key, durationSeconds, JSON.stringify({
      reason: 'suspicious_activity',
      appliedAt: Date.now(),
      duration: durationSeconds
    }))
  }

  /**
   * Issue warning to user
   */
  private async issueWarning(userId: string, event: string): Promise<void> {
    const key = `warning:${userId}:${event}`
    await redis.setex(key, 24 * 60 * 60, JSON.stringify({
      event,
      warnedAt: Date.now(),
      reason: 'suspicious_activity'
    }))
  }

  /**
   * Log security event
   */
  private async logSecurityEvent(event: any): Promise<void> {
    try {
      const logKey = `security_events:${new Date().toISOString().split('T')[0]}`
      await redis.lpush(logKey, JSON.stringify(event))
      await redis.expire(logKey, 30 * 24 * 60 * 60) // Keep for 30 days
    } catch (error) {
      console.error('Failed to log security event:', error)
    }
  }
}