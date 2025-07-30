import { NextRequest, NextResponse } from 'next/server'
import { RBACService, requirePermission } from '@/lib/admin/rbac'
import { SecurityErrorHandler } from '@/lib/security/error-handler'
import { userUpdateSchema } from '@/lib/validation/schemas'
import type { AdminUser } from '@/types'

interface RouteParams {
  params: {
    id: string
  }
}

/**
 * Individual User Management API
 */

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const userId = request.headers.get('user-id')
    const targetUserId = params.id
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check permissions
    try {
      requirePermission('users:read')(userId)
    } catch {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Mock user data - In production, this would query the database
    const mockUser: AdminUser = {
      id: targetUserId,
      email: 'user@example.com',
      username: 'testuser',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      email_verified: true,
      metadata: {
        lastLoginIp: '192.168.1.1',
        registrationIp: '192.168.1.1',
        loginHistory: []
      },
      roles: [
        {
          userId: targetUserId,
          role: 'member',
          grantedBy: 'system',
          grantedAt: new Date()
        }
      ],
      isActive: true,
      lastActivity: new Date(),
      loginAttempts: 0,
      twoFactorEnabled: false
    }

    return NextResponse.json({ data: mockUser })

  } catch (error) {
    await SecurityErrorHandler.logSecurityEvent({
      type: 'api_error',
      severity: 'medium',
      component: 'AdminUserAPI',
      details: {
        message: (error as Error).message,
        stack: (error as Error).stack,
        endpoint: `/api/admin/users/${params.id}`
      },
      timestamp: new Date().toISOString()
    })

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const userId = request.headers.get('user-id')
    const targetUserId = params.id
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check permissions
    const canUpdate = RBACService.canManageUser(userId, targetUserId, 'users:update')
    if (!canUpdate) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Validate request body
    const body = await request.json()
    const validationResult = userUpdateSchema.safeParse(body)
    
    if (!validationResult.success) {
      return NextResponse.json({
        error: 'Validation failed',
        details: validationResult.error.errors
      }, { status: 400 })
    }

    const updateData = validationResult.data

    // Check role assignment permissions
    if (updateData.role && !RBACService.canAssignRole(userId, updateData.role)) {
      return NextResponse.json({
        error: 'Cannot assign role with higher privileges'
      }, { status: 403 })
    }

    // Mock user update - In production, this would update the database
    const updatedUser: AdminUser = {
      id: targetUserId,
      email: updateData.email || 'user@example.com',
      username: updateData.username || 'testuser',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      email_verified: updateData.email_verified ?? true,
      roles: updateData.role ? [
        {
          userId: targetUserId,
          role: updateData.role,
          grantedBy: userId,
          grantedAt: new Date()
        }
      ] : [],
      isActive: updateData.isActive ?? true,
      lastActivity: new Date(),
      loginAttempts: 0,
      twoFactorEnabled: updateData.twoFactorEnabled ?? false
    }

    // Log admin action
    await SecurityErrorHandler.logSecurityEvent({
      type: 'admin_action',
      severity: 'info',
      component: 'AdminUserAPI',
      details: {
        action: 'user_updated',
        adminUserId: userId,
        targetUserId,
        changes: updateData
      },
      timestamp: new Date().toISOString()
    })

    return NextResponse.json({ data: updatedUser })

  } catch (error) {
    await SecurityErrorHandler.logSecurityEvent({
      type: 'api_error',
      severity: 'medium',
      component: 'AdminUserAPI',
      details: {
        message: (error as Error).message,
        stack: (error as Error).stack,
        endpoint: `/api/admin/users/${params.id}`,
        method: 'PUT'
      },
      timestamp: new Date().toISOString()
    })

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const userId = request.headers.get('user-id')
    const targetUserId = params.id
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check permissions
    const canDelete = RBACService.canManageUser(userId, targetUserId, 'users:delete')
    if (!canDelete) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Prevent self-deletion
    if (userId === targetUserId) {
      return NextResponse.json({
        error: 'Cannot delete your own account'
      }, { status: 400 })
    }

    // Mock user deletion - In production, this would soft-delete or anonymize user data
    // For safety, we should typically soft-delete rather than hard delete
    
    // Log admin action
    await SecurityErrorHandler.logSecurityEvent({
      type: 'admin_action',
      severity: 'high',
      component: 'AdminUserAPI',
      details: {
        action: 'user_deleted',
        adminUserId: userId,
        targetUserId
      },
      timestamp: new Date().toISOString()
    })

    return NextResponse.json({ message: 'User deleted successfully' })

  } catch (error) {
    await SecurityErrorHandler.logSecurityEvent({
      type: 'api_error',
      severity: 'medium',
      component: 'AdminUserAPI',
      details: {
        message: (error as Error).message,
        stack: (error as Error).stack,
        endpoint: `/api/admin/users/${params.id}`,
        method: 'DELETE'
      },
      timestamp: new Date().toISOString()
    })

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}