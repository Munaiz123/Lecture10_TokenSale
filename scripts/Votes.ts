
import { viem } from "hardhat";
import { toHex, hexToString, formatEther, size } from "viem";
import { privateKeyToAccount } from 'viem/accounts'


const main = async () => {

    const publicClient = await viem.getPublicClient();
    const [deployer, account1, account2] = await viem.getWalletClients();
    const myTokenContract = await viem.deployContract("MyToken");

    console.log(`Token contract deployed at ${myTokenContract.address}\n`);

}


main()
.catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
