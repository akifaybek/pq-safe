# Sprint 2 — On-chain round-trip: gerçek tarayıcı WASM imzası → gerçek SPHINCSVerifier.sol

**Tarih:** 23 Ağustos 2026
**Yazan:** Akif
**Dosyalar:** `contracts/test/SPHINCSVerifier.t.sol` (`SPHINCSVerifierWasmBrowserRoundTripTest`),
`contracts/test/fixtures/c13-kat-wasm-browser.json`

## Bu neyi kapatıyor

`docs/evidence/crypto-tests/sprint1-wasm-signer-test.md`'nin "Kapsam dışı"
notu: *"bu testte üretilen imzanın gerçek `SPHINCSVerifier.sol`'e (on-chain)
gönderilip doğrulanması yok"*. O test Node.js/CLI hedefiyle çalıştırılmıştı.
Ayrıca `contracts/test/fixtures/c13-kat.json`'daki mevcut KAT da **native
Rust CLI** (`signer-c13` binary) ile üretilmişti — tarayıcıya giden gerçek
`.wasm` dosyası (`wasm-pack --target web`) değil.

Bu belge, gerçekten **tarayıcıda çalışan WASM build'inin** (`frontend/src/crypto/wasm-pkg-web/`,
`frontend/src/crypto/signer.js` üzerinden) ürettiği bir imzayı, gerçek
`SPHINCSVerifier.sol` kontratına (Foundry/EVM üzerinde, native Rust'a değil)
gönderip `true` döndüğünü kanıtlıyor. Sepolia'ya deploy Sprint 3'te; burada
"on-chain" = gerçek EVM bytecode'unun (Foundry'nin çalıştırdığı) gerçek
kontratı — deploy'dan bağımsız, kontratın kendisi test ediliyor.

## Yöntem

1. `frontend`'de Vite dev server başlatıldı (`npx vite`), `signer.js`
   (gerçek `wasm-pkg-web` WASM modülünü yükleyen dosya) tarayıcıda import
   edildi.
2. Headless Chromium'da (Playwright, `playwright-core` + önbellekteki
   Chromium — sistemde Google Chrome yoktu) sayfa açıldı, `signer.js`'in
   `keygen()` ve `signDigest()` fonksiyonları doğrudan çağrıldı:
   - Mnemonic: `abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about`
     (herkesçe bilinen BIP-39 test vektörü, gerçek/gizli anahtar değil —
     `sprint1-wasm-signer-test.md` ile aynı, kasıtlı olarak karşılaştırma için)
   - Mesaj: `0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef`
3. Çıktı (`pkSeed`, `pkRoot`, `signature`) `contracts/test/fixtures/c13-kat-wasm-browser.json`'a yazıldı.
4. Yeni bir Foundry test kontratı (`SPHINCSVerifierWasmBrowserRoundTripTest`)
   bu fixture'ı okuyup gerçek `SPHINCSVerifier.sol`'ü (`new SPHINCSVerifier()`)
   çağırıyor.

## Sonuç 1 — keygen determinizmi (build hedefinden bağımsız)

Aynı mnemonic ile üretilen `pkSeed`/`pkRoot`/`ecdsaAddress`, Node.js/CLI
hedefiyle üretilenle (`sprint1-wasm-signer-test.md`) **birebir aynı**:

| | Node.js/CLI (Sprint 1) | Tarayıcı WASM (bu test) |
|---|---|---|
| pkSeed | `0x1f621381602c8de48cc118ed6a32b8dc00000000000000000000000000000000` | aynı |
| pkRoot | `0xbf71273542ab5286e60a3b8c50c5cf6200000000000000000000000000000000` | aynı |
| ecdsaAddress | `0x9858effd232b4033e47d90003d41ec34ecaeda94` | aynı |

Bu, `wasm32` (tarayıcı) ve native (CLI) derleme hedeflerinin aynı Rust
kaynağından (`signer-wasm/src/`) bit-birebir aynı keygen sonucunu
ürettiğini gösteriyor — beklenen ama doğrulanmamış bir varsayımdı, artık
kanıtlı.

İmza baytları farklı (SPHINCS+ imzalama rastgeleleştirilmiş — beklenen
davranış, `sprint1-wasm-signer-test.md`'de zaten not düşülmüştü), sadece
uzunluk (3688 bayt) sabit.

## Sonuç 2 — gerçek verifier doğrulaması

```
forge test --match-contract SPHINCSVerifierWasmBrowserRoundTripTest -vv

[PASS] test_BrowserWasmSignatureVerifiesOnChain() (gas: 235165)
```

Tam suite (regresyon kontrolü):

```
forge test

Ran 3 test suites: 11 tests passed, 0 failed, 0 skipped
```

**Not (gas):** Bu koşudaki gas (235,165), mevcut CLI-fixture testinin gas'ından
(`test_ValidSignatureVerifies`, 383,119) farklı. İkisi de aynı `publicKey`
ile (aynı mnemonic) ama farklı imza baytlarıyla çalışıyor — fark muhtemelen
calldata maliyetindeki (sıfır/sıfır-olmayan bayt) farktan kaynaklanıyor,
kesin sebep araştırılmadı; bu belgenin kapsamı değil. Resmi gas ölçümü
zaten `docs/evidence/gas-reports/sprint1-sphincsverifier-wrapper-gas.md`'de
(Hakan'ın sahipliğinde, `--gas-report` ile) var, bu not sadece gözlem.

## fs_permissions notu

`contracts/foundry.toml`'a yeni fixture için bir `fs_permissions` girdisi
eklendi (`c13-kat-wasm-browser.json`, sadece okuma). `solc`/`optimizer`
gibi dondurulmuş satırlara dokunulmadı — mevcut satırla aynı desende,
sadece Akif'in kendi fixture'ı için.

## Kapsam dışı / henüz yapılmadı

- Sepolia'ya gerçek deploy + gerçek tx ile doğrulama — Sprint 3.
- Bu round-trip `PQWallet.sol` üzerinden değil, doğrudan `SPHINCSVerifier.sol`
  üzerinden — `PQWallet.execute()` + nonce + digest formatı entegrasyonu
  hâlâ Sprint 2'nin "digest uyum testi" maddesine bağlı (Hakan'ın
  `_computeDigest()`'i bekleniyor).

## Sonuç

**PASS.** Gerçekten tarayıcıda çalışan WASM signer'ın ürettiği bir C13
imzası, gerçek `SPHINCSVerifier.sol` kontratına gönderildi ve `true`
döndü. Sprint 1'den kalan "on-chain round-trip yapılmadı" boşluğu kapandı.
