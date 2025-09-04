import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import TerminalWindow from "@/components/TerminalWindow";
import { useToast } from "@/hooks/use-toast";
import { TrendingUp, TrendingDown, DollarSign, Target, Users, Star, Timer, RotateCcw, Save } from "lucide-react";

const MyTeam = () => {
  const [draftedDomains, setDraftedDomains] = useState([]);
  const [teamFormation, setTeamFormation] = useState({
    striker: null,
    forwards: [],
    midfield: [],
    defense: [],
    goalkeeper: null
  });
  const [isEditing, setIsEditing] = useState(false);
  const { toast } = useToast();

  // Load drafted domains from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('draftedDomains');
    if (stored) {
      const domains = JSON.parse(stored);
      setDraftedDomains(domains);
      
      // Initialize formation with all available players
      const formation = {
        striker: domains.find(d => d.position === "Striker") || null,
        forwards: domains.filter(d => d.position === "Winger" || d.position === "CAM"),
        midfield: domains.filter(d => d.position === "CM" || d.position === "CDM"),
        defense: domains.filter(d => d.position === "CB" || d.position === "LB" || d.position === "RB"),
        goalkeeper: domains.find(d => d.position === "GK") || null
      };
      setTeamFormation(formation);
    } else {
      // Mock data if no drafted domains
      const mockDomains = [
        { name: "ai.com", purchasePrice: 150000, currentValue: 187500, performance: "+25%", status: "rising", confidence: 98, goals: 3, assists: 1, position: "Striker" },
        { name: "crypto.io", purchasePrice: 75000, currentValue: 82000, performance: "+9.3%", status: "rising", confidence: 87, goals: 2, assists: 0, position: "Winger" },
        { name: "nft.digital", purchasePrice: 32000, currentValue: 38500, performance: "+20.3%", status: "rising", confidence: 89, goals: 1, assists: 2, position: "CAM" },
        { name: "dao.org", purchasePrice: 67000, currentValue: 71000, performance: "+5.9%", status: "stable", confidence: 72, goals: 0, assists: 1, position: "CM" },
        { name: "web3.xyz", purchasePrice: 89000, currentValue: 78000, performance: "-12.4%", status: "falling", confidence: 45, goals: 0, assists: 0, position: "CDM" },
        { name: "meta.app", purchasePrice: 45000, currentValue: 41000, performance: "-8.9%", status: "falling", confidence: 62, goals: 0, assists: 0, position: "CB" },
        { name: "blockchain.tech", purchasePrice: 55000, currentValue: 59000, performance: "+7.3%", status: "stable", confidence: 74, goals: 0, assists: 1, position: "CB" },
        { name: "vault.secure", purchasePrice: 28000, currentValue: 31500, performance: "+12.5%", status: "rising", confidence: 85, saves: 2, position: "GK" }
      ];
      setDraftedDomains(mockDomains);
      setTeamFormation({
        striker: mockDomains[0],
        forwards: [mockDomains[1], mockDomains[2]], // winger and CAM
        midfield: [mockDomains[3], mockDomains[4]], // CM and CDM  
        defense: [mockDomains[5], mockDomains[6]], // Both CBs
        goalkeeper: mockDomains[7]
      });
    }
  }, []);

  const handlePositionChange = (domain, newPosition) => {
    const updatedDomains = draftedDomains.map(d => 
      d.name === domain.name ? { ...d, position: newPosition } : d
    );
    setDraftedDomains(updatedDomains);
    
    // Update formation (4-3-2-1)
    const formation = {
      striker: updatedDomains.find(d => d.position === "Striker") || null,
      forwards: updatedDomains.filter(d => d.position === "Winger" || d.position === "CAM"),
      midfield: updatedDomains.filter(d => d.position === "CM" || d.position === "CDM"),
      defense: updatedDomains.filter(d => d.position === "CB" || d.position === "LB" || d.position === "RB"),
      goalkeeper: updatedDomains.find(d => d.position === "GK") || null
    };
    setTeamFormation(formation);
  };

  const saveFormation = () => {
    localStorage.setItem('draftedDomains', JSON.stringify(draftedDomains));
    toast({
      title: "Formation Saved",
      description: "Your team formation has been updated successfully.",
    });
    setIsEditing(false);
  };

  const resetFormation = () => {
    const defaultPositions = ["Striker", "Winger", "CAM", "CM", "CDM", "CB", "LB", "RB", "CB", "GK"];
    const updatedDomains = draftedDomains.map((domain, index) => ({
      ...domain,
      position: defaultPositions[index] || "CB"
    }));
    setDraftedDomains(updatedDomains);
    
    const formation = {
      striker: updatedDomains.find(d => d.position === "Striker") || null,
      forwards: updatedDomains.filter(d => d.position === "Winger" || d.position === "CAM"),
      midfield: updatedDomains.filter(d => d.position === "CM" || d.position === "CDM"),
      defense: updatedDomains.filter(d => d.position === "CB" || d.position === "LB" || d.position === "RB"),
      goalkeeper: updatedDomains.find(d => d.position === "GK") || null
    };
    setTeamFormation(formation);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "rising": return "text-terminal-glow";
      case "falling": return "text-destructive";
      default: return "text-warning";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "rising": return <TrendingUp className="w-3 h-3" />;
      case "falling": return <TrendingDown className="w-3 h-3" />;
      default: return <Target className="w-3 h-3" />;
    }
  };

  const PlayerCard = ({ player, isGoalkeeper = false }) => (
    <div className="glass p-4 hover:shadow-blue-glow transition-all duration-300 group relative">
      <div className="text-center space-y-2">
        <div className="text-xs text-muted-foreground font-mono tracking-wider">
          {isEditing ? (
            <Select value={player.position} onValueChange={(value) => handlePositionChange(player, value)}>
              <SelectTrigger className="w-full h-6 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Striker">Striker</SelectItem>
                <SelectItem value="Winger">Winger</SelectItem>
                <SelectItem value="CAM">CAM</SelectItem>
                <SelectItem value="CM">CM</SelectItem>
                <SelectItem value="CDM">CDM</SelectItem>
                <SelectItem value="CB">CB</SelectItem>
                <SelectItem value="LB">LB</SelectItem>
                <SelectItem value="RB">RB</SelectItem>
                <SelectItem value="GK">GK</SelectItem>
              </SelectContent>
            </Select>
          ) : (
            player.position || "N/A"
          )}
        </div>
        <div className="font-bold text-foreground text-sm group-hover:text-primary transition-colors">
          {player.name || player.domain || "Unknown Domain"}
        </div>
        <div className="flex items-center justify-center space-x-1">
          {getStatusIcon(player.status || "stable")}
          <span className={`text-xs font-mono font-bold ${getStatusColor(player.status || "stable")}`}>
            {player.performance || "0%"}
          </span>
        </div>
        <div className="text-xs text-muted-foreground font-mono">
          ${player.currentValue?.toLocaleString() || player.price?.toLocaleString() || "0"}
        </div>
        <div className="flex justify-center space-x-2 text-xs">
          {!isGoalkeeper ? (
            <>
              <span className="text-terminal-glow">{player.goals || 0}G</span>
              <span className="text-primary">{player.assists || 0}A</span>
            </>
          ) : (
            <span className="text-warning">{player.saves || 0}S</span>
          )}
        </div>
        <div className="w-full bg-muted h-1">
          <div 
            className={`h-1 ${
              (player.confidence || 50) > 80 ? "bg-terminal-glow" : 
              (player.confidence || 50) > 60 ? "bg-warning" : "bg-destructive"
            }`}
            style={{ width: `${player.confidence || 50}%` }}
          ></div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="container mx-auto px-6 py-8 space-y-8">
      {/* Team Header */}
      <div className="glass rounded-xl p-8 space-y-6">
        <div className="text-center border-b border-glass-border pb-6">
          <h1 className="text-4xl font-bold text-foreground mb-2 font-mono">
            <span className="typewriter">MY DOMAIN SQUAD</span>
          </h1>
          <p className="text-terminal-glow font-mono text-sm tracking-wider">
            FORMATION: 4-3-2-1 • TOTAL DOMAINS: {draftedDomains.length}
          </p>
          
          <div className="flex space-x-4 justify-center">
            <Button 
              variant={isEditing ? "default" : "outline"} 
              size="sm" 
              onClick={() => setIsEditing(!isEditing)}
              className="font-mono"
            >
              {isEditing ? "Cancel Edit" : "Edit Formation"}
            </Button>
            
            {isEditing && (
              <>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={resetFormation}
                  className="font-mono border-warning text-warning"
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Reset
                </Button>
                <Button 
                  size="sm" 
                  onClick={saveFormation}
                  className="bg-gradient-terminal text-secondary-foreground font-mono"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Save
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Football Formation Field */}
      <TerminalWindow title="formation_display.field" className="bg-gradient-to-b from-green-900/20 to-green-800/10 min-h-[600px]">
        <div className="relative h-full min-h-[550px] p-8">
          {/* Field markings */}
          <div className="absolute inset-4 border-2 border-white/20 rounded-lg">
            <div className="absolute left-0 top-1/2 transform -translate-y-1/2 w-16 h-32 border-2 border-white/20 border-l-0"></div>
            <div className="absolute right-0 top-1/2 transform -translate-y-1/2 w-16 h-32 border-2 border-white/20 border-r-0"></div>
            <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-white/20"></div>
            <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 w-24 h-24 border-2 border-white/20 rounded-full"></div>
          </div>

          {/* Goalkeeper */}
          {teamFormation.goalkeeper && (
            <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2">
              <PlayerCard player={teamFormation.goalkeeper} isGoalkeeper={true} />
            </div>
          )}

          {/* Defense - 4 players */}
          <div className="absolute bottom-24 left-1/2 transform -translate-x-1/2 flex space-x-6">
            {teamFormation.defense.map((player, index) => (
              <div key={player.name || player.domain} className={
                index === 0 ? "-translate-x-32" : 
                index === 1 ? "-translate-x-16" : 
                index === 2 ? "translate-x-16" : "translate-x-32"
              }>
                <PlayerCard player={player} />
              </div>
            ))}
          </div>

          {/* Midfield - 3 players */}
          <div className="absolute bottom-48 left-1/2 transform -translate-x-1/2 flex space-x-12">
            {teamFormation.midfield.map((player, index) => (
              <div key={player.name || player.domain} className={
                index === 0 ? "-translate-x-24" : 
                index === 1 ? "" : "translate-x-24"
              }>
                <PlayerCard player={player} />
              </div>
            ))}
          </div>

          {/* Attacking Midfielders/Wingers - 2 players */}
          <div className="absolute bottom-72 left-1/2 transform -translate-x-1/2 flex space-x-16">
            {teamFormation.forwards.map((player, index) => (
              <div key={player.name || player.domain} className={index === 0 ? "-translate-x-8" : "translate-x-8"}>
                <PlayerCard player={player} />
              </div>
            ))}
          </div>

          {/* Striker - 1 player */}
          {teamFormation.striker && (
            <div className="absolute bottom-96 left-1/2 transform -translate-x-1/2">
              <PlayerCard player={teamFormation.striker} />
            </div>
          )}
        </div>
      </TerminalWindow>

      {/* Team Management */}
      {draftedDomains.length > 0 && (
        <TerminalWindow title="squad_management.interface">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold font-mono text-terminal-glow">AVAILABLE PLAYERS</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {draftedDomains.map((domain) => (
                <div key={domain.name} className="glass p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-sm">{domain.name}</span>
                    <span className={`text-xs font-mono ${getStatusColor(domain.status)}`}>
                      {domain.performance}
                    </span>
                  </div>
                  
                  <div className="text-xs text-muted-foreground">
                    Current Position: <span className="text-primary">{domain.position}</span>
                  </div>
                  
                  {isEditing && (
                    <Select value={domain.position} onValueChange={(value) => handlePositionChange(domain, value)}>
                      <SelectTrigger className="w-full text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Striker">Striker</SelectItem>
                        <SelectItem value="Winger">Winger</SelectItem>
                        <SelectItem value="CAM">CAM (Attacking Mid)</SelectItem>
                        <SelectItem value="CM">CM (Central Mid)</SelectItem>
                        <SelectItem value="CDM">CDM (Defensive Mid)</SelectItem>
                        <SelectItem value="CB">CB (Center Back)</SelectItem>
                        <SelectItem value="LB">LB (Left Back)</SelectItem>
                        <SelectItem value="RB">RB (Right Back)</SelectItem>
                        <SelectItem value="GK">GK (Goalkeeper)</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                </div>
              ))}
            </div>
            
            {draftedDomains.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="font-mono">No domains drafted yet</p>
                <p className="text-sm mt-2">Visit the Scout page to draft domains to your team</p>
              </div>
            )}
          </div>
        </TerminalWindow>
      )}
    </div>
  );
};

export default MyTeam;
