import { NextRequest, NextResponse } from 'next/server'
import { SecurityErrorHandler } from '@/lib/security/error-handler'

export async function GET(request: NextRequest) {
  try {
    // Perform comprehensive health check
    const healthStatus = await SecurityErrorHandler.performHealthCheck()
    
    // Set appropriate HTTP status code based on health
    let statusCode: number
    switch (healthStatus.status) {
      case 'healthy':
        statusCode = 200
        break
      case 'degraded':
        statusCode = 200 // Still return 200 but indicate degraded state
        break
      case 'unhealthy':
        statusCode = 503 // Service Unavailable
        break
      default:
        statusCode = 500
    }

    // Add health check headers
    const response = NextResponse.json(healthStatus, { status: statusCode })
    response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate')
    response.headers.set('Pragma', 'no-cache')
    response.headers.set('Expires', '0')
    
    return response
    
  } catch (error) {
    // Log health check failure
    await SecurityErrorHandler.logSecurityEvent({
      type: 'system_error',
      severity: 'critical',
      component: 'HealthCheck',
      details: {
        message: (error as Error).message,
        stack: (error as Error).stack
      },
      timestamp: new Date().toISOString()
    })

    return NextResponse.json({
      status: 'unhealthy',
      error: 'Health check failed',
      timestamp: new Date().toISOString(),
      checks: {}
    }, { status: 503 })
  }
}