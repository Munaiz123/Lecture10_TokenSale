import { expect } from "chai";
import { viem } from "hardhat"
import {formatEther, parseEther} from 'viem'
import { loadFixture } from "@nomicfoundation/hardhat-toolbox-viem/network-helpers";

const TEST_RATIO = 100n;
const TEST_PRICE = 10n;
const TEST_ETH_PAYMENT_SIZE = parseEther("10");
const TEST_AMOUNT_TO_BURN = TEST_ETH_PAYMENT_SIZE * TEST_RATIO / 2n
const MINTER_ROLE = "0x9f2df0fed2c77648de5860a4cc508cd0818c85b8b8a1ab4ceeef8d981c8956a6"
const TEST_TOKEN_ID = 0n;

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

      
      let expectedAmount = 20n * (10n ** 18n) // accounts for the big numbers in Solidity + EVM
      expect(totalSupply).to.eq(expectedAmount)
      
      expectedAmount = 10n * (10n ** 18n) // accounts for the big numbers in Solidity + EVM
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
    it.only("gives the correct amount of ETH", async () => {
      const {token, owner, tokenSaleContract, publicClient } = await loadFixture(deployFixture);
      // 1. Call the buyTokens function
      let buyTokenHash = await tokenSaleContract.write.buy({
        value: TEST_ETH_PAYMENT_SIZE,
        account:owner.account
      })
      await publicClient.waitForTransactionReceipt({hash:buyTokenHash})

      // 2. Check ETH balance
      let ethBalanceBeforeBurn = await publicClient.getBalance({address: owner.account.address})
      
      // 3. A) Approve tokens to be spent
      let approveTokenTxn = await token.write.approve([tokenSaleContract.address, TEST_AMOUNT_TO_BURN],{account: owner.account})
      let approveTokenReceipt = await publicClient.waitForTransactionReceipt({hash: approveTokenTxn})
      let approveTokenGasCost = approveTokenReceipt.gasUsed * approveTokenReceipt.effectiveGasPrice

      // 3. Call burn function
      let returnTokentxn = await tokenSaleContract.write.returnToken([TEST_AMOUNT_TO_BURN])
      let {gasUsed, effectiveGasPrice} = await publicClient.waitForTransactionReceipt({hash:returnTokentxn})
      let gasCost = gasUsed * effectiveGasPrice // total "tax" paid as part of the txn

      // 4. Check ETH balance
      let ethBalanceAfterBurn = await publicClient.getBalance({address: owner.account.address})

      let difference = ethBalanceAfterBurn - ethBalanceBeforeBurn
      // 5. Check if difference is correct

      expect(difference).to.equal(TEST_ETH_PAYMENT_SIZE / 2n - gasCost - approveTokenGasCost);
    })

    it.only("burns the correct amount of tokens", async () => {
      const {token, owner, tokenSaleContract, publicClient } = await loadFixture(deployFixture);
      /* 1. Call the buyTokens function */
      let buyTokensTxn = await tokenSaleContract.write.buy({value: TEST_ETH_PAYMENT_SIZE, account: owner.account})
      /** the way tokenSaleContract.buy is 'payable' where you just 'throw' the money at the contract 
      and the amount of tokens you receive is determined by how much eth you're sending and the ratio */
      await publicClient.waitForTransactionReceipt({hash:buyTokensTxn}) 

      /** 2. Check token balance (before burn) */
      let tokenBalanceBefore = await token.read.balanceOf([owner.account.address])
      
      /** 3. A) Approve tokens to be spent  */
      let approveTokenTxn = await token.write.approve([tokenSaleContract.address, TEST_AMOUNT_TO_BURN],{account: owner.account})
      await publicClient.waitForTransactionReceipt({hash: approveTokenTxn})

      /** 3  B) Call burn function  */
      let returnTokensTxn = await tokenSaleContract.write.returnToken([TEST_AMOUNT_TO_BURN])
      await publicClient.waitForTransactionReceipt({hash: returnTokensTxn})

      /** 4. Check token balance (after burn) token balance should decrease */
      let tokenBalanceAfter = await token.read.balanceOf([owner.account.address])
      
      /** 5. Check if difference is correct*/
      let difference = tokenBalanceBefore - tokenBalanceAfter
      expect(difference).to.equal(TEST_AMOUNT_TO_BURN)

    });
  })

  describe("When a user buys an NFT from the Shop contract", async () => {
    it("charges the correct amount of ERC20 tokens", async () => {
      /**
       * 1. Buy ERC20 tokens - (tokenSalesContract.write.buy()) 
       * 2. Get ERC20 token balance BEFORE calling buyNFT()
       * 3. Approve ERC20 tokens to be spent
       * 4. Call buyNFT function
       * 5. Get ERC20 token balance AFTER calling buyNFT()
       * 6. Check difference
       */
    })
    it("gives the correct NFT", async () => {
        /**
       * 1. Buy ERC20 tokens - (tokenSalesContract.write.buy()) 
       * 2. Approve ERC20 tokens to be spent
       * 3. Call buyNFT() 
       * 4. Check owner of NFT
       */
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
  let grantTokenMinterRole = await token.write.grantRole([MINTER_ROLE,tokenSaleContract.address])
  let grantNFTMinterRole = await nft.write.grantRole([MINTER_ROLE, tokenSaleContract.address])

  

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