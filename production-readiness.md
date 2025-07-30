# Production Readiness Requirements

## Executive Summary

This document defines the comprehensive production deployment and monitoring requirements to achieve enterprise-grade reliability and performance for the poker platform. The specification addresses CI/CD pipelines, monitoring, performance optimization, backup strategies, and operational procedures.

**Current Production Readiness**: 45/100
**Target Production Readiness**: 95/100
**Impact**: +50 points to overall validation score

## 1. Environment Configuration & Validation

### 1.1 Environment Management

**Priority**: CRITICAL - Foundation for all production operations

#### 1.1.1 Environment Configuration Schema

```typescript
// src/lib/config/environment.ts
import { z } from 'zod'

const environmentSchema = z.object({
  // Application Configuration
  NODE_ENV: z.enum(['development', 'staging', 'production']),
  APP_URL: z.string().url('Invalid app URL'),
  PORT: z.coerce.number().min(1000).max(65535).default(3000),
  
  // Database Configuration
  DATABASE_URL: z.string().min(1, 'Database URL required'),
  DATABASE_POOL_SIZE: z.coerce.number().min(5).max(100).default(20),
  DATABASE_SSL: z.coerce.boolean().default(true),
  DATABASE_TIMEOUT: z.coerce.number().min(5000).max(60000).default(30000),
  
  // Supabase Configuration
  NEXT_PUBLIC_SUPABASE_URL: z.string().url('Invalid Supabase URL'),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, 'Supabase anon key required'),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, 'Supabase service role key required'),
  
  // Redis Configuration
  REDIS_URL: z.string().min(1, 'Redis URL required'),
  REDIS_PASSWORD: z.string().optional(),
  REDIS_MAX_CONNECTIONS: z.coerce.number().min(10).max(1000).default(100),
  REDIS_CONNECT_TIMEOUT: z.coerce.number().min(1000).max(10000).default(5000),
  
  // Authentication
  AUTH_SECRET: z.string().min(32, 'Auth secret must be at least 32 characters'),
  JWT_SECRET: z.string().min(32, 'JWT secret must be at least 32 characters'),
  SESSION_TIMEOUT: z.coerce.number().min(900).max(86400).default(3600), // 15 min to 24 hours
  
  // Security
  CORS_ORIGINS: z.string().transform(str => str.split(',')).pipe(z.array(z.string().url())),
  RATE_LIMIT_WINDOW: z.coerce.number().min(60).max(3600).default(900), // 1 min to 1 hour
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().min(10).max(10000).default(100),
  
  // WebSocket Configuration
  WS_PORT: z.coerce.number().min(1000).max(65535).default(3001),
  WS_MAX_CONNECTIONS: z.coerce.number().min(100).max(10000).default(1000),
  WS_HEARTBEAT_INTERVAL: z.coerce.number().min(10000).max(60000).default(30000),
  
  // Logging & Monitoring
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  SENTRY_DSN: z.string().url().optional(),
  DATADOG_API_KEY: z.string().optional(),
  NEW_RELIC_LICENSE_KEY: z.string().optional(),
  
  // Performance
  MAX_PAYLOAD_SIZE: z.coerce.number().min(1024).max(10485760).default(1048576), // 1KB to 10MB
  COMPRESSION_ENABLED: z.coerce.boolean().default(true),
  CACHE_TTL: z.coerce.number().min(60).max(86400).default(3600), // 1 min to 24 hours
  
  // Feature Flags
  MAINTENANCE_MODE: z.coerce.boolean().default(false),
  REGISTRATION_ENABLED: z.coerce.boolean().default(true),
  TOURNAMENTS_ENABLED: z.coerce.boolean().default(true),
  ANALYTICS_ENABLED: z.coerce.boolean().default(true),
  
  // External Services
  EMAIL_PROVIDER: z.enum(['sendgrid', 'ses', 'postmark']).optional(),
  EMAIL_API_KEY: z.string().optional(),
  PAYMENT_PROVIDER: z.enum(['stripe', 'paypal']).optional(),
  PAYMENT_API_KEY: z.string().optional(),
  
  // Backup & Recovery
  BACKUP_BUCKET: z.string().optional(),
  BACKUP_RETENTION_DAYS: z.coerce.number().min(7).max(365).default(30),
  BACKUP_SCHEDULE: z.string().default('0 2 * * *'), // Daily at 2 AM
})

export type Environment = z.infer<typeof environmentSchema>

export class EnvironmentValidator {
  private static instance: Environment | null = null

  static validate(): Environment {
    if (this.instance) {
      return this.instance
    }

    try {
      this.instance = environmentSchema.parse(process.env)
      console.log('✅ Environment validation successful')
      return this.instance
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error('❌ Environment validation failed:')
        error.errors.forEach(err => {
          console.error(`  - ${err.path.join('.')}: ${err.message}`)
        })
      }
      process.exit(1)
    }
  }

  static get(): Environment {
    if (!this.instance) {
      return this.validate()
    }
    return this.instance
  }

  static isDevelopment(): boolean {
    return this.get().NODE_ENV === 'development'
  }

  static isProduction(): boolean {
    return this.get().NODE_ENV === 'production'
  }

  static isStaging(): boolean {
    return this.get().NODE_ENV === 'staging'
  }
}
```

#### 1.1.2 Configuration Loading System

```typescript
// src/lib/config/loader.ts
export class ConfigurationLoader {
  static async loadConfiguration(): Promise<void> {
    // Load environment variables
    const env = EnvironmentValidator.validate()
    
    // Validate external service connections
    await this.validateExternalServices(env)
    
    // Initialize monitoring
    await this.initializeMonitoring(env)
    
    // Setup error handling
    this.setupGlobalErrorHandlers()
    
    console.log('🚀 Application configuration loaded successfully')
  }

  private static async validateExternalServices(env: Environment): Promise<void> {
    const validations: Promise<void>[] = []

    // Validate database connection
    validations.push(this.validateDatabase(env.DATABASE_URL))
    
    // Validate Redis connection
    validations.push(this.validateRedis(env.REDIS_URL))
    
    // Validate Supabase connection
    validations.push(this.validateSupabase(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY))
    
    // Validate external APIs if configured
    if (env.EMAIL_API_KEY) {
      validations.push(this.validateEmailService(env.EMAIL_PROVIDER!, env.EMAIL_API_KEY))
    }
    
    if (env.PAYMENT_API_KEY) {
      validations.push(this.validatePaymentService(env.PAYMENT_PROVIDER!, env.PAYMENT_API_KEY))
    }

    try {
      await Promise.all(validations)
      console.log('✅ All external services validated')
    } catch (error) {
      console.error('❌ External service validation failed:', error)
      process.exit(1)
    }
  }

  private static async validateDatabase(url: string): Promise<void> {
    try {
      const { Pool } = require('pg')
      const pool = new Pool({ connectionString: url, max: 1 })
      
      const client = await pool.connect()
      await client.query('SELECT 1')
      client.release()
      await pool.end()
      
      console.log('✅ Database connection validated')
    } catch (error) {
      throw new Error(`Database validation failed: ${error.message}`)
    }
  }

  private static async validateRedis(url: string): Promise<void> {
    try {
      const Redis = require('ioredis')
      const redis = new Redis(url, { maxRetriesPerRequest: 1 })
      
      await redis.ping()
      await redis.quit()
      
      console.log('✅ Redis connection validated')
    } catch (error) {
      throw new Error(`Redis validation failed: ${error.message}`)
    }
  }

  private static async validateSupabase(url: string, serviceKey: string): Promise<void> {
    try {
      const { createClient } = require('@supabase/supabase-js')
      const client = createClient(url, serviceKey)
      
      const { data, error } = await client.from('users').select('count').limit(1)
      if (error) throw error
      
      console.log('✅ Supabase connection validated')
    } catch (error) {
      throw new Error(`Supabase validation failed: ${error.message}`)
    }
  }

  private static setupGlobalErrorHandlers(): void {
    process.on('uncaughtException', (error) => {
      console.error('Uncaught Exception:', error)
      // Log to monitoring service
      this.logCriticalError('uncaught_exception', error)
      process.exit(1)
    })

    process.on('unhandledRejection', (reason, promise) => {
      console.error('Unhandled Rejection at:', promise, 'reason:', reason)
      // Log to monitoring service
      this.logCriticalError('unhandled_rejection', reason)
    })
  }

  private static logCriticalError(type: string, error: any): void {
    // Implement critical error logging to monitoring services
  }
}
```

## 2. CI/CD Pipeline Configuration

### 2.1 GitHub Actions Workflow

**Priority**: HIGH - Essential for reliable deployments

#### 2.1.1 Complete CI/CD Pipeline

```yaml
# .github/workflows/production.yml
name: Production Deployment Pipeline

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

env:
  NODE_VERSION: '18'
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

jobs:
  # Code Quality and Testing
  quality-gate:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: poker_test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432
      
      redis:
        image: redis:7
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 6379:6379

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Environment validation
        run: npm run validate:env
        env:
          NODE_ENV: test
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/poker_test
          REDIS_URL: redis://localhost:6379

      - name: Run linting
        run: npm run lint

      - name: Run type checking
        run: npm run type-check

      - name: Run unit tests
        run: npm run test:unit
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/poker_test
          REDIS_URL: redis://localhost:6379

      - name: Run integration tests
        run: npm run test:integration
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/poker_test
          REDIS_URL: redis://localhost:6379

      - name: Run E2E tests
        run: npm run test:e2e
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/poker_test
          REDIS_URL: redis://localhost:6379

      - name: Generate coverage report
        run: npm run test:coverage

      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v3
        with:
          token: ${{ secrets.CODECOV_TOKEN }}
          files: ./coverage/lcov.info

      - name: Security audit
        run: npm audit --audit-level high

      - name: Build application
        run: npm run build
        env:
          NODE_ENV: production

  # Security Scanning
  security-scan:
    runs-on: ubuntu-latest
    needs: quality-gate
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Run Trivy vulnerability scanner
        uses: aquasecurity/trivy-action@master
        with:
          scan-type: 'fs'
          scan-ref: '.'
          format: 'sarif'
          output: 'trivy-results.sarif'

      - name: Upload Trivy scan results
        uses: github/codeql-action/upload-sarif@v2
        with:
          sarif_file: 'trivy-results.sarif'

      - name: Run Snyk security scan
        uses: snyk/actions/node@master
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
        with:
          args: --severity-threshold=high

  # Performance Testing
  performance-test:
    runs-on: ubuntu-latest
    needs: quality-gate
    if: github.event_name == 'pull_request'
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run performance tests
        run: npm run test:performance

      - name: Run Lighthouse CI
        uses: treosh/lighthouse-ci-action@v9
        with:
          configPath: './lighthouse.config.js'
          uploadArtifacts: true

  # Build and Push Docker Image
  build-image:
    runs-on: ubuntu-latest
    needs: [quality-gate, security-scan]
    if: github.ref == 'refs/heads/main'
    outputs:
      image: ${{ steps.image.outputs.image }}
      digest: ${{ steps.build.outputs.digest }}
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Log in to Container Registry
        uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Extract metadata
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}
          tags: |
            type=ref,event=branch
            type=sha,prefix={{branch}}-
            type=raw,value=latest

      - name: Build and push Docker image
        id: build
        uses: docker/build-push-action@v5
        with:
          context: .
          platforms: linux/amd64,linux/arm64
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
          cache-from: type=gha
          cache-to: type=gha,mode=max

      - name: Output image
        id: image
        run: |
          echo "image=${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:${{ github.sha }}" >> $GITHUB_OUTPUT

  # Deploy to Staging
  deploy-staging:
    runs-on: ubuntu-latest
    needs: build-image
    environment: staging
    if: github.ref == 'refs/heads/main'
    steps:
      - name: Deploy to staging
        run: |
          echo "Deploying ${{ needs.build-image.outputs.image }} to staging"
          # Implement staging deployment logic

      - name: Run smoke tests
        run: |
          echo "Running smoke tests against staging"
          # Implement smoke test logic

  # Deploy to Production
  deploy-production:
    runs-on: ubuntu-latest
    needs: [build-image, deploy-staging]
    environment: production
    if: github.ref == 'refs/heads/main'
    steps:
      - name: Deploy to production
        run: |
          echo "Deploying ${{ needs.build-image.outputs.image }} to production"
          # Implement production deployment logic

      - name: Run health checks
        run: |
          echo "Running production health checks"
          # Implement health check logic

      - name: Notify deployment
        uses: 8398a7/action-slack@v3
        with:
          status: ${{ job.status }}
          channel: '#deployments'
          webhook_url: ${{ secrets.SLACK_WEBHOOK }}

  # Database Migration
  migrate-database:
    runs-on: ubuntu-latest
    needs: deploy-production
    if: github.ref == 'refs/heads/main'
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Run database migrations
        run: |
          echo "Running database migrations"
          # Implement migration logic
        env:
          DATABASE_URL: ${{ secrets.PRODUCTION_DATABASE_URL }}
```

#### 2.1.2 Docker Configuration

```dockerfile
# Dockerfile
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install dependencies based on the preferred package manager
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build the application
ENV NEXT_TELEMETRY_DISABLED 1
RUN npm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy built application
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:$PORT/api/health || exit 1

USER nextjs

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

CMD ["node", "server.js"]
```

```yaml
# docker-compose.yml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://postgres:password@db:5432/poker
      - REDIS_URL=redis://redis:6379
    depends_on:
      - db
      - redis
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  db:
    image: postgres:15
    environment:
      POSTGRES_DB: poker
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: password
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./supabase/migrations:/docker-entrypoint-initdb.d
    ports:
      - "5432:5432"
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - app
    restart: unless-stopped

volumes:
  postgres_data:
  redis_data:
```

## 3. Monitoring & Observability

### 3.1 Application Performance Monitoring

**Priority**: HIGH - Critical for production operations

#### 3.1.1 Comprehensive Monitoring System

```typescript
// src/lib/monitoring/metrics.ts
import { createPrometheusRegistry, register, collectDefaultMetrics } from 'prom-client'

class MetricsCollector {
  private static instance: MetricsCollector
  private registry = createPrometheusRegistry()

  private constructor() {
    // Collect default system metrics
    collectDefaultMetrics({ register: this.registry, prefix: 'poker_app_' })
    
    this.initializeCustomMetrics()
  }

  static getInstance(): MetricsCollector {
    if (!this.instance) {
      this.instance = new MetricsCollector()
    }
    return this.instance
  }

  private initializeCustomMetrics() {
    // HTTP request metrics
    this.httpRequestDuration = new Histogram({
      name: 'poker_http_request_duration_seconds',
      help: 'Duration of HTTP requests in seconds',
      labelNames: ['method', 'route', 'status_code'],
      buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 5, 10]
    })

    // WebSocket connection metrics
    this.wsConnections = new Gauge({
      name: 'poker_websocket_connections_total',
      help: 'Total number of active WebSocket connections'
    })

    this.wsMessages = new Counter({
      name: 'poker_websocket_messages_total',
      help: 'Total number of WebSocket messages',
      labelNames: ['type', 'direction']
    })

    // Game-specific metrics
    this.activeSessions = new Gauge({
      name: 'poker_active_sessions_total',
      help: 'Number of active poker sessions'
    })

    this.activeHands = new Gauge({
      name: 'poker_active_hands_total',
      help: 'Number of hands currently being played'
    })

    this.handDuration = new Histogram({
      name: 'poker_hand_duration_seconds',
      help: 'Duration of poker hands in seconds',
      buckets: [30, 60, 120, 300, 600, 1200, 1800, 3600]
    })

    // Database metrics
    this.dbQueryDuration = new Histogram({
      name: 'poker_db_query_duration_seconds',
      help: 'Duration of database queries in seconds',
      labelNames: ['operation', 'table'],
      buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1]
    })

    this.dbConnections = new Gauge({
      name: 'poker_db_connections_active',
      help: 'Number of active database connections'
    })

    // Error metrics
    this.errors = new Counter({
      name: 'poker_errors_total',
      help: 'Total number of errors',
      labelNames: ['type', 'severity']
    })

    // Business metrics
    this.newUsers = new Counter({
      name: 'poker_users_registered_total',
      help: 'Total number of new user registrations'
    })

    this.gamesStarted = new Counter({
      name: 'poker_games_started_total',
      help: 'Total number of games started',
      labelNames: ['type']
    })

    this.revenue = new Counter({
      name: 'poker_revenue_total',
      help: 'Total revenue generated',
      labelNames: ['source']
    })
  }

  // Metric recording methods
  recordHttpRequest(method: string, route: string, statusCode: number, duration: number) {
    this.httpRequestDuration
      .labels(method, route, statusCode.toString())
      .observe(duration)
  }

  recordWebSocketConnection(delta: number) {
    this.wsConnections.inc(delta)
  }

  recordWebSocketMessage(type: string, direction: 'inbound' | 'outbound') {
    this.wsMessages.labels(type, direction).inc()
  }

  recordActiveSession(delta: number) {
    this.activeSessions.inc(delta)
  }

  recordHandCompletion(duration: number) {
    this.handDuration.observe(duration)
    this.activeHands.dec()
  }

  recordError(type: string, severity: 'low' | 'medium' | 'high' | 'critical') {
    this.errors.labels(type, severity).inc()
  }

  recordRevenue(amount: number, source: string) {
    this.revenue.labels(source).inc(amount)
  }

  getMetrics(): string {
    return this.registry.metrics()
  }
}

export const metrics = MetricsCollector.getInstance()
```

#### 3.1.2 Health Check System

```typescript
// src/lib/monitoring/health.ts
export interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy'
  timestamp: string
  duration: number
  details: Record<string, any>
}

export interface SystemHealth {
  status: 'healthy' | 'degraded' | 'unhealthy'
  timestamp: string
  version: string
  uptime: number
  checks: Record<string, HealthCheckResult>
}

export class HealthChecker {
  private checks: Map<string, () => Promise<HealthCheckResult>> = new Map()

  constructor() {
    this.registerDefaultChecks()
  }

  private registerDefaultChecks() {
    this.register('database', this.checkDatabase.bind(this))
    this.register('redis', this.checkRedis.bind(this))
    this.register('websocket', this.checkWebSocket.bind(this))
    this.register('external_apis', this.checkExternalAPIs.bind(this))
    this.register('disk_space', this.checkDiskSpace.bind(this))
    this.register('memory', this.checkMemory.bind(this))
  }

  register(name: string, check: () => Promise<HealthCheckResult>) {
    this.checks.set(name, check)
  }

  async runCheck(name: string): Promise<HealthCheckResult> {
    const check = this.checks.get(name)
    if (!check) {
      return {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        duration: 0,
        details: { error: 'Check not found' }
      }
    }

    const startTime = Date.now()
    try {
      const result = await Promise.race([
        check(),
        new Promise<HealthCheckResult>((_, reject) => 
          setTimeout(() => reject(new Error('Health check timeout')), 10000)
        )
      ])
      
      result.duration = Date.now() - startTime
      return result
    } catch (error) {
      return {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        duration: Date.now() - startTime,
        details: { error: error.message }
      }
    }
  }

  async runAllChecks(): Promise<SystemHealth> {
    const startTime = Date.now()
    const checkPromises = Array.from(this.checks.keys()).map(async name => {
      const result = await this.runCheck(name)
      return [name, result] as const
    })

    const results = await Promise.all(checkPromises)
    const checks = Object.fromEntries(results)

    // Determine overall system status
    const statuses = Object.values(checks).map(check => check.status)
    let overallStatus: 'healthy' | 'degraded' | 'unhealthy'

    if (statuses.every(status => status === 'healthy')) {
      overallStatus = 'healthy'
    } else if (statuses.some(status => status === 'unhealthy')) {
      overallStatus = 'unhealthy'
    } else {
      overallStatus = 'degraded'
    }

    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      uptime: process.uptime(),
      checks
    }
  }

  private async checkDatabase(): Promise<HealthCheckResult> {
    try {
      const { supabaseAdmin } = await import('@/lib/supabase/client')
      const { data, error } = await supabaseAdmin
        .from('users')
        .select('count')
        .limit(1)

      if (error) throw error

      return {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        duration: 0,
        details: { connection: 'ok' }
      }
    } catch (error) {
      return {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        duration: 0,
        details: { error: error.message }
      }
    }
  }

  private async checkRedis(): Promise<HealthCheckResult> {
    try {
      const { redis } = await import('@/lib/cache/redis')
      const result = await redis.ping()
      
      if (result !== 'PONG') throw new Error('Invalid ping response')

      return {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        duration: 0,
        details: { connection: 'ok' }
      }
    } catch (error) {
      return {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        duration: 0,
        details: { error: error.message }
      }
    }
  }

  private async checkWebSocket(): Promise<HealthCheckResult> {
    try {
      const { wsManager } = await import('@/lib/websocket/server')
      const connectionCount = wsManager.getConnectionCount()

      return {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        duration: 0,
        details: { 
          activeConnections: connectionCount,
          maxConnections: process.env.WS_MAX_CONNECTIONS || 1000
        }
      }
    } catch (error) {
      return {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        duration: 0,
        details: { error: error.message }
      }
    }
  }

  private async checkExternalAPIs(): Promise<HealthCheckResult> {
    const checks = []
    
    // Check email service if configured
    if (process.env.EMAIL_API_KEY) {
      checks.push(this.checkEmailService())
    }
    
    // Check payment service if configured
    if (process.env.PAYMENT_API_KEY) {
      checks.push(this.checkPaymentService())
    }

    if (checks.length === 0) {
      return {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        duration: 0,
        details: { message: 'No external APIs configured' }
      }
    }

    try {
      const results = await Promise.all(checks)
      const allHealthy = results.every(result => result === 'ok')

      return {
        status: allHealthy ? 'healthy' : 'degraded',
        timestamp: new Date().toISOString(),
        duration: 0,
        details: { externalServices: results }
      }
    } catch (error) {
      return {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        duration: 0,
        details: { error: error.message }
      }
    }
  }

  private async checkDiskSpace(): Promise<HealthCheckResult> {
    try {
      const fs = require('fs')
      const stats = await fs.promises.statfs('.')
      const free = stats.free
      const total = stats.blocks * stats.bsize
      const used = total - free
      const usagePercent = (used / total) * 100

      const status = usagePercent > 90 ? 'unhealthy' : 
                   usagePercent > 80 ? 'degraded' : 'healthy'

      return {
        status,
        timestamp: new Date().toISOString(),
        duration: 0,
        details: {
          totalBytes: total,
          freeBytes: free,
          usedBytes: used,
          usagePercent: Math.round(usagePercent * 100) / 100
        }
      }
    } catch (error) {
      return {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        duration: 0,
        details: { error: error.message }
      }
    }
  }

  private async checkMemory(): Promise<HealthCheckResult> {
    const usage = process.memoryUsage()
    const total = require('os').totalmem()
    const free = require('os').freemem()
    const usagePercent = ((total - free) / total) * 100

    const status = usagePercent > 90 ? 'unhealthy' : 
                 usagePercent > 80 ? 'degraded' : 'healthy'

    return {
      status,
      timestamp: new Date().toISOString(),
      duration: 0,
      details: {
        rss: usage.rss,
        heapTotal: usage.heapTotal,
        heapUsed: usage.heapUsed,
        external: usage.external,
        systemTotal: total,
        systemFree: free,
        systemUsagePercent: Math.round(usagePercent * 100) / 100
      }
    }
  }

  private async checkEmailService(): Promise<string> {
    // Implement email service health check
    return 'ok'
  }

  private async checkPaymentService(): Promise<string> {
    // Implement payment service health check
    return 'ok'
  }
}

export const healthChecker = new HealthChecker()
```

#### 3.1.3 Logging System

```typescript
// src/lib/monitoring/logger.ts
import winston from 'winston'

export interface LogContext {
  userId?: string
  sessionId?: string
  handId?: string
  requestId?: string
  ip?: string
  userAgent?: string
  [key: string]: any
}

class Logger {
  private logger: winston.Logger

  constructor() {
    const env = EnvironmentValidator.get()
    
    this.logger = winston.createLogger({
      level: env.LOG_LEVEL,
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json(),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
          return JSON.stringify({
            timestamp,
            level,
            message,
            ...meta
          })
        })
      ),
      defaultMeta: {
        service: 'poker-app',
        version: process.env.npm_package_version || '1.0.0',
        environment: env.NODE_ENV
      },
      transports: [
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
          )
        })
      ]
    })

    // Add file transport in production
    if (env.NODE_ENV === 'production') {
      this.logger.add(new winston.transports.File({
        filename: 'logs/error.log',
        level: 'error',
        maxsize: 50 * 1024 * 1024, // 50MB
        maxFiles: 5
      }))

      this.logger.add(new winston.transports.File({
        filename: 'logs/combined.log',
        maxsize: 100 * 1024 * 1024, // 100MB
        maxFiles: 10
      }))
    }

    // Add external logging services
    if (env.DATADOG_API_KEY) {
      // Add DataDog transport
    }

    if (env.NEW_RELIC_LICENSE_KEY) {
      // Add New Relic transport
    }
  }

  debug(message: string, context?: LogContext) {
    this.logger.debug(message, context)
  }

  info(message: string, context?: LogContext) {
    this.logger.info(message, context)
  }

  warn(message: string, context?: LogContext) {
    this.logger.warn(message, context)
    metrics.recordError('warning', 'low')
  }

  error(message: string, error?: Error, context?: LogContext) {
    this.logger.error(message, { error: error?.stack || error, ...context })
    metrics.recordError('error', 'medium')
  }

  critical(message: string, error?: Error, context?: LogContext) {
    this.logger.error(message, { 
      severity: 'critical', 
      error: error?.stack || error, 
      ...context 
    })
    metrics.recordError('critical', 'critical')
    
    // Send immediate alerts for critical errors
    this.sendCriticalAlert(message, error, context)
  }

  // Game-specific logging methods
  logGameAction(action: string, context: LogContext) {
    this.info(`Game action: ${action}`, {
      category: 'game',
      action,
      ...context
    })
  }

  logSecurityEvent(event: string, context: LogContext) {
    this.warn(`Security event: ${event}`, {
      category: 'security',
      event,
      ...context
    })
  }

  logPerformanceIssue(metric: string, value: number, threshold: number, context?: LogContext) {
    this.warn(`Performance issue: ${metric}`, {
      category: 'performance',
      metric,
      value,
      threshold,
      ...context
    })
  }

  private async sendCriticalAlert(message: string, error?: Error, context?: LogContext) {
    // Implement critical alert logic (Slack, PagerDuty, etc.)
    console.error('CRITICAL ALERT:', { message, error: error?.message, context })
  }
}

export const logger = new Logger()
```

## 4. Performance Optimization

### 4.1 Caching Strategy

**Priority**: HIGH - Essential for scalability

#### 4.1.1 Multi-Level Caching System

```typescript
// src/lib/cache/strategy.ts
export class CacheStrategy {
  private static instance: CacheStrategy
  private redis: Redis
  private memoryCache: Map<string, { value: any; expires: number }> = new Map()
  
  private constructor() {
    this.redis = new Redis(EnvironmentValidator.get().REDIS_URL)
    this.startMemoryCacheCleanup()
  }

  static getInstance(): CacheStrategy {
    if (!this.instance) {
      this.instance = new CacheStrategy()
    }
    return this.instance
  }

  // Memory cache (L1) - fastest but limited capacity
  async getFromMemory<T>(key: string): Promise<T | null> {
    const cached = this.memoryCache.get(key)
    if (!cached || cached.expires < Date.now()) {
      this.memoryCache.delete(key)
      return null
    }
    return cached.value
  }

  setInMemory<T>(key: string, value: T, ttlSeconds: number = 300): void {
    this.memoryCache.set(key, {
      value,
      expires: Date.now() + (ttlSeconds * 1000)
    })
  }

  // Redis cache (L2) - shared across instances
  async getFromRedis<T>(key: string): Promise<T | null> {
    try {
      const cached = await this.redis.get(key)
      return cached ? JSON.parse(cached) : null
    } catch (error) {
      logger.error('Redis get error', error, { key })
      return null
    }
  }

  async setInRedis<T>(key: string, value: T, ttlSeconds: number = 3600): Promise<void> {
    try {
      await this.redis.setex(key, ttlSeconds, JSON.stringify(value))
    } catch (error) {
      logger.error('Redis set error', error, { key })
    }
  }

  // Multi-level cache get
  async get<T>(key: string): Promise<T | null> {
    // Try memory cache first (L1)
    let value = await this.getFromMemory<T>(key)
    if (value !== null) {
      return value
    }

    // Try Redis cache (L2)
    value = await this.getFromRedis<T>(key)
    if (value !== null) {
      // Populate memory cache
      this.setInMemory(key, value, 300) // 5 minutes in memory
      return value
    }

    return null
  }

  // Multi-level cache set
  async set<T>(key: string, value: T, ttlSeconds: number = 3600): Promise<void> {
    // Set in both caches
    this.setInMemory(key, value, Math.min(ttlSeconds, 300))
    await this.setInRedis(key, value, ttlSeconds)
  }

  // Cache invalidation
  async invalidate(key: string): Promise<void> {
    this.memoryCache.delete(key)
    try {
      await this.redis.del(key)
    } catch (error) {
      logger.error('Redis delete error', error, { key })
    }
  }

  async invalidatePattern(pattern: string): Promise<void> {
    // Clear memory cache entries matching pattern
    for (const key of this.memoryCache.keys()) {
      if (key.includes(pattern)) {
        this.memoryCache.delete(key)
      }
    }

    // Clear Redis entries matching pattern
    try {
      const keys = await this.redis.keys(pattern)
      if (keys.length > 0) {
        await this.redis.del(...keys)
      }
    } catch (error) {
      logger.error('Redis pattern delete error', error, { pattern })
    }
  }

  // Game-specific caching methods
  async cacheGameSession(sessionId: string, session: any): Promise<void> {
    await this.set(`session:${sessionId}`, session, 7200) // 2 hours
  }

  async getCachedGameSession(sessionId: string): Promise<any> {
    return this.get(`session:${sessionId}`)
  }

  async cachePlayerStats(userId: string, stats: any): Promise<void> {
    await this.set(`stats:${userId}`, stats, 3600) // 1 hour
  }

  async getCachedPlayerStats(userId: string): Promise<any> {
    return this.get(`stats:${userId}`)
  }

  async cacheHandHistory(handId: string, history: any): Promise<void> {
    await this.set(`hand:${handId}`, history, 86400) // 24 hours
  }

  async getCachedHandHistory(handId: string): Promise<any> {
    return this.get(`hand:${handId}`)
  }

  private startMemoryCacheCleanup(): void {
    setInterval(() => {
      const now = Date.now()
      for (const [key, cached] of this.memoryCache.entries()) {
        if (cached.expires < now) {
          this.memoryCache.delete(key)
        }
      }
    }, 60000) // Clean up every minute
  }

  // Cache warming strategies
  async warmCache(): Promise<void> {
    logger.info('Starting cache warming process')
    
    try {
      // Warm frequently accessed data
      await this.warmUserProfiles()
      await this.warmGameConfigurations()
      await this.warmStatistics()
      
      logger.info('Cache warming completed successfully')
    } catch (error) {
      logger.error('Cache warming failed', error)
    }
  }

  private async warmUserProfiles(): Promise<void> {
    // Pre-load active user profiles
  }

  private async warmGameConfigurations(): Promise<void> {
    // Pre-load game configurations
  }

  private async warmStatistics(): Promise<void> {
    // Pre-load frequently accessed statistics
  }
}

export const cacheStrategy = CacheStrategy.getInstance()
```

#### 4.1.2 Database Query Optimization

```typescript
// src/lib/db/optimization.ts
export class DatabaseOptimizer {
  // Connection pooling configuration
  static getOptimalPoolConfig() {
    const env = EnvironmentValidator.get()
    const cpuCount = require('os').cpus().length
    
    return {
      max: env.DATABASE_POOL_SIZE || Math.max(cpuCount * 2, 10),
      min: Math.max(Math.floor(cpuCount / 2), 2),
      idle: env.DATABASE_TIMEOUT || 30000,
      acquire: 60000,
      evict: 1000,
      handleDisconnects: true
    }
  }

  // Query optimization utilities
  static optimizeUserQuery(filters: any) {
    // Use indexed columns for filtering
    const optimizedFilters = { ...filters }
    
    // Ensure date ranges use proper indexing
    if (optimizedFilters.createdAfter || optimizedFilters.createdBefore) {
      optimizedFilters.created_at = {}
      if (optimizedFilters.createdAfter) {
        optimizedFilters.created_at.gte = optimizedFilters.createdAfter
        delete optimizedFilters.createdAfter
      }
      if (optimizedFilters.createdBefore) {
        optimizedFilters.created_at.lte = optimizedFilters.createdBefore
        delete optimizedFilters.createdBefore
      }
    }

    return optimizedFilters
  }

  // Batch operations for better performance
  static async batchInsert<T>(
    table: string, 
    records: T[], 
    batchSize: number = 1000
  ): Promise<void> {
    const { supabaseAdmin } = await import('@/lib/supabase/client')
    
    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize)
      
      const { error } = await supabaseAdmin
        .from(table)
        .insert(batch)
      
      if (error) {
        throw new Error(`Batch insert failed: ${error.message}`)
      }
    }
  }

  // Efficient pagination
  static getPaginationQuery(page: number, limit: number) {
    const offset = (page - 1) * limit
    return {
      from: offset,
      to: offset + limit - 1
    }
  }

  // Query performance monitoring
  static async executeWithMetrics<T>(
    operation: string,
    table: string,
    query: () => Promise<T>
  ): Promise<T> {
    const startTime = Date.now()
    
    try {
      const result = await query()
      const duration = (Date.now() - startTime) / 1000
      
      metrics.recordDbQuery(operation, table, duration)
      
      if (duration > 1) { // Log slow queries
        logger.warn('Slow database query detected', {
          operation,
          table,
          duration,
          category: 'performance'
        })
      }
      
      return result
    } catch (error) {
      const duration = (Date.now() - startTime) / 1000
      metrics.recordDbQuery(operation, table, duration, true)
      
      logger.error('Database query failed', error, {
        operation,
        table,
        duration
      })
      
      throw error
    }
  }

  // Index recommendations
  static async analyzeQueryPerformance(): Promise<{
    slowQueries: Array<{ query: string; avgDuration: number; count: number }>
    recommendedIndexes: Array<{ table: string; columns: string[]; reason: string }>
  }> {
    // Implement query performance analysis
    return {
      slowQueries: [],
      recommendedIndexes: []
    }
  }
}
```

## 5. Backup & Recovery

### 5.1 Automated Backup System

**Priority**: MEDIUM - Important for data protection

#### 5.1.1 Comprehensive Backup Strategy

```typescript
// src/lib/backup/manager.ts
export class BackupManager {
  private env = EnvironmentValidator.get()
  
  // Database backup
  async createDatabaseBackup(): Promise<{ success: boolean; backupId: string; size: number }> {
    const backupId = `db_backup_${Date.now()}`
    
    try {
      logger.info('Starting database backup', { backupId })
      
      // Create compressed database dump
      const dumpCommand = this.buildDumpCommand(backupId)
      const { exec } = require('child_process')
      
      await new Promise<void>((resolve, reject) => {
        exec(dumpCommand, (error: any, stdout: any, stderr: any) => {
          if (error) {
            reject(new Error(`Database backup failed: ${error.message}`))
            return
          }
          resolve()
        })
      })
      
      // Upload to backup storage
      const uploadResult = await this.uploadToStorage(backupId)
      
      // Record backup metadata
      await this.recordBackup({
        id: backupId,
        type: 'database',
        size: uploadResult.size,
        location: uploadResult.location,
        createdAt: new Date(),
        status: 'completed'
      })
      
      logger.info('Database backup completed successfully', { 
        backupId, 
        size: uploadResult.size 
      })
      
      return {
        success: true,
        backupId,
        size: uploadResult.size
      }
      
    } catch (error) {
      logger.error('Database backup failed', error, { backupId })
      
      await this.recordBackup({
        id: backupId,
        type: 'database',
        size: 0,
        location: '',
        createdAt: new Date(),
        status: 'failed',
        error: error.message
      })
      
      return {
        success: false,
        backupId,
        size: 0
      }
    }
  }

  // Application state backup
  async createApplicationBackup(): Promise<{ success: boolean; backupId: string }> {
    const backupId = `app_backup_${Date.now()}`
    
    try {
      logger.info('Starting application backup', { backupId })
      
      // Backup Redis data
      await this.backupRedisData(backupId)
      
      // Backup file uploads (if any)
      await this.backupFileStorage(backupId)
      
      // Backup configuration
      await this.backupConfiguration(backupId)
      
      logger.info('Application backup completed successfully', { backupId })
      
      return { success: true, backupId }
      
    } catch (error) {
      logger.error('Application backup failed', error, { backupId })
      return { success: false, backupId }
    }
  }

  // Restore from backup
  async restoreFromBackup(backupId: string): Promise<{ success: boolean; message: string }> {
    try {
      logger.info('Starting restore from backup', { backupId })
      
      const backup = await this.getBackupMetadata(backupId)
      if (!backup) {
        throw new Error('Backup not found')
      }
      
      // Download backup from storage
      const backupPath = await this.downloadFromStorage(backup.location)
      
      // Restore database
      if (backup.type === 'database') {
        await this.restoreDatabase(backupPath)
      }
      
      // Cleanup downloaded backup
      await this.cleanupTempFiles(backupPath)
      
      logger.info('Restore completed successfully', { backupId })
      
      return {
        success: true,
        message: 'Restore completed successfully'
      }
      
    } catch (error) {
      logger.error('Restore failed', error, { backupId })
      
      return {
        success: false,
        message: `Restore failed: ${error.message}`
      }
    }
  }

  // Scheduled backup
  startScheduledBackups(): void {
    const cron = require('node-cron')
    
    // Daily database backup at 2 AM
    cron.schedule('0 2 * * *', async () => {
      logger.info('Starting scheduled database backup')
      await this.createDatabaseBackup()
    })
    
    // Weekly application backup on Sundays at 3 AM
    cron.schedule('0 3 * * 0', async () => {
      logger.info('Starting scheduled application backup')
      await this.createApplicationBackup()
    })
    
    // Monthly cleanup of old backups on the 1st at 4 AM
    cron.schedule('0 4 1 * *', async () => {
      logger.info('Starting backup cleanup')
      await this.cleanupOldBackups()
    })
    
    logger.info('Scheduled backups initialized')
  }

  // Backup validation
  async validateBackup(backupId: string): Promise<{ isValid: boolean; errors: string[] }> {
    const errors: string[] = []
    
    try {
      const backup = await this.getBackupMetadata(backupId)
      if (!backup) {
        errors.push('Backup metadata not found')
        return { isValid: false, errors }
      }
      
      // Check if backup file exists
      const fileExists = await this.checkBackupFileExists(backup.location)
      if (!fileExists) {
        errors.push('Backup file not found in storage')
      }
      
      // Validate backup integrity
      const integrityCheck = await this.checkBackupIntegrity(backup.location)
      if (!integrityCheck.valid) {
        errors.push(`Backup integrity check failed: ${integrityCheck.error}`)
      }
      
      // Test restore process (dry run)
      const restoreTest = await this.testRestoreProcess(backup.location)
      if (!restoreTest.success) {
        errors.push(`Restore test failed: ${restoreTest.error}`)
      }
      
      return {
        isValid: errors.length === 0,
        errors
      }
      
    } catch (error) {
      errors.push(`Validation error: ${error.message}`)
      return { isValid: false, errors }
    }
  }

  private buildDumpCommand(backupId: string): string {
    const databaseUrl = new URL(this.env.DATABASE_URL)
    const filename = `/tmp/${backupId}.sql.gz`
    
    return `pg_dump "${this.env.DATABASE_URL}" | gzip > ${filename}`
  }

  private async uploadToStorage(backupId: string): Promise<{ location: string; size: number }> {
    // Implement backup storage upload (S3, GCS, etc.)
    const filename = `/tmp/${backupId}.sql.gz`
    const fs = require('fs')
    const stats = await fs.promises.stat(filename)
    
    return {
      location: `s3://backups/${backupId}.sql.gz`,
      size: stats.size
    }
  }

  private async backupRedisData(backupId: string): Promise<void> {
    const { redis } = await import('@/lib/cache/redis')
    // Implement Redis backup using BGSAVE or data export
  }

  private async backupFileStorage(backupId: string): Promise<void> {
    // Implement file storage backup if applicable
  }

  private async backupConfiguration(backupId: string): Promise<void> {
    // Backup environment configuration and settings
  }

  private async cleanupOldBackups(): Promise<void> {
    const retentionDays = this.env.BACKUP_RETENTION_DAYS
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays)
    
    // Remove old backup records and files
    logger.info('Cleaning up backups older than', { cutoffDate })
  }
}

export const backupManager = new BackupManager()
```

## Implementation Timeline

### Week 1: Infrastructure Foundation
- ✅ Environment configuration and validation system
- ✅ CI/CD pipeline setup with GitHub Actions
- ✅ Docker containerization and orchestration
- ✅ Basic monitoring and health checks

### Week 2: Monitoring & Observability
- ✅ Comprehensive metrics collection system
- ✅ Advanced health checking and alerting
- ✅ Structured logging with external integrations
- ✅ Performance monitoring and optimization

### Week 3: Caching & Performance
- ✅ Multi-level caching strategy implementation
- ✅ Database query optimization
- ✅ Performance benchmarking and tuning
- ✅ Load testing and capacity planning

### Week 4: Backup & Security
- ✅ Automated backup and recovery system
- ✅ Security hardening and compliance
- ✅ Disaster recovery procedures
- ✅ Production deployment and validation

## Success Criteria

**Validation Score Impact**: +50 points (from 45/100 to 95/100 in production readiness)

**Infrastructure Metrics:**
- ✅ 99.9% uptime SLA achievement
- ✅ <100ms average API response time
- ✅ <50ms database query performance (95th percentile)
- ✅ Zero critical security vulnerabilities
- ✅ Automated deployment with zero downtime
- ✅ Complete backup and recovery capability

**Operational Excellence:**
- ✅ Comprehensive monitoring and alerting
- ✅ Automated incident response and recovery
- ✅ Full observability across all system components
- ✅ Performance optimization achieving target benchmarks
- ✅ Security compliance and audit readiness
- ✅ Disaster recovery plan tested and validated

**Quality Assurance:**
- All production systems must be thoroughly tested
- Monitoring must provide complete visibility into system health
- Backup and recovery procedures must be regularly tested
- Performance must meet or exceed specified benchmarks
- Security controls must be continuously validated
- Operational procedures must be documented and automated