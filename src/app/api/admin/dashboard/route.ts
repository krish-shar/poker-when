import { NextRequest, NextResponse } from 'next/server'
import { RBACService, requirePermission } from '@/lib/admin/rbac'
import { SecurityErrorHandler } from '@/lib/security/error-handler'

/**
 * Admin Dashboard Statistics API
 */

export interface DashboardStats {
  users: {
    total: number
    active: number
    newThisWeek: number
    verifiedEmail: number
  }
  games: {
    total: number
    active: number
    archived: number
    newThisWeek: number
  }
  sessions: {
    total: number
    active: number
    completedToday: number
    totalHands: number
  }
  financial: {
    totalVolume: number
    totalRake: number
    avgSessionSize: number
    revenueThisMonth: number
  }
  system: {
    uptime: number
    errorRate: number
    avgResponseTime: number
    activeConnections: number
  }
  recentActivity: ActivityEvent[]
}

export interface ActivityEvent {
  id: string
  type: 'user_registered' | 'game_created' | 'session_started' | 'admin_action' | 'system_alert'
  description: string
  user?: string
  timestamp: string
  severity: 'info' | 'warning' | 'error'
}

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('user-id')
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check permissions - require basic analytics access
    try {
      requirePermission('analytics:read')(userId)
    } catch {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Get time range for filtering (default to last 30 days)
    const url = new URL(request.url)
    const range = url.searchParams.get('range') || '30d'
    
    // Calculate date ranges
    const now = new Date()
    let startDate: Date
    
    switch (range) {
      case '24h':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000)
        break
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        break
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        break
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
        break
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    }

    // Mock dashboard statistics - In production, this would aggregate from database
    const dashboardStats: DashboardStats = {
      users: {
        total: 1250,
        active: 890,
        newThisWeek: 45,
        verifiedEmail: 1100
      },
      games: {
        total: 85,
        active: 62,
        archived: 23,
        newThisWeek: 8
      },
      sessions: {
        total: 420,
        active: 12,
        completedToday: 28,
        totalHands: 15680
      },
      financial: {
        totalVolume: 125000,
        totalRake: 3750,
        avgSessionSize: 295,
        revenueThisMonth: 1200
      },
      system: {
        uptime: 99.8,
        errorRate: 0.2,
        avgResponseTime: 180,
        activeConnections: 45
      },
      recentActivity: [
        {
          id: 'activity-1',
          type: 'user_registered',
          description: 'New user registration: john.doe@example.com',
          user: 'john.doe@example.com',
          timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
          severity: 'info'
        },
        {
          id: 'activity-2',
          type: 'game_created',
          description: 'New game created: "Weekend Warriors"',
          user: 'gameowner@example.com',
          timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
          severity: 'info'
        },
        {
          id: 'activity-3',
          type: 'session_started',
          description: 'Session started in "Friday Night Poker"',
          timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
          severity: 'info'
        },
        {
          id: 'activity-4',
          type: 'admin_action',
          description: 'User role updated by admin',
          user: userId,
          timestamp: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
          severity: 'info'
        },
        {
          id: 'activity-5',
          type: 'system_alert',
          description: 'High memory usage detected on server-2',
          timestamp: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
          severity: 'warning'
        }
      ]
    }

    // Filter activity by user permissions
    const userPermissions = RBACService.getUserPermissions(userId)
    const filteredActivity = dashboardStats.recentActivity.filter(activity => {
      switch (activity.type) {
        case 'user_registered':
          return userPermissions.has('users:read')
        case 'game_created':
          return userPermissions.has('games:read')
        case 'session_started':
          return userPermissions.has('sessions:read')
        case 'admin_action':
          return userPermissions.has('audit:read')
        case 'system_alert':
          return userPermissions.has('system:read')
        default:
          return true
      }
    })

    dashboardStats.recentActivity = filteredActivity

    // Filter stats based on permissions
    const filteredStats: Partial<DashboardStats> = {}

    if (userPermissions.has('users:read')) {
      filteredStats.users = dashboardStats.users
    }

    if (userPermissions.has('games:read')) {
      filteredStats.games = dashboardStats.games
    }

    if (userPermissions.has('sessions:read')) {
      filteredStats.sessions = dashboardStats.sessions
    }

    if (userPermissions.has('finances:read')) {
      filteredStats.financial = dashboardStats.financial
    }

    if (userPermissions.has('system:read')) {
      filteredStats.system = dashboardStats.system
    }

    filteredStats.recentActivity = filteredActivity

    return NextResponse.json({ 
      data: filteredStats,
      range,
      generatedAt: new Date().toISOString()
    })

  } catch (error) {
    await SecurityErrorHandler.logSecurityEvent({
      type: 'api_error',
      severity: 'medium',
      component: 'AdminDashboardAPI',
      details: {
        message: (error as Error).message,
        stack: (error as Error).stack,
        endpoint: '/api/admin/dashboard'
      },
      timestamp: new Date().toISOString()
    })

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}