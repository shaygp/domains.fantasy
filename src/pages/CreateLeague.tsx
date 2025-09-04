import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAccount } from 'wagmi';
import { Users, Trophy, DollarSign, Settings, Crown, Zap } from 'lucide-react';

const CreateLeague = () => {
  const [leagueName, setLeagueName] = useState('');
  const [entryFee, setEntryFee] = useState('0.01');
  const [maxPlayers, setMaxPlayers] = useState('10');
  const [isPublic, setIsPublic] = useState(true);
  const [transferBudget, setTransferBudget] = useState('1000');
  const [isCreating, setIsCreating] = useState(false);
  
  const { isConnected } = useAccount();
  const { toast } = useToast();

  const handleCreateLeague = async () => {
    if (!isConnected) {
      toast({
        title: "Connect wallet",
        description: "Please connect your wallet to create a league",
        variant: "destructive"
      });
      return;
    }

    if (!leagueName.trim()) {
      toast({
        title: "League name required",
        description: "Please enter a name for your league",
        variant: "destructive"
      });
      return;
    }

    setIsCreating(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      toast({
        title: "League created successfully!",
        description: `${leagueName} is ready for players to join`
      });

      setLeagueName('');
      setEntryFee('0.01');
      setMaxPlayers('10');
      setIsPublic(true);
      setTransferBudget('1000');
    } catch (error) {
      toast({
        title: "Failed to create league",
        description: "Please try again",
        variant: "destructive"
      });
    } finally {
      setIsCreating(false);
    }
  };

  const estimatedPrizePool = (parseFloat(entryFee) * parseInt(maxPlayers)).toFixed(3);

  return (
    <div className="container mx-auto px-6 py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-primary mb-2">Create Fantasy League</h1>
        <p className="text-muted-foreground">Set up a new domain fantasy league and invite players</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-6">
          <Card className="glass border-primary">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                League Configuration
              </CardTitle>
              <CardDescription>
                Configure the basic settings for your fantasy league
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="leagueName">League Name</Label>
                <Input
                  id="leagueName"
                  placeholder="Enter league name..."
                  value={leagueName}
                  onChange={(e) => setLeagueName(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="entryFee">Entry Fee (ETH)</Label>
                  <Input
                    id="entryFee"
                    type="number"
                    step="0.001"
                    placeholder="0.01"
                    value={entryFee}
                    onChange={(e) => setEntryFee(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="maxPlayers">Max Players</Label>
                  <Select value={maxPlayers} onValueChange={setMaxPlayers}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="4">4 Players</SelectItem>
                      <SelectItem value="6">6 Players</SelectItem>
                      <SelectItem value="8">8 Players</SelectItem>
                      <SelectItem value="10">10 Players</SelectItem>
                      <SelectItem value="12">12 Players</SelectItem>
                      <SelectItem value="16">16 Players</SelectItem>
                      <SelectItem value="20">20 Players</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="transferBudget">Transfer Budget</Label>
                <Input
                  id="transferBudget"
                  type="number"
                  placeholder="1000"
                  value={transferBudget}
                  onChange={(e) => setTransferBudget(e.target.value)}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Virtual currency for making transfers during the season
                </p>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="isPublic">Public League</Label>
                  <p className="text-xs text-muted-foreground">
                    Anyone can join public leagues
                  </p>
                </div>
                <Switch
                  id="isPublic"
                  checked={isPublic}
                  onCheckedChange={setIsPublic}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="glass border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="w-5 h-5" />
                League Rules
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                <div className="flex items-start space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                  <div>
                    <p className="font-medium">Team Composition</p>
                    <p className="text-muted-foreground">8-15 domains per team, mix of extensions recommended</p>
                  </div>
                </div>
                <div className="flex items-start space-x-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                  <div>
                    <p className="font-medium">Scoring System</p>
                    <p className="text-muted-foreground">Points based on domain views, revenue, auctions won</p>
                  </div>
                </div>
                <div className="flex items-start space-x-2">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full mt-2"></div>
                  <div>
                    <p className="font-medium">Transfer Window</p>
                    <p className="text-muted-foreground">5 transfers per season, budget-limited</p>
                  </div>
                </div>
                <div className="flex items-start space-x-2">
                  <div className="w-2 h-2 bg-purple-500 rounded-full mt-2"></div>
                  <div>
                    <p className="font-medium">Season Length</p>
                    <p className="text-muted-foreground">20 weeks with weekly scoring</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="glass border-green-500/20 bg-green-500/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-green-500" />
                Prize Pool Preview
              </CardTitle>
              <CardDescription>
                Distribution based on league settings
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-500 mb-2">
                    {estimatedPrizePool} ETH
                  </div>
                  <p className="text-sm text-muted-foreground">Total Prize Pool</p>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <Crown className="w-4 h-4 text-yellow-500" />
                      <span className="text-sm">1st Place (50%)</span>
                    </div>
                    <Badge variant="outline" className="text-yellow-500">
                      {(parseFloat(estimatedPrizePool) * 0.5).toFixed(3)} ETH
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <Trophy className="w-4 h-4 text-gray-400" />
                      <span className="text-sm">2nd Place (30%)</span>
                    </div>
                    <Badge variant="outline" className="text-gray-400">
                      {(parseFloat(estimatedPrizePool) * 0.3).toFixed(3)} ETH
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <Trophy className="w-4 h-4 text-amber-600" />
                      <span className="text-sm">3rd Place (20%)</span>
                    </div>
                    <Badge variant="outline" className="text-amber-600">
                      {(parseFloat(estimatedPrizePool) * 0.2).toFixed(3)} ETH
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5" />
                Fantasy Scoring
              </CardTitle>
              <CardDescription>
                How domains earn fantasy points
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="space-y-2">
                  <h4 className="font-medium">Performance Metrics</h4>
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Domain Views</span>
                      <span>1pt/1000 views</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Revenue</span>
                      <span>10pts/ETH</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Value Growth</span>
                      <span>5pts/10% gain</span>
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <h4 className="font-medium">Bonus Points</h4>
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Auction Win</span>
                      <span>+100pts</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">New Registration</span>
                      <span>+50pts</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Renewal</span>
                      <span>+25pts</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Button
            onClick={handleCreateLeague}
            disabled={!isConnected || isCreating}
            className="w-full bg-primary hover:bg-primary/90 h-12"
          >
            {isCreating ? (
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Creating League...</span>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <Users className="w-4 h-4" />
                <span>Create League ({entryFee} ETH)</span>
              </div>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CreateLeague;