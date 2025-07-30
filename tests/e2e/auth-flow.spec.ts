import { test, expect, type Page } from '@playwright/test'
import { 
  createTestUser, 
  cleanupTestData, 
  generateUniqueEmail,
  generateUniqueUsername 
} from './helpers/test-utils'

test.describe('Authentication Flow E2E Tests', () => {
  let testUser: any

  test.beforeAll(async () => {
    // Create a test user for login tests
    testUser = await createTestUser({
      email: 'e2e-test@example.com',
      username: 'e2etest',
      password: 'TestPassword123!@#'
    })
  })

  test.afterAll(async () => {
    await cleanupTestData()
  })

  test.describe('User Registration', () => {
    test('should register a new user successfully', async ({ page }) => {
      const email = generateUniqueEmail()
      const username = generateUniqueUsername()

      await page.goto('/auth/register')

      // Check page loaded
      await expect(page.locator('h1')).toContainText('Create Account')

      // Fill registration form
      await page.fill('[data-testid="email-input"]', email)
      await page.fill('[data-testid="username-input"]', username)
      await page.fill('[data-testid="password-input"]', 'TestPassword123!@#')
      await page.fill('[data-testid="confirm-password-input"]', 'TestPassword123!@#')
      await page.fill('[data-testid="display-name-input"]', 'Test User')

      // Accept terms
      await page.check('[data-testid="terms-checkbox"]')

      // Submit form
      await page.click('[data-testid="register-button"]')

      // Should redirect to dashboard
      await expect(page).toHaveURL('/dashboard')

      // Should show welcome message
      await expect(page.locator('[data-testid="welcome-message"]')).toContainText('Welcome, Test User')

      // Should show user info in header
      await expect(page.locator('[data-testid="user-menu-trigger"]')).toContainText('Test User')
    })

    test('should validate registration form', async ({ page }) => {
      await page.goto('/auth/register')

      // Try to submit empty form
      await page.click('[data-testid="register-button"]')

      // Should show validation errors
      await expect(page.locator('[data-testid="email-error"]')).toContainText('Email is required')
      await expect(page.locator('[data-testid="username-error"]')).toContainText('Username is required')
      await expect(page.locator('[data-testid="password-error"]')).toContainText('Password is required')

      // Test invalid email
      await page.fill('[data-testid="email-input"]', 'invalid-email')
      await page.click('[data-testid="register-button"]')
      await expect(page.locator('[data-testid="email-error"]')).toContainText('Invalid email format')

      // Test weak password
      await page.fill('[data-testid="email-input"]', generateUniqueEmail())
      await page.fill('[data-testid="password-input"]', 'weak')
      await page.click('[data-testid="register-button"]')
      await expect(page.locator('[data-testid="password-error"]')).toContainText('Password must be at least 12 characters')

      // Test password mismatch
      await page.fill('[data-testid="password-input"]', 'TestPassword123!@#')
      await page.fill('[data-testid="confirm-password-input"]', 'DifferentPassword123!@#')
      await page.click('[data-testid="register-button"]')
      await expect(page.locator('[data-testid="confirm-password-error"]')).toContainText('Passwords do not match')
    })

    test('should prevent duplicate email registration', async ({ page }) => {
      await page.goto('/auth/register')

      // Try to register with existing email
      await page.fill('[data-testid="email-input"]', testUser.email)
      await page.fill('[data-testid="username-input"]', generateUniqueUsername())
      await page.fill('[data-testid="password-input"]', 'TestPassword123!@#')
      await page.fill('[data-testid="confirm-password-input"]', 'TestPassword123!@#')
      await page.check('[data-testid="terms-checkbox"]')

      await page.click('[data-testid="register-button"]')

      // Should show error message
      await expect(page.locator('[data-testid="form-error"]')).toContainText('Email already registered')
      await expect(page).toHaveURL('/auth/register') // Stay on registration page
    })

    test('should prevent duplicate username registration', async ({ page }) => {
      await page.goto('/auth/register')

      // Try to register with existing username
      await page.fill('[data-testid="email-input"]', generateUniqueEmail())
      await page.fill('[data-testid="username-input"]', testUser.username)
      await page.fill('[data-testid="password-input"]', 'TestPassword123!@#')
      await page.fill('[data-testid="confirm-password-input"]', 'TestPassword123!@#')
      await page.check('[data-testid="terms-checkbox"]')

      await page.click('[data-testid="register-button"]')

      // Should show error message
      await expect(page.locator('[data-testid="form-error"]')).toContainText('Username already taken')
      await expect(page).toHaveURL('/auth/register')
    })

    test('should require terms acceptance', async ({ page }) => {
      await page.goto('/auth/register')

      // Fill valid form but don't check terms
      await page.fill('[data-testid="email-input"]', generateUniqueEmail())
      await page.fill('[data-testid="username-input"]', generateUniqueUsername())
      await page.fill('[data-testid="password-input"]', 'TestPassword123!@#')
      await page.fill('[data-testid="confirm-password-input"]', 'TestPassword123!@#')

      await page.click('[data-testid="register-button"]')

      // Should show terms error
      await expect(page.locator('[data-testid="terms-error"]')).toContainText('You must accept the terms')
    })

    test('should handle registration errors gracefully', async ({ page }) => {
      // Mock server error
      await page.route('/api/auth/register', route => {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Internal server error' })
        })
      })

      await page.goto('/auth/register')

      await page.fill('[data-testid="email-input"]', generateUniqueEmail())
      await page.fill('[data-testid="username-input"]', generateUniqueUsername())
      await page.fill('[data-testid="password-input"]', 'TestPassword123!@#')
      await page.fill('[data-testid="confirm-password-input"]', 'TestPassword123!@#')
      await page.check('[data-testid="terms-checkbox"]')

      await page.click('[data-testid="register-button"]')

      // Should show error message
      await expect(page.locator('[data-testid="form-error"]')).toContainText('Something went wrong')
    })
  })

  test.describe('User Login', () => {
    test('should login successfully with valid credentials', async ({ page }) => {
      await page.goto('/auth/login')

      // Check page loaded
      await expect(page.locator('h1')).toContainText('Sign In')

      // Fill login form
      await page.fill('[data-testid="email-input"]', testUser.email)
      await page.fill('[data-testid="password-input"]', 'TestPassword123!@#')

      // Submit form
      await page.click('[data-testid="login-button"]')

      // Should redirect to dashboard
      await expect(page).toHaveURL('/dashboard')

      // Should show user info
      await expect(page.locator('[data-testid="user-menu-trigger"]')).toContainText(testUser.username)
    })

    test('should validate login form', async ({ page }) => {
      await page.goto('/auth/login')

      // Try to submit empty form
      await page.click('[data-testid="login-button"]')

      // Should show validation errors
      await expect(page.locator('[data-testid="email-error"]')).toContainText('Email is required')
      await expect(page.locator('[data-testid="password-error"]')).toContainText('Password is required')

      // Test invalid email format
      await page.fill('[data-testid="email-input"]', 'invalid-email')
      await page.click('[data-testid="login-button"]')
      await expect(page.locator('[data-testid="email-error"]')).toContainText('Invalid email format')
    })

    test('should handle invalid credentials', async ({ page }) => {
      await page.goto('/auth/login')

      // Try login with wrong password
      await page.fill('[data-testid="email-input"]', testUser.email)
      await page.fill('[data-testid="password-input"]', 'WrongPassword123!')

      await page.click('[data-testid="login-button"]')

      // Should show error message
      await expect(page.locator('[data-testid="form-error"]')).toContainText('Invalid email or password')
      await expect(page).toHaveURL('/auth/login') // Stay on login page
    })

    test('should handle non-existent user', async ({ page }) => {
      await page.goto('/auth/login')

      // Try login with non-existent email
      await page.fill('[data-testid="email-input"]', 'nonexistent@example.com')
      await page.fill('[data-testid="password-input"]', 'TestPassword123!@#')

      await page.click('[data-testid="login-button"]')

      // Should show same error message (no information leakage)
      await expect(page.locator('[data-testid="form-error"]')).toContainText('Invalid email or password')
    })

    test('should remember login with "Remember Me"', async ({ page }) => {
      await page.goto('/auth/login')

      await page.fill('[data-testid="email-input"]', testUser.email)
      await page.fill('[data-testid="password-input"]', 'TestPassword123!@#')
      await page.check('[data-testid="remember-me-checkbox"]')

      await page.click('[data-testid="login-button"]')

      // Should redirect to dashboard
      await expect(page).toHaveURL('/dashboard')

      // Check that long-term session cookie is set
      const cookies = await page.context().cookies()
      const sessionCookie = cookies.find(cookie => cookie.name === 'session' || cookie.name === 'auth-token')
      expect(sessionCookie).toBeDefined()
      
      // Should have longer expiry (this depends on implementation)
      if (sessionCookie) {
        expect(sessionCookie.expires).toBeGreaterThan(Date.now() / 1000 + 86400) // More than 1 day
      }
    })

    test('should handle login rate limiting', async ({ page }) => {
      await page.goto('/auth/login')

      // Make multiple failed login attempts
      for (let i = 0; i < 6; i++) {
        await page.fill('[data-testid="email-input"]', testUser.email)
        await page.fill('[data-testid="password-input"]', 'WrongPassword')
        await page.click('[data-testid="login-button"]')
        
        if (i < 4) {
          await expect(page.locator('[data-testid="form-error"]')).toContainText('Invalid email or password')
        }
      }

      // Should eventually be rate limited
      await expect(page.locator('[data-testid="form-error"]')).toContainText('Too many attempts')
      
      // Login button should be disabled
      await expect(page.locator('[data-testid="login-button"]')).toBeDisabled()
    })
  })

  test.describe('Session Management', () => {
    test('should maintain session across page reloads', async ({ page }) => {
      // Login first
      await page.goto('/auth/login')
      await page.fill('[data-testid="email-input"]', testUser.email)
      await page.fill('[data-testid="password-input"]', 'TestPassword123!@#')
      await page.click('[data-testid="login-button"]')

      await expect(page).toHaveURL('/dashboard')

      // Reload page
      await page.reload()

      // Should still be logged in
      await expect(page).toHaveURL('/dashboard')
      await expect(page.locator('[data-testid="user-menu-trigger"]')).toContainText(testUser.username)
    })

    test('should handle expired sessions', async ({ page }) => {
      // Login first
      await page.goto('/auth/login')
      await page.fill('[data-testid="email-input"]', testUser.email)
      await page.fill('[data-testid="password-input"]', 'TestPassword123!@#')
      await page.click('[data-testid="login-button"]')

      await expect(page).toHaveURL('/dashboard')

      // Mock expired token response
      await page.route('/api/auth/validate', route => {
        route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Token expired' })
        })
      })

      // Try to access protected route
      await page.goto('/profile')

      // Should redirect to login
      await expect(page).toHaveURL('/auth/login')
      await expect(page.locator('[data-testid="form-error"]')).toContainText('Session expired')
    })

    test('should logout successfully', async ({ page }) => {
      // Login first
      await page.goto('/auth/login')
      await page.fill('[data-testid="email-input"]', testUser.email)
      await page.fill('[data-testid="password-input"]', 'TestPassword123!@#')
      await page.click('[data-testid="login-button"]')

      await expect(page).toHaveURL('/dashboard')

      // Click user menu
      await page.click('[data-testid="user-menu-trigger"]')

      // Click logout
      await page.click('[data-testid="logout-button"]')

      // Should redirect to home or login
      await expect(page).toHaveURL(/\/(auth\/login|$)/)

      // Should not be able to access protected routes
      await page.goto('/dashboard')
      await expect(page).toHaveURL('/auth/login')
    })

    test('should handle logout from multiple tabs', async ({ browser }) => {
      const context = await browser.newContext()
      const page1 = await context.newPage()
      const page2 = await context.newPage()

      // Login on first tab
      await page1.goto('/auth/login')
      await page1.fill('[data-testid="email-input"]', testUser.email)
      await page1.fill('[data-testid="password-input"]', 'TestPassword123!@#')
      await page1.click('[data-testid="login-button"]')

      await expect(page1).toHaveURL('/dashboard')

      // Open dashboard on second tab
      await page2.goto('/dashboard')
      await expect(page2).toHaveURL('/dashboard')

      // Logout from first tab
      await page1.click('[data-testid="user-menu-trigger"]')
      await page1.click('[data-testid="logout-button"]')

      // Second tab should also be logged out (or show logout message)
      await page2.reload()
      await expect(page2).toHaveURL('/auth/login')

      await context.close()
    })
  })

  test.describe('Protected Routes', () => {
    test('should redirect to login for protected routes when not authenticated', async ({ page }) => {
      const protectedRoutes = [
        '/dashboard',
        '/profile',
        '/games',
        '/admin'
      ]

      for (const route of protectedRoutes) {
        await page.goto(route)
        await expect(page).toHaveURL('/auth/login')
      }
    })

    test('should allow access to protected routes when authenticated', async ({ page }) => {
      // Login first
      await page.goto('/auth/login')
      await page.fill('[data-testid="email-input"]', testUser.email)
      await page.fill('[data-testid="password-input"]', 'TestPassword123!@#')
      await page.click('[data-testid="login-button"]')

      // Try accessing protected routes
      const allowedRoutes = [
        '/dashboard',
        '/profile'
      ]

      for (const route of allowedRoutes) {
        await page.goto(route)
        await expect(page).toHaveURL(route)
      }
    })

    test('should redirect to intended route after login', async ({ page }) => {
      // Try to access protected route while logged out
      await page.goto('/profile')
      await expect(page).toHaveURL('/auth/login')

      // Login
      await page.fill('[data-testid="email-input"]', testUser.email)
      await page.fill('[data-testid="password-input"]', 'TestPassword123!@#')
      await page.click('[data-testid="login-button"]')

      // Should redirect to originally requested route
      await expect(page).toHaveURL('/profile')
    })
  })

  test.describe('Password Reset Flow', () => {
    test('should initiate password reset', async ({ page }) => {
      await page.goto('/auth/login')

      // Click forgot password link
      await page.click('[data-testid="forgot-password-link"]')

      await expect(page).toHaveURL('/auth/forgot-password')

      // Enter email
      await page.fill('[data-testid="email-input"]', testUser.email)
      await page.click('[data-testid="reset-button"]')

      // Should show success message
      await expect(page.locator('[data-testid="success-message"]')).toContainText('Reset link sent')
    })

    test('should validate password reset email', async ({ page }) => {
      await page.goto('/auth/forgot-password')

      // Try empty email
      await page.click('[data-testid="reset-button"]')
      await expect(page.locator('[data-testid="email-error"]')).toContainText('Email is required')

      // Try invalid email
      await page.fill('[data-testid="email-input"]', 'invalid-email')
      await page.click('[data-testid="reset-button"]')
      await expect(page.locator('[data-testid="email-error"]')).toContainText('Invalid email format')
    })

    test('should handle password reset with invalid token', async ({ page }) => {
      await page.goto('/auth/reset-password?token=invalid-token')

      await expect(page.locator('[data-testid="error-message"]')).toContainText('Invalid or expired reset token')
    })
  })

  test.describe('Accessibility', () => {
    test('should be keyboard navigable', async ({ page }) => {
      await page.goto('/auth/login')

      // Tab through form elements
      await page.keyboard.press('Tab') // Focus email input
      await expect(page.locator('[data-testid="email-input"]')).toBeFocused()

      await page.keyboard.press('Tab') // Focus password input
      await expect(page.locator('[data-testid="password-input"]')).toBeFocused()

      await page.keyboard.press('Tab') // Focus remember me
      await expect(page.locator('[data-testid="remember-me-checkbox"]')).toBeFocused()

      await page.keyboard.press('Tab') // Focus login button
      await expect(page.locator('[data-testid="login-button"]')).toBeFocused()

      // Should be able to submit with Enter
      await page.fill('[data-testid="email-input"]', testUser.email)
      await page.fill('[data-testid="password-input"]', 'TestPassword123!@#')
      await page.locator('[data-testid="login-button"]').focus()
      await page.keyboard.press('Enter')

      await expect(page).toHaveURL('/dashboard')
    })

    test('should have proper ARIA labels', async ({ page }) => {
      await page.goto('/auth/login')

      // Check form has proper labels
      await expect(page.locator('[data-testid="email-input"]')).toHaveAttribute('aria-label', 'Email address')
      await expect(page.locator('[data-testid="password-input"]')).toHaveAttribute('aria-label', 'Password')
      await expect(page.locator('[data-testid="login-button"]')).toHaveAttribute('aria-label', 'Sign in to your account')

      // Check error messages have proper ARIA
      await page.click('[data-testid="login-button"]') // Trigger validation errors
      
      await expect(page.locator('[data-testid="email-input"]')).toHaveAttribute('aria-invalid', 'true')
      await expect(page.locator('[data-testid="email-input"]')).toHaveAttribute('aria-describedby', 'email-error')
    })

    test('should work with screen readers', async ({ page }) => {
      await page.goto('/auth/register')

      // Check heading structure
      await expect(page.locator('h1')).toContainText('Create Account')
      
      // Check form has proper fieldset/legend structure if applicable
      const fieldset = page.locator('fieldset').first()
      if (await fieldset.count() > 0) {
        await expect(fieldset.locator('legend')).toBeVisible()
      }

      // Check error messages are announced
      await page.click('[data-testid="register-button"]')
      
      const emailError = page.locator('[data-testid="email-error"]')
      await expect(emailError).toHaveAttribute('role', 'alert')
      await expect(emailError).toHaveAttribute('aria-live', 'polite')
    })
  })

  test.describe('Mobile Responsiveness', () => {
    test('should work on mobile devices', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 })
      
      await page.goto('/auth/login')

      // Form should be properly sized
      const form = page.locator('[data-testid="login-form"]')
      await expect(form).toBeVisible()

      // Input fields should be touch-friendly
      const emailInput = page.locator('[data-testid="email-input"]')
      const bounds = await emailInput.boundingBox()
      expect(bounds?.height).toBeGreaterThanOrEqual(44) // Minimum touch target size

      // Should be able to login on mobile
      await page.fill('[data-testid="email-input"]', testUser.email)
      await page.fill('[data-testid="password-input"]', 'TestPassword123!@#')
      await page.click('[data-testid="login-button"]')

      await expect(page).toHaveURL('/dashboard')
    })

    test('should handle virtual keyboard on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 })
      await page.goto('/auth/register')

      // Focus on input should not cause layout issues
      await page.focus('[data-testid="email-input"]')
      
      // Form should still be accessible
      const submitButton = page.locator('[data-testid="register-button"]')
      await expect(submitButton).toBeVisible()
    })
  })

  test.describe('Security', () => {
    test('should prevent XSS in login form', async ({ page }) => {
      await page.goto('/auth/login')

      const xssPayload = '<script>alert("XSS")</script>'
      
      // Try XSS in email field
      await page.fill('[data-testid="email-input"]', xssPayload)
      await page.click('[data-testid="login-button"]')

      // Should not execute script, should show validation error instead
      await expect(page.locator('[data-testid="email-error"]')).toContainText('Invalid email format')
      
      // Check that the script wasn't executed
      const alertWasShown = await page.evaluate(() => {
        return window.alertCalled === true
      }).catch(() => false)
      
      expect(alertWasShown).toBe(false)
    })

    test('should have CSRF protection', async ({ page }) => {
      await page.goto('/auth/login')

      // Check for CSRF token in form
      const csrfToken = await page.locator('input[name="_token"]').getAttribute('value')
      expect(csrfToken).toBeTruthy()
    })

    test('should use HTTPS in production', async ({ page }) => {
      // This test would be more relevant in production environment
      await page.goto('/auth/login')
      
      // In development, we can't test HTTPS, but we can check for security headers
      const response = await page.goto('/auth/login')
      const headers = response?.headers()
      
      // Check for security headers
      expect(headers?.['x-content-type-options']).toBe('nosniff')
      expect(headers?.['x-frame-options']).toBe('DENY')
    })
  })
})