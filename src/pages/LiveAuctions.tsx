import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { domaAPI, Auction, PlayerStats } from '@/services/domaApi';
import { useAccount, useBalance } from 'wagmi';
import { Timer, TrendingUp, Trophy, Zap, Target, Users, DollarSign, Gavel } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const LiveAuctions = () => {
  const [auctions, setAuctions] = useState<Auction[]>([]);
  const [playerStats, setPlayerStats] = useState<PlayerStats | null>(null);
  const [selectedAuction, setSelectedAuction] = useState<Auction | null>(null);
  const [bidAmount, setBidAmount] = useState('');
  const [loading, setLoading] = useState(true);
  const [auctionType, setAuctionType] = useState<'all' | 'dutch' | 'sealed' | 'gamified'>('all');
  
  const { address, isConnected } = useAccount();
  const { data: balance } = useBalance({ address });
  const { toast } = useToast();

  useEffect(() => {
    loadAuctions();
    if (address) {
      loadPlayerStats();
    }
  }, [address]);

  const loadAuctions = async () => {
    setLoading(true);
    try {
      const activeAuctions = await domaAPI.getActiveAuctions();
      setAuctions(activeAuctions);
    } catch (error) {
      toast({
        title: "Error loading auctions",
        description: "Failed to fetch active auctions",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const loadPlayerStats = async () => {
    if (!address) return;
    try {
      const stats = await domaAPI.getPlayerStats(address);
      setPlayerStats(stats);
    } catch (error) {
      console.error('Error loading player stats:', error);
    }
  };

  const handlePlaceBid = async (auctionId: string) => {
    if (!isConnected || !address) {
      toast({
        title: "Connect wallet",
        description: "Please connect your wallet to place bids",
        variant: "destructive"
      });
      return;
    }

    try {
      const amount = parseFloat(bidAmount);
      await domaAPI.placeBid(auctionId, amount, address);
      
      const points = await domaAPI.calculateFantasyPoints('bid_placed', {
        auctionId,
        amount,
        auctionType: selectedAuction?.type
      });

      toast({
        title: "Bid placed successfully!",
        description: `You earned ${points} fantasy points!`
      });

      setBidAmount('');
      loadAuctions();
      loadPlayerStats();
    } catch (error) {
      toast({
        title: "Bid failed",
        description: "Failed to place bid. Please try again.",
        variant: "destructive"
      });
    }
  };

  const getTimeRemaining = (endTime: Date) => {
    const now = new Date();
    const end = new Date(endTime);
    const diff = end.getTime() - now.getTime();
    
    if (diff <= 0) return 'Ended';
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 24) {
      return formatDistanceToNow(end, { addSuffix: true });
    }
    
    return `${hours}h ${minutes}m`;
  };

  const getAuctionIcon = (type: string) => {
    switch (type) {
      case 'dutch': return <TrendingUp className="w-4 h-4" />;
      case 'sealed': return <Target className="w-4 h-4" />;
      case 'gamified': return <Zap className="w-4 h-4" />;
      default: return <Gavel className="w-4 h-4" />;
    }
  };

  const filteredAuctions = auctionType === 'all' 
    ? auctions 
    : auctions.filter(a => a.type === auctionType);

  return (
    <div className="container mx-auto px-6 py-8">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-4xl font-bold text-primary mb-2">Live Domain Auctions</h1>
            <p className="text-muted-foreground">Compete in real-time auctions with gamified mechanics</p>
          </div>
          
          {playerStats && (
            <Card className="glass border-primary/20">
              <CardContent className="flex items-center space-x-6 p-4">
                <div className="text-center">
                  <Trophy className="w-8 h-8 text-yellow-500 mx-auto mb-1" />
                  <p className="text-2xl font-bold text-terminal-glow">{playerStats.fantasyScore}</p>
                  <p className="text-xs text-muted-foreground">Fantasy Points</p>
                </div>
                <div className="text-center">
                  <Badge variant="outline" className="mb-1">Level {playerStats.level}</Badge>
                  <p className="text-xs text-muted-foreground">{playerStats.streakBonus}x Streak</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <Tabs value={auctionType} onValueChange={(v) => setAuctionType(v as any)}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="all">All Auctions</TabsTrigger>
            <TabsTrigger value="dutch">Dutch Auctions</TabsTrigger>
            <TabsTrigger value="sealed">Sealed Bids</TabsTrigger>
            <TabsTrigger value="gamified">Gamified</TabsTrigger>
          </TabsList>

          <TabsContent value={auctionType} className="mt-6">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
              </div>
            ) : filteredAuctions.length === 0 ? (
              <Card className="glass border-primary/20">
                <CardContent className="text-center py-12">
                  <Gavel className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-lg text-muted-foreground">No active auctions found</p>
                  <p className="text-sm text-muted-foreground mt-2">Check back later for new opportunities</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredAuctions.map((auction) => (
                  <Card 
                    key={auction.id} 
                    className="glass border-primary/20 hover:border-primary transition-colors cursor-pointer"
                    onClick={() => setSelectedAuction(auction)}
                  >
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">{auction.domainName}</CardTitle>
                        <Badge variant={auction.type === 'gamified' ? 'default' : 'outline'}>
                          <span className="flex items-center gap-1">
                            {getAuctionIcon(auction.type)}
                            {auction.type}
                          </span>
                        </Badge>
                      </div>
                      <CardDescription>
                        <div className="flex items-center gap-2 mt-2">
                          <Timer className="w-3 h-3" />
                          <span className="text-xs">{getTimeRemaining(auction.endTime)}</span>
                        </div>
                      </CardDescription>
                    </CardHeader>
                    
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Current Price</span>
                          <span className="text-lg font-bold text-terminal-glow">
                            ${auction.currentPrice.toLocaleString()}
                          </span>
                        </div>
                        
                        {auction.bids.length > 0 && (
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">Bids</span>
                            <Badge variant="secondary">{auction.bids.length}</Badge>
                          </div>
                        )}
                        
                        {auction.fantasyPoints && (
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">Fantasy Points</span>
                            <span className="text-sm font-bold text-yellow-500">
                              +{auction.fantasyPoints} pts
                            </span>
                          </div>
                        )}

                        {auction.type === 'dutch' && auction.reservePrice && (
                          <Progress 
                            value={(1 - (auction.currentPrice - auction.reservePrice) / (auction.startPrice - auction.reservePrice)) * 100} 
                            className="h-2"
                          />
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {selectedAuction && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="glass border-primary max-w-2xl w-full">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-2xl">{selectedAuction.domainName}</CardTitle>
                  <CardDescription className="flex items-center gap-2 mt-2">
                    {getAuctionIcon(selectedAuction.type)}
                    {selectedAuction.type.charAt(0).toUpperCase() + selectedAuction.type.slice(1)} Auction
                  </CardDescription>
                </div>
                <Button variant="ghost" onClick={() => setSelectedAuction(null)}>✕</Button>
              </div>
            </CardHeader>
            
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Current Price</p>
                    <p className="text-2xl font-bold text-terminal-glow">
                      ${selectedAuction.currentPrice.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Time Remaining</p>
                    <p className="text-xl font-semibold">
                      {getTimeRemaining(selectedAuction.endTime)}
                    </p>
                  </div>
                </div>

                {selectedAuction.fantasyPoints && (
                  <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Win this auction to earn</span>
                      <span className="text-lg font-bold text-yellow-500">
                        +{selectedAuction.fantasyPoints} Fantasy Points
                      </span>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-sm font-medium">Your Bid Amount</label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      placeholder="Enter bid amount"
                      value={bidAmount}
                      onChange={(e) => setBidAmount(e.target.value)}
                      className="flex-1"
                    />
                    <Button 
                      onClick={() => handlePlaceBid(selectedAuction.id)}
                      disabled={!bidAmount || !isConnected}
                      className="bg-primary hover:bg-primary/90"
                    >
                      Place Bid
                    </Button>
                  </div>
                </div>

                {selectedAuction.bids.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium mb-2">Recent Bids</h4>
                    <div className="space-y-1 max-h-32 overflow-y-auto">
                      {selectedAuction.bids.slice(0, 5).map((bid) => (
                        <div key={bid.id} className="flex justify-between text-sm">
                          <span className="text-muted-foreground">
                            {bid.bidder.slice(0, 6)}...{bid.bidder.slice(-4)}
                          </span>
                          <span className="font-medium">${bid.amount.toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default LiveAuctions;