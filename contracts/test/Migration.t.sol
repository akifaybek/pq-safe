// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {Migration} from "../src/Migration.sol";

contract MigrationTest is Test {
    /// @dev secp256k1 curve order — fuzz edilen private key'leri bu aralığa
    /// sığdırmak için (0 ve n geçersiz private key'lerdir).
    uint256 private constant _SECP256K1_ORDER = 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141;

    Migration internal migration;

    uint256 internal oldPrivateKey = 0xA11CE;
    address internal oldAddress;
    address internal newAddress = address(0xB0B);

    function setUp() public {
        migration = new Migration();
        oldAddress = vm.addr(oldPrivateKey);
    }

    function _sign(uint256 privateKey, address old_, address new_) internal view returns (bytes memory) {
        bytes32 messageHash = keccak256(abi.encode(migration.MIGRATION_DOMAIN_SEPARATOR(), old_, new_));
        bytes32 ethSignedMessageHash = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", messageHash));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(privateKey, ethSignedMessageHash);
        return abi.encodePacked(r, s, v);
    }

    function test_ProveOwnership_Succeeds() public {
        bytes memory signature = _sign(oldPrivateKey, oldAddress, newAddress);

        vm.expectEmit(true, true, false, false, address(migration));
        emit Migration.MigrationProven(oldAddress, newAddress);

        migration.proveOwnership(oldAddress, newAddress, signature);

        assertTrue(migration.migrated(oldAddress));
        assertEq(migration.migratedTo(oldAddress), newAddress);
    }

    function test_RevertsOnSecondAttempt() public {
        bytes memory signature = _sign(oldPrivateKey, oldAddress, newAddress);
        migration.proveOwnership(oldAddress, newAddress, signature);

        address anotherNewAddress = address(0xC0FFEE);
        bytes memory secondSignature = _sign(oldPrivateKey, oldAddress, anotherNewAddress);

        vm.expectRevert(abi.encodeWithSelector(Migration.AlreadyMigrated.selector, oldAddress));
        migration.proveOwnership(oldAddress, anotherNewAddress, secondSignature);
    }

    function test_RevertsOnWrongSigner() public {
        uint256 attackerPrivateKey = 0xBAD;
        bytes memory signature = _sign(attackerPrivateKey, oldAddress, newAddress);

        vm.expectRevert(Migration.InvalidSignature.selector);
        migration.proveOwnership(oldAddress, newAddress, signature);
    }

    function test_RevertsOnTamperedMessage() public {
        // oldAddress kendi imzasını doğru şekilde üretti, ama newAddress
        // çağrı sırasında değiştirildi (imza artık farklı bir mesaj için geçerli).
        bytes memory signature = _sign(oldPrivateKey, oldAddress, newAddress);
        address tamperedNewAddress = address(0xDEAD);

        vm.expectRevert(Migration.InvalidSignature.selector);
        migration.proveOwnership(oldAddress, tamperedNewAddress, signature);
    }

    function test_RevertsOnZeroNewAddress() public {
        bytes memory signature = _sign(oldPrivateKey, oldAddress, address(0));

        vm.expectRevert(Migration.InvalidNewAddress.selector);
        migration.proveOwnership(oldAddress, address(0), signature);
    }

    function test_RevertsOnInvalidSignatureLength() public {
        bytes memory shortSignature = hex"1234";

        vm.expectRevert(abi.encodeWithSelector(Migration.InvalidSignatureLength.selector, shortSignature.length));
        migration.proveOwnership(oldAddress, newAddress, shortSignature);
    }

    function test_RevertsOnHighSValue() public {
        bytes memory signature = _sign(oldPrivateKey, oldAddress, newAddress);
        (bytes32 r, bytes32 s, uint8 v) = _splitSignature(signature);

        // secp256k1n - s: eğer orijinal s zaten "low" ise (ki vm.sign hep low-s
        // döner), n - s kesin olarak "high" taraftadır ve reddedilmeli.
        bytes32 highS = bytes32(_SECP256K1_ORDER - uint256(s));
        bytes memory malleableSignature = abi.encodePacked(r, highS, v);

        vm.expectRevert(Migration.InvalidSignatureSValue.selector);
        migration.proveOwnership(oldAddress, newAddress, malleableSignature);
    }

    function test_RevertsOnInvalidVValue() public {
        bytes memory signature = _sign(oldPrivateKey, oldAddress, newAddress);
        (bytes32 r, bytes32 s,) = _splitSignature(signature);
        bytes memory badVSignature = abi.encodePacked(r, s, uint8(29));

        vm.expectRevert(abi.encodeWithSelector(Migration.InvalidSignatureVValue.selector, uint8(29)));
        migration.proveOwnership(oldAddress, newAddress, badVSignature);
    }

    function testFuzz_ProveOwnership_ArbitrarySigner(uint256 privateKeySeed, address fuzzedNewAddress) public {
        vm.assume(fuzzedNewAddress != address(0));
        uint256 privateKey = bound(privateKeySeed, 1, _SECP256K1_ORDER - 1);
        address signerAddress = vm.addr(privateKey);

        bytes memory signature = _sign(privateKey, signerAddress, fuzzedNewAddress);
        migration.proveOwnership(signerAddress, fuzzedNewAddress, signature);

        assertTrue(migration.migrated(signerAddress));
        assertEq(migration.migratedTo(signerAddress), fuzzedNewAddress);

        vm.expectRevert(abi.encodeWithSelector(Migration.AlreadyMigrated.selector, signerAddress));
        migration.proveOwnership(signerAddress, fuzzedNewAddress, signature);
    }

    function _splitSignature(bytes memory signature) private pure returns (bytes32 r, bytes32 s, uint8 v) {
        assembly {
            r := mload(add(signature, 0x20))
            s := mload(add(signature, 0x40))
            v := byte(0, mload(add(signature, 0x60)))
        }
    }
}
