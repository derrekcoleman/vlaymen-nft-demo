// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {Test} from "forge-std/Test.sol";
import {Vlaymen} from "../contracts/Vlaymen.sol";

contract VlaymenTest is Test {
  Vlaymen public instance;
  address public initialOwner;
  address public alice;
  address public bob;

  function setUp() public {
    initialOwner = vm.addr(1);
    alice = vm.addr(2);
    bob = vm.addr(3);
    instance = new Vlaymen(initialOwner);
  }

  function testName() public view {
    assertEq(instance.name(), "vlaymen");
  }
  
  function testNonOwnerCanMint() public {
    // Switch to a non-owner account
    vm.startPrank(alice);
    
    // Alice should be able to mint an NFT
    uint256 tokenId = instance.safeMint(alice);
    
    // Verify ownership
    assertEq(instance.ownerOf(tokenId), alice);
    vm.stopPrank();
  }
  
  function testCanTransferOwnedNFT() public {
    // Mint an NFT for Alice
    vm.startPrank(alice);
    uint256 tokenId = instance.safeMint(alice);
    
    // Alice transfers her NFT to Bob
    instance.transferFrom(alice, bob, tokenId);
    
    // Verify the transfer worked
    assertEq(instance.ownerOf(tokenId), bob);
    vm.stopPrank();
  }
  
  function testCannotTransferUnownedNFT() public {
    // Mint an NFT for Alice
    vm.startPrank(alice);
    uint256 tokenId = instance.safeMint(alice);
    vm.stopPrank();
    
    // Bob tries to transfer Alice's NFT
    vm.startPrank(bob);
    
    // Should revert when Bob tries to transfer Alice's NFT
    vm.expectRevert();
    instance.transferFrom(alice, bob, tokenId);
    
    // Verify the NFT is still owned by Alice
    assertEq(instance.ownerOf(tokenId), alice);
    vm.stopPrank();
  }
  
  function testCannotTransferUnmintedNFT() public {
    uint256 unmintedTokenId = 999;
    
    // Alice tries to transfer an unminted NFT
    vm.startPrank(alice);
    
    // Should revert when trying to transfer a token that doesn't exist
    vm.expectRevert();
    instance.transferFrom(alice, bob, unmintedTokenId);
    
    vm.stopPrank();
  }
}
