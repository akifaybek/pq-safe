# Sprint 2 — PQWallet.execute() → gerçek SPHINCSVerifier.sol entegrasyon testi

**Tarih:** 26 Ağustos 2026
**Yazan:** Akif
**Dosyalar:** `contracts/test/SPHINCSVerifier.t.sol` (`SPHINCSVerifierPQWalletIntegrationTest`),
`contracts/test/fixtures/c13-pqwallet-integration.json`

## Bu neyi kapatıyor

`docs/GOREV_SINIRLARI.md` Sprint 2, Hakan satırı: **"`MockVerifier`'ı gerçek
verifier ile değiştir"**. Hakan'ın `PQWallet.sol`'ü ve `PQWallet.t.sol`'deki
tüm `execute()` testleri şimdiye kadar `MockVerifier` (girdiden bağımsız hep
`true` döner) üzerinden çalıştı — imza içeriği hiç kontrol edilmedi
(`hex"00"` gibi anlamsız bir "imza" geçiliyordu).

Bu görev Hakan'dan Akif'e geçti çünkü digest, cüzdanın **kendi adresine**
(`address(this)`) ve `chainId`'e bağlı; imzalamak için önce digest'in ne
olacağını bilmek, sonra onu Akif'in WASM signer'ıyla (private key benzeri
mnemonic ile) imzalamak gerekiyor — bu adım Hakan'ın elinde değildi.

## Yöntem

1. **Off-chain digest hesabı** (`ethers`, Node): `PQWallet._computeDigest()`
   formülü (`docs/GOREV_SINIRLARI.md` Bölüm 4) sabit girdilerle hesaplandı:
   - `chainId = 11155111` (Sepolia)
   - `walletAddress = 0x0000000000000000000000000000000000C13777` (keyfi, sabit test adresi)
   - `nonce = 0`, `to = 0x000000000000000000000000000000000000cAFE`, `value = 1 ether`, `data = 0x`
   - `digest = 0x33e54fb751cd4309929b06864faaf6632dc22ca81b891f58b3faad414f99f005`
2. **İmzalama**: bu digest, `frontend/src/crypto/wasm-pkg/sphincs_c13_signer.js`
   (native/Node WASM build) ile, sprint1/sprint2'deki aynı bilinen BIP-39 test
   mnemonic'iyle (`abandon abandon ... about`) imzalandı. Üretilen `pkSeed`/`pkRoot`,
   `sprint1-wasm-signer-test.md` ve `sprint2-onchain-roundtrip.md`'deki değerlerle
   **birebir aynı** (keygen'in deterministik olduğunun bir kez daha kanıtı).
3. Çıktı `contracts/test/fixtures/c13-pqwallet-integration.json`'a yazıldı
   (fixture içindeki `reproduce` alanında adımlar tekrarlanabilir şekilde var).
4. **Foundry testi** (`SPHINCSVerifierPQWalletIntegrationTest`):
   - Gerçek `SPHINCSVerifier` deploy edildi.
   - `ownerPublicKey=""` ile bir `PQWallet` template'i deploy edildi (sadece
     `verifier`'ın — `immutable` olduğu için — doğru bytecode'a gömülmesi için).
   - `vm.etch` ile bu bytecode sabit `WALLET_ADDR`'a taşındı (aynı desen
     `PQWalletTest._walletAtJsVectorAddress()`'te de kullanılıyor).
   - `vm.etch` **storage'ı kopyalamadığından**, `ownerPublicKey` (dynamic
     `bytes`, 64 bayt) `vm.store` ile elle set edildi. Slot düzeni
     `forge inspect PQWallet storage-layout` ile doğrulandı:
     `ownerPublicKey` → slot 0 (64 bayt > 31 bayt olduğundan "uzun" encoding:
     slot0 = `length*2+1`, veri `keccak256(slot0)` ve `+1`'de), `nonce` → slot 1,
     `verifier` → immutable, storage'da hiç yer kaplamıyor.
   - Sanity: `wallet.ownerPublicKey()` fixture'daki publicKey ile, ve
     `wallet._computeDigest(to, value, data)` fixture'daki off-chain digest ile
     eşleşiyor mu kontrol edildi (her ikisi de PASS).
   - `wallet.execute(to, value, "", signature)` çağrıldı.

## Sonuç 1 — geçerli imza gerçekten yürütülüyor

```
forge test --match-contract SPHINCSVerifierPQWalletIntegrationTest -vv

[PASS] test_RealWasmSignatureExecutesThroughRealVerifier() (gas: 1130002)
```

`nonce` 0'dan 1'e çıktı, alıcı bakiyesi 1 ether arttı — gerçek bir C13
imzası, gerçek `PQWallet.execute()` → gerçek `SPHINCSVerifier.sol.verify()`
zincirinden geçip state değişikliğine yol açtı.

## Sonuç 2 — verifier gerçekten kontrol ediyor (negatif kanıt)

`MockVerifier` her zaman `true` döndüğü için önceki testler "verifier
gerçekten bir şey kontrol ediyor mu" sorusuna cevap vermiyordu. Bunu kapatmak
için imza tek bayt bozulup aynı akış tekrar denendi:

```
[PASS] test_RevertsWhenSignatureTampered() (gas: 1010212)
```

`execute()` `"PQWallet: invalid signature"` ile revert etti, `nonce`
değişmedi — yani `true` sonucu MockVerifier'daki gibi sabit değil, gerçekten
imza içeriğine bağlı.

## Tam suite (regresyon kontrolü)

```
forge test

Ran 6 test suites: 28 tests passed, 0 failed, 0 skipped
```

(Önceki durum 26 test, MockVerifier tabanlı `PQWallet.t.sol` testlerine hiç
dokunulmadı — onlar hâlâ kendi başına geçerli, digest uyum testini kanıtlıyor.)

## fs_permissions notu

`contracts/foundry.toml`'a yeni fixture için bir `fs_permissions` girdisi
eklendi (`c13-pqwallet-integration.json`, sadece okuma) — mevcut iki
girdiyle aynı desende, `solc`/`optimizer` gibi dondurulmuş satırlara
dokunulmadı.

## Kapsam dışı / henüz yapılmadı

- Bu test `PQWallet.t.sol`'ün (Hakan'ın dosyası) yerine geçmiyor — orada hâlâ
  `MockVerifier` ile digest uyum/nonce/fuzz testleri var, hepsi geçerli ve
  gerekli. Bu belge sadece "gerçek verifier" boşluğunu kapatıyor.
- Gerçek imza, sabit/keyfi bir `WALLET_ADDR` (`vm.etch`) üzerinde test edildi
  — Sepolia'da gerçekten deploy edilmiş bir `PQWallet`'a karşı değil. Gerçek
  deploy + gerçek tx Sprint 3'te.
- `Migration.sol` üzerinden gerçek bir PQ imzalı migration + transfer akışı
  test edilmedi (bu belgenin kapsamı değil).

## Sonuç

**PASS.** `MockVerifier`'ın yerini tutacak gerçek entegrasyon kanıtı tamam:
gerçek WASM signer'dan çıkan bir C13 imzası, `PQWallet.execute()` içinden
gerçek `SPHINCSVerifier.sol`'e ulaşıyor, geçerliyse yürütülüyor, geçersizse
revert ediyor. Sprint 2'nin son açık maddesi kapandı.
