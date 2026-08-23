# Sprint 1 — WASM signer (C13) keygen/sign testi

**Tarih:** 19 Ağustos 2026
**Yazan:** Akif
**Script:** `frontend/src/crypto/wasm-signer-test.mjs`
**Build:** `frontend/scripts/build-wasm.sh` (`wasm-pack build ... --target nodejs`)

## Amaç

`contracts/lib/sphincs-minus/signer-wasm` (Rust/WASM, C13, BIP-39/44 anahtar
türetmeli) imzalayıcısının Node.js'ten çağrılabildiğini, `keygen_from_mnemonic`
ve `sign_from_mnemonic`'in çalıştığını ve üretilen imzanın C13 için beklenen
3688 bayt uzunlukta olduğunu kanıtlamak. Bkz.
`docs/superpowers/specs/2026-08-19-wasm-signer-integration-design.md`.

## Ortam

```
wasm-pack 0.15.0
rustc 1.93.1 (01f6ddf75 2026-02-11)
v22.21.0
```

## Komutlar

```bash
./frontend/scripts/build-wasm.sh
node frontend/src/crypto/wasm-signer-test.mjs
```

## Çıktı

```
=== WASM signer testi (C13, signer-wasm) ===
Not: aşağıdaki mnemonic bilinen bir BIP-39 test vektörüdür, gizli/gerçek bir anahtar DEĞİLDİR.
Mnemonic: abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about

--- 1. keygen_from_mnemonic ---
pkSeed (seed): 0x1f621381602c8de48cc118ed6a32b8dc00000000000000000000000000000000
pkRoot (root): 0xbf71273542ab5286e60a3b8c50c5cf6200000000000000000000000000000000
ecdsa_address: 0x9858effd232b4033e47d90003d41ec34ecaeda94
keygen süresi: 361 ms
publicKey (pkSeed‖pkRoot, 64 bayt, SPHINCSVerifier.sol formatı): 0x1f621381602c8de48cc118ed6a32b8dc00000000000000000000000000000000bf71273542ab5286e60a3b8c50c5cf6200000000000000000000000000000000

--- 2. sign_from_mnemonic ---
Mesaj: 0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef
sign süresi: 7562 ms
İmza uzunluğu: 3688 bayt

=== SONUÇ: keygen + sign başarılı, imza uzunluğu doğrulandı ===
```

## Notlar

- Kullanılan mnemonic (`abandon abandon ... about`) herkesçe bilinen bir
  BIP-39 test vektörüdür, gizli/gerçek bir anahtar değildir.
- `pkSeed ‖ pkRoot` birleşimi `SPHINCSVerifier.sol`'ün `IPQVerifier.verify()`
  fonksiyonunun beklediği 64 baytlık `publicKey` formatıyla birebir uyumlu —
  ek bir dönüştürme gerekmiyor.
- `pkSeed`/`pkRoot` hex çıktılarındaki uzun sıfır dizileri bir hata değil —
  `keygen.rs`'teki `hash::mask_n()` fonksiyonunun C13 parametresi n=16
  bayt için üst baytları maskelemesinden kaynaklanıyor (32 baytlık `U256`
  konteynerinin sadece alt kısmı kullanılıyor).
- SPHINCS+ imzalama rastgeleleştirilmiş olabilir: aynı mnemonic + aynı
  mesajla tekrar çalıştırıldığında farklı imza baytları çıkması **beklenen
  davranıştır**, hata değildir — imza *uzunluğu* (3688 bayt) sabit kalır,
  içeriği değil. Bu çalıştırmada `getrandom`'ın Node.js ortamında (wasm-pack
  `--target nodejs` çıktısıyla) sorunsuz çalıştığı gözlemlendi — beklenen bir
  risk olarak tasarım dokümanında not düşülmüştü, gerçekleşmedi.
- keygen ~360 ms, sign ~7.5 saniye (Node.js, Apple Silicon geliştirme
  makinesi) — performans testi verisi budur.
- ~~Kapsam dışı: bu testte üretilen imzanın gerçek `SPHINCSVerifier.sol`'e
  (on-chain) gönderilip doğrulanması yok — ayrı bir görev.~~ **Kapandı
  (23 Ağustos, Sprint 2):** bkz. `docs/evidence/crypto-tests/sprint2-onchain-roundtrip.md`
  — gerçek tarayıcı WASM build'inden üretilen bir imza, gerçek
  `SPHINCSVerifier.sol`'e gönderildi ve doğrulandı.

## Sonuç

**PASS.** `keygen_from_mnemonic` ve `sign_from_mnemonic` başarıyla çalıştı,
`publicKey` 64 bayt ve imza 3688 bayt olduğu doğrulandı (script içindeki
`assert` ile). WASM signer Node.js'ten sorunsuz çağrılabiliyor.
