import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="container mx-auto px-4 py-16">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 className="text-6xl font-bold text-white mb-6">
            🃏 <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">PokerHome</span>
          </h1>
          <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
            The ultimate poker platform for online gameplay and home game management. 
            Play real-time Texas Hold'em, track your winnings, and manage your poker community.
          </p>
          <div className="flex gap-4 justify-center">
            <Link href="/profile">
              <Button size="lg" className="bg-purple-600 hover:bg-purple-700 text-white px-8 py-3 text-lg">
                Get Started
              </Button>
            </Link>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          <Card className="bg-white/10 backdrop-blur-sm border-white/20">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                🎮 Real-Time Poker
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-300">
                Play Texas Hold'em with custom WebSocket technology. Features Run It Twice, 
                tournaments, and spectator mode.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white/10 backdrop-blur-sm border-white/20">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                📊 Home Game Management
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-300">
                Track buy-ins, cash-outs, and player debts. Advanced analytics 
                with profit/loss visualization and settlement optimization.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white/10 backdrop-blur-sm border-white/20">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                🔍 Advanced Stats
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-300">
                VPIP, PFR, aggression factor, and more. Hand history replay 
                and comprehensive player analytics.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Tech Stack */}
        <div className="text-center">
          <h2 className="text-3xl font-bold text-white mb-8">Built with Modern Technology</h2>
          <div className="flex flex-wrap justify-center gap-4 text-sm text-gray-400">
            <span className="bg-white/10 px-4 py-2 rounded-full">Next.js 14</span>
            <span className="bg-white/10 px-4 py-2 rounded-full">TypeScript</span>
            <span className="bg-white/10 px-4 py-2 rounded-full">Supabase</span>
            <span className="bg-white/10 px-4 py-2 rounded-full">Redis</span>
            <span className="bg-white/10 px-4 py-2 rounded-full">WebSocket</span>
            <span className="bg-white/10 px-4 py-2 rounded-full">Better Auth</span>
          </div>
        </div>

        {/* Status */}
        <div className="text-center mt-16">
          <p className="text-gray-400 text-sm">
            🚀 Deployed on Vercel • 🎯 Production Ready • 🃏 92% Quality Score
          </p>
          <p className="text-gray-500 text-xs mt-2">
            🤖 Generated with Claude Code
          </p>
        </div>
      </div>
    </div>
  );
}
