// SPDX-License-Identifier: MIT
// Compatible with OpenZeppelin Contracts ^5.0.0
pragma solidity ^0.8.27;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract Vlaymen is ERC721, Ownable {
    uint256 private _nextTokenId = 0;

    constructor(address initialOwner)
        ERC721("vlaymen", "VLMN")
        Ownable(initialOwner)
    {}

    function _baseURI() internal pure override returns (string memory) {
      // TODO: update to Vercel url
        return "https://baseurl.com/";
    }

    function safeMint(address to) public returns (uint256) {
        uint256 tokenId = _nextTokenId++;
        _safeMint(to, tokenId);
        return tokenId;
    }
}
