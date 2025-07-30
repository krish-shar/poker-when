import { NextRequest, NextResponse } from 'next/server'
import { RBACService, requirePermission } from '@/lib/admin/rbac'
import { SecurityErrorHandler } from '@/lib/security/error-handler'
import { gameConfigSchema } from '@/lib/validation/schemas'
import type { HomeGame, PaginatedResponse } from '@/types'

/**
 * Admin Games Management API
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
      requirePermission('games:read')(userId)
    } catch {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Parse query parameters
    const page = parseInt(url.searchParams.get('page') || '1')
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 100)
    const search = url.searchParams.get('search')
    const status = url.searchParams.get('status')
    const gameType = url.searchParams.get('gameType')
    const sortBy = url.searchParams.get('sortBy') || 'created_at'
    const sortOrder = url.searchParams.get('sortOrder') === 'asc' ? 'asc' : 'desc'

    // Mock implementation - In production, this would query the database
    const mockGames: HomeGame[] = [
      {
        id: 'game-1',
        owner_id: 'user-1',
        name: 'Friday Night Poker',
        description: 'Weekly poker game with friends',
        game_type: 'texas_holdem',
        settings: {
          small_blind: 1,
          big_blind: 2,
          max_players: 8,
          buy_in_min: 20,
          buy_in_max: 100,
          allow_rebuys: true,
          time_bank: 60
        },
        status: 'active',
        invite_code: 'FNP2024',
        created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 'game-2',
        owner_id: 'user-2',
        name: 'High Stakes Hold\'em',
        description: 'Serious players only',
        game_type: 'texas_holdem',
        settings: {
          small_blind: 5,
          big_blind: 10,
          max_players: 6,
          buy_in_min: 500,
          buy_in_max: 2000,
          allow_rebuys: false,
          time_bank: 30
        },
        status: 'active',
        invite_code: 'HSHH2024',
        created_at: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 'game-3',
        owner_id: 'user-3',
        name: 'Archived Game',
        description: 'This game is no longer active',
        game_type: 'omaha',
        settings: {
          small_blind: 2,
          big_blind: 4,
          max_players: 9,
          buy_in_min: 40,
          buy_in_max: 200,
          allow_rebuys: true,
          time_bank: 45
        },
        status: 'archived',
        invite_code: 'ARCH2024',
        created_at: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date().toISOString(),
        archived_at: new Date().toISOString()
      }
    ]

    // Apply filters
    let filteredGames = mockGames
    
    if (search) {
      const searchLower = search.toLowerCase()
      filteredGames = filteredGames.filter(game => 
        game.name.toLowerCase().includes(searchLower) ||
        (game.description && game.description.toLowerCase().includes(searchLower)) ||
        game.invite_code.toLowerCase().includes(searchLower)
      )
    }

    if (status) {
      filteredGames = filteredGames.filter(game => game.status === status)
    }

    if (gameType) {
      filteredGames = filteredGames.filter(game => game.game_type === gameType)
    }

    // Apply sorting
    filteredGames.sort((a, b) => {
      let aValue: any, bValue: any
      
      switch (sortBy) {
        case 'name':
          aValue = a.name
          bValue = b.name
          break
        case 'created_at':
          aValue = new Date(a.created_at)
          bValue = new Date(b.created_at)
          break
        case 'updated_at':
          aValue = new Date(a.updated_at)
          bValue = new Date(b.updated_at)
          break
        case 'status':
          aValue = a.status
          bValue = b.status
          break
        default:
          return 0
      }

      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1
      return 0
    })

    // Apply pagination
    const total = filteredGames.length
    const startIndex = (page - 1) * limit
    const endIndex = startIndex + limit
    const paginatedGames = filteredGames.slice(startIndex, endIndex)

    const response: PaginatedResponse<HomeGame> = {
      data: paginatedGames,
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
      component: 'AdminGamesAPI',
      details: {
        message: (error as Error).message,
        stack: (error as Error).stack,
        endpoint: '/api/admin/games'
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
      requirePermission('games:create')(userId)
    } catch {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Validate request body
    const body = await request.json()
    const validationResult = gameConfigSchema.safeParse(body)
    
    if (!validationResult.success) {
      return NextResponse.json({
        error: 'Validation failed',
        details: validationResult.error.errors
      }, { status: 400 })
    }

    const gameData = validationResult.data

    // Generate invite code
    const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase()

    // Mock game creation - In production, this would create in database
    const newGame: HomeGame = {
      id: `game-${Date.now()}`,
      owner_id: gameData.owner_id || userId,
      name: gameData.name,
      description: gameData.description,
      game_type: gameData.game_type,
      settings: gameData.settings,
      status: 'active',
      invite_code: inviteCode,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    // Log admin action
    await SecurityErrorHandler.logSecurityEvent({
      type: 'admin_action',
      severity: 'info',
      component: 'AdminGamesAPI',
      details: {
        action: 'game_created',
        adminUserId: userId,
        gameId: newGame.id,
        gameName: newGame.name
      },
      timestamp: new Date().toISOString()
    })

    return NextResponse.json({ data: newGame }, { status: 201 })

  } catch (error) {
    await SecurityErrorHandler.logSecurityEvent({
      type: 'api_error',
      severity: 'medium',
      component: 'AdminGamesAPI',
      details: {
        message: (error as Error).message,
        stack: (error as Error).stack,
        endpoint: '/api/admin/games',
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