import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

const Index = () => {
  const [leagueCode, setLeagueCode] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleCreateLeague = async () => {
    setIsCreating(true);
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const newLeagueCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    
    toast({
      title: "League Created",
      description: `Code: ${newLeagueCode}`,
    });
    
    setTimeout(() => {
      navigate('/auctions');
    }, 1000);
    
    setIsCreating(false);
  };

  const handleJoinLeague = async () => {
    if (!leagueCode.trim()) {
      toast({
        title: "Enter a league code",
        variant: "destructive",
      });
      return;
    }
    
    setIsJoining(true);
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    toast({
      title: "Joined League",
      description: `Welcome to ${leagueCode}`,
    });
    
    setTimeout(() => {
      navigate('/auctions');
    }, 1000);
    
    setIsJoining(false);
    setLeagueCode("");
  };


  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-4xl w-full space-y-12">
        {/* Header */}
        <div className="text-center space-y-6">
          <h1 className="text-5xl font-bold text-foreground font-mono">
            DOMAINFI
          </h1>
          <p className="text-muted-foreground text-lg">
            Fantasy Domain Auction League
          </p>
          <div className="text-sm font-mono text-muted-foreground">
            [SYSTEM READY] • [ORACLES ONLINE] • [AUCTIONS ACTIVE]
          </div>
        </div>

        {/* Action Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-2xl mx-auto">
          {/* Create League */}
          <div className="glass p-8 space-y-6 h-full">
            <div className="text-xs font-mono text-muted-foreground mb-2">
              &gt; create_league.exe
            </div>
            <h3 className="text-xl font-bold font-mono text-center">
              Create League
            </h3>
            
            <div className="flex-1 flex flex-col justify-end space-y-4">
              <Button 
                className="w-full bg-gradient-terminal text-secondary-foreground font-mono py-6"
                onClick={handleCreateLeague}
                disabled={isCreating}
              >
                {isCreating ? "Creating..." : "Create"}
              </Button>
              
              <div className="text-xs font-mono text-muted-foreground text-center">
                Generate new league code
              </div>
            </div>
          </div>

          {/* Join League */}
          <div className="glass p-8 space-y-6 h-full">
            <div className="text-xs font-mono text-muted-foreground mb-2">
              &gt; join_league.exe
            </div>
            <h3 className="text-xl font-bold font-mono text-center">
              Join League
            </h3>
            
            <div className="flex-1 flex flex-col justify-end space-y-4">
              <Input
                placeholder="League code"
                value={leagueCode}
                onChange={(e) => setLeagueCode(e.target.value.toUpperCase())}
                className="font-mono text-center bg-input border-glass-border"
                maxLength={6}
              />

              <Button 
                className="w-full bg-gradient-primary text-primary-foreground font-mono py-6"
                onClick={handleJoinLeague}
                disabled={isJoining}
              >
                {isJoining ? "Joining..." : "Join"}
              </Button>
              
              <div className="text-xs font-mono text-muted-foreground text-center">
                Enter 6-digit access code
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;