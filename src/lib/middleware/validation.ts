import { NextRequest, NextResponse } from 'next/server'
import { ZodSchema, ZodError } from 'zod'
import { errorResponseSchema } from '@/lib/validation/schemas'

/**
 * Validation middleware for API endpoints
 * Validates request body, query parameters, and headers
 */
export function validateRequest<T>(
  schema: ZodSchema<T>,
  options: {
    source?: 'body' | 'query' | 'params' | 'headers'
    sanitize?: boolean
    allowEmpty?: boolean
  } = {}
) {
  const { source = 'body', sanitize = true, allowEmpty = false } = options

  return async (request: NextRequest): Promise<NextResponse | null> => {
    try {
      let data: any

      // Extract data based on source
      switch (source) {
        case 'body':
          data = await extractRequestBody(request)
          break
        case 'query':
          data = Object.fromEntries(new URL(request.url).searchParams.entries())
          break
        case 'params':
          // URL params would be extracted by the caller and passed in context
          data = (request as any).params || {}
          break
        case 'headers':
          data = Object.fromEntries(request.headers.entries())
          break
        default:
          throw new Error(`Invalid validation source: ${source}`)
      }

      // Handle empty data
      if (!data || (typeof data === 'object' && Object.keys(data).length === 0)) {
        if (!allowEmpty) {
          return createErrorResponse('Request data is required', 400, 'VALIDATION_ERROR')
        }
        data = {}
      }

      // Sanitize input if requested
      if (sanitize && typeof data === 'object') {
        data = sanitizeInput(data)
      }

      // Validate against schema
      const validatedData = schema.parse(data)
      
      // Attach validated data to request for use in handlers
      ;(request as any).validatedData = validatedData
      
      return null // Continue to handler
      
    } catch (error) {
      if (error instanceof ZodError) {
        return createValidationErrorResponse(error)
      }
      
      console.error('Validation middleware error:', error)
      return createErrorResponse('Invalid request format', 400, 'VALIDATION_ERROR')
    }
  }
}

/**
 * Extract request body with proper content type handling
 */
async function extractRequestBody(request: NextRequest): Promise<any> {
  const contentType = request.headers.get('content-type') || ''
  
  if (contentType.includes('application/json')) {
    try {
      return await request.json()
    } catch (error) {
      throw new Error('Invalid JSON in request body')
    }
  }
  
  if (contentType.includes('application/x-www-form-urlencoded')) {
    const formData = await request.formData()
    return Object.fromEntries(formData.entries())
  }
  
  if (contentType.includes('multipart/form-data')) {
    const formData = await request.formData()
    const data: Record<string, any> = {}
    
    for (const [key, value] of formData.entries()) {
      if (value instanceof File) {
        data[key] = {
          name: value.name,
          size: value.size,
          type: value.type,
          file: value
        }
      } else {
        data[key] = value
      }
    }
    
    return data
  }
  
  // Default to attempting JSON parse
  try {
    const text = await request.text()
    return text ? JSON.parse(text) : {}
  } catch {
    throw new Error('Unsupported content type or invalid data format')
  }
}

/**
 * Sanitize input data to prevent XSS and injection attacks
 */
function sanitizeInput(data: any): any {
  if (data === null || data === undefined) {
    return data
  }
  
  if (typeof data === 'string') {
    return sanitizeString(data)
  }
  
  if (typeof data === 'number' || typeof data === 'boolean') {
    return data
  }
  
  if (Array.isArray(data)) {
    return data.map(item => sanitizeInput(item))
  }
  
  if (typeof data === 'object') {
    const sanitized: Record<string, any> = {}
    for (const [key, value] of Object.entries(data)) {
      // Sanitize key names to prevent prototype pollution
      const sanitizedKey = sanitizeString(key).replace(/^__proto__$|^constructor$|^prototype$/, '_SANITIZED_')
      sanitized[sanitizedKey] = sanitizeInput(value)
    }
    return sanitized
  }
  
  return data
}

/**
 * Sanitize string values
 */
function sanitizeString(str: string): string {
  return str
    // Remove null bytes
    .replace(/\0/g, '')
    // Remove or escape potential XSS patterns (basic)
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+=/gi, '')
    // Normalize whitespace
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Create validation error response
 */
function createValidationErrorResponse(error: ZodError): NextResponse {
  const details = error.errors.map(err => ({
    field: err.path.join('.'),
    message: err.message,
    received: err.received
  }))

  const errorResponse = {
    success: false,
    error: 'Validation failed',
    details,
    timestamp: new Date().toISOString(),
    requestId: crypto.randomUUID()
  }

  return NextResponse.json(errorResponse, { status: 400 })
}

/**
 * Create generic error response
 */
function createErrorResponse(message: string, status: number, code?: string): NextResponse {
  const errorResponse = {
    success: false,
    error: message,
    code,
    timestamp: new Date().toISOString(),
    requestId: crypto.randomUUID()
  }

  return NextResponse.json(errorResponse, { status })
}

/**
 * Validate WebSocket messages
 */
export function validateWebSocketMessage<T>(
  schema: ZodSchema<T>,
  message: any
): { isValid: boolean; data?: T; errors?: string[] } {
  try {
    const validatedData = schema.parse(message)
    return { isValid: true, data: validatedData }
  } catch (error) {
    if (error instanceof ZodError) {
      const errors = error.errors.map(err => `${err.path.join('.')}: ${err.message}`)
      return { isValid: false, errors }
    }
    return { isValid: false, errors: ['Invalid message format'] }
  }
}

/**
 * Compose multiple validation middlewares
 */
export function composeValidators(...validators: Array<(req: NextRequest) => Promise<NextResponse | null>>) {
  return async (request: NextRequest): Promise<NextResponse | null> => {
    for (const validator of validators) {
      const result = await validator(request)
      if (result) {
        return result // Return error response if validation fails
      }
    }
    return null // All validations passed
  }
}

/**
 * Rate limiting validation
 */
export function validateRateLimit(
  keyExtractor: (req: NextRequest) => string,
  windowMs: number,
  maxRequests: number
) {
  const requestCounts = new Map<string, { count: number; resetTime: number }>()

  return async (request: NextRequest): Promise<NextResponse | null> => {
    const key = keyExtractor(request)
    const now = Date.now()
    
    // Clean up expired entries
    for (const [k, v] of requestCounts.entries()) {
      if (now > v.resetTime) {
        requestCounts.delete(k)
      }
    }
    
    const current = requestCounts.get(key)
    
    if (!current) {
      requestCounts.set(key, { count: 1, resetTime: now + windowMs })
      return null
    }
    
    if (current.count >= maxRequests) {
      const retryAfter = Math.ceil((current.resetTime - now) / 1000)
      
      return NextResponse.json(
        {
          success: false,
          error: 'Rate limit exceeded',
          retryAfter,
          timestamp: new Date().toISOString()
        },
        {
          status: 429,
          headers: {
            'Retry-After': String(retryAfter),
            'X-RateLimit-Limit': String(maxRequests),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': String(Math.ceil(current.resetTime / 1000))
          }
        }
      )
    }
    
    current.count++
    return null
  }
}

/**
 * Authentication validation
 */
export function validateAuthentication() {
  return async (request: NextRequest): Promise<NextResponse | null> => {
    const authHeader = request.headers.get('authorization')
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return createErrorResponse('Authentication required', 401, 'AUTH_REQUIRED')
    }
    
    const token = authHeader.substring(7)
    
    if (!token) {
      return createErrorResponse('Invalid authentication token', 401, 'INVALID_TOKEN')
    }
    
    // TODO: Implement actual token validation
    // For now, just check if token exists
    ;(request as any).authToken = token
    
    return null
  }
}

/**
 * Permission validation
 */
export function validatePermission(requiredPermission: string) {
  return async (request: NextRequest): Promise<NextResponse | null> => {
    const authToken = (request as any).authToken
    
    if (!authToken) {
      return createErrorResponse('Authentication required', 401, 'AUTH_REQUIRED')
    }
    
    // TODO: Implement actual permission checking
    // For now, assume admin tokens have all permissions
    if (authToken.includes('admin')) {
      return null
    }
    
    return createErrorResponse('Insufficient permissions', 403, 'INSUFFICIENT_PERMISSIONS')
  }
}

/**
 * CORS validation
 */
export function validateCORS(allowedOrigins: string[] = []) {
  return async (request: NextRequest): Promise<NextResponse | null> => {
    const origin = request.headers.get('origin')
    
    if (!origin) {
      return null // Same-origin requests don't have origin header
    }
    
    if (allowedOrigins.length === 0) {
      return null // Allow all origins if none specified
    }
    
    if (!allowedOrigins.includes(origin)) {
      return createErrorResponse('CORS policy violation', 403, 'CORS_ERROR')
    }
    
    return null
  }
}

/**
 * Content-Type validation
 */
export function validateContentType(allowedTypes: string[]) {
  return async (request: NextRequest): Promise<NextResponse | null> => {
    const contentType = request.headers.get('content-type')
    
    if (!contentType) {
      return createErrorResponse('Content-Type header required', 400, 'MISSING_CONTENT_TYPE')
    }
    
    const isAllowed = allowedTypes.some(type => contentType.includes(type))
    
    if (!isAllowed) {
      return createErrorResponse(
        `Unsupported Content-Type. Allowed: ${allowedTypes.join(', ')}`,
        415,
        'UNSUPPORTED_MEDIA_TYPE'
      )
    }
    
    return null
  }
}

/**
 * Helper to create a complete validation pipeline
 */
export function createValidationPipeline(config: {
  schema?: ZodSchema<any>
  source?: 'body' | 'query' | 'params' | 'headers'
  requireAuth?: boolean
  requiredPermission?: string
  rateLimit?: { windowMs: number; maxRequests: number }
  allowedOrigins?: string[]
  allowedContentTypes?: string[]
}) {
  const validators: Array<(req: NextRequest) => Promise<NextResponse | null>> = []

  // CORS validation
  if (config.allowedOrigins) {
    validators.push(validateCORS(config.allowedOrigins))
  }

  // Content-Type validation
  if (config.allowedContentTypes) {
    validators.push(validateContentType(config.allowedContentTypes))
  }

  // Rate limiting
  if (config.rateLimit) {
    validators.push(validateRateLimit(
      (req) => req.ip || req.headers.get('x-forwarded-for') || 'unknown',
      config.rateLimit.windowMs,
      config.rateLimit.maxRequests
    ))
  }

  // Authentication
  if (config.requireAuth) {
    validators.push(validateAuthentication())
  }

  // Permission check
  if (config.requiredPermission) {
    validators.push(validatePermission(config.requiredPermission))
  }

  // Schema validation
  if (config.schema) {
    validators.push(validateRequest(config.schema, { source: config.source }))
  }

  return composeValidators(...validators)
}

/**
 * Environment variable validation
 */
export function validateEnvironment() {
  const { environmentSchema } = require('@/lib/validation/schemas')
  
  try {
    const env = environmentSchema.parse(process.env)
    return { isValid: true, env }
  } catch (error) {
    if (error instanceof ZodError) {
      const errors = error.errors.map(err => `${err.path.join('.')}: ${err.message}`)
      return { isValid: false, errors }
    }
    return { isValid: false, errors: ['Environment validation failed'] }
  }
}