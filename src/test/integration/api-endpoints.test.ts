import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'
import { createTestDatabase, clearTestDatabase, createTestUser, createTestGame } from '../helpers/database'
import { generateAuthToken, createTestSession } from '../helpers/auth'

// Import API handlers
import { GET as healthGet } from '@/app/api/health/route'
import { POST as authPost } from '@/app/api/auth/[...all]/route'
import { GET as usersGet, POST as usersPost } from '@/app/api/users/route'
import { GET as userProfileGet, PATCH as userProfilePatch } from '@/app/api/users/[userId]/profile/route'
import { GET as adminDashboardGet } from '@/app/api/admin/dashboard/route'
import { GET as adminUsersGet } from '@/app/api/admin/users/route'
import { GET as adminGamesGet } from '@/app/api/admin/games/route'

describe('API Endpoints Integration Tests', () => {
  let testDb: any
  let testUser: any
  let adminUser: any
  let authToken: string
  let adminToken: string

  beforeAll(async () => {
    testDb = await createTestDatabase()
    
    // Create test users
    testUser = await createTestUser({
      email: 'test@example.com',
      username: 'testuser',
      role: 'user'
    })
    
    adminUser = await createTestUser({
      email: 'admin@example.com',
      username: 'admin',
      role: 'admin'
    })

    // Generate auth tokens
    authToken = await generateAuthToken(testUser.id)
    adminToken = await generateAuthToken(adminUser.id)
  })

  afterAll(async () => {
    await clearTestDatabase(testDb)
  })

  beforeEach(async () => {
    // Clear rate limiting between tests
    vi.clearAllMocks()
  })

  describe('Health Check Endpoint', () => {
    it('should return healthy status', async () => {
      const request = new NextRequest('http://localhost:3000/api/health')
      const response = await healthGet(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.status).toBe('healthy')
      expect(data.timestamp).toBeDefined()
      expect(data.uptime).toBeGreaterThan(0)
    })

    it('should include system information', async () => {
      const request = new NextRequest('http://localhost:3000/api/health')
      const response = await healthGet(request)
      const data = await response.json()

      expect(data.system).toBeDefined()
      expect(data.system.nodeVersion).toBeDefined()
      expect(data.system.platform).toBeDefined()
      expect(data.system.memory).toBeDefined()
    })

    it('should include database connectivity status', async () => {
      const request = new NextRequest('http://localhost:3000/api/health')
      const response = await healthGet(request)
      const data = await response.json()

      expect(data.services).toBeDefined()
      expect(data.services.database).toBeDefined()
      expect(data.services.redis).toBeDefined()
    })

    it('should handle health checks under load', async () => {
      const promises = Array.from({ length: 100 }, () => {
        const request = new NextRequest('http://localhost:3000/api/health')
        return healthGet(request)
      })

      const responses = await Promise.all(promises)
      
      responses.forEach(response => {
        expect(response.status).toBe(200)
      })
    })
  })

  describe('Authentication Endpoints', () => {
    describe('User Registration', () => {
      it('should register new user successfully', async () => {
        const userData = {
          email: 'newuser@example.com',
          username: 'newuser123',
          password: 'SecurePass123!@#',
          displayName: 'New User'
        }

        const request = new NextRequest('http://localhost:3000/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(userData)
        })

        const response = await authPost(request)
        const data = await response.json()

        expect(response.status).toBe(201)
        expect(data.success).toBe(true)
        expect(data.user).toBeDefined()
        expect(data.user.email).toBe(userData.email.toLowerCase())
        expect(data.user.username).toBe(userData.username.toLowerCase())
        expect(data.token).toBeDefined()
        expect(data.user.password).toBeUndefined() // Password should not be returned
      })

      it('should validate user registration data', async () => {
        const invalidData = {
          email: 'invalid-email',
          username: 'a', // Too short
          password: 'weak', // Too weak
          displayName: 'a' // Too short
        }

        const request = new NextRequest('http://localhost:3000/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(invalidData)
        })

        const response = await authPost(request)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.success).toBe(false)
        expect(data.errors).toBeDefined()
        expect(data.errors).toHaveLength(4) // All fields invalid
      })

      it('should prevent duplicate email registration', async () => {
        const userData = {
          email: testUser.email,
          username: 'anothername',
          password: 'SecurePass123!@#'
        }

        const request = new NextRequest('http://localhost:3000/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(userData)
        })

        const response = await authPost(request)
        const data = await response.json()

        expect(response.status).toBe(409)
        expect(data.success).toBe(false)
        expect(data.error).toContain('email')
      })

      it('should prevent duplicate username registration', async () => {
        const userData = {
          email: 'different@example.com',
          username: testUser.username,
          password: 'SecurePass123!@#'
        }

        const request = new NextRequest('http://localhost:3000/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(userData)
        })

        const response = await authPost(request)
        const data = await response.json()

        expect(response.status).toBe(409)
        expect(data.success).toBe(false)
        expect(data.error).toContain('username')
      })

      it('should enforce registration rate limiting', async () => {
        const userData = {
          email: 'ratelimit1@example.com',
          username: 'ratelimit1',
          password: 'SecurePass123!@#'
        }

        // Make multiple registration attempts
        const promises = Array.from({ length: 5 }, (_, i) => {
          const data = {
            ...userData,
            email: `ratelimit${i}@example.com`,
            username: `ratelimit${i}`
          }
          
          const request = new NextRequest('http://localhost:3000/api/auth/register', {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'X-Forwarded-For': '192.168.1.1' // Same IP
            },
            body: JSON.stringify(data)
          })

          return authPost(request)
        })

        const responses = await Promise.all(promises)
        
        // Some should be rate limited (depends on configuration)
        const rateLimitedResponses = responses.filter(r => r.status === 429)
        expect(rateLimitedResponses.length).toBeGreaterThan(0)
      })
    })

    describe('User Login', () => {
      it('should login user successfully', async () => {
        const loginData = {
          email: testUser.email,
          password: 'testpassword123' // The password used in test user creation
        }

        const request = new NextRequest('http://localhost:3000/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(loginData)
        })

        const response = await authPost(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        expect(data.user).toBeDefined()
        expect(data.token).toBeDefined()
        expect(data.user.password).toBeUndefined()
      })

      it('should validate login credentials', async () => {
        const invalidLogins = [
          { email: 'invalid-email', password: 'password' },
          { email: testUser.email, password: 'wrongpassword' },
          { email: 'nonexistent@example.com', password: 'password' }
        ]

        for (const loginData of invalidLogins) {
          const request = new NextRequest('http://localhost:3000/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(loginData)
          })

          const response = await authPost(request)
          const data = await response.json()

          expect(response.status).toBe(401)
          expect(data.success).toBe(false)
          expect(data.error).toBeDefined()
        }
      })

      it('should enforce authentication rate limiting', async () => {
        const loginData = {
          email: testUser.email,
          password: 'wrongpassword'
        }

        // Make multiple failed login attempts
        const promises = Array.from({ length: 10 }, () => {
          const request = new NextRequest('http://localhost:3000/api/auth/login', {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'X-Forwarded-For': '192.168.1.2' // Same IP
            },
            body: JSON.stringify(loginData)
          })

          return authPost(request)
        })

        const responses = await Promise.all(promises)
        
        // Should eventually be rate limited
        const rateLimitedResponses = responses.filter(r => r.status === 429)
        expect(rateLimitedResponses.length).toBeGreaterThan(0)
      })

      it('should not leak user existence information', async () => {
        const nonExistentLogin = {
          email: 'nonexistent@example.com',
          password: 'wrongpassword'
        }

        const existingUserLogin = {
          email: testUser.email,
          password: 'wrongpassword'
        }

        const request1 = new NextRequest('http://localhost:3000/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(nonExistentLogin)
        })

        const request2 = new NextRequest('http://localhost:3000/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(existingUserLogin)
        })

        const response1 = await authPost(request1)
        const response2 = await authPost(request2)
        const data1 = await response1.json()
        const data2 = await response2.json()

        // Both should return same error message
        expect(response1.status).toBe(401)
        expect(response2.status).toBe(401)
        expect(data1.error).toBe(data2.error)
      })
    })

    describe('Token Validation', () => {
      it('should validate valid tokens', async () => {
        const request = new NextRequest('http://localhost:3000/api/auth/validate', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
          }
        })

        const response = await authPost(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.valid).toBe(true)
        expect(data.user).toBeDefined()
        expect(data.user.id).toBe(testUser.id)
      })

      it('should reject invalid tokens', async () => {
        const invalidTokens = [
          'invalid-token',
          'Bearer invalid-token',
          '', // Empty token
          'Bearer ' + 'x'.repeat(100) // Malformed token
        ]

        for (const token of invalidTokens) {
          const request = new NextRequest('http://localhost:3000/api/auth/validate', {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': token
            }
          })

          const response = await authPost(request)
          const data = await response.json()

          expect(response.status).toBe(401)
          expect(data.valid).toBe(false)
        }
      })

      it('should handle missing authorization header', async () => {
        const request = new NextRequest('http://localhost:3000/api/auth/validate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        })

        const response = await authPost(request)
        const data = await response.json()

        expect(response.status).toBe(401)
        expect(data.valid).toBe(false)
      })
    })
  })

  describe('User Management Endpoints', () => {
    describe('User Profile', () => {
      it('should get user profile', async () => {
        const request = new NextRequest(`http://localhost:3000/api/users/${testUser.id}/profile`, {
          headers: { 'Authorization': `Bearer ${authToken}` }
        })

        const response = await userProfileGet(request, { params: { userId: testUser.id } })
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        expect(data.profile).toBeDefined()
        expect(data.profile.id).toBe(testUser.id)
        expect(data.profile.email).toBe(testUser.email)
        expect(data.profile.password).toBeUndefined()
      })

      it('should update user profile', async () => {
        const updateData = {
          displayName: 'Updated Display Name',
          bio: 'This is my updated bio',
          preferences: {
            theme: 'dark',
            soundEnabled: false,
            autoMuck: true
          }
        }

        const request = new NextRequest(`http://localhost:3000/api/users/${testUser.id}/profile`, {
          method: 'PATCH',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}` 
          },
          body: JSON.stringify(updateData)
        })

        const response = await userProfilePatch(request, { params: { userId: testUser.id } })
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        expect(data.profile.displayName).toBe(updateData.displayName)
        expect(data.profile.bio).toBe(updateData.bio)
        expect(data.profile.preferences).toEqual(updateData.preferences)
      })

      it('should validate profile update data', async () => {
        const invalidData = {
          displayName: 'a', // Too short
          bio: 'x'.repeat(501), // Too long
          preferences: {
            theme: 'invalid-theme'
          }
        }

        const request = new NextRequest(`http://localhost:3000/api/users/${testUser.id}/profile`, {
          method: 'PATCH',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}` 
          },
          body: JSON.stringify(invalidData)
        })

        const response = await userProfilePatch(request, { params: { userId: testUser.id } })
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.success).toBe(false)
        expect(data.errors).toBeDefined()
      })

      it('should prevent unauthorized profile access', async () => {
        const request = new NextRequest(`http://localhost:3000/api/users/${testUser.id}/profile`)

        const response = await userProfileGet(request, { params: { userId: testUser.id } })

        expect(response.status).toBe(401)
      })

      it('should prevent cross-user profile modification', async () => {
        const otherUser = await createTestUser({
          email: 'other@example.com',
          username: 'otheruser'
        })

        const updateData = { displayName: 'Hacked Name' }

        const request = new NextRequest(`http://localhost:3000/api/users/${otherUser.id}/profile`, {
          method: 'PATCH',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}` // testUser trying to modify otherUser
          },
          body: JSON.stringify(updateData)
        })

        const response = await userProfilePatch(request, { params: { userId: otherUser.id } })

        expect(response.status).toBe(403)
      })
    })

    describe('User Listing', () => {
      it('should get paginated user list for admin', async () => {
        const request = new NextRequest('http://localhost:3000/api/users?page=1&limit=10', {
          headers: { 'Authorization': `Bearer ${adminToken}` }
        })

        const response = await usersGet(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        expect(data.users).toBeDefined()
        expect(Array.isArray(data.users)).toBe(true)
        expect(data.pagination).toBeDefined()
        expect(data.pagination.page).toBe(1)
        expect(data.pagination.limit).toBe(10)
      })

      it('should require admin role for user listing', async () => {
        const request = new NextRequest('http://localhost:3000/api/users', {
          headers: { 'Authorization': `Bearer ${authToken}` } // Regular user
        })

        const response = await usersGet(request)

        expect(response.status).toBe(403)
      })

      it('should support search and filtering', async () => {
        const request = new NextRequest('http://localhost:3000/api/users?search=test&role=user', {
          headers: { 'Authorization': `Bearer ${adminToken}` }
        })

        const response = await usersGet(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.users).toBeDefined()
        // Results should be filtered
      })

      it('should handle invalid pagination parameters', async () => {
        const request = new NextRequest('http://localhost:3000/api/users?page=-1&limit=1000', {
          headers: { 'Authorization': `Bearer ${adminToken}` }
        })

        const response = await usersGet(request)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.success).toBe(false)
      })
    })
  })

  describe('Admin Endpoints', () => {
    describe('Admin Dashboard', () => {
      it('should return dashboard metrics for admin', async () => {
        const request = new NextRequest('http://localhost:3000/api/admin/dashboard', {
          headers: { 'Authorization': `Bearer ${adminToken}` }
        })

        const response = await adminDashboardGet(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        expect(data.metrics).toBeDefined()
        expect(data.metrics.totalUsers).toBeGreaterThanOrEqual(0)
        expect(data.metrics.activeGames).toBeGreaterThanOrEqual(0)
        expect(data.metrics.totalGames).toBeGreaterThanOrEqual(0)
      })

      it('should require admin role for dashboard access', async () => {
        const request = new NextRequest('http://localhost:3000/api/admin/dashboard', {
          headers: { 'Authorization': `Bearer ${authToken}` } // Regular user
        })

        const response = await adminDashboardGet(request)

        expect(response.status).toBe(403)
      })

      it('should return system health information', async () => {
        const request = new NextRequest('http://localhost:3000/api/admin/dashboard', {
          headers: { 'Authorization': `Bearer ${adminToken}` }
        })

        const response = await adminDashboardGet(request)
        const data = await response.json()

        expect(data.systemHealth).toBeDefined()
        expect(data.systemHealth.database).toBeDefined()
        expect(data.systemHealth.redis).toBeDefined()
        expect(data.systemHealth.memory).toBeDefined()
      })
    })

    describe('Admin User Management', () => {
      it('should get users with admin privileges', async () => {
        const request = new NextRequest('http://localhost:3000/api/admin/users', {
          headers: { 'Authorization': `Bearer ${adminToken}` }
        })

        const response = await adminUsersGet(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        expect(data.users).toBeDefined()
        expect(Array.isArray(data.users)).toBe(true)
      })

      it('should support advanced user filtering', async () => {
        const request = new NextRequest('http://localhost:3000/api/admin/users?status=active&role=user', {
          headers: { 'Authorization': `Bearer ${adminToken}` }
        })

        const response = await adminUsersGet(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.users).toBeDefined()
      })

      it('should include sensitive admin fields', async () => {
        const request = new NextRequest('http://localhost:3000/api/admin/users', {
          headers: { 'Authorization': `Bearer ${adminToken}` }
        })

        const response = await adminUsersGet(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        if (data.users.length > 0) {
          const user = data.users[0]
          expect(user).toHaveProperty('email')
          expect(user).toHaveProperty('createdAt')
          expect(user).toHaveProperty('lastLoginAt')
          expect(user).not.toHaveProperty('password') // Still should not include password
        }
      })
    })

    describe('Admin Game Management', () => {
      beforeEach(async () => {
        // Create test games for admin to manage
        await createTestGame({
          name: 'Test Game 1',
          ownerId: testUser.id,
          status: 'active'
        })
      })

      it('should get games with admin privileges', async () => {
        const request = new NextRequest('http://localhost:3000/api/admin/games', {
          headers: { 'Authorization': `Bearer ${adminToken}` }
        })

        const response = await adminGamesGet(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        expect(data.games).toBeDefined()
        expect(Array.isArray(data.games)).toBe(true)
      })

      it('should support game status filtering', async () => {
        const request = new NextRequest('http://localhost:3000/api/admin/games?status=active', {
          headers: { 'Authorization': `Bearer ${adminToken}` }
        })

        const response = await adminGamesGet(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.games).toBeDefined()
      })

      it('should include detailed game information', async () => {
        const request = new NextRequest('http://localhost:3000/api/admin/games', {
          headers: { 'Authorization': `Bearer ${adminToken}` }
        })

        const response = await adminGamesGet(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        if (data.games.length > 0) {
          const game = data.games[0]
          expect(game).toHaveProperty('id')
          expect(game).toHaveProperty('name')
          expect(game).toHaveProperty('owner')
          expect(game).toHaveProperty('createdAt')
          expect(game).toHaveProperty('playerCount')
        }
      })
    })
  })

  describe('Error Handling and Edge Cases', () => {
    it('should handle malformed JSON gracefully', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid-json{'
      })

      const response = await authPost(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toContain('Invalid JSON')
    })

    it('should handle missing Content-Type header', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: 'test@example.com', password: 'password' })
      })

      const response = await authPost(request)

      // Should still work or return appropriate error
      expect(response.status).toBeOneOf([200, 400, 415])
    })

    it('should handle very large request bodies', async () => {
      const largeData = {
        email: 'test@example.com',
        password: 'password',
        bio: 'x'.repeat(10000) // Very large bio
      }

      const request = new NextRequest('http://localhost:3000/api/users/profile', {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify(largeData)
      })

      const response = await userProfilePatch(request, { params: { userId: testUser.id } })

      expect(response.status).toBeOneOf([400, 413]) // Bad Request or Payload Too Large
    })

    it('should handle concurrent requests to same resource', async () => {
      const updateData = { displayName: `Updated ${Date.now()}` }

      const promises = Array.from({ length: 10 }, () => {
        const request = new NextRequest(`http://localhost:3000/api/users/${testUser.id}/profile`, {
          method: 'PATCH',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
          },
          body: JSON.stringify(updateData)
        })

        return userProfilePatch(request, { params: { userId: testUser.id } })
      })

      const responses = await Promise.all(promises)

      // All should succeed or fail gracefully
      responses.forEach(response => {
        expect(response.status).toBeOneOf([200, 409, 429]) // Success, Conflict, or Rate Limited
      })
    })

    it('should handle database connection failures gracefully', async () => {
      // Mock database failure
      vi.mock('@/lib/supabase/client', () => ({
        supabase: {
          from: () => ({
            select: () => ({
              eq: () => ({
                single: () => Promise.reject(new Error('Database connection failed'))
              })
            })
          })
        }
      }))

      const request = new NextRequest(`http://localhost:3000/api/users/${testUser.id}/profile`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      })

      const response = await userProfileGet(request, { params: { userId: testUser.id } })

      expect(response.status).toBe(500)
      
      vi.restoreAllMocks()
    })

    it('should handle invalid UUID parameters', async () => {
      const request = new NextRequest('http://localhost:3000/api/users/invalid-uuid/profile', {
        headers: { 'Authorization': `Bearer ${authToken}` }
      })

      const response = await userProfileGet(request, { params: { userId: 'invalid-uuid' } })

      expect(response.status).toBe(400)
    })

    it('should return consistent error format', async () => {
      const invalidRequests = [
        {
          url: 'http://localhost:3000/api/users/invalid-uuid/profile',
          method: 'GET',
          headers: { 'Authorization': `Bearer ${authToken}` },
          params: { userId: 'invalid-uuid' }
        },
        {
          url: 'http://localhost:3000/api/auth/login',
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: 'invalid' })
        }
      ]

      for (const reqData of invalidRequests) {
        const request = new NextRequest(reqData.url, {
          method: reqData.method,
          headers: reqData.headers,
          body: reqData.body
        })

        let response
        if (reqData.url.includes('/profile')) {
          response = await userProfileGet(request, reqData.params)
        } else {
          response = await authPost(request)
        }

        const data = await response.json()

        // Should have consistent error format
        expect(data).toHaveProperty('success')
        expect(data.success).toBe(false)
        expect(data).toHaveProperty('error')
        expect(data).toHaveProperty('timestamp')
      }
    })
  })

  describe('Security Headers and CORS', () => {
    it('should include security headers', async () => {
      const request = new NextRequest('http://localhost:3000/api/health')
      const response = await healthGet(request)

      // Check for security headers
      expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff')
      expect(response.headers.get('X-Frame-Options')).toBe('DENY')
      expect(response.headers.get('X-XSS-Protection')).toBe('1; mode=block')
    })

    it('should handle CORS preflight requests', async () => {
      const request = new NextRequest('http://localhost:3000/api/health', {
        method: 'OPTIONS',
        headers: {
          'Origin': 'http://localhost:3000',
          'Access-Control-Request-Method': 'GET'
        }
      })

      const response = await healthGet(request)

      expect(response.headers.get('Access-Control-Allow-Origin')).toBeDefined()
      expect(response.headers.get('Access-Control-Allow-Methods')).toBeDefined()
    })

    it('should validate request origins', async () => {
      const request = new NextRequest('http://localhost:3000/api/health', {
        headers: { 'Origin': 'http://malicious-site.com' }
      })

      const response = await healthGet(request)

      // Should either block or handle appropriately based on CORS policy
      if (response.headers.get('Access-Control-Allow-Origin')) {
        expect(response.headers.get('Access-Control-Allow-Origin')).not.toBe('http://malicious-site.com')
      }
    })
  })

  describe('Performance and Load Testing', () => {
    it('should handle moderate concurrent load', async () => {
      const startTime = performance.now()

      const promises = Array.from({ length: 50 }, () => {
        const request = new NextRequest('http://localhost:3000/api/health')
        return healthGet(request)
      })

      const responses = await Promise.all(promises)
      const endTime = performance.now()

      expect(responses).toHaveLength(50)
      responses.forEach(response => {
        expect(response.status).toBe(200)
      })

      // Should complete within reasonable time (< 5 seconds)
      expect(endTime - startTime).toBeLessThan(5000)
    })

    it('should maintain response times under load', async () => {
      const responseTimes: number[] = []

      for (let i = 0; i < 20; i++) {
        const startTime = performance.now()
        
        const request = new NextRequest(`http://localhost:3000/api/users/${testUser.id}/profile`, {
          headers: { 'Authorization': `Bearer ${authToken}` }
        })
        
        await userProfileGet(request, { params: { userId: testUser.id } })
        
        const endTime = performance.now()
        responseTimes.push(endTime - startTime)
      }

      const averageTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
      const maxTime = Math.max(...responseTimes)

      expect(averageTime).toBeLessThan(500) // Average < 500ms
      expect(maxTime).toBeLessThan(2000) // No request > 2s
    })

    it('should handle memory efficiently under repeated requests', async () => {
      const initialMemory = process.memoryUsage().heapUsed

      // Make many requests to test memory usage
      for (let i = 0; i < 100; i++) {
        const request = new NextRequest('http://localhost:3000/api/health')
        await healthGet(request)
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc()
      }

      const finalMemory = process.memoryUsage().heapUsed
      const memoryIncrease = finalMemory - initialMemory

      // Memory increase should be reasonable (< 50MB)
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024)
    })
  })
})