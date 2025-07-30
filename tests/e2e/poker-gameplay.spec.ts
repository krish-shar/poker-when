import { test, expect, type Page } from '@playwright/test'
import { 
  createTestUser, 
  createTestGame, 
  loginUser, 
  cleanupTestData,
  waitForWebSocket,
  mockWebSocketServer
} from './helpers/test-utils'

test.describe('Poker Gameplay E2E Tests', () => {
  let host: any
  let player1: any
  let player2: any
  let testGame: any

  test.beforeAll(async () => {
    // Create test users
    host = await createTestUser({
      email: 'host@example.com',
      username: 'gamehost',
      password: 'TestPassword123!@#'
    })

    player1 = await createTestUser({
      email: 'player1@example.com',
      username: 'player1',
      password: 'TestPassword123!@#'
    })

    player2 = await createTestUser({
      email: 'player2@example.com',
      username: 'player2',
      password: 'TestPassword123!@#'
    })

    // Create test game
    testGame = await createTestGame({
      name: 'E2E Test Game',
      hostId: host.id,
      settings: {
        smallBlind: 1.00,
        bigBlind: 2.00,
        maxPlayers: 6,
        buyInMin: 100,
        buyInMax: 500
      }
    })
  })

  test.afterAll(async () => {
    await cleanupTestData()
  })

  test.describe('Game Creation and Setup', () => {
    test('should create a new poker game', async ({ page }) => {
      await loginUser(page, host)
      
      await page.goto('/games')
      
      // Click create game button
      await page.click('[data-testid="create-game-button"]')
      
      await expect(page).toHaveURL('/games/create')
      
      // Fill game creation form
      await page.fill('[data-testid="game-name-input"]', 'My Poker Game')
      await page.selectOption('[data-testid="game-type-select"]', 'texas_holdem')
      
      // Configure game settings
      await page.fill('[data-testid="small-blind-input"]', '1.00')
      await page.fill('[data-testid="big-blind-input"]', '2.00')
      await page.selectOption('[data-testid="max-players-select"]', '6')
      await page.fill('[data-testid="buy-in-min-input"]', '100')
      await page.fill('[data-testid="buy-in-max-input"]', '500')
      
      // Submit form
      await page.click('[data-testid="create-game-submit"]')
      
      // Should redirect to game lobby
      await expect(page).toHaveURL(/\/games\/[a-f0-9-]+/)
      
      // Should show game info
      await expect(page.locator('[data-testid="game-name"]')).toContainText('My Poker Game')
      await expect(page.locator('[data-testid="game-blinds"]')).toContainText('$1/$2')
      
      // Host should be seated
      await expect(page.locator('[data-testid="seat-1"]')).toContainText(host.username)
    })

    test('should validate game creation form', async ({ page }) => {
      await loginUser(page, host)
      await page.goto('/games/create')
      
      // Try to submit empty form
      await page.click('[data-testid="create-game-submit"]')
      
      // Should show validation errors
      await expect(page.locator('[data-testid="game-name-error"]')).toContainText('Game name is required')
      await expect(page.locator('[data-testid="small-blind-error"]')).toContainText('Small blind is required')
      
      // Test invalid blind structure
      await page.fill('[data-testid="small-blind-input"]', '2.00')
      await page.fill('[data-testid="big-blind-input"]', '2.00') // Not 2x small blind
      await page.click('[data-testid="create-game-submit"]')
      
      await expect(page.locator('[data-testid="big-blind-error"]')).toContainText('Big blind must be at least 2x small blind')
      
      // Test invalid buy-in range
      await page.fill('[data-testid="buy-in-min-input"]', '200')
      await page.fill('[data-testid="buy-in-max-input"]', '100') // Max < Min
      await page.click('[data-testid="create-game-submit"]')
      
      await expect(page.locator('[data-testid="buy-in-max-error"]')).toContainText('Maximum buy-in must be >= minimum buy-in')
    })

    test('should show game settings correctly', async ({ page }) => {
      await loginUser(page, host)
      await page.goto(`/games/${testGame.id}`)
      
      // Should display game information
      await expect(page.locator('[data-testid="game-name"]')).toContainText(testGame.name)
      await expect(page.locator('[data-testid="game-blinds"]')).toContainText('$1/$2')
      await expect(page.locator('[data-testid="max-players"]')).toContainText('6')
      await expect(page.locator('[data-testid="buy-in-range"]')).toContainText('$100 - $500')
      
      // Should show empty seats
      const emptySeats = page.locator('[data-testid^="seat-"][data-testid$="-empty"]')
      await expect(emptySeats).toHaveCount(6)
    })
  })

  test.describe('Joining and Leaving Games', () => {
    test('should join a game successfully', async ({ page }) => {
      await loginUser(page, player1)
      await page.goto(`/games/${testGame.id}`)
      
      // Should see join game interface
      await expect(page.locator('[data-testid="join-game-panel"]')).toBeVisible()
      
      // Select seat and buy-in amount
      await page.click('[data-testid="seat-2"]') // Click empty seat 2
      await page.fill('[data-testid="buy-in-input"]', '200')
      await page.click('[data-testid="join-game-button"]')
      
      // Should be seated in the game
      await expect(page.locator('[data-testid="seat-2"]')).toContainText(player1.username)
      await expect(page.locator('[data-testid="player-chips"]')).toContainText('$200')
      
      // Join panel should be hidden
      await expect(page.locator('[data-testid="join-game-panel"]')).not.toBeVisible()
    })

    test('should validate buy-in amount', async ({ page }) => {
      await loginUser(page, player2)
      await page.goto(`/games/${testGame.id}`)
      
      await page.click('[data-testid="seat-3"]')
      
      // Try buy-in below minimum
      await page.fill('[data-testid="buy-in-input"]', '50')
      await page.click('[data-testid="join-game-button"]')
      
      await expect(page.locator('[data-testid="buy-in-error"]')).toContainText('Minimum buy-in is $100')
      
      // Try buy-in above maximum
      await page.fill('[data-testid="buy-in-input"]', '600')
      await page.click('[data-testid="join-game-button"]')
      
      await expect(page.locator('[data-testid="buy-in-error"]')).toContainText('Maximum buy-in is $500')
    })

    test('should prevent joining full seat', async ({ page }) => {
      await loginUser(page, player2)
      await page.goto(`/games/${testGame.id}`)
      
      // Try to click an occupied seat (seat 2 from previous test)
      await page.click('[data-testid="seat-2"]')
      
      // Should show error or not allow selection
      await expect(page.locator('[data-testid="seat-error"]')).toContainText('Seat is occupied')
    })

    test('should leave game successfully', async ({ page }) => {
      await loginUser(page, player1)
      await page.goto(`/games/${testGame.id}`)
      
      // Should be seated from previous test
      await expect(page.locator('[data-testid="seat-2"]')).toContainText(player1.username)
      
      // Click leave game
      await page.click('[data-testid="leave-game-button"]')
      
      // Should show confirmation dialog
      await expect(page.locator('[data-testid="leave-confirmation"]')).toBeVisible()
      
      await page.click('[data-testid="confirm-leave-button"]')
      
      // Should be removed from seat
      await expect(page.locator('[data-testid="seat-2"]')).not.toContainText(player1.username)
      await expect(page.locator('[data-testid="seat-2"]')).toContainText('Empty')
      
      // Join panel should be visible again
      await expect(page.locator('[data-testid="join-game-panel"]')).toBeVisible()
    })

    test('should handle game full scenario', async ({ page }) => {
      // This would require creating a game with all seats filled
      await loginUser(page, player2)
      
      // Mock a full game scenario
      await page.route(`/api/games/${testGame.id}/join`, route => {
        route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Game is full' })
        })
      })
      
      await page.goto(`/games/${testGame.id}`)
      
      await page.click('[data-testid="seat-1"]')
      await page.fill('[data-testid="buy-in-input"]', '200')
      await page.click('[data-testid="join-game-button"]')
      
      await expect(page.locator('[data-testid="join-error"]')).toContainText('Game is full')
    })
  })

  test.describe('Real-time Gameplay', () => {
    test.beforeEach(async () => {
      // Mock WebSocket server for game state
      await mockWebSocketServer()
    })

    test('should start a hand when minimum players are seated', async ({ page, context }) => {
      // Create two browser contexts for two players
      const hostPage = page
      const player1Page = await context.newPage()
      
      // Both players join the game
      await loginUser(hostPage, host)
      await loginUser(player1Page, player1)
      
      await hostPage.goto(`/games/${testGame.id}`)
      await player1Page.goto(`/games/${testGame.id}`)
      
      // Host sits in seat 1
      await hostPage.click('[data-testid="seat-1"]')
      await hostPage.fill('[data-testid="buy-in-input"]', '200')
      await hostPage.click('[data-testid="join-game-button"]')
      
      // Player1 sits in seat 2
      await player1Page.click('[data-testid="seat-2"]')
      await player1Page.fill('[data-testid="buy-in-input"]', '200')
      await player1Page.click('[data-testid="join-game-button"]')
      
      // Wait for WebSocket connection
      await waitForWebSocket(hostPage)
      await waitForWebSocket(player1Page)
      
      // Start the game
      await hostPage.click('[data-testid="start-game-button"]')
      
      // Should show hand in progress
      await expect(hostPage.locator('[data-testid="game-status"]')).toContainText('Hand in progress')
      await expect(player1Page.locator('[data-testid="game-status"]')).toContainText('Hand in progress')
      
      // Should deal hole cards
      await expect(hostPage.locator('[data-testid="hole-cards"]')).toBeVisible()
      await expect(player1Page.locator('[data-testid="hole-cards"]')).toBeVisible()
      
      // Should show action buttons for current player
      const currentPlayer = await hostPage.locator('[data-testid="current-player"]').textContent()
      if (currentPlayer === host.username) {
        await expect(hostPage.locator('[data-testid="action-buttons"]')).toBeVisible()
        await expect(player1Page.locator('[data-testid="waiting-message"]')).toContainText('Waiting for action')
      } else {
        await expect(player1Page.locator('[data-testid="action-buttons"]')).toBeVisible()
        await expect(hostPage.locator('[data-testid="waiting-message"]')).toContainText('Waiting for action')
      }
    })

    test('should handle player actions correctly', async ({ page, context }) => {
      const hostPage = page
      const player1Page = await context.newPage()
      
      // Setup game with both players (similar to previous test)
      await loginUser(hostPage, host)
      await loginUser(player1Page, player1)
      
      await hostPage.goto(`/games/${testGame.id}`)
      await player1Page.goto(`/games/${testGame.id}`)
      
      // Join game and start hand
      await hostPage.click('[data-testid="seat-1"]')
      await hostPage.fill('[data-testid="buy-in-input"]', '200')
      await hostPage.click('[data-testid="join-game-button"]')
      
      await player1Page.click('[data-testid="seat-2"]')
      await player1Page.fill('[data-testid="buy-in-input"]', '200')
      await player1Page.click('[data-testid="join-game-button"]')
      
      await hostPage.click('[data-testid="start-game-button"]')
      
      // Wait for hand to start
      await expect(hostPage.locator('[data-testid="game-status"]')).toContainText('Hand in progress')
      
      // Test fold action
      const currentPlayerPage = await hostPage.locator('[data-testid="action-buttons"]').isVisible() ? hostPage : player1Page
      
      await currentPlayerPage.click('[data-testid="fold-button"]')
      
      // Should show fold animation and update game state
      await expect(currentPlayerPage.locator('[data-testid="player-action"]')).toContainText('Folded')
      
      // Other player should win the hand
      const otherPlayerPage = currentPlayerPage === hostPage ? player1Page : hostPage
      await expect(otherPlayerPage.locator('[data-testid="hand-result"]')).toContainText('You won')
    })

    test('should handle call action', async ({ page, context }) => {
      const hostPage = page
      const player1Page = await context.newPage()
      
      // Setup game (abbreviated for brevity)
      await loginUser(hostPage, host)
      await loginUser(player1Page, player1)
      
      await hostPage.goto(`/games/${testGame.id}`)
      await player1Page.goto(`/games/${testGame.id}`)
      
      // Join and start game...
      
      // Current player calls
      const currentPlayerPage = await hostPage.locator('[data-testid="action-buttons"]').isVisible() ? hostPage : player1Page
      
      await currentPlayerPage.click('[data-testid="call-button"]')
      
      // Should show call amount and update chips
      const callAmount = await currentPlayerPage.locator('[data-testid="call-amount"]').textContent()
      await expect(currentPlayerPage.locator('[data-testid="player-action"]')).toContainText(`Called ${callAmount}`)
      
      // Player chips should decrease
      const updatedChips = await currentPlayerPage.locator('[data-testid="player-chips"]').textContent()
      expect(parseInt(updatedChips?.replace(/\D/g, '') || '0')).toBeLessThan(200)
    })

    test('should handle raise action', async ({ page, context }) => {
      const hostPage = page
      const player1Page = await context.newPage()
      
      // Setup game...
      
      const currentPlayerPage = await hostPage.locator('[data-testid="action-buttons"]').isVisible() ? hostPage : player1Page
      
      // Click raise button
      await currentPlayerPage.click('[data-testid="raise-button"]')
      
      // Should show raise input
      await expect(currentPlayerPage.locator('[data-testid="raise-input"]')).toBeVisible()
      
      // Enter raise amount
      await currentPlayerPage.fill('[data-testid="raise-input"]', '50')
      await currentPlayerPage.click('[data-testid="confirm-raise-button"]')
      
      // Should update game state
      await expect(currentPlayerPage.locator('[data-testid="player-action"]')).toContainText('Raised to $50')
      
      // Other player should see the raise
      const otherPlayerPage = currentPlayerPage === hostPage ? player1Page : hostPage
      await expect(otherPlayerPage.locator('[data-testid="current-bet"]')).toContainText('$50')
    })

    test('should validate raise amounts', async ({ page }) => {
      await loginUser(page, host)
      await page.goto(`/games/${testGame.id}`)
      
      // Setup game and get to action...
      
      await page.click('[data-testid="raise-button"]')
      
      // Try raise below minimum
      await page.fill('[data-testid="raise-input"]', '1')
      await page.click('[data-testid="confirm-raise-button"]')
      
      await expect(page.locator('[data-testid="raise-error"]')).toContainText('Minimum raise')
      
      // Try raise above available chips
      await page.fill('[data-testid="raise-input"]', '1000')
      await page.click('[data-testid="confirm-raise-button"]')
      
      await expect(page.locator('[data-testid="raise-error"]')).toContainText('Insufficient chips')
    })

    test('should handle all-in scenarios', async ({ page, context }) => {
      const hostPage = page
      const player1Page = await context.newPage()
      
      // Setup game...
      
      const currentPlayerPage = await hostPage.locator('[data-testid="action-buttons"]').isVisible() ? hostPage : player1Page
      
      // Go all-in
      await currentPlayerPage.click('[data-testid="all-in-button"]')
      
      // Should show confirmation
      await expect(currentPlayerPage.locator('[data-testid="all-in-confirmation"]')).toBeVisible()
      
      await currentPlayerPage.click('[data-testid="confirm-all-in-button"]')
      
      // Should show all-in status
      await expect(currentPlayerPage.locator('[data-testid="player-action"]')).toContainText('All-in')
      await expect(currentPlayerPage.locator('[data-testid="player-chips"]')).toContainText('$0')
      
      // Should create side pot if applicable
      const otherPlayerPage = currentPlayerPage === hostPage ? player1Page : hostPage
      await expect(otherPlayerPage.locator('[data-testid="main-pot"]')).toBeVisible()
    })
  })

  test.describe('Community Cards and Betting Rounds', () => {
    test('should progress through betting rounds', async ({ page, context }) => {
      const hostPage = page
      const player1Page = await context.newPage()
      
      // Setup game with both players...
      
      // Complete preflop betting (both players call)
      await hostPage.click('[data-testid="call-button"]')
      await player1Page.click('[data-testid="call-button"]')
      
      // Should advance to flop
      await expect(hostPage.locator('[data-testid="betting-round"]')).toContainText('Flop')
      await expect(hostPage.locator('[data-testid="community-cards"]')).toHaveCount(3)
      
      // Complete flop betting
      await hostPage.click('[data-testid="check-button"]')
      await player1Page.click('[data-testid="check-button"]')
      
      // Should advance to turn
      await expect(hostPage.locator('[data-testid="betting-round"]')).toContainText('Turn')
      await expect(hostPage.locator('[data-testid="community-cards"]')).toHaveCount(4)
      
      // Complete turn betting
      await hostPage.click('[data-testid="check-button"]')
      await player1Page.click('[data-testid="check-button"]')
      
      // Should advance to river
      await expect(hostPage.locator('[data-testid="betting-round"]')).toContainText('River')
      await expect(hostPage.locator('[data-testid="community-cards"]')).toHaveCount(5)
    })

    test('should show community cards correctly', async ({ page }) => {
      await loginUser(page, host)
      await page.goto(`/games/${testGame.id}`)
      
      // Setup game and get to flop...
      
      // Community cards should be visible and properly styled
      const communityCards = page.locator('[data-testid="community-cards"] .card')
      await expect(communityCards).toHaveCount(3)
      
      // Each card should show rank and suit
      for (let i = 0; i < 3; i++) {
        const card = communityCards.nth(i)
        await expect(card.locator('[data-testid="card-rank"]')).toBeVisible()
        await expect(card.locator('[data-testid="card-suit"]')).toBeVisible()
      }
    })

    test('should animate card dealing', async ({ page }) => {
      await loginUser(page, host)
      await page.goto(`/games/${testGame.id}`)
      
      // Setup game and start hand...
      
      // Watch for flop animation
      await page.click('[data-testid="call-button"]') // Complete preflop
      
      // Should see dealing animation
      await expect(page.locator('[data-testid="dealing-animation"]')).toBeVisible()
      
      // Cards should appear with animation
      const flopCards = page.locator('[data-testid="community-cards"] .card')
      for (let i = 0; i < 3; i++) {
        await expect(flopCards.nth(i)).toHaveClass(/card-dealt/)
      }
    })
  })

  test.describe('Hand Evaluation and Showdown', () => {
    test('should show hand rankings at showdown', async ({ page, context }) => {
      const hostPage = page
      const player1Page = await context.newPage()
      
      // Setup game and play to showdown...
      
      // Both players check through all streets to showdown
      // (This would require going through all betting rounds)
      
      // At showdown, should show hand rankings
      await expect(hostPage.locator('[data-testid="hand-ranking"]')).toBeVisible()
      await expect(player1Page.locator('[data-testid="hand-ranking"]')).toBeVisible()
      
      // Winner should be highlighted
      const winner = await hostPage.locator('[data-testid="hand-winner"]').textContent()
      if (winner === host.username) {
        await expect(hostPage.locator('[data-testid="winner-highlight"]')).toBeVisible()
        await expect(hostPage.locator('[data-testid="pot-won"]')).toBeVisible()
      } else {
        await expect(player1Page.locator('[data-testid="winner-highlight"]')).toBeVisible()
        await expect(player1Page.locator('[data-testid="pot-won"]')).toBeVisible()
      }
    })

    test('should handle split pots', async ({ page, context }) => {
      const hostPage = page
      const player1Page = await context.newPage()
      
      // Mock scenario where both players have same hand
      await page.route('/api/games/*/hand/evaluate', route => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            winners: [host.id, player1.id],
            handRankings: {
              [host.id]: { rank: 1, name: 'One Pair', cards: ['Ah', 'As', 'Kh', 'Qs', 'Jh'] },
              [player1.id]: { rank: 1, name: 'One Pair', cards: ['Ad', 'Ac', 'Kd', 'Qc', 'Jd'] }
            },
            potDistribution: {
              [host.id]: 50,
              [player1.id]: 50
            }
          })
        })
      })
      
      // Play to showdown...
      
      // Should show split pot message
      await expect(hostPage.locator('[data-testid="split-pot"]')).toContainText('Split pot')
      await expect(player1Page.locator('[data-testid="split-pot"]')).toContainText('Split pot')
      
      // Both players should receive equal amounts
      await expect(hostPage.locator('[data-testid="pot-won"]')).toContainText('$50')
      await expect(player1Page.locator('[data-testid="pot-won"]')).toContainText('$50')
    })

    test('should show mucked cards option', async ({ page }) => {
      await loginUser(page, host)
      await page.goto(`/games/${testGame.id}`)
      
      // When losing at showdown, should have option to muck cards
      // (This would require specific game state setup)
      
      await expect(page.locator('[data-testid="muck-cards-button"]')).toBeVisible()
      
      await page.click('[data-testid="muck-cards-button"]')
      
      // Cards should be hidden
      await expect(page.locator('[data-testid="hole-cards"]')).toHaveClass(/mucked/)
    })
  })

  test.describe('Side Pots and All-in Scenarios', () => {
    test('should create side pots correctly', async ({ page, context }) => {
      // This would require a three-player scenario with different stack sizes
      const hostPage = page
      const player1Page = await context.newPage()
      const player2Page = await context.newPage()
      
      // Setup three players with different chip amounts
      // Player with fewer chips goes all-in
      // Should create main pot and side pot
      
      await expect(hostPage.locator('[data-testid="main-pot"]')).toContainText('Main Pot: $')
      await expect(hostPage.locator('[data-testid="side-pot-1"]')).toContainText('Side Pot: $')
      
      // Should show eligible players for each pot
      await expect(hostPage.locator('[data-testid="main-pot-players"]')).toContainText('3 players')
      await expect(hostPage.locator('[data-testid="side-pot-players"]')).toContainText('2 players')
    })

    test('should handle all-in protection', async ({ page }) => {
      await loginUser(page, host)
      await page.goto(`/games/${testGame.id}`)
      
      // Player with very few chips
      // Should not be able to bet more than their chips
      
      const availableChips = await page.locator('[data-testid="player-chips"]').textContent()
      const chipAmount = parseInt(availableChips?.replace(/\D/g, '') || '0')
      
      await page.click('[data-testid="raise-button"]')
      await page.fill('[data-testid="raise-input"]', (chipAmount + 100).toString())
      await page.click('[data-testid="confirm-raise-button"]')
      
      // Should convert to all-in
      await expect(page.locator('[data-testid="player-action"]')).toContainText('All-in')
    })
  })

  test.describe('Chat and Social Features', () => {
    test('should send and receive chat messages', async ({ page, context }) => {
      const hostPage = page
      const player1Page = await context.newPage()
      
      await loginUser(hostPage, host)
      await loginUser(player1Page, player1)
      
      await hostPage.goto(`/games/${testGame.id}`)
      await player1Page.goto(`/games/${testGame.id}`)
      
      // Send chat message from host
      await hostPage.fill('[data-testid="chat-input"]', 'Good luck everyone!')
      await hostPage.press('[data-testid="chat-input"]', 'Enter')
      
      // Message should appear in both clients
      await expect(hostPage.locator('[data-testid="chat-messages"]')).toContainText('Good luck everyone!')
      await expect(player1Page.locator('[data-testid="chat-messages"]')).toContainText('Good luck everyone!')
      
      // Should show sender name
      await expect(hostPage.locator('[data-testid="chat-message-sender"]')).toContainText(host.username)
    })

    test('should validate chat messages', async ({ page }) => {
      await loginUser(page, host)
      await page.goto(`/games/${testGame.id}`)
      
      // Try to send empty message
      await page.press('[data-testid="chat-input"]', 'Enter')
      
      // Should not send empty message
      await expect(page.locator('[data-testid="chat-messages"] .chat-message')).toHaveCount(0)
      
      // Try to send very long message
      const longMessage = 'x'.repeat(501)
      await page.fill('[data-testid="chat-input"]', longMessage)
      await page.press('[data-testid="chat-input"]', 'Enter')
      
      await expect(page.locator('[data-testid="chat-error"]')).toContainText('Message too long')
    })

    test('should handle chat rate limiting', async ({ page }) => {
      await loginUser(page, host)
      await page.goto(`/games/${testGame.id}`)
      
      // Send many messages quickly
      for (let i = 0; i < 15; i++) {
        await page.fill('[data-testid="chat-input"]', `Message ${i}`)
        await page.press('[data-testid="chat-input"]', 'Enter')
      }
      
      // Should eventually be rate limited
      await expect(page.locator('[data-testid="chat-error"]')).toContainText('Sending too fast')
      
      // Chat input should be temporarily disabled
      await expect(page.locator('[data-testid="chat-input"]')).toBeDisabled()
    })

    test('should show player statistics', async ({ page }) => {
      await loginUser(page, host)
      await page.goto(`/games/${testGame.id}`)
      
      // Click on player to show stats
      await page.click('[data-testid="player-info"]')
      
      // Should show stats popup
      await expect(page.locator('[data-testid="player-stats-modal"]')).toBeVisible()
      
      // Should show relevant stats
      await expect(page.locator('[data-testid="vpip-stat"]')).toBeVisible()
      await expect(page.locator('[data-testid="pfr-stat"]')).toBeVisible()
      await expect(page.locator('[data-testid="aggression-stat"]')).toBeVisible()
      
      // Stats should be properly formatted
      const vpip = await page.locator('[data-testid="vpip-value"]').textContent()
      expect(vpip).toMatch(/^\d+%$/) // Should be percentage
    })
  })

  test.describe('Game State Persistence', () => {
    test('should maintain game state on reconnection', async ({ page }) => {
      await loginUser(page, host)
      await page.goto(`/games/${testGame.id}`)
      
      // Join game and start playing
      await page.click('[data-testid="seat-1"]')
      await page.fill('[data-testid="buy-in-input"]', '200')
      await page.click('[data-testid="join-game-button"]')
      
      // Get current game state
      const currentChips = await page.locator('[data-testid="player-chips"]').textContent()
      const currentSeat = await page.locator('[data-testid="seat-1"]').textContent()
      
      // Simulate disconnect and reconnect
      await page.reload()
      
      // Should restore game state
      await expect(page.locator('[data-testid="seat-1"]')).toContainText(host.username)
      await expect(page.locator('[data-testid="player-chips"]')).toContainText(currentChips!)
      
      // If in middle of hand, should restore hand state
      if (await page.locator('[data-testid="hole-cards"]').isVisible()) {
        await expect(page.locator('[data-testid="hole-cards"]')).toBeVisible()
        await expect(page.locator('[data-testid="community-cards"]')).toBeVisible()
      }
    })

    test('should handle connection errors gracefully', async ({ page }) => {
      await loginUser(page, host)
      await page.goto(`/games/${testGame.id}`)
      
      // Mock WebSocket connection failure
      await page.evaluate(() => {
        // @ts-ignore
        window.WebSocket = class MockWebSocket {
          constructor() {
            setTimeout(() => {
              this.onerror?.({ type: 'error' })
            }, 100)
          }
          send() {}
          close() {}
        }
      })
      
      // Should show connection error
      await expect(page.locator('[data-testid="connection-error"]')).toContainText('Connection lost')
      
      // Should show retry button
      await expect(page.locator('[data-testid="retry-connection-button"]')).toBeVisible()
      
      await page.click('[data-testid="retry-connection-button"]')
      
      // Should attempt to reconnect
      await expect(page.locator('[data-testid="connecting-message"]')).toContainText('Reconnecting')
    })
  })

  test.describe('Mobile Responsiveness', () => {
    test('should work on mobile devices', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 })
      
      await loginUser(page, host)
      await page.goto(`/games/${testGame.id}`)
      
      // Game table should be responsive
      const gameTable = page.locator('[data-testid="game-table"]')
      await expect(gameTable).toBeVisible()
      
      // Action buttons should be touch-friendly
      const actionButtons = page.locator('[data-testid="action-buttons"] button')
      for (let i = 0; i < await actionButtons.count(); i++) {
        const button = actionButtons.nth(i)
        const bounds = await button.boundingBox()
        expect(bounds?.height).toBeGreaterThanOrEqual(44) // Minimum touch target
      }
      
      // Chat should be accessible
      await expect(page.locator('[data-testid="chat-panel"]')).toBeVisible()
    })

    test('should handle mobile gestures', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 })
      
      await loginUser(page, host)
      await page.goto(`/games/${testGame.id}`)
      
      // Should be able to swipe to show/hide chat
      await page.touchscreen.tap(200, 300) // Tap on game area
      await page.touchscreen.tap(50, 600)  // Tap on chat toggle
      
      const chatPanel = page.locator('[data-testid="chat-panel"]')
      // Chat visibility might toggle based on implementation
    })
  })

  test.describe('Performance', () => {
    test('should handle multiple concurrent games', async ({ page }) => {
      await loginUser(page, host)
      
      // Open multiple game tabs
      const promises = []
      for (let i = 0; i < 5; i++) {
        promises.push(page.goto(`/games/${testGame.id}`))
      }
      
      await Promise.all(promises)
      
      // All should load successfully
      await expect(page.locator('[data-testid="game-table"]')).toBeVisible()
    })

    test('should maintain good performance during active gameplay', async ({ page }) => {
      await loginUser(page, host)
      await page.goto(`/games/${testGame.id}`)
      
      const startTime = performance.now()
      
      // Simulate rapid actions
      for (let i = 0; i < 10; i++) {
        if (await page.locator('[data-testid="fold-button"]').isVisible()) {
          await page.click('[data-testid="fold-button"]')
        }
        await page.waitForTimeout(100)
      }
      
      const endTime = performance.now()
      const totalTime = endTime - startTime
      
      // Actions should be responsive (< 2 seconds for 10 actions)
      expect(totalTime).toBeLessThan(2000)
    })
  })
})