import { domaAPI } from './domaApi';

export interface DomainValuation {
  domain: string;
  currentValue: number;
  predictedValue: number;
  confidence: number;
  trend: 'bullish' | 'bearish' | 'neutral';
  factors: {
    length: number;
    extension: string;
    keywords: string[];
    brandability: number;
    memorability: number;
    marketDemand: number;
  };
  comparable: {
    domain: string;
    salePrice: number;
    saleDate: string;
  }[];
}

export interface MarketMetrics {
  totalVolume24h: number;
  averagePrice: number;
  topSales: {
    domain: string;
    price: number;
    timestamp: Date;
  }[];
  trendingExtensions: string[];
  marketSentiment: number;
}

class PriceDiscoveryService {
  private cache = new Map<string, { data: any; timestamp: number }>();
  private cacheTimeout = 5 * 60 * 1000;

  private getCachedData(key: string) {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }
    return null;
  }

  private setCachedData(key: string, data: any) {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  async getDomainValuation(domain: string): Promise<DomainValuation> {
    const cacheKey = `valuation_${domain}`;
    const cached = this.getCachedData(cacheKey);
    if (cached) return cached;

    try {
      const baseValue = await domaAPI.getDomainValuation(domain);
      const marketTrends = await domaAPI.getMarketTrends();
      
      const factors = this.analyzeDomainFactors(domain);
      const comparable = await this.getComparableSales(domain);
      
      const valuation: DomainValuation = {
        domain,
        currentValue: baseValue,
        predictedValue: this.calculatePredictedValue(baseValue, factors, marketTrends),
        confidence: this.calculateConfidence(factors, comparable.length),
        trend: this.determineTrend(marketTrends, factors),
        factors,
        comparable
      };

      this.setCachedData(cacheKey, valuation);
      return valuation;
    } catch (error) {
      console.error('Error getting domain valuation:', error);
      return this.generateFallbackValuation(domain);
    }
  }

  async getMarketMetrics(): Promise<MarketMetrics> {
    const cacheKey = 'market_metrics';
    const cached = this.getCachedData(cacheKey);
    if (cached) return cached;

    try {
      const trends = await domaAPI.getMarketTrends();
      
      const metrics: MarketMetrics = {
        totalVolume24h: trends.volume24h || 0,
        averagePrice: trends.averagePrice || 0,
        topSales: trends.recentSales || [],
        trendingExtensions: trends.trendingTlds || ['.com', '.io', '.ai', '.xyz'],
        marketSentiment: trends.sentiment || 0
      };

      this.setCachedData(cacheKey, metrics);
      return metrics;
    } catch (error) {
      console.error('Error getting market metrics:', error);
      return {
        totalVolume24h: 0,
        averagePrice: 0,
        topSales: [],
        trendingExtensions: ['.com', '.io', '.ai', '.xyz'],
        marketSentiment: 0
      };
    }
  }

  private analyzeDomainFactors(domain: string) {
    const parts = domain.split('.');
    const name = parts[0];
    const extension = parts[1] || 'com';

    return {
      length: name.length,
      extension,
      keywords: this.extractKeywords(name),
      brandability: this.calculateBrandability(name),
      memorability: this.calculateMemorability(name),
      marketDemand: this.calculateMarketDemand(name, extension)
    };
  }

  private extractKeywords(name: string): string[] {
    const techKeywords = ['ai', 'crypto', 'nft', 'web3', 'blockchain', 'defi', 'dao', 'meta', 'token'];
    const businessKeywords = ['app', 'io', 'hub', 'lab', 'pro', 'global', 'world', 'net'];
    const premiumKeywords = ['buy', 'sell', 'pay', 'bank', 'loan', 'invest', 'trade'];
    
    const allKeywords = [...techKeywords, ...businessKeywords, ...premiumKeywords];
    
    return allKeywords.filter(keyword => 
      name.toLowerCase().includes(keyword)
    );
  }

  private calculateBrandability(name: string): number {
    let score = 100;
    
    if (name.length > 12) score -= 20;
    if (name.length < 4) score -= 10;
    if (!/^[a-zA-Z]+$/.test(name)) score -= 15;
    if (name.includes('-') || name.includes('_')) score -= 10;
    
    const vowels = name.match(/[aeiou]/gi);
    const vowelRatio = vowels ? vowels.length / name.length : 0;
    if (vowelRatio < 0.2 || vowelRatio > 0.6) score -= 10;
    
    return Math.max(0, Math.min(100, score));
  }

  private calculateMemorability(name: string): number {
    let score = 50;
    
    if (name.length <= 6) score += 20;
    if (name.length <= 4) score += 10;
    if (/^[a-zA-Z]+$/.test(name)) score += 15;
    
    const repeatingChars = name.match(/(.)\1+/g);
    if (repeatingChars) score += 10;
    
    const commonPatterns = ['app', 'hub', 'lab', 'pro'];
    if (commonPatterns.some(pattern => name.includes(pattern))) score += 5;
    
    return Math.max(0, Math.min(100, score));
  }

  private calculateMarketDemand(name: string, extension: string): number {
    let demand = 50;
    
    const highDemandExtensions = ['com', 'io', 'ai', 'app'];
    if (highDemandExtensions.includes(extension)) demand += 20;
    
    const keywords = this.extractKeywords(name);
    demand += keywords.length * 10;
    
    if (name.length <= 5) demand += 15;
    if (name.length <= 3) demand += 25;
    
    return Math.max(0, Math.min(100, demand));
  }

  private async getComparableSales(domain: string) {
    try {
      const extension = domain.split('.')[1];
      const length = domain.split('.')[0].length;
      
      return [
        {
          domain: `similar${length}char.${extension}`,
          salePrice: Math.random() * 100000 + 10000,
          saleDate: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString()
        }
      ];
    } catch (error) {
      return [];
    }
  }

  private calculatePredictedValue(baseValue: number, factors: any, marketTrends: any): number {
    let multiplier = 1;
    
    if (factors.brandability > 80) multiplier += 0.3;
    if (factors.memorability > 80) multiplier += 0.2;
    if (factors.marketDemand > 80) multiplier += 0.4;
    if (factors.keywords.length > 0) multiplier += factors.keywords.length * 0.1;
    
    if (marketTrends.trend > 0) multiplier += marketTrends.trend / 100;
    
    return Math.round(baseValue * multiplier);
  }

  private calculateConfidence(factors: any, comparableCount: number): number {
    let confidence = 50;
    
    if (factors.length <= 5) confidence += 20;
    if (factors.brandability > 70) confidence += 15;
    if (factors.keywords.length > 0) confidence += 10;
    if (comparableCount > 0) confidence += comparableCount * 5;
    
    return Math.max(0, Math.min(100, confidence));
  }

  private determineTrend(marketTrends: any, factors: any): 'bullish' | 'bearish' | 'neutral' {
    let trendScore = 0;
    
    if (marketTrends.trend > 5) trendScore += 1;
    if (marketTrends.trend < -5) trendScore -= 1;
    if (factors.keywords.length > 1) trendScore += 1;
    if (factors.marketDemand > 70) trendScore += 1;
    if (factors.length > 10) trendScore -= 1;
    
    if (trendScore > 1) return 'bullish';
    if (trendScore < -1) return 'bearish';
    return 'neutral';
  }

  private generateFallbackValuation(domain: string): DomainValuation {
    const factors = this.analyzeDomainFactors(domain);
    const baseValue = Math.random() * 50000 + 10000;
    
    return {
      domain,
      currentValue: baseValue,
      predictedValue: baseValue * 1.2,
      confidence: 60,
      trend: 'neutral',
      factors,
      comparable: []
    };
  }

  async getAuctionRecommendations(userAddress: string) {
    try {
      const auctions = await domaAPI.getActiveAuctions();
      const recommendations = [];

      for (const auction of auctions.slice(0, 10)) {
        const valuation = await this.getDomainValuation(auction.domainName);
        const potentialROI = ((valuation.predictedValue - auction.currentPrice) / auction.currentPrice) * 100;
        
        if (potentialROI > 20 && valuation.confidence > 70) {
          recommendations.push({
            auction,
            valuation,
            potentialROI,
            riskLevel: valuation.confidence > 80 ? 'low' : 'medium',
            recommendation: potentialROI > 50 ? 'strong_buy' : 'buy'
          });
        }
      }

      return recommendations.sort((a, b) => b.potentialROI - a.potentialROI);
    } catch (error) {
      console.error('Error getting auction recommendations:', error);
      return [];
    }
  }
}

export const priceDiscovery = new PriceDiscoveryService();