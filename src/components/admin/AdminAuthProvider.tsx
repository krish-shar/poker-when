'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { RBACService, type Role, type Permission } from '@/lib/admin/rbac'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'

interface AdminUser {
  id: string
  email: string
  username: string
  roles: Role[]
  permissions: Set<Permission>
  isActive: boolean
}

interface AdminAuthContextType {
  user: AdminUser | null
  loading: boolean
  hasPermission: (permission: Permission, scope?: string) => boolean
  hasRole: (role: Role, scope?: string) => boolean
  hasAnyPermission: (permissions: Permission[], scope?: string) => boolean
  logout: () => void
}

const AdminAuthContext = createContext<AdminAuthContextType | null>(null)

export function useAdminAuth() {
  const context = useContext(AdminAuthContext)
  if (!context) {
    throw new Error('useAdminAuth must be used within AdminAuthProvider')
  }
  return context
}

interface AdminAuthProviderProps {
  children: ReactNode
}

export function AdminAuthProvider({ children }: AdminAuthProviderProps) {
  const [user, setUser] = useState<AdminUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    initializeAuth()
  }, [])

  const initializeAuth = async () => {
    try {
      // In production, this would check actual authentication
      // For now, we'll simulate with a dev user
      if (process.env.NODE_ENV === 'development') {
        const devUser: AdminUser = {
          id: 'dev-super-admin',
          email: 'admin@dev.local',
          username: 'admin',
          roles: ['super_admin'],
          permissions: RBACService.getUserPermissions('dev-super-admin'),
          isActive: true
        }
        setUser(devUser)
      } else {
        // Check for actual authentication token/session
        const authCheck = await checkAuthentication()
        if (authCheck.user) {
          setUser(authCheck.user)
        }
      }
    } catch (error) {
      console.error('Authentication initialization failed:', error)
    } finally {
      setLoading(false)
    }
  }

  const checkAuthentication = async (): Promise<{ user: AdminUser | null }> => {
    try {
      // In production, this would validate JWT token and fetch user data
      const response = await fetch('/api/admin/auth/me', {
        credentials: 'include'
      })

      if (!response.ok) {
        return { user: null }
      }

      const userData = await response.json()
      const permissions = RBACService.getUserPermissions(userData.id)

      return {
        user: {
          id: userData.id,
          email: userData.email,
          username: userData.username,
          roles: userData.roles.map((r: any) => r.role),
          permissions,
          isActive: userData.isActive
        }
      }
    } catch (error) {
      console.error('Auth check failed:', error)
      return { user: null }
    }
  }

  const hasPermission = (permission: Permission, scope?: string): boolean => {
    if (!user) return false
    return RBACService.hasPermission(user.id, permission, scope)
  }

  const hasRole = (role: Role, scope?: string): boolean => {
    if (!user) return false
    return RBACService.hasRole(user.id, role, scope)
  }

  const hasAnyPermission = (permissions: Permission[], scope?: string): boolean => {
    if (!user) return false
    return RBACService.hasAnyPermission(user.id, permissions, scope)
  }

  const logout = async () => {
    try {
      await fetch('/api/admin/auth/logout', {
        method: 'POST',
        credentials: 'include'
      })
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      setUser(null)
      // Redirect to login page
      window.location.href = '/admin/login'
    }
  }

  // Show loading spinner while checking authentication
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">
            Checking authentication...
          </p>
        </div>
      </div>
    )
  }

  // Show access denied if user doesn't have admin permissions
  if (!user || (!hasAnyPermission(['users:read', 'games:read', 'analytics:read']))) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="text-center max-w-md">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
            <svg className="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
            Access Denied
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            You don't have permission to access the admin panel.
          </p>
          <div className="mt-6">
            <button
              onClick={() => window.location.href = '/'}
              className="inline-flex items-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Return to Home
            </button>
          </div>
        </div>
      </div>
    )
  }

  const contextValue: AdminAuthContextType = {
    user,
    loading,
    hasPermission,
    hasRole,
    hasAnyPermission,
    logout
  }

  return (
    <AdminAuthContext.Provider value={contextValue}>
      {children}
    </AdminAuthContext.Provider>
  )
}