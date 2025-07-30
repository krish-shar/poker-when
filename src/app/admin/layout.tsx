import { ReactNode } from 'react'
import { Metadata } from 'next'
import { AdminHeader } from '@/components/admin/AdminHeader'
import { AdminSidebar } from '@/components/admin/AdminSidebar'
import { AdminAuthProvider } from '@/components/admin/AdminAuthProvider'

export const metadata: Metadata = {
  title: 'Admin Dashboard - Poker Home',
  description: 'Admin panel for managing users, games, and system settings',
  robots: 'noindex, nofollow' // Don't index admin pages
}

interface AdminLayoutProps {
  children: ReactNode
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  return (
    <AdminAuthProvider>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <AdminHeader />
        <div className="flex">
          <AdminSidebar />
          <main className="flex-1 p-6 lg:px-8">
            <div className="mx-auto max-w-7xl">
              {children}
            </div>
          </main>
        </div>
      </div>
    </AdminAuthProvider>
  )
}