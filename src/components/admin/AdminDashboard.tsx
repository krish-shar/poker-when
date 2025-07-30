'use client'

import { useState } from 'react'
import { useAdminAuth } from './AdminAuthProvider'
import type { DashboardStats, ActivityEvent } from '@/app/api/admin/dashboard/route'

interface AdminDashboardProps {
  stats: DashboardStats
  onRefresh: () => void
  selectedRange: string
}

interface StatCardProps {
  title: string
  value: string | number
  change?: string
  changeType?: 'positive' | 'negative' | 'neutral'
  icon: React.ReactNode
  loading?: boolean
}

function StatCard({ title, value, change, changeType, icon, loading }: StatCardProps) {
  return (
    <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
      <div className="p-5">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <div className="text-gray-400 dark:text-gray-500">
              {icon}
            </div>
          </div>
          <div className="ml-5 w-0 flex-1">
            <dl>
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                {title}
              </dt>
              <dd className="flex items-baseline">
                <div className="text-2xl font-semibold text-gray-900 dark:text-white">
                  {loading ? (
                    <div className="animate-pulse h-8 bg-gray-300 dark:bg-gray-600 rounded w-16"></div>
                  ) : (
                    typeof value === 'number' ? value.toLocaleString() : value
                  )}
                </div>
                {change && (
                  <div className={`ml-2 flex items-baseline text-sm font-semibold ${
                    changeType === 'positive' ? 'text-green-600' : 
                    changeType === 'negative' ? 'text-red-600' : 
                    'text-gray-500'
                  }`}>
                    {changeType === 'positive' && (
                      <svg className="self-center flex-shrink-0 h-5 w-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                    {changeType === 'negative' && (
                      <svg className="self-center flex-shrink-0 h-5 w-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M14.707 10.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 12.586V5a1 1 0 012 0v7.586l2.293-2.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                    <span className="sr-only">
                      {changeType === 'positive' ? 'Increased' : 'Decreased'} by
                    </span>
                    {change}
                  </div>
                )}
              </dd>
            </dl>
          </div>
        </div>
      </div>
    </div>
  )
}

function ActivityFeed({ activities }: { activities: ActivityEvent[] }) {
  const getSeverityColor = (severity: ActivityEvent['severity']) => {
    switch (severity) {
      case 'error':
        return 'text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/20'
      case 'warning':
        return 'text-yellow-600 bg-yellow-100 dark:text-yellow-400 dark:bg-yellow-900/20'
      default:
        return 'text-blue-600 bg-blue-100 dark:text-blue-400 dark:bg-blue-900/20'
    }
  }

  const getTypeIcon = (type: ActivityEvent['type']) => {
    switch (type) {
      case 'user_registered':
        return (
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
          </svg>
        )
      case 'game_created':
        return (
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
        )
      case 'session_started':
        return (
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1.5a1.5 1.5 0 011.5 1.5V14a.5.5 0 01-.5.5h-3a.5.5 0 01-.5-.5v-2.5A1.5 1.5 0 019 10z" />
          </svg>
        )
      case 'admin_action':
        return (
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          </svg>
        )
      case 'system_alert':
        return (
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        )
      default:
        return (
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )
    }
  }

  return (
    <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">
          Recent Activity
        </h3>
      </div>
      <div className="divide-y divide-gray-200 dark:divide-gray-700">
        {activities.length === 0 ? (
          <div className="p-6 text-center">
            <p className="text-gray-500 dark:text-gray-400">No recent activity</p>
          </div>
        ) : (
          activities.map((activity) => (
            <div key={activity.id} className="p-6">
              <div className="flex items-start space-x-3">
                <div className={`flex-shrink-0 rounded-full p-2 ${getSeverityColor(activity.severity)}`}>
                  {getTypeIcon(activity.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900 dark:text-white">
                    {activity.description}
                  </p>
                  {activity.user && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      by {activity.user}
                    </p>
                  )}
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                    {new Date(activity.timestamp).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export function AdminDashboard({ stats, onRefresh, selectedRange }: AdminDashboardProps) {
  const { hasPermission } = useAdminAuth()

  return (
    <div className="space-y-6">
      {/* Overview Stats */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {hasPermission('users:read') && stats.users && (
          <StatCard
            title="Total Users"
            value={stats.users.total}
            change={`+${stats.users.newThisWeek} this week`}
            changeType="positive"
            icon={
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
              </svg>
            }
          />
        )}

        {hasPermission('games:read') && stats.games && (
          <StatCard
            title="Active Games"
            value={stats.games.active}
            change={`${stats.games.total} total`}
            changeType="neutral"
            icon={
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            }
          />
        )}

        {hasPermission('sessions:read') && stats.sessions && (
          <StatCard
            title="Active Sessions"
            value={stats.sessions.active}
            change={`${stats.sessions.completedToday} completed today`}
            changeType="positive"
            icon={
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            }
          />
        )}

        {hasPermission('system:read') && stats.system && (
          <StatCard
            title="System Health"
            value={`${stats.system.uptime}%`}
            change={`${stats.system.activeConnections} connections`}
            changeType="positive"
            icon={
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
        )}
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {hasPermission('finances:read') && stats.financial && (
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              Financial Overview
            </h3>
            <div className="space-y-4">
              <div className="flex justify-between">
                <span className="text-sm text-gray-500 dark:text-gray-400">Total Volume</span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  ${stats.financial.totalVolume.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500 dark:text-gray-400">Total Rake</span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  ${stats.financial.totalRake.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500 dark:text-gray-400">Avg Session Size</span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  ${stats.financial.avgSessionSize.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500 dark:text-gray-400">Revenue This Month</span>
                <span className="text-sm font-medium text-green-600 dark:text-green-400">
                  ${stats.financial.revenueThisMonth.toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        )}

        {hasPermission('system:read') && stats.system && (
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              System Performance
            </h3>
            <div className="space-y-4">
              <div className="flex justify-between">
                <span className="text-sm text-gray-500 dark:text-gray-400">Uptime</span>
                <span className="text-sm font-medium text-green-600 dark:text-green-400">
                  {stats.system.uptime}%
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500 dark:text-gray-400">Error Rate</span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {stats.system.errorRate}%
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500 dark:text-gray-400">Avg Response Time</span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {stats.system.avgResponseTime}ms
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500 dark:text-gray-400">Active Connections</span>
                <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
                  {stats.system.activeConnections}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Activity Feed */}
      <ActivityFeed activities={stats.recentActivity} />
    </div>
  )
}