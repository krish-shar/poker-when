"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Users, 
  Play, 
  Trophy, 
  Plus, 
  Search, 
  DollarSign,
  Clock,
  Eye,
  Settings
} from "lucide-react";

interface GameRoom {
  id: string;
  name: string;
  gameType: string;
  stakes: string;
  players: number;
  maxPlayers: number;
  status: "waiting" | "playing" | "finished";
  buyIn: number;
  pot: number;
  blinds: string;
}

interface Tournament {
  id: string;
  name: string;
  type: string;
  buyIn: number;
  players: number;
  maxPlayers: number;
  status: "registering" | "playing" | "finished";
  startTime: string;
  prize: number;
}

export default function PokerLobby() {
  const [activeTab, setActiveTab] = useState<"cash" | "tournaments" | "home">("cash");
  const [searchTerm, setSearchTerm] = useState("");
  const [user, setUser] = useState<{ username: string; balance: number } | null>(null);

  // Mock data - in real app this would come from API
  const [cashGames] = useState<GameRoom[]>([
    {
      id: "1",
      name: "Micro Stakes Fun",
      gameType: "Texas Hold'em",
      stakes: "No Limit",
      players: 4,
      maxPlayers: 6,
      status: "playing",
      buyIn: 10,
      pot: 45,
      blinds: "$0.05/$0.10"
    },
    {
      id: "2", 
      name: "High Roller Room",
      gameType: "Texas Hold'em",
      stakes: "No Limit",
      players: 2,
      maxPlayers: 9,
      status: "waiting",
      buyIn: 500,
      pot: 0,
      blinds: "$5/$10"
    },
    {
      id: "3",
      name: "Tournament Practice",
      gameType: "Texas Hold'em",
      stakes: "No Limit", 
      players: 6,
      maxPlayers: 8,
      status: "playing",
      buyIn: 25,
      pot: 180,
      blinds: "$1/$2"
    }
  ]);

  const [tournaments] = useState<Tournament[]>([
    {
      id: "t1",
      name: "Friday Night Freeroll",
      type: "Sit & Go",
      buyIn: 0,
      players: 45,
      maxPlayers: 100,
      status: "registering",
      startTime: "8:00 PM",
      prize: 500
    },
    {
      id: "t2",
      name: "Sunday Major",
      type: "Multi-Table",
      buyIn: 50,
      players: 128,
      maxPlayers: 500,
      status: "playing",
      startTime: "2:00 PM",
      prize: 12500
    }
  ]);

  // Simulate user authentication
  useEffect(() => {
    // In real app, this would check auth status
    setUser({ username: "Player123", balance: 1250 });
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "waiting": return "bg-yellow-500";
      case "playing": return "bg-green-500";
      case "registering": return "bg-blue-500";
      default: return "bg-gray-500";
    }
  };

  const filteredCashGames = cashGames.filter(game => 
    game.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    game.gameType.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredTournaments = tournaments.filter(tournament =>
    tournament.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tournament.type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <Card className="w-96 bg-white/10 backdrop-blur-sm border-white/20">
          <CardHeader>
            <CardTitle className="text-white text-center">Welcome to PokerHome</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button className="w-full bg-purple-600 hover:bg-purple-700">
              Login with Google
            </Button>
            <Button variant="outline" className="w-full border-white/20 text-white hover:bg-white/10">
              Login with GitHub
            </Button>
            <div className="text-center text-gray-400 text-sm">
              <Link href="/profile" className="hover:text-white">
                Continue as Guest
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header */}
      <header className="bg-black/20 backdrop-blur-sm border-b border-white/10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="text-2xl font-bold text-white">🃏 PokerHome</h1>
              <Badge variant="secondary" className="bg-green-600 text-white">
                LIVE
              </Badge>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-white">
                <span className="text-gray-400">Balance: </span>
                <span className="font-semibold">${user.balance}</span>
              </div>
              <div className="text-white">
                Welcome, <span className="font-semibold">{user.username}</span>
              </div>
              <Link href="/profile">
                <Button variant="outline" size="sm" className="border-white/20 text-white hover:bg-white/10">
                  <Settings className="w-4 h-4 mr-2" />
                  Profile
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Navigation Tabs */}
        <div className="flex gap-2 mb-8">
          <Button
            variant={activeTab === "cash" ? "default" : "outline"}
            onClick={() => setActiveTab("cash")}
            className={activeTab === "cash" ? "bg-purple-600" : "border-white/20 text-white hover:bg-white/10"}
          >
            <Play className="w-4 h-4 mr-2" />
            Cash Games
          </Button>
          <Button
            variant={activeTab === "tournaments" ? "default" : "outline"}
            onClick={() => setActiveTab("tournaments")}
            className={activeTab === "tournaments" ? "bg-purple-600" : "border-white/20 text-white hover:bg-white/10"}
          >
            <Trophy className="w-4 h-4 mr-2" />
            Tournaments
          </Button>
          <Button
            variant={activeTab === "home" ? "default" : "outline"}
            onClick={() => setActiveTab("home")}
            className={activeTab === "home" ? "bg-purple-600" : "border-white/20 text-white hover:bg-white/10"}
          >
            <Users className="w-4 h-4 mr-2" />
            Home Games
          </Button>
        </div>

        {/* Search and Create */}
        <div className="flex justify-between items-center mb-6">
          <div className="relative w-96">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search games..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-white/10 border-white/20 text-white placeholder-gray-400"
            />
          </div>
          <Button className="bg-green-600 hover:bg-green-700">
            <Plus className="w-4 h-4 mr-2" />
            Create Game
          </Button>
        </div>

        {/* Cash Games Tab */}
        {activeTab === "cash" && (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-white mb-4">Cash Games</h2>
            {filteredCashGames.map((game) => (
              <Card key={game.id} className="bg-white/10 backdrop-blur-sm border-white/20 hover:bg-white/15 transition-colors">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div>
                        <h3 className="text-lg font-semibold text-white">{game.name}</h3>
                        <p className="text-gray-300">{game.gameType} • {game.stakes}</p>
                        <p className="text-sm text-gray-400">Blinds: {game.blinds}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-center">
                        <div className="text-white font-semibold">{game.players}/{game.maxPlayers}</div>
                        <div className="text-gray-400 text-sm">Players</div>
                      </div>
                      <div className="text-center">
                        <div className="text-white font-semibold">${game.buyIn}</div>
                        <div className="text-gray-400 text-sm">Buy-in</div>
                      </div>
                      <div className="text-center">
                        <div className="text-white font-semibold">${game.pot}</div>
                        <div className="text-gray-400 text-sm">Pot</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={`${getStatusColor(game.status)} text-white`}>
                          {game.status}
                        </Badge>
                      </div>
                      <div className="flex gap-2">
                        {game.status === "playing" && (
                          <Button variant="outline" size="sm" className="border-white/20 text-white hover:bg-white/10">
                            <Eye className="w-4 h-4 mr-2" />
                            Spectate
                          </Button>
                        )}
                        <Button 
                          className="bg-blue-600 hover:bg-blue-700"
                          disabled={game.players >= game.maxPlayers}
                        >
                          {game.status === "waiting" ? "Join" : "Wait List"}
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Tournaments Tab */}
        {activeTab === "tournaments" && (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-white mb-4">Tournaments</h2>
            {filteredTournaments.map((tournament) => (
              <Card key={tournament.id} className="bg-white/10 backdrop-blur-sm border-white/20 hover:bg-white/15 transition-colors">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div>
                        <h3 className="text-lg font-semibold text-white">{tournament.name}</h3>
                        <p className="text-gray-300">{tournament.type}</p>
                        <p className="text-sm text-gray-400">
                          <Clock className="w-4 h-4 inline mr-1" />
                          {tournament.startTime}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-center">
                        <div className="text-white font-semibold">{tournament.players}/{tournament.maxPlayers}</div>
                        <div className="text-gray-400 text-sm">Registered</div>
                      </div>
                      <div className="text-center">
                        <div className="text-white font-semibold">
                          {tournament.buyIn === 0 ? "FREE" : `$${tournament.buyIn}`}
                        </div>
                        <div className="text-gray-400 text-sm">Buy-in</div>
                      </div>
                      <div className="text-center">
                        <div className="text-white font-semibold">${tournament.prize}</div>
                        <div className="text-gray-400 text-sm">Prize Pool</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={`${getStatusColor(tournament.status)} text-white`}>
                          {tournament.status}
                        </Badge>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          className="bg-yellow-600 hover:bg-yellow-700"
                          disabled={tournament.status === "playing"}
                        >
                          {tournament.status === "registering" ? "Register" : "View"}
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Home Games Tab */}
        {activeTab === "home" && (
          <div className="text-center py-16">
            <h2 className="text-2xl font-bold text-white mb-4">Home Games</h2>
            <p className="text-gray-300 mb-8">Manage your private poker games and track sessions</p>
            <div className="space-y-4">
              <Link href="/home-games">
                <Button className="bg-purple-600 hover:bg-purple-700">
                  <Users className="w-4 h-4 mr-2" />
                  View My Home Games
                </Button>
              </Link>
              <br />
              <Button variant="outline" className="border-white/20 text-white hover:bg-white/10">
                <Plus className="w-4 h-4 mr-2" />
                Create New Home Game
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
