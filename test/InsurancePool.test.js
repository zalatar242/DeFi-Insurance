const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("InsurancePool", function () {
  let insurancePool;
  let rlusd;
  let owner;
  let buyer;
  let provider;

  beforeEach(async function () {
    [owner, buyer, provider] = await ethers.getSigners();

    // Deploy mock RLUSD
    const RLUSDMock = await ethers.getContractFactory("RLUSDMock");
    rlusd = await RLUSDMock.deploy();
    await rlusd.deployed();

    // Deploy Oracle
    const InsuranceOracle = await ethers.getContractFactory("InsuranceOracle");
    insuranceOracle = await InsuranceOracle.deploy();
    await insuranceOracle.deployed();

    // Deploy Pool
    const InsurancePool = await ethers.getContractFactory("InsurancePool");
    insurancePool = await InsurancePool.deploy(rlusd.address);
    await insurancePool.deployed();

    // Unpause
    await insurancePool.unpause();

    // Give test accounts some RLUSD
    const amount = ethers.utils.parseEther("10000");
    await rlusd.transfer(buyer.address, amount);
    await rlusd.transfer(provider.address, amount);
  });

  describe("Coverage Purchase", function () {
    it("Should allow purchasing coverage with security deposit", async function () {
      const coverageAmount = ethers.utils.parseEther("1000");
      const requiredDeposit = coverageAmount.mul(20).div(100); // 20%

      // First add some liquidity
      const liquidityAmount = ethers.utils.parseEther("2000");
      await rlusd.connect(provider).approve(insurancePool.address, liquidityAmount);
      await insurancePool.connect(provider).addLiquidity(liquidityAmount);

      // Approve and purchase coverage
      await rlusd.connect(buyer).approve(insurancePool.address, requiredDeposit);
// Purchase coverage and get the event
const tx = await insurancePool.connect(buyer).purchaseCoverage(coverageAmount);
const receipt = await tx.wait();
const event = receipt.events.find(e => e.event === 'CoveragePurchased');

// Verify event data
expect(event.args.buyer).to.equal(buyer.address);
expect(event.args.coverageAmount).to.equal(coverageAmount);
expect(event.args.securityDeposit).to.equal(requiredDeposit);

// Verify premium is in reasonable range (1-2% annual)
const premium = event.args.premium;
const expectedAnnualMin = coverageAmount.mul(100).div(10000); // 1%
const expectedAnnualMax = coverageAmount.mul(200).div(10000); // 2%
const expectedMin = expectedAnnualMin.mul(30).div(365); // 30 days
const expectedMax = expectedAnnualMax.mul(30).div(365); // 30 days

expect(premium).to.be.gt(expectedMin);
expect(premium).to.be.lt(expectedMax);

const coverage = await insurancePool.getCoverage(buyer.address);
      expect(coverage.isActive).to.be.true;
      expect(coverage.amount).to.equal(coverageAmount);
      expect(coverage.securityDeposit).to.equal(requiredDeposit);
    });

    it("Should reject purchase with insufficient liquidity", async function () {
      const coverageAmount = ethers.utils.parseEther("1000");
      const requiredDeposit = coverageAmount.mul(20).div(100);

      // No liquidity added yet
      await rlusd.connect(buyer).approve(insurancePool.address, requiredDeposit);
      await expect(insurancePool.connect(buyer).purchaseCoverage(coverageAmount))
        .to.be.revertedWith("Coverage exceeds 80% of total liquidity");
    });
  });

  describe("Liquidity Provision", function () {
    it("Should allow adding liquidity", async function () {
      const liquidityAmount = ethers.utils.parseEther("1000");
      await rlusd.connect(provider).approve(insurancePool.address, liquidityAmount);

      await expect(insurancePool.connect(provider).addLiquidity(liquidityAmount))
        .to.emit(insurancePool, "LiquidityAdded")
        .withArgs(provider.address, liquidityAmount);

      expect(await insurancePool.getTotalLiquidity()).to.equal(liquidityAmount);
    });

    it("Should enforce max coverage limit of 80% of liquidity", async function () {
      // Add liquidity
      const liquidityAmount = ethers.utils.parseEther("1000");
      await rlusd.connect(provider).approve(insurancePool.address, liquidityAmount);
      await insurancePool.connect(provider).addLiquidity(liquidityAmount);

      // Try to purchase more than 80% coverage
      const coverageAmount = ethers.utils.parseEther("801"); // 80.1%
      const requiredDeposit = coverageAmount.mul(20).div(100);

      await rlusd.connect(buyer).approve(insurancePool.address, requiredDeposit);
      await expect(insurancePool.connect(buyer).purchaseCoverage(coverageAmount))
        .to.be.revertedWith("Coverage exceeds 80% of total liquidity");
    });
  });

  describe("Premium Calculation", function () {
    it("Should calculate premium based on utilization", async function () {
      const coverageAmount = ethers.utils.parseEther("1000");

      // Add liquidity first
      const liquidityAmount = ethers.utils.parseEther("2000");
      await rlusd.connect(provider).approve(insurancePool.address, liquidityAmount);
      await insurancePool.connect(provider).addLiquidity(liquidityAmount);

      const premium = await insurancePool.calculatePremium(coverageAmount);
      expect(premium).to.be.gt(0);
    });
  });

  describe("Withdrawals", function () {
    it("Should allow requesting withdrawal", async function () {
      const liquidityAmount = ethers.utils.parseEther("1000");
      await rlusd.connect(provider).approve(insurancePool.address, liquidityAmount);
      await insurancePool.connect(provider).addLiquidity(liquidityAmount);

      const tx = await insurancePool.connect(provider).requestWithdraw(liquidityAmount);
      const receipt = await tx.wait();
      const event = receipt.events.find(e => e.event === 'WithdrawRequested');

      expect(event.args.provider).to.equal(provider.address);
      expect(event.args.amount).to.equal(liquidityAmount);

      // Verify unlock time is roughly 7 days in the future (within 2 seconds)
      const currentTime = await time.latest();
      const unlockTime = event.args.unlockTime;
      const sevenDays = 7 * 24 * 3600;
      expect(unlockTime).to.be.closeTo(currentTime + sevenDays, 2);
    });

    it("Should allow executing withdrawal after delay", async function () {
      const liquidityAmount = ethers.utils.parseEther("1000");
      await rlusd.connect(provider).approve(insurancePool.address, liquidityAmount);
      await insurancePool.connect(provider).addLiquidity(liquidityAmount);
      await insurancePool.connect(provider).requestWithdraw(liquidityAmount);

      await time.increase(7 * 24 * 3600 + 1); // 7 days + 1 second

      await expect(insurancePool.connect(provider).executeWithdraw())
        .to.emit(insurancePool, "LiquidityWithdrawn")
        .withArgs(provider.address, liquidityAmount);

      expect(await insurancePool.getTotalLiquidity()).to.equal(0);
    });
  });
});
