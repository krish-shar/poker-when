# 🚀 Free Production Deployment Guide

Deploy your PokerHome app to production for **completely free** using Vercel, Supabase, Upstash, and Resend free tiers.

## 📋 Prerequisites

1. **GitHub Account** (free)
2. **Vercel Account** (free - 100GB bandwidth/month)
3. **Supabase Account** (free - 500MB database, 5GB bandwidth)
4. **Upstash Redis Account** (free - 10k commands/day)
5. **Resend Account** (free - 3k emails/month)

## 🎯 Step-by-Step Deployment

### 1. Set up Supabase Production Database

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Choose the **free tier** (no credit card required)
3. Note down your project URL and anon key
4. Run the database migration:
   ```sql
   -- Copy and paste the content from supabase/migrations/001_initial_schema.sql
   -- into the Supabase SQL editor and run it
   ```

### 2. Set up Upstash Redis

1. Go to [upstash.com](https://upstash.com) and create account
2. Create a new Redis database (free tier)
3. Copy the REST URL and REST Token

### 3. Set up Resend Email

1. Go to [resend.com](https://resend.com) and create account
2. Get your API key from the dashboard
3. For **FROM_EMAIL**, use: `noreply@resend.dev` (free domain)

### 4. Deploy to Vercel

1. **Push to GitHub:**
   ```bash
   git add .
   git commit -m "Ready for production deployment"
   git push origin main
   ```

2. **Deploy on Vercel:**
   - Go to [vercel.com](https://vercel.com)
   - Click "New Project"
   - Import your GitHub repository
   - Vercel will auto-detect Next.js settings

3. **Add Environment Variables:**
   
   In Vercel dashboard → Project → Settings → Environment Variables, add:

   ```env
   # Database (from Supabase)
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

   # Redis (from Upstash)
   UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
   UPSTASH_REDIS_REST_TOKEN=your_upstash_token

   # Email (from Resend)
   RESEND_API_KEY=your_resend_api_key
   FROM_EMAIL=noreply@resend.dev

   # App URLs (Vercel will provide these)
   NEXT_PUBLIC_APP_URL=https://your-app-name.vercel.app
   BETTER_AUTH_URL=https://your-app-name.vercel.app

   # Generate a long random secret
   BETTER_AUTH_SECRET=your_very_long_random_secret_key_here_64_chars_min

   # OAuth (Optional - for social login)
   GITHUB_CLIENT_ID=your_github_client_id
   GITHUB_CLIENT_SECRET=your_github_client_secret
   GOOGLE_CLIENT_ID=your_google_client_id
   GOOGLE_CLIENT_SECRET=your_google_client_secret

   # Production
   NODE_ENV=production
   ```

4. **Deploy:**
   - Click "Deploy" and wait for build to complete
   - Your app will be live at `https://your-app-name.vercel.app`

## 🔧 OAuth Setup (Optional Social Login)

### GitHub OAuth:
1. Go to GitHub → Settings → Developer settings → OAuth Apps
2. Create new OAuth App:
   - **Homepage URL:** `https://your-app-name.vercel.app`
   - **Callback URL:** `https://your-app-name.vercel.app/api/auth/callback/github`

### Google OAuth:
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create new project or select existing
3. Enable Google+ API
4. Create OAuth 2.0 credentials:
   - **Authorized origins:** `https://your-app-name.vercel.app`
   - **Authorized redirect URIs:** `https://your-app-name.vercel.app/api/auth/callback/google`

## 📊 Free Tier Limits

| Service | Free Tier Limits |
|---------|------------------|
| **Vercel** | 100GB bandwidth/month, 100GB-hrs compute |
| **Supabase** | 500MB database, 5GB bandwidth, 50MB file storage |
| **Upstash Redis** | 10k commands/day, 256MB storage |
| **Resend** | 3k emails/month, 100 emails/day |

## 🚀 Quick Deploy Commands

```bash
# 1. Install Vercel CLI
npm i -g vercel

# 2. Login to Vercel
vercel login

# 3. Deploy
vercel --prod

# 4. Add environment variables (optional, can do via dashboard)
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add RESEND_API_KEY
# ... add all other env vars
```

## ✅ Post-Deployment Checklist

1. **Test Authentication:** Register/login works
2. **Test Database:** Profile creation works
3. **Test Email:** Welcome emails are sent
4. **Test WebSocket:** Real-time features work
5. **Test Redis:** Caching is functional

## 🔧 Troubleshooting

### Common Issues:

1. **Build Errors:**
   ```bash
   # Run locally first
   npm run build
   # Fix any TypeScript errors
   ```

2. **Environment Variables:**
   - Make sure all required env vars are set in Vercel
   - Check Vercel deployment logs for missing variables

3. **Database Connection:**
   - Verify Supabase URL and keys
   - Check if database migration ran successfully

4. **Email Issues:**
   - Verify Resend API key
   - Use `noreply@resend.dev` for free tier

## 📈 Scaling (When You Outgrow Free Tier)

1. **Vercel Pro:** $20/month - More bandwidth and compute
2. **Supabase Pro:** $25/month - Larger database and features
3. **Upstash Pro:** $10/month - More Redis capacity
4. **Custom Domain:** Add your own domain in Vercel settings

## 🎉 You're Live!

Your poker platform is now live and accessible worldwide at your Vercel URL! Share the link and start playing poker! 🃏

**Next Steps:**
1. Test all features thoroughly
2. Invite friends to test
3. Monitor usage in service dashboards
4. Consider upgrading when you hit limits