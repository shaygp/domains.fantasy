// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";

interface IDomaOracle {
    function getDomainValuation(string memory domain) external view returns (uint256);
    function getMarketTrend() external view returns (int256);
}

contract FantasyDomainsAuction is Ownable, ReentrancyGuard {
    using SafeMath for uint256;

    enum AuctionType { DUTCH, SEALED_BID, GAMIFIED }
    enum AuctionStatus { PENDING, ACTIVE, ENDED, CANCELLED }

    struct Auction {
        string domainName;
        address seller;
        uint256 startPrice;
        uint256 reservePrice;
        uint256 currentPrice;
        uint256 startTime;
        uint256 endTime;
        AuctionType auctionType;
        AuctionStatus status;
        address highestBidder;
        uint256 highestBid;
        uint256 fantasyPoints;
        uint256 priceDecrement;
        mapping(address => uint256) bids;
        mapping(address => bool) hasRevealed;
        address[] bidders;
    }

    struct PlayerStats {
        uint256 totalAuctions;
        uint256 successfulBids;
        uint256 totalSpent;
        uint256 fantasyScore;
        uint256 level;
        uint256 streakBonus;
    }

    mapping(uint256 => Auction) public auctions;
    mapping(address => PlayerStats) public playerStats;
    mapping(string => uint256) public domainToAuctionId;
    mapping(address => uint256[]) public userAuctions;
    
    uint256 public auctionCounter;
    uint256 public platformFee = 250;
    address public domaOracle;
    uint256 public minAuctionDuration = 1 hours;
    uint256 public maxAuctionDuration = 7 days;

    event AuctionCreated(uint256 indexed auctionId, string domainName, address indexed seller, AuctionType auctionType);
    event BidPlaced(uint256 indexed auctionId, address indexed bidder, uint256 amount);
    event AuctionEnded(uint256 indexed auctionId, address indexed winner, uint256 finalPrice);
    event FantasyPointsAwarded(address indexed player, uint256 points, string reason);

    constructor(address _domaOracle) {
        domaOracle = _domaOracle;
    }

    function createDutchAuction(
        string memory _domainName,
        uint256 _startPrice,
        uint256 _reservePrice,
        uint256 _duration,
        uint256 _priceDecrement
    ) external {
        require(_duration >= minAuctionDuration && _duration <= maxAuctionDuration, "Invalid duration");
        require(_startPrice > _reservePrice, "Start price must be higher than reserve");
        require(domainToAuctionId[_domainName] == 0, "Domain already listed");

        uint256 auctionId = ++auctionCounter;
        Auction storage auction = auctions[auctionId];
        
        auction.domainName = _domainName;
        auction.seller = msg.sender;
        auction.startPrice = _startPrice;
        auction.reservePrice = _reservePrice;
        auction.currentPrice = _startPrice;
        auction.startTime = block.timestamp;
        auction.endTime = block.timestamp + _duration;
        auction.auctionType = AuctionType.DUTCH;
        auction.status = AuctionStatus.ACTIVE;
        auction.priceDecrement = _priceDecrement;

        domainToAuctionId[_domainName] = auctionId;
        userAuctions[msg.sender].push(auctionId);

        emit AuctionCreated(auctionId, _domainName, msg.sender, AuctionType.DUTCH);
    }

    function createSealedBidAuction(
        string memory _domainName,
        uint256 _reservePrice,
        uint256 _duration
    ) external {
        require(_duration >= minAuctionDuration && _duration <= maxAuctionDuration, "Invalid duration");
        require(domainToAuctionId[_domainName] == 0, "Domain already listed");

        uint256 auctionId = ++auctionCounter;
        Auction storage auction = auctions[auctionId];
        
        auction.domainName = _domainName;
        auction.seller = msg.sender;
        auction.reservePrice = _reservePrice;
        auction.startTime = block.timestamp;
        auction.endTime = block.timestamp + _duration;
        auction.auctionType = AuctionType.SEALED_BID;
        auction.status = AuctionStatus.ACTIVE;

        domainToAuctionId[_domainName] = auctionId;
        userAuctions[msg.sender].push(auctionId);

        emit AuctionCreated(auctionId, _domainName, msg.sender, AuctionType.SEALED_BID);
    }

    function createGamifiedAuction(
        string memory _domainName,
        uint256 _startPrice,
        uint256 _duration,
        uint256 _fantasyPoints
    ) external {
        require(_duration >= minAuctionDuration && _duration <= maxAuctionDuration, "Invalid duration");
        require(domainToAuctionId[_domainName] == 0, "Domain already listed");

        uint256 auctionId = ++auctionCounter;
        Auction storage auction = auctions[auctionId];
        
        auction.domainName = _domainName;
        auction.seller = msg.sender;
        auction.startPrice = _startPrice;
        auction.currentPrice = _startPrice;
        auction.startTime = block.timestamp;
        auction.endTime = block.timestamp + _duration;
        auction.auctionType = AuctionType.GAMIFIED;
        auction.status = AuctionStatus.ACTIVE;
        auction.fantasyPoints = _fantasyPoints;

        domainToAuctionId[_domainName] = auctionId;
        userAuctions[msg.sender].push(auctionId);

        emit AuctionCreated(auctionId, _domainName, msg.sender, AuctionType.GAMIFIED);
    }

    function getCurrentDutchPrice(uint256 _auctionId) public view returns (uint256) {
        Auction storage auction = auctions[_auctionId];
        require(auction.auctionType == AuctionType.DUTCH, "Not a Dutch auction");
        
        if (auction.status != AuctionStatus.ACTIVE) {
            return auction.currentPrice;
        }

        uint256 elapsed = block.timestamp - auction.startTime;
        uint256 totalDuration = auction.endTime - auction.startTime;
        uint256 priceReduction = elapsed.mul(auction.priceDecrement).div(totalDuration);
        
        uint256 currentPrice = auction.startPrice > priceReduction 
            ? auction.startPrice - priceReduction 
            : auction.reservePrice;
            
        return currentPrice < auction.reservePrice ? auction.reservePrice : currentPrice;
    }

    function placeDutchBid(uint256 _auctionId) external payable nonReentrant {
        Auction storage auction = auctions[_auctionId];
        require(auction.status == AuctionStatus.ACTIVE, "Auction not active");
        require(auction.auctionType == AuctionType.DUTCH, "Not a Dutch auction");
        require(block.timestamp < auction.endTime, "Auction ended");

        uint256 currentPrice = getCurrentDutchPrice(_auctionId);
        require(msg.value >= currentPrice, "Insufficient bid amount");

        auction.status = AuctionStatus.ENDED;
        auction.highestBidder = msg.sender;
        auction.highestBid = msg.value;
        auction.currentPrice = currentPrice;

        PlayerStats storage stats = playerStats[msg.sender];
        stats.totalAuctions++;
        stats.successfulBids++;
        stats.totalSpent += msg.value;
        
        uint256 speedBonus = calculateSpeedBonus(_auctionId);
        stats.fantasyScore += speedBonus;
        
        if (stats.successfulBids % 5 == 0) {
            stats.level++;
            stats.fantasyScore += 1000;
            emit FantasyPointsAwarded(msg.sender, 1000, "Level up bonus");
        }

        uint256 fee = msg.value.mul(platformFee).div(10000);
        payable(auction.seller).transfer(msg.value - fee);

        if (msg.value > currentPrice) {
            payable(msg.sender).transfer(msg.value - currentPrice);
        }

        emit BidPlaced(_auctionId, msg.sender, currentPrice);
        emit AuctionEnded(_auctionId, msg.sender, currentPrice);
    }

    function placeSealedBid(uint256 _auctionId, bytes32 _bidHash) external {
        Auction storage auction = auctions[_auctionId];
        require(auction.status == AuctionStatus.ACTIVE, "Auction not active");
        require(auction.auctionType == AuctionType.SEALED_BID, "Not a sealed bid auction");
        require(block.timestamp < auction.endTime, "Bidding period ended");
        require(auction.bids[msg.sender] == 0, "Already placed bid");

        auction.bidders.push(msg.sender);
    }

    function revealSealedBid(uint256 _auctionId, uint256 _bidAmount, uint256 _nonce) external payable {
        Auction storage auction = auctions[_auctionId];
        require(auction.auctionType == AuctionType.SEALED_BID, "Not a sealed bid auction");
        require(block.timestamp >= auction.endTime, "Reveal phase not started");
        require(block.timestamp < auction.endTime + 1 hours, "Reveal phase ended");
        require(!auction.hasRevealed[msg.sender], "Already revealed");
        require(msg.value == _bidAmount, "Bid amount mismatch");

        bytes32 bidHash = keccak256(abi.encodePacked(_bidAmount, _nonce, msg.sender));
        
        auction.bids[msg.sender] = _bidAmount;
        auction.hasRevealed[msg.sender] = true;

        if (_bidAmount > auction.highestBid && _bidAmount >= auction.reservePrice) {
            if (auction.highestBidder != address(0)) {
                payable(auction.highestBidder).transfer(auction.highestBid);
            }
            auction.highestBid = _bidAmount;
            auction.highestBidder = msg.sender;
        } else {
            payable(msg.sender).transfer(_bidAmount);
        }

        emit BidPlaced(_auctionId, msg.sender, _bidAmount);
    }

    function placeGamifiedBid(uint256 _auctionId) external payable nonReentrant {
        Auction storage auction = auctions[_auctionId];
        require(auction.status == AuctionStatus.ACTIVE, "Auction not active");
        require(auction.auctionType == AuctionType.GAMIFIED, "Not a gamified auction");
        require(block.timestamp < auction.endTime, "Auction ended");
        require(msg.value > auction.highestBid, "Bid too low");

        if (auction.highestBidder != address(0)) {
            payable(auction.highestBidder).transfer(auction.highestBid);
        }

        auction.highestBid = msg.value;
        auction.highestBidder = msg.sender;

        PlayerStats storage stats = playerStats[msg.sender];
        uint256 bonusPoints = calculateGamifiedBonus(_auctionId, msg.value);
        stats.fantasyScore += bonusPoints + auction.fantasyPoints;

        if (isComboMove(msg.sender)) {
            stats.streakBonus++;
            uint256 comboPoints = stats.streakBonus * 100;
            stats.fantasyScore += comboPoints;
            emit FantasyPointsAwarded(msg.sender, comboPoints, "Combo streak");
        }

        emit BidPlaced(_auctionId, msg.sender, msg.value);
        emit FantasyPointsAwarded(msg.sender, bonusPoints, "Gamified bid bonus");
    }

    function endAuction(uint256 _auctionId) external nonReentrant {
        Auction storage auction = auctions[_auctionId];
        require(auction.status == AuctionStatus.ACTIVE, "Auction not active");
        require(block.timestamp >= auction.endTime, "Auction not ended");

        auction.status = AuctionStatus.ENDED;

        if (auction.highestBidder != address(0)) {
            uint256 fee = auction.highestBid.mul(platformFee).div(10000);
            payable(auction.seller).transfer(auction.highestBid - fee);

            PlayerStats storage winnerStats = playerStats[auction.highestBidder];
            winnerStats.successfulBids++;
            winnerStats.totalSpent += auction.highestBid;
            
            uint256 winBonus = 500;
            winnerStats.fantasyScore += winBonus;
            emit FantasyPointsAwarded(auction.highestBidder, winBonus, "Auction won");
        }

        emit AuctionEnded(_auctionId, auction.highestBidder, auction.highestBid);
    }

    function calculateSpeedBonus(uint256 _auctionId) private view returns (uint256) {
        Auction storage auction = auctions[_auctionId];
        uint256 elapsed = block.timestamp - auction.startTime;
        uint256 duration = auction.endTime - auction.startTime;
        uint256 speedRatio = duration.sub(elapsed).mul(100).div(duration);
        return speedRatio.mul(10);
    }

    function calculateGamifiedBonus(uint256 _auctionId, uint256 _bidAmount) private view returns (uint256) {
        uint256 oracleValuation = IDomaOracle(domaOracle).getDomainValuation(auctions[_auctionId].domainName);
        int256 marketTrend = IDomaOracle(domaOracle).getMarketTrend();
        
        uint256 basePoints = 100;
        if (_bidAmount > oracleValuation) {
            basePoints += (_bidAmount - oracleValuation).mul(10).div(oracleValuation);
        }
        
        if (marketTrend > 0) {
            basePoints = basePoints.mul(uint256(100 + marketTrend)).div(100);
        }
        
        return basePoints;
    }

    function isComboMove(address _player) private view returns (bool) {
        uint256[] memory recentAuctions = userAuctions[_player];
        if (recentAuctions.length < 3) return false;
        
        uint256 recentWins = 0;
        for (uint256 i = recentAuctions.length - 1; i >= recentAuctions.length - 3 && i >= 0; i--) {
            if (auctions[recentAuctions[i]].highestBidder == _player) {
                recentWins++;
            }
        }
        
        return recentWins >= 2;
    }

    function getPlayerLevel(address _player) external view returns (uint256) {
        return playerStats[_player].level;
    }

    function getActiveAuctions() external view returns (uint256[] memory) {
        uint256 activeCount = 0;
        for (uint256 i = 1; i <= auctionCounter; i++) {
            if (auctions[i].status == AuctionStatus.ACTIVE) {
                activeCount++;
            }
        }
        
        uint256[] memory activeIds = new uint256[](activeCount);
        uint256 index = 0;
        for (uint256 i = 1; i <= auctionCounter; i++) {
            if (auctions[i].status == AuctionStatus.ACTIVE) {
                activeIds[index++] = i;
            }
        }
        
        return activeIds;
    }

    function withdrawFees() external onlyOwner {
        payable(owner()).transfer(address(this).balance);
    }

    function updatePlatformFee(uint256 _newFee) external onlyOwner {
        require(_newFee <= 500, "Fee too high");
        platformFee = _newFee;
    }

    function updateOracle(address _newOracle) external onlyOwner {
        domaOracle = _newOracle;
    }
}