// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {StdStorage, stdStorage} from "forge-std/StdStorage.sol";
import {PQWallet} from "../src/PQWallet.sol";
import {IPQVerifier} from "../src/interfaces/IPQVerifier.sol";
import {MockVerifier} from "./MockVerifier.sol";

/// @dev MockVerifier'ın tersi — her zaman false döner, geçersiz imza yolunu test etmek için.
contract FalseVerifier is IPQVerifier {
    function verify(bytes32, bytes calldata, bytes calldata) external pure returns (bool valid) {
        return false;
    }
}

contract PQWalletTest is Test {
    using stdStorage for StdStorage;

    /// @dev docs/evidence/crypto-tests/sprint2-js-digest-function.md'deki test
    /// vektörlerinde kullanılan sabit adres/chainId'ler — birebir aynısı.
    uint256 private constant JS_VECTOR_CHAIN_ID = 11155111;
    address private constant JS_VECTOR_WALLET_ADDR = address(0x1234567890123456789012345678901234567890);
    address private constant JS_VECTOR_TO = address(0xABcdEFABcdEFabcdEfAbCdefabcdeFABcDEFabCD);

    PQWallet internal wallet;
    MockVerifier internal verifier;
    bytes internal ownerPublicKey = hex"aabbccdd";

    function setUp() public {
        verifier = new MockVerifier();
        wallet = new PQWallet(verifier, ownerPublicKey);
    }

    /// @dev PQWallet'ı, çalışma zamanı kodunu (`code`) hedef adrese kopyalayarak
    /// (`vm.etch`) JS vektörlerindeki sabit `walletAddress`te "deploy eder".
    /// _computeDigest sadece address(this)/block.chainid/nonce'a bağlı olduğundan
    /// (ownerPublicKey/verifier storage'ı kopyalanmasa da) bu test için yeterli.
    function _walletAtJsVectorAddress() private returns (PQWallet) {
        PQWallet template = new PQWallet(verifier, ownerPublicKey);
        vm.etch(JS_VECTOR_WALLET_ADDR, address(template).code);
        return PQWallet(payable(JS_VECTOR_WALLET_ADDR));
    }

    // ---- Digest çapraz doğrulama (Sprint 2 "digest uyum testi") ----
    // Kaynak: docs/evidence/crypto-tests/sprint2-js-digest-function.md

    function test_DigestMatchesJsVector_Test1_EmptyDataNonceZero() public {
        vm.chainId(JS_VECTOR_CHAIN_ID);
        PQWallet target = _walletAtJsVectorAddress();

        bytes32 digest = target._computeDigest({to: JS_VECTOR_TO, value: 1_000_000_000_000_000_000, data: ""});

        assertEq(digest, bytes32(0x417663f38b52fec7f71d3fb178fed03ac2559af424c9a01b72f65f23553a4746));
    }

    function test_DigestMatchesJsVector_Test2_WithDataNonceFive() public {
        vm.chainId(JS_VECTOR_CHAIN_ID);
        PQWallet target = _walletAtJsVectorAddress();
        stdstore.target(address(target)).sig("nonce()").checked_write(uint256(5));

        bytes32 digest = target._computeDigest({to: JS_VECTOR_TO, value: 42, data: hex"deadbeef"});

        assertEq(digest, bytes32(0xc9463c6053d8c0e0573012df0e7f5ab40fd74ffdbc840a65b3be0bd7b332ec29));
    }

    // ---- execute() ----

    function test_Execute_SucceedsWithValidSignature() public {
        address recipient = address(0xCAFE);
        uint256 sendValue = 1 ether;
        vm.deal(address(wallet), sendValue);

        // MockVerifier girdiden bağımsız her zaman true döner, imza içeriği önemsiz.
        wallet.execute(recipient, sendValue, "", hex"00");

        assertEq(wallet.nonce(), 1);
        assertEq(recipient.balance, sendValue);
    }

    function test_Execute_RevertsWhenVerifierRejects() public {
        FalseVerifier falseVerifier = new FalseVerifier();
        PQWallet rejectingWallet = new PQWallet(falseVerifier, ownerPublicKey);
        vm.deal(address(rejectingWallet), 1 ether);

        vm.expectRevert(bytes("PQWallet: invalid signature"));
        rejectingWallet.execute(address(0xCAFE), 1 ether, "", hex"00");

        assertEq(rejectingWallet.nonce(), 0);
    }

    // ---- Nonce replay koruması (yapısal kanıt) ----

    function test_DigestChangesAfterExecute_OldSignatureNoLongerMatches() public {
        address recipient = address(0xCAFE);
        uint256 sendValue = 1 wei;
        vm.deal(address(wallet), 10);

        bytes32 digestAtNonceZero = wallet._computeDigest(recipient, sendValue, "");

        wallet.execute(recipient, sendValue, "", hex"00");
        assertEq(wallet.nonce(), 1);

        bytes32 digestAtNonceOne = wallet._computeDigest(recipient, sendValue, "");

        // Aynı to/value/data için nonce=0 ve nonce=1 digest'leri farklı olmalı —
        // yani nonce=0 için üretilmiş eski bir imza, nonce=1'de artık geçersizdir.
        assertTrue(digestAtNonceZero != digestAtNonceOne);
    }

    // ---- Fuzz ----

    function testFuzz_Execute_IncrementsNonce(address recipient, uint96 sendValue, bytes calldata data) public {
        vm.assume(recipient.code.length == 0);
        vm.assume(recipient != address(wallet));
        vm.deal(address(wallet), sendValue);

        uint256 nonceBefore = wallet.nonce();

        wallet.execute(recipient, sendValue, data, hex"00");

        assertEq(wallet.nonce(), nonceBefore + 1);
    }
}
