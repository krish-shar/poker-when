import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export interface EmailTemplate {
  to: string;
  subject: string;
  html: string;
  from?: string;
}

export interface WelcomeEmailData {
  username: string;
  profileUrl: string;
}

export interface GameInviteData {
  inviterName: string;
  gameName: string;
  gameType: 'cash' | 'tournament';
  stakes: string;
  joinUrl: string;
  startTime?: string;
}

export interface TournamentNotificationData {
  tournamentName: string;
  status: 'starting' | 'registration_closing' | 'final_table' | 'completed';
  position?: number;
  prize?: number;
  nextBlindLevel?: string;
  playersRemaining?: number;
}

export interface PasswordResetData {
  username: string;
  resetUrl: string;
  expiresIn: string;
}

export interface LedgerInviteData {
  inviterName: string;
  ledgerName: string;
  joinUrl: string;
  description?: string;
}

export interface DebtNotificationData {
  creditorName: string;
  amount: number;
  ledgerName: string;
  settleUrl: string;
  daysOverdue?: number;
}

class EmailService {
  private fromEmail = process.env.FROM_EMAIL || 'noreply@pokerhome.app';

  async sendEmail(template: EmailTemplate): Promise<boolean> {
    try {
      await resend.emails.send({
        from: template.from || this.fromEmail,
        to: template.to,
        subject: template.subject,
        html: template.html,
      });
      return true;
    } catch (error) {
      console.error('Email sending failed:', error);
      return false;
    }
  }

  // Welcome email for new users
  async sendWelcomeEmail(to: string, data: WelcomeEmailData): Promise<boolean> {
    const template: EmailTemplate = {
      to,
      subject: 'Welcome to PokerHome! 🎰',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Welcome to PokerHome</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #1e3a8a, #3b82f6); padding: 30px; border-radius: 10px; text-align: center; margin-bottom: 30px;">
            <h1 style="color: white; margin: 0; font-size: 28px;">🎰 Welcome to PokerHome!</h1>
            <p style="color: #e0e7ff; margin: 10px 0 0 0; font-size: 16px;">Your ultimate poker platform</p>
          </div>
          
          <div style="background: #f8fafc; padding: 25px; border-radius: 8px; margin-bottom: 25px;">
            <h2 style="color: #1e293b; margin-top: 0;">Hey ${data.username}! 👋</h2>
            <p>Welcome to the ultimate poker experience! You're all set to dive into exciting games and manage your home poker sessions like a pro.</p>
            
            <h3 style="color: #3b82f6; margin-bottom: 10px;">🚀 Get Started:</h3>
            <ul style="margin: 0; padding-left: 20px;">
              <li><strong>Join Online Games:</strong> Jump into real-time Texas Hold'em cash games or tournaments</li>
              <li><strong>Create Home Game Ledgers:</strong> Track your in-person poker sessions with ease</li>
              <li><strong>Invite Friends:</strong> Build your poker community and compete together</li>
              <li><strong>Analyze Your Play:</strong> Track statistics like VPIP, PFR, and overall performance</li>
            </ul>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${data.profileUrl}" style="background: #3b82f6; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block;">Complete Your Profile 👤</a>
          </div>
          
          <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 4px;">
            <p style="margin: 0; color: #92400e;"><strong>💡 Pro Tip:</strong> Set up your avatar and preferences to personalize your poker experience!</p>
          </div>
          
          <div style="border-top: 1px solid #e2e8f0; padding-top: 20px; margin-top: 30px; text-align: center; color: #64748b; font-size: 14px;">
            <p>Happy playing! 🃏<br>The PokerHome Team</p>
            <p style="margin-top: 15px;">Questions? Reply to this email or contact support.</p>
          </div>
        </body>
        </html>
      `
    };

    return await this.sendEmail(template);
  }

  // Game invitation email
  async sendGameInvite(to: string, data: GameInviteData): Promise<boolean> {
    const gameTypeEmoji = data.gameType === 'tournament' ? '🏆' : '💰';
    const template: EmailTemplate = {
      to,
      subject: `${gameTypeEmoji} You're invited to play poker!`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Poker Game Invitation</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #059669, #10b981); padding: 30px; border-radius: 10px; text-align: center; margin-bottom: 30px;">
            <h1 style="color: white; margin: 0; font-size: 24px;">${gameTypeEmoji} Poker Game Invitation</h1>
          </div>
          
          <div style="background: #f0fdf4; border: 2px solid #22c55e; padding: 25px; border-radius: 8px; margin-bottom: 25px;">
            <h2 style="color: #166534; margin-top: 0;">You're Invited! 🎉</h2>
            <p><strong>${data.inviterName}</strong> has invited you to join "${data.gameName}"</p>
            
            <div style="background: white; padding: 20px; border-radius: 6px; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #374151;">Game Details:</h3>
              <ul style="margin: 0; padding-left: 20px; list-style: none;">
                <li style="margin-bottom: 8px;">🎮 <strong>Type:</strong> ${data.gameType === 'tournament' ? 'Tournament' : 'Cash Game'}</li>
                <li style="margin-bottom: 8px;">💵 <strong>Stakes:</strong> ${data.stakes}</li>
                ${data.startTime ? `<li style="margin-bottom: 8px;">⏰ <strong>Start Time:</strong> ${data.startTime}</li>` : ''}
              </ul>
            </div>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${data.joinUrl}" style="background: #22c55e; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block; font-size: 16px;">Join Game 🚀</a>
          </div>
          
          <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 4px;">
            <p style="margin: 0; color: #92400e;"><strong>⚡ Quick Tip:</strong> Make sure you're logged in to PokerHome before clicking the join link!</p>
          </div>
          
          <div style="border-top: 1px solid #e2e8f0; padding-top: 20px; margin-top: 30px; text-align: center; color: #64748b; font-size: 14px;">
            <p>Good luck at the tables! 🍀<br>The PokerHome Team</p>
          </div>
        </body>
        </html>
      `
    };

    return await this.sendEmail(template);
  }

  // Tournament notifications
  async sendTournamentNotification(to: string, data: TournamentNotificationData): Promise<boolean> {
    let subject = '';
    let statusMessage = '';
    let statusColor = '#3b82f6';

    switch (data.status) {
      case 'starting':
        subject = `🏆 ${data.tournamentName} is starting!`;
        statusMessage = 'The tournament is about to begin! Make sure you\'re ready to play.';
        statusColor = '#22c55e';
        break;
      case 'registration_closing':
        subject = `⏰ Last chance to register for ${data.tournamentName}`;
        statusMessage = 'Registration is closing soon! Don\'t miss your chance to play.';
        statusColor = '#f59e0b';
        break;
      case 'final_table':
        subject = `🔥 Final table in ${data.tournamentName}!`;
        statusMessage = `Congratulations! You've made it to the final table with ${data.playersRemaining} players remaining.`;
        statusColor = '#dc2626';
        break;
      case 'completed':
        subject = `🎉 ${data.tournamentName} completed!`;
        statusMessage = data.position 
          ? `Tournament finished! You placed ${data.position}${data.prize ? ` and won $${data.prize}` : ''}.`
          : 'The tournament has ended. Thanks for playing!';
        statusColor = '#7c3aed';
        break;
    }

    const template: EmailTemplate = {
      to,
      subject,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Tournament Update</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, ${statusColor}, ${statusColor}dd); padding: 30px; border-radius: 10px; text-align: center; margin-bottom: 30px;">
            <h1 style="color: white; margin: 0; font-size: 24px;">🏆 Tournament Update</h1>
            <p style="color: white; margin: 10px 0 0 0; opacity: 0.9;">${data.tournamentName}</p>
          </div>
          
          <div style="background: #f8fafc; padding: 25px; border-radius: 8px; margin-bottom: 25px;">
            <h2 style="color: #1e293b; margin-top: 0;">Tournament Status</h2>
            <p style="font-size: 16px;">${statusMessage}</p>
            
            ${data.playersRemaining ? `<p><strong>Players Remaining:</strong> ${data.playersRemaining}</p>` : ''}
            ${data.nextBlindLevel ? `<p><strong>Next Blind Level:</strong> ${data.nextBlindLevel}</p>` : ''}
            ${data.position ? `<p><strong>Your Position:</strong> #${data.position}</p>` : ''}
            ${data.prize ? `<p><strong>Prize Won:</strong> $${data.prize}</p>` : ''}
          </div>
          
          <div style="border-top: 1px solid #e2e8f0; padding-top: 20px; margin-top: 30px; text-align: center; color: #64748b; font-size: 14px;">
            <p>Best of luck! 🍀<br>The PokerHome Team</p>
          </div>
        </body>
        </html>
      `
    };

    return await this.sendEmail(template);
  }

  // Password reset email
  async sendPasswordReset(to: string, data: PasswordResetData): Promise<boolean> {
    const template: EmailTemplate = {
      to,
      subject: '🔒 Reset your PokerHome password',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Password Reset</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #7c3aed, #a855f7); padding: 30px; border-radius: 10px; text-align: center; margin-bottom: 30px;">
            <h1 style="color: white; margin: 0; font-size: 24px;">🔒 Password Reset</h1>
          </div>
          
          <div style="background: #f8fafc; padding: 25px; border-radius: 8px; margin-bottom: 25px;">
            <h2 style="color: #1e293b; margin-top: 0;">Hi ${data.username},</h2>
            <p>We received a request to reset your PokerHome password. Click the button below to create a new password:</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${data.resetUrl}" style="background: #7c3aed; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block;">Reset Password 🔑</a>
            </div>
            
            <p style="color: #64748b; font-size: 14px;">This link will expire in ${data.expiresIn}. If you didn't request this reset, you can safely ignore this email.</p>
          </div>
          
          <div style="background: #fef2f2; border-left: 4px solid #ef4444; padding: 15px; margin: 20px 0; border-radius: 4px;">
            <p style="margin: 0; color: #991b1b;"><strong>Security Tip:</strong> Never share your password reset link with anyone!</p>
          </div>
          
          <div style="border-top: 1px solid #e2e8f0; padding-top: 20px; margin-top: 30px; text-align: center; color: #64748b; font-size: 14px;">
            <p>Need help? Contact our support team.<br>The PokerHome Team</p>
          </div>
        </body>
        </html>
      `
    };

    return await this.sendEmail(template);
  }

  // Home game ledger invitation
  async sendLedgerInvite(to: string, data: LedgerInviteData): Promise<boolean> {
    const template: EmailTemplate = {
      to,
      subject: `📊 Join "${data.ledgerName}" home game ledger`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Home Game Invitation</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #0891b2, #06b6d4); padding: 30px; border-radius: 10px; text-align: center; margin-bottom: 30px;">
            <h1 style="color: white; margin: 0; font-size: 24px;">📊 Home Game Invitation</h1>
          </div>
          
          <div style="background: #f0f9ff; border: 2px solid #0ea5e9; padding: 25px; border-radius: 8px; margin-bottom: 25px;">
            <h2 style="color: #0c4a6e; margin-top: 0;">You're Invited to Join!</h2>
            <p><strong>${data.inviterName}</strong> has invited you to join the home game ledger:</p>
            
            <div style="background: white; padding: 20px; border-radius: 6px; margin: 20px 0; text-align: center;">
              <h3 style="margin: 0; color: #1e293b; font-size: 20px;">"${data.ledgerName}"</h3>
              ${data.description ? `<p style="color: #64748b; margin: 10px 0 0 0;">${data.description}</p>` : ''}
            </div>
            
            <p>Track your buy-ins, cash-outs, and settle debts with other players. Get detailed analytics on your home game performance!</p>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${data.joinUrl}" style="background: #0ea5e9; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block; font-size: 16px;">Join Ledger 📈</a>
          </div>
          
          <div style="background: #ecfdf5; border-left: 4px solid #22c55e; padding: 15px; margin: 20px 0; border-radius: 4px;">
            <p style="margin: 0; color: #166534;"><strong>💡 Features:</strong> Track sessions, manage debts, view analytics, and settle up with friends!</p>
          </div>
          
          <div style="border-top: 1px solid #e2e8f0; padding-top: 20px; margin-top: 30px; text-align: center; color: #64748b; font-size: 14px;">
            <p>Happy tracking! 📊<br>The PokerHome Team</p>
          </div>
        </body>
        </html>
      `
    };

    return await this.sendEmail(template);
  }

  // Debt settlement notification
  async sendDebtNotification(to: string, data: DebtNotificationData): Promise<boolean> {
    const isOverdue = data.daysOverdue && data.daysOverdue > 0;
    const template: EmailTemplate = {
      to,
      subject: isOverdue 
        ? `⚠️ Overdue debt: $${data.amount} to ${data.creditorName}`
        : `💰 Settle up: $${data.amount} owed to ${data.creditorName}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Debt Settlement</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, ${isOverdue ? '#dc2626, #ef4444' : '#f59e0b, #fbbf24'}); padding: 30px; border-radius: 10px; text-align: center; margin-bottom: 30px;">
            <h1 style="color: white; margin: 0; font-size: 24px;">${isOverdue ? '⚠️' : '💰'} Debt Settlement</h1>
          </div>
          
          <div style="background: ${isOverdue ? '#fef2f2' : '#fffbeb'}; border: 2px solid ${isOverdue ? '#ef4444' : '#f59e0b'}; padding: 25px; border-radius: 8px; margin-bottom: 25px;">
            <h2 style="color: ${isOverdue ? '#991b1b' : '#92400e'}; margin-top: 0;">Settlement Reminder</h2>
            <p>You have an outstanding debt in the "${data.ledgerName}" ledger:</p>
            
            <div style="background: white; padding: 20px; border-radius: 6px; margin: 20px 0; text-align: center;">
              <h3 style="margin: 0; color: #1e293b; font-size: 24px;">$${data.amount}</h3>
              <p style="color: #64748b; margin: 10px 0 0 0;">owed to <strong>${data.creditorName}</strong></p>
              ${isOverdue ? `<p style="color: #dc2626; margin: 10px 0 0 0; font-weight: 600;">${data.daysOverdue} days overdue</p>` : ''}
            </div>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${data.settleUrl}" style="background: ${isOverdue ? '#dc2626' : '#f59e0b'}; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block; font-size: 16px;">Settle Debt 💳</a>
          </div>
          
          <div style="background: #f0f9ff; border-left: 4px solid #0ea5e9; padding: 15px; margin: 20px 0; border-radius: 4px;">
            <p style="margin: 0; color: #0c4a6e;"><strong>💡 Tip:</strong> You can make partial payments if you can't settle the full amount right now!</p>
          </div>
          
          <div style="border-top: 1px solid #e2e8f0; padding-top: 20px; margin-top: 30px; text-align: center; color: #64748b; font-size: 14px;">
            <p>Keep your poker debts organized! 🤝<br>The PokerHome Team</p>
          </div>
        </body>
        </html>
      `
    };

    return await this.sendEmail(template);
  }
}

export const emailService = new EmailService();