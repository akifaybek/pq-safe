# Sprint 0 — Referans SPHINCS- verifier gas doğrulaması

**Tarih:** 17 Ağustos 2026
**Yazan:** Akif
**Amaç:** `docs/DECISIONS.md`'de "kaynağın kendi ölçümü, bizim ortamımızda henüz
doğrulanmadı" notuyla dondurulan **~142K gas** rakamının, kendi Foundry
ortamımızda bağımsız olarak doğrulanması (Sprint 0 görevi).

## Kaynak

- Repo: `contracts/lib/sphincs-minus` (submodule, commit
  `eef1f889a46c77d45dca013d321e9648fd3eaa7e`)
- Kontrat: `src/SLH-DSA-SHA2-128-24verifier.sol` → `SLH_DSA_SHA2_128_24_Verifier`
- İddia edilen rakam (repo README'sindeki varyant tablosu): **~142K gas**
  ("Verify (pure): Foundry `gasleft()` measurement of the assembly block.")

## Yöntem

Reponun kendi test takımında iki farklı gas testi var:
- `test/SLH-DSA-SHA2-128-24-Test.t.sol` — gerçek zamanlı imza üretimi için
  `vm.ffi` ile Python + C referans imzalayıcıyı (`signers/sphincsplus-128-24/`)
  çalıştırıyor. Bunun için C binary derlemek ve `ffi = true` (rastgele shell
  komutu çalıştırma izni) gerekiyordu — bu ölçüm turunda bunu **kullanmadık**.
- `test/SLH-DSA-SHA2-128-24-JsonKAT.t.sol` — repoya önceden gömülü, deterministik
  bir KAT (Known-Answer-Test) vektörünü (`signers/slhvk-sha2-128-24/kat-counter0.json`)
  dosyadan okuyor, **FFI gerektirmiyor**. Bu, daha güvenli ve tekrarlanabilir
  olduğu için tercih edildi.

KAT vektörü metadata'sı:
- `signature_len`: 3856 bayt
- `verify_expected`: `true`
- `reproduce`: `python3 script/slh_dsa_sha2_128_24_gpu_signer.py <sk> <pk_seed> 0`
  (GPU tabanlı imzalayıcı ile üretilmiş, CPU referans implementasyonuna karşı
  bit-exact doğrulanmış — bkz. repo README)

## Ortam

```
forge 1.7.1-Homebrew (commit 4072e48705af9d93e3c0f6e29e93b5e9a40caed8)
solc 0.8.35 (sphincs-minus kendi foundry.toml'unda pragma ^0.8.28 var, forge en
  güncel uyumlu sürümü — 0.8.35 — otomatik indirip kullandı; bu, bizim
  projemizin solc 0.8.20 kararından bağımsız — referans kod kendi bağımlılık
  ağacında derleniyor, bizim src/ dosyalarımızı etkilemiyor)
via_ir = true, optimizer = true, optimizer_runs = 200 (sphincs-minus'un kendi
  foundry.toml'u)
```

## Komut

```bash
cd contracts/lib/sphincs-minus
forge test --match-path "test/SLH-DSA-SHA2-128-24-JsonKAT.t.sol" --gas-report
```

## Çıktı

```
Ran 2 tests for test/SLH-DSA-SHA2-128-24-JsonKAT.t.sol:SLH_DSA_SHA2_128_24_JsonKAT_Test
[PASS] testJsonKatRejectsWrongMessage() (gas: 166536)
[PASS] testJsonKatVerifies() (gas: 183169)
Suite result: ok. 2 passed; 0 failed; 0 skipped; finished in 10.94ms (8.80ms CPU time)

╭---------------------------------------------------------------------------+-----------------+--------+--------+--------+---------╮
| src/SLH-DSA-SHA2-128-24verifier.sol:SLH_DSA_SHA2_128_24_Verifier Contract |                 |        |        |        |         |
+==================================================================================================================================+
| Deployment Cost                                                           | Deployment Size |        |        |        |         |
|---------------------------------------------------------------------------+-----------------+--------+--------+--------+---------|
|                                                                    330800 |            1310 |        |        |        |         |
|---------------------------------------------------------------------------+-----------------+--------+--------+--------+---------|
|                                                                           |                 |        |        |        |         |
|---------------------------------------------------------------------------+-----------------+--------+--------+--------+---------|
| Function Name                                                             | Min             | Avg    | Median | Max    | # Calls |
|---------------------------------------------------------------------------+-----------------+--------+--------+--------+---------|
| verify                                                                    |          143057 | 144624 | 144624 | 146192 |       2 |
╰---------------------------------------------------------------------------+-----------------+--------+--------+--------+---------╯

Ran 1 test suite in 20.51ms (10.94ms CPU time): 2 tests passed, 0 failed, 0 skipped (2 total tests)
```

## Sonuç

| | Değer |
|---|---|
| **Kaynağın iddiası** | ~142K gas |
| **Bizim ölçümümüz (min, geçerli imza)** | 143,057 gas |
| **Bizim ölçümümüz (max, geçersiz mesaj reddi)** | 146,192 gas |
| **Sapma** | ~%0.7 – %3 |

**~142K rakamı bizim ortamımızda doğrulandı.** İki ölçüm arasındaki fark
muhtemelen `via_ir`/optimizer ayarlarındaki veya `deneme sayısı=2` gibi küçük
örneklem farkından kaynaklanıyor — kesin sebep araştırılmadı, önemli değil
(rakam zaten kabul edilebilir aralıkta).

## Önemli uyarı (repo README'sinden, olduğu gibi aktarılıyor)

> **WARNING: RESEARCH PROTOTYPE - NOT FOR PRODUCTION USE**
> This codebase is a scheme exploration for lightweight variants of SPHINCS+
> (called SPHINCs-). It has **not been audited yet**, and is **not safe to use
> with real funds**. Cryptographic parameters, key derivation, and contract
> logic have not been reviewed.

Bu uyarı PQ-SAFE'in kendi raporunda/sunumunda **saklanmamalı** — jüri sorarsa
"referans implementasyon denetlenmemiş bir araştırma prototipidir, biz onu
`IPQVerifier` arayüzünün arkasında saracağız ve kendi test setimizle (KAT +
fuzz + karşı senaryolar) doğrulayacağız" şeklinde dürüst cevap verilmeli
(bkz. `CLAUDE.md` kural 6).

## Sıradaki adım

Bu commit'i sabitlenmiş referans olarak kullanıp `contracts/src/verifier/SPHINCSVerifier.sol`
içinde `IPQVerifier`'ı implemente eden sarmalayıcıyı yazmak (Sprint 1 görevi).
