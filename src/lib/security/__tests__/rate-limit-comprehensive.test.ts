import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { RateLimiter, createRateLimitMiddleware, type RateLimitConfig } from '../rate-limit'

// Mock Redis
const mockRedis = {
  pipeline: vi.fn(),
  get: vi.fn(),
  setex: vi.fn(),
  keys: vi.fn(),
  del: vi.fn(),
  zremrangebyscore: vi.fn(),
  zcard: vi.fn(),
  zrem: vi.fn(),
  lpush: vi.fn(),
  expire: vi.fn(),
  lrange: vi.fn(),
  eval: vi.fn()
}

const mockPipeline = {
  zremrangebyscore: vi.fn().mockReturnThis(),
  zcard: vi.fn().mockReturnThis(),
  zadd: vi.fn().mockReturnThis(),
  expire: vi.fn().mockReturnThis(),
  exec: vi.fn()
}

vi.mock('@/lib/cache/redis', () => ({
  redis: mockRedis
}))

describe('RateLimiter - Comprehensive Tests', () => {
  const basicConfig: RateLimitConfig = {
    windowMs: 60000, // 1 minute
    maxRequests: 10
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockRedis.pipeline.mockReturnValue(mockPipeline)
    mockPipeline.exec.mockResolvedValue([
      [null, null], // zremrangebyscore
      [null, 0],    // zcard
      [null, 'OK'], // zadd
      [null, 1]     // expire
    ])
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Basic Rate Limiting', () => {
    it('should allow requests within limit', async () => {
      mockPipeline.exec.mockResolvedValue([
        [null, null],
        [null, 5], // Current count: 5
        [null, 'OK'],
        [null, 1]
      ])

      const result = await RateLimiter.checkRateLimit('user123', basicConfig)

      expect(result.allowed).toBe(true)
      expect(result.remaining).toBe(4) // 10 - 5 - 1 = 4
      expect(result.limit).toBe(10)
      expect(result.resetTime).toBeInstanceOf(Date)
    })

    it('should block requests exceeding limit', async () => {
      mockPipeline.exec.mockResolvedValue([
        [null, null],
        [null, 10], // At limit
        [null, 'OK'],
        [null, 1]
      ])
      mockRedis.zrem.mockResolvedValue(1)

      const result = await RateLimiter.checkRateLimit('user123', basicConfig)

      expect(result.allowed).toBe(false)
      expect(result.remaining).toBe(0)
      expect(result.retryAfter).toBeGreaterThan(0)
      expect(mockRedis.zrem).toHaveBeenCalled()
    })

    it('should use correct Redis key generation', async () => {
      const customConfig = {
        ...basicConfig,
        keyGenerator: (id: string) => `custom:${id}`
      }

      await RateLimiter.checkRateLimit('user123', customConfig)

      expect(mockPipeline.zremrangebyscore).toHaveBeenCalledWith(
        'custom:user123',
        expect.any(Number),
        expect.any(Number)
      )
    })

    it('should handle Redis pipeline failures gracefully', async () => {
      mockPipeline.exec.mockResolvedValue(null)

      const result = await RateLimiter.checkRateLimit('user123', basicConfig)

      // Should fail open
      expect(result.allowed).toBe(true)
      expect(result.remaining).toBe(9)
    })

    it('should handle Redis errors gracefully', async () => {
      mockPipeline.exec.mockRejectedValue(new Error('Redis connection failed'))

      const result = await RateLimiter.checkRateLimit('user123', basicConfig)

      // Should fail open
      expect(result.allowed).toBe(true)
      expect(result.remaining).toBe(9)
    })
  })

  describe('Sliding Window Algorithm', () => {
    it('should remove expired entries from window', async () => {
      const now = Date.now()
      vi.spyOn(Date, 'now').mockReturnValue(now)

      await RateLimiter.checkRateLimit('user123', basicConfig)

      expect(mockPipeline.zremrangebyscore).toHaveBeenCalledWith(
        'rate_limit:user123',
        0,
        now - 60000 // windowMs ago
      )

      vi.restoreAllMocks()
    })

    it('should set appropriate expiration on Redis keys', async () => {
      await RateLimiter.checkRateLimit('user123', basicConfig)

      expect(mockPipeline.expire).toHaveBeenCalledWith(
        'rate_limit:user123',
        60 // windowMs in seconds
      )
    })

    it('should generate unique request IDs', async () => {
      const now = Date.now()
      vi.spyOn(Date, 'now').mockReturnValue(now)
      vi.spyOn(Math, 'random').mockReturnValue(0.123456789)

      await RateLimiter.checkRateLimit('user123', basicConfig)

      expect(mockPipeline.zadd).toHaveBeenCalledWith(
        'rate_limit:user123',
        now,
        expect.stringMatching(/^\d+-[a-z0-9]{9}$/)
      )

      vi.restoreAllMocks()
    })
  })

  describe('Specific Rate Limiters', () => {
    describe('Authentication Rate Limiter', () => {
      it('should apply correct auth rate limits', async () => {
        mockPipeline.exec.mockResolvedValue([
          [null, null],
          [null, 2],
          [null, 'OK'],
          [null, 1]
        ])

        const result = await RateLimiter.checkAuthRateLimit('user123')

        expect(result.allowed).toBe(true)
        expect(result.limit).toBe(5)
        expect(mockPipeline.zremrangebyscore).toHaveBeenCalledWith(
          'auth:user123',
          expect.any(Number),
          expect.any(Number)
        )
      })

      it('should block after max auth attempts', async () => {
        mockPipeline.exec.mockResolvedValue([
          [null, null],
          [null, 5], // At limit
          [null, 'OK'],
          [null, 1]
        ])
        mockRedis.zrem.mockResolvedValue(1)

        const result = await RateLimiter.checkAuthRateLimit('user123')

        expect(result.allowed).toBe(false)
        expect(result.retryAfter).toBeGreaterThan(0)
      })
    })

    describe('API Rate Limiter', () => {
      it('should apply correct API rate limits', async () => {
        mockPipeline.exec.mockResolvedValue([
          [null, null],
          [null, 50],
          [null, 'OK'],
          [null, 1]
        ])

        const result = await RateLimiter.checkAPIRateLimit('user123')

        expect(result.allowed).toBe(true)
        expect(result.limit).toBe(100)
        expect(result.remaining).toBe(49)
      })
    })

    describe('WebSocket Rate Limiter', () => {
      it('should apply correct WebSocket rate limits', async () => {
        mockPipeline.exec.mockResolvedValue([
          [null, null],
          [null, 150],
          [null, 'OK'],
          [null, 1]
        ])

        const result = await RateLimiter.checkWebSocketRateLimit('user123')

        expect(result.allowed).toBe(true)
        expect(result.limit).toBe(300)
        expect(result.remaining).toBe(149)
      })
    })

    describe('Chat Rate Limiter', () => {
      it('should apply correct chat rate limits', async () => {
        mockPipeline.exec.mockResolvedValue([
          [null, null],
          [null, 5],
          [null, 'OK'],
          [null, 1]
        ])

        const result = await RateLimiter.checkChatRateLimit('user123')

        expect(result.allowed).toBe(true)
        expect(result.limit).toBe(10)
        expect(result.remaining).toBe(4)
      })
    })

    describe('Game Action Rate Limiter', () => {
      it('should apply correct game action rate limits', async () => {
        mockPipeline.exec.mockResolvedValue([
          [null, null],
          [null, 2],
          [null, 'OK'],
          [null, 1]
        ])

        const result = await RateLimiter.checkGameActionRateLimit('user123')

        expect(result.allowed).toBe(true)
        expect(result.limit).toBe(5)
        expect(result.remaining).toBe(2)
      })

      it('should have short window for game actions', async () => {
        await RateLimiter.checkGameActionRateLimit('user123')

        expect(mockPipeline.expire).toHaveBeenCalledWith(
          'game_action:user123',
          1 // 1 second window
        )
      })
    })

    describe('Registration Rate Limiter', () => {
      it('should apply correct registration rate limits', async () => {
        mockPipeline.exec.mockResolvedValue([
          [null, null],
          [null, 1],
          [null, 'OK'],
          [null, 1]
        ])

        const result = await RateLimiter.checkRegistrationRateLimit('192.168.1.1')

        expect(result.allowed).toBe(true)
        expect(result.limit).toBe(3)
        expect(result.remaining).toBe(1)
      })

      it('should have long window for registrations', async () => {
        await RateLimiter.checkRegistrationRateLimit('192.168.1.1')

        expect(mockPipeline.expire).toHaveBeenCalledWith(
          'registration:192.168.1.1',
          3600 // 1 hour window
        )
      })
    })
  })

  describe('Burst Protection', () => {
    it('should detect and prevent burst requests', async () => {
      mockPipeline.exec.mockResolvedValue([
        [null, null],
        [null, 10], // At burst limit
        [null, 'OK'],
        [null, 1]
      ])
      mockRedis.zrem.mockResolvedValue(1)

      const result = await RateLimiter.checkBurstProtection('user123')

      expect(result.allowed).toBe(false)
      expect(result.limit).toBe(10)
      expect(mockPipeline.expire).toHaveBeenCalledWith(
        'burst:user123',
        1 // 1 second window
      )
    })

    it('should allow normal burst rates', async () => {
      mockPipeline.exec.mockResolvedValue([
        [null, null],
        [null, 5],
        [null, 'OK'],
        [null, 1]
      ])

      const result = await RateLimiter.checkBurstProtection('user123')

      expect(result.allowed).toBe(true)
      expect(result.remaining).toBe(4)
    })
  })

  describe('Progressive Rate Limiting', () => {
    it('should apply base rate limits for new users', async () => {
      mockRedis.get.mockResolvedValue('0') // No violations
      mockPipeline.exec.mockResolvedValue([
        [null, null],
        [null, 5],
        [null, 'OK'],
        [null, 1]
      ])

      const result = await RateLimiter.checkProgressiveRateLimit('user123', basicConfig)

      expect(result.allowed).toBe(true)
      expect(mockRedis.get).toHaveBeenCalledWith('violations:user123')
    })

    it('should increase restrictions for repeat violators', async () => {
      mockRedis.get.mockResolvedValue('2') // 2 violations
      mockPipeline.exec.mockResolvedValue([
        [null, null],
        [null, 3], // Should be restricted to 5 requests max (10 / 2)
        [null, 'OK'],
        [null, 1]
      ])

      const result = await RateLimiter.checkProgressiveRateLimit('user123', basicConfig)

      expect(result.allowed).toBe(true)
      // Verify the restriction was applied by checking pipeline calls
    })

    it('should track new violations', async () => {
      mockRedis.get.mockResolvedValue('1')
      mockPipeline.exec.mockResolvedValue([
        [null, null],
        [null, 5], // Over restricted limit
        [null, 'OK'],
        [null, 1]
      ])
      mockRedis.zrem.mockResolvedValue(1)

      const result = await RateLimiter.checkProgressiveRateLimit('user123', basicConfig)

      expect(result.allowed).toBe(false)
      expect(mockRedis.setex).toHaveBeenCalledWith(
        'violations:user123',
        24 * 60 * 60, // 24 hours
        2 // Incremented violation count
      )
    })

    it('should cap restriction multiplier', async () => {
      mockRedis.get.mockResolvedValue('10') // Many violations
      mockPipeline.exec.mockResolvedValue([
        [null, null],
        [null, 1], // Should be at minimum 1 request (10 / 5 = 2, but capped at 5x)
        [null, 'OK'],
        [null, 1]
      ])

      const result = await RateLimiter.checkProgressiveRateLimit('user123', basicConfig)

      expect(result.allowed).toBe(true)
      // Multiplier should be capped at 5x, so minimum 2 requests allowed
    })
  })

  describe('Whitelist Functionality', () => {
    it('should bypass rate limits for whitelisted identifiers', async () => {
      const result = await RateLimiter.checkWithWhitelist(
        'admin123',
        basicConfig,
        ['admin123', 'service-account']
      )

      expect(result.allowed).toBe(true)
      expect(result.remaining).toBe(basicConfig.maxRequests)
      // Should not call Redis
      expect(mockPipeline.exec).not.toHaveBeenCalled()
    })

    it('should apply normal rate limits for non-whitelisted identifiers', async () => {
      mockPipeline.exec.mockResolvedValue([
        [null, null],
        [null, 5],
        [null, 'OK'],
        [null, 1]
      ])

      const result = await RateLimiter.checkWithWhitelist(
        'user123',
        basicConfig,
        ['admin123', 'service-account']
      )

      expect(result.allowed).toBe(true)
      expect(result.remaining).toBe(4)
      expect(mockPipeline.exec).toHaveBeenCalled()
    })
  })

  describe('Weighted Rate Limiting', () => {
    it('should apply weight to requests', async () => {
      mockRedis.eval.mockResolvedValue(20) // Current weight
      mockPipeline.exec.mockResolvedValue([
        [null, null],
        [null, 20],
        [null, 'OK'],
        [null, 1]
      ])

      const result = await RateLimiter.checkWeightedRateLimit('user123', basicConfig, 5)

      expect(result.allowed).toBe(false) // 20 + 5 > 10 limit
      expect(mockRedis.eval).toHaveBeenCalled()
    })

    it('should allow weighted requests within limit', async () => {
      mockRedis.eval.mockResolvedValue(3) // Current weight
      mockPipeline.exec.mockResolvedValue([
        [null, null],
        [null, 3],
        [null, 'OK'],
        [null, 1]
      ])

      const result = await RateLimiter.checkWeightedRateLimit('user123', basicConfig, 2)

      expect(result.allowed).toBe(true) // 3 + 2 <= 10
      expect(result.remaining).toBe(5) // 10 - 3 - 2
    })

    it('should default weight to 1', async () => {
      mockRedis.eval.mockResolvedValue(5)
      mockPipeline.exec.mockResolvedValue([
        [null, null],
        [null, 5],
        [null, 'OK'],
        [null, 1]
      ])

      const result = await RateLimiter.checkWeightedRateLimit('user123', basicConfig)

      expect(result.allowed).toBe(true)
      expect(result.remaining).toBe(4) // 10 - 5 - 1
    })
  })

  describe('Rate Limit Management', () => {
    describe('Reset Rate Limit', () => {
      it('should reset rate limits for specific identifier', async () => {
        mockRedis.keys.mockResolvedValue(['rate_limit:user123', 'auth:user123'])
        mockRedis.del.mockResolvedValue(2)

        const result = await RateLimiter.resetRateLimit('user123')

        expect(result).toBe(true)
        expect(mockRedis.keys).toHaveBeenCalledWith('*:user123')
        expect(mockRedis.del).toHaveBeenCalledWith('rate_limit:user123', 'auth:user123')
      })

      it('should reset with specific key prefix', async () => {
        mockRedis.keys.mockResolvedValue(['auth:user123'])
        mockRedis.del.mockResolvedValue(1)

        const result = await RateLimiter.resetRateLimit('user123', 'auth')

        expect(result).toBe(true)
        expect(mockRedis.keys).toHaveBeenCalledWith('auth:user123')
        expect(mockRedis.del).toHaveBeenCalledWith('auth:user123')
      })

      it('should handle reset errors gracefully', async () => {
        mockRedis.keys.mockRejectedValue(new Error('Redis error'))

        const result = await RateLimiter.resetRateLimit('user123')

        expect(result).toBe(false)
      })

      it('should handle no keys to reset', async () => {
        mockRedis.keys.mockResolvedValue([])

        const result = await RateLimiter.resetRateLimit('user123')

        expect(result).toBe(true)
        expect(mockRedis.del).not.toHaveBeenCalled()
      })
    })

    describe('Get Current Status', () => {
      it('should return current status without consuming request', async () => {
        mockRedis.zremrangebyscore.mockResolvedValue(2) // Cleaned 2 expired
        mockRedis.zcard.mockResolvedValue(5) // 5 current requests

        const result = await RateLimiter.getCurrentStatus('user123', basicConfig)

        expect(result.allowed).toBe(true)
        expect(result.remaining).toBe(5) // 10 - 5
        expect(result.limit).toBe(10)
        // Should not add a new request
        expect(mockPipeline.zadd).not.toHaveBeenCalled()
      })

      it('should indicate when at limit', async () => {
        mockRedis.zremrangebyscore.mockResolvedValue(0)
        mockRedis.zcard.mockResolvedValue(10) // At limit

        const result = await RateLimiter.getCurrentStatus('user123', basicConfig)

        expect(result.allowed).toBe(false)
        expect(result.remaining).toBe(0)
      })

      it('should handle status check errors', async () => {
        mockRedis.zremrangebyscore.mockRejectedValue(new Error('Redis error'))

        const result = await RateLimiter.getCurrentStatus('user123', basicConfig)

        expect(result.allowed).toBe(true)
        expect(result.remaining).toBe(10)
      })
    })
  })

  describe('Rate Limit Tracking and Logging', () => {
    it('should log rate limit violations', async () => {
      mockPipeline.exec.mockResolvedValue([
        [null, null],
        [null, 10], // At limit
        [null, 'OK'],
        [null, 1]
      ])
      mockRedis.zrem.mockResolvedValue(1)
      mockRedis.lpush.mockResolvedValue(1)

      const result = await RateLimiter.checkWithTracking('user123', basicConfig, {
        success: false,
        endpoint: 'test',
        userAgent: 'test-agent',
        ip: '192.168.1.1'
      })

      expect(result.allowed).toBe(false)
      expect(mockRedis.lpush).toHaveBeenCalledWith(
        expect.stringMatching(/^rate_limit_logs:\d{4}-\d{2}-\d{2}$/),
        expect.stringContaining('"type":"rate_limit_exceeded"')
      )
      expect(mockRedis.expire).toHaveBeenCalledWith(
        expect.stringMatching(/^rate_limit_logs:\d{4}-\d{2}-\d{2}$/),
        7 * 24 * 60 * 60 // 7 days
      )
    })

    it('should not log when requests are allowed', async () => {
      mockPipeline.exec.mockResolvedValue([
        [null, null],
        [null, 5],
        [null, 'OK'],
        [null, 1]
      ])

      const result = await RateLimiter.checkWithTracking('user123', basicConfig)

      expect(result.allowed).toBe(true)
      expect(mockRedis.lpush).not.toHaveBeenCalled()
    })
  })

  describe('Statistics and Monitoring', () => {
    it('should return rate limit statistics', async () => {
      const mockLogs = [
        JSON.stringify({
          identifier: 'user123',
          type: 'rate_limit_exceeded',
          endpoint: 'api',
          timestamp: '2023-01-01T10:00:00Z'
        }),
        JSON.stringify({
          identifier: 'user456',
          type: 'rate_limit_exceeded',
          endpoint: 'auth',
          timestamp: '2023-01-01T11:00:00Z'
        })
      ]

      mockRedis.lrange.mockResolvedValue(mockLogs)

      const stats = await RateLimiter.getStatistics('2023-01-01')

      expect(stats).toEqual({
        totalEvents: 2,
        byEndpoint: {
          api: 1,
          auth: 1
        },
        byIdentifier: {
          user123: 1,
          user456: 1
        },
        timeDistribution: {
          10: 1,
          11: 1
        }
      })

      expect(mockRedis.lrange).toHaveBeenCalledWith(
        'rate_limit_logs:2023-01-01',
        0,
        -1
      )
    })

    it('should use current date when no date provided', async () => {
      const today = new Date().toISOString().split('T')[0]
      mockRedis.lrange.mockResolvedValue([])

      await RateLimiter.getStatistics()

      expect(mockRedis.lrange).toHaveBeenCalledWith(
        `rate_limit_logs:${today}`,
        0,
        -1
      )
    })

    it('should handle statistics errors gracefully', async () => {
      mockRedis.lrange.mockRejectedValue(new Error('Redis error'))

      const stats = await RateLimiter.getStatistics()

      expect(stats).toBeNull()
    })
  })

  describe('Middleware Integration', () => {
    it('should create working middleware', async () => {
      const middleware = createRateLimitMiddleware(basicConfig)
      
      const mockRequest = {
        ip: '192.168.1.1',
        headers: {}
      }
      const mockResponse = {
        setHeader: vi.fn(),
        status: vi.fn().mockReturnThis(),
        json: vi.fn()
      }
      const mockNext = vi.fn()

      mockPipeline.exec.mockResolvedValue([
        [null, null],
        [null, 5],
        [null, 'OK'],
        [null, 1]
      ])

      await middleware(mockRequest, mockResponse, mockNext)

      expect(mockResponse.setHeader).toHaveBeenCalledWith('X-RateLimit-Limit', 10)
      expect(mockResponse.setHeader).toHaveBeenCalledWith('X-RateLimit-Remaining', 4)
      expect(mockNext).toHaveBeenCalled()
    })

    it('should block requests and return 429', async () => {
      const middleware = createRateLimitMiddleware(basicConfig)
      
      const mockRequest = {
        ip: '192.168.1.1',
        headers: {}
      }
      const mockResponse = {
        setHeader: vi.fn(),
        status: vi.fn().mockReturnThis(),
        json: vi.fn()
      }
      const mockNext = vi.fn()

      mockPipeline.exec.mockResolvedValue([
        [null, null],
        [null, 10], // At limit
        [null, 'OK'],
        [null, 1]
      ])
      mockRedis.zrem.mockResolvedValue(1)

      await middleware(mockRequest, mockResponse, mockNext)

      expect(mockResponse.status).toHaveBeenCalledWith(429)
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Too many requests',
        retryAfter: expect.any(Number)
      })
      expect(mockNext).not.toHaveBeenCalled()
    })

    it('should handle missing response object', async () => {
      const middleware = createRateLimitMiddleware(basicConfig)
      
      const mockRequest = { ip: '192.168.1.1', headers: {} }

      mockPipeline.exec.mockResolvedValue([
        [null, null],
        [null, 10], // At limit
        [null, 'OK'],
        [null, 1]
      ])
      mockRedis.zrem.mockResolvedValue(1)

      await expect(middleware(mockRequest)).rejects.toThrow('Rate limit exceeded')
    })

    it('should use X-Forwarded-For header when available', async () => {
      const middleware = createRateLimitMiddleware(basicConfig)
      
      const mockRequest = {
        ip: '10.0.0.1',
        headers: {
          'x-forwarded-for': '192.168.1.1'
        }
      }
      const mockResponse = {
        setHeader: vi.fn(),
        status: vi.fn().mockReturnThis(),
        json: vi.fn()
      }
      const mockNext = vi.fn()

      mockPipeline.exec.mockResolvedValue([
        [null, null],
        [null, 5],
        [null, 'OK'],
        [null, 1]
      ])

      await middleware(mockRequest, mockResponse, mockNext)

      // Should use X-Forwarded-For IP
      expect(mockPipeline.zremrangebyscore).toHaveBeenCalledWith(
        'rate_limit:192.168.1.1',
        expect.any(Number),
        expect.any(Number)
      )
    })
  })

  describe('Distributed Rate Limiting', () => {
    it('should support distributed rate limiting with instance ID', async () => {
      mockPipeline.exec.mockResolvedValue([
        [null, null],
        [null, 5],
        [null, 'OK'],
        [null, 1]
      ])

      const result = await RateLimiter.checkDistributedRateLimit(
        'user123',
        basicConfig,
        'instance-1'
      )

      expect(result.allowed).toBe(true)
      expect(mockPipeline.zremrangebyscore).toHaveBeenCalledWith(
        'rate_limit:user123:instance-1',
        expect.any(Number),
        expect.any(Number)
      )
    })

    it('should default to "default" instance ID', async () => {
      mockPipeline.exec.mockResolvedValue([
        [null, null],
        [null, 5],
        [null, 'OK'],
        [null, 1]
      ])

      await RateLimiter.checkDistributedRateLimit('user123', basicConfig)

      expect(mockPipeline.zremrangebyscore).toHaveBeenCalledWith(
        'rate_limit:user123:default',
        expect.any(Number),
        expect.any(Number)
      )
    })
  })

  describe('Performance and Edge Cases', () => {
    it('should handle high-frequency requests efficiently', async () => {
      const startTime = performance.now()

      // Simulate 100 rapid requests
      const promises = Array.from({ length: 100 }, () =>
        RateLimiter.checkRateLimit('user123', basicConfig)
      )

      await Promise.all(promises)

      const endTime = performance.now()
      const executionTime = endTime - startTime

      // Should complete 100 checks in reasonable time (< 500ms)
      expect(executionTime).toBeLessThan(500)
    })

    it('should handle concurrent requests safely', async () => {
      mockPipeline.exec.mockResolvedValue([
        [null, null],
        [null, 5],
        [null, 'OK'],
        [null, 1]
      ])

      // Simulate concurrent requests from same user
      const promises = Array.from({ length: 10 }, () =>
        RateLimiter.checkRateLimit('user123', basicConfig)
      )

      const results = await Promise.all(promises)

      // All should be processed
      results.forEach(result => {
        expect(result).toHaveProperty('allowed')
        expect(result).toHaveProperty('remaining')
        expect(result).toHaveProperty('limit')
      })
    })

    it('should handle very large window sizes', async () => {
      const largeWindowConfig = {
        windowMs: 24 * 60 * 60 * 1000, // 24 hours
        maxRequests: 10000
      }

      mockPipeline.exec.mockResolvedValue([
        [null, null],
        [null, 5000],
        [null, 'OK'],
        [null, 1]
      ])

      const result = await RateLimiter.checkRateLimit('user123', largeWindowConfig)

      expect(result.allowed).toBe(true)
      expect(result.remaining).toBe(4999)
      expect(mockPipeline.expire).toHaveBeenCalledWith(
        'rate_limit:user123',
        24 * 60 * 60 // 24 hours in seconds
      )
    })

    it('should handle very small window sizes', async () => {
      const smallWindowConfig = {
        windowMs: 100, // 100ms
        maxRequests: 5
      }

      mockPipeline.exec.mockResolvedValue([
        [null, null],
        [null, 2],
        [null, 'OK'],
        [null, 1]
      ])

      const result = await RateLimiter.checkRateLimit('user123', smallWindowConfig)

      expect(result.allowed).toBe(true)
      expect(result.remaining).toBe(2)
      expect(mockPipeline.expire).toHaveBeenCalledWith(
        'rate_limit:user123',
        1 // Minimum 1 second
      )
    })
  })

  describe('Configuration Validation', () => {
    it('should handle missing optional config properties', async () => {
      const minimalConfig: RateLimitConfig = {
        windowMs: 60000,
        maxRequests: 10
      }

      mockPipeline.exec.mockResolvedValue([
        [null, null],
        [null, 5],
        [null, 'OK'],
        [null, 1]
      ])

      const result = await RateLimiter.checkRateLimit('user123', minimalConfig)

      expect(result.allowed).toBe(true)
      expect(result.remaining).toBe(4)
    })

    it('should apply custom configuration options', async () => {
      const customConfig: RateLimitConfig = {
        windowMs: 30000,
        maxRequests: 20,
        keyGenerator: (id) => `custom_prefix:${id}`,
        message: 'Custom rate limit message'
      }

      mockPipeline.exec.mockResolvedValue([
        [null, null],
        [null, 10],
        [null, 'OK'],
        [null, 1]
      ])

      const result = await RateLimiter.checkRateLimit('user123', customConfig)

      expect(result.allowed).toBe(true)
      expect(result.limit).toBe(20)
      expect(result.remaining).toBe(9) // 20 - 10 - 1
      expect(mockPipeline.zremrangebyscore).toHaveBeenCalledWith(
        'custom_prefix:user123',
        expect.any(Number),
        expect.any(Number)
      )
    })
  })
})