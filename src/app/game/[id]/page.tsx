"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabase/client";
import { 
  Users, 
  MessageCircle, 
  Chips, 
  Timer,
  Send,
  ArrowLeft,
  Volume2,
  VolumeX,
  Settings
} from "lucide-react";

interface Player {
  id: string;
  username: string;
  chips: number;
  seatNumber: number;
  holeCards?: Card[];
  currentBet: number;
  folded: boolean;
  isDealer: boolean;
  isTurn: boolean;
  status: 'active' | 'sitting_out' | 'disconnected';
}

interface Card {
  suit: 'hearts' | 'diamonds' | 'clubs' | 'spades';
  rank: string;
}

interface GameState {
  id: string;
  status: 'waiting' | 'playing' | 'showdown';
  pot: number;
  currentBet: number;
  communityCards: Card[];
  players: Player[];
  currentPlayerIndex: number;
  gameStage: 'preflop' | 'flop' | 'turn' | 'river';
  smallBlind: number;
  bigBlind: number;
}

interface ChatMessage {
  id: string;
  user: string;
  message: string;
  timestamp: string;
  type: 'game' | 'chat';
}

export default function PokerGamePage() {
  const params = useParams();
  const router = useRouter();
  const gameId = params?.id as string;

  const [user, setUser] = useState<any>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [myPlayer, setMyPlayer] = useState<Player | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [showChat, setShowChat] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [betAmount, setBetAmount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (user && gameId) {
      initializeGame();
      connectWebSocket();
    }
    
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [user, gameId]);

  useEffect(() => {
    scrollToBottom();
  }, [chatMessages]);

  const checkAuth = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.user) {
        router.push('/');
        return;
      }

      const { data: profile, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (error) {
        console.error('Error fetching user profile:', error);
        setError('Failed to load user profile');
        return;
      }

      setUser({
        ...profile,
        balance: profile.metadata?.balance || 1000
      });
    } catch (error) {
      console.error('Auth check error:', error);
      setError('Authentication failed');
    }
  };

  const initializeGame = async () => {
    try {
      // Fetch game session details
      const { data: session, error } = await supabase
        .from('poker_sessions')
        .select(`
          *,
          session_players (
            id,
            user_id,
            seat_number,
            current_chips,
            buy_in_amount,
            status,
            users (username)
          )
        `)
        .eq('id', gameId)
        .single();

      if (error || !session) {
        setError('Game session not found');
        setLoading(false);
        return;
      }

      // Check if user is a player
      const myPlayerData = session.session_players?.find(
        (p: any) => p.user_id === user.id
      );

      if (!myPlayerData) {
        setError('You are not a player in this game');
        setLoading(false);
        return;
      }

      // Initialize game state
      const players: Player[] = session.session_players?.map((p: any) => ({
        id: p.user_id,
        username: p.users?.username || 'Anonymous',
        chips: p.current_chips,
        seatNumber: p.seat_number,
        currentBet: 0,
        folded: false,
        isDealer: p.seat_number === 1, // Temporary logic
        isTurn: false,
        status: p.status
      })) || [];

      setGameState({
        id: gameId,
        status: session.status,
        pot: session.total_pot || 0,
        currentBet: 0,
        communityCards: [],
        players,
        currentPlayerIndex: 0,
        gameStage: 'preflop',
        smallBlind: session.game_config?.small_blind || 1,
        bigBlind: session.game_config?.big_blind || 2
      });

      setMyPlayer(players.find(p => p.id === user.id) || null);
      setLoading(false);

    } catch (error) {
      console.error('Error initializing game:', error);
      setError('Failed to load game');
      setLoading(false);
    }
  };

  const connectWebSocket = () => {
    try {
      // Connect to WebSocket server
      const wsUrl = `ws://localhost:8080?sessionId=${gameId}&userId=${user.id}`;
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log('WebSocket connected');
        setConnected(true);
        
        // Join the game session
        ws.send(JSON.stringify({
          type: 'join_session',
          sessionId: gameId,
          userId: user.id
        }));
      };

      ws.onmessage = (event) => {
        const message = JSON.parse(event.data);
        handleWebSocketMessage(message);
      };

      ws.onclose = () => {
        console.log('WebSocket disconnected');
        setConnected(false);
        
        // Try to reconnect after 3 seconds
        setTimeout(() => {
          if (user && gameId) {
            connectWebSocket();
          }
        }, 3000);
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setConnected(false);
      };

      wsRef.current = ws;
    } catch (error) {
      console.error('WebSocket connection error:', error);
      setError('Failed to connect to game server');
    }
  };

  const handleWebSocketMessage = (message: any) => {
    console.log('Received WebSocket message:', message);

    switch (message.type) {
      case 'session_joined':
        addChatMessage('System', 'Connected to game', 'game');
        break;
      
      case 'player_joined':
        addChatMessage('System', `${message.player.username || 'Player'} joined the game`, 'game');
        break;
      
      case 'new_hand_started':
        updateGameState({
          pot: message.pot,
          currentBet: message.currentBet,
          gameStage: 'preflop',
          communityCards: []
        });
        addChatMessage('System', 'New hand started', 'game');
        break;
      
      case 'hole_cards':
        if (myPlayer) {
          setMyPlayer({
            ...myPlayer,
            holeCards: message.cards
          });
        }
        break;
      
      case 'player_action':
        updateGameState({
          pot: message.gameState.pot,
          currentBet: message.gameState.currentBet
        });
        addChatMessage('System', `Player ${message.action}ed`, 'game');
        break;
      
      case 'game_state_update':
        updateGameState({
          gameStage: message.gameState,
          communityCards: message.communityCards,
          pot: message.pot
        });
        break;
      
      case 'chat_message':
        addChatMessage(message.user, message.message, 'chat');
        break;
      
      case 'error':
        setError(message.message);
        break;
    }
  };

  const updateGameState = (updates: Partial<GameState>) => {
    setGameState(prev => prev ? { ...prev, ...updates } : null);
  };

  const addChatMessage = (user: string, message: string, type: 'game' | 'chat') => {
    setChatMessages(prev => [...prev, {
      id: Date.now().toString(),
      user,
      message,
      timestamp: new Date().toISOString(),
      type
    }]);
  };

  const sendChatMessage = () => {
    if (!chatInput.trim() || !wsRef.current) return;

    wsRef.current.send(JSON.stringify({
      type: 'chat_message',
      sessionId: gameId,
      userId: user.id,
      message: chatInput.trim()
    }));

    setChatInput("");
  };

  const makeAction = (action: string, amount?: number) => {
    if (!wsRef.current || !myPlayer) return;

    wsRef.current.send(JSON.stringify({
      type: 'player_action',
      sessionId: gameId,
      userId: user.id,
      action,
      amount
    }));
  };

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const renderCard = (card: Card, isHidden = false) => {
    if (isHidden) {
      return (
        <div className="w-12 h-16 bg-blue-900 border border-blue-700 rounded-lg flex items-center justify-center">
          <div className="w-8 h-10 bg-blue-800 rounded"></div>
        </div>
      );
    }

    const suitSymbol = {
      hearts: '♥️',
      diamonds: '♦️',
      clubs: '♣️',
      spades: '♠️'
    };

    const isRed = card.suit === 'hearts' || card.suit === 'diamonds';

    return (
      <div className={`w-12 h-16 bg-white border border-gray-300 rounded-lg flex flex-col items-center justify-center text-xs font-bold ${isRed ? 'text-red-600' : 'text-black'}`}>
        <div>{card.rank}</div>
        <div>{suitSymbol[card.suit]}</div>
      </div>
    );
  };

  const renderPlayer = (player: Player, position: string) => {
    const isMyTurn = player.isTurn;
    const isMe = player.id === user?.id;

    return (
      <div className={`absolute ${position} transform -translate-x-1/2 -translate-y-1/2`}>
        <div className={`bg-gray-800 rounded-lg p-3 border-2 ${isMyTurn ? 'border-yellow-400' : isMe ? 'border-blue-400' : 'border-gray-600'} ${player.status === 'disconnected' ? 'opacity-50' : ''}`}>
          <div className="text-white text-sm font-semibold">{player.username}</div>
          <div className="text-gray-300 text-xs">${player.chips}</div>
          {player.isDealer && <Badge className="text-xs bg-yellow-600">D</Badge>}
          {player.currentBet > 0 && (
            <div className="text-green-400 text-xs">Bet: ${player.currentBet}</div>
          )}
          {player.folded && <Badge variant="destructive" className="text-xs">Folded</Badge>}
          {player.holeCards && isMe && (
            <div className="flex gap-1 mt-2">
              {player.holeCards.map((card, i) => renderCard(card))}
            </div>
          )}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-900 to-green-700 flex items-center justify-center">
        <Card className="w-96 bg-white/10 backdrop-blur-sm border-white/20">
          <CardContent className="p-8 text-center">
            <div className="animate-spin w-8 h-8 border-4 border-white border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-white">Loading poker game...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-900 to-red-700 flex items-center justify-center">
        <Card className="w-96 bg-white/10 backdrop-blur-sm border-white/20">
          <CardContent className="p-8 text-center">
            <p className="text-white mb-4">{error}</p>
            <Button onClick={() => router.push('/')} className="bg-blue-600 hover:bg-blue-700">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Lobby
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-900 to-green-700 flex">
      {/* Main Game Area */}
      <div className="flex-1 p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <Button
              onClick={() => router.push('/')}
              variant="outline"
              size="sm"
              className="border-white/20 text-white hover:bg-white/10"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Leave Game
            </Button>
            <div className="text-white">
              <h1 className="text-xl font-bold">Texas Hold'em - ${gameState?.smallBlind}/${gameState?.bigBlind}</h1>
              <div className="flex items-center gap-2 text-sm">
                <Badge variant={connected ? "default" : "destructive"}>
                  {connected ? "Connected" : "Disconnected"}
                </Badge>
                <span>Players: {gameState?.players.length || 0}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={() => setSoundEnabled(!soundEnabled)}
              variant="outline"
              size="sm"
              className="border-white/20 text-white hover:bg-white/10"
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="border-white/20 text-white hover:bg-white/10"
            >
              <Settings className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Poker Table */}
        <div className="relative w-full max-w-4xl mx-auto aspect-[3/2] bg-green-800 rounded-full border-8 border-green-900 shadow-2xl">
          {/* Community Cards */}
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 flex gap-2">
            {gameState?.communityCards.length === 0 ? (
              <div className="text-white text-lg font-semibold">
                {gameState?.status === 'waiting' ? 'Waiting for players...' : 'Cards will appear here'}
              </div>
            ) : (
              gameState.communityCards.map((card, i) => (
                <div key={i}>{renderCard(card)}</div>
              ))
            )}
          </div>

          {/* Pot */}
          <div className="absolute top-1/3 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
            <div className="bg-gray-900 rounded-lg p-2 text-center">
              <div className="text-yellow-400 text-sm font-semibold">POT</div>
              <div className="text-white text-lg font-bold">${gameState?.pot || 0}</div>
            </div>
          </div>

          {/* Players (positioned around the table) */}
          {gameState?.players.map((player, index) => {
            const positions = [
              'bottom-10 left-1/2', // Player 1 (bottom)
              'bottom-1/3 right-10', // Player 2 (bottom right)
              'top-1/3 right-10', // Player 3 (top right)
              'top-10 left-1/2', // Player 4 (top)
              'top-1/3 left-10', // Player 5 (top left)
              'bottom-1/3 left-10', // Player 6 (bottom left)
            ];
            
            return renderPlayer(player, positions[index % positions.length]);
          })}
        </div>

        {/* Action Buttons */}
        {myPlayer && gameState?.status === 'playing' && (
          <div className="mt-6 flex justify-center">
            <div className="bg-gray-800 rounded-lg p-4 flex items-center gap-4">
              <Button
                onClick={() => makeAction('fold')}
                variant="destructive"
                disabled={myPlayer.folded}
              >
                Fold
              </Button>
              <Button
                onClick={() => makeAction('check')}
                variant="outline"
                className="border-white/20 text-white hover:bg-white/10"
                disabled={gameState.currentBet > myPlayer.currentBet}
              >
                {gameState.currentBet > myPlayer.currentBet ? 'Call' : 'Check'}
              </Button>
              <Button
                onClick={() => makeAction('call')}
                className="bg-green-600 hover:bg-green-700"
                disabled={gameState.currentBet <= myPlayer.currentBet}
              >
                Call ${gameState.currentBet - myPlayer.currentBet}
              </Button>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={gameState.currentBet + gameState.bigBlind}
                  max={myPlayer.chips}
                  value={betAmount || gameState.currentBet + gameState.bigBlind}
                  onChange={(e) => setBetAmount(parseInt(e.target.value))}
                  className="w-24 bg-gray-700 border-gray-600 text-white"
                />
                <Button
                  onClick={() => makeAction('raise', betAmount)}
                  className="bg-red-600 hover:bg-red-700"
                >
                  Raise
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Chat Sidebar */}
      {showChat && (
        <div className="w-80 bg-gray-900 border-l border-gray-700 flex flex-col">
          <div className="p-4 border-b border-gray-700">
            <div className="flex items-center justify-between">
              <h3 className="text-white font-semibold flex items-center gap-2">
                <MessageCircle className="w-5 h-5" />
                Chat
              </h3>
              <Button
                onClick={() => setShowChat(false)}
                variant="ghost"
                size="sm"
                className="text-gray-400 hover:text-white"
              >
                ×
              </Button>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {chatMessages.map((msg) => (
              <div
                key={msg.id}
                className={`text-sm ${msg.type === 'game' ? 'text-gray-400 italic' : 'text-white'}`}
              >
                <span className="font-semibold text-blue-400">{msg.user}:</span> {msg.message}
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>
          
          <div className="p-4 border-t border-gray-700">
            <div className="flex gap-2">
              <Input
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && sendChatMessage()}
                placeholder="Type a message..."
                className="bg-gray-800 border-gray-600 text-white"
              />
              <Button
                onClick={sendChatMessage}
                size="sm"
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Chat Toggle Button */}
      {!showChat && (
        <Button
          onClick={() => setShowChat(true)}
          className="fixed right-4 bottom-4 bg-blue-600 hover:bg-blue-700 rounded-full w-12 h-12"
        >
          <MessageCircle className="w-6 h-6" />
        </Button>
      )}
    </div>
  );
}