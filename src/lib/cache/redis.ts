import { Redis } from '@upstash/redis'

// Redis client configuration
export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

// Cache key prefixes
export const CACHE_KEYS = {
  USER_SESSION: 'user_session:',
  GAME_STATE: 'game_state:',
  PLAYER_STATS: 'player_stats:',
  HOME_GAME: 'home_game:',
  ACTIVE_PLAYERS: 'active_players:',
  WEBSOCKET_ROOM: 'ws_room:',
  RATE_LIMIT: 'rate_limit:',
} as const

// Cache TTL values (in seconds)
export const CACHE_TTL = {
  USER_SESSION: 60 * 60 * 24, // 24 hours
  GAME_STATE: 60 * 5, // 5 minutes
  PLAYER_STATS: 60 * 60, // 1 hour
  HOME_GAME: 60 * 30, // 30 minutes
  ACTIVE_PLAYERS: 60, // 1 minute
  WEBSOCKET_ROOM: 60 * 60, // 1 hour
  RATE_LIMIT: 60, // 1 minute
} as const

// Cache utility functions
export class CacheManager {
  // Game state caching
  static async getGameState(sessionId: string) {
    try {
      const key = `${CACHE_KEYS.GAME_STATE}${sessionId}`
      return await redis.get(key)
    } catch (error) {
      console.error('Error getting game state from cache:', error)
      return null
    }
  }

  static async setGameState(sessionId: string, state: any, ttl = CACHE_TTL.GAME_STATE) {
    try {
      const key = `${CACHE_KEYS.GAME_STATE}${sessionId}`
      await redis.setex(key, ttl, JSON.stringify(state))
    } catch (error) {
      console.error('Error setting game state in cache:', error)
    }
  }

  static async invalidateGameState(sessionId: string) {
    try {
      const key = `${CACHE_KEYS.GAME_STATE}${sessionId}`
      await redis.del(key)
    } catch (error) {
      console.error('Error invalidating game state cache:', error)
    }
  }

  // User session caching
  static async getUserSession(userId: string) {
    try {
      const key = `${CACHE_KEYS.USER_SESSION}${userId}`
      const session = await redis.get(key)
      return session ? JSON.parse(session as string) : null
    } catch (error) {
      console.error('Error getting user session from cache:', error)
      return null
    }
  }

  static async setUserSession(userId: string, session: any, ttl = CACHE_TTL.USER_SESSION) {
    try {
      const key = `${CACHE_KEYS.USER_SESSION}${userId}`
      await redis.setex(key, ttl, JSON.stringify(session))
    } catch (error) {
      console.error('Error setting user session in cache:', error)
    }
  }

  static async invalidateUserSession(userId: string) {
    try {
      const key = `${CACHE_KEYS.USER_SESSION}${userId}`
      await redis.del(key)
    } catch (error) {
      console.error('Error invalidating user session cache:', error)
    }
  }

  // Player statistics caching
  static async getPlayerStats(userId: string, homeGameId?: string) {
    try {
      const key = `${CACHE_KEYS.PLAYER_STATS}${userId}${homeGameId ? `:${homeGameId}` : ''}`
      const stats = await redis.get(key)
      return stats ? JSON.parse(stats as string) : null
    } catch (error) {
      console.error('Error getting player stats from cache:', error)
      return null
    }
  }

  static async setPlayerStats(userId: string, stats: any, homeGameId?: string, ttl = CACHE_TTL.PLAYER_STATS) {
    try {
      const key = `${CACHE_KEYS.PLAYER_STATS}${userId}${homeGameId ? `:${homeGameId}` : ''}`
      await redis.setex(key, ttl, JSON.stringify(stats))
    } catch (error) {
      console.error('Error setting player stats in cache:', error)
    }
  }

  static async invalidatePlayerStats(userId: string, homeGameId?: string) {
    try {
      const key = `${CACHE_KEYS.PLAYER_STATS}${userId}${homeGameId ? `:${homeGameId}` : ''}`
      await redis.del(key)
    } catch (error) {
      console.error('Error invalidating player stats cache:', error)
    }
  }

  // Home game caching
  static async getHomeGame(gameId: string) {
    try {
      const key = `${CACHE_KEYS.HOME_GAME}${gameId}`
      const game = await redis.get(key)
      return game ? JSON.parse(game as string) : null
    } catch (error) {
      console.error('Error getting home game from cache:', error)
      return null
    }
  }

  static async setHomeGame(gameId: string, game: any, ttl = CACHE_TTL.HOME_GAME) {
    try {
      const key = `${CACHE_KEYS.HOME_GAME}${gameId}`
      await redis.setex(key, ttl, JSON.stringify(game))
    } catch (error) {
      console.error('Error setting home game in cache:', error)
    }
  }

  static async invalidateHomeGame(gameId: string) {
    try {
      const key = `${CACHE_KEYS.HOME_GAME}${gameId}`
      await redis.del(key)
    } catch (error) {
      console.error('Error invalidating home game cache:', error)
    }
  }

  // Active players tracking
  static async addActivePlayer(sessionId: string, userId: string) {
    try {
      const key = `${CACHE_KEYS.ACTIVE_PLAYERS}${sessionId}`
      await redis.sadd(key, userId)
      await redis.expire(key, CACHE_TTL.ACTIVE_PLAYERS)
    } catch (error) {
      console.error('Error adding active player:', error)
    }
  }

  static async removeActivePlayer(sessionId: string, userId: string) {
    try {
      const key = `${CACHE_KEYS.ACTIVE_PLAYERS}${sessionId}`
      await redis.srem(key, userId)
    } catch (error) {
      console.error('Error removing active player:', error)
    }
  }

  static async getActivePlayers(sessionId: string): Promise<string[]> {
    try {
      const key = `${CACHE_KEYS.ACTIVE_PLAYERS}${sessionId}`
      const players = await redis.smembers(key)
      return players as string[]
    } catch (error) {
      console.error('Error getting active players:', error)
      return []
    }
  }

  // WebSocket room management
  static async addToWebSocketRoom(roomId: string, connectionId: string) {
    try {
      const key = `${CACHE_KEYS.WEBSOCKET_ROOM}${roomId}`
      await redis.sadd(key, connectionId)
      await redis.expire(key, CACHE_TTL.WEBSOCKET_ROOM)
    } catch (error) {
      console.error('Error adding to WebSocket room:', error)
    }
  }

  static async removeFromWebSocketRoom(roomId: string, connectionId: string) {
    try {
      const key = `${CACHE_KEYS.WEBSOCKET_ROOM}${roomId}`
      await redis.srem(key, connectionId)
    } catch (error) {
      console.error('Error removing from WebSocket room:', error)
    }
  }

  static async getWebSocketRoomMembers(roomId: string): Promise<string[]> {
    try {
      const key = `${CACHE_KEYS.WEBSOCKET_ROOM}${roomId}`
      const members = await redis.smembers(key)
      return members as string[]
    } catch (error) {
      console.error('Error getting WebSocket room members:', error)
      return []
    }
  }

  // Rate limiting
  static async checkRateLimit(identifier: string, limit: number, window: number = CACHE_TTL.RATE_LIMIT): Promise<boolean> {
    try {
      const key = `${CACHE_KEYS.RATE_LIMIT}${identifier}`
      const current = await redis.get(key)
      
      if (!current) {
        await redis.setex(key, window, '1')
        return true
      }
      
      const count = parseInt(current as string, 10)
      if (count >= limit) {
        return false
      }
      
      await redis.incr(key)
      return true
    } catch (error) {
      console.error('Error checking rate limit:', error)
      return true // Allow request on error
    }
  }

  // Generic cache operations
  static async set(key: string, value: any, ttl?: number) {
    try {
      if (ttl) {
        await redis.setex(key, ttl, JSON.stringify(value))
      } else {
        await redis.set(key, JSON.stringify(value))
      }
    } catch (error) {
      console.error('Error setting cache value:', error)
    }
  }

  static async get(key: string) {
    try {
      const value = await redis.get(key)
      return value ? JSON.parse(value as string) : null
    } catch (error) {
      console.error('Error getting cache value:', error)
      return null
    }
  }

  static async del(key: string) {
    try {
      await redis.del(key)
    } catch (error) {
      console.error('Error deleting cache value:', error)
    }
  }

  static async exists(key: string): Promise<boolean> {
    try {
      const exists = await redis.exists(key)
      return exists === 1
    } catch (error) {
      console.error('Error checking cache key existence:', error)
      return false
    }
  }

  // Batch operations
  static async mget(keys: string[]) {
    try {
      const values = await redis.mget(...keys)
      return values.map((value) => value ? JSON.parse(value as string) : null)
    } catch (error) {
      console.error('Error getting multiple cache values:', error)
      return keys.map(() => null)
    }
  }

  static async mset(keyValues: Record<string, any>, ttl?: number) {
    try {
      const serialized = Object.entries(keyValues).reduce((acc, [key, value]) => {
        acc[key] = JSON.stringify(value)
        return acc
      }, {} as Record<string, string>)

      await redis.mset(serialized)
      
      if (ttl) {
        const promises = Object.keys(serialized).map(key => redis.expire(key, ttl))
        await Promise.all(promises)
      }
    } catch (error) {
      console.error('Error setting multiple cache values:', error)
    }
  }

  // Cleanup expired keys (utility method)
  static async cleanup() {
    try {
      // This would typically be handled by Redis automatically
      // But we can implement custom cleanup logic here if needed
      console.log('Cache cleanup completed')
    } catch (error) {
      console.error('Error during cache cleanup:', error)
    }
  }
}