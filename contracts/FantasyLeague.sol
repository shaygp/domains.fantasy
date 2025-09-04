// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";

contract FantasyLeague is Ownable, ReentrancyGuard {
    using SafeMath for uint256;

    struct League {
        string name;
        address creator;
        uint256 entryFee;
        uint256 maxPlayers;
        uint256 currentPlayers;
        uint256 seasonStart;
        uint256 seasonEnd;
        uint256 prizePool;
        bool isActive;
        bool isPublic;
        string inviteCode;
        uint256 scoringRules;
        uint256 transferBudget;
        uint256 maxTransfers;
    }

    struct Team {
        address owner;
        string name;
        uint256[] domainIds;
        uint256 totalValue;
        uint256 weeklyScore;
        uint256 totalScore;
        uint256 rank;
        uint256 transfersUsed;
        uint256 remainingBudget;
        bool isActive;
    }

    struct DomainPerformance {
        uint256 domainId;
        string domainName;
        uint256 weeklyViews;
        uint256 weeklyRevenue;
        uint256 marketValue;
        uint256 fantasyPoints;
        uint256 lastUpdated;
        bool isActive;
    }

    struct WeeklyResults {
        uint256 week;
        uint256 totalPlayers;
        address winner;
        uint256 winningScore;
        uint256 averageScore;
        mapping(address => uint256) playerScores;
        mapping(address => uint256) playerRanks;
        bool finalized;
    }

    struct ScoringRules {
        uint256 viewsMultiplier;
        uint256 revenueMultiplier;
        uint256 valueGrowthMultiplier;
        uint256 auctionWinBonus;
        uint256 newRegistrationBonus;
        uint256 renewalBonus;
        uint256 transferPenalty;
        uint256 benchPenalty;
    }

    mapping(uint256 => League) public leagues;
    mapping(uint256 => mapping(address => Team)) public teams;
    mapping(uint256 => mapping(uint256 => WeeklyResults)) public weeklyResults;
    mapping(uint256 => DomainPerformance) public domainPerformance;
    mapping(address => uint256[]) public playerLeagues;
    mapping(uint256 => address[]) public leaguePlayers;
    mapping(string => uint256) public inviteCodeToLeague;

    uint256 public leagueCounter;
    uint256 public currentWeek;
    ScoringRules public defaultScoringRules;

    uint256 public constant MIN_TEAM_DOMAINS = 8;
    uint256 public constant MAX_TEAM_DOMAINS = 15;
    uint256 public constant SEASON_DURATION = 20 weeks;

    event LeagueCreated(uint256 indexed leagueId, address indexed creator, string name);
    event PlayerJoined(uint256 indexed leagueId, address indexed player, string teamName);
    event TeamUpdated(uint256 indexed leagueId, address indexed player, uint256[] domainIds);
    event WeeklyScoresCalculated(uint256 indexed leagueId, uint256 week, address indexed winner);
    event DomainPerformanceUpdated(uint256 indexed domainId, uint256 fantasyPoints);
    event SeasonEnded(uint256 indexed leagueId, address indexed champion, uint256 prize);
    event TransferMade(uint256 indexed leagueId, address indexed player, uint256 domainIn, uint256 domainOut);

    constructor() {
        defaultScoringRules = ScoringRules({
            viewsMultiplier: 1,
            revenueMultiplier: 10,
            valueGrowthMultiplier: 5,
            auctionWinBonus: 100,
            newRegistrationBonus: 50,
            renewalBonus: 25,
            transferPenalty: 10,
            benchPenalty: 5
        });
        currentWeek = 1;
    }

    function createLeague(
        string memory _name,
        uint256 _entryFee,
        uint256 _maxPlayers,
        bool _isPublic,
        uint256 _transferBudget
    ) external payable returns (uint256) {
        require(bytes(_name).length > 0, "League name required");
        require(_maxPlayers >= 4 && _maxPlayers <= 100, "Invalid max players");
        require(msg.value == _entryFee, "Incorrect entry fee");

        uint256 leagueId = ++leagueCounter;
        string memory inviteCode = _isPublic ? "" : generateInviteCode(leagueId);

        leagues[leagueId] = League({
            name: _name,
            creator: msg.sender,
            entryFee: _entryFee,
            maxPlayers: _maxPlayers,
            currentPlayers: 1,
            seasonStart: block.timestamp,
            seasonEnd: block.timestamp + (SEASON_DURATION * 1 weeks),
            prizePool: _entryFee,
            isActive: true,
            isPublic: _isPublic,
            inviteCode: inviteCode,
            scoringRules: 0,
            transferBudget: _transferBudget,
            maxTransfers: 5
        });

        teams[leagueId][msg.sender] = Team({
            owner: msg.sender,
            name: string(abi.encodePacked(_name, " Owner")),
            domainIds: new uint256[](0),
            totalValue: 0,
            weeklyScore: 0,
            totalScore: 0,
            rank: 1,
            transfersUsed: 0,
            remainingBudget: _transferBudget,
            isActive: true
        });

        playerLeagues[msg.sender].push(leagueId);
        leaguePlayers[leagueId].push(msg.sender);
        
        if (!_isPublic) {
            inviteCodeToLeague[inviteCode] = leagueId;
        }

        emit LeagueCreated(leagueId, msg.sender, _name);
        return leagueId;
    }

    function joinLeague(uint256 _leagueId, string memory _teamName) external payable {
        League storage league = leagues[_leagueId];
        require(league.isActive, "League not active");
        require(league.currentPlayers < league.maxPlayers, "League full");
        require(msg.value == league.entryFee, "Incorrect entry fee");
        require(teams[_leagueId][msg.sender].owner == address(0), "Already in league");

        league.currentPlayers++;
        league.prizePool += msg.value;

        teams[_leagueId][msg.sender] = Team({
            owner: msg.sender,
            name: _teamName,
            domainIds: new uint256[](0),
            totalValue: 0,
            weeklyScore: 0,
            totalScore: 0,
            rank: league.currentPlayers,
            transfersUsed: 0,
            remainingBudget: league.transferBudget,
            isActive: true
        });

        playerLeagues[msg.sender].push(_leagueId);
        leaguePlayers[_leagueId].push(msg.sender);

        emit PlayerJoined(_leagueId, msg.sender, _teamName);
    }

    function joinLeagueByInvite(string memory _inviteCode, string memory _teamName) external payable {
        uint256 leagueId = inviteCodeToLeague[_inviteCode];
        require(leagueId != 0, "Invalid invite code");
        joinLeague(leagueId, _teamName);
    }

    function setTeamDomains(uint256 _leagueId, uint256[] memory _domainIds) external {
        require(teams[_leagueId][msg.sender].isActive, "Team not active");
        require(_domainIds.length >= MIN_TEAM_DOMAINS && _domainIds.length <= MAX_TEAM_DOMAINS, "Invalid team size");
        
        Team storage team = teams[_leagueId][msg.sender];
        
        uint256 totalValue = 0;
        for (uint256 i = 0; i < _domainIds.length; i++) {
            require(domainPerformance[_domainIds[i]].isActive, "Domain not active");
            totalValue += domainPerformance[_domainIds[i]].marketValue;
        }
        
        team.domainIds = _domainIds;
        team.totalValue = totalValue;

        emit TeamUpdated(_leagueId, msg.sender, _domainIds);
    }

    function makeTransfer(
        uint256 _leagueId, 
        uint256 _domainIdOut, 
        uint256 _domainIdIn
    ) external {
        Team storage team = teams[_leagueId][msg.sender];
        League storage league = leagues[_leagueId];
        
        require(team.isActive, "Team not active");
        require(team.transfersUsed < league.maxTransfers, "Transfer limit reached");
        require(domainPerformance[_domainIdIn].isActive, "New domain not active");

        uint256 domainOutValue = domainPerformance[_domainIdOut].marketValue;
        uint256 domainInValue = domainPerformance[_domainIdIn].marketValue;
        
        require(team.remainingBudget >= domainInValue.sub(domainOutValue), "Insufficient transfer budget");

        bool found = false;
        for (uint256 i = 0; i < team.domainIds.length; i++) {
            if (team.domainIds[i] == _domainIdOut) {
                team.domainIds[i] = _domainIdIn;
                found = true;
                break;
            }
        }
        require(found, "Domain not in team");

        team.transfersUsed++;
        team.remainingBudget = team.remainingBudget.sub(domainInValue.sub(domainOutValue));
        team.totalValue = team.totalValue.sub(domainOutValue).add(domainInValue);

        emit TransferMade(_leagueId, msg.sender, _domainIdIn, _domainIdOut);
    }

    function updateDomainPerformance(
        uint256 _domainId,
        string memory _domainName,
        uint256 _weeklyViews,
        uint256 _weeklyRevenue,
        uint256 _marketValue
    ) external onlyOwner {
        DomainPerformance storage performance = domainPerformance[_domainId];
        
        performance.domainId = _domainId;
        performance.domainName = _domainName;
        performance.weeklyViews = _weeklyViews;
        performance.weeklyRevenue = _weeklyRevenue;
        performance.marketValue = _marketValue;
        performance.lastUpdated = block.timestamp;
        performance.isActive = true;

        uint256 fantasyPoints = calculateDomainFantasyPoints(_domainId);
        performance.fantasyPoints = fantasyPoints;

        emit DomainPerformanceUpdated(_domainId, fantasyPoints);
    }

    function calculateDomainFantasyPoints(uint256 _domainId) public view returns (uint256) {
        DomainPerformance storage performance = domainPerformance[_domainId];
        ScoringRules memory rules = defaultScoringRules;

        uint256 viewsPoints = performance.weeklyViews.div(1000).mul(rules.viewsMultiplier);
        uint256 revenuePoints = performance.weeklyRevenue.mul(rules.revenueMultiplier);
        
        uint256 basePoints = viewsPoints.add(revenuePoints);
        
        if (performance.weeklyViews > 100000) {
            basePoints = basePoints.mul(120).div(100);
        }
        
        if (performance.weeklyRevenue > 1 ether) {
            basePoints = basePoints.mul(110).div(100);
        }

        return basePoints;
    }

    function calculateWeeklyScores(uint256 _leagueId) external onlyOwner {
        League storage league = leagues[_leagueId];
        require(league.isActive, "League not active");

        WeeklyResults storage weeklyResult = weeklyResults[_leagueId][currentWeek];
        weeklyResult.week = currentWeek;
        weeklyResult.totalPlayers = league.currentPlayers;

        uint256 highestScore = 0;
        address winner = address(0);
        uint256 totalScores = 0;

        address[] memory players = leaguePlayers[_leagueId];
        
        for (uint256 i = 0; i < players.length; i++) {
            address player = players[i];
            Team storage team = teams[_leagueId][player];
            
            if (!team.isActive) continue;

            uint256 teamScore = 0;
            for (uint256 j = 0; j < team.domainIds.length; j++) {
                uint256 domainId = team.domainIds[j];
                teamScore += domainPerformance[domainId].fantasyPoints;
            }

            if (team.domainIds.length < MIN_TEAM_DOMAINS) {
                teamScore = teamScore.mul(90).div(100);
            }

            team.weeklyScore = teamScore;
            team.totalScore += teamScore;
            totalScores += teamScore;

            weeklyResult.playerScores[player] = teamScore;

            if (teamScore > highestScore) {
                highestScore = teamScore;
                winner = player;
            }
        }

        weeklyResult.winner = winner;
        weeklyResult.winningScore = highestScore;
        weeklyResult.averageScore = players.length > 0 ? totalScores.div(players.length) : 0;
        weeklyResult.finalized = true;

        updateLeagueRanks(_leagueId);

        emit WeeklyScoresCalculated(_leagueId, currentWeek, winner);
    }

    function updateLeagueRanks(uint256 _leagueId) internal {
        address[] memory players = leaguePlayers[_leagueId];
        
        for (uint256 i = 0; i < players.length; i++) {
            for (uint256 j = i + 1; j < players.length; j++) {
                if (teams[_leagueId][players[i]].totalScore < teams[_leagueId][players[j]].totalScore) {
                    address temp = players[i];
                    players[i] = players[j];
                    players[j] = temp;
                }
            }
        }
        
        for (uint256 i = 0; i < players.length; i++) {
            teams[_leagueId][players[i]].rank = i + 1;
        }
    }

    function advanceWeek() external onlyOwner {
        currentWeek++;
    }

    function endSeason(uint256 _leagueId) external onlyOwner {
        League storage league = leagues[_leagueId];
        require(league.isActive, "League not active");
        require(block.timestamp >= league.seasonEnd, "Season not finished");

        league.isActive = false;

        address[] memory players = leaguePlayers[_leagueId];
        address champion = players[0];
        uint256 highestScore = 0;

        for (uint256 i = 0; i < players.length; i++) {
            if (teams[_leagueId][players[i]].totalScore > highestScore) {
                highestScore = teams[_leagueId][players[i]].totalScore;
                champion = players[i];
            }
        }

        uint256 championPrize = league.prizePool.mul(50).div(100);
        uint256 runnerUpPrize = league.prizePool.mul(30).div(100);
        uint256 thirdPrize = league.prizePool.mul(20).div(100);

        payable(champion).transfer(championPrize);
        
        if (players.length > 1) {
            address runnerUp = getPlayerByRank(_leagueId, 2);
            payable(runnerUp).transfer(runnerUpPrize);
        }
        
        if (players.length > 2) {
            address third = getPlayerByRank(_leagueId, 3);
            payable(third).transfer(thirdPrize);
        }

        emit SeasonEnded(_leagueId, champion, championPrize);
    }

    function getPlayerByRank(uint256 _leagueId, uint256 _rank) internal view returns (address) {
        address[] memory players = leaguePlayers[_leagueId];
        for (uint256 i = 0; i < players.length; i++) {
            if (teams[_leagueId][players[i]].rank == _rank) {
                return players[i];
            }
        }
        return address(0);
    }

    function getLeagueStandings(uint256 _leagueId) external view returns (
        address[] memory players,
        uint256[] memory scores,
        uint256[] memory ranks
    ) {
        address[] memory leagueMembersCopy = leaguePlayers[_leagueId];
        players = new address[](leagueMembersCopy.length);
        scores = new uint256[](leagueMembersCopy.length);
        ranks = new uint256[](leagueMembersCopy.length);

        for (uint256 i = 0; i < leagueMembersCopy.length; i++) {
            players[i] = leagueMembersCopy[i];
            scores[i] = teams[_leagueId][leagueMembersCopy[i]].totalScore;
            ranks[i] = teams[_leagueId][leagueMembersCopy[i]].rank;
        }
    }

    function getTeamDomains(uint256 _leagueId, address _player) external view returns (uint256[] memory) {
        return teams[_leagueId][_player].domainIds;
    }

    function generateInviteCode(uint256 _leagueId) internal pure returns (string memory) {
        return string(abi.encodePacked("FL", toString(_leagueId)));
    }

    function toString(uint256 value) internal pure returns (string memory) {
        if (value == 0) {
            return "0";
        }
        uint256 temp = value;
        uint256 digits;
        while (temp != 0) {
            digits++;
            temp /= 10;
        }
        bytes memory buffer = new bytes(digits);
        while (value != 0) {
            digits -= 1;
            buffer[digits] = bytes1(uint8(48 + uint256(value % 10)));
            value /= 10;
        }
        return string(buffer);
    }

    function emergencyWithdraw() external onlyOwner {
        payable(owner()).transfer(address(this).balance);
    }

    receive() external payable {}
}