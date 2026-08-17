// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {MockVerifier} from "./MockVerifier.sol";

contract MockVerifierTest is Test {
    MockVerifier internal verifier;

    function setUp() public {
        verifier = new MockVerifier();
    }

    function test_AlwaysReturnsTrue() public view {
        assertTrue(verifier.verify(bytes32(0), "", ""));
    }

    function testFuzz_AlwaysReturnsTrue(bytes32 digest, bytes calldata signature, bytes calldata publicKey) public view {
        assertTrue(verifier.verify(digest, signature, publicKey));
    }
}
