import { describe, it, expect } from 'vitest'
import { ZodError } from 'zod'
import {
  userRegistrationSchema,
  userLoginSchema,
  userProfileUpdateSchema,
  gameConfigSchema,
  homeGameCreateSchema,
  sessionCreateSchema,
  sessionJoinSchema,
  playerActionSchema,
  webSocketMessageSchema,
  chatMessageSchema,
  transactionSchema,
  adminUserUpdateSchema,
  adminGameModerationSchema,
  paginationSchema,
  searchSchema,
  idParamSchema,
  inviteCodeSchema,
  statisticsQuerySchema,
  apiResponseSchema,
  errorResponseSchema,
  environmentSchema,
  fileUploadSchema,
  rateLimitSchema,
  cardSchema,
  gameStateSchema,
  schemaRegistry
} from '../schemas'

describe('Validation Schemas - Comprehensive Tests', () => {

  describe('User Registration Schema', () => {
    const validRegistration = {
      email: 'test@example.com',
      username: 'testuser123',
      password: 'SecurePass123!@#',
      displayName: 'Test User'
    }

    it('should validate correct user registration data', () => {
      const result = userRegistrationSchema.parse(validRegistration)
      
      expect(result.email).toBe('test@example.com')
      expect(result.username).toBe('testuser123')
      expect(result.password).toBe('SecurePass123!@#')
      expect(result.displayName).toBe('Test User')
    })

    it('should transform email to lowercase and trim', () => {
      const data = {
        ...validRegistration,
        email: '  TEST@EXAMPLE.COM  '
      }
      
      const result = userRegistrationSchema.parse(data)
      expect(result.email).toBe('test@example.com')
    })

    it('should transform username to lowercase and trim', () => {
      const data = {
        ...validRegistration,
        username: '  TESTUSER123  '
      }
      
      const result = userRegistrationSchema.parse(data)
      expect(result.username).toBe('testuser123')
    })

    it('should trim display name', () => {
      const data = {
        ...validRegistration,
        displayName: '  Test User  '
      }
      
      const result = userRegistrationSchema.parse(data)
      expect(result.displayName).toBe('Test User')
    })

    describe('Email validation', () => {
      it('should reject invalid email formats', () => {
        const invalidEmails = [
          'invalid-email',
          '@example.com',
          'test@',
          'test@.com',
          'test..test@example.com',
          'a@b', // Too short
          'a'.repeat(250) + '@example.com' // Too long
        ]

        invalidEmails.forEach(email => {
          const data = { ...validRegistration, email }
          expect(() => userRegistrationSchema.parse(data)).toThrow(ZodError)
        })
      })

      it('should accept valid email formats', () => {
        const validEmails = [
          'test@example.com',
          'user.name@example.co.uk',
          'user+tag@example.org',
          'user123@example-site.com',
          'a@b.co'
        ]

        validEmails.forEach(email => {
          const data = { ...validRegistration, email }
          expect(() => userRegistrationSchema.parse(data)).not.toThrow()
        })
      })
    })

    describe('Username validation', () => {
      it('should reject usernames with invalid characters', () => {
        const invalidUsernames = [
          'user@name',
          'user name',
          'user.name',
          'user#name',
          'user/name',
          'a', // Too short
          'a'.repeat(51) // Too long
        ]

        invalidUsernames.forEach(username => {
          const data = { ...validRegistration, username }
          expect(() => userRegistrationSchema.parse(data)).toThrow(ZodError)
        })
      })

      it('should accept valid usernames', () => {
        const validUsernames = [
          'username',
          'user123',
          'user_name',
          'user-name',
          'USER123',
          'a12'
        ]

        validUsernames.forEach(username => {
          const data = { ...validRegistration, username }
          expect(() => userRegistrationSchema.parse(data)).not.toThrow()
        })
      })
    })

    describe('Password validation', () => {
      it('should reject weak passwords', () => {
        const weakPasswords = [
          'short',
          'nouppercase123!',
          'NOLOWERCASE123!',
          'NoNumbers!',
          'NoSpecialChars123',
          'a'.repeat(129) // Too long
        ]

        weakPasswords.forEach(password => {
          const data = { ...validRegistration, password }
          expect(() => userRegistrationSchema.parse(data)).toThrow(ZodError)
        })
      })

      it('should accept strong passwords', () => {
        const strongPasswords = [
          'SecurePass123!',
          'MyPassword1@',
          'ComplexP@ssw0rd',
          'Str0ng!P@ssw0rd123'
        ]

        strongPasswords.forEach(password => {
          const data = { ...validRegistration, password }
          expect(() => userRegistrationSchema.parse(data)).not.toThrow()
        })
      })
    })

    describe('Display name validation', () => {
      it('should reject invalid display names', () => {
        const invalidNames = [
          'a', // Too short
          'a'.repeat(101), // Too long
          'name@invalid',
          'name<script>',
          'name/slash'
        ]

        invalidNames.forEach(displayName => {
          const data = { ...validRegistration, displayName }
          expect(() => userRegistrationSchema.parse(data)).toThrow(ZodError)
        })
      })

      it('should accept valid display names', () => {
        const validNames = [
          'John Doe',
          'User123',
          'Test_User',
          'User-Name',
          'A B'
        ]

        validNames.forEach(displayName => {
          const data = { ...validRegistration, displayName }
          expect(() => userRegistrationSchema.parse(data)).not.toThrow()
        })
      })

      it('should make display name optional', () => {
        const data = { ...validRegistration }
        delete (data as any).displayName
        
        expect(() => userRegistrationSchema.parse(data)).not.toThrow()
      })
    })
  })

  describe('Game Configuration Schema', () => {
    const validGameConfig = {
      gameVariant: 'texas_holdem' as const,
      bettingStructure: 'no_limit' as const,
      smallBlind: 1.00,
      bigBlind: 2.00,
      ante: 0.25,
      timeLimit: 30
    }

    it('should validate correct game configuration', () => {
      const result = gameConfigSchema.parse(validGameConfig)
      expect(result).toEqual(validGameConfig)
    })

    it('should enforce big blind is at least 2x small blind', () => {
      const invalidConfig = {
        ...validGameConfig,
        smallBlind: 2.00,
        bigBlind: 3.00 // Less than 2x small blind
      }

      expect(() => gameConfigSchema.parse(invalidConfig)).toThrow(ZodError)
    })

    it('should accept valid big blind ratios', () => {
      const validConfigs = [
        { ...validGameConfig, smallBlind: 1.00, bigBlind: 2.00 },
        { ...validGameConfig, smallBlind: 0.50, bigBlind: 1.00 },
        { ...validGameConfig, smallBlind: 5.00, bigBlind: 15.00 }
      ]

      validConfigs.forEach(config => {
        expect(() => gameConfigSchema.parse(config)).not.toThrow()
      })
    })

    it('should reject invalid blind values', () => {
      const invalidConfigs = [
        { ...validGameConfig, smallBlind: -1 },
        { ...validGameConfig, bigBlind: -2 },
        { ...validGameConfig, smallBlind: 0 },
        { ...validGameConfig, ante: -0.1 },
        { ...validGameConfig, smallBlind: 1000001 }, // Too large
        { ...validGameConfig, bigBlind: 2000001 } // Too large
      ]

      invalidConfigs.forEach(config => {
        expect(() => gameConfigSchema.parse(config)).toThrow(ZodError)
      })
    })

    it('should validate multipleOf constraints for monetary values', () => {
      const invalidConfigs = [
        { ...validGameConfig, smallBlind: 1.001 }, // Not multiple of 0.01
        { ...validGameConfig, bigBlind: 2.005 },
        { ...validGameConfig, ante: 0.251 }
      ]

      invalidConfigs.forEach(config => {
        expect(() => gameConfigSchema.parse(config)).toThrow(ZodError)
      })
    })

    it('should validate time limit constraints', () => {
      const invalidTimeConfigs = [
        { ...validGameConfig, timeLimit: 4 }, // Too short
        { ...validGameConfig, timeLimit: 301 }, // Too long
        { ...validGameConfig, timeLimit: 30.5 } // Not integer
      ]

      invalidTimeConfigs.forEach(config => {
        expect(() => gameConfigSchema.parse(config)).toThrow(ZodError)
      })
    })

    it('should set default ante to 0', () => {
      const configWithoutAnte = {
        gameVariant: 'texas_holdem' as const,
        bettingStructure: 'no_limit' as const,
        smallBlind: 1.00,
        bigBlind: 2.00
      }

      const result = gameConfigSchema.parse(configWithoutAnte)
      expect(result.ante).toBe(0)
    })
  })

  describe('Player Action Schema', () => {
    const baseAction = {
      sessionId: '550e8400-e29b-41d4-a716-446655440000',
      timestamp: new Date().toISOString()
    }

    it('should validate fold action', () => {
      const foldAction = {
        ...baseAction,
        action: 'fold' as const
      }

      const result = playerActionSchema.parse(foldAction)
      expect(result.action).toBe('fold')
    })

    it('should validate check action', () => {
      const checkAction = {
        ...baseAction,
        action: 'check' as const
      }

      const result = playerActionSchema.parse(checkAction)
      expect(result.action).toBe('check')
    })

    it('should validate call action', () => {
      const callAction = {
        ...baseAction,
        action: 'call' as const,
        amount: 50.00
      }

      const result = playerActionSchema.parse(callAction)
      expect(result.action).toBe('call')
      expect(result.amount).toBe(50.00)
    })

    it('should require amount for raise, bet, and all_in actions', () => {
      const actionsRequiringAmount = ['raise', 'bet', 'all_in'] as const

      actionsRequiringAmount.forEach(action => {
        const actionWithoutAmount = {
          ...baseAction,
          action
        }

        expect(() => playerActionSchema.parse(actionWithoutAmount)).toThrow(ZodError)

        const actionWithAmount = {
          ...baseAction,
          action,
          amount: 100.00
        }

        expect(() => playerActionSchema.parse(actionWithAmount)).not.toThrow()
      })
    })

    it('should validate amount constraints', () => {
      const invalidAmounts = [-1, 10000001, 50.005] // Negative, too large, not multiple of 0.01

      invalidAmounts.forEach(amount => {
        const action = {
          ...baseAction,
          action: 'raise' as const,
          amount
        }

        expect(() => playerActionSchema.parse(action)).toThrow(ZodError)
      })
    })

    it('should validate UUID formats', () => {
      const invalidUUIDs = [
        'not-a-uuid',
        '123-456-789',
        'invalid-session-id'
      ]

      invalidUUIDs.forEach(sessionId => {
        const action = {
          ...baseAction,
          sessionId,
          action: 'fold' as const
        }

        expect(() => playerActionSchema.parse(action)).toThrow(ZodError)
      })
    })

    it('should validate timestamp format', () => {
      const invalidTimestamps = [
        'not-a-date',
        '2023-01-01',
        '2023-01-01T10:00:00', // Missing timezone
        'invalid-iso-string'
      ]

      invalidTimestamps.forEach(timestamp => {
        const action = {
          ...baseAction,
          timestamp,
          action: 'fold' as const
        }

        expect(() => playerActionSchema.parse(action)).toThrow(ZodError)
      })
    })
  })

  describe('WebSocket Message Schema', () => {
    const validMessage = {
      type: 'game_action' as const,
      payload: { action: 'fold' },
      timestamp: new Date().toISOString(),
      messageId: '550e8400-e29b-41d4-a716-446655440000'
    }

    it('should validate correct WebSocket message', () => {
      const result = webSocketMessageSchema.parse(validMessage)
      expect(result).toEqual(validMessage)
    })

    it('should validate all message types', () => {
      const messageTypes = [
        'join_room', 'leave_room', 'game_action', 'chat_message',
        'ping', 'reconnect', 'get_state', 'player_update'
      ] as const

      messageTypes.forEach(type => {
        const message = {
          ...validMessage,
          type
        }

        expect(() => webSocketMessageSchema.parse(message)).not.toThrow()
      })
    })

    it('should make payload optional', () => {
      const messageWithoutPayload = {
        type: 'ping' as const,
        timestamp: new Date().toISOString(),
        messageId: '550e8400-e29b-41d4-a716-446655440000'
      }

      expect(() => webSocketMessageSchema.parse(messageWithoutPayload)).not.toThrow()
    })

    it('should validate messageId as UUID', () => {
      const invalidMessageIds = [
        'not-a-uuid',
        '123-456',
        ''
      ]

      invalidMessageIds.forEach(messageId => {
        const message = {
          ...validMessage,
          messageId
        }

        expect(() => webSocketMessageSchema.parse(message)).toThrow(ZodError)
      })
    })
  })

  describe('Chat Message Schema', () => {
    const validChatMessage = {
      text: 'Hello, world!',
      type: 'public' as const,
      sessionId: '550e8400-e29b-41d4-a716-446655440000'
    }

    it('should validate public chat message', () => {
      const result = chatMessageSchema.parse(validChatMessage)
      expect(result.type).toBe('public')
      expect(result.text).toBe('Hello, world!')
    })

    it('should trim message text', () => {
      const messageWithSpaces = {
        ...validChatMessage,
        text: '  Hello, world!  '
      }

      const result = chatMessageSchema.parse(messageWithSpaces)
      expect(result.text).toBe('Hello, world!')
    })

    it('should require targetUserId for private messages', () => {
      const privateMessageWithoutTarget = {
        ...validChatMessage,
        type: 'private' as const
      }

      expect(() => chatMessageSchema.parse(privateMessageWithoutTarget)).toThrow(ZodError)

      const privateMessageWithTarget = {
        ...validChatMessage,
        type: 'private' as const,
        targetUserId: '550e8400-e29b-41d4-a716-446655440001'
      }

      expect(() => chatMessageSchema.parse(privateMessageWithTarget)).not.toThrow()
    })

    it('should reject empty or too long messages', () => {
      const invalidMessages = [
        { ...validChatMessage, text: '' },
        { ...validChatMessage, text: 'a'.repeat(501) }
      ]

      invalidMessages.forEach(message => {
        expect(() => chatMessageSchema.parse(message)).toThrow(ZodError)
      })
    })

    it('should default type to public', () => {
      const messageWithoutType = {
        text: 'Hello, world!',
        sessionId: '550e8400-e29b-41d4-a716-446655440000'
      }

      const result = chatMessageSchema.parse(messageWithoutType)
      expect(result.type).toBe('public')
    })
  })

  describe('Pagination Schema', () => {
    it('should apply default values', () => {
      const result = paginationSchema.parse({})
      
      expect(result.page).toBe(1)
      expect(result.limit).toBe(20)
      expect(result.sortOrder).toBe('asc')
    })

    it('should coerce string numbers', () => {
      const result = paginationSchema.parse({
        page: '5',
        limit: '50'
      })

      expect(result.page).toBe(5)
      expect(result.limit).toBe(50)
    })

    it('should validate page and limit constraints', () => {
      const invalidPagination = [
        { page: 0 }, // Too small
        { page: 10001 }, // Too large
        { limit: 0 }, // Too small
        { limit: 101 }, // Too large
        { page: 1.5 }, // Not integer
        { limit: 20.5 } // Not integer
      ]

      invalidPagination.forEach(params => {
        expect(() => paginationSchema.parse(params)).toThrow(ZodError)
      })
    })

    it('should validate sortBy field format', () => {
      const invalidSortFields = [
        '123invalid', // Can't start with number
        'field-name', // No hyphens
        'field.name', // No dots
        'field name' // No spaces
      ]

      invalidSortFields.forEach(sortBy => {
        expect(() => paginationSchema.parse({ sortBy })).toThrow(ZodError)
      })

      const validSortFields = [
        'field_name',
        'fieldName',
        'created_at',
        'updatedAt'
      ]

      validSortFields.forEach(sortBy => {
        expect(() => paginationSchema.parse({ sortBy })).not.toThrow()
      })
    })
  })

  describe('Transaction Schema', () => {
    const validTransaction = {
      transactionType: 'buy_in' as const,
      amount: 100.00,
      currency: 'USD',
      homeGameId: '550e8400-e29b-41d4-a716-446655440000'
    }

    it('should validate all transaction types', () => {
      const transactionTypes = [
        'buy_in', 'cash_out', 'deposit', 'withdrawal',
        'transfer', 'fee', 'rake', 'tip', 'settlement'
      ] as const

      transactionTypes.forEach(transactionType => {
        const transaction = {
          ...validTransaction,
          transactionType
        }

        expect(() => transactionSchema.parse(transaction)).not.toThrow()
      })
    })

    it('should validate currency format', () => {
      const invalidCurrencies = [
        'us', // Too short
        'USD1', // Contains number
        'usd', // Lowercase
        'USDD' // Too long
      ]

      invalidCurrencies.forEach(currency => {
        const transaction = {
          ...validTransaction,
          currency
        }

        expect(() => transactionSchema.parse(transaction)).toThrow(ZodError)
      })

      const validCurrencies = ['USD', 'EUR', 'GBP', 'CAD']

      validCurrencies.forEach(currency => {
        const transaction = {
          ...validTransaction,
          currency
        }

        expect(() => transactionSchema.parse(transaction)).not.toThrow()
      })
    })

    it('should default currency to USD', () => {
      const transactionWithoutCurrency = {
        transactionType: 'buy_in' as const,
        amount: 100.00
      }

      const result = transactionSchema.parse(transactionWithoutCurrency)
      expect(result.currency).toBe('USD')
    })

    it('should validate amount constraints', () => {
      const invalidAmounts = [
        0, // Too small
        1000001, // Too large
        100.005 // Not multiple of 0.01
      ]

      invalidAmounts.forEach(amount => {
        const transaction = {
          ...validTransaction,
          amount
        }

        expect(() => transactionSchema.parse(transaction)).toThrow(ZodError)
      })
    })
  })

  describe('Card and Game State Schemas', () => {
    describe('Card Schema', () => {
      it('should validate all valid card combinations', () => {
        const suits = ['hearts', 'diamonds', 'clubs', 'spades'] as const
        const ranks = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A'] as const

        suits.forEach(suit => {
          ranks.forEach(rank => {
            const card = { suit, rank }
            expect(() => cardSchema.parse(card)).not.toThrow()
          })
        })
      })

      it('should reject invalid suits and ranks', () => {
        const invalidCards = [
          { suit: 'invalid', rank: 'A' },
          { suit: 'hearts', rank: 'X' },
          { suit: 'hearts', rank: '1' },
          { suit: 'hearts', rank: '10' } // Should be 'T'
        ]

        invalidCards.forEach(card => {
          expect(() => cardSchema.parse(card)).toThrow(ZodError)
        })
      })
    })

    describe('Game State Schema', () => {
      const validGameState = {
        dealerPosition: 1,
        smallBlindPosition: 2,
        bigBlindPosition: 3,
        currentBettingRound: 'preflop' as const,
        communityCards: [],
        sidePots: [],
        currentBet: 20.00,
        minRaise: 20.00
      }

      it('should validate correct game state', () => {
        const result = gameStateSchema.parse(validGameState)
        expect(result).toEqual(validGameState)
      })

      it('should validate all betting rounds', () => {
        const bettingRounds = ['preflop', 'flop', 'turn', 'river', 'showdown'] as const

        bettingRounds.forEach(currentBettingRound => {
          const gameState = {
            ...validGameState,
            currentBettingRound
          }

          expect(() => gameStateSchema.parse(gameState)).not.toThrow()
        })
      })

      it('should validate position constraints', () => {
        const invalidPositions = [
          { dealerPosition: 0 }, // Too small
          { dealerPosition: 11 }, // Too large
          { smallBlindPosition: 0 },
          { bigBlindPosition: 11 }
        ]

        invalidPositions.forEach(positionUpdate => {
          const gameState = {
            ...validGameState,
            ...positionUpdate
          }

          expect(() => gameStateSchema.parse(gameState)).toThrow(ZodError)
        })
      })

      it('should validate community cards limit', () => {
        const tooManyCommunityCards = [
          { suit: 'hearts', rank: 'A' },
          { suit: 'hearts', rank: 'K' },
          { suit: 'hearts', rank: 'Q' },
          { suit: 'hearts', rank: 'J' },
          { suit: 'hearts', rank: 'T' },
          { suit: 'hearts', rank: '9' } // 6 cards - too many
        ]

        const gameState = {
          ...validGameState,
          communityCards: tooManyCommunityCards
        }

        expect(() => gameStateSchema.parse(gameState)).toThrow(ZodError)
      })

      it('should validate side pots structure', () => {
        const validSidePots = [
          {
            amount: 100.50,
            eligiblePlayers: [
              '550e8400-e29b-41d4-a716-446655440000',
              '550e8400-e29b-41d4-a716-446655440001'
            ]
          }
        ]

        const gameState = {
          ...validGameState,
          sidePots: validSidePots
        }

        expect(() => gameStateSchema.parse(gameState)).not.toThrow()

        const invalidSidePots = [
          {
            amount: -10, // Negative amount
            eligiblePlayers: ['not-a-uuid']
          }
        ]

        const invalidGameState = {
          ...validGameState,
          sidePots: invalidSidePots
        }

        expect(() => gameStateSchema.parse(invalidGameState)).toThrow(ZodError)
      })
    })
  })

  describe('Environment Schema', () => {
    const validEnvironment = {
      NODE_ENV: 'production' as const,
      DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
      NEXT_PUBLIC_SUPABASE_URL: 'https://project.supabase.co',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon-key-here',
      SUPABASE_SERVICE_ROLE_KEY: 'service-role-key-here',
      JWT_SECRET: 'a'.repeat(32), // 32 characters minimum
      WEBSOCKET_PORT: 8080,
      LOG_LEVEL: 'info' as const
    }

    it('should validate correct environment configuration', () => {
      const result = environmentSchema.parse(validEnvironment)
      expect(result).toEqual(validEnvironment)
    })

    it('should validate NODE_ENV values', () => {
      const validEnvs = ['development', 'production', 'test'] as const

      validEnvs.forEach(NODE_ENV => {
        const env = { ...validEnvironment, NODE_ENV }
        expect(() => environmentSchema.parse(env)).not.toThrow()
      })

      const invalidEnv = { ...validEnvironment, NODE_ENV: 'staging' }
      expect(() => environmentSchema.parse(invalidEnv)).toThrow(ZodError)
    })

    it('should validate URL formats', () => {
      const invalidUrls = [
        'not-a-url',
        'http://invalid url with spaces',
        'ftp://not-http-or-https.com'
      ]

      invalidUrls.forEach(url => {
        const env = { ...validEnvironment, DATABASE_URL: url }
        expect(() => environmentSchema.parse(env)).toThrow(ZodError)
      })
    })

    it('should validate JWT secret length', () => {
      const shortSecret = 'a'.repeat(31) // Too short
      const env = { ...validEnvironment, JWT_SECRET: shortSecret }
      
      expect(() => environmentSchema.parse(env)).toThrow(ZodError)
    })

    it('should validate WebSocket port range', () => {
      const invalidPorts = [999, 65536, 1.5] // Too small, too large, not integer

      invalidPorts.forEach(WEBSOCKET_PORT => {
        const env = { ...validEnvironment, WEBSOCKET_PORT }
        expect(() => environmentSchema.parse(env)).toThrow(ZodError)
      })
    })

    it('should default LOG_LEVEL to info', () => {
      const envWithoutLogLevel = { ...validEnvironment }
      delete (envWithoutLogLevel as any).LOG_LEVEL

      const result = environmentSchema.parse(envWithoutLogLevel)
      expect(result.LOG_LEVEL).toBe('info')
    })
  })

  describe('Rate Limit Schema', () => {
    const validRateLimit = {
      identifier: 'user-123',
      windowMs: 60000, // 1 minute
      maxRequests: 100,
      skipSuccessful: false,
      skipFailed: false
    }

    it('should validate correct rate limit configuration', () => {
      const result = rateLimitSchema.parse(validRateLimit)
      expect(result).toEqual(validRateLimit)
    })

    it('should validate window constraints', () => {
      const invalidWindows = [
        999, // Too short (< 1 second)
        3600001 // Too long (> 1 hour)
      ]

      invalidWindows.forEach(windowMs => {
        const config = { ...validRateLimit, windowMs }
        expect(() => rateLimitSchema.parse(config)).toThrow(ZodError)
      })
    })

    it('should validate request count constraints', () => {
      const invalidCounts = [0, 10001] // Too small, too large

      invalidCounts.forEach(maxRequests => {
        const config = { ...validRateLimit, maxRequests }
        expect(() => rateLimitSchema.parse(config)).toThrow(ZodError)
      })
    })

    it('should default skip flags to false', () => {
      const configWithoutSkipFlags = {
        identifier: 'user-123',
        windowMs: 60000,
        maxRequests: 100
      }

      const result = rateLimitSchema.parse(configWithoutSkipFlags)
      expect(result.skipSuccessful).toBe(false)
      expect(result.skipFailed).toBe(false)
    })
  })

  describe('Schema Registry', () => {
    it('should contain all expected schemas', () => {
      const expectedSchemas = [
        'userRegistration', 'userLogin', 'userProfileUpdate',
        'gameConfig', 'homeGameCreate', 'homeGameUpdate',
        'sessionCreate', 'sessionJoin', 'playerAction',
        'webSocketMessage', 'chatMessage', 'transaction',
        'adminUserUpdate', 'adminGameModeration',
        'pagination', 'search', 'idParam', 'inviteCode',
        'statisticsQuery', 'apiResponse', 'errorResponse',
        'environment', 'fileUpload', 'rateLimit',
        'card', 'gameState'
      ]

      expectedSchemas.forEach(schemaName => {
        expect(schemaRegistry).toHaveProperty(schemaName)
        expect(schemaRegistry[schemaName as keyof typeof schemaRegistry]).toBeDefined()
      })
    })

    it('should allow dynamic schema access', () => {
      const userSchema = schemaRegistry.userRegistration
      const validUser = {
        email: 'test@example.com',
        username: 'testuser',
        password: 'SecurePass123!'
      }

      expect(() => userSchema.parse(validUser)).not.toThrow()
    })
  })

  describe('Error Response Schema', () => {
    const validErrorResponse = {
      success: false as const,
      error: 'Validation failed',
      details: [
        {
          field: 'email',
          message: 'Invalid email format',
          received: 'invalid-email'
        }
      ],
      timestamp: new Date().toISOString(),
      requestId: '550e8400-e29b-41d4-a716-446655440000'
    }

    it('should validate correct error response', () => {
      const result = errorResponseSchema.parse(validErrorResponse)
      expect(result).toEqual(validErrorResponse)
    })

    it('should enforce success to be false', () => {
      const invalidResponse = {
        ...validErrorResponse,
        success: true
      }

      expect(() => errorResponseSchema.parse(invalidResponse)).toThrow(ZodError)
    })

    it('should make details optional', () => {
      const responseWithoutDetails = {
        success: false as const,
        error: 'Internal server error',
        timestamp: new Date().toISOString()
      }

      expect(() => errorResponseSchema.parse(responseWithoutDetails)).not.toThrow()
    })
  })

  describe('Performance Tests', () => {
    it('should validate schemas efficiently', () => {
      const testData = {
        email: 'test@example.com',
        username: 'testuser',
        password: 'SecurePass123!'
      }

      const startTime = performance.now()

      for (let i = 0; i < 1000; i++) {
        userRegistrationSchema.parse(testData)
      }

      const endTime = performance.now()
      const executionTime = endTime - startTime

      // Should validate 1000 schemas quickly (< 100ms)
      expect(executionTime).toBeLessThan(100)
    })

    it('should handle complex schema validation efficiently', () => {
      const complexData = {
        dealerPosition: 1,
        smallBlindPosition: 2,
        bigBlindPosition: 3,
        currentBettingRound: 'flop' as const,
        communityCards: [
          { suit: 'hearts', rank: 'A' },
          { suit: 'diamonds', rank: 'K' },
          { suit: 'clubs', rank: 'Q' }
        ],
        sidePots: [
          {
            amount: 150.75,
            eligiblePlayers: [
              '550e8400-e29b-41d4-a716-446655440000',
              '550e8400-e29b-41d4-a716-446655440001'
            ]
          }
        ],
        currentBet: 50.00,
        minRaise: 50.00
      }

      const startTime = performance.now()

      for (let i = 0; i < 1000; i++) {
        gameStateSchema.parse(complexData)
      }

      const endTime = performance.now()
      const executionTime = endTime - startTime

      // Should validate 1000 complex schemas reasonably quickly (< 200ms)
      expect(executionTime).toBeLessThan(200)
    })
  })
})