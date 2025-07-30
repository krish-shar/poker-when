import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./src/test/setup.integration.ts'],
    
    // Integration test specific settings
    testTimeout: 30000, // 30 seconds for database operations
    hookTimeout: 15000,
    
    // Run integration tests serially to avoid database conflicts
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true
      }
    },
    
    // Test patterns for integration tests
    include: [
      'src/test/integration/**/*.test.{js,ts}',
      'src/**/*.integration.test.{js,ts}'
    ],
    
    // Exclude unit tests
    exclude: [
      'node_modules/',
      'src/test/unit/',
      '**/*.unit.test.*',
      '**/*.spec.*',
      'dist/',
      '.next/',
      'coverage/',
      'tests/e2e/'
    ],

    // Coverage configuration for integration tests
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      reportsDirectory: './coverage/integration',
      
      // Integration test coverage thresholds
      thresholds: {
        global: {
          branches: 70,
          functions: 70, 
          lines: 70,
          statements: 70
        }
      },
      
      // Include files for coverage
      include: [
        'src/app/api/**/*.ts',
        'src/lib/**/*.ts',
        'src/components/**/*.{ts,tsx}'
      ],
      
      // Exclude from coverage
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.d.ts',
        '**/*.config.*',
        'dist/',
        '.next/',
        'coverage/',
        '**/*.test.ts',
        '**/*.spec.ts',
        'src/types/',
        'src/app/layout.tsx',
        'src/app/globals.css'
      ]
    },

    // Reporters for integration tests
    reporters: [
      'default',
      'json',
      'html',
      ['junit', { outputFile: 'test-results/integration/junit.xml' }]
    ],
    
    // Output directory
    outputFile: {
      json: 'test-results/integration/results.json',
      html: 'test-results/integration/index.html'
    },

    // Environment variables for integration tests
    env: {
      NODE_ENV: 'test',
      INTEGRATION_TEST: 'true'
    },

    // Retry configuration for flaky integration tests
    retry: 2,
    
    // Bail early on failures in CI
    bail: process.env.CI ? 5 : 0,

    // Increase memory limits for database tests
    maxConcurrency: 1,
    minWorkers: 1,
    maxWorkers: 1
  },

  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },

  // Vite specific config for integration tests
  define: {
    'process.env.NODE_ENV': '"test"',
    'process.env.INTEGRATION_TEST': '"true"'
  },

  // Mock external dependencies for integration tests
  server: {
    deps: {
      external: [
        '@supabase/supabase-js',
        'ws',
        'redis'
      ]
    }
  }
})