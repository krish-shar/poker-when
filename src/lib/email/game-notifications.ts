import { emailService } from './service';
import type { 
  GameInviteData, 
  TournamentNotificationData, 
  LedgerInviteData, 
  DebtNotificationData 
} from './service';

export interface GameEmailHandlers {
  onGameInvite: (playerEmail: string, inviteData: GameInviteData) => Promise<void>;
  onTournamentUpdate: (playerEmail: string, tournamentData: TournamentNotificationData) => Promise<void>;
  onLedgerInvite: (playerEmail: string, ledgerData: LedgerInviteData) => Promise<void>;
  onDebtNotification: (playerEmail: string, debtData: DebtNotificationData) => Promise<void>;
  onGameStarting: (playerEmails: string[], gameData: any) => Promise<void>;
  onHandHistory: (playerEmail: string, handData: any) => Promise<void>;
}

// Generate URLs for game-related actions
const generateGameUrls = {
  joinGame: (gameId: string) => `${process.env.NEXT_PUBLIC_APP_URL}/game/${gameId}/join`,
  joinTournament: (tournamentId: string) => `${process.env.NEXT_PUBLIC_APP_URL}/tournament/${tournamentId}`,
  joinLedger: (ledgerId: string, inviteCode: string) => `${process.env.NEXT_PUBLIC_APP_URL}/ledger/join?id=${ledgerId}&code=${inviteCode}`,
  settleDebt: (ledgerId: string, debtId: string) => `${process.env.NEXT_PUBLIC_APP_URL}/ledger/${ledgerId}/settle/${debtId}`,
  gameTable: (gameId: string) => `${process.env.NEXT_PUBLIC_APP_URL}/game/${gameId}`,
  handHistory: (handId: string) => `${process.env.NEXT_PUBLIC_APP_URL}/hand/${handId}`,
};

export const gameEmailHandlers: GameEmailHandlers = {
  async onGameInvite(playerEmail: string, inviteData: GameInviteData) {
    try {
      await emailService.sendGameInvite(playerEmail, inviteData);
      console.log(`Game invite sent to ${playerEmail} for ${inviteData.gameName}`);
    } catch (error) {
      console.error('Failed to send game invite:', error);
    }
  },

  async onTournamentUpdate(playerEmail: string, tournamentData: TournamentNotificationData) {
    try {
      await emailService.sendTournamentNotification(playerEmail, tournamentData);
      console.log(`Tournament notification sent to ${playerEmail} for ${tournamentData.tournamentName}`);
    } catch (error) {
      console.error('Failed to send tournament notification:', error);
    }
  },

  async onLedgerInvite(playerEmail: string, ledgerData: LedgerInviteData) {
    try {
      await emailService.sendLedgerInvite(playerEmail, ledgerData);
      console.log(`Ledger invite sent to ${playerEmail} for ${ledgerData.ledgerName}`);
    } catch (error) {
      console.error('Failed to send ledger invite:', error);
    }
  },

  async onDebtNotification(playerEmail: string, debtData: DebtNotificationData) {
    try {
      await emailService.sendDebtNotification(playerEmail, debtData);
      console.log(`Debt notification sent to ${playerEmail} for $${debtData.amount}`);
    } catch (error) {
      console.error('Failed to send debt notification:', error);
    }
  },

  async onGameStarting(playerEmails: string[], gameData: any) {
    try {
      const emailPromises = playerEmails.map(email => 
        emailService.sendEmail({
          to: email,
          subject: `🚀 ${gameData.name} is starting now!`,
          html: `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>Game Starting</title>
            </head>
            <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="background: linear-gradient(135deg, #dc2626, #ef4444); padding: 30px; border-radius: 10px; text-align: center; margin-bottom: 30px;">
                <h1 style="color: white; margin: 0; font-size: 24px;">🚀 Game Starting!</h1>
              </div>
              
              <div style="background: #fef2f2; border: 2px solid #ef4444; padding: 25px; border-radius: 8px; margin-bottom: 25px;">
                <h2 style="color: #991b1b; margin-top: 0;">Time to Play! 🎰</h2>
                <p><strong>"${gameData.name}"</strong> is starting right now!</p>
                
                <div style="background: white; padding: 20px; border-radius: 6px; margin: 20px 0;">
                  <ul style="margin: 0; padding-left: 20px; list-style: none;">
                    <li style="margin-bottom: 8px;">🎮 <strong>Type:</strong> ${gameData.type}</li>
                    <li style="margin-bottom: 8px;">💵 <strong>Stakes:</strong> ${gameData.stakes}</li>
                    <li style="margin-bottom: 8px;">👥 <strong>Players:</strong> ${gameData.playerCount}/${gameData.maxPlayers}</li>
                  </ul>
                </div>
              </div>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${generateGameUrls.gameTable(gameData.id)}" style="background: #dc2626; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block; font-size: 16px;">Join Game Now! 🔥</a>
              </div>
              
              <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 4px;">
                <p style="margin: 0; color: #92400e;"><strong>⚡ Hurry:</strong> The game is starting! Don't miss your seat at the table.</p>
              </div>
              
              <div style="border-top: 1px solid #e2e8f0; padding-top: 20px; margin-top: 30px; text-align: center; color: #64748b; font-size: 14px;">
                <p>Good luck! 🍀<br>The PokerHome Team</p>
              </div>
            </body>
            </html>
          `
        })
      );

      await Promise.all(emailPromises);
      console.log(`Game starting notifications sent to ${playerEmails.length} players`);
    } catch (error) {
      console.error('Failed to send game starting notifications:', error);
    }
  },

  async onHandHistory(playerEmail: string, handData: any) {
    try {
      await emailService.sendEmail({
        to: playerEmail,
        subject: `🃏 Hand History: ${handData.summary}`,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Hand History</title>
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #0891b2, #06b6d4); padding: 30px; border-radius: 10px; text-align: center; margin-bottom: 30px;">
              <h1 style="color: white; margin: 0; font-size: 24px;">🃏 Hand History</h1>
              <p style="color: white; margin: 10px 0 0 0; opacity: 0.9;">${handData.gameName}</p>
            </div>
            
            <div style="background: #f0f9ff; border: 2px solid #0ea5e9; padding: 25px; border-radius: 8px; margin-bottom: 25px;">
              <h2 style="color: #0c4a6e; margin-top: 0;">Hand Summary</h2>
              <p><strong>${handData.summary}</strong></p>
              
              ${handData.yourCards ? `
              <div style="background: white; padding: 20px; border-radius: 6px; margin: 20px 0;">
                <h3 style="margin-top: 0; color: #374151;">Your Hand:</h3>
                <p style="font-size: 18px; font-weight: 600;">${handData.yourCards}</p>
                <p><strong>Result:</strong> ${handData.result} ${handData.amount ? `($${handData.amount})` : ''}</p>
              </div>
              ` : ''}
              
              ${handData.winningHand ? `
              <div style="background: #f0fdf4; padding: 15px; border-radius: 6px; margin: 10px 0;">
                <p><strong>Winning Hand:</strong> ${handData.winningHand}</p>
                <p><strong>Pot Size:</strong> $${handData.potSize}</p>
              </div>
              ` : ''}
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${generateGameUrls.handHistory(handData.handId)}" style="background: #0ea5e9; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block; font-size: 16px;">View Full Hand 🔍</a>
            </div>
            
            <div style="border-top: 1px solid #e2e8f0; padding-top: 20px; margin-top: 30px; text-align: center; color: #64748b; font-size: 14px;">
              <p>Analyze your play! 📊<br>The PokerHome Team</p>
            </div>
          </body>
          </html>
        `
      });
      console.log(`Hand history sent to ${playerEmail}`);
    } catch (error) {
      console.error('Failed to send hand history:', error);
    }
  },
};

// Bulk notification helpers
export const bulkGameNotifications = {
  async notifyGameInvites(invites: Array<{ email: string; data: GameInviteData }>) {
    const emailPromises = invites.map(({ email, data }) => 
      gameEmailHandlers.onGameInvite(email, data)
    );
    await Promise.allSettled(emailPromises);
  },

  async notifyTournamentUpdates(updates: Array<{ email: string; data: TournamentNotificationData }>) {
    const emailPromises = updates.map(({ email, data }) => 
      gameEmailHandlers.onTournamentUpdate(email, data)
    );
    await Promise.allSettled(emailPromises);
  },

  async notifyLedgerInvites(invites: Array<{ email: string; data: LedgerInviteData }>) {
    const emailPromises = invites.map(({ email, data }) => 
      gameEmailHandlers.onLedgerInvite(email, data)
    );
    await Promise.allSettled(emailPromises);
  },

  async notifyDebtReminders(reminders: Array<{ email: string; data: DebtNotificationData }>) {
    const emailPromises = reminders.map(({ email, data }) => 
      gameEmailHandlers.onDebtNotification(email, data)
    );
    await Promise.allSettled(emailPromises);
  },
};

// Event-driven notification system
export const createGameNotificationTriggers = () => {
  return {
    // Game lifecycle events
    onGameCreated: async (gameId: string, creatorEmail: string, gameData: any) => {
      // Could send confirmation email to game creator
      console.log(`Game ${gameId} created by ${creatorEmail}`);
    },

    onPlayerJoined: async (gameId: string, playerEmail: string, gameData: any) => {
      // Send join confirmation
      console.log(`Player ${playerEmail} joined game ${gameId}`);
    },

    onGameStarted: async (gameId: string, playerEmails: string[], gameData: any) => {
      await gameEmailHandlers.onGameStarting(playerEmails, gameData);
    },

    // Tournament events
    onTournamentRegistration: async (tournamentId: string, playerEmail: string) => {
      console.log(`Player ${playerEmail} registered for tournament ${tournamentId}`);
    },

    onTournamentStarting: async (tournamentId: string, playerEmails: string[], tournamentData: any) => {
      const notifications = playerEmails.map(email => ({
        email,
        data: {
          tournamentName: tournamentData.name,
          status: 'starting' as const,
        } as TournamentNotificationData
      }));
      await bulkGameNotifications.notifyTournamentUpdates(notifications);
    },

    // Ledger events
    onLedgerCreated: async (ledgerId: string, creatorEmail: string) => {
      console.log(`Ledger ${ledgerId} created by ${creatorEmail}`);
    },

    onDebtCreated: async (debtorEmail: string, debtData: DebtNotificationData) => {
      await gameEmailHandlers.onDebtNotification(debtorEmail, debtData);
    },

    onDebtOverdue: async (debtorEmail: string, debtData: DebtNotificationData) => {
      await gameEmailHandlers.onDebtNotification(debtorEmail, {
        ...debtData,
        daysOverdue: Math.floor((Date.now() - (debtData as any).createdAt) / (1000 * 60 * 60 * 24))
      });
    },
  };
};