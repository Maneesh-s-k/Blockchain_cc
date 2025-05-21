/** @type import('hardhat/config').HardhatUserConfig */
require("@nomiclabs/hardhat-ethers");
module.exports = {
  solidity: "0.8.21",
  networks: {
    sepolia: {
      url: "YOUR_RPC_URL", // e.g., from Infura, Alchemy, or QuickNode
      accounts: ["YOUR_PRIVATE_KEY"] // without 0x
    }
  }
};
