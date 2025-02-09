const { expect } = require("chai");
const { ethers } = require("hardhat");
const { utils } = ethers;

describe("InsurancePool", function () {
  let insurancePool;
  let rlusd;
  let insuranceOracle;
  let owner;
  let buyer;
  let provider;
  let buyer2;
  let buyer3;

  beforeEach(async function () {
    [owner, buyer, provider, buyer2, buyer3] = await ethers.getSigners();

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

    // Set Oracle
    await insurancePool.setOracle(insuranceOracle.address);

    // Unpause
    await insurancePool.unpause();

    // Give test accounts some RLUSD
    const amount = ethers.utils.parseEther("10000");
    await rlusd.transfer(buyer.address, amount);
    await rlusd.transfer(provider.address, amount);
    await rlusd.transfer(buyer2.address, amount);
    await rlusd.transfer(buyer3.address, amount);
  });

  describe("Liquidity and Coverage Calculations", function () {
    it("should correctly track liquidity and available coverage", async function () {
      // Initial liquidity: provider adds 10 RLUSD
      const initialLiquidity = utils.parseEther("10");
      await rlusd.connect(provider).approve(insurancePool.address, initialLiquidity);
      await insurancePool.connect(provider).addLiquidity(initialLiquidity);

      // Check initial state
      let totalLiquidity = await insurancePool.getTotalLiquidity();
      expect(totalLiquidity).to.equal(initialLiquidity);
      expect(totalLiquidity).to.equal(utils.parseEther("10")); // 10 RLUSD

      // Calculate available coverage (80% of initial liquidity)
      const availableCoverage = initialLiquidity.mul(80).div(100);
      expect(availableCoverage).to.equal(utils.parseEther("8")); // 8 RLUSD

      // Purchase coverage of 4 RLUSD
      const coverageAmount = utils.parseEther("4");
      const securityDeposit = coverageAmount.mul(20).div(100); // 20% = 0.8 RLUSD

      await rlusd.connect(buyer).approve(insurancePool.address, securityDeposit);
      await insurancePool.connect(buyer).purchaseCoverage(coverageAmount);

      // Verify system state after coverage purchase:
      // 1. Total liquidity should be initial + security deposit
      totalLiquidity = await insurancePool.getTotalLiquidity();
      expect(totalLiquidity).to.equal(initialLiquidity.add(securityDeposit));
      expect(totalLiquidity).to.equal(utils.parseEther("10.8")); // 10 + 0.8 RLUSD

      // 2. Coverage details for buyer should be correct
      const coverage = await insurancePool.getCoverage(buyer.address);
      expect(coverage.amount).to.equal(coverageAmount); // 4 RLUSD coverage
      expect(coverage.securityDeposit).to.equal(securityDeposit); // 0.8 RLUSD deposit
      expect(coverage.isActive).to.be.true;

      // 3. Remaining available coverage should be:
      // Initial available (8) - Coverage taken (4) + Security deposit (0.8) = 4.8 RLUSD
      const expectedRemaining = utils.parseEther("4.8");

      // Test we can't exceed available coverage with a different buyer
      const slightlyTooMuch = expectedRemaining.add(utils.parseEther("0.1")); // Try 4.9 RLUSD
      const tooMuchDeposit = slightlyTooMuch.mul(20).div(100);
      await rlusd.connect(buyer2).approve(insurancePool.address, tooMuchDeposit);

      // This should fail as it exceeds available coverage
      await expect(
        insurancePool.connect(buyer2).purchaseCoverage(slightlyTooMuch)
      ).to.be.revertedWith("Coverage exceeds 80% of initial liquidity");

      // Test we can use exactly the remaining coverage with another buyer
      const remainingDeposit = expectedRemaining.mul(20).div(100);
      await rlusd.connect(buyer3).approve(insurancePool.address, remainingDeposit);

      // This should succeed as it's exactly the available coverage
      await expect(
        insurancePool.connect(buyer3).purchaseCoverage(expectedRemaining)
      ).to.not.be.reverted;

      // Verify final state
      const finalLiquidity = await insurancePool.getTotalLiquidity();
      expect(finalLiquidity).to.equal(
        initialLiquidity.add(securityDeposit).add(remainingDeposit)
      );
    });
  });
});
