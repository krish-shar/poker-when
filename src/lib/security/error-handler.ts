import { ZodError } from 'zod'
import { redis } from '@/lib/cache/redis'

export interface ErrorContext {
  userId?: string
  sessionId?: string
  ip?: string
  userAgent?: string
  url?: string
  method?: string
  timestamp?: string
  requestId?: string
  severity?: 'low' | 'medium' | 'high' | 'critical'
  component?: string
  stackTrace?: string
  additionalData?: Record<string, any>
}

export interface SanitizedError {
  message: string
  code?: string
  details?: any
  timestamp: string
  requestId: string
}

export interface SecurityEvent {
  type: 'authentication_failure' | 'authorization_failure' | 'suspicious_activity' | 
        'rate_limit_exceeded' | 'validation_error' | 'system_error' | 'security_violation'
  userId?: string
  ip?: string
  userAgent?: string
  details?: any
  severity: 'low' | 'medium' | 'high' | 'critical'
  timestamp: string
  component?: string
  action?: string
}

/**
 * Comprehensive error handling and security logging system
 */
export class SecurityErrorHandler {
  private static readonly PRODUCTION = process.env.NODE_ENV === 'production'
  private static readonly LOG_LEVELS = ['error', 'warn', 'info', 'debug'] as const
  private static readonly CURRENT_LOG_LEVEL = (process.env.LOG_LEVEL as typeof this.LOG_LEVELS[number]) || 'info'

  /**
   * Sanitize errors before sending to client
   */
  static sanitizeError(error: any, context: ErrorContext = {}): SanitizedError {
    const requestId = context.requestId || this.generateRequestId()
    const timestamp = new Date().toISOString()

    // Log the full error internally
    this.logError(error, { ...context, requestId, timestamp })

    if (this.PRODUCTION) {
      return this.sanitizeForProduction(error, requestId, timestamp)
    } else {
      return this.sanitizeForDevelopment(error, requestId, timestamp)
    }
  }

  /**
   * Production error sanitization - minimal information exposure
   */
  private static sanitizeForProduction(error: any, requestId: string, timestamp: string): SanitizedError {
    const errorType = error?.constructor?.name || 'Error'
    
    const genericMessages: Record<string, string> = {
      ValidationError: 'Invalid input provided',
      ZodError: 'Invalid input provided',
      AuthenticationError: 'Authentication failed',
      AuthorizationError: 'Access denied',
      RateLimitError: 'Too many requests',
      DatabaseError: 'Service temporarily unavailable',
      NetworkError: 'Connection error',
      TimeoutError: 'Request timeout',
      FileNotFoundError: 'Resource not found',
      PermissionError: 'Insufficient permissions',
      PaymentError: 'Payment processing failed',
      GameError: 'Game operation failed',
      SessionError: 'Session error occurred',
      WebSocketError: 'Connection error'
    }

    // Special handling for validation errors
    if (error instanceof ZodError) {
      return {
        message: 'Invalid input provided',
        code: 'VALIDATION_ERROR',
        details: error.errors.map(e => ({
          field: e.path.join('.'),
          message: this.sanitizeValidationMessage(e.message)
        })),
        timestamp,
        requestId
      }
    }

    return {
      message: genericMessages[errorType] || 'An error occurred',
      code: error.code || 'GENERIC_ERROR',
      timestamp,
      requestId
    }
  }

  /**
   * Development error sanitization - more detailed information
   */
  private static sanitizeForDevelopment(error: any, requestId: string, timestamp: string): SanitizedError {
    if (error instanceof ZodError) {
      return {
        message: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: error.errors,
        timestamp,
        requestId
      }
    }

    return {
      message: error.message || 'An error occurred',
      code: error.code || 'GENERIC_ERROR',
      details: {
        name: error.name,
        stack: error.stack?.split('\n').slice(0, 10) // Limit stack trace
      },
      timestamp,
      requestId
    }
  }

  /**
   * Sanitize validation error messages
   */
  private static sanitizeValidationMessage(message: string): string {
    // Remove potentially sensitive information from validation messages
    return message
      .replace(/\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g, '[REDACTED]') // Credit cards
      .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '[EMAIL]') // Emails
      .replace(/\b\d{3}[\s-]?\d{2}[\s-]?\d{4}\b/g, '[SSN]') // SSNs
      .replace(/password/gi, '[PASSWORD]') // Password references
  }

  /**
   * Log security events with different severity levels
   */
  static async logSecurityEvent(event: SecurityEvent): Promise<void> {
    const eventWithId = {
      ...event,
      id: this.generateRequestId(),
      timestamp: event.timestamp || new Date().toISOString()
    }

    // Console logging with appropriate level
    this.logToConsole(event.severity, 'SECURITY_EVENT', eventWithId)

    // Store in Redis for analysis
    try {
      const logKey = `security_events:${new Date().toISOString().split('T')[0]}`
      await redis.lpush(logKey, JSON.stringify(eventWithId))
      await redis.expire(logKey, 30 * 24 * 60 * 60) // Keep for 30 days
      
      // Also store in severity-specific logs for faster querying
      const severityKey = `security_events:${event.severity}:${new Date().toISOString().split('T')[0]}`
      await redis.lpush(severityKey, JSON.stringify(eventWithId))
      await redis.expire(severityKey, 30 * 24 * 60 * 60)
    } catch (error) {
      console.error('Failed to log security event to Redis:', error)
    }

    // Alert on critical events
    if (event.severity === 'critical') {
      await this.alertSecurityTeam(eventWithId)
    }

    // Track patterns for automatic threat detection
    await this.trackSecurityPatterns(eventWithId)
  }

  /**
   * Log general errors
   */
  private static logError(error: any, context: ErrorContext): void {
    const logEntry = {
      level: 'error',
      message: error.message || 'Unknown error',
      error: {
        name: error.name || 'Error',
        stack: error.stack,
        code: error.code
      },
      context,
      timestamp: context.timestamp || new Date().toISOString()
    }

    this.logToConsole('error', 'APPLICATION_ERROR', logEntry)

    // Store error logs in Redis
    this.storeErrorLog(logEntry)
  }

  /**
   * Console logging with level checking
   */
  private static logToConsole(level: string, prefix: string, data: any): void {
    const levelIndex = this.LOG_LEVELS.indexOf(level as any)
    const currentLevelIndex = this.LOG_LEVELS.indexOf(this.CURRENT_LOG_LEVEL)

    if (levelIndex <= currentLevelIndex) {
      const timestamp = new Date().toISOString()
      const logMessage = `[${timestamp}] [${level.toUpperCase()}] [${prefix}]`
      
      switch (level) {
        case 'error':
          console.error(logMessage, data)
          break
        case 'warn':
          console.warn(logMessage, data)
          break
        case 'info':
          console.info(logMessage, data)
          break
        case 'debug':
          console.debug(logMessage, data)
          break
        default:
          console.log(logMessage, data)
      }
    }
  }

  /**
   * Store error logs in Redis
   */
  private static async storeErrorLog(logEntry: any): Promise<void> {
    try {
      const logKey = `error_logs:${new Date().toISOString().split('T')[0]}`
      await redis.lpush(logKey, JSON.stringify(logEntry))
      await redis.expire(logKey, 7 * 24 * 60 * 60) // Keep for 7 days
    } catch (error) {
      console.error('Failed to store error log:', error)
    }
  }

  /**
   * Alert security team on critical events
   */
  private static async alertSecurityTeam(event: any): Promise<void> {
    console.error('🚨 CRITICAL SECURITY EVENT 🚨', event)
    
    // TODO: Implement actual alerting mechanism
    // - Send email notifications
    // - Post to Slack/Discord
    // - Create incident in monitoring system
    
    // For now, just log and store in high-priority queue
    try {
      await redis.lpush('critical_security_alerts', JSON.stringify({
        ...event,
        alertedAt: new Date().toISOString()
      }))
    } catch (error) {
      console.error('Failed to queue critical security alert:', error)
    }
  }

  /**
   * Track security patterns for threat detection
   */
  private static async trackSecurityPatterns(event: SecurityEvent): Promise<void> {
    try {
      const patterns = [
        `pattern:type:${event.type}`,
        `pattern:severity:${event.severity}`,
      ]

      if (event.userId) {
        patterns.push(`pattern:user:${event.userId}`)
      }

      if (event.ip) {
        patterns.push(`pattern:ip:${event.ip}`)
      }

      if (event.component) {
        patterns.push(`pattern:component:${event.component}`)
      }

      const pipeline = redis.pipeline()
      const hourKey = new Date().toISOString().substr(0, 13) // YYYY-MM-DDTHH

      patterns.forEach(pattern => {
        const key = `${pattern}:${hourKey}`
        pipeline.incr(key)
        pipeline.expire(key, 24 * 60 * 60) // Keep for 24 hours
      })

      await pipeline.exec()

      // Check for suspicious patterns
      await this.checkSuspiciousPatterns(event)
    } catch (error) {
      console.error('Failed to track security patterns:', error)
    }
  }

  /**
   * Check for suspicious patterns
   */
  private static async checkSuspiciousPatterns(event: SecurityEvent): Promise<void> {
    try {
      const hourKey = new Date().toISOString().substr(0, 13)
      
      // Check for high frequency of events
      if (event.userId) {
        const userEventCount = await redis.get(`pattern:user:${event.userId}:${hourKey}`)
        if (parseInt(userEventCount || '0', 10) > 50) {
          await this.logSecurityEvent({
            type: 'suspicious_activity',
            userId: event.userId,
            severity: 'high',
            details: {
              reason: 'high_frequency_events',
              count: userEventCount,
              originalEvent: event.type
            },
            timestamp: new Date().toISOString()
          })
        }
      }

      // Check for high frequency from IP
      if (event.ip) {
        const ipEventCount = await redis.get(`pattern:ip:${event.ip}:${hourKey}`)
        if (parseInt(ipEventCount || '0', 10) > 100) {
          await this.logSecurityEvent({
            type: 'suspicious_activity',
            ip: event.ip,
            severity: 'medium',
            details: {
              reason: 'high_frequency_ip_events',
              count: ipEventCount,
              originalEvent: event.type
            },
            timestamp: new Date().toISOString()
          })
        }
      }
    } catch (error) {
      console.error('Failed to check suspicious patterns:', error)
    }
  }

  /**
   * Generate unique request ID
   */
  private static generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Create structured error response
   */
  static createErrorResponse(error: any, context: ErrorContext = {}): Response {
    const sanitizedError = this.sanitizeError(error, context)
    
    // Determine HTTP status code
    const statusCode = this.getStatusCodeFromError(error)
    
    return new Response(JSON.stringify(sanitizedError), {
      status: statusCode,
      headers: {
        'Content-Type': 'application/json',
        'X-Request-ID': sanitizedError.requestId
      }
    })
  }

  /**
   * Get HTTP status code from error
   */
  private static getStatusCodeFromError(error: any): number {
    const errorType = error?.constructor?.name || 'Error'
    
    const statusCodes: Record<string, number> = {
      ValidationError: 400,
      ZodError: 400,
      AuthenticationError: 401,
      AuthorizationError: 403,
      PermissionError: 403,
      FileNotFoundError: 404,
      RateLimitError: 429,
      TimeoutError: 408,
      PaymentError: 402,
      DatabaseError: 503,
      NetworkError: 503
    }

    return statusCodes[errorType] || 500
  }

  /**
   * Performance monitoring
   */
  static async logPerformanceMetric(
    operation: string,
    duration: number,
    context: Partial<ErrorContext> = {}
  ): Promise<void> {
    const metric = {
      operation,
      duration,
      timestamp: new Date().toISOString(),
      ...context
    }

    // Log slow operations
    if (duration > 1000) { // > 1 second
      this.logToConsole('warn', 'SLOW_OPERATION', metric)
    }

    // Store performance metrics
    try {
      const metricKey = `performance_metrics:${new Date().toISOString().split('T')[0]}`
      await redis.lpush(metricKey, JSON.stringify(metric))
      await redis.expire(metricKey, 7 * 24 * 60 * 60) // Keep for 7 days
    } catch (error) {
      console.error('Failed to store performance metric:', error)
    }
  }

  /**
   * Get error statistics for monitoring
   */
  static async getErrorStatistics(date?: string): Promise<any> {
    try {
      const targetDate = date || new Date().toISOString().split('T')[0]
      const logKey = `error_logs:${targetDate}`
      const securityKey = `security_events:${targetDate}`
      
      const [errorLogs, securityEvents] = await Promise.all([
        redis.lrange(logKey, 0, -1),
        redis.lrange(securityKey, 0, -1)
      ])

      const errors = errorLogs.map(log => JSON.parse(log))
      const events = securityEvents.map(event => JSON.parse(event))

      const stats = {
        date: targetDate,
        totalErrors: errors.length,
        totalSecurityEvents: events.length,
        errorsByType: {} as Record<string, number>,
        eventsBySeverity: {} as Record<string, number>,
        eventsByType: {} as Record<string, number>,
        topErrors: {} as Record<string, number>
      }

      // Aggregate error statistics
      errors.forEach(error => {
        const errorType = error.error?.name || 'Unknown'
        stats.errorsByType[errorType] = (stats.errorsByType[errorType] || 0) + 1
        
        const message = error.message || 'Unknown error'
        stats.topErrors[message] = (stats.topErrors[message] || 0) + 1
      })

      // Aggregate security event statistics
      events.forEach(event => {
        stats.eventsBySeverity[event.severity] = (stats.eventsBySeverity[event.severity] || 0) + 1
        stats.eventsByType[event.type] = (stats.eventsByType[event.type] || 0) + 1
      })

      return stats
    } catch (error) {
      console.error('Failed to get error statistics:', error)
      return null
    }
  }

  /**
   * Health check endpoint helper
   */
  static async performHealthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy'
    checks: Record<string, { status: string; latency?: number; error?: string }>
    timestamp: string
  }> {
    const checks: Record<string, { status: string; latency?: number; error?: string }> = {}
    
    // Redis health check
    try {
      const start = Date.now()
      await redis.ping()
      checks.redis = { status: 'healthy', latency: Date.now() - start }
    } catch (error) {
      checks.redis = { status: 'unhealthy', error: (error as Error).message }
    }

    // Database health check (placeholder)
    try {
      const start = Date.now()
      // TODO: Add actual database health check
      checks.database = { status: 'healthy', latency: Date.now() - start }
    } catch (error) {
      checks.database = { status: 'unhealthy', error: (error as Error).message }
    }

    // Determine overall status
    const unhealthyChecks = Object.values(checks).filter(check => check.status === 'unhealthy')
    const degradedChecks = Object.values(checks).filter(check => check.status === 'degraded')
    
    let overallStatus: 'healthy' | 'degraded' | 'unhealthy'
    if (unhealthyChecks.length > 0) {
      overallStatus = 'unhealthy'
    } else if (degradedChecks.length > 0) {
      overallStatus = 'degraded'
    } else {
      overallStatus = 'healthy'
    }
    
    return {
      status: overallStatus,
      checks,
      timestamp: new Date().toISOString()
    }
  }
}

/**
 * Custom error classes for better error handling
 */
export class AuthenticationError extends Error {
  code = 'AUTHENTICATION_ERROR'
  constructor(message = 'Authentication failed') {
    super(message)
    this.name = 'AuthenticationError'
  }
}

export class AuthorizationError extends Error {
  code = 'AUTHORIZATION_ERROR'
  constructor(message = 'Access denied') {
    super(message)
    this.name = 'AuthorizationError'
  }
}

export class ValidationError extends Error {
  code = 'VALIDATION_ERROR'
  constructor(message = 'Validation failed') {
    super(message)
    this.name = 'ValidationError'
  }
}

export class RateLimitError extends Error {
  code = 'RATE_LIMIT_ERROR'
  constructor(message = 'Rate limit exceeded') {
    super(message)
    this.name = 'RateLimitError'
  }
}

export class GameError extends Error {
  code = 'GAME_ERROR'
  constructor(message = 'Game operation failed') {
    super(message)
    this.name = 'GameError'
  }
}

export class PaymentError extends Error {
  code = 'PAYMENT_ERROR'
  constructor(message = 'Payment processing failed') {
    super(message)
    this.name = 'PaymentError'
  }
}

export class DatabaseError extends Error {
  code = 'DATABASE_ERROR'
  constructor(message = 'Database operation failed') {
    super(message)
    this.name = 'DatabaseError'
  }
}

export class WebSocketError extends Error {
  code = 'WEBSOCKET_ERROR'
  constructor(message = 'WebSocket operation failed') {
    super(message)
    this.name = 'WebSocketError'
  }
}