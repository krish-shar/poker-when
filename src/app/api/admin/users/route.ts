import { NextRequest, NextResponse } from 'next/server'
import { RBACService, requirePermission } from '@/lib/admin/rbac'
import { SecurityErrorHandler } from '@/lib/security/error-handler'
import { validateRequest } from '@/lib/middleware/validation'
import { adminUserSchema, userUpdateSchema } from '@/lib/validation/schemas'
import type { AdminUser, PaginatedResponse } from '@/types'

/**
 * Admin Users Management API
 */

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const userId = request.headers.get('user-id')
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check permissions
    try {
      requirePermission('users:read')(userId)
    } catch {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Parse query parameters
    const page = parseInt(url.searchParams.get('page') || '1')
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 100)
    const search = url.searchParams.get('search')
    const role = url.searchParams.get('role')
    const status = url.searchParams.get('status')
    const sortBy = url.searchParams.get('sortBy') || 'created_at'
    const sortOrder = url.searchParams.get('sortOrder') === 'asc' ? 'asc' : 'desc'

    // Mock implementation - In production, this would query the database
    const mockUsers: AdminUser[] = [
      {
        id: 'user-1',
        email: 'admin@example.com',
        username: 'admin',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        email_verified: true,
        roles: [
          {
            userId: 'user-1',
            role: 'admin',
            grantedBy: 'system',
            grantedAt: new Date()
          }
        ],
        isActive: true,
        lastActivity: new Date(),
        loginAttempts: 0,
        twoFactorEnabled: true
      },
      {
        id: 'user-2',
        email: 'moderator@example.com',
        username: 'moderator',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        email_verified: true,
        roles: [
          {
            userId: 'user-2',
            role: 'moderator',
            grantedBy: 'user-1',
            grantedAt: new Date()
          }
        ],
        isActive: true,
        lastActivity: new Date(),
        loginAttempts: 0,
        twoFactorEnabled: false
      }
    ]

    // Apply filters
    let filteredUsers = mockUsers
    
    if (search) {
      const searchLower = search.toLowerCase()
      filteredUsers = filteredUsers.filter(user => 
        user.email.toLowerCase().includes(searchLower) ||
        user.username.toLowerCase().includes(searchLower)
      )
    }

    if (role) {
      filteredUsers = filteredUsers.filter(user =>
        user.roles.some(r => r.role === role)
      )
    }

    if (status) {
      filteredUsers = filteredUsers.filter(user => {
        if (status === 'active') return user.isActive
        if (status === 'inactive') return !user.isActive
        if (status === 'locked') return user.lockedUntil && user.lockedUntil > new Date()
        return true
      })
    }

    // Apply sorting
    filteredUsers.sort((a, b) => {
      let aValue: any, bValue: any
      
      switch (sortBy) {
        case 'email':
          aValue = a.email
          bValue = b.email
          break
        case 'username':
          aValue = a.username
          bValue = b.username
          break
        case 'created_at':
          aValue = new Date(a.created_at)
          bValue = new Date(b.created_at)
          break
        case 'last_activity':
          aValue = a.lastActivity || new Date(0)
          bValue = b.lastActivity || new Date(0)
          break
        default:
          return 0
      }

      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1
      return 0
    })

    // Apply pagination
    const total = filteredUsers.length
    const startIndex = (page - 1) * limit
    const endIndex = startIndex + limit
    const paginatedUsers = filteredUsers.slice(startIndex, endIndex)

    const response: PaginatedResponse<AdminUser> = {
      data: paginatedUsers,
      pagination: {
        page,
        limit,
        total,
        has_more: endIndex < total
      }
    }

    return NextResponse.json(response)

  } catch (error) {
    await SecurityErrorHandler.logSecurityEvent({
      type: 'api_error',
      severity: 'medium',
      component: 'AdminUsersAPI',
      details: {
        message: (error as Error).message,
        stack: (error as Error).stack,
        endpoint: '/api/admin/users'
      },
      timestamp: new Date().toISOString()
    })

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('user-id')
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check permissions
    try {
      requirePermission('users:create')(userId)
    } catch {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Validate request body
    const body = await request.json()
    const validationResult = adminUserSchema.safeParse(body)
    
    if (!validationResult.success) {
      return NextResponse.json({
        error: 'Validation failed',
        details: validationResult.error.errors
      }, { status: 400 })
    }

    const userData = validationResult.data

    // Check if user can assign the specified role
    if (userData.role && !RBACService.canAssignRole(userId, userData.role)) {
      return NextResponse.json({
        error: 'Cannot assign role with higher privileges'
      }, { status: 403 })
    }

    // Mock user creation - In production, this would create in database
    const newUser: AdminUser = {
      id: `user-${Date.now()}`,
      email: userData.email,
      username: userData.username,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      email_verified: false,
      roles: userData.role ? [
        {
          userId: `user-${Date.now()}`,
          role: userData.role,
          grantedBy: userId,
          grantedAt: new Date()
        }
      ] : [],
      isActive: true,
      loginAttempts: 0,
      twoFactorEnabled: false
    }

    // Log admin action
    await SecurityErrorHandler.logSecurityEvent({
      type: 'admin_action',
      severity: 'info',
      component: 'AdminUsersAPI',
      details: {
        action: 'user_created',
        adminUserId: userId,
        targetUserId: newUser.id,
        targetEmail: newUser.email
      },
      timestamp: new Date().toISOString()
    })

    return NextResponse.json({ data: newUser }, { status: 201 })

  } catch (error) {
    await SecurityErrorHandler.logSecurityEvent({
      type: 'api_error',
      severity: 'medium',
      component: 'AdminUsersAPI',
      details: {
        message: (error as Error).message,
        stack: (error as Error).stack,
        endpoint: '/api/admin/users',
        method: 'POST'
      },
      timestamp: new Date().toISOString()
    })

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}