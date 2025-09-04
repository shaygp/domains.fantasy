import { ethers } from 'ethers';
import { useAccount, usePublicClient, useWalletClient } from 'wagmi';

const AUCTION_CONTRACT_ADDRESS = '0x0000000000000000000000000000000000000000';
const DOMAIN_REGISTRY_ADDRESS = '0x0000000000000000000000000000000000000000';

const AUCTION_ABI = [
  "function createDutchAuction(string memory _domainName, uint256 _startPrice, uint256 _reservePrice, uint256 _duration, uint256 _priceDecrement) external returns (uint256)",
  "function createSealedBidAuction(string memory _domainName, uint256 _reservePrice, uint256 _duration) external returns (uint256)",
  "function createGamifiedAuction(string memory _domainName, uint256 _startPrice, uint256 _duration, uint256 _fantasyPointsMultiplier) external returns (uint256)",
  "function placeDutchBid(uint256 _auctionId) external payable",
  "function placeGamifiedBid(uint256 _auctionId) external payable",
  "function placeSealedBidHash(uint256 _auctionId, bytes32 _bidHash) external",
  "function revealSealedBid(uint256 _auctionId, uint256 _bidAmount, uint256 _nonce) external payable",
  "function endAuction(uint256 _auctionId) external",
  "function getCurrentDutchPrice(uint256 _auctionId) external view returns (uint256)",
  "function getActiveAuctions() external view returns (uint256[] memory)",
  "function getAuctionBids(uint256 _auctionId) external view returns (address[] memory bidders, uint256[] memory amounts, uint256[] memory timestamps)",
  "function getPlayerLevel(address _player) external view returns (uint256)",
  "function getPlayerFantasyScore(address _player) external view returns (uint256)",
  "function auctions(uint256) external view returns (string memory domainName, address seller, uint256 startPrice, uint256 reservePrice, uint256 currentPrice, uint256 startTime, uint256 endTime, uint8 auctionType, uint8 status, address highestBidder, uint256 highestBid, uint256 fantasyPoints, uint256 priceDecrement, uint256 totalBids)",
  "function playerStats(address) external view returns (uint256 totalAuctions, uint256 successfulBids, uint256 totalSpent, uint256 fantasyScore, uint256 level, uint256 streakBonus, uint256 lastBidTime)",
  "event AuctionCreated(uint256 indexed auctionId, string domainName, address indexed seller, uint8 auctionType)",
  "event BidPlaced(uint256 indexed auctionId, address indexed bidder, uint256 amount, uint256 fantasyPoints)",
  "event AuctionEnded(uint256 indexed auctionId, address indexed winner, uint256 finalPrice)",
  "event FantasyPointsAwarded(address indexed player, uint256 points, string reason)",
  "event PlayerLevelUp(address indexed player, uint256 newLevel)"
];

const DOMAIN_REGISTRY_ABI = [
  "function registerDomain(string memory _name, uint256 _duration) external payable returns (uint256)",
  "function renewDomain(uint256 _tokenId, uint256 _duration) external payable",
  "function transferDomain(address _to, uint256 _tokenId) external",
  "function setDomainMetadata(uint256 _tokenId, string memory _key, string memory _value) external",
  "function getDomainMetadata(uint256 _tokenId, string memory _key) external view returns (string memory)",
  "function isDomainExpired(uint256 _tokenId) external view returns (bool)",
  "function getExpiringDomains(uint256 _days) external view returns (uint256[] memory)",
  "function listDomainForAuction(uint256 _tokenId) external",
  "function ownerOf(uint256 tokenId) external view returns (address)",
  "function domains(uint256) external view returns (string memory name, uint256 expiryDate, bool isActive, uint256 renewalPrice, address registrar, uint256 registrationDate)",
  "function domainNameToId(string memory) external view returns (uint256)",
  "function registrationFee() external view returns (uint256)",
  "function renewalFee() external view returns (uint256)",
  "event DomainRegistered(uint256 indexed tokenId, string name, address indexed owner, uint256 expiryDate)",
  "event DomainRenewed(uint256 indexed tokenId, uint256 newExpiryDate)",
  "event DomainTransferred(uint256 indexed tokenId, address indexed from, address indexed to)"
];

export interface ContractAuction {
  id: number;
  domainName: string;
  seller: string;
  startPrice: bigint;
  reservePrice: bigint;
  currentPrice: bigint;
  startTime: number;
  endTime: number;
  auctionType: number;
  status: number;
  highestBidder: string;
  highestBid: bigint;
  fantasyPoints: bigint;
  totalBids: number;
}

export interface ContractPlayerStats {
  totalAuctions: number;
  successfulBids: number;
  totalSpent: bigint;
  fantasyScore: number;
  level: number;
  streakBonus: number;
  lastBidTime: number;
}

export interface ContractDomain {
  tokenId: number;
  name: string;
  expiryDate: number;
  isActive: boolean;
  renewalPrice: bigint;
  registrar: string;
  registrationDate: number;
}

class ContractService {
  private getProvider() {
    if (typeof window !== 'undefined' && window.ethereum) {
      return new ethers.BrowserProvider(window.ethereum);
    }
    return new ethers.JsonRpcProvider(process.env.VITE_RPC_URL || 'http://localhost:8545');
  }

  private async getSigner() {
    const provider = this.getProvider();
    return await provider.getSigner();
  }

  private getAuctionContract(withSigner: boolean = false) {
    const provider = this.getProvider();
    if (withSigner) {
      return this.getSigner().then(signer => 
        new ethers.Contract(AUCTION_CONTRACT_ADDRESS, AUCTION_ABI, signer)
      );
    }
    return new ethers.Contract(AUCTION_CONTRACT_ADDRESS, AUCTION_ABI, provider);
  }

  private getDomainRegistryContract(withSigner: boolean = false) {
    const provider = this.getProvider();
    if (withSigner) {
      return this.getSigner().then(signer => 
        new ethers.Contract(DOMAIN_REGISTRY_ADDRESS, DOMAIN_REGISTRY_ABI, signer)
      );
    }
    return new ethers.Contract(DOMAIN_REGISTRY_ADDRESS, DOMAIN_REGISTRY_ABI, provider);
  }

  async createDutchAuction(
    domainName: string,
    startPrice: string,
    reservePrice: string,
    duration: number,
    priceDecrement: string
  ): Promise<string> {
    try {
      const contract = await this.getAuctionContract(true);
      const startPriceWei = ethers.parseEther(startPrice);
      const reservePriceWei = ethers.parseEther(reservePrice);
      const priceDecrementWei = ethers.parseEther(priceDecrement);

      const tx = await contract.createDutchAuction(
        domainName,
        startPriceWei,
        reservePriceWei,
        duration,
        priceDecrementWei
      );

      await tx.wait();
      return tx.hash;
    } catch (error) {
      console.error('Error creating Dutch auction:', error);
      throw error;
    }
  }

  async createGamifiedAuction(
    domainName: string,
    startPrice: string,
    duration: number,
    multiplier: number = 2
  ): Promise<string> {
    try {
      const contract = await this.getAuctionContract(true);
      const startPriceWei = ethers.parseEther(startPrice);

      const tx = await contract.createGamifiedAuction(
        domainName,
        startPriceWei,
        duration,
        multiplier
      );

      await tx.wait();
      return tx.hash;
    } catch (error) {
      console.error('Error creating gamified auction:', error);
      throw error;
    }
  }

  async createSealedBidAuction(
    domainName: string,
    reservePrice: string,
    duration: number
  ): Promise<string> {
    try {
      const contract = await this.getAuctionContract(true);
      const reservePriceWei = ethers.parseEther(reservePrice);

      const tx = await contract.createSealedBidAuction(
        domainName,
        reservePriceWei,
        duration
      );

      await tx.wait();
      return tx.hash;
    } catch (error) {
      console.error('Error creating sealed bid auction:', error);
      throw error;
    }
  }

  async placeDutchBid(auctionId: number): Promise<string> {
    try {
      const contract = await this.getAuctionContract(true);
      const readContract = this.getAuctionContract(false);
      
      const currentPrice = await readContract.getCurrentDutchPrice(auctionId);
      const tx = await contract.placeDutchBid(auctionId, { value: currentPrice });
      
      await tx.wait();
      return tx.hash;
    } catch (error) {
      console.error('Error placing Dutch bid:', error);
      throw error;
    }
  }

  async placeGamifiedBid(auctionId: number, bidAmount: string): Promise<string> {
    try {
      const contract = await this.getAuctionContract(true);
      const bidAmountWei = ethers.parseEther(bidAmount);

      const tx = await contract.placeGamifiedBid(auctionId, { value: bidAmountWei });
      
      await tx.wait();
      return tx.hash;
    } catch (error) {
      console.error('Error placing gamified bid:', error);
      throw error;
    }
  }

  async placeSealedBidHash(auctionId: number, bidAmount: string, nonce: number): Promise<string> {
    try {
      const contract = await this.getAuctionContract(true);
      const signer = await this.getSigner();
      const address = await signer.getAddress();
      
      const bidHash = ethers.keccak256(
        ethers.AbiCoder.defaultAbiCoder().encode(
          ['uint256', 'uint256', 'address'],
          [ethers.parseEther(bidAmount), nonce, address]
        )
      );

      const tx = await contract.placeSealedBidHash(auctionId, bidHash);
      await tx.wait();
      return tx.hash;
    } catch (error) {
      console.error('Error placing sealed bid hash:', error);
      throw error;
    }
  }

  async revealSealedBid(auctionId: number, bidAmount: string, nonce: number): Promise<string> {
    try {
      const contract = await this.getAuctionContract(true);
      const bidAmountWei = ethers.parseEther(bidAmount);

      const tx = await contract.revealSealedBid(auctionId, bidAmountWei, nonce, { 
        value: bidAmountWei 
      });
      
      await tx.wait();
      return tx.hash;
    } catch (error) {
      console.error('Error revealing sealed bid:', error);
      throw error;
    }
  }

  async getActiveAuctions(): Promise<ContractAuction[]> {
    try {
      const contract = this.getAuctionContract(false);
      const activeIds = await contract.getActiveAuctions();
      
      const auctions = await Promise.all(
        activeIds.map(async (id: bigint) => {
          const auctionData = await contract.auctions(id);
          return {
            id: Number(id),
            domainName: auctionData.domainName,
            seller: auctionData.seller,
            startPrice: auctionData.startPrice,
            reservePrice: auctionData.reservePrice,
            currentPrice: auctionData.currentPrice,
            startTime: Number(auctionData.startTime),
            endTime: Number(auctionData.endTime),
            auctionType: auctionData.auctionType,
            status: auctionData.status,
            highestBidder: auctionData.highestBidder,
            highestBid: auctionData.highestBid,
            fantasyPoints: auctionData.fantasyPoints,
            totalBids: Number(auctionData.totalBids)
          };
        })
      );

      return auctions;
    } catch (error) {
      console.error('Error fetching active auctions:', error);
      return [];
    }
  }

  async getPlayerStats(address: string): Promise<ContractPlayerStats> {
    try {
      const contract = this.getAuctionContract(false);
      const stats = await contract.playerStats(address);
      
      return {
        totalAuctions: Number(stats.totalAuctions),
        successfulBids: Number(stats.successfulBids),
        totalSpent: stats.totalSpent,
        fantasyScore: Number(stats.fantasyScore),
        level: Number(stats.level),
        streakBonus: Number(stats.streakBonus),
        lastBidTime: Number(stats.lastBidTime)
      };
    } catch (error) {
      console.error('Error fetching player stats:', error);
      return {
        totalAuctions: 0,
        successfulBids: 0,
        totalSpent: BigInt(0),
        fantasyScore: 0,
        level: 1,
        streakBonus: 0,
        lastBidTime: 0
      };
    }
  }

  async registerDomain(name: string, duration: number): Promise<string> {
    try {
      const contract = await this.getDomainRegistryContract(true);
      const registrationFee = await contract.registrationFee();

      const tx = await contract.registerDomain(name, duration * 86400, { 
        value: registrationFee 
      });
      
      await tx.wait();
      return tx.hash;
    } catch (error) {
      console.error('Error registering domain:', error);
      throw error;
    }
  }

  async getExpiringDomains(days: number): Promise<ContractDomain[]> {
    try {
      const contract = this.getDomainRegistryContract(false);
      const expiringIds = await contract.getExpiringDomains(days);
      
      const domains = await Promise.all(
        expiringIds.map(async (tokenId: bigint) => {
          const domainData = await contract.domains(tokenId);
          return {
            tokenId: Number(tokenId),
            name: domainData.name,
            expiryDate: Number(domainData.expiryDate),
            isActive: domainData.isActive,
            renewalPrice: domainData.renewalPrice,
            registrar: domainData.registrar,
            registrationDate: Number(domainData.registrationDate)
          };
        })
      );

      return domains;
    } catch (error) {
      console.error('Error fetching expiring domains:', error);
      return [];
    }
  }

  async getCurrentDutchPrice(auctionId: number): Promise<string> {
    try {
      const contract = this.getAuctionContract(false);
      const price = await contract.getCurrentDutchPrice(auctionId);
      return ethers.formatEther(price);
    } catch (error) {
      console.error('Error getting Dutch price:', error);
      return '0';
    }
  }

  subscribeToAuctionEvents(callback: (event: any) => void) {
    const contract = this.getAuctionContract(false);
    
    const handlers = {
      onBidPlaced: (auctionId: bigint, bidder: string, amount: bigint, fantasyPoints: bigint) => {
        callback({
          type: 'BidPlaced',
          auctionId: Number(auctionId),
          bidder,
          amount: ethers.formatEther(amount),
          fantasyPoints: Number(fantasyPoints)
        });
      },
      onAuctionEnded: (auctionId: bigint, winner: string, finalPrice: bigint) => {
        callback({
          type: 'AuctionEnded',
          auctionId: Number(auctionId),
          winner,
          finalPrice: ethers.formatEther(finalPrice)
        });
      },
      onPlayerLevelUp: (player: string, newLevel: bigint) => {
        callback({
          type: 'PlayerLevelUp',
          player,
          newLevel: Number(newLevel)
        });
      }
    };

    contract.on('BidPlaced', handlers.onBidPlaced);
    contract.on('AuctionEnded', handlers.onAuctionEnded);
    contract.on('PlayerLevelUp', handlers.onPlayerLevelUp);

    return () => {
      contract.off('BidPlaced', handlers.onBidPlaced);
      contract.off('AuctionEnded', handlers.onAuctionEnded);
      contract.off('PlayerLevelUp', handlers.onPlayerLevelUp);
    };
  }
}

export const contractService = new ContractService();