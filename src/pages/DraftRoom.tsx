import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import TerminalWindow from "@/components/TerminalWindow";
import { useToast } from "@/hooks/use-toast";
import { domaAPI } from "@/services/domaApi";
import { priceDiscovery } from "@/services/priceDiscovery";
import { useAccount } from "wagmi";
import { Search, TrendingUp, Target, Star, Eye, Filter, SortAsc, Users, Zap, DollarSign } from "lucide-react";

const DraftRoom = () => {
  const [selectedDomains, setSelectedDomains] = useState<string[]>([]);
  const [portfolioValue, setPortfolioValue] = useState(0);
  const [isDrafting, setIsDrafting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const { address } = useAccount();
  const { toast } = useToast();

  useEffect(() => {
    loadRecommendations();
  }, [address]);

  const loadRecommendations = async () => {
    if (!address) {
      setRecommendations(mockDomains);
      setLoading(false);
      return;
    }
    
    setLoading(true);
    try {
      const recs = await priceDiscovery.getAuctionRecommendations(address);
      setRecommendations(recs.length > 0 ? recs : mockDomains);
    } catch (error) {
      console.error('Error loading recommendations:', error);
      setRecommendations(mockDomains);
    } finally {
      setLoading(false);
    }
  };

  const mockDomains = [
    { name: "blockchain.tech", predictedROI: 245, confidence: 92, price: 45000, valuation: { trend: 'bullish' }, recommendation: 'strong_buy' },
    { name: "defi.finance", predictedROI: 178, confidence: 87, price: 78000, valuation: { trend: 'bullish' }, recommendation: 'buy' },
    { name: "gaming.world", predictedROI: 156, confidence: 78, price: 32000, valuation: { trend: 'neutral' }, recommendation: 'buy' },
    { name: "social.app", predictedROI: 203, confidence: 85, price: 56000, valuation: { trend: 'bullish' }, recommendation: 'strong_buy' },
    { name: "ai.tools", predictedROI: 289, confidence: 94, price: 89000, valuation: { trend: 'bullish' }, recommendation: 'strong_buy' },
    { name: "nft.market", predictedROI: 167, confidence: 72, price: 41000, valuation: { trend: 'neutral' }, recommendation: 'buy' },
  ];

  const availableDomains = recommendations.length > 0 ? recommendations : mockDomains;

  const handleSelectDomain = (domain: string, price: number) => {
    if (!selectedDomains.includes(domain)) {
      setSelectedDomains([...selectedDomains, domain]);
      setPortfolioValue(portfolioValue + price);
      
      toast({
        title: "Domain added to portfolio",
        description: `${domain} selected for scouting`
      });
    }
  };

  const handleRemoveDomain = (domain: string) => {
    const domainData = availableDomains.find(d => getDomainName(d) === domain);
    if (domainData) {
      setSelectedDomains(selectedDomains.filter(d => d !== domain));
      setPortfolioValue(portfolioValue - getDomainPrice(domainData));
    }
  };

  const getDomainName = (domain: any) => {
    return domain.name || domain.auction?.domainName || 'Unknown';
  };

  const getDomainPrice = (domain: any) => {
    return domain.price || domain.auction?.currentPrice || 0;
  };

  const searchDomains = async () => {
    if (!searchQuery.trim()) return;
    
    setLoading(true);
    try {
      const results = await domaAPI.searchDomains(searchQuery);
      const withValuations = await Promise.all(
        results.slice(0, 10).map(async (domain) => {
          const valuation = await priceDiscovery.getDomainValuation(domain.name);
          return {
            ...domain,
            predictedROI: ((valuation.predictedValue - valuation.currentValue) / valuation.currentValue) * 100,
            confidence: valuation.confidence,
            price: valuation.currentValue,
            valuation,
            recommendation: valuation.confidence > 80 ? 'strong_buy' : 'buy'
          };
        })
      );
      setRecommendations(withValuations.length > 0 ? withValuations : mockDomains);
    } catch (error) {
      toast({
        title: "Search failed",
        description: "Unable to search domains. Showing mock data.",
        variant: "destructive"
      });
      setRecommendations(mockDomains);
    } finally {
      setLoading(false);
    }
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'bullish': return 'text-green-500';
      case 'bearish': return 'text-red-500';
      default: return 'text-yellow-500';
    }
  };

  const handleDraftPortfolio = async () => {
    if (selectedDomains.length === 0) return;
    
    setIsDrafting(true);
    
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const existingTeam = JSON.parse(localStorage.getItem('draftedDomains') || '[]');
    const newTeamDomains = selectedDomains.map(domainName => {
      const domainData = availableDomains.find(d => getDomainName(d) === domainName);
      if (!domainData) return null;
      
      const positions = ["Striker", "Winger", "CAM", "CM", "CDM", "CB", "LB", "RB", "GK"];
      const randomPosition = positions[Math.floor(Math.random() * positions.length)];
      
      return {
        name: getDomainName(domainData),
        purchasePrice: getDomainPrice(domainData),
        currentValue: getDomainPrice(domainData) * (1 + (Math.random() * 0.4 - 0.2)),
        performance: `${(Math.random() * 40 - 20).toFixed(1)}%`,
        status: Math.random() > 0.5 ? "rising" : "falling",
        confidence: domainData.confidence || Math.floor(Math.random() * 40) + 60,
        goals: Math.floor(Math.random() * 5),
        assists: Math.floor(Math.random() * 3),
        position: randomPosition
      };
    }).filter(Boolean);

    const updatedTeam = [...existingTeam, ...newTeamDomains];
    localStorage.setItem('draftedDomains', JSON.stringify(updatedTeam));
    
    toast({
      title: "Portfolio Drafted!",
      description: `Successfully added ${newTeamDomains.length} domains to your team.`,
    });
    
    setSelectedDomains([]);
    setPortfolioValue(0);
    setIsDrafting(false);
  };

  return (
    <div className="container mx-auto px-6 py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-primary mb-2">Domain Scout</h1>
        <p className="text-muted-foreground">Discover high-potential domains with AI-powered analysis</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <TerminalWindow title="DOMA_SCOUT_v2.1.0">
            <div className="space-y-4">
              <div className="glass p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-2">
                    <Search className="w-5 h-5" />
                    <span className="font-medium">Domain Discovery</span>
                  </div>
                  <Badge variant="outline">{availableDomains.length} Available</Badge>
                </div>
                
                <div className="flex gap-2 mb-4">
                  <Input
                    placeholder="Search domains (e.g., 'ai', 'crypto', 'defi')..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && searchDomains()}
                    className="flex-1"
                  />
                  <Button onClick={searchDomains} disabled={loading}>
                    <Search className="w-4 h-4" />
                  </Button>
                </div>

                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {availableDomains.map((domain, index) => (
                      <div key={index} className="glass-panel p-4 hover:border-primary/50 transition-colors cursor-pointer"
                           onClick={() => handleSelectDomain(getDomainName(domain), getDomainPrice(domain))}>
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-2">
                              <span className="font-medium text-primary">{getDomainName(domain)}</span>
                              <Badge variant={domain.predictedROI > 200 ? "default" : "secondary"} className="text-xs">
                                {Math.round(domain.predictedROI || 0)}% ROI
                              </Badge>
                              {domain.valuation?.trend && (
                                <Badge variant="outline" className={`text-xs ${getTrendColor(domain.valuation.trend)}`}>
                                  <TrendingUp className="w-3 h-3 mr-1" />
                                  {domain.valuation.trend}
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                              <div className="flex items-center space-x-1">
                                <Target className="w-3 h-3" />
                                <span>{domain.confidence || 0}% Confidence</span>
                              </div>
                              <div className="flex items-center space-x-1">
                                <DollarSign className="w-3 h-3" />
                                <span>${getDomainPrice(domain).toLocaleString()}</span>
                              </div>
                              {domain.recommendation && (
                                <Badge variant={domain.recommendation === 'strong_buy' ? 'default' : 'secondary'} className="text-xs">
                                  {domain.recommendation.replace('_', ' ')}
                                </Badge>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-lg font-bold text-terminal-glow">
                              ${getDomainPrice(domain).toLocaleString()}
                            </div>
                            {selectedDomains.includes(getDomainName(domain)) && (
                              <Badge variant="default" className="mt-1">Selected</Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </TerminalWindow>
        </div>

        <div className="space-y-6">
          <Card className="glass border-primary">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Users className="w-5 h-5" />
                <span>Portfolio Draft</span>
              </CardTitle>
              <CardDescription>
                Build your fantasy domain portfolio
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Selected Domains</span>
                  <Badge variant="outline">{selectedDomains.length}</Badge>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Portfolio Value</span>
                  <span className="text-lg font-bold text-terminal-glow">
                    ${portfolioValue.toLocaleString()}
                  </span>
                </div>

                {selectedDomains.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium">Selected:</h4>
                    {selectedDomains.map((domain) => (
                      <div key={domain} className="flex items-center justify-between text-sm">
                        <span className="text-primary">{domain}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveDomain(domain)}
                          className="h-6 w-6 p-0 hover:text-red-500"
                        >
                          ×
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                <Button 
                  onClick={handleDraftPortfolio}
                  disabled={selectedDomains.length === 0 || isDrafting}
                  className="w-full bg-primary hover:bg-primary/90"
                >
                  {isDrafting ? (
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Drafting...</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <Zap className="w-4 h-4" />
                      <span>Draft Portfolio</span>
                    </div>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="glass border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-lg">
                <Star className="w-5 h-5" />
                <span>AI Insights</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                <div className="flex items-start space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                  <p className="text-muted-foreground">
                    <strong className="text-green-500">Bullish signals</strong> detected in AI and DeFi domains
                  </p>
                </div>
                <div className="flex items-start space-x-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                  <p className="text-muted-foreground">
                    <strong className="text-blue-500">Short domains</strong> (≤5 chars) showing premium valuations
                  </p>
                </div>
                <div className="flex items-start space-x-2">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full mt-2"></div>
                  <p className="text-muted-foreground">
                    <strong className="text-yellow-500">.com/.io extensions</strong> maintain highest ROI potential
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default DraftRoom;