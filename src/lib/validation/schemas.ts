import { z } from 'zod'

// ============= CORE VALIDATION SCHEMAS =============

// User input validation
export const userRegistrationSchema = z.object({
  email: z.string()
    .email('Invalid email format')
    .min(5, 'Email too short')
    .max(255, 'Email too long')
    .transform(email => email.toLowerCase().trim()),
  
  username: z.string()
    .min(3, 'Username must be at least 3 characters')
    .max(50, 'Username too long')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Username contains invalid characters')
    .transform(username => username.toLowerCase().trim()),
  
  password: z.string()
    .min(12, 'Password must be at least 12 characters')
    .max(128, 'Password too long')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, 
           'Password must contain uppercase, lowercase, number, and special character'),
  
  displayName: z.string()
    .min(2, 'Display name too short')
    .max(100, 'Display name too long')
    .regex(/^[a-zA-Z0-9\s_-]+$/, 'Display name contains invalid characters')
    .transform(name => name.trim())
    .optional()
})

export const userLoginSchema = z.object({
  email: z.string()
    .email('Invalid email format')
    .transform(email => email.toLowerCase().trim()),
  
  password: z.string()
    .min(1, 'Password is required')
    .max(128, 'Password too long'),
    
  rememberMe: z.boolean().optional()
})

export const userProfileUpdateSchema = z.object({
  displayName: z.string()
    .min(2, 'Display name too short')
    .max(100, 'Display name too long')
    .regex(/^[a-zA-Z0-9\s_-]+$/, 'Display name contains invalid characters')
    .transform(name => name.trim())
    .optional(),
    
  bio: z.string()
    .max(500, 'Bio too long')
    .transform(bio => bio.trim())
    .optional(),
    
  avatarUrl: z.string()
    .url('Invalid avatar URL')
    .optional(),
    
  preferences: z.object({
    theme: z.enum(['light', 'dark', 'system']).optional(),
    soundEnabled: z.boolean().optional(),
    notificationsEnabled: z.boolean().optional(),
    autoMuck: z.boolean().optional(),
    showHandStrength: z.boolean().optional()
  }).optional(),
  
  privacySettings: z.object({
    showStats: z.boolean().optional(),
    showOnlineStatus: z.boolean().optional(),
    allowFriendRequests: z.boolean().optional()
  }).optional()
})

// ============= GAME VALIDATION SCHEMAS =============

export const gameConfigSchema = z.object({
  gameVariant: z.enum(['texas_holdem', 'omaha', 'seven_card_stud']),
  bettingStructure: z.enum(['no_limit', 'pot_limit', 'fixed_limit']),
  smallBlind: z.number()
    .min(0.01, 'Small blind too small')
    .max(1000000, 'Small blind too large')
    .multipleOf(0.01, 'Invalid blind increment'),
  
  bigBlind: z.number()
    .min(0.02, 'Big blind too small')
    .max(2000000, 'Big blind too large')
    .multipleOf(0.01, 'Invalid blind increment'),
  
  ante: z.number()
    .min(0, 'Ante cannot be negative')
    .max(100000, 'Ante too large')
    .multipleOf(0.01, 'Invalid ante increment')
    .optional()
    .default(0),
  
  timeLimit: z.number()
    .int('Time limit must be integer')
    .min(5, 'Time limit too short')
    .max(300, 'Time limit too long')
    .optional()
}).refine(data => data.bigBlind >= data.smallBlind * 2, {
  message: 'Big blind must be at least 2x small blind',
  path: ['bigBlind']
})

export const homeGameCreateSchema = z.object({
  name: z.string()
    .min(3, 'Game name too short')
    .max(100, 'Game name too long')
    .regex(/^[a-zA-Z0-9\s_-]+$/, 'Game name contains invalid characters')
    .transform(name => name.trim()),
    
  description: z.string()
    .max(500, 'Description too long')
    .transform(desc => desc.trim())
    .optional(),
    
  gameType: z.enum(['texas_holdem', 'omaha', 'seven_card_stud']),
  
  settings: z.object({
    smallBlind: z.number()
      .min(0.01, 'Small blind too small')
      .max(1000000, 'Small blind too large')
      .multipleOf(0.01, 'Invalid blind increment'),
    
    bigBlind: z.number()
      .min(0.02, 'Big blind too small')
      .max(2000000, 'Big blind too large')
      .multipleOf(0.01, 'Invalid blind increment'),
    
    maxPlayers: z.number()
      .int('Max players must be integer')
      .min(2, 'At least 2 players required')
      .max(10, 'Maximum 10 players allowed'),
    
    buyInMin: z.number()
      .min(1, 'Minimum buy-in too small')
      .max(1000000, 'Buy-in too large'),
    
    buyInMax: z.number()
      .min(1, 'Maximum buy-in too small')
      .max(10000000, 'Buy-in too large'),
    
    allowRebuys: z.boolean(),
    
    timeBank: z.number()
      .int('Time bank must be integer')
      .min(5, 'Time bank too short')
      .max(300, 'Time bank too long'),
    
    specialRules: z.object({
      runItTwice: z.boolean().optional().default(false),
      sevenTwoBonus: z.boolean().optional().default(false),
      straddleAllowed: z.boolean().optional().default(false),
      ante: z.number()
        .min(0, 'Ante cannot be negative')
        .max(100000, 'Ante too large')
        .multipleOf(0.01, 'Invalid ante increment')
        .optional()
        .default(0)
    }).optional()
  }).refine(data => data.bigBlind >= data.smallBlind * 2, {
    message: 'Big blind must be at least 2x small blind',
    path: ['bigBlind']
  }).refine(data => data.buyInMax >= data.buyInMin, {
    message: 'Maximum buy-in must be >= minimum buy-in',
    path: ['buyInMax']
  })
})

export const homeGameUpdateSchema = homeGameCreateSchema.partial()

// ============= SESSION VALIDATION SCHEMAS =============

export const sessionCreateSchema = z.object({
  homeGameId: z.string().uuid('Invalid home game ID'),
  sessionType: z.enum(['cash_game', 'tournament', 'sit_n_go']),
  gameConfig: gameConfigSchema
})

export const sessionJoinSchema = z.object({
  sessionId: z.string().uuid('Invalid session ID'),
  buyInAmount: z.number()
    .min(1, 'Buy-in amount too small')
    .max(10000000, 'Buy-in amount too large')
    .multipleOf(0.01, 'Invalid buy-in increment'),
  seatNumber: z.number()
    .int('Seat number must be integer')
    .min(1, 'Invalid seat number')
    .max(10, 'Invalid seat number')
    .optional()
})

// ============= PLAYER ACTION VALIDATION SCHEMAS =============

export const playerActionSchema = z.object({
  action: z.enum(['fold', 'check', 'call', 'raise', 'bet', 'all_in']),
  amount: z.number()
    .min(0, 'Amount cannot be negative')
    .max(10000000, 'Amount too large')
    .multipleOf(0.01, 'Invalid amount increment')
    .optional(),
  
  sessionId: z.string().uuid('Invalid session ID'),
  handId: z.string().uuid('Invalid hand ID').optional(),
  timestamp: z.string().datetime('Invalid timestamp')
}).refine(data => {
  if (['raise', 'bet', 'all_in'].includes(data.action)) {
    return data.amount !== undefined && data.amount > 0
  }
  return true
}, {
  message: 'Amount required for raise, bet, or all-in actions',
  path: ['amount']
})

// ============= WEBSOCKET MESSAGE VALIDATION SCHEMAS =============

export const webSocketMessageSchema = z.object({
  type: z.enum([
    'join_room', 'leave_room', 'game_action', 'chat_message', 
    'ping', 'reconnect', 'get_state', 'player_update'
  ]),
  payload: z.record(z.any()).optional(),
  timestamp: z.string().datetime('Invalid timestamp'),
  messageId: z.string().uuid('Invalid message ID')
})

export const chatMessageSchema = z.object({
  text: z.string()
    .min(1, 'Message cannot be empty')
    .max(500, 'Message too long')
    .trim(),
  
  type: z.enum(['public', 'private', 'system']).default('public'),
  targetUserId: z.string().uuid().optional(),
  sessionId: z.string().uuid('Invalid session ID')
}).refine(data => {
  if (data.type === 'private') {
    return data.targetUserId !== undefined
  }
  return true
}, {
  message: 'Target user required for private messages',
  path: ['targetUserId']
})

// ============= FINANCIAL VALIDATION SCHEMAS =============

export const transactionSchema = z.object({
  transactionType: z.enum([
    'buy_in', 'cash_out', 'deposit', 'withdrawal', 
    'transfer', 'fee', 'rake', 'tip', 'settlement'
  ]),
  amount: z.number()
    .min(0.01, 'Amount too small')
    .max(1000000, 'Amount too large')
    .multipleOf(0.01, 'Invalid amount increment'),
  currency: z.string()
    .length(3, 'Invalid currency code')
    .regex(/^[A-Z]{3}$/, 'Currency must be 3 uppercase letters')
    .default('USD'),
  homeGameId: z.string().uuid().optional(),
  sessionId: z.string().uuid().optional(),
  paymentMethod: z.string().max(50).optional(),
  transactionData: z.record(z.any()).optional()
})

// ============= ADMIN VALIDATION SCHEMAS =============

export const adminUserUpdateSchema = z.object({
  userId: z.string().uuid('Invalid user ID'),
  updates: z.object({
    emailVerified: z.boolean().optional(),
    status: z.enum(['active', 'suspended', 'banned']).optional(),
    role: z.enum(['user', 'moderator', 'admin']).optional(),
    metadata: z.record(z.any()).optional()
  })
})

export const adminGameModerationSchema = z.object({
  gameId: z.string().uuid('Invalid game ID'),
  action: z.enum(['suspend', 'resume', 'archive', 'delete']),
  reason: z.string()
    .min(10, 'Reason too short')
    .max(500, 'Reason too long')
    .optional(),
  duration: z.number()
    .int('Duration must be integer')
    .min(1, 'Duration too short')
    .max(365, 'Duration too long')
    .optional() // Duration in days
})

export const adminUserSchema = z.object({
  email: z.string()
    .email('Invalid email format')
    .min(5, 'Email too short')
    .max(255, 'Email too long')
    .transform(email => email.toLowerCase().trim()),
  
  username: z.string()
    .min(3, 'Username must be at least 3 characters')
    .max(50, 'Username too long')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Username contains invalid characters')
    .transform(username => username.toLowerCase().trim()),
  
  password: z.string()
    .min(12, 'Password must be at least 12 characters')
    .max(128, 'Password too long')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, 
           'Password must contain uppercase, lowercase, number, and special character'),
  
  role: z.enum(['super_admin', 'admin', 'moderator', 'game_owner', 'game_admin', 'member', 'user']).optional(),
  
  isActive: z.boolean().default(true),
  
  twoFactorEnabled: z.boolean().default(false)
})

export const userUpdateSchema = z.object({
  email: z.string()
    .email('Invalid email format')
    .min(5, 'Email too short')
    .max(255, 'Email too long')
    .transform(email => email.toLowerCase().trim())
    .optional(),
  
  username: z.string()
    .min(3, 'Username must be at least 3 characters')
    .max(50, 'Username too long')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Username contains invalid characters')
    .transform(username => username.toLowerCase().trim())
    .optional(),
  
  role: z.enum(['super_admin', 'admin', 'moderator', 'game_owner', 'game_admin', 'member', 'user']).optional(),
  
  isActive: z.boolean().optional(),
  
  email_verified: z.boolean().optional(),
  
  twoFactorEnabled: z.boolean().optional()
})

// ============= QUERY PARAMETER VALIDATION SCHEMAS =============

export const paginationSchema = z.object({
  page: z.coerce.number()
    .int('Page must be integer')
    .min(1, 'Page must be at least 1')
    .max(10000, 'Page too large')
    .default(1),
  limit: z.coerce.number()
    .int('Limit must be integer')
    .min(1, 'Limit too small')
    .max(100, 'Limit too large')
    .default(20),
  sortBy: z.string()
    .regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/, 'Invalid sort field')
    .optional(),
  sortOrder: z.enum(['asc', 'desc']).default('asc')
})

export const searchSchema = z.object({
  query: z.string()
    .min(1, 'Search query too short')
    .max(100, 'Search query too long')
    .transform(q => q.trim()),
  filters: z.record(z.string()).optional(),
  ...paginationSchema.shape
})

export const idParamSchema = z.object({
  id: z.string().uuid('Invalid ID format')
})

export const inviteCodeSchema = z.object({
  inviteCode: z.string()
    .length(8, 'Invalid invite code length')
    .regex(/^[A-Z0-9]{8}$/, 'Invalid invite code format')
})

// ============= STATISTICS VALIDATION SCHEMAS =============

export const statisticsQuerySchema = z.object({
  userId: z.string().uuid().optional(),
  homeGameId: z.string().uuid().optional(),
  periodType: z.enum(['daily', 'weekly', 'monthly', 'yearly', 'all_time', 'custom']),
  periodStart: z.string().datetime().optional(),
  periodEnd: z.string().datetime().optional(),
  includeDetails: z.boolean().default(false)
}).refine(data => {
  if (data.periodType === 'custom') {
    return data.periodStart && data.periodEnd
  }
  return true
}, {
  message: 'Period start and end required for custom period type',
  path: ['periodStart']
})

// ============= API RESPONSE VALIDATION SCHEMAS =============

export const apiResponseSchema = z.object({
  success: z.boolean(),
  data: z.any().optional(),
  error: z.string().optional(),
  message: z.string().optional(),
  timestamp: z.string().datetime(),
  requestId: z.string().uuid().optional()
})

export const errorResponseSchema = z.object({
  success: z.literal(false),
  error: z.string(),
  details: z.array(z.object({
    field: z.string(),
    message: z.string(),
    received: z.any().optional()
  })).optional(),
  timestamp: z.string().datetime(),
  requestId: z.string().uuid().optional()
})

// ============= ENVIRONMENT VALIDATION SCHEMA =============

export const environmentSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']),
  DATABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  REDIS_URL: z.string().url().optional(),
  WEBSOCKET_PORT: z.coerce.number().int().min(1000).max(65535).optional(),
  JWT_SECRET: z.string().min(32),
  ALLOWED_ORIGINS: z.string().optional(),
  RATE_LIMIT_REDIS_URL: z.string().url().optional(),
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info')
})

// ============= UTILITY SCHEMAS =============

export const fileUploadSchema = z.object({
  fileName: z.string()
    .min(1, 'File name required')
    .max(255, 'File name too long')
    .regex(/^[a-zA-Z0-9._-]+$/, 'Invalid file name'),
  fileSize: z.number()
    .int('File size must be integer')
    .min(1, 'File too small')
    .max(5 * 1024 * 1024, 'File too large (max 5MB)'),
  mimeType: z.string()
    .regex(/^[a-zA-Z0-9][a-zA-Z0-9!#$&\-\^_]*\/[a-zA-Z0-9][a-zA-Z0-9!#$&\-\^_.]*$/, 'Invalid MIME type')
})

export const rateLimitSchema = z.object({
  identifier: z.string().min(1).max(255),
  windowMs: z.number().int().min(1000).max(3600000), // 1s to 1h
  maxRequests: z.number().int().min(1).max(10000),
  skipSuccessful: z.boolean().default(false),
  skipFailed: z.boolean().default(false)
})

// ============= CARD AND GAME STATE VALIDATION =============

export const cardSchema = z.object({
  suit: z.enum(['hearts', 'diamonds', 'clubs', 'spades']),
  rank: z.enum(['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A'])
})

export const gameStateSchema = z.object({
  dealerPosition: z.number().int().min(1).max(10),
  smallBlindPosition: z.number().int().min(1).max(10),
  bigBlindPosition: z.number().int().min(1).max(10),
  currentBettingRound: z.enum(['preflop', 'flop', 'turn', 'river', 'showdown']),
  communityCards: z.array(cardSchema).max(5),
  sidePots: z.array(z.object({
    amount: z.number().min(0),
    eligiblePlayers: z.array(z.string().uuid())
  })),
  actionOn: z.string().uuid().optional(),
  currentBet: z.number().min(0),
  minRaise: z.number().min(0)
})

// ============= EXPORTED VALIDATION HELPERS =============

export type UserRegistration = z.infer<typeof userRegistrationSchema>
export type UserLogin = z.infer<typeof userLoginSchema>
export type UserProfileUpdate = z.infer<typeof userProfileUpdateSchema>
export type GameConfig = z.infer<typeof gameConfigSchema>
export type HomeGameCreate = z.infer<typeof homeGameCreateSchema>
export type HomeGameUpdate = z.infer<typeof homeGameUpdateSchema>
export type SessionCreate = z.infer<typeof sessionCreateSchema>
export type SessionJoin = z.infer<typeof sessionJoinSchema>
export type PlayerAction = z.infer<typeof playerActionSchema>
export type WebSocketMessage = z.infer<typeof webSocketMessageSchema>
export type ChatMessage = z.infer<typeof chatMessageSchema>
export type Transaction = z.infer<typeof transactionSchema>
export type AdminUserUpdate = z.infer<typeof adminUserUpdateSchema>
export type AdminGameModeration = z.infer<typeof adminGameModerationSchema>
export type Pagination = z.infer<typeof paginationSchema>
export type Search = z.infer<typeof searchSchema>
export type IdParam = z.infer<typeof idParamSchema>
export type InviteCode = z.infer<typeof inviteCodeSchema>
export type StatisticsQuery = z.infer<typeof statisticsQuerySchema>
export type ApiResponse = z.infer<typeof apiResponseSchema>
export type ErrorResponse = z.infer<typeof errorResponseSchema>
export type Environment = z.infer<typeof environmentSchema>
export type FileUpload = z.infer<typeof fileUploadSchema>
export type RateLimit = z.infer<typeof rateLimitSchema>
export type Card = z.infer<typeof cardSchema>
export type GameState = z.infer<typeof gameStateSchema>

// Schema registry for dynamic access
export const schemaRegistry = {
  userRegistration: userRegistrationSchema,
  userLogin: userLoginSchema,
  userProfileUpdate: userProfileUpdateSchema,
  gameConfig: gameConfigSchema,
  homeGameCreate: homeGameCreateSchema,
  homeGameUpdate: homeGameUpdateSchema,
  sessionCreate: sessionCreateSchema,
  sessionJoin: sessionJoinSchema,
  playerAction: playerActionSchema,
  webSocketMessage: webSocketMessageSchema,
  chatMessage: chatMessageSchema,
  transaction: transactionSchema,
  adminUserUpdate: adminUserUpdateSchema,
  adminGameModeration: adminGameModerationSchema,
  pagination: paginationSchema,
  search: searchSchema,
  idParam: idParamSchema,
  inviteCode: inviteCodeSchema,
  statisticsQuery: statisticsQuerySchema,
  apiResponse: apiResponseSchema,
  errorResponse: errorResponseSchema,
  environment: environmentSchema,
  fileUpload: fileUploadSchema,
  rateLimit: rateLimitSchema,
  card: cardSchema,
  gameState: gameStateSchema
} as const

export type SchemaName = keyof typeof schemaRegistry