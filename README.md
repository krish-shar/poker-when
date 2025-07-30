# PokerHome - Complete Poker Platform

A comprehensive poker platform built with Next.js 14, featuring online poker gameplay and home game management with financial tracking.

## 🎯 Project Overview

PokerHome is a full-stack poker platform that provides:

- **Online Poker Gameplay**: Real-time Texas Hold'em games with WebSocket communication
- **Home Game Management**: Create and manage private poker games with friends
- **Financial Tracking**: Comprehensive buy-in/cash-out tracking and debt settlement
- **Advanced Features**: Run It Twice, 7-2 Offsuit Bonus, spectator mode, and more
- **Social Features**: Friends system, clubs, and in-game chat
- **Analytics**: Detailed statistics and performance tracking

## 🚀 Tech Stack

### Frontend
- **Next.js 14** with App Router
- **TypeScript** for type safety
- **Tailwind CSS** for styling
- **shadcn/ui** component library
- **Zustand** for state management

### Backend
- **Next.js API Routes** with Edge Runtime
- **Better-auth** for enhanced authentication
- **Custom WebSocket Server** for real-time communication

### Database & Storage
- **Supabase PostgreSQL** with Row Level Security
- **Upstash Redis** for caching and game state
- **Supabase Storage** for file storage

### Real-time & Caching
- **Custom WebSocket implementation**
- **Redis caching layer**
- **Real-time subscriptions**

## 📋 Prerequisites

- Node.js 20+ (LTS recommended)
- npm or yarn package manager
- Git for version control

## 🛠️ Installation & Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Configuration

Copy the example environment file and configure your settings:

```bash
cp .env.local.example .env.local
```

Edit `.env.local` with your configuration:

```env
# Database
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

# Authentication
BETTER_AUTH_SECRET=your-better-auth-secret
BETTER_AUTH_URL=http://localhost:3000

# OAuth Providers (Optional)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret

# Redis Cache
UPSTASH_REDIS_REST_URL=your-upstash-redis-url
UPSTASH_REDIS_REST_TOKEN=your-upstash-redis-token

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development
```

### 3. Database Setup

#### Supabase Setup
1. Create a new Supabase project at [supabase.com](https://supabase.com)
2. Get your project URL and API keys from the project settings
3. Run the database migration:

```bash
# Apply the initial schema using Supabase CLI or SQL client
psql -h your-db-host -U postgres -d your-db-name -f supabase/migrations/001_initial_schema.sql
```

### 4. Redis Setup (Upstash)

1. Create a free account at [upstash.com](https://upstash.com)
2. Create a new Redis database
3. Get the REST URL and token from the database details
4. Add them to your `.env.local` file

## 🏃‍♂️ Running the Application

### Development Mode

```bash
npm run dev
```

The application will be available at `http://localhost:3000`

### Production Build

```bash
npm run build
npm start
```

## 📁 Project Structure

```
poker-app/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (auth)/            # Authentication routes
│   │   ├── (dashboard)/       # Main application
│   │   ├── (game)/           # Poker game interface
│   │   └── api/              # API routes
│   ├── components/           # Reusable UI components
│   │   ├── ui/              # shadcn/ui components
│   │   ├── game/           # Game-specific components
│   │   └── forms/          # Form components
│   ├── lib/                 # Utility libraries
│   │   ├── auth/           # Authentication logic
│   │   ├── cache/          # Redis caching
│   │   ├── game/           # Game engine logic
│   │   ├── supabase/       # Database utilities
│   │   └── websocket/      # WebSocket handling
│   ├── types/              # TypeScript definitions
│   └── hooks/              # Custom React hooks
├── supabase/               # Database migrations
└── public/                 # Static assets
```

## 🎮 Implementation Status

### Phase 1: Foundation (✅ Complete)
- [x] Next.js 14 project setup with TypeScript
- [x] Supabase database schema and authentication
- [x] Better-auth authentication system
- [x] shadcn/ui components and Tailwind CSS
- [x] User profile management with avatar icons

### Phase 2: Online Poker Core (🚧 In Progress)
- [x] Custom WebSocket server implementation
- [x] Poker game engine with Texas Hold'em logic
- [ ] Real-time game table UI
- [ ] Game lobby for creating/joining tables
- [ ] Basic tournament functionality

### Phase 3: Advanced Poker Features (📋 Planned)
- [ ] Run It Twice implementation
- [ ] 7-2 Offsuit Bonus system
- [ ] Straddle betting option
- [ ] In-game chat system
- [ ] Spectator mode
- [ ] Hand history and replay

### Phase 4: Home Game Management (📋 Planned)
- [ ] Ledger creation with invite links
- [ ] Session-based financial tracking
- [ ] Player-to-player loan management
- [ ] Debt settlement optimization
- [ ] Analytics dashboard
- [ ] Financial reporting

### Phase 5: Social & Advanced Features (📋 Planned)
- [ ] Friends system with online status
- [ ] Clubs and community groups
- [ ] Advanced statistics (VPIP, PFR, etc.)
- [ ] Sound effects and templates
- [ ] Mobile optimization
- [ ] Performance optimization

## 🎯 Key Components

### WebSocket System
Real-time communication for poker games:
- Connection management with authentication
- Room-based messaging
- Game state synchronization
- Automatic reconnection

### Game Engine
Complete Texas Hold'em implementation:
- Card dealing and shuffling
- Hand evaluation and ranking
- Betting round management
- Pot distribution and side pots

### Authentication
Secure user management:
- Email/password authentication
- Social login integration
- Session management
- Profile customization

### Database Schema
Comprehensive data model:
- User profiles and preferences
- Game sessions and hands
- Financial transactions
- Statistics and analytics

## 🔧 API Endpoints

### Authentication
- `POST /api/auth/signin` - User sign in
- `POST /api/auth/signup` - User registration
- `POST /api/auth/signout` - User sign out
- `GET /api/auth/session` - Get current session

### User Management
- `GET /api/users/[userId]/profile` - Get user profile
- `PUT /api/users/[userId]/profile` - Update user profile

### WebSocket
- `WS /api/websocket` - WebSocket connection endpoint

## 🚀 Deployment

### Vercel (Recommended)

1. Connect your GitHub repository to Vercel
2. Configure environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

### Environment Variables for Production

Ensure all environment variables are configured in your deployment platform:

- Database credentials (Supabase)
- Authentication secrets (Better-auth)
- OAuth credentials (Google, GitHub)
- Redis configuration (Upstash)
- App URLs and secrets

## 📖 Documentation

- [Technical Architecture](../technical-architecture.md)
- [Database Schema](../database-schema.md)
- [API Specifications](../api-specifications.md)
- [WebSocket Architecture](../websocket-architecture.md)
- [Security Architecture](../security-architecture.md)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

---

Built with Next.js, TypeScript, and modern web technologies for a complete poker platform experience.
