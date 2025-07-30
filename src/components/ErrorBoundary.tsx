'use client'

import React, { Component, ErrorInfo, ReactNode } from 'react'
import { SecurityErrorHandler } from '@/lib/security/error-handler'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
  showDetails?: boolean
  resetOnPropsChange?: boolean
  resetKeys?: Array<string | number>
}

interface State {
  hasError: boolean
  error?: Error
  errorInfo?: ErrorInfo
  errorId?: string
}

/**
 * Comprehensive Error Boundary for React components
 */
export class ErrorBoundary extends Component<Props, State> {
  private resetTimeoutId?: NodeJS.Timeout

  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
      errorId: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log the error to our error handling system
    const context = {
      component: 'ErrorBoundary',
      severity: 'high' as const,
      stackTrace: error.stack,
      additionalData: {
        componentStack: errorInfo.componentStack,
        errorBoundary: true,
        userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : undefined,
        url: typeof window !== 'undefined' ? window.location.href : undefined
      }
    }

    SecurityErrorHandler.logSecurityEvent({
      type: 'system_error',
      severity: 'high',
      component: 'React ErrorBoundary',
      details: {
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack
      },
      timestamp: new Date().toISOString()
    })

    // Store error info in state
    this.setState({
      error,
      errorInfo,
      errorId: context.additionalData ? `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}` : undefined
    })

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo)
    }

    // Auto-retry after 10 seconds in development
    if (process.env.NODE_ENV === 'development') {
      this.resetTimeoutId = setTimeout(() => {
        this.resetErrorBoundary()
      }, 10000)
    }
  }

  componentDidUpdate(prevProps: Props) {
    const { resetOnPropsChange, resetKeys } = this.props
    const { hasError } = this.state

    // Reset error boundary when specified props change
    if (hasError && resetOnPropsChange) {
      if (resetKeys) {
        const hasResetKeyChanged = resetKeys.some(
          (key, index) => prevProps.resetKeys?.[index] !== key
        )
        if (hasResetKeyChanged) {
          this.resetErrorBoundary()
        }
      } else {
        // If no resetKeys specified, compare all props
        if (JSON.stringify(prevProps) !== JSON.stringify(this.props)) {
          this.resetErrorBoundary()
        }
      }
    }
  }

  componentWillUnmount() {
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId)
    }
  }

  resetErrorBoundary = () => {
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId)
    }
    this.setState({ hasError: false, error: undefined, errorInfo: undefined, errorId: undefined })
  }

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback
      }

      // Default error UI
      return (
        <ErrorFallback
          error={this.state.error}
          errorInfo={this.state.errorInfo}
          errorId={this.state.errorId}
          onRetry={this.resetErrorBoundary}
          showDetails={this.props.showDetails}
        />
      )
    }

    return this.props.children
  }
}

/**
 * Default error fallback component
 */
interface ErrorFallbackProps {
  error?: Error
  errorInfo?: ErrorInfo
  errorId?: string
  onRetry?: () => void
  showDetails?: boolean
}

function ErrorFallback({ error, errorInfo, errorId, onRetry, showDetails }: ErrorFallbackProps) {
  const [detailsExpanded, setDetailsExpanded] = React.useState(false)
  const [feedbackSent, setFeedbackSent] = React.useState(false)

  const sendFeedback = async () => {
    try {
      // Send error feedback to backend
      await fetch('/api/error-feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          errorId,
          message: error?.message,
          stack: error?.stack,
          userFeedback: 'Error reported via error boundary',
          timestamp: new Date().toISOString()
        })
      })
      setFeedbackSent(true)
    } catch (err) {
      console.error('Failed to send error feedback:', err)
    }
  }

  return (
    <div className="min-h-[400px] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white border border-red-200 rounded-lg shadow-lg p-6">
        {/* Error Icon */}
        <div className="flex justify-center mb-4">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
            <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
        </div>

        {/* Error Title */}
        <h2 className="text-lg font-semibold text-gray-900 text-center mb-2">
          Something went wrong
        </h2>

        {/* Error Description */}
        <p className="text-sm text-gray-600 text-center mb-4">
          We encountered an unexpected error. Our team has been notified and is working on a fix.
        </p>

        {/* Error ID */}
        {errorId && (
          <p className="text-xs text-gray-500 text-center mb-4">
            Error ID: <code className="bg-gray-100 px-2 py-1 rounded">{errorId}</code>
          </p>
        )}

        {/* Action Buttons */}
        <div className="space-y-2">
          {onRetry && (
            <button
              onClick={onRetry}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
            >
              Try Again
            </button>
          )}

          <button
            onClick={() => window.location.reload()}
            className="w-full bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-700 transition-colors"
          >
            Reload Page
          </button>

          {!feedbackSent ? (
            <button
              onClick={sendFeedback}
              className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 transition-colors"
            >
              Report Issue
            </button>
          ) : (
            <div className="w-full bg-green-100 text-green-800 py-2 px-4 rounded-md text-center text-sm">
              ✓ Issue reported. Thank you!
            </div>
          )}
        </div>

        {/* Error Details (Development/Debug) */}
        {(showDetails || process.env.NODE_ENV === 'development') && error && (
          <div className="mt-4 border-t pt-4">
            <button
              onClick={() => setDetailsExpanded(!detailsExpanded)}
              className="text-sm text-gray-600 hover:text-gray-800 flex items-center"
            >
              <svg
                className={`w-4 h-4 mr-1 transition-transform ${detailsExpanded ? 'rotate-90' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              Technical Details
            </button>

            {detailsExpanded && (
              <div className="mt-2 p-3 bg-gray-50 rounded-md">
                <div className="text-xs text-gray-700 space-y-2">
                  <div>
                    <strong>Error:</strong> {error.message}
                  </div>
                  {error.stack && (
                    <div>
                      <strong>Stack Trace:</strong>
                      <pre className="mt-1 text-xs overflow-x-auto whitespace-pre-wrap">
                        {error.stack.split('\n').slice(0, 5).join('\n')}
                      </pre>
                    </div>
                  )}
                  {errorInfo && (
                    <div>
                      <strong>Component Stack:</strong>
                      <pre className="mt-1 text-xs overflow-x-auto whitespace-pre-wrap">
                        {errorInfo.componentStack.split('\n').slice(0, 5).join('\n')}
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * Hook for resetting error boundaries programmatically
 */
export function useErrorHandler() {
  return React.useCallback((error: Error, errorInfo?: ErrorInfo) => {
    // Log error to our error handling system
    SecurityErrorHandler.logSecurityEvent({
      type: 'system_error',
      severity: 'medium',
      component: 'useErrorHandler',
      details: {
        message: error.message,
        stack: error.stack,
        ...(errorInfo && { componentStack: errorInfo.componentStack })
      },
      timestamp: new Date().toISOString()
    })

    // Re-throw the error so it can be caught by ErrorBoundary
    throw error
  }, [])
}

/**
 * Higher-order component for adding error boundaries
 */
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<Props, 'children'>
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  )

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`
  return WrappedComponent
}

/**
 * Specialized error boundaries for different parts of the app
 */

// Game-specific error boundary
export function GameErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary
      fallback={
        <div className="min-h-[400px] flex items-center justify-center">
          <div className="text-center">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Game Error</h3>
            <p className="text-gray-600 mb-4">Something went wrong with the game.</p>
            <button
              onClick={() => window.location.reload()}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
            >
              Refresh Game
            </button>
          </div>
        </div>
      }
      onError={(error, errorInfo) => {
        SecurityErrorHandler.logSecurityEvent({
          type: 'system_error',
          severity: 'high',
          component: 'GameErrorBoundary',
          details: {
            message: error.message,
            stack: error.stack,
            componentStack: errorInfo.componentStack
          },
          timestamp: new Date().toISOString()
        })
      }}
    >
      {children}
    </ErrorBoundary>
  )
}

// Chat-specific error boundary
export function ChatErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary
      fallback={
        <div className="p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-800">Chat is temporarily unavailable.</p>
        </div>
      }
      onError={(error, errorInfo) => {
        SecurityErrorHandler.logSecurityEvent({
          type: 'system_error',
          severity: 'medium',
          component: 'ChatErrorBoundary',
          details: {
            message: error.message,
            stack: error.stack,
            componentStack: errorInfo.componentStack
          },
          timestamp: new Date().toISOString()
        })
      }}
    >
      {children}
    </ErrorBoundary>
  )
}

// Profile-specific error boundary
export function ProfileErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary
      fallback={
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md">
          <p className="text-sm text-yellow-800">Unable to load profile information.</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-2 text-xs bg-yellow-600 text-white px-2 py-1 rounded hover:bg-yellow-700"
          >
            Retry
          </button>
        </div>
      }
      resetOnPropsChange={true}
    >
      {children}
    </ErrorBoundary>
  )
}