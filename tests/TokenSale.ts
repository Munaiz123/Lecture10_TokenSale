import { expect } from "chai";
import { viem } from "hardhat"
import {formatEther, parseEther} from 'viem'
import { loadFixture } from "@nomicfoundation/hardhat-toolbox-viem/network-helpers";

const TEST_RATIO = 100n;
const TEST_PRICE = 10n;
const TEST_ETH_PAYMENT_SIZE = parseEther("10");

describe("NFT Shop", async () => {
  
  
  describe("When the Shop contract is deployed", async () => {

    it.only("defines the ratio as provided in parameters", async () => {
      const { tokenSaleContract } = await loadFixture(deployFixture); // imported from fixture(bottom of file)
      let ratio = await tokenSaleContract.read.ratio();
      expect(ratio).to.equal(100n);
    })

    it.only("defines the price as provided in parameters", async () => {
      const { tokenSaleContract } = await loadFixture(deployFixture);
      let price = await tokenSaleContract.read.price();
      expect(price).to.equal(10n);
    });

    it.only("uses a valid ERC20 as payment token", async () => {
      const { tokenSaleContract, token, owner } = await loadFixture(deployFixture);

      let tokenAddress = await tokenSaleContract.read.token();
      let tokenContract = await viem.getContractAt("MyToken", tokenAddress)
      
      let totalSupply = await tokenContract.read.totalSupply();
      let ownerSupply = await tokenContract.read.balanceOf([owner.account.address]);
      let tokenContractSupply = await tokenContract.read.balanceOf([tokenAddress])

      
      let expectedAmount = 20n * (10n ** 8n) // accounts for the big numbers in Solidity + EVM
      expect(totalSupply).to.eq(expectedAmount)
      
      expectedAmount = 10n * (10n ** 8n) // accounts for the big numbers in Solidity + EVM
      expect(tokenContractSupply).to.eq(expectedAmount)
      expect(ownerSupply).to.eq(expectedAmount)

    });

    it.only("uses a valid ERC721 as NFT collection", async () => {
      const { tokenSaleContract, token, owner } = await loadFixture(deployFixture);

      let nftAddress = await tokenSaleContract.read.nft() // public var that returns address
      let nftContract = await viem.getContractAt("MyNFT", nftAddress)

      let nftSymbol = await nftContract.read.symbol()
      let nftName = await nftContract.read.name()

      expect(nftSymbol).to.eq("NFT")
      expect(nftName).to.eq("MyNFT")
    });
  })

  describe("When a user buys an ERC20 from the Token contract", async () => {  

    it.only("charges the correct amount of ETH", async () => {
      const { publicClient, tokenSaleContract, owner } = await loadFixture(deployFixture);

      let balanceBefore = await publicClient.getBalance({address: owner.account.address}) // checking balance of ETH
      let buyTokenTxn = await tokenSaleContract.write.buy({
        value: TEST_ETH_PAYMENT_SIZE,
        account:owner.account
      })

      let {gasUsed, effectiveGasPrice} = await publicClient.waitForTransactionReceipt({hash:buyTokenTxn})
      let gasCost = gasUsed * effectiveGasPrice // total "tax" paid as part of the txn

      let balanceAfter = await publicClient.getBalance({address: owner.account.address}) // checking balance of ETH

      let difference = balanceBefore - balanceAfter; // the balance before > balance after

      expect(difference).to.equal(TEST_ETH_PAYMENT_SIZE + gasCost);
      // expect(difference).to.be.greaterThan(0);

    })

    it.only("gives the correct amount of tokens", async () => {
      const {token, owner, tokenSaleContract, publicClient } = await loadFixture(deployFixture);
      // we expect the number of tokens in caller's address to increase by ratio

      let tokenBalanceBefore = await token.read.balanceOf([owner.account.address]);
      
      let buyTokenTxn = await tokenSaleContract.write.buy({
        value: TEST_ETH_PAYMENT_SIZE,
        account:owner.account
      })

      await publicClient.waitForTransactionReceipt({hash:buyTokenTxn})

      let tokenBalanceAfter = await token.read.balanceOf([owner.account.address]);

      let difference = tokenBalanceAfter - tokenBalanceBefore;
      expect(difference).to.equal(TEST_ETH_PAYMENT_SIZE * TEST_RATIO); // TODO

    });

  })

  describe("When a user burns an ERC20 at the Shop contract", async () => {
    it("gives the correct amount of ETH", async () => {
      throw new Error("Not implemented");
    })
    it("burns the correct amount of tokens", async () => {
      throw new Error("Not implemented");
    });
  })
  describe("When a user buys an NFT from the Shop contract", async () => {
    it("charges the correct amount of ERC20 tokens", async () => {
      throw new Error("Not implemented");
    })
    it("gives the correct NFT", async () => {
      throw new Error("Not implemented");
    });
  })
  describe("When a user burns their NFT at the Shop contract", async () => {
    it("gives the correct amount of ERC20 tokens", async () => {
      throw new Error("Not implemented");
    });
  })
  describe("When the owner withdraws from the Shop contract", async () => {
    it("recovers the right amount of ERC20 tokens", async () => {
      throw new Error("Not implemented");
    })
    it("updates the owner pool account correctly", async () => {
      throw new Error("Not implemented");
    });
  });
});

async function deployFixture() {
  // Get the public client for reading from the contract
  const publicClient = await viem.getPublicClient();

  // Get accounts + Addresses
  const [owner, addr1, addr2] = await viem.getWalletClients();
  const [ownerAddress, addr1Address, addr2Address] = await Promise.all([ owner.account.address, addr1.account.address, addr2.account.address,]);

  const token = await viem.deployContract("MyToken")
  const nft = await viem.deployContract("MyNFT")

  let tokenSaleContract = await viem.deployContract("TokenSale", [TEST_RATIO, TEST_PRICE, token.address, nft.address]);
  const grantTokenMinterRole = await token.write.grantRole(["0x9f2df0fed2c77648de5860a4cc508cd0818c85b8b8a1ab4ceeef8d981c8956a6",tokenSaleContract.address])
  

  return {    
    tokenSaleContract, // Contract instance
    publicClient, // Public client for reading contract state
    token,
    nft,

    // Wallet clients for sending transactions + wallet Addresses
    owner,
    addr1,
    addr2,
    ownerAddress,
    addr1Address,
    addr2Address,

  };
}