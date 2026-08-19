// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import {SPHINCSVerifier} from "../src/verifier/SPHINCSVerifier.sol";

/// @notice C13 KAT (Known-Answer-Test) doğrulaması + IPQVerifier sözleşmesinin
///         "asla revert etmez" garantisinin testi. Fixture, Rust CLI imzalayıcı
///         (contracts/lib/sphincs-minus/signer-wasm) ile üretildi ve dosyaya
///         gömüldü — FFI gerekmiyor, deterministik ve hızlı tekrarlanabilir
///         (bkz. contracts/test/fixtures/c13-kat.json içindeki "reproduce" alanı).
contract SPHINCSVerifierTest is Test {
    SPHINCSVerifier verifier;
    string constant FIXTURE = "test/fixtures/c13-kat.json";

    bytes32 pkSeed;
    bytes32 pkRoot;
    bytes32 message;
    bytes sig;
    bytes publicKey;

    function setUp() public {
        verifier = new SPHINCSVerifier();

        string memory json = vm.readFile(FIXTURE);
        pkSeed  = vm.parseJsonBytes32(json, ".public_key.pkSeed");
        pkRoot  = vm.parseJsonBytes32(json, ".public_key.pkRoot");
        message = vm.parseJsonBytes32(json, ".inputs.message");
        sig     = vm.parseJsonBytes(json, ".signature");
        publicKey = abi.encodePacked(pkSeed, pkRoot);
    }

    function test_ValidSignatureVerifies() public view {
        assertEq(sig.length, 3688, "C13 sig must be 3688 bytes");
        assertEq(publicKey.length, 64, "publicKey must be pkSeed||pkRoot = 64 bytes");
        assertTrue(verifier.verify(message, sig, publicKey), "valid C13 signature must verify");
    }

    function test_RejectsWrongMessage() public view {
        bytes32 wrongMessage = bytes32(uint256(message) ^ 1);
        assertFalse(verifier.verify(wrongMessage, sig, publicKey), "tampered message must not verify");
    }

    function test_RejectsTamperedSignature() public view {
        bytes memory tampered = sig;
        tampered[100] = tampered[100] == 0xff ? bytes1(0x00) : bytes1(0xff);
        assertFalse(verifier.verify(message, tampered, publicKey), "tampered signature must not verify");
    }

    /// @notice Arayüz sözleşmesi garantisi: referans SphincsC13Asm.verify() bu
    ///         girdide revert eder (bkz. contracts/lib/sphincs-minus/src/SPHINCs-C13Asm.sol,
    ///         "Invalid sig length"). Bizim SPHINCSVerifier bunu yakalayıp false
    ///         döndürmeli, revert ETMEMELİ.
    function test_WrongSigLengthReturnsFalseNotRevert() public view {
        bytes memory shortSig = new bytes(10);
        bool ok = verifier.verify(message, shortSig, publicKey);
        assertFalse(ok, "malformed-length signature must return false, not revert");
    }

    /// @notice Referans kontrat non-canonical pkSeed/pkRoot'ta da revert eder
    ///         ("Invalid public key"). Aynı garanti burada da geçerli olmalı.
    function test_NonCanonicalPublicKeyReturnsFalseNotRevert() public view {
        bytes memory badPk = abi.encodePacked(bytes32(uint256(1)), bytes32(uint256(2)));
        bool ok = verifier.verify(message, sig, badPk);
        assertFalse(ok, "non-canonical public key must return false, not revert");
    }

    function test_WrongPublicKeyLengthReturnsFalseNotRevert() public view {
        bytes memory badPk = new bytes(63);
        bool ok = verifier.verify(message, sig, badPk);
        assertFalse(ok, "wrong-length public key must return false, not revert");
    }

    function test_EmptySignatureReturnsFalseNotRevert() public view {
        bool ok = verifier.verify(message, bytes(""), publicKey);
        assertFalse(ok, "empty signature must return false, not revert");
    }

    function testFuzz_NeverReverts(bytes32 digest, bytes calldata signature, bytes calldata publicKeyFuzz) public view {
        // "ASLA revert etmez" garantisinin fuzz kanıtı — herhangi bir girdide
        // verifier'ın revert etmediğini gösterir (dönüş değeri true/false önemli
        // değil, sadece revert ETMEMESİ test ediliyor).
        verifier.verify(digest, signature, publicKeyFuzz);
    }
}
