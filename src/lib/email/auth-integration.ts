import { emailService } from './service';
import { auth } from '@/lib/auth/config';

export interface AuthEmailHandlers {
  onUserRegistered: (userId: string, email: string, username: string) => Promise<void>;
  onPasswordResetRequested: (email: string, resetToken: string, username: string) => Promise<void>;
  onEmailVerificationRequested: (email: string, verificationToken: string, username: string) => Promise<void>;
}

// Generate URLs for email actions
const generateUrls = {
  profile: (userId: string) => `${process.env.NEXT_PUBLIC_APP_URL}/profile/${userId}`,
  passwordReset: (token: string) => `${process.env.NEXT_PUBLIC_APP_URL}/auth/reset-password?token=${token}`,
  emailVerification: (token: string) => `${process.env.NEXT_PUBLIC_APP_URL}/auth/verify-email?token=${token}`,
};

export const authEmailHandlers: AuthEmailHandlers = {
  async onUserRegistered(userId: string, email: string, username: string) {
    try {
      await emailService.sendWelcomeEmail(email, {
        username,
        profileUrl: generateUrls.profile(userId),
      });
      console.log(`Welcome email sent to ${email}`);
    } catch (error) {
      console.error('Failed to send welcome email:', error);
    }
  },

  async onPasswordResetRequested(email: string, resetToken: string, username: string) {
    try {
      await emailService.sendPasswordReset(email, {
        username,
        resetUrl: generateUrls.passwordReset(resetToken),
        expiresIn: '1 hour',
      });
      console.log(`Password reset email sent to ${email}`);
    } catch (error) {
      console.error('Failed to send password reset email:', error);
    }
  },

  async onEmailVerificationRequested(email: string, verificationToken: string, username: string) {
    try {
      // Create email verification template
      const template = {
        to: email,
        subject: '✉️ Verify your PokerHome email',
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Email Verification</title>
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #059669, #10b981); padding: 30px; border-radius: 10px; text-align: center; margin-bottom: 30px;">
              <h1 style="color: white; margin: 0; font-size: 24px;">✉️ Verify Your Email</h1>
            </div>
            
            <div style="background: #f0fdf4; border: 2px solid #22c55e; padding: 25px; border-radius: 8px; margin-bottom: 25px;">
              <h2 style="color: #166534; margin-top: 0;">Hi ${username}!</h2>
              <p>Thanks for signing up for PokerHome! Please verify your email address to complete your registration and unlock all features.</p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${generateUrls.emailVerification(verificationToken)}" style="background: #22c55e; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block; font-size: 16px;">Verify Email ✅</a>
              </div>
              
              <p style="color: #64748b; font-size: 14px;">This link will expire in 24 hours. If you didn't create this account, you can safely ignore this email.</p>
            </div>
            
            <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 4px;">
              <p style="margin: 0; color: #92400e;"><strong>🎯 Next Steps:</strong> Once verified, you can join games, create ledgers, and track your poker journey!</p>
            </div>
            
            <div style="border-top: 1px solid #e2e8f0; padding-top: 20px; margin-top: 30px; text-align: center; color: #64748b; font-size: 14px;">
              <p>Welcome to the community! 🎰<br>The PokerHome Team</p>
            </div>
          </body>
          </html>
        `
      };

      await emailService.sendEmail(template);
      console.log(`Email verification sent to ${email}`);
    } catch (error) {
      console.error('Failed to send email verification:', error);
    }
  },
};

// Enhanced auth hooks for Better Auth integration
export const createAuthEmailCallbacks = () => ({
  async onUserCreated(user: any) {
    if (user.email && user.name) {
      await authEmailHandlers.onUserRegistered(user.id, user.email, user.name);
    }
  },

  async onPasswordResetRequest(email: string, token: string, user: any) {
    if (user?.name) {
      await authEmailHandlers.onPasswordResetRequested(email, token, user.name);
    }
  },

  async onEmailVerificationRequest(email: string, token: string, user: any) {
    if (user?.name) {
      await authEmailHandlers.onEmailVerificationRequested(email, token, user.name);
    }
  },
});

// Utility functions for manual email sending
export const sendManualEmails = {
  async welcomeEmail(userId: string, email: string, username: string) {
    return await authEmailHandlers.onUserRegistered(userId, email, username);
  },

  async passwordReset(email: string, resetToken: string, username: string) {
    return await authEmailHandlers.onPasswordResetRequested(email, resetToken, username);
  },

  async emailVerification(email: string, verificationToken: string, username: string) {
    return await authEmailHandlers.onEmailVerificationRequested(email, verificationToken, username);
  },
};