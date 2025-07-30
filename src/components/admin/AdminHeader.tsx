'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useAdminAuth } from './AdminAuthProvider'

export function AdminHeader() {
  const { user, logout } = useAdminAuth()
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)

  const handleLogout = () => {
    logout()
    setIsDropdownOpen(false)
  }

  return (
    <header className="bg-white border-b border-gray-200 dark:bg-gray-800 dark:border-gray-700">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 justify-between items-center">
          {/* Logo and title */}
          <div className="flex items-center">
            <Link 
              href="/admin" 
              className="flex items-center space-x-3"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-blue-600">
                <span className="text-sm font-bold text-white">PA</span>
              </div>
              <div>
                <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Poker Admin
                </h1>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Management Panel
                </p>
              </div>
            </Link>
          </div>

          {/* Navigation items */}
          <nav className="hidden md:flex md:space-x-8">
            <Link
              href="/admin"
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 px-3 py-2 rounded-md text-sm font-medium"
            >
              Dashboard
            </Link>
            <Link
              href="/admin/users"
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 px-3 py-2 rounded-md text-sm font-medium"
            >
              Users
            </Link>
            <Link
              href="/admin/games"
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 px-3 py-2 rounded-md text-sm font-medium"
            >
              Games
            </Link>
            <Link
              href="/admin/sessions"
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 px-3 py-2 rounded-md text-sm font-medium"
            >
              Sessions
            </Link>
            <Link
              href="/admin/analytics"
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 px-3 py-2 rounded-md text-sm font-medium"
            >
              Analytics
            </Link>
          </nav>

          {/* User menu */}
          <div className="relative">
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center space-x-3 rounded-md p-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600">
                <span className="text-xs font-medium text-white">
                  {user?.username?.charAt(0).toUpperCase() || 'A'}
                </span>
              </div>
              <div className="text-left">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-200">
                  {user?.username}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {user?.roles?.join(', ')}
                </p>
              </div>
              <svg 
                className="h-4 w-4 text-gray-400" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* Dropdown menu */}
            {isDropdownOpen && (
              <>
                {/* Backdrop */}
                <div 
                  className="fixed inset-0 z-10"
                  onClick={() => setIsDropdownOpen(false)}
                />
                
                {/* Menu */}
                <div className="absolute right-0 z-20 mt-2 w-48 origin-top-right rounded-md bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none dark:bg-gray-700 dark:ring-gray-600">
                  <div className="px-4 py-2 text-xs text-gray-500 dark:text-gray-400">
                    Signed in as {user?.email}
                  </div>
                  <hr className="border-gray-200 dark:border-gray-600" />
                  
                  <Link
                    href="/admin/profile"
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-600"
                    onClick={() => setIsDropdownOpen(false)}
                  >
                    Your Profile
                  </Link>
                  
                  <Link
                    href="/admin/settings"
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-600"
                    onClick={() => setIsDropdownOpen(false)}
                  >
                    Settings
                  </Link>
                  
                  <Link
                    href="/"
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-600"
                    onClick={() => setIsDropdownOpen(false)}
                  >
                    Back to App
                  </Link>
                  
                  <hr className="border-gray-200 dark:border-gray-600" />
                  
                  <button
                    onClick={handleLogout}
                    className="block w-full px-4 py-2 text-left text-sm text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                  >
                    Sign out
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}