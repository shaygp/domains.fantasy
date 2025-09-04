import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import TerminalWindow from "@/components/TerminalWindow";
import { Trophy, TrendingUp, Target } from "lucide-react";

const Leaderboard = () => {
  const [timeframe, setTimeframe] = useState("week");

  const leaderboardData = [
    {
      rank: 1,
      username: "DomainMaster",
      score: 15420,
      totalPredictions: 187,
      badge: "Oracle",
      trend: "+245"
    },
    {
      rank: 2,
      username: "CryptoValuer",
      score: 13890,
      totalPredictions: 203,
      badge: "Prophet",
      trend: "+189"
    },
    {
      rank: 3,
      username: "AIPredictor",
      score: 12750,
      totalPredictions: 156,
      badge: "Sage",
      trend: "+167"
    },
    {
      rank: 4,
      username: "DomainSeer",
      score: 11230,
      totalPredictions: 142,
      badge: "Analyst",
      trend: "+134"
    },
    {
      rank: 5,
      username: "BlockchainBid",
      score: 10890,
      totalPredictions: 178,
      badge: "Trader",
      trend: "+112"
    },
    {
      rank: 6,
      username: "MetaValueX",
      score: 9640,
      totalPredictions: 134,
      badge: "Novice",
      trend: "+89"
    },
    {
      rank: 7,
      username: "WebWizard",
      score: 8920,
      totalPredictions: 167,
      badge: "Novice",
      trend: "+67"
    },
  ];

  const getRankIcon = (rank: number) => {
    return <span className="text-muted-foreground font-mono">#{rank}</span>;
  };

  const getBadgeColor = (badge: string) => {
    switch (badge) {
      case "Oracle":
        return "bg-gradient-terminal text-secondary-foreground";
      case "Prophet":
        return "bg-gradient-primary text-primary-foreground";
      case "Sage":
        return "bg-warning text-warning-foreground";
      case "Analyst":
        return "bg-secondary text-secondary-foreground";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  return (
    <div className="container mx-auto px-6 py-8 space-y-8">
      {/* Header */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              <span className="typewriter">Leaderboard</span>
            </h1>
            <p className="text-muted-foreground mt-2">
              Top domain valuation predictors and fantasy league champions
            </p>
          </div>
          
          <div className="flex space-x-2">
            {["day", "week", "month", "all"].map((period) => (
              <Button
                key={period}
                variant={timeframe === period ? "default" : "outline"}
                size="sm"
                onClick={() => setTimeframe(period)}
                className={timeframe === period ? "bg-primary text-primary-foreground shadow-blue-glow" : ""}
              >
                {period.charAt(0).toUpperCase() + period.slice(1)}
              </Button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Main leaderboard */}
        <div className="lg:col-span-3">
          <TerminalWindow title="rankings.db">
            <div className="space-y-4">
              {/* Podium for top 3 */}
              <div className="grid grid-cols-3 gap-4 mb-8">
                {leaderboardData.slice(0, 3).map((player, index) => (
                  <div
                    key={player.username}
                    className="glass p-4 text-center"
                  >
                    <div className="flex justify-center mb-2">
                      {getRankIcon(player.rank)}
                    </div>
                    <h3 className="font-mono font-bold text-sm mb-1">{player.username}</h3>
                    <div className="text-terminal-glow font-mono text-lg font-bold mb-1">
                      {player.score.toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>

              {/* Full rankings table */}
              <div className="space-y-2">
                {leaderboardData.map((player) => (
                  <div
                    key={player.username}
                    className="glass rounded-lg p-4 hover:shadow-blue-glow transition-all group"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 flex justify-center">
                          {getRankIcon(player.rank)}
                        </div>
                        <div>
                          <h3 className="font-mono font-semibold group-hover:text-primary transition-colors">
                            {player.username}
                          </h3>
                          <div className="flex items-center space-x-3 text-xs text-muted-foreground">
                            <span>{player.totalPredictions} predictions</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-6">
                        <div className="text-right">
                          <div className="font-mono font-bold text-terminal-glow">
                            {player.score.toLocaleString()}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-secondary font-mono">+{player.trend}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </TerminalWindow>
        </div>

        {/* Stats sidebar */}
        <div className="space-y-6">
          <TerminalWindow title="your_stats.json">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Your Performance</h3>
              
              <div className="space-y-3">
                <div className="glass rounded p-3">
                  <div className="text-2xl font-mono font-bold text-primary">
                    #42
                  </div>
                  <div className="text-sm text-muted-foreground">Current Rank</div>
                </div>

                <div className="glass rounded p-3">
                  <div className="text-xl font-mono font-bold text-terminal-glow">
                    1,337
                  </div>
                  <div className="text-sm text-muted-foreground">Total Score</div>
                </div>

                <div className="glass rounded p-3">
                  <div className="text-xl font-mono font-bold text-secondary">
                    4
                  </div>
                  <div className="text-sm text-muted-foreground">Win Streak</div>
                </div>
              </div>

              <div className="bg-muted text-muted-foreground w-full justify-center p-2 font-mono text-xs">
                Analyst
              </div>
            </div>
          </TerminalWindow>


          <TerminalWindow title="market_insights.py">
            <div className="space-y-3 text-sm">
              <div className="text-terminal-glow">
                <span className="text-muted-foreground"># Top Strategies</span>
              </div>
              <div className="text-muted-foreground">
                • Focus on .com domains for higher success
              </div>
              <div className="text-muted-foreground">
                • AI/ML keywords showing 89% success rate
              </div>
              <div className="text-primary">
                • Short domains (≤5 chars) outperforming by 23%
              </div>
            </div>
          </TerminalWindow>
        </div>
      </div>
    </div>
  );
};

export default Leaderboard;