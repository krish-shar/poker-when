"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabase/client";
import { 
  Users, 
  Play, 
  Trophy, 
  Plus, 
  Search, 
  DollarSign,
  Clock,
  Eye,
  Settings,
  RefreshCw
} from "lucide-react";

interface GameRoom {
  id: string;
  home_game_id: string;
  session_type: string;
  game_config: {
    game_variant: string;
    betting_structure: string;
    small_blind: number;
    big_blind: number;
  };
  status: "waiting" | "active" | "completed";
  started_at: string;
  total_pot: number;
  hand_count: number;
  players?: { count: number }[];
  max_players: number;
}

interface Tournament {
  id: string;
  name: string;
  tournament_type: string;
  buy_in: number;
  max_players: number;
  current_players: number;
  status: "registration" | "active" | "completed";
  start_time: string;
  prize_pool: number;
}

interface User {
  id: string;
  username: string;
  email: string;
  balance: number;
  created_at: string;
}

export default function PokerLobby() {
  const [activeTab, setActiveTab] = useState<"cash" | "tournaments" | "home">("cash");
  const [searchTerm, setSearchTerm] = useState("");
  const [user, setUser] = useState<User | null>(null);
  const [cashGames, setCashGames] = useState<GameRoom[]>([]);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Real authentication check
  useEffect(() => {
    checkAuth();
  }, []);

  // Real data fetching
  useEffect(() => {
    if (user) {
      fetchCashGames();
      fetchTournaments();
    }
  }, [user]);

  const checkAuth = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        // Get user profile data
        const { data: profile, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (error) {
          console.error('Error fetching user profile:', error);
          // Create user profile if doesn't exist
          const { data: newProfile, error: createError } = await supabase
            .from('users')
            .insert({
              id: session.user.id,
              email: session.user.email || '',
              username: session.user.email?.split('@')[0] || 'Player',
              metadata: {}
            })
            .select()
            .single();

          if (createError) {
            console.error('Error creating user profile:', createError);
            setError('Failed to create user profile');
          } else {
            setUser({
              ...newProfile,
              balance: 1000 // Default starting balance
            });
          }
        } else {
          setUser({
            ...profile,
            balance: profile.metadata?.balance || 1000
          });
        }
      }
    } catch (error) {
      console.error('Auth check error:', error);
      setError('Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const fetchCashGames = async () => {
    try {
      const { data, error } = await supabase
        .from('poker_sessions')
        .select(`
          *,
          home_games (name),
          session_players (count)
        `)
        .eq('session_type', 'cash_game')
        .in('status', ['waiting', 'active']);

      if (error) {
        console.error('Error fetching cash games:', error);
        return;
      }

      const formattedGames: GameRoom[] = data?.map(session => ({
        id: session.id,
        home_game_id: session.home_game_id,
        session_type: session.session_type,
        game_config: session.game_config,
        status: session.status as "waiting" | "active" | "completed",
        started_at: session.started_at,
        total_pot: session.total_pot,
        hand_count: session.hand_count,
        players: session.session_players,
        max_players: session.game_config?.max_players || 9
      })) || [];

      setCashGames(formattedGames);
    } catch (error) {
      console.error('Error fetching cash games:', error);
      setError('Failed to load cash games');
    }
  };

  const fetchTournaments = async () => {
    try {
      // For now, create some sample tournament data since we don't have tournament table yet
      // In production, this would query a tournaments table
      const sampleTournaments: Tournament[] = [
        {
          id: "t1",
          name: "Friday Night Freeroll",
          tournament_type: "Sit & Go",
          buy_in: 0,
          max_players: 100,
          current_players: 45,
          status: "registration",
          start_time: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), // 2 hours from now
          prize_pool: 500
        },
        {
          id: "t2", 
          name: "Sunday Major",
          tournament_type: "Multi-Table",
          buy_in: 50,
          max_players: 500,
          current_players: 128,
          status: "active",
          start_time: new Date().toISOString(),
          prize_pool: 12500
        }
      ];
      
      setTournaments(sampleTournaments);
    } catch (error) {
      console.error('Error fetching tournaments:', error);
      setError('Failed to load tournaments');
    }
  };

  const signInWithGoogle = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/`
        }
      });
      
      if (error) {
        console.error('Google sign in error:', error);
        setError('Failed to sign in with Google');
      }
    } catch (error) {
      console.error('Google sign in error:', error);
      setError('Failed to sign in with Google');
    }
  };

  const signInWithGitHub = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'github',
        options: {
          redirectTo: `${window.location.origin}/`
        }
      });
      
      if (error) {
        console.error('GitHub sign in error:', error);
        setError('Failed to sign in with GitHub');
      }
    } catch (error) {
      console.error('GitHub sign in error:', error);
      setError('Failed to sign in with GitHub');
    }
  };

  const createGame = async () => {
    if (!user) return;
    
    try {
      const response = await fetch('/api/games', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          gameName: 'Quick Game',
          gameType: 'texas_holdem',
          bettingStructure: 'no_limit',
          smallBlind: 1,
          bigBlind: 2,
          maxPlayers: 9,
          userId: user.id
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to create game');
        return;
      }

      // Successfully created, redirect to game page
      window.location.href = `/game/${data.session.id}`;
    } catch (error) {
      console.error('Error creating game:', error);
      setError('Failed to create game');
    }
  };

  const joinGame = async (gameId: string) => {
    if (!user) return;
    
    try {
      const response = await fetch(`/api/games/${gameId}/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
          buyInAmount: 100 // Default buy-in amount
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to join game');
        return;
      }

      // Successfully joined, redirect to game page
      window.location.href = `/game/${gameId}`;
    } catch (error) {
      console.error('Error joining game:', error);
      setError('Failed to join game');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "waiting": return "bg-yellow-500";
      case "active": 
      case "playing": return "bg-green-500";
      case "registration":
      case "registering": return "bg-blue-500";
      default: return "bg-gray-500";
    }
  };

  const filteredCashGames = cashGames.filter(game => 
    game.game_config?.game_variant?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    game.session_type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredTournaments = tournaments.filter(tournament =>
    tournament.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tournament.tournament_type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <Card className="w-96 bg-white/10 backdrop-blur-sm border-white/20">
          <CardContent className="p-8 text-center">
            <RefreshCw className="w-8 h-8 animate-spin text-white mx-auto mb-4" />
            <p className="text-white">Loading PokerHome...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <Card className="w-96 bg-white/10 backdrop-blur-sm border-white/20">
          <CardHeader>
            <CardTitle className="text-white text-center">Welcome to PokerHome</CardTitle>
            <p className="text-gray-300 text-center text-sm">Sign in to start playing poker</p>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <div className="bg-red-500/20 border border-red-500/50 rounded p-3 text-red-200 text-sm">
                {error}
              </div>
            )}
            <Button 
              onClick={signInWithGoogle}
              className="w-full bg-purple-600 hover:bg-purple-700"
            >
              Login with Google
            </Button>
            <Button 
              onClick={signInWithGitHub}
              variant="outline" 
              className="w-full border-white/20 text-white hover:bg-white/10"
            >
              Login with GitHub
            </Button>
            <div className="text-center text-gray-400 text-xs">
              <p>Create an account to access real-time poker games,<br />tournament play, and home game management.</p>
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
          <Button onClick={createGame} className="bg-green-600 hover:bg-green-700">
            <Plus className="w-4 h-4 mr-2" />
            Create Game
          </Button>
        </div>

        {/* Cash Games Tab */}
        {activeTab === "cash" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-white mb-4">Cash Games</h2>
              <Button
                onClick={fetchCashGames}
                variant="outline"
                size="sm"
                className="border-white/20 text-white hover:bg-white/10"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
            </div>
            
            {error && (
              <div className="bg-red-500/20 border border-red-500/50 rounded p-3 text-red-200 text-sm">
                {error}
              </div>
            )}

            {filteredCashGames.length === 0 ? (
              <Card className="bg-white/10 backdrop-blur-sm border-white/20">
                <CardContent className="p-8 text-center">
                  <p className="text-gray-300 mb-4">No active cash games found</p>
                  <Button onClick={createGame} className="bg-green-600 hover:bg-green-700">
                    <Plus className="w-4 h-4 mr-2" />
                    Create First Game
                  </Button>
                </CardContent>
              </Card>
            ) : (
              filteredCashGames.map((game) => (
                <Card key={game.id} className="bg-white/10 backdrop-blur-sm border-white/20 hover:bg-white/15 transition-colors">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div>
                          <h3 className="text-lg font-semibold text-white">
                            {game.game_config?.game_variant || 'Texas Hold\'em'} Game
                          </h3>
                          <p className="text-gray-300">
                            {game.game_config?.betting_structure || 'No Limit'} • {game.session_type}
                          </p>
                          <p className="text-sm text-gray-400">
                            Blinds: ${game.game_config?.small_blind || 1}/${game.game_config?.big_blind || 2}
                          </p>
                          <p className="text-xs text-gray-500">
                            Started: {new Date(game.started_at).toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="text-center">
                          <div className="text-white font-semibold">
                            {game.players?.length || 0}/{game.max_players}
                          </div>
                          <div className="text-gray-400 text-sm">Players</div>
                        </div>
                        <div className="text-center">
                          <div className="text-white font-semibold">
                            ${(game.game_config?.big_blind || 2) * 50}
                          </div>
                          <div className="text-gray-400 text-sm">Min Buy-in</div>
                        </div>
                        <div className="text-center">
                          <div className="text-white font-semibold">${game.total_pot}</div>
                          <div className="text-gray-400 text-sm">Pot</div>
                        </div>
                        <div className="text-center">
                          <div className="text-white font-semibold">{game.hand_count}</div>
                          <div className="text-gray-400 text-sm">Hands</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={`${getStatusColor(game.status)} text-white`}>
                            {game.status}
                          </Badge>
                        </div>
                        <div className="flex gap-2">
                          {game.status === "active" && (
                            <Button variant="outline" size="sm" className="border-white/20 text-white hover:bg-white/10">
                              <Eye className="w-4 h-4 mr-2" />
                              Spectate
                            </Button>
                          )}
                          <Button 
                            onClick={() => joinGame(game.id)}
                            className="bg-blue-600 hover:bg-blue-700"
                            disabled={(game.players?.length || 0) >= game.max_players}
                          >
                            {game.status === "waiting" ? "Join" : "Wait List"}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}

        {/* Tournaments Tab */}
        {activeTab === "tournaments" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-white mb-4">Tournaments</h2>
              <Button
                onClick={fetchTournaments}
                variant="outline"
                size="sm"
                className="border-white/20 text-white hover:bg-white/10"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
            </div>

            {filteredTournaments.length === 0 ? (
              <Card className="bg-white/10 backdrop-blur-sm border-white/20">
                <CardContent className="p-8 text-center">
                  <p className="text-gray-300 mb-4">No tournaments available</p>
                  <Button className="bg-yellow-600 hover:bg-yellow-700">
                    <Plus className="w-4 h-4 mr-2" />
                    Create Tournament
                  </Button>
                </CardContent>
              </Card>
            ) : (
              filteredTournaments.map((tournament) => (
                <Card key={tournament.id} className="bg-white/10 backdrop-blur-sm border-white/20 hover:bg-white/15 transition-colors">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div>
                          <h3 className="text-lg font-semibold text-white">{tournament.name}</h3>
                          <p className="text-gray-300">{tournament.tournament_type}</p>
                          <p className="text-sm text-gray-400">
                            <Clock className="w-4 h-4 inline mr-1" />
                            {tournament.status === "registration" 
                              ? `Starts: ${new Date(tournament.start_time).toLocaleTimeString()}`
                              : tournament.status === "active" 
                              ? "In Progress" 
                              : "Completed"
                            }
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="text-center">
                          <div className="text-white font-semibold">
                            {tournament.current_players}/{tournament.max_players}
                          </div>
                          <div className="text-gray-400 text-sm">Registered</div>
                        </div>
                        <div className="text-center">
                          <div className="text-white font-semibold">
                            {tournament.buy_in === 0 ? "FREE" : `$${tournament.buy_in}`}
                          </div>
                          <div className="text-gray-400 text-sm">Buy-in</div>
                        </div>
                        <div className="text-center">
                          <div className="text-white font-semibold">${tournament.prize_pool}</div>
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
                            disabled={tournament.status === "completed" || tournament.current_players >= tournament.max_players}
                          >
                            {tournament.status === "registration" ? "Register" : "View"}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
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
