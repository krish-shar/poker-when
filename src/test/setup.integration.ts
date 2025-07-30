import { beforeAll, afterAll, beforeEach } from 'vitest'
import { createClient } from '@supabase/supabase-js'

// Set test environment
process.env.NODE_ENV = 'test'

// Test database setup
let testSupabase: any

beforeAll(async () => {
  // Initialize test database connection
  if (process.env.TEST_SUPABASE_URL && process.env.TEST_SUPABASE_SERVICE_KEY) {
    testSupabase = createClient(
      process.env.TEST_SUPABASE_URL,
      process.env.TEST_SUPABASE_SERVICE_KEY
    )
    
    // Run migrations if needed
    console.log('Setting up test database...')
  } else {
    console.warn('Test database not configured. Using mocked database.')
  }
})

beforeEach(async () => {
  // Clean up test data before each test
  if (testSupabase) {
    await cleanupTestData()
  }
})

afterAll(async () => {
  // Cleanup after all tests
  if (testSupabase) {
    await cleanupTestData()
    console.log('Test database cleaned up')
  }
})

async function cleanupTestData() {
  try {
    // Clean up test tables in reverse dependency order
    const tables = [
      'session_players',
      'poker_sessions', 
      'hands',
      'user_profiles',
      'home_game_members',
      'home_games'
    ]
    
    for (const table of tables) {
      await testSupabase
        .from(table)
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000') // Delete all test records
    }
  } catch (error) {
    console.warn('Error cleaning up test data:', error)
  }
}

export { testSupabase }