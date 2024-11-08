// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol"; 
import {MyToken} from "./MyERC20.sol";
import {MyNFT} from "./MyERC721.sol";

contract TokenSale is Ownable {
    uint256 public ratio;
    uint256 public price;
    MyToken public token;
    MyNFT public nft;

    constructor(uint256 _ratio, uint256 _price, MyToken _tokenAddress, MyNFT _nftAddress) Ownable(msg.sender) {

        ratio = _ratio;  
        price = _price;
        // Below: you can type check what the public var is being assigned 
        // OR the constructore can declare the type it accepts.
        token = _tokenAddress;
        nft = _nftAddress;
    } 

    function buy() public payable{
        //TODO
    }

}