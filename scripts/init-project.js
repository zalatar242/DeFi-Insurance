const fs = require('fs');
const { execSync } = require('child_process');

function initProject() {
    console.log('Initializing DeFi Insurance Protocol project...');

    // Create necessary directories
    const dirs = [
        'contracts/core',
        'contracts/interfaces',
        'contracts/oracle',
        'test/unit',
        'test/integration',
        'scripts'
    ];

    dirs.forEach(dir => {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
            console.log(`Created directory: ${dir}`);
        }
    });

    // Install dependencies if not already installed
    if (!fs.existsSync('node_modules')) {
        console.log('Installing dependencies...');
        execSync('npm install --save-dev hardhat @nomiclabs/hardhat-ethers ethers @nomiclabs/hardhat-waffle ethereum-waffle chai @openzeppelin/contracts @chainlink/contracts @nomicfoundation/hardhat-toolbox', { stdio: 'inherit' });
    }

    // Create .env file if it doesn't exist
    if (!fs.existsSync('.env')) {
        fs.writeFileSync('.env', `
PRIVATE_KEY=your_private_key_here
SEPOLIA_URL=your_sepolia_url_here
ETHERSCAN_API_KEY=your_etherscan_api_key_here
        `.trim());
        console.log('Created .env file');
    }

    // Create .gitignore if it doesn't exist
    if (!fs.existsSync('.gitignore')) {
        fs.writeFileSync('.gitignore', `
node_modules
.env
coverage
coverage.json
typechain
typechain-types
.idea
.vscode

# Hardhat files
cache
artifacts
        `.trim());
        console.log('Created .gitignore file');
    }

    console.log('Project initialization complete!');
    console.log('Next steps:');
    console.log('1. Configure your .env file with your private key and network URLs');
    console.log('2. Run "npx hardhat compile" to compile contracts');
    console.log('3. Run "npx hardhat test" to run tests');
}

// Execute initialization
initProject();
