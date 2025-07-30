'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAdminAuth } from './AdminAuthProvider'
import { cn } from '@/lib/utils'

interface NavigationItem {
  name: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  permission?: string
  badge?: string
}

// Icons
const DashboardIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5a2 2 0 012-2h4a2 2 0 012 2v14H8V5z" />
  </svg>
)

const UsersIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
  </svg>
)

const GamesIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
  </svg>
)

const SessionsIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
  </svg>
)

const AnalyticsIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
  </svg>
)

const SystemIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
)

const AuditIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
)

export function AdminSidebar() {
  const { hasPermission } = useAdminAuth()
  const pathname = usePathname()
  const [isCollapsed, setIsCollapsed] = useState(false)

  const navigation: NavigationItem[] = [
    {
      name: 'Dashboard',
      href: '/admin',
      icon: DashboardIcon,
      permission: 'analytics:read'
    },
    {
      name: 'Users',
      href: '/admin/users',
      icon: UsersIcon,
      permission: 'users:read'
    },
    {
      name: 'Games',
      href: '/admin/games',
      icon: GamesIcon,
      permission: 'games:read'
    },
    {
      name: 'Sessions',
      href: '/admin/sessions',
      icon: SessionsIcon,
      permission: 'sessions:read'
    },
    {
      name: 'Analytics',
      href: '/admin/analytics',
      icon: AnalyticsIcon,
      permission: 'analytics:read'
    },
    {
      name: 'System',
      href: '/admin/system',
      icon: SystemIcon,
      permission: 'system:read'
    },
    {
      name: 'Audit Logs',
      href: '/admin/audit',
      icon: AuditIcon,
      permission: 'audit:read'
    }
  ]

  // Filter navigation based on permissions
  const filteredNavigation = navigation.filter(item => {
    if (!item.permission) return true
    return hasPermission(item.permission as any)
  })

  return (
    <aside className={cn(
      "bg-white border-r border-gray-200 dark:bg-gray-800 dark:border-gray-700 transition-all duration-300",
      isCollapsed ? "w-16" : "w-64"
    )}>
      <div className="flex h-full flex-col">
        {/* Collapse toggle */}
        <div className="flex h-16 items-center justify-between px-4">
          {!isCollapsed && (
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Navigation
            </h2>
          )}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="rounded-md p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-500 dark:hover:bg-gray-700 dark:hover:text-gray-300"
          >
            <svg 
              className={cn("h-5 w-5 transition-transform", isCollapsed && "rotate-180")} 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
            </svg>
          </button>
        </div>

        {/* Navigation links */}
        <nav className="flex-1 space-y-1 px-2 pb-4">
          {filteredNavigation.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "group flex items-center rounded-md px-2 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-blue-100 text-blue-900 dark:bg-blue-900/20 dark:text-blue-200"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-white"
                )}
                title={isCollapsed ? item.name : undefined}
              >
                <item.icon className={cn(
                  "flex-shrink-0 h-5 w-5",
                  isActive 
                    ? "text-blue-500 dark:text-blue-400" 
                    : "text-gray-400 group-hover:text-gray-500 dark:group-hover:text-gray-300"
                )} />
                {!isCollapsed && (
                  <span className="ml-3 flex-1">{item.name}</span>
                )}
                {!isCollapsed && item.badge && (
                  <span className="ml-3 inline-block rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800 dark:bg-red-900/20 dark:text-red-400">
                    {item.badge}
                  </span>
                )}
              </Link>
            )
          })}
        </nav>

        {/* System status indicator */}
        {!isCollapsed && (
          <div className="border-t border-gray-200 p-4 dark:border-gray-700">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="h-2 w-2 rounded-full bg-green-400"></div>
              </div>
              <div className="ml-3">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  System Status: Healthy
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  Uptime: 99.8%
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </aside>
  )
}