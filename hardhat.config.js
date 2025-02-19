require("@nomicfoundation/hardhat-toolbox");
require('dotenv').config();

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    compilers:[
      {
        version: "0.8.0"
      },
      {
        version: "0.8.13"
      },
      {
        version: "0.8.25"
      }
    ]
  },
  etherscan: {
    apiKey: {
      sepolia: process.env.SEPOLIA_API_KEY
    }
  },
  networks:{
    sepoliaTestnet:{
      url: `https://sepolia.infura.io/v3/${process.env.INFURA_KEY}`,
      accounts: [process.env.PRIVATE_KEY] ,
    },

  }
};
