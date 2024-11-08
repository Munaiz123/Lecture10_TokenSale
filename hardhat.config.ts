import { task, type HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox-viem";

import * as dotenv from "dotenv";
dotenv.config();


const providerApiKey = process.env.ALCHEMY_API_KEY || "";
const munzyTest = process.env.MUNZY_TEST_PRIVATE_KEY || "";
const account1 = process.env.ACCOUNT1_PRIVATE_KEY || "";

const config: HardhatUserConfig = {
  solidity: "0.8.27",
  networks: {
    sepolia: {
      url: `https://eth-sepolia.g.alchemy.com/v2/${providerApiKey}`,
      // url: "https://ethereum-sepolia-rpc.publicnode.com",
      accounts: [munzyTest,account1]
    },
    baseSepolia: {
      // url: "https://sepolia.base.org",
      url:`https://base-sepolia.g.alchemy.com/v2/${providerApiKey}`,
      accounts: [munzyTest, account1],
      chainId: 84532
    }
  },
};

export default config;

task("accounts", "Prints the list of accounts", async (taskArgs, hre) => {
  const accounts = await hre.viem.getWalletClients();

  for (const account of accounts) {
    console.log(account.account.address);
  }
  
});