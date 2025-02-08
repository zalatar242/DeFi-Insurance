const hre = require("hardhat");

async function main() {
  // Deploy InsuranceOracle
  const InsuranceOracle = await hre.ethers.getContractFactory("InsuranceOracle");
  const oracle = await InsuranceOracle.deploy();
  await oracle.deployed();
  console.log("InsuranceOracle deployed to:", oracle.address);

  // Deploy InsurancePool
  const InsurancePool = await hre.ethers.getContractFactory("InsurancePool");
  const pool = await InsurancePool.deploy();
  await pool.deployed();
  console.log("InsurancePool deployed to:", pool.address);

  // Setup initial configuration
  const AAVE_PROTOCOL_ID = ethers.utils.formatBytes32String("AAVE");

  // Risk types
  const SMART_CONTRACT_RISK = ethers.utils.formatBytes32String("SMART_CONTRACT");
  const LIQUIDITY_RISK = ethers.utils.formatBytes32String("LIQUIDITY");
  const STABLECOIN_RISK = ethers.utils.formatBytes32String("STABLECOIN");

  // Add protocol and risk pools
  await pool.addProtocol(AAVE_PROTOCOL_ID, "Aave", oracle.address);
  console.log("Added Aave protocol");

  await pool.addRiskPool(AAVE_PROTOCOL_ID, SMART_CONTRACT_RISK, 150); // 1.5x weight
  await pool.addRiskPool(AAVE_PROTOCOL_ID, LIQUIDITY_RISK, 120);     // 1.2x weight
  await pool.addRiskPool(AAVE_PROTOCOL_ID, STABLECOIN_RISK, 180);    // 1.8x weight
  console.log("Added risk pools");

  // Configure oracle for each risk type
  const chainlinkParams = {
    jobIds: {
      SMART_CONTRACT: ethers.utils.formatBytes32String("tvl-monitor"),
      LIQUIDITY: ethers.utils.formatBytes32String("liquidity-monitor"),
      STABLECOIN: ethers.utils.formatBytes32String("price-monitor")
    },
    fees: {
      SMART_CONTRACT: ethers.utils.parseEther("0.1"),
      LIQUIDITY: ethers.utils.parseEther("0.1"),
      STABLECOIN: ethers.utils.parseEther("0.1")
    },
    heartbeats: {
      SMART_CONTRACT: 3600,  // 1 hour
      LIQUIDITY: 1,         // 1 block
      STABLECOIN: 300      // 5 minutes
    }
  };

  // Configure oracles
  await oracle.configureOracle(
    SMART_CONTRACT_RISK,
    "0x...", // Chainlink oracle address
    chainlinkParams.jobIds.SMART_CONTRACT,
    chainlinkParams.fees.SMART_CONTRACT,
    chainlinkParams.heartbeats.SMART_CONTRACT,
    80,  // 80% TVL drop threshold
    18   // decimals
  );

  await oracle.configureOracle(
    LIQUIDITY_RISK,
    "0x...", // Chainlink oracle address
    chainlinkParams.jobIds.LIQUIDITY,
    chainlinkParams.fees.LIQUIDITY,
    chainlinkParams.heartbeats.LIQUIDITY,
    100, // 1% liquidity threshold
    18   // decimals
  );

  await oracle.configureOracle(
    STABLECOIN_RISK,
    "0x...", // Chainlink oracle address
    chainlinkParams.jobIds.STABLECOIN,
    chainlinkParams.fees.STABLECOIN,
    chainlinkParams.heartbeats.STABLECOIN,
    95,  // $0.95 price threshold
    8    // decimals
  );

  console.log("Configured oracles");

  // Unpause the pool
  await pool.unpause();
  console.log("Insurance pool activated");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
