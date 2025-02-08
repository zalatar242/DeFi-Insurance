const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

const AAVE_PROTOCOL_ID = ethers.utils.formatBytes32String("Aave");

describe("InsurancePool", function () {
  let insurancePool;
  let insuranceOracle;
  let owner;
  let buyer;
  let provider;

  const STABLECOIN_RISK = ethers.utils.formatBytes32String("STABLECOIN");
  const SMART_CONTRACT_RISK = ethers.utils.formatBytes32String("SMART_CONTRACT");

  beforeEach(async function () {
    [owner, buyer, provider] = await ethers.getSigners();

    // Deploy Oracle
    const InsuranceOracle = await ethers.getContractFactory("InsuranceOracle");
    insuranceOracle = await InsuranceOracle.deploy();
    await insuranceOracle.deployed();

    // Deploy Pool
    const InsurancePool = await ethers.getContractFactory("InsurancePool");
    insurancePool = await InsurancePool.deploy();
    await insurancePool.deployed();

    // Unpause
    await insurancePool.unpause();
  });

  describe("Coverage Purchase", function () {
    it("Should allow purchasing coverage with security deposit", async function () {
      const coverageAmount = ethers.utils.parseEther("1000"); // Reduced coverage amount
      const securityDeposit = coverageAmount.mul(20).div(100); // 20%

      await expect(insurancePool.connect(buyer).purchaseCoverage(
        coverageAmount,
        { value: securityDeposit }
      )).to.emit(insurancePool, "CoveragePurchased")
        .withArgs(
          buyer.address,
          coverageAmount,
          securityDeposit,
          [STABLECOIN_RISK, SMART_CONTRACT_RISK],
          [securityDeposit.div(2), securityDeposit.div(2)]
        );

      const coverage = await insurancePool.getCoverage(buyer.address);
      expect(coverage.isActive).to.be.true;
      expect(coverage.amount).to.equal(coverageAmount);
      expect(coverage.securityDeposit).to.equal(securityDeposit);
    });

    it("Should reject purchase with insufficient security deposit", async function () {
      const coverageAmount = ethers.utils.parseEther("500"); // Reduced coverage amount
      const insufficientDeposit = coverageAmount.mul(19).div(100); // 19% instead of required 20%

      await expect(insurancePool.connect(buyer).purchaseCoverage(
        coverageAmount,
        { value: insufficientDeposit }
      )).to.be.revertedWith("Insufficient security deposit");
    });
  });

  describe("Liquidity Limit", function () {
    it("Should revert if coverage exceeds 80% of total liquidity", async function () {
      // Add liquidity to the pool
      const liquidityAmount = ethers.utils.parseEther("10000");
      const allocations = [5000, 5000]; // 50% to each bucket
      await insurancePool.connect(provider).addLiquidity(allocations, {
        value: liquidityAmount,
      });

      // Calculate coverage amount that exceeds 80% of total liquidity
      const coverageAmount = ethers.utils.parseEther("8001"); // 80.01% of 10000
      const securityDeposit = coverageAmount.mul(20).div(100);

      // Attempt to purchase coverage exceeding the limit and expect a revert
      await expect(
        insurancePool.connect(buyer).purchaseCoverage(
          coverageAmount,
          { value: securityDeposit }
        )
      ).to.be.revertedWith("Coverage exceeds 80% of total liquidity");
    });
  });

  describe("Premium Deduction", function () {
    beforeEach(async function () {
      // Purchase coverage
      const coverageAmount = ethers.utils.parseEther("1000"); // Reduced coverage amount
      const securityDeposit = coverageAmount.mul(20).div(100);
      await insurancePool.connect(buyer).purchaseCoverage(
        coverageAmount,
        { value: securityDeposit }
      );
    });

    it("Should deduct premiums from yield first", async function () {
      // TODO: Implement yield distribution test
    });
  });
});
