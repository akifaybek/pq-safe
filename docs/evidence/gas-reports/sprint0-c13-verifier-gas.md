# Sprint 0 — C13 verifier gas ölçümü (şema değişikliği sonrası)

**Tarih:** 19 Ağustos 2026
**Yazan:** Akif
**Bağlam:** `docs/DECISIONS.md`'deki "İmzalayıcı şeması C13'e değiştirildi" kararı
sonrası, yeni hedef şemanın gas maliyetini kendi ortamımızda ölçmek.

## Kaynak

- Repo: `contracts/lib/sphincs-minus` (aynı submodule, aynı sabitlenmiş commit
  `eef1f889a46c77d45dca013d321e9648fd3eaa7e` — C13 zaten bu commit'in içinde)
- Kontrat: `src/SPHINCs-C13Asm.sol` → `SphincsC13Asm`
- Parametreler: h=22, d=2, a=19, k=7, w=8 (WOTS+C / FORS+C, counter-grinding'li)
- İmza boyutu: 3,688 bayt (test içinde `assertEq(sig.length, 3688, ...)` ile
  doğrulanıyor)
- İddia edilen rakam (repo README): **~105K gas**

## Yöntem

C13 için SLH-DSA-SHA2-128-24'teki gibi hazır bir JSON-KAT fixture'ı yok — test
dosyası (`test/SphincsC13Test.t.sol`) imzayı FFI ile canlı üretiyor. İki yol
sunuyor:
- Python imzalayıcı (`script/signer.py c13`) — yorsatırına göre birkaç dakika
  sürüyor (2^19 R-grind + 6 FORS ağacı + WOTS+C count-grinding)
- Rust CLI (`signer-wasm/target/release/signer-c13`) — çok daha hızlı, build
  gerekiyor

**Rust CLI yolu kullanıldı** (daha hızlı, deterministik değil ama tek seferlik
gas ölçümü için fark etmez — imza her seferinde yeniden üretiliyor ve
`verify()` her ürettiği imzayı kendi doğruluyor).

## Ortam

```
cargo 1.93.1, cargo build --release --bin signer-c13 (signer-wasm/ altında)
forge 1.7.1-Homebrew, solc (sphincs-minus'un kendi foundry.toml'u: via_ir=true,
  optimizer=true, optimizer_runs=200)
```

## Komutlar

```bash
cd contracts/lib/sphincs-minus/signer-wasm
cargo build --release --bin signer-c13

cd contracts/lib/sphincs-minus
forge test --match-test "testC13VerifyFFI_Rust" --gas-report -vv
```

## Çıktı

```
Ran 1 test for test/SphincsC13Test.t.sol:SphincsC13Test
[PASS] testC13VerifyFFI_Rust() (gas: 237125)
Logs:
  C13 verify gas (rust sig): 110194

Suite result: ok. 1 passed; 0 failed; 0 skipped; finished in 6.74s (6.74s CPU time)

╭-----------------------------------------------+-----------------+--------+--------+--------+---------╮
| src/SPHINCs-C13Asm.sol:SphincsC13Asm Contract |                 |        |        |        |         |
+======================================================================================================+
| Deployment Cost                               | Deployment Size |        |        |        |         |
|-----------------------------------------------+-----------------+--------+--------+--------+---------|
|                                        310750 |            1217 |        |        |        |         |
|-----------------------------------------------+-----------------+--------+--------+--------+---------|
|                                               |                 |        |        |        |         |
|-----------------------------------------------+-----------------+--------+--------+--------+---------|
| Function Name                                 | Min             | Avg    | Median | Max    | # Calls |
|-----------------------------------------------+-----------------+--------+--------+--------+---------|
| verify                                        |          106672 | 106672 | 106672 | 106672 |       2 |
╰-----------------------------------------------+-----------------+--------+--------+--------+---------╯
```

Not: Test içindeki inline `gasleft()` ölçümü (110,194) ile `--gas-report`
tablosundaki rakam (106,672) arasındaki fark, ilkinin dış çağrı zarfını da
saymasından kaynaklanıyor. Karşılaştırma için (ve SLH-DSA-SHA2-128-24 ölçümüyle
tutarlı metodoloji için) **`--gas-report` tablosundaki rakam esas alınmalı**.

## Sonuç

| | Değer |
|---|---|
| **Kaynağın iddiası (C13)** | ~105K gas |
| **Bizim ölçümümüz** | 106,672 gas |
| **Sapma** | ~%1.6 |
| Karşılaştırma: eski hedef (SLH-DSA-SHA2-128-24) | 143,057 gas (bkz. `sprint0-reference-verifier-gas.md`) |
| **Kazanç** | ~%25 daha ucuz |

**~105K rakamı bizim ortamımızda doğrulandı.** C13, eski hedeften hem daha ucuz
(gas) hem daha küçük imzalı (3,688B vs 3,856B).

## Uyarı (aynı repo, aynı README'den, olduğu gibi aktarılıyor)

Bu değişikliği yaparken önceki kanıt dosyasındaki uyarı geçerliliğini koruyor:
referans implementasyon **denetlenmemiş bir araştırma prototipidir**. Ayrıca
C13, FIPS 205'in kendisi değil, ePrint 2025/2203'teki WOTS+C/FORS+C
counter-grinding ailesinden bir **araştırma parametre seti** — SLH-DSA-SHA2-128-24
"vanilla SPHINCS+" NIST SP 800-230 taslağına daha yakınken, C13 daha deneysel
bir tasarım. Bu fark rapor/sunumda dürüstçe belirtilmeli (bkz. `CLAUDE.md`
kural 6 ve `docs/DECISIONS.md`'deki şema değişikliği kararı).
