import type { User, GameMembership } from '@/types'

/**
 * Role-Based Access Control (RBAC) System
 */

export type Permission = 
  // User management
  | 'users:read' | 'users:create' | 'users:update' | 'users:delete' | 'users:ban'
  // Game management
  | 'games:read' | 'games:create' | 'games:update' | 'games:delete' | 'games:archive'
  // Session management
  | 'sessions:read' | 'sessions:create' | 'sessions:update' | 'sessions:delete' | 'sessions:control'
  // Financial management
  | 'finances:read' | 'finances:create' | 'finances:update' | 'finances:delete'
  // Analytics
  | 'analytics:read' | 'analytics:export'
  // System administration
  | 'system:read' | 'system:update' | 'system:maintenance'
  // Audit logs
  | 'audit:read' | 'audit:export'

export type Role = 'super_admin' | 'admin' | 'moderator' | 'game_owner' | 'game_admin' | 'member' | 'user'

export interface RoleDefinition {
  name: Role
  description: string
  permissions: Permission[]
  level: number // Higher number = more privileges
}

export interface UserRole {
  userId: string
  role: Role
  scope?: string // Optional scope (e.g., specific home game ID)
  grantedBy: string
  grantedAt: Date
  expiresAt?: Date
}

export interface AdminUser extends User {
  roles: UserRole[]
  isActive: boolean
  lastActivity?: Date
  loginAttempts: number
  lockedUntil?: Date
  twoFactorEnabled: boolean
}

/**
 * Role definitions with their permissions
 */
export const ROLE_DEFINITIONS: Record<Role, RoleDefinition> = {
  super_admin: {
    name: 'super_admin',
    description: 'Full system access with all permissions',
    level: 100,
    permissions: [
      'users:read', 'users:create', 'users:update', 'users:delete', 'users:ban',
      'games:read', 'games:create', 'games:update', 'games:delete', 'games:archive',
      'sessions:read', 'sessions:create', 'sessions:update', 'sessions:delete', 'sessions:control',
      'finances:read', 'finances:create', 'finances:update', 'finances:delete',
      'analytics:read', 'analytics:export',
      'system:read', 'system:update', 'system:maintenance',
      'audit:read', 'audit:export'
    ]
  },
  admin: {
    name: 'admin',
    description: 'Administrative access with most permissions',
    level: 80,
    permissions: [
      'users:read', 'users:update', 'users:ban',
      'games:read', 'games:create', 'games:update', 'games:archive',
      'sessions:read', 'sessions:update', 'sessions:control',
      'finances:read', 'finances:update',
      'analytics:read', 'analytics:export',
      'system:read',
      'audit:read'
    ]
  },
  moderator: {
    name: 'moderator',
    description: 'Moderation capabilities for users and games',
    level: 60,
    permissions: [
      'users:read', 'users:update', 'users:ban',
      'games:read', 'games:update',
      'sessions:read', 'sessions:control',
      'analytics:read',
      'audit:read'
    ]
  },
  game_owner: {
    name: 'game_owner',
    description: 'Full control over owned games',
    level: 50,
    permissions: [
      'users:read',
      'games:read', 'games:update', 'games:archive',
      'sessions:read', 'sessions:create', 'sessions:update', 'sessions:control',
      'finances:read', 'finances:update',
      'analytics:read'
    ]
  },
  game_admin: {
    name: 'game_admin',
    description: 'Administrative access to specific games',
    level: 40,
    permissions: [
      'users:read',
      'games:read', 'games:update',
      'sessions:read', 'sessions:update', 'sessions:control',
      'finances:read',
      'analytics:read'
    ]
  },
  member: {
    name: 'member',
    description: 'Basic member access to games',
    level: 20,
    permissions: [
      'games:read',
      'sessions:read',
      'analytics:read'
    ]
  },
  user: {
    name: 'user',
    description: 'Basic user access',
    level: 10,
    permissions: [
      'games:read'
    ]
  }
}

/**
 * RBAC Service for managing roles and permissions
 */
export class RBACService {
  private static userRoles = new Map<string, UserRole[]>()
  private static roleCache = new Map<string, Set<Permission>>()

  /**
   * Check if user has specific permission
   */
  static hasPermission(userId: string, permission: Permission, scope?: string): boolean {
    const userRoles = this.getUserRoles(userId)
    
    for (const userRole of userRoles) {
      // Check if role has expired
      if (userRole.expiresAt && userRole.expiresAt < new Date()) {
        continue
      }
      
      // Check scope if specified
      if (scope && userRole.scope && userRole.scope !== scope) {
        continue
      }
      
      // Check if role has the permission
      const roleDefinition = ROLE_DEFINITIONS[userRole.role]
      if (roleDefinition.permissions.includes(permission)) {
        return true
      }
    }
    
    return false
  }

  /**
   * Check if user has any of the specified permissions
   */
  static hasAnyPermission(userId: string, permissions: Permission[], scope?: string): boolean {
    return permissions.some(permission => this.hasPermission(userId, permission, scope))
  }

  /**
   * Check if user has all specified permissions
   */
  static hasAllPermissions(userId: string, permissions: Permission[], scope?: string): boolean {
    return permissions.every(permission => this.hasPermission(userId, permission, scope))
  }

  /**
   * Check if user has specific role
   */
  static hasRole(userId: string, role: Role, scope?: string): boolean {
    const userRoles = this.getUserRoles(userId)
    return userRoles.some(userRole => {
      if (userRole.expiresAt && userRole.expiresAt < new Date()) {
        return false
      }
      
      if (scope && userRole.scope && userRole.scope !== scope) {
        return false
      }
      
      return userRole.role === role
    })
  }

  /**
   * Get user's highest role level
   */
  static getHighestRoleLevel(userId: string, scope?: string): number {
    const userRoles = this.getUserRoles(userId)
    let highestLevel = 0
    
    for (const userRole of userRoles) {
      if (userRole.expiresAt && userRole.expiresAt < new Date()) {
        continue
      }
      
      if (scope && userRole.scope && userRole.scope !== scope) {
        continue
      }
      
      const roleDefinition = ROLE_DEFINITIONS[userRole.role]
      highestLevel = Math.max(highestLevel, roleDefinition.level)
    }
    
    return highestLevel
  }

  /**
   * Get all permissions for user
   */
  static getUserPermissions(userId: string, scope?: string): Set<Permission> {
    const cacheKey = `${userId}:${scope || 'global'}`
    
    if (this.roleCache.has(cacheKey)) {
      return this.roleCache.get(cacheKey)!
    }
    
    const permissions = new Set<Permission>()
    const userRoles = this.getUserRoles(userId)
    
    for (const userRole of userRoles) {
      if (userRole.expiresAt && userRole.expiresAt < new Date()) {
        continue
      }
      
      if (scope && userRole.scope && userRole.scope !== scope) {
        continue
      }
      
      const roleDefinition = ROLE_DEFINITIONS[userRole.role]
      roleDefinition.permissions.forEach(permission => permissions.add(permission))
    }
    
    // Cache for 5 minutes
    this.roleCache.set(cacheKey, permissions)
    setTimeout(() => this.roleCache.delete(cacheKey), 5 * 60 * 1000)
    
    return permissions
  }

  /**
   * Grant role to user
   */
  static grantRole(userId: string, role: Role, grantedBy: string, scope?: string, expiresAt?: Date): UserRole {
    const userRole: UserRole = {
      userId,
      role,
      scope,
      grantedBy,
      grantedAt: new Date(),
      expiresAt
    }
    
    const userRoles = this.getUserRoles(userId)
    userRoles.push(userRole)
    this.userRoles.set(userId, userRoles)
    
    // Clear cache
    this.clearUserCache(userId)
    
    return userRole
  }

  /**
   * Revoke role from user
   */
  static revokeRole(userId: string, role: Role, scope?: string): boolean {
    const userRoles = this.getUserRoles(userId)
    const initialLength = userRoles.length
    
    const filteredRoles = userRoles.filter(userRole => {
      if (userRole.role !== role) return true
      if (scope && userRole.scope !== scope) return true
      return false
    })
    
    this.userRoles.set(userId, filteredRoles)
    
    // Clear cache
    this.clearUserCache(userId)
    
    return filteredRoles.length < initialLength
  }

  /**
   * Get user roles
   */
  static getUserRoles(userId: string): UserRole[] {
    return this.userRoles.get(userId) || []
  }

  /**
   * Set user roles (replace all existing)
   */
  static setUserRoles(userId: string, roles: UserRole[]): void {
    this.userRoles.set(userId, roles)
    this.clearUserCache(userId)
  }

  /**
   * Check if user can perform action on target user
   */
  static canManageUser(adminUserId: string, targetUserId: string, action: Permission): boolean {
    if (adminUserId === targetUserId && action !== 'users:update') {
      return false // Can't perform admin actions on self except update
    }
    
    const adminLevel = this.getHighestRoleLevel(adminUserId)
    const targetLevel = this.getHighestRoleLevel(targetUserId)
    
    // Can only manage users with lower role level
    if (adminLevel <= targetLevel) {
      return false
    }
    
    return this.hasPermission(adminUserId, action)
  }

  /**
   * Validate role assignment
   */
  static canAssignRole(adminUserId: string, targetRole: Role, scope?: string): boolean {
    const adminLevel = this.getHighestRoleLevel(adminUserId, scope)
    const targetRoleLevel = ROLE_DEFINITIONS[targetRole].level
    
    // Can only assign roles with lower level than admin's highest role
    return adminLevel > targetRoleLevel
  }

  /**
   * Convert game membership to user role
   */
  static gameMembershipToRole(membership: GameMembership): UserRole {
    let role: Role
    switch (membership.role) {
      case 'owner':
        role = 'game_owner'
        break
      case 'admin':
        role = 'game_admin'
        break
      default:
        role = 'member'
    }
    
    return {
      userId: membership.user_id,
      role,
      scope: membership.home_game_id,
      grantedBy: 'system',
      grantedAt: new Date(membership.joined_at)
    }
  }

  /**
   * Clear user cache
   */
  private static clearUserCache(userId: string): void {
    const keysToDelete = Array.from(this.roleCache.keys()).filter(key => key.startsWith(`${userId}:`))
    keysToDelete.forEach(key => this.roleCache.delete(key))
  }

  /**
   * Clear all caches
   */
  static clearAllCaches(): void {
    this.roleCache.clear()
  }

  /**
   * Initialize default roles for development/testing
   */
  static initializeDefaultRoles(): void {
    // Add default super admin (in production, this would be done through secure setup)
    if (process.env.NODE_ENV === 'development') {
      const superAdminRole: UserRole = {
        userId: 'dev-super-admin',
        role: 'super_admin',
        grantedBy: 'system',
        grantedAt: new Date()
      }
      this.userRoles.set('dev-super-admin', [superAdminRole])
    }
  }
}

/**
 * Middleware helper for checking permissions
 */
export function requirePermission(permission: Permission, scope?: string) {
  return (userId: string) => {
    if (!RBACService.hasPermission(userId, permission, scope)) {
      throw new Error(`Insufficient permissions: ${permission}`)
    }
  }
}

/**
 * Middleware helper for checking role
 */
export function requireRole(role: Role, scope?: string) {
  return (userId: string) => {
    if (!RBACService.hasRole(userId, role, scope)) {
      throw new Error(`Insufficient role: ${role}`)
    }
  }
}

/**
 * Initialize RBAC system
 */
RBACService.initializeDefaultRoles()