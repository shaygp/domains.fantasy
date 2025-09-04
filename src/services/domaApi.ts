import axios from 'axios';

const DOMA_API_KEY = 'v1.808b5a871e7e1a1adb617fa3afde5961be1745366a3b836dcc3492a53913db17';
const DOMA_API_BASE_URL = 'https://api.doma.xyz';
const DOMA_SUBGRAPH_URL = 'https://subgraph.doma.xyz';

const domaClient = axios.create({
  baseURL: DOMA_API_BASE_URL,
  headers: {
    'Authorization': `Bearer ${DOMA_API_KEY}`,
    'Content-Type': 'application/json'
  }
});

export interface Domain {
  id: string;
  name: string;
  tokenId: string;
  owner: string;
  price: number;
  expiryDate: string;
  status: 'available' | 'tokenized' | 'auction' | 'sold';
  metadata?: {
    valuation: number;
    trend: number;
    volume24h: number;
  };
}

export interface Auction {
  id: string;
  domainId: string;
  domainName: string;
  seller: string;
  type: 'dutch' | 'sealed' | 'gamified';
  startPrice: number;
  currentPrice: number;
  reservePrice?: number;
  startTime: Date;
  endTime: Date;
  status: 'active' | 'ended' | 'cancelled';
  bids: Bid[];
  fantasyPoints?: number;
}

export interface Bid {
  id: string;
  bidder: string;
  amount: number;
  timestamp: Date;
  isWinning: boolean;
}

export interface PlayerStats {
  address: string;
  fantasyScore: number;
  level: number;
  totalAuctions: number;
  successfulBids: number;
  totalSpent: number;
  streakBonus: number;
  achievements: string[];
}

class DomaAPIService {
  async tokenizeDomain(domainName: string, ownerAddress: string) {
    try {
      const response = await domaClient.post('/domains/tokenize', {
        domain: domainName,
        owner: ownerAddress
      });
      return response.data;
    } catch (error) {
      console.error('Error tokenizing domain:', error);
      throw error;
    }
  }

  async getDomainValuation(domainName: string): Promise<number> {
    try {
      const response = await domaClient.get(`/oracle/valuation/${domainName}`);
      return response.data.valuation;
    } catch (error) {
      console.error('Error getting domain valuation:', error);
      return 0;
    }
  }

  async getMarketTrends(): Promise<any> {
    try {
      const response = await domaClient.get('/oracle/trends');
      return response.data;
    } catch (error) {
      console.error('Error getting market trends:', error);
      return { trend: 0, volume: 0 };
    }
  }

  async createAuction(auction: {
    domainName: string;
    type: 'dutch' | 'sealed' | 'gamified';
    startPrice: number;
    reservePrice?: number;
    duration: number;
    fantasyPoints?: number;
  }) {
    try {
      const response = await domaClient.post('/marketplace/auctions', auction);
      return response.data;
    } catch (error) {
      console.error('Error creating auction:', error);
      throw error;
    }
  }

  async getActiveAuctions(): Promise<Auction[]> {
    try {
      const response = await domaClient.get('/marketplace/auctions/active');
      return response.data.auctions || [];
    } catch (error) {
      console.error('Error fetching auctions:', error);
      return [];
    }
  }

  async placeBid(auctionId: string, amount: number, bidderAddress: string) {
    try {
      const response = await domaClient.post(`/marketplace/auctions/${auctionId}/bid`, {
        amount,
        bidder: bidderAddress
      });
      return response.data;
    } catch (error) {
      console.error('Error placing bid:', error);
      throw error;
    }
  }

  async getAuctionDetails(auctionId: string): Promise<Auction | null> {
    try {
      const response = await domaClient.get(`/marketplace/auctions/${auctionId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching auction details:', error);
      return null;
    }
  }

  async getPlayerStats(address: string): Promise<PlayerStats> {
    try {
      const response = await domaClient.get(`/fantasy/stats/${address}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching player stats:', error);
      return {
        address,
        fantasyScore: 0,
        level: 1,
        totalAuctions: 0,
        successfulBids: 0,
        totalSpent: 0,
        streakBonus: 0,
        achievements: []
      };
    }
  }

  async getLeaderboard(limit: number = 100): Promise<PlayerStats[]> {
    try {
      const response = await domaClient.get(`/fantasy/leaderboard?limit=${limit}`);
      return response.data.players || [];
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
      return [];
    }
  }

  async searchDomains(query: string): Promise<Domain[]> {
    try {
      const response = await domaClient.get(`/domains/search?q=${query}`);
      return response.data.domains || [];
    } catch (error) {
      console.error('Error searching domains:', error);
      return [];
    }
  }

  async getExpiringDomains(days: number = 7): Promise<Domain[]> {
    try {
      const response = await domaClient.get(`/domains/expiring?days=${days}`);
      return response.data.domains || [];
    } catch (error) {
      console.error('Error fetching expiring domains:', error);
      return [];
    }
  }

  subscribeToAuctionUpdates(auctionId: string, callback: (update: any) => void) {
    const eventSource = new EventSource(
      `${DOMA_API_BASE_URL}/marketplace/auctions/${auctionId}/stream?apiKey=${DOMA_API_KEY}`
    );

    eventSource.onmessage = (event) => {
      const update = JSON.parse(event.data);
      callback(update);
    };

    return () => eventSource.close();
  }

  async calculateFantasyPoints(action: string, params: any): Promise<number> {
    try {
      const response = await domaClient.post('/fantasy/calculate', {
        action,
        params
      });
      return response.data.points;
    } catch (error) {
      console.error('Error calculating fantasy points:', error);
      return 0;
    }
  }
}

export const domaAPI = new DomaAPIService();