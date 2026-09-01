// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import {SPHINCSVerifier} from "../src/verifier/SPHINCSVerifier.sol";
import {PQWallet} from "../src/PQWallet.sol";

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

    /// @notice C13'te N=16 (signer-wasm/src/params.rs). Hash çıktıları 16 bayt ama
    ///         32 baytlık kelimelerde taşınıyor; hash.rs'teki mask_n() üst 128 biti
    ///         tutup alt 128 biti sıfırlıyor. Yani pkSeed/pkRoot'un ALT 16 baytı her
    ///         zaman sıfırdır — bu bir kopyalama/kesilme hatası DEĞİL, şemanın kendisi.
    ///         Bu test o değişmezi çalıştırılabilir hale getiriyor.
    function test_PublicKeyHalvesAreNMasked() public view {
        assertEq(uint128(uint256(pkSeed)), 0, "pkSeed alt 16 bayti N=16 maskesi geregi sifir olmali");
        assertEq(uint128(uint256(pkRoot)), 0, "pkRoot alt 16 bayti N=16 maskesi geregi sifir olmali");
        assertTrue(bytes16(pkSeed) != bytes16(0), "pkSeed ust 16 bayti anlamli veri tasimali");
        assertTrue(bytes16(pkRoot) != bytes16(0), "pkRoot ust 16 bayti anlamli veri tasimali");
    }

    /// @notice Sondaki sıfırları "fazlalık" sanıp atmak anahtarı bozar: 16+16 = 32
    ///         baytlık bir publicKey, SPHINCSVerifier'ın uzunluk kontrolüne takılır.
    ///         Bkz. docs/evidence/crypto-tests/sprint3-owner-key-rotation.md.
    function test_ZeroStrippedPublicKeyReturnsFalseNotRevert() public view {
        bytes memory stripped = abi.encodePacked(bytes16(pkSeed), bytes16(pkRoot));
        assertEq(stripped.length, 32, "sifirlari atilmis publicKey 32 bayt olur");
        assertFalse(
            verifier.verify(message, sig, stripped),
            "sifirlari atilmis publicKey false donmeli, revert etmemeli"
        );
    }

    /// @notice Anlamlı 16 baytı sağa hizalamak da bozar — uzunluk 64 kalır ama
    ///         referans kontrat non-canonical diye reddeder. Yukarıdaki
    ///         test_NonCanonicalPublicKeyReturnsFalseNotRevert sentetik bir değer
    ///         (1, 2) kullanıyor; bu test aynı şeyi GERÇEK anahtarın baytlarıyla
    ///         yaparak gerçekçi yanlış-düzeltme senaryosunu kapsıyor.
    function test_RightAlignedPublicKeyReturnsFalseNotRevert() public view {
        bytes memory rightAligned = abi.encodePacked(
            bytes32(uint256(uint128(bytes16(pkSeed)))),
            bytes32(uint256(uint128(bytes16(pkRoot))))
        );
        assertEq(rightAligned.length, 64, "saga hizali publicKey yine 64 bayt");
        assertFalse(
            verifier.verify(message, sig, rightAligned),
            "saga hizali publicKey false donmeli, revert etmemeli"
        );
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

/// @notice Uçtan uca round-trip kanıtı: yukarıdaki `SPHINCSVerifierTest` fixture'ı
///         (`c13-kat.json`) native Rust CLI'dan üretildi. Bu kontrat aynı doğrulamayı,
///         gerçekten tarayıcıda çalışan WASM build'inden (`frontend/src/crypto/wasm-pkg-web`,
///         `wasm-pack --target web`) — headless Chromium'da `frontend/src/crypto/signer.js`
///         üzerinden — üretilen bir imzayla tekrarlıyor. Kanıt:
///         `docs/evidence/crypto-tests/sprint2-onchain-roundtrip.md`.
contract SPHINCSVerifierWasmBrowserRoundTripTest is Test {
    SPHINCSVerifier verifier;
    string constant FIXTURE = "test/fixtures/c13-kat-wasm-browser.json";

    function setUp() public {
        verifier = new SPHINCSVerifier();
    }

    function test_BrowserWasmSignatureVerifiesOnChain() public view {
        string memory json = vm.readFile(FIXTURE);
        bytes32 pkSeed = vm.parseJsonBytes32(json, ".public_key.pkSeed");
        bytes32 pkRoot = vm.parseJsonBytes32(json, ".public_key.pkRoot");
        bytes32 message = vm.parseJsonBytes32(json, ".inputs.message");
        bytes memory sig = vm.parseJsonBytes(json, ".signature");
        bytes memory publicKey = abi.encodePacked(pkSeed, pkRoot);

        assertEq(sig.length, 3688, "C13 sig must be 3688 bytes");
        assertTrue(
            verifier.verify(message, sig, publicKey),
            "browser-WASM-produced C13 signature must verify against real SPHINCSVerifier.sol"
        );
    }
}

/// @notice Sprint 2 kapanış maddesi: PQWallet.execute() -> gerçek SPHINCSVerifier.sol
///         zincirini uçtan uca kanıtlar (Hakan'ın PQWallet.sol'ü MockVerifier ile test
///         edilmişti — bkz. contracts/test/PQWallet.t.sol; bu test onun yerine değil,
///         eksik kalan "gerçek verifier" adımını tamamlıyor).
///
///         Digest, PQWallet._computeDigest() formülüyle (dondurulmuş, docs/GOREV_SINIRLARI.md
///         Bölüm 4) sabit bir cüzdan adresi/chainId için OFF-CHAIN (Node/ethers) hesaplandı,
///         gerçek WASM signer'la imzalandı (kanıt: docs/evidence/crypto-tests/
///         sprint2-pqwallet-real-verifier-integration.md). PQWallet'ı bu sabit adrese
///         "deploy etmek" için `PQWalletTest._walletAtJsVectorAddress()` ile aynı
///         `vm.etch` deseni kullanılıyor; ek olarak `ownerPublicKey` (dynamic bytes,
///         storage slot 0) `vm.etch`'in KOPYALAMADIĞI storage'a `vm.store` ile elle
///         yazılıyor — slot düzeni `forge inspect PQWallet storage-layout` ile
///         doğrulandı (ownerPublicKey: slot 0, nonce: slot 1, verifier: immutable,
///         storage'da hiç yer kaplamıyor).
contract SPHINCSVerifierPQWalletIntegrationTest is Test {
    string constant FIXTURE = "test/fixtures/c13-pqwallet-integration.json";

    /// @dev Fixture'daki sabit girdiler (bkz. fixture "inputs").
    address constant WALLET_ADDR = address(0xC13777);
    address payable constant RECIPIENT = payable(address(0xCAFE));
    uint256 constant VALUE = 1 ether;

    /// @dev Fixture'ı okuyup gerçek verifier + gerçek publicKey ile WALLET_ADDR'da
    ///      hazır bir PQWallet döndürür. `signature` bozulmadan execute() çağrılırsa
    ///      geçerli imza yolu, bozulursa reddedilme yolu test edilebilir.
    function _setUpWalletFromFixture() private returns (PQWallet wallet, bytes memory signature, bytes32 expectedDigest) {
        string memory json = vm.readFile(FIXTURE);
        uint256 chainId = vm.parseJsonUint(json, ".inputs.chainId");
        expectedDigest = vm.parseJsonBytes32(json, ".inputs.digest");
        bytes32 pkSeed = vm.parseJsonBytes32(json, ".public_key.pkSeed");
        bytes32 pkRoot = vm.parseJsonBytes32(json, ".public_key.pkRoot");
        signature = vm.parseJsonBytes(json, ".signature");
        bytes memory publicKey = abi.encodePacked(pkSeed, pkRoot);
        assertEq(signature.length, 3688, "C13 sig must be 3688 bytes");

        vm.chainId(chainId);

        SPHINCSVerifier verifier = new SPHINCSVerifier();

        // ownerPublicKey burada anlamsız — hedef gerçek publicKey'i vm.store ile
        // set edeceğiz. verifier ise immutable olduğundan template'in bytecode'una
        // gömülüyor; vm.etch onu WALLET_ADDR'a taşır.
        PQWallet template = new PQWallet(verifier, "");
        vm.etch(WALLET_ADDR, address(template).code);

        // ownerPublicKey (bytes, slot 0, 64 bayt -> "uzun" encoding): slot0 = len*2+1,
        // veri keccak256(slot0) ve +1'de. forge inspect ile doğrulandı.
        vm.store(WALLET_ADDR, bytes32(uint256(0)), bytes32(uint256(publicKey.length * 2 + 1)));
        bytes32 dataSlot = keccak256(abi.encode(uint256(0)));
        vm.store(WALLET_ADDR, dataSlot, pkSeed);
        vm.store(WALLET_ADDR, bytes32(uint256(dataSlot) + 1), pkRoot);

        wallet = PQWallet(payable(WALLET_ADDR));

        // Sanity: storage doğru set edildi mi, digest formülü fixture'daki off-chain
        // hesapla birebir aynı mı (gerçek verifier'lı, gerçek adresli bir cüzdanda).
        assertEq(wallet.ownerPublicKey(), publicKey, "vm.store ile set edilen ownerPublicKey okunamadi");
        assertEq(wallet.nonce(), 0);
        bytes32 digest = wallet._computeDigest(RECIPIENT, VALUE, "");
        assertEq(digest, expectedDigest, "on-chain digest fixture'daki off-chain digest ile eslesmiyor");
    }

    function test_RealWasmSignatureExecutesThroughRealVerifier() public {
        (PQWallet wallet, bytes memory signature,) = _setUpWalletFromFixture();

        vm.deal(WALLET_ADDR, VALUE);
        uint256 recipientBalanceBefore = RECIPIENT.balance;

        wallet.execute(RECIPIENT, VALUE, "", signature);

        assertEq(wallet.nonce(), 1, "execute basarili olduysa nonce artmali");
        assertEq(RECIPIENT.balance, recipientBalanceBefore + VALUE, "transfer gerceklesmedi");
    }

    /// @notice Gerçek verifier'ın gerçekten kontrol ettiğini kanıtlar: imza tek
    ///         byte bozulunca execute() revert etmeli, transfer gerçekleşmemeli.
    function test_RevertsWhenSignatureTampered() public {
        (PQWallet wallet, bytes memory signature,) = _setUpWalletFromFixture();

        signature[100] = signature[100] == 0xff ? bytes1(0x00) : bytes1(0xff);
        vm.deal(WALLET_ADDR, VALUE);

        vm.expectRevert(bytes("PQWallet: invalid signature"));
        wallet.execute(RECIPIENT, VALUE, "", signature);

        assertEq(wallet.nonce(), 0, "reddedilen imzada nonce artmamali");
    }
}
