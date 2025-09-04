// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

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
        uint256 totalBids;
    }

    struct PlayerStats {
        uint256 totalAuctions;
        uint256 successfulBids;
        uint256 totalSpent;
        uint256 fantasyScore;
        uint256 level;
        uint256 streakBonus;
        uint256 lastBidTime;
    }

    struct Bid {
        address bidder;
        uint256 amount;
        uint256 timestamp;
        bytes32 bidHash;
        bool revealed;
    }

    mapping(uint256 => Auction) public auctions;
    mapping(address => PlayerStats) public playerStats;
    mapping(string => uint256) public domainToAuctionId;
    mapping(address => uint256[]) public userAuctions;
    mapping(uint256 => Bid[]) public auctionBids;
    mapping(uint256 => mapping(address => bool)) public hasPlacedBid;
    
    uint256 public auctionCounter;
    uint256 public platformFee = 250;
    uint256 public minAuctionDuration = 1 hours;
    uint256 public maxAuctionDuration = 7 days;
    uint256 public constant FANTASY_POINTS_BASE = 100;

    event AuctionCreated(uint256 indexed auctionId, string domainName, address indexed seller, AuctionType auctionType);
    event BidPlaced(uint256 indexed auctionId, address indexed bidder, uint256 amount, uint256 fantasyPoints);
    event AuctionEnded(uint256 indexed auctionId, address indexed winner, uint256 finalPrice);
    event FantasyPointsAwarded(address indexed player, uint256 points, string reason);
    event PlayerLevelUp(address indexed player, uint256 newLevel);

    constructor() {}

    function createDutchAuction(
        string memory _domainName,
        uint256 _startPrice,
        uint256 _reservePrice,
        uint256 _duration,
        uint256 _priceDecrement
    ) external returns (uint256) {
        require(_duration >= minAuctionDuration && _duration <= maxAuctionDuration, "Invalid duration");
        require(_startPrice > _reservePrice, "Start price must be higher than reserve");
        require(domainToAuctionId[_domainName] == 0, "Domain already listed");
        require(_priceDecrement > 0, "Price decrement must be positive");

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
        auction.fantasyPoints = calculateInitialFantasyPoints(_startPrice);

        domainToAuctionId[_domainName] = auctionId;
        userAuctions[msg.sender].push(auctionId);

        emit AuctionCreated(auctionId, _domainName, msg.sender, AuctionType.DUTCH);
        return auctionId;
    }

    function createSealedBidAuction(
        string memory _domainName,
        uint256 _reservePrice,
        uint256 _duration
    ) external returns (uint256) {
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
        auction.fantasyPoints = calculateInitialFantasyPoints(_reservePrice);

        domainToAuctionId[_domainName] = auctionId;
        userAuctions[msg.sender].push(auctionId);

        emit AuctionCreated(auctionId, _domainName, msg.sender, AuctionType.SEALED_BID);
        return auctionId;
    }

    function createGamifiedAuction(
        string memory _domainName,
        uint256 _startPrice,
        uint256 _duration,
        uint256 _fantasyPointsMultiplier
    ) external returns (uint256) {
        require(_duration >= minAuctionDuration && _duration <= maxAuctionDuration, "Invalid duration");
        require(domainToAuctionId[_domainName] == 0, "Domain already listed");
        require(_fantasyPointsMultiplier >= 1 && _fantasyPointsMultiplier <= 5, "Invalid multiplier");

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
        auction.fantasyPoints = calculateInitialFantasyPoints(_startPrice).mul(_fantasyPointsMultiplier);

        domainToAuctionId[_domainName] = auctionId;
        userAuctions[msg.sender].push(auctionId);

        emit AuctionCreated(auctionId, _domainName, msg.sender, AuctionType.GAMIFIED);
        return auctionId;
    }

    function getCurrentDutchPrice(uint256 _auctionId) public view returns (uint256) {
        Auction storage auction = auctions[_auctionId];
        require(auction.auctionType == AuctionType.DUTCH, "Not a Dutch auction");
        
        if (auction.status != AuctionStatus.ACTIVE) {
            return auction.currentPrice;
        }

        uint256 elapsed = block.timestamp - auction.startTime;
        uint256 totalDuration = auction.endTime - auction.startTime;
        
        if (elapsed >= totalDuration) {
            return auction.reservePrice;
        }

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
        auction.highestBid = currentPrice;
        auction.currentPrice = currentPrice;

        uint256 fantasyPoints = calculateBidFantasyPoints(_auctionId, currentPrice, msg.sender);
        updatePlayerStats(msg.sender, currentPrice, fantasyPoints);

        uint256 fee = currentPrice.mul(platformFee).div(10000);
        payable(auction.seller).transfer(currentPrice - fee);

        if (msg.value > currentPrice) {
            payable(msg.sender).transfer(msg.value - currentPrice);
        }

        emit BidPlaced(_auctionId, msg.sender, currentPrice, fantasyPoints);
        emit AuctionEnded(_auctionId, msg.sender, currentPrice);
    }

    function placeSealedBidHash(uint256 _auctionId, bytes32 _bidHash) external {
        Auction storage auction = auctions[_auctionId];
        require(auction.status == AuctionStatus.ACTIVE, "Auction not active");
        require(auction.auctionType == AuctionType.SEALED_BID, "Not a sealed bid auction");
        require(block.timestamp < auction.endTime, "Bidding period ended");
        require(!hasPlacedBid[_auctionId][msg.sender], "Already placed bid");

        auctionBids[_auctionId].push(Bid({
            bidder: msg.sender,
            amount: 0,
            timestamp: block.timestamp,
            bidHash: _bidHash,
            revealed: false
        }));

        hasPlacedBid[_auctionId][msg.sender] = true;
        auction.totalBids++;
    }

    function revealSealedBid(uint256 _auctionId, uint256 _bidAmount, uint256 _nonce) external payable {
        Auction storage auction = auctions[_auctionId];
        require(auction.auctionType == AuctionType.SEALED_BID, "Not a sealed bid auction");
        require(block.timestamp >= auction.endTime, "Reveal phase not started");
        require(block.timestamp < auction.endTime + 1 hours, "Reveal phase ended");
        require(msg.value == _bidAmount, "Bid amount mismatch");

        bytes32 bidHash = keccak256(abi.encodePacked(_bidAmount, _nonce, msg.sender));
        
        Bid[] storage bids = auctionBids[_auctionId];
        bool found = false;
        
        for (uint i = 0; i < bids.length; i++) {
            if (bids[i].bidder == msg.sender && bids[i].bidHash == bidHash && !bids[i].revealed) {
                bids[i].amount = _bidAmount;
                bids[i].revealed = true;
                found = true;
                break;
            }
        }
        
        require(found, "Invalid bid hash or already revealed");

        if (_bidAmount > auction.highestBid && _bidAmount >= auction.reservePrice) {
            if (auction.highestBidder != address(0)) {
                payable(auction.highestBidder).transfer(auction.highestBid);
            }
            auction.highestBid = _bidAmount;
            auction.highestBidder = msg.sender;
        } else {
            payable(msg.sender).transfer(_bidAmount);
        }

        uint256 fantasyPoints = calculateBidFantasyPoints(_auctionId, _bidAmount, msg.sender);
        updatePlayerStats(msg.sender, 0, fantasyPoints);

        emit BidPlaced(_auctionId, msg.sender, _bidAmount, fantasyPoints);
    }

    function placeGamifiedBid(uint256 _auctionId) external payable nonReentrant {
        Auction storage auction = auctions[_auctionId];
        require(auction.status == AuctionStatus.ACTIVE, "Auction not active");
        require(auction.auctionType == AuctionType.GAMIFIED, "Not a gamified auction");
        require(block.timestamp < auction.endTime, "Auction ended");
        
        uint256 minBid = auction.highestBid > 0 ? auction.highestBid.mul(105).div(100) : auction.startPrice;
        require(msg.value >= minBid, "Bid too low");

        if (auction.highestBidder != address(0)) {
            payable(auction.highestBidder).transfer(auction.highestBid);
        }

        auction.highestBid = msg.value;
        auction.highestBidder = msg.sender;
        auction.totalBids++;

        uint256 fantasyPoints = calculateGamifiedBidPoints(_auctionId, msg.value, msg.sender);
        updatePlayerStats(msg.sender, 0, fantasyPoints);

        if (block.timestamp > auction.endTime - 300) {
            auction.endTime = block.timestamp + 300;
        }

        emit BidPlaced(_auctionId, msg.sender, msg.value, fantasyPoints);
    }

    function endAuction(uint256 _auctionId) external nonReentrant {
        Auction storage auction = auctions[_auctionId];
        require(auction.status == AuctionStatus.ACTIVE, "Auction not active");
        require(
            block.timestamp >= auction.endTime || 
            (auction.auctionType == AuctionType.SEALED_BID && block.timestamp >= auction.endTime + 1 hours),
            "Auction not ready to end"
        );

        auction.status = AuctionStatus.ENDED;

        if (auction.highestBidder != address(0)) {
            uint256 fee = auction.highestBid.mul(platformFee).div(10000);
            payable(auction.seller).transfer(auction.highestBid - fee);

            uint256 winnerBonus = auction.fantasyPoints.div(2);
            PlayerStats storage winnerStats = playerStats[auction.highestBidder];
            winnerStats.fantasyScore += winnerBonus;
            winnerStats.successfulBids++;
            winnerStats.totalSpent += auction.highestBid;

            emit FantasyPointsAwarded(auction.highestBidder, winnerBonus, "Auction won");
        }

        emit AuctionEnded(_auctionId, auction.highestBidder, auction.highestBid);
    }

    function calculateInitialFantasyPoints(uint256 _price) internal pure returns (uint256) {
        return FANTASY_POINTS_BASE.add(_price.div(1000));
    }

    function calculateBidFantasyPoints(uint256 _auctionId, uint256 _bidAmount, address _bidder) internal view returns (uint256) {
        Auction storage auction = auctions[_auctionId];
        uint256 basePoints = auction.fantasyPoints.div(10);
        
        uint256 speedBonus = calculateSpeedBonus(_auctionId);
        uint256 competitionBonus = auction.totalBids.mul(10);
        
        return basePoints.add(speedBonus).add(competitionBonus);
    }

    function calculateGamifiedBidPoints(uint256 _auctionId, uint256 _bidAmount, address _bidder) internal view returns (uint256) {
        Auction storage auction = auctions[_auctionId];
        PlayerStats storage stats = playerStats[_bidder];
        
        uint256 basePoints = auction.fantasyPoints.div(5);
        uint256 levelBonus = stats.level.mul(50);
        uint256 streakBonus = calculateStreakBonus(_bidder);
        
        return basePoints.add(levelBonus).add(streakBonus);
    }

    function calculateSpeedBonus(uint256 _auctionId) internal view returns (uint256) {
        Auction storage auction = auctions[_auctionId];
        uint256 elapsed = block.timestamp - auction.startTime;
        uint256 duration = auction.endTime - auction.startTime;
        
        if (elapsed < duration.div(4)) {
            return 200;
        } else if (elapsed < duration.div(2)) {
            return 100;
        } else {
            return 50;
        }
    }

    function calculateStreakBonus(address _player) internal view returns (uint256) {
        PlayerStats storage stats = playerStats[_player];
        if (block.timestamp - stats.lastBidTime < 1 hours) {
            return stats.streakBonus.mul(25);
        }
        return 0;
    }

    function updatePlayerStats(address _player, uint256 _amount, uint256 _points) internal {
        PlayerStats storage stats = playerStats[_player];
        stats.totalAuctions++;
        stats.totalSpent += _amount;
        stats.fantasyScore += _points;
        
        if (block.timestamp - stats.lastBidTime < 1 hours) {
            stats.streakBonus++;
        } else {
            stats.streakBonus = 1;
        }
        
        stats.lastBidTime = block.timestamp;

        uint256 newLevel = (stats.fantasyScore / 10000) + 1;
        if (newLevel > stats.level) {
            stats.level = newLevel;
            emit PlayerLevelUp(_player, newLevel);
        }

        emit FantasyPointsAwarded(_player, _points, "Bid participation");
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

    function getAuctionBids(uint256 _auctionId) external view returns (address[] memory bidders, uint256[] memory amounts, uint256[] memory timestamps) {
        Bid[] storage bids = auctionBids[_auctionId];
        uint256 revealedCount = 0;
        
        for (uint i = 0; i < bids.length; i++) {
            if (bids[i].revealed) {
                revealedCount++;
            }
        }
        
        bidders = new address[](revealedCount);
        amounts = new uint256[](revealedCount);
        timestamps = new uint256[](revealedCount);
        
        uint256 index = 0;
        for (uint i = 0; i < bids.length; i++) {
            if (bids[i].revealed) {
                bidders[index] = bids[i].bidder;
                amounts[index] = bids[i].amount;
                timestamps[index] = bids[i].timestamp;
                index++;
            }
        }
    }

    function getPlayerLevel(address _player) external view returns (uint256) {
        return playerStats[_player].level;
    }

    function getPlayerFantasyScore(address _player) external view returns (uint256) {
        return playerStats[_player].fantasyScore;
    }

    function withdrawFees() external onlyOwner {
        payable(owner()).transfer(address(this).balance);
    }

    function updatePlatformFee(uint256 _newFee) external onlyOwner {
        require(_newFee <= 1000, "Fee too high");
        platformFee = _newFee;
    }

    function emergencyWithdraw(uint256 _auctionId) external {
        Auction storage auction = auctions[_auctionId];
        require(msg.sender == auction.seller, "Only seller can withdraw");
        require(auction.status == AuctionStatus.ACTIVE, "Auction not active");
        require(block.timestamp > auction.endTime + 1 days, "Too early to withdraw");
        
        auction.status = AuctionStatus.CANCELLED;
        
        if (auction.highestBidder != address(0)) {
            payable(auction.highestBidder).transfer(auction.highestBid);
        }
    }

    receive() external payable {}
}