import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { useAccount } from 'wagmi';
import { Trophy, Users, Clock, TrendingUp, Star, Crown, Timer, DollarSign } from 'lucide-react';

interface League {
  id: number;
  name: string;
  creator: string;
  entryFee: string;
  maxPlayers: number;
  currentPlayers: number;
  prizePool: string;
  isActive: boolean;
  seasonProgress: number;
  playerRank: number;
  totalScore: number;
  weeklyScore: number;
  teamValue: string;
}

const MyLeagues = () => {
  const [myLeagues, setMyLeagues] = useState<League[]>([]);
  const [loading, setLoading] = useState(true);
  const { address, isConnected } = useAccount();

  useEffect(() => {
    loadMyLeagues();
  }, [address]);

  const loadMyLeagues = async () => {
    setLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const mockLeagues: League[] = [
        {
          id: 1,
          name: "Elite Domain Masters",
          creator: "0x1234...5678",
          entryFee: "0.1",
          maxPlayers: 12,
          currentPlayers: 10,
          prizePool: "1.0",
          isActive: true,
          seasonProgress: 35,
          playerRank: 3,
          totalScore: 15420,
          weeklyScore: 892,
          teamValue: "45.7"
        },
        {
          id: 2,
          name: "DeFi Domain League",
          creator: "0x9876...4321",
          entryFee: "0.05",
          maxPlayers: 8,
          currentPlayers: 8,
          prizePool: "0.4",
          isActive: true,
          seasonProgress: 60,
          playerRank: 1,
          totalScore: 28340,
          weeklyScore: 1250,
          teamValue: "67.2"
        },
        {
          id: 3,
          name: "Rookie Domain Challenge",
          creator: address || "0x0000...0000",
          entryFee: "0.01",
          maxPlayers: 16,
          currentPlayers: 14,
          prizePool: "0.14",
          isActive: true,
          seasonProgress: 15,
          playerRank: 7,
          totalScore: 6780,
          weeklyScore: 445,
          teamValue: "23.1"
        }
      ];

      setMyLeagues(mockLeagues);
    } catch (error) {
      console.error('Error loading leagues:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRankBadge = (rank: number) => {
    if (rank === 1) return <Badge className="bg-yellow-500 text-black"><Crown className="w-3 h-3 mr-1" />1st</Badge>;
    if (rank === 2) return <Badge className="bg-gray-300 text-black">2nd</Badge>;
    if (rank === 3) return <Badge className="bg-amber-600 text-white">3rd</Badge>;
    return <Badge variant="outline">#{rank}</Badge>;
  };

  const getProgressColor = (progress: number) => {
    if (progress < 25) return "bg-blue-500";
    if (progress < 50) return "bg-green-500";
    if (progress < 75) return "bg-yellow-500";
    return "bg-orange-500";
  };

  if (!isConnected) {
    return (
      <div className="container mx-auto px-6 py-8">
        <Card className="glass border-primary/20">
          <CardContent className="text-center py-12">
            <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Connect Your Wallet</h3>
            <p className="text-muted-foreground">Please connect your wallet to view your fantasy leagues</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-6 py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-primary mb-2">My Fantasy Leagues</h1>
        <p className="text-muted-foreground">Manage your domain fantasy league teams and track performance</p>
      </div>

      <Tabs defaultValue="active" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="active">Active Leagues</TabsTrigger>
          <TabsTrigger value="stats">My Statistics</TabsTrigger>
          <TabsTrigger value="history">League History</TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-6">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 3 }).map((_, i) => (
                <Card key={i} className="glass animate-pulse">
                  <CardContent className="p-6">
                    <div className="h-4 bg-muted rounded mb-2"></div>
                    <div className="h-3 bg-muted rounded w-2/3 mb-4"></div>
                    <div className="space-y-2">
                      <div className="h-3 bg-muted rounded"></div>
                      <div className="h-3 bg-muted rounded"></div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : myLeagues.length === 0 ? (
            <Card className="glass border-primary/20">
              <CardContent className="text-center py-12">
                <Trophy className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No Active Leagues</h3>
                <p className="text-muted-foreground mb-4">You're not currently in any fantasy leagues</p>
                <Button>Create Your First League</Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {myLeagues.map((league) => (
                <Card key={league.id} className="glass border-primary/20 hover:border-primary transition-colors">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg mb-1">{league.name}</CardTitle>
                        <CardDescription className="flex items-center gap-2">
                          <Users className="w-3 h-3" />
                          {league.currentPlayers}/{league.maxPlayers} players
                        </CardDescription>
                      </div>
                      {getRankBadge(league.playerRank)}
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Prize Pool</p>
                        <p className="font-bold text-green-500">{league.prizePool} ETH</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Team Value</p>
                        <p className="font-bold text-terminal-glow">{league.teamValue} ETH</p>
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm text-muted-foreground">Season Progress</span>
                        <span className="text-sm font-medium">{league.seasonProgress}%</span>
                      </div>
                      <Progress value={league.seasonProgress} className="h-2" />
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Total Score</p>
                        <p className="font-bold">{league.totalScore.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">This Week</p>
                        <p className="font-bold text-blue-500">+{league.weeklyScore}</p>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button size="sm" className="flex-1">
                        <TrendingUp className="w-3 h-3 mr-1" />
                        View Team
                      </Button>
                      <Button size="sm" variant="outline" className="flex-1">
                        <Trophy className="w-3 h-3 mr-1" />
                        Standings
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="stats" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="glass border-primary/20">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Leagues</p>
                    <p className="text-2xl font-bold">3</p>
                  </div>
                  <Users className="w-8 h-8 text-primary" />
                </div>
              </CardContent>
            </Card>
            
            <Card className="glass border-green-500/20">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Championships</p>
                    <p className="text-2xl font-bold text-green-500">1</p>
                  </div>
                  <Crown className="w-8 h-8 text-green-500" />
                </div>
              </CardContent>
            </Card>

            <Card className="glass border-yellow-500/20">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Winnings</p>
                    <p className="text-2xl font-bold text-yellow-500">0.7 ETH</p>
                  </div>
                  <DollarSign className="w-8 h-8 text-yellow-500" />
                </div>
              </CardContent>
            </Card>

            <Card className="glass border-blue-500/20">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Best Rank</p>
                    <p className="text-2xl font-bold text-blue-500">1st</p>
                  </div>
                  <Star className="w-8 h-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="glass border-primary/20">
              <CardHeader>
                <CardTitle>Performance Over Time</CardTitle>
                <CardDescription>Your fantasy scoring trends</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Average Weekly Score</span>
                    <span className="font-bold">862 points</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Best Weekly Score</span>
                    <span className="font-bold text-green-500">1,250 points</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Current Form</span>
                    <Badge variant="default" className="bg-green-500">Excellent</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="glass border-primary/20">
              <CardHeader>
                <CardTitle>Achievement Progress</CardTitle>
                <CardDescription>Unlock fantasy milestones</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm">Domain Master</span>
                      <span className="text-sm text-muted-foreground">8/10</span>
                    </div>
                    <Progress value={80} className="h-2" />
                  </div>
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm">Auction Hunter</span>
                      <span className="text-sm text-muted-foreground">15/25</span>
                    </div>
                    <Progress value={60} className="h-2" />
                  </div>
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm">League Champion</span>
                      <span className="text-sm text-green-500">✓ Complete</span>
                    </div>
                    <Progress value={100} className="h-2" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="history" className="space-y-6">
          <Card className="glass border-primary/20">
            <CardHeader>
              <CardTitle>Previous Seasons</CardTitle>
              <CardDescription>Your fantasy league history and results</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border border-green-500/20 rounded-lg bg-green-500/5">
                  <div className="flex items-center gap-3">
                    <Crown className="w-5 h-5 text-yellow-500" />
                    <div>
                      <p className="font-medium">Pro Domain League S2</p>
                      <p className="text-sm text-muted-foreground">Champion • 12 players</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-green-500">+0.5 ETH</p>
                    <p className="text-xs text-muted-foreground">Final Score: 45,230</p>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 border border-muted/20 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Trophy className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="font-medium">Crypto Domains Elite S1</p>
                      <p className="text-sm text-muted-foreground">3rd Place • 8 players</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-amber-600">+0.2 ETH</p>
                    <p className="text-xs text-muted-foreground">Final Score: 38,150</p>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 border border-muted/20 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Timer className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Beginner League S1</p>
                      <p className="text-sm text-muted-foreground">5th Place • 16 players</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-muted-foreground">No Prize</p>
                    <p className="text-xs text-muted-foreground">Final Score: 22,890</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default MyLeagues;