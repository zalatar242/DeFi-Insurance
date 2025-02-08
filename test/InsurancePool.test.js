const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("InsurancePool", function () {
  let insurancePool;
  let insuranceOracle;
  let owner;
  let buyer;
  let provider;

  const AAVE_PROTOCOL_ID = ethers.utils.formatBytes32String("AAVE");
  const SMART_CONTRACT_RISK = ethers.utils.formatBytes32String("SMART_CONTRACT");
  const LIQUIDITY_RISK = ethers.utils.formatBytes32String("LIQUIDITY");
  const STABLECOIN_RISK = ethers.utils.formatBytes32String("STABLECOIN");

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

    // Initialize protocol
    await insurancePool.addProtocol(AAVE_PROTOCOL_ID, "Aave", insuranceOracle.address);

    // Add risk pools
    await insurancePool.addRiskPool(AAVE_PROTOCOL_ID, SMART_CONTRACT_RISK, 150);
    await insurancePool.addRiskPool(AAVE_PROTOCOL_ID, LIQUIDITY_RISK, 120);
    await insurancePool.addRiskPool(AAVE_PROTOCOL_ID, STABLECOIN_RISK, 180);

    // Unpause
    await insurancePool.unpause();
  });

  describe("Coverage Purchase", function () {
    it("Should allow purchasing coverage with security deposit", async function () {
      const coverageAmount = ethers.utils.parseEther("100");
      const securityDeposit = coverageAmount.mul(20).div(100); // 20%

      await expect(insurancePool.connect(buyer).purchaseCoverage(
        AAVE_PROTOCOL_ID,
        coverageAmount,
        { value: securityDeposit }
      )).to.emit(insurancePool, "CoveragePurchased")
        .withArgs(
          buyer.address,
          AAVE_PROTOCOL_ID,
          coverageAmount,
          securityDeposit,
          [SMART_CONTRACT_RISK, LIQUIDITY_RISK, STABLECOIN_RISK],
          [securityDeposit.div(3), securityDeposit.div(3), securityDeposit.div(3)]
        );

      const coverage = await insurancePool.getCoverage(buyer.address);
      expect(coverage.isActive).to.be.true;
      expect(coverage.amount).to.equal(coverageAmount);
      expect(coverage.securityDeposit).to.equal(securityDeposit);
    });

    it("Should reject purchase with insufficient security deposit", async function () {
      const coverageAmount = ethers.utils.parseEther("100");
      const insufficientDeposit = coverageAmount.mul(19).div(100); // 19% instead of required 20%

      await expect(insurancePool.connect(buyer).purchaseCoverage(
        AAVE_PROTOCOL_ID,
        coverageAmount,
        { value: insufficientDeposit }
      )).to.be.revertedWith("Insufficient security deposit");
    });
  });

  describe("Premium Deduction", function () {
    beforeEach(async function () {
      // Purchase coverage
      const coverageAmount = ethers.utils.parseEther("100");
      const securityDeposit = coverageAmount.mul(20).div(100);
      await insurancePool.connect(buyer).purchaseCoverage(
        AAVE_PROTOCOL_ID,
        coverageAmount,
        { value: securityDeposit }
      );
    });

    it("Should deduct premiums from yield first", async function () {
      // TODO: Implement yield distribution test
    });
  });
});
