const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("Fantasy Domains Full Integration", function () {
  let domainRegistry, auction, league;
  let owner, player1, player2, player3;
  let leagueId;

  beforeEach(async function () {
    [owner, player1, player2, player3] = await ethers.getSigners();

    const DomainRegistry = await ethers.getContractFactory("DomainRegistry");
    domainRegistry = await DomainRegistry.deploy();

    const FantasyDomainsAuction = await ethers.getContractFactory("FantasyDomainsAuction");
    auction = await FantasyDomainsAuction.deploy();

    const FantasyLeague = await ethers.getContractFactory("FantasyLeague");
    league = await FantasyLeague.deploy();

    await domainRegistry.setAuctionContract(await auction.getAddress());
  });

  describe("Domain Registry", function () {
    it("Should register a domain", async function () {
      const duration = 365 * 24 * 60 * 60;
      const fee = await domainRegistry.registrationFee();
      
      await domainRegistry.connect(player1).registerDomain("test.eth", duration, { value: fee });
      
      const tokenId = await domainRegistry.domainNameToId("test.eth");
      expect(tokenId).to.equal(1n);
      
      const owner = await domainRegistry.ownerOf(tokenId);
      expect(owner).to.equal(player1.address);
    });

    it("Should not allow duplicate domain registration", async function () {
      const duration = 365 * 24 * 60 * 60;
      const fee = await domainRegistry.registrationFee();
      
      await domainRegistry.connect(player1).registerDomain("test.eth", duration, { value: fee });
      
      await expect(
        domainRegistry.connect(player2).registerDomain("test.eth", duration, { value: fee })
      ).to.be.revertedWith("Domain already registered");
    });
  });

  describe("Auction System", function () {
    it("Should create and complete a Dutch auction", async function () {
      const startPrice = ethers.parseEther("10");
      const reservePrice = ethers.parseEther("5");
      const duration = 3600;
      const decrement = ethers.parseEther("0.1");

      await auction.connect(player1).createDutchAuction(
        "example.com",
        startPrice,
        reservePrice,
        duration,
        decrement
      );

      const auctionId = 1;
      const currentPrice = await auction.getCurrentDutchPrice(auctionId);
      
      await auction.connect(player2).placeDutchBid(auctionId, { value: currentPrice });
      
      const auctionData = await auction.auctions(auctionId);
      expect(auctionData.highestBidder).to.equal(player2.address);
      expect(auctionData.status).to.equal(2);
    });

    it("Should create and complete a gamified auction", async function () {
      const startPrice = ethers.parseEther("5");
      const duration = 3600;
      const multiplier = 2;

      await auction.connect(player1).createGamifiedAuction(
        "game.io",
        startPrice,
        duration,
        multiplier
      );

      const bidAmount = ethers.parseEther("6");
      await auction.connect(player2).placeGamifiedBid(1, { value: bidAmount });

      const stats = await auction.playerStats(player2.address);
      expect(stats.fantasyScore).to.be.gt(0);
    });
  });

  describe("Fantasy League System", function () {
    beforeEach(async function () {
      await league.connect(owner).updateDomainPerformance(
        1, "blockchain.tech", 50000, ethers.parseEther("2.5"), ethers.parseEther("15.0")
      );
      await league.connect(owner).updateDomainPerformance(
        2, "defi.finance", 75000, ethers.parseEther("3.8"), ethers.parseEther("22.5")
      );
      await league.connect(owner).updateDomainPerformance(
        3, "nft.market", 120000, ethers.parseEther("6.2"), ethers.parseEther("35.0")
      );
    });

    it("Should create a league", async function () {
      const entryFee = ethers.parseEther("0.1");
      const maxPlayers = 4;
      const transferBudget = 1000;

      await league.connect(player1).createLeague(
        "Test League",
        entryFee,
        maxPlayers,
        true,
        transferBudget,
        { value: entryFee }
      );

      leagueId = 1;
      const leagueData = await league.leagues(leagueId);
      expect(leagueData.name).to.equal("Test League");
      expect(leagueData.creator).to.equal(player1.address);
      expect(leagueData.currentPlayers).to.equal(1n);
    });

    it("Should allow players to join league", async function () {
      const entryFee = ethers.parseEther("0.1");
      
      await league.connect(player1).createLeague(
        "Test League",
        entryFee,
        4,
        true,
        1000,
        { value: entryFee }
      );

      await league.connect(player2).joinLeague(1, "Team Player2", { value: entryFee });
      
      const leagueData = await league.leagues(1);
      expect(leagueData.currentPlayers).to.equal(2n);
      expect(leagueData.prizePool).to.equal(ethers.parseEther("0.2"));
    });

    it("Should set team domains", async function () {
      const entryFee = ethers.parseEther("0.1");
      
      await league.connect(player1).createLeague(
        "Test League",
        entryFee,
        4,
        true,
        1000,
        { value: entryFee }
      );

      const domainIds = [1, 2, 3, 1, 2, 3, 1, 2];
      await league.connect(player1).setTeamDomains(1, domainIds);
      
      const teamDomains = await league.getTeamDomains(1, player1.address);
      expect(teamDomains.length).to.equal(8);
    });

    it("Should calculate weekly scores", async function () {
      const entryFee = ethers.parseEther("0.1");
      
      await league.connect(player1).createLeague(
        "Test League",
        entryFee,
        4,
        true,
        1000,
        { value: entryFee }
      );

      await league.connect(player2).joinLeague(1, "Team Player2", { value: entryFee });
      
      const domainIds = [1, 2, 3, 1, 2, 3, 1, 2];
      await league.connect(player1).setTeamDomains(1, domainIds);
      await league.connect(player2).setTeamDomains(1, domainIds);

      await league.connect(owner).calculateWeeklyScores(1);
      
      const weeklyResult = await league.weeklyResults(1, 1);
      expect(weeklyResult.finalized).to.be.true;
      expect(weeklyResult.totalPlayers).to.equal(2n);
    });

    it("Should handle transfers within budget", async function () {
      const entryFee = ethers.parseEther("0.1");
      
      await league.connect(player1).createLeague(
        "Test League",
        entryFee,
        4,
        true,
        ethers.parseEther("100"),
        { value: entryFee }
      );

      const domainIds = [1, 2, 3, 1, 2, 3, 1, 2];
      await league.connect(player1).setTeamDomains(1, domainIds);

      await league.connect(owner).updateDomainPerformance(
        4, "new.domain", 30000, ethers.parseEther("1.5"), ethers.parseEther("10.0")
      );

      await league.connect(player1).makeTransfer(1, 1, 4);
      
      const updatedDomains = await league.getTeamDomains(1, player1.address);
      expect(updatedDomains).to.include(4n);
    });
  });

  describe("Integration Tests", function () {
    it("Should complete full fantasy flow", async function () {
      const entryFee = ethers.parseEther("0.1");
      
      await league.connect(player1).createLeague(
        "Integration Test League",
        entryFee,
        4,
        true,
        1000,
        { value: entryFee }
      );

      await league.connect(player2).joinLeague(1, "Team Player2", { value: entryFee });
      await league.connect(player3).joinLeague(1, "Team Player3", { value: entryFee });

      await league.connect(owner).updateDomainPerformance(
        1, "blockchain.tech", 50000, ethers.parseEther("2.5"), ethers.parseEther("15.0")
      );
      await league.connect(owner).updateDomainPerformance(
        2, "defi.finance", 75000, ethers.parseEther("3.8"), ethers.parseEther("22.5")
      );
      await league.connect(owner).updateDomainPerformance(
        3, "nft.market", 120000, ethers.parseEther("6.2"), ethers.parseEther("35.0")
      );

      const domainIds = [1, 2, 3, 1, 2, 3, 1, 2];
      await league.connect(player1).setTeamDomains(1, domainIds);
      await league.connect(player2).setTeamDomains(1, domainIds);
      await league.connect(player3).setTeamDomains(1, domainIds);

      await league.connect(owner).calculateWeeklyScores(1);

      const [players, scores, ranks] = await league.getLeagueStandings(1);
      expect(players.length).to.equal(3);
      expect(scores.length).to.equal(3);
      expect(ranks.length).to.equal(3);

      console.log("League standings:");
      for (let i = 0; i < players.length; i++) {
        console.log(`Player ${players[i]}: Score ${scores[i]}, Rank ${ranks[i]}`);
      }
    });
  });

  describe("Gas Optimization Tests", function () {
    it("Should use reasonable gas for common operations", async function () {
      const entryFee = ethers.parseEther("0.1");
      
      const tx1 = await league.connect(player1).createLeague(
        "Gas Test League",
        entryFee,
        10,
        true,
        1000,
        { value: entryFee }
      );
      const receipt1 = await tx1.wait();
      console.log("Create League Gas Used:", receipt1.gasUsed.toString());

      const tx2 = await league.connect(player2).joinLeague(1, "Team Player2", { value: entryFee });
      const receipt2 = await tx2.wait();
      console.log("Join League Gas Used:", receipt2.gasUsed.toString());

      await league.connect(owner).updateDomainPerformance(
        1, "test.domain", 50000, ethers.parseEther("2.5"), ethers.parseEther("15.0")
      );

      const domainIds = [1, 1, 1, 1, 1, 1, 1, 1];
      const tx3 = await league.connect(player1).setTeamDomains(1, domainIds);
      const receipt3 = await tx3.wait();
      console.log("Set Team Domains Gas Used:", receipt3.gasUsed.toString());
    });
  });
});