# Sprint 1 — SPHINCSVerifier.sol (IPQVerifier sarmalayıcısı) test + gas sonucu

**Tarih:** 19 Ağustos 2026
**Yazan:** Akif
**Dosyalar:** `contracts/src/verifier/SPHINCSVerifier.sol`,
`contracts/test/SPHINCSVerifier.t.sol`, fixture: `contracts/test/fixtures/c13-kat.json`

## Ne test edildi

1. Gerçek bir C13 imzası (Rust CLI ile üretilip fixture'a gömülü) doğru şekilde
   `true` dönüyor mu?
2. Mesaj/imza kurcalanınca `false` dönüyor mu (revert değil)?
3. **Kritik arayüz garantisi:** referans `SphincsC13Asm.verify()` bazı girdilerde
   (yanlış imza uzunluğu, non-canonical public key) `revert` ediyor — bizim
   `SPHINCSVerifier` bunu yakalayıp `IPQVerifier` sözleşmesinin "ASLA revert
   etmez" garantisine uygun şekilde `false`'a çeviriyor mu?
4. Fuzz testi (256 run, rastgele `digest`/`signature`/`publicKey`): hiçbir
   girdide revert etmiyor mu?

## Fixture nasıl üretildi (FFI kullanılmadan, tekrarlanabilir)

```bash
cd contracts/lib/sphincs-minus/signer-wasm
cargo build --release --bin signer-c13
cd ..
./signer-wasm/target/release/signer-c13 c13 \
  0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef \
  > /tmp/c13_stdout.bin   # stdout: 0x-prefixed ABI-encoded (bytes32,bytes32,bytes)
cast abi-decode "f()(bytes32,bytes32,bytes)" "$(cat /tmp/c13_stdout.bin)"
```//
Çıktı elle `contracts/test/fixtures/c13-kat.json`'a yazıldı (pkSeed, pkRoot,
signature, message, publicKey_concat). Test bu dosyayı `vm.readFile` ile okuyor
— FFI gerekmiyor, deterministik.

## Sonuç

```
Ran 8 tests for test/SPHINCSVerifier.t.sol:SPHINCSVerifierTest
[PASS] testFuzz_NeverReverts(bytes32,bytes,bytes) (runs: 256, μ: 6677, ~: 6661)
[PASS] test_EmptySignatureReturnsFalseNotRevert() (gas: 18517)
[PASS] test_NonCanonicalPublicKeyReturnsFalseNotRevert() (gas: 269479)
[PASS] test_RejectsTamperedSignature() (gas: 324787)
[PASS] test_RejectsWrongMessage() (gas: 276134)
[PASS] test_ValidSignatureVerifies() (gas: 383119)
[PASS] test_WrongPublicKeyLengthReturnsFalseNotRevert() (gas: 265700)
[PASS] test_WrongSigLengthReturnsFalseNotRevert() (gas: 18647)
Suite result: ok. 8 passed; 0 failed; 0 skipped; finished in 21.53ms (19.05ms CPU time)

╭-----------------------------------------------------------+-----------------+------+--------+--------+---------╮
| src/verifier/SPHINCSVerifier.sol:SPHINCSVerifier Contract |                 |      |        |        |         |
+================================================================================================================+
| Deployment Cost                                           | Deployment Size |      |        |        |         |
|-----------------------------------------------------------+-----------------+------+--------+--------+---------|
|                                                    460466 |            1865 |      |        |        |         |
|-----------------------------------------------------------+-----------------+------+--------+--------+---------|
| Function Name                                             | Min             | Avg  | Median | Max    | # Calls |
|-----------------------------------------------------------+-----------------+------+--------+--------+---------|
| verify                                                    |             589 | 1245 |    589 | 111074 |     264 |
╰-----------------------------------------------------------+-----------------+------+--------+--------+---------╯
```

## Gas karşılaştırması

| | Gas |
|---|---|
| Çıplak referans (`SphincsC13Asm.verify()` direkt) | 106,672 |
| **Bizim sarmalayıcımız (`SPHINCSVerifier.verify()`, geçerli imza)** | **111,074** |
| Fark (try/catch + calldata decode overhead) | ~4,400 (~%4) |

Sarmalama maliyeti kabul edilebilir — `IPQVerifier`'ın "asla revert etmez"
garantisini sağlamanın bedeli. `docs/DECISIONS.md`'deki C13 kararına
güncellenecek referans rakam: **~111K gas (sarmalayıcı dahil)**, çıplak
referans hâlâ ~105-107K.

## Yan bulgu: solc/via_ir güncellemesi gerekti

Referans dosya (`SPHINCs-C13Asm.sol`) `pragma ^0.8.28` ve ağır inline assembly
içeriyor — bizim projenin sabitlenmiş `solc = "0.8.20"` ayarı hem sürüm hem
"stack too deep" hatası verdi. `contracts/foundry.toml`:
- `solc`: `0.8.20` → `0.8.35` (bizim `^0.8.20` pragma'mızla hâlâ tam uyumlu,
  davranış değişmiyor — sadece derleyici sürümü)
- `via_ir = true` eklendi

Ayrıntı ve gerekçe: `docs/DECISIONS.md`, "solc/via_ir güncellemesi" kaydı.
