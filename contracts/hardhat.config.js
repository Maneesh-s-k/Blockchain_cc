/** @type import('hardhat/config').HardhatUserConfig */
/*
  add in .env inside contracts
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/your_infura_project_id
PRIVATE_KEY=private key from metamask
*/
require('dotenv').config();
require("@nomiclabs/hardhat-ethers");

const { SEPOLIA_RPC_URL, PRIVATE_KEY } = process.env;

module.exports = {
  solidity: "0.8.28",
  networks: {
    sepolia: {
      url: SEPOLIA_RPC_URL,
      accounts: [PRIVATE_KEY]
    }
  }
};
