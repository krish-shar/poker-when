import { redis } from '@/lib/cache/redis'

export interface RateLimitConfig {
  windowMs: number    // Time window in milliseconds
  maxRequests: number // Max requests per window
  keyGenerator?: (identifier: string) => string
  skipSuccessfulRequests?: boolean
  skipFailedRequests?: boolean
  message?: string
  headers?: boolean
}

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetTime: Date
  retryAfter?: number
  limit: number
}

/**
 * Redis-based sliding window rate limiter
 */
export class RateLimiter {
  private static readonly DEFAULT_CONFIG: Partial<RateLimitConfig> = {
    keyGenerator: (identifier: string) => `rate_limit:${identifier}`,
    skipSuccessfulRequests: false,
    skipFailedRequests: false,
    message: 'Too many requests',
    headers: true
  }

  /**
   * Check rate limit using sliding window algorithm
   */
  static async checkRateLimit(
    identifier: string,
    config: RateLimitConfig
  ): Promise<RateLimitResult> {
    const fullConfig = { ...this.DEFAULT_CONFIG, ...config }
    const key = fullConfig.keyGenerator!(identifier)
    const now = Date.now()
    const windowStart = now - config.windowMs

    try {
      // Use Redis pipeline for atomic operations
      const pipeline = redis.pipeline()
      
      // Remove expired entries (older than window)
      pipeline.zremrangebyscore(key, 0, windowStart)
      
      // Count current requests in window
      pipeline.zcard(key)
      
      // Add current request timestamp
      const requestId = `${now}-${Math.random().toString(36).substr(2, 9)}`
      pipeline.zadd(key, now, requestId)
      
      // Set expiration for cleanup
      pipeline.expire(key, Math.ceil(config.windowMs / 1000))
      
      const results = await pipeline.exec()
      
      if (!results) {
        throw new Error('Redis pipeline failed')
      }

      const currentCount = (results[1][1] as number) || 0

      if (currentCount >= config.maxRequests) {
        // Remove the request we just added since it's not allowed
        await redis.zrem(key, requestId)
        
        return {
          allowed: false,
          remaining: 0,
          resetTime: new Date(now + config.windowMs),
          retryAfter: Math.ceil(config.windowMs / 1000),
          limit: config.maxRequests
        }
      }

      return {
        allowed: true,
        remaining: Math.max(0, config.maxRequests - currentCount - 1),
        resetTime: new Date(now + config.windowMs),
        limit: config.maxRequests
      }

    } catch (error) {
      console.error('Rate limit check failed:', error)
      
      // Fail open for availability (but log the error)
      return {
        allowed: true,
        remaining: config.maxRequests - 1,
        resetTime: new Date(now + config.windowMs),
        limit: config.maxRequests
      }
    }
  }

  /**
   * Check rate limit with request tracking
   */
  static async checkWithTracking(
    identifier: string,
    config: RateLimitConfig,
    trackingData?: {
      success?: boolean
      endpoint?: string
      userAgent?: string
      ip?: string
    }
  ): Promise<RateLimitResult> {
    const result = await this.checkRateLimit(identifier, config)
    
    // Log rate limit events for monitoring
    if (!result.allowed) {
      await this.logRateLimitEvent({
        identifier,
        type: 'rate_limit_exceeded',
        limit: config.maxRequests,
        window: config.windowMs,
        ...trackingData,
        timestamp: new Date().toISOString()
      })
    }
    
    return result
  }

  /**
   * Specific rate limiters for different operations
   */
  static async checkAuthRateLimit(identifier: string, trackingData?: any): Promise<RateLimitResult> {
    return this.checkWithTracking(identifier, {
      windowMs: 15 * 60 * 1000, // 15 minutes
      maxRequests: 5,
      keyGenerator: (id) => `auth:${id}`,
      message: 'Too many authentication attempts'
    }, { ...trackingData, endpoint: 'auth' })
  }

  static async checkAPIRateLimit(identifier: string, trackingData?: any): Promise<RateLimitResult> {
    return this.checkWithTracking(identifier, {
      windowMs: 60 * 1000, // 1 minute
      maxRequests: 100,
      keyGenerator: (id) => `api:${id}`,
      message: 'API rate limit exceeded'
    }, { ...trackingData, endpoint: 'api' })
  }

  static async checkWebSocketRateLimit(identifier: string, trackingData?: any): Promise<RateLimitResult> {
    return this.checkWithTracking(identifier, {
      windowMs: 60 * 1000, // 1 minute
      maxRequests: 300,
      keyGenerator: (id) => `ws:${id}`,
      message: 'WebSocket rate limit exceeded'
    }, { ...trackingData, endpoint: 'websocket' })
  }

  static async checkChatRateLimit(identifier: string, trackingData?: any): Promise<RateLimitResult> {
    return this.checkWithTracking(identifier, {
      windowMs: 60 * 1000, // 1 minute
      maxRequests: 10,
      keyGenerator: (id) => `chat:${id}`,
      skipFailedRequests: true,
      message: 'Chat rate limit exceeded'
    }, { ...trackingData, endpoint: 'chat' })
  }

  static async checkGameActionRateLimit(identifier: string, trackingData?: any): Promise<RateLimitResult> {
    return this.checkWithTracking(identifier, {
      windowMs: 1000, // 1 second
      maxRequests: 5, // Max 5 actions per second
      keyGenerator: (id) => `game_action:${id}`,
      message: 'Game action rate limit exceeded'
    }, { ...trackingData, endpoint: 'game_action' })
  }

  static async checkRegistrationRateLimit(identifier: string, trackingData?: any): Promise<RateLimitResult> {
    return this.checkWithTracking(identifier, {
      windowMs: 60 * 60 * 1000, // 1 hour
      maxRequests: 3, // Max 3 registrations per hour per IP
      keyGenerator: (id) => `registration:${id}`,
      message: 'Registration rate limit exceeded'
    }, { ...trackingData, endpoint: 'registration' })
  }

  /**
   * Burst protection - very short window, high frequency detection
   */
  static async checkBurstProtection(identifier: string): Promise<RateLimitResult> {
    return this.checkRateLimit(identifier, {
      windowMs: 1000, // 1 second
      maxRequests: 10, // Max 10 requests per second
      keyGenerator: (id) => `burst:${id}`,
      message: 'Request burst detected'
    })
  }

  /**
   * Progressive rate limiting based on past violations
   */
  static async checkProgressiveRateLimit(
    identifier: string,
    baseConfig: RateLimitConfig
  ): Promise<RateLimitResult> {
    const violationKey = `violations:${identifier}`
    const violationCount = await redis.get(violationKey) || '0'
    const violations = parseInt(violationCount, 10)
    
    // Increase restrictions based on violation history
    const multiplier = Math.min(1 + violations * 0.5, 5) // Cap at 5x restriction
    const adjustedConfig = {
      ...baseConfig,
      maxRequests: Math.max(1, Math.floor(baseConfig.maxRequests / multiplier)),
      windowMs: baseConfig.windowMs * multiplier
    }
    
    const result = await this.checkRateLimit(identifier, adjustedConfig)
    
    // Track violations
    if (!result.allowed) {
      await redis.setex(violationKey, 24 * 60 * 60, violations + 1) // 24 hour violation memory
    }
    
    return result
  }

  /**
   * Whitelist-based rate limiting
   */
  static async checkWithWhitelist(
    identifier: string,
    config: RateLimitConfig,
    whitelist: string[] = []
  ): Promise<RateLimitResult> {
    // Check if identifier is whitelisted
    if (whitelist.includes(identifier)) {
      return {
        allowed: true,
        remaining: config.maxRequests,
        resetTime: new Date(Date.now() + config.windowMs),
        limit: config.maxRequests
      }
    }
    
    return this.checkRateLimit(identifier, config)
  }

  /**
   * Distributed rate limiting across multiple instances
   */
  static async checkDistributedRateLimit(
    identifier: string,
    config: RateLimitConfig,
    instanceId: string = 'default'
  ): Promise<RateLimitResult> {
    const distributedKey = `${config.keyGenerator?.(identifier) || identifier}:${instanceId}`
    
    return this.checkRateLimit(identifier, {
      ...config,
      keyGenerator: () => distributedKey
    })
  }

  /**
   * Rate limit with custom cost per request (weighted rate limiting)
   */
  static async checkWeightedRateLimit(
    identifier: string,
    config: RateLimitConfig,
    weight: number = 1
  ): Promise<RateLimitResult> {
    const key = config.keyGenerator?.(identifier) || `rate_limit:${identifier}`
    const now = Date.now()
    const windowStart = now - config.windowMs

    try {
      const pipeline = redis.pipeline()
      
      // Remove expired entries
      pipeline.zremrangebyscore(key, 0, windowStart)
      
      // Sum current weights in window
      pipeline.eval(`
        local key = KEYS[1]
        local members = redis.call('ZRANGE', key, 0, -1, 'WITHSCORES')
        local total = 0
        for i = 1, #members, 2 do
          total = total + members[i+1]
        end
        return total
      `, 1, key)
      
      // Add current request with weight
      pipeline.zadd(key, weight, `${now}-${Math.random().toString(36).substr(2, 9)}`)
      
      // Set expiration
      pipeline.expire(key, Math.ceil(config.windowMs / 1000))
      
      const results = await pipeline.exec()
      const currentWeight = (results?.[1]?.[1] as number) || 0

      if (currentWeight + weight > config.maxRequests) {
        return {
          allowed: false,
          remaining: 0,
          resetTime: new Date(now + config.windowMs),
          retryAfter: Math.ceil(config.windowMs / 1000),
          limit: config.maxRequests
        }
      }

      return {
        allowed: true,
        remaining: Math.max(0, config.maxRequests - currentWeight - weight),
        resetTime: new Date(now + config.windowMs),
        limit: config.maxRequests
      }

    } catch (error) {
      console.error('Weighted rate limit check failed:', error)
      return {
        allowed: true,
        remaining: config.maxRequests - weight,
        resetTime: new Date(now + config.windowMs),
        limit: config.maxRequests
      }
    }
  }

  /**
   * Reset rate limit for an identifier (admin function)
   */
  static async resetRateLimit(identifier: string, keyPrefix?: string): Promise<boolean> {
    try {
      const pattern = keyPrefix ? `${keyPrefix}:${identifier}` : `*:${identifier}`
      const keys = await redis.keys(pattern)
      
      if (keys.length > 0) {
        await redis.del(...keys)
      }
      
      return true
    } catch (error) {
      console.error('Rate limit reset failed:', error)
      return false
    }
  }

  /**
   * Get current rate limit status without consuming a request
   */
  static async getCurrentStatus(
    identifier: string,
    config: RateLimitConfig
  ): Promise<RateLimitResult> {
    const key = config.keyGenerator?.(identifier) || `rate_limit:${identifier}`
    const now = Date.now()
    const windowStart = now - config.windowMs

    try {
      // Clean expired entries and count current
      await redis.zremrangebyscore(key, 0, windowStart)
      const currentCount = await redis.zcard(key)

      return {
        allowed: currentCount < config.maxRequests,
        remaining: Math.max(0, config.maxRequests - currentCount),
        resetTime: new Date(now + config.windowMs),
        limit: config.maxRequests
      }
    } catch (error) {
      console.error('Rate limit status check failed:', error)
      return {
        allowed: true,
        remaining: config.maxRequests,
        resetTime: new Date(now + config.windowMs),
        limit: config.maxRequests
      }
    }
  }

  /**
   * Log rate limit events for monitoring and analysis
   */
  private static async logRateLimitEvent(event: any): Promise<void> {
    try {
      const logKey = `rate_limit_logs:${new Date().toISOString().split('T')[0]}`
      await redis.lpush(logKey, JSON.stringify(event))
      await redis.expire(logKey, 7 * 24 * 60 * 60) // Keep logs for 7 days
    } catch (error) {
      console.error('Failed to log rate limit event:', error)
    }
  }

  /**
   * Get rate limit statistics for monitoring
   */
  static async getStatistics(date?: string): Promise<any> {
    try {
      const targetDate = date || new Date().toISOString().split('T')[0]
      const logKey = `rate_limit_logs:${targetDate}`
      const logs = await redis.lrange(logKey, 0, -1)
      
      const events = logs.map(log => JSON.parse(log))
      
      // Aggregate statistics
      const stats = {
        totalEvents: events.length,
        byEndpoint: {} as Record<string, number>,
        byIdentifier: {} as Record<string, number>,
        timeDistribution: {} as Record<string, number>
      }
      
      events.forEach(event => {
        // Count by endpoint
        const endpoint = event.endpoint || 'unknown'
        stats.byEndpoint[endpoint] = (stats.byEndpoint[endpoint] || 0) + 1
        
        // Count by identifier
        const identifier = event.identifier || 'unknown'
        stats.byIdentifier[identifier] = (stats.byIdentifier[identifier] || 0) + 1
        
        // Count by hour
        const hour = event.timestamp ? new Date(event.timestamp).getHours() : 0
        stats.timeDistribution[hour] = (stats.timeDistribution[hour] || 0) + 1
      })
      
      return stats
    } catch (error) {
      console.error('Failed to get rate limit statistics:', error)
      return null
    }
  }
}

/**
 * Express-style middleware for rate limiting
 */
export function createRateLimitMiddleware(config: RateLimitConfig) {
  return async (request: any, response?: any, next?: any) => {
    const identifier = request.ip || request.headers['x-forwarded-for'] || 'unknown'
    
    try {
      const result = await RateLimiter.checkRateLimit(identifier, config)
      
      if (config.headers && response) {
        response.setHeader('X-RateLimit-Limit', result.limit)
        response.setHeader('X-RateLimit-Remaining', result.remaining)
        response.setHeader('X-RateLimit-Reset', Math.ceil(result.resetTime.getTime() / 1000))
      }
      
      if (!result.allowed) {
        if (response) {
          if (config.headers) {
            response.setHeader('Retry-After', result.retryAfter || 60)
          }
          return response.status(429).json({
            error: config.message || 'Too many requests',
            retryAfter: result.retryAfter
          })
        }
        
        // For Next.js API routes
        throw new Error('Rate limit exceeded')
      }
      
      if (next) next()
    } catch (error) {
      if (next) next(error)
      else throw error
    }
  }
}