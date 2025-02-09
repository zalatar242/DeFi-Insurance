require('dotenv').config();
const { ethers } = require("hardhat");
const hre = require("hardhat");
const { formatEther, parseEther } = ethers.utils;

// Sepolia Chainlink Price Feed Addresses
const SEPOLIA_FEEDS = {
  USDC: "0xA2F78ab2355fe2f984D808B5CeE7FD0A93D5270E", // USDC/USD price feed on Sepolia
};

// Validate environment variables for Sepolia deployment
function validateSepoliaEnv() {
  const requiredVars = ['SEPOLIA_URL', 'PRIVATE_KEY', 'RLUSD_ADDRESS', 'UTILIZATION_FEED'];
  for (const varName of requiredVars) {
    if (!process.env[varName]) {
      throw new Error(`Missing required environment variable: ${varName}`);
    }
  }
}

async function main() {
  // Get the target network from environment
  const network = process.env.NETWORK || 'local';
  const isLocal = network === 'local';

  if (!['local', 'sepolia'].includes(network)) {
    throw new Error('Invalid network. Use NETWORK=local or NETWORK=sepolia');
  }

  // Validate environment variables for Sepolia
  if (!isLocal) {
    validateSepoliaEnv();
  }

  console.log(`\nDeploying to ${network.toUpperCase()} network`);
  console.log("=============================");

  if (isLocal) {
    console.log("\nNetwork Details for MetaMask:");
    console.log("=============================");
    console.log("Network Name: Hardhat Local");
    console.log("RPC URL: http://127.0.0.1:8545");
    console.log("Chain ID: 31337");
    console.log("Currency Symbol: ETH");

    const testAccount = {
      address: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
      privateKey: "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"
    };

    console.log("\nTest Account Details:");
    console.log("=====================");
    console.log("Address:", testAccount.address);
    console.log("Private Key:", testAccount.privateKey);
  }

  console.log("\nDeployment Starting...\n");

  const deployer = await ethers.provider.getSigner();
  const deployerAddress = await deployer.getAddress();
  const deployerBalance = await ethers.provider.getBalance(deployerAddress);

  console.log("Deployer Address:", deployerAddress);
  console.log("Deployer Balance:", formatEther(deployerBalance.toString()), "ETH");

  // Deploy InsuranceOracle
  const InsuranceOracle = await hre.ethers.getContractFactory("InsuranceOracle");
  const oracle = await InsuranceOracle.deploy();
  await oracle.deployed();
  console.log("InsuranceOracle deployed to:", oracle.address);

  // Deploy PayoutManager
  const PayoutManager = await hre.ethers.getContractFactory("PayoutManager");
  const payoutManager = await PayoutManager.deploy();
  await payoutManager.deployed();
  console.log("PayoutManager deployed to:", payoutManager.address);

  let rlusd;
  if (isLocal) {
    // Deploy mock RLUSD only in local environment
    const RLUSDMock = await hre.ethers.getContractFactory("RLUSDMock");
    rlusd = await RLUSDMock.deploy();
    await rlusd.deployed();
    console.log("RLUSDMock deployed to:", rlusd.address);
  } else {
    // Use RLUSD address from environment for Sepolia
    rlusd = { address: process.env.RLUSD_ADDRESS };
    console.log("Using RLUSD at:", rlusd.address);
  }

  console.log("\nDeploying core contracts...");

  // Deploy InsurancePool
  const InsurancePool = await hre.ethers.getContractFactory("InsurancePool");
  const pool = await InsurancePool.deploy(rlusd.address);
  await pool.deployed();
  console.log("InsurancePool deployed to:", pool.address);

  // Set up contract connections
  console.log("\nConfiguring contract connections...");

  await pool.setPayoutManager(payoutManager.address);
  console.log("✓ PayoutManager address set in InsurancePool");

  await pool.setOracle(oracle.address);
  console.log("✓ Oracle address set in InsurancePool");

  await payoutManager.setInsurancePool(pool.address);
  console.log("✓ InsurancePool address set in PayoutManager");

  await payoutManager.setOracle(oracle.address);
  console.log("✓ Oracle address set in PayoutManager");

  let stablecoinFeed, utilizationFeed;
  if (isLocal) {
    console.log("\nDeploying mock price feeds...");
    // Deploy Chainlink mocks only in local environment
    const ChainlinkMock = await hre.ethers.getContractFactory("ChainlinkMock");
    stablecoinFeed = await ChainlinkMock.deploy(1e8, Math.floor(Date.now() / 1000)); // $1.00
    await stablecoinFeed.deployed();
    console.log("✓ Stablecoin feed deployed to:", stablecoinFeed.address);

    utilizationFeed = await ChainlinkMock.deploy(50e6, Math.floor(Date.now() / 1000)); // 50%
    await utilizationFeed.deployed();
    console.log("✓ Utilization feed deployed to:", utilizationFeed.address);
  } else {
    // Use actual Chainlink feeds from environment for Sepolia
    stablecoinFeed = { address: SEPOLIA_FEEDS.USDC };
    utilizationFeed = { address: process.env.UTILIZATION_FEED };
    console.log("\nUsing Sepolia price feeds:");
    console.log("✓ USDC/USD feed:", stablecoinFeed.address);
    console.log("✓ Utilization feed:", utilizationFeed.address);
  }

  // Set InsurancePool address in InsuranceOracle
  await oracle.setInsurancePool(pool.address);
  console.log("InsurancePool address set in InsuranceOracle");

  // Add RLUSD to InsuranceOracle
  await oracle.addStablecoin(rlusd.address, stablecoinFeed.address, "RLUSD");
  console.log("RLUSD added to InsuranceOracle");

  // Set utilization feed in InsuranceOracle
  await oracle.setUtilizationFeed(utilizationFeed.address);
  console.log("Utilization feed set in InsuranceOracle");

  // Unpause the pool
  await pool.unpause();
  console.log("Insurance pool activated");

  if (isLocal) {
    // Set up initial liquidity only in local environment
    const initialLiquidity = parseEther("10"); // 10 RLUSD initial liquidity
    const rlusdBalance = await rlusd.balanceOf(deployerAddress);
    console.log("Initial RLUSD Balance:", formatEther(rlusdBalance));

    await rlusd.approve(pool.address, initialLiquidity);
    await pool.addLiquidity(initialLiquidity);
    console.log("Added initial liquidity:", formatEther(initialLiquidity), "RLUSD");

    const remainingBalance = await rlusd.balanceOf(deployerAddress);
    console.log("Remaining RLUSD Balance:", formatEther(remainingBalance));
  }

  // Save contract addresses and ABIs to a JSON file
  const fs = require('fs');
  const contracts = {
    network,
    InsuranceOracle: {
      address: oracle.address,
      abi: InsuranceOracle.interface.format('json')
    },
    InsurancePool: {
      address: pool.address,
      abi: InsurancePool.interface.format('json')
    },
    PayoutManager: {
      address: payoutManager.address,
      abi: PayoutManager.interface.format('json')
    },
    RLUSD: {
      address: rlusd.address,
      abi: isLocal ? (await hre.ethers.getContractFactory("RLUSDMock")).interface.format('json') : null
    }
  };

  fs.writeFileSync(
    'frontend/src/contracts.json',
    JSON.stringify(contracts, null, 2)
  );
  console.log('Contract addresses and ABIs saved to frontend/src/contracts.json');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
