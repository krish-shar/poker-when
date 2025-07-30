'use client'

import { useEffect, useState } from 'react'
import { AdminDashboard } from '@/components/admin/AdminDashboard'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { ErrorMessage } from '@/components/ui/ErrorMessage'
import type { DashboardStats } from '@/app/api/admin/dashboard/route'

export default function AdminPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedRange, setSelectedRange] = useState<string>('30d')

  useEffect(() => {
    fetchDashboardStats()
  }, [selectedRange])

  const fetchDashboardStats = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/admin/dashboard?range=${selectedRange}`, {
        headers: {
          'user-id': 'dev-super-admin' // In production, this would come from auth context
        }
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const result = await response.json()
      setStats(result.data)
    } catch (err) {
      console.error('Failed to fetch dashboard stats:', err)
      setError(err instanceof Error ? err.message : 'Failed to load dashboard')
    } finally {
      setLoading(false)
    }
  }

  const handleRangeChange = (range: string) => {
    setSelectedRange(range)
  }

  const handleRefresh = () => {
    fetchDashboardStats()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6">
        <ErrorMessage 
          title="Failed to load dashboard"
          message={error}
          onRetry={handleRefresh}
        />
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="p-6">
        <ErrorMessage 
          title="No data available"
          message="Dashboard statistics could not be loaded"
          onRetry={handleRefresh}
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Admin Dashboard
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            System overview and management tools
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          <select
            value={selectedRange}
            onChange={(e) => handleRangeChange(e.target.value)}
            className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
          >
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
          </select>
          
          <button
            onClick={handleRefresh}
            className="inline-flex items-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:bg-blue-500 dark:hover:bg-blue-600"
          >
            <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
        </div>
      </div>

      <AdminDashboard 
        stats={stats}
        onRefresh={handleRefresh}
        selectedRange={selectedRange}
      />
    </div>
  )
}