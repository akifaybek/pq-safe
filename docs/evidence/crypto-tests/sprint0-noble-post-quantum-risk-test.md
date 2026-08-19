# Sprint 0 — @noble/post-quantum risk testi (seed, API, performans)

**Tarih:** 19 Ağustos 2026
**Yazan:** Akif
**Script:** `frontend/src/crypto/noble-risk-test.mjs`
**Ortam:** Node.js v22.21.0 (tarayıcı değil — kaba performans fikri için)

## ⚠️ Kritik bulgu — önce bu okunmalı

`@noble/post-quantum@0.5.4`'ün `slh-dsa` modülü **sadece 6 standart FIPS 205
parametre setini** dışa veriyor: `128f`, `128s`, `192f`, `192s`, `256f`, `256s`
(hem SHAKE hem SHA2 aileleri için). Bunların hiçbiri bizim `docs/DECISIONS.md`'de
dondurulmuş hedefimiz olan **SLH-DSA-SHA2-128-24**'ün (Consigny'nin özel
varyantı: h=22, d=1, a=24, k=6, w=4) parametreleriyle eşleşmiyor:

| | H | D | A | K | W |
|---|---|---|---|---|---|
| **Bizim hedef (SLH-DSA-SHA2-128-24)** | 22 | 1 | 24 | 6 | 4 |
| noble `128f` | 66 | 22 | 6 | 33 | 16 |
| noble `128s` | 63 | 7 | 12 | 14 | 16 |

Parametre setini üreten dahili `gen()` fonksiyonu kütüphaneden **export
edilmiyor** — dışarıdan özel bir varyant oluşturmanın resmi bir yolu yok.

Ayrıca `contracts/lib/sphincs-minus/signer-wasm/` altında hazır bir WASM
imzalayıcı var, ama bu da **C13** varyantı için (h=22, d=2, a=19, k=7, w=8) —
bizim hedefimizden farklı bir parametre seti. `Cargo.toml` adı bile
`sphincs-c13-signer`.

**Sonuç: bizim dondurulmuş hedef şema için ne @noble/post-quantum'da ne de
referans repoda hazır bir tarayıcı/JS imzalayıcı yok.** Var olan tek
implementasyon Python + C (referans, FFI ile test edilen), tarayıcıda
çalışmaz. Bu, mimari bir karar noktası — ayrıntı ve seçenekler için
`docs/DECISIONS.md`'deki ilgili karara bakın.

## Bu testin amacı ve kapsamı

Yukarıdaki bulgu nedeniyle, bu test **bizim hedef şemamızı değil**, noble
kütüphanesinin genel `slh-dsa` API'sinin **mekanik davranışını** (seed kabul
etme, anahtar/imza boyutları, kaba performans) `128f` standart setiyle ölçüyor
— sadece kütüphanenin genel API şeklini ve JS/WASM tarafında SLH-DSA
işlemlerinin ne kadar sürdüğüne dair kaba bir referans noktası vermek için.

## Çıktı

```
=== 1. API şekli ===
slh_dsa_sha2_128f exports: [
  'info', 'internal', 'securityLevel', 'lengths',
  'keygen', 'getPublicKey', 'sign', 'verify', 'prehash'
]

=== 2. Seed testi: keygen dışarıdan seed alıyor mu? ===
keygen.length (parametre sayısı): 1
Aynı seed -> aynı secretKey mi? true
SONUÇ: Kütüphane DIŞARIDAN SEED KABUL EDİYOR (deterministik keygen mümkün).
secretKey uzunluğu: 64 publicKey uzunluğu: 32

=== 3. Temel keygen/sign/verify akışı (rastgele anahtar) ===
secretKey: 64 bayt | publicKey: 32 bayt | signature: 17088 bayt
Doğru mesajla verify: true (true olmalı)
Yanlış mesajla verify: false (false olmalı)

=== 4. Performans testi (Node.js — tarayıcı değil, ama kaba fikir verir) ===
keygen avg: 7.4 ms  (5 çalıştırma)
sign   avg: 169.7 ms
verify avg: 11.1 ms
```

## Yorumlar

1. **Seed davranışı:** `keygen(seed?)` opsiyonel bir seed alıyor, aynı seed
   deterministik olarak aynı `secretKey`'i üretiyor. Bu, cüzdan
   yedekleme/kurtarma (mnemonic → seed → anahtar) tasarımı için önemli bir
   olumlu sinyal — ama gerçek hedef şemamızda da aynı davranışı kendimiz
   sağlamamız gerekecek (bkz. kritik bulgu).
2. **İmza boyutu farkı:** `128f`'in imzası 17,088 bayt — bizim hedefimizin
   (SLH-DSA-SHA2-128-24) imza boyutu ise reponun README'sine göre **3,856
   bayt**. Bu büyük fark tam da parametre setinin (özellikle D=22 hypertree
   katmanı vs bizim D=1) neden bu kadar farklı olduğunu gösteriyor —
   `128f` bizim UI/calldata boyutu tahminlerimiz için kullanılamaz.
3. **Performans:** `sign` ~170ms, `keygen`/`verify` tek haneli-onlu ms
   mertebesinde (Node.js, 128f). Gerçek hedefimizde (D=1, tek XMSS ağacı,
   a=24 FORS) profil farklı olacak — bu sayılar sadece "JS'de SLH-DSA
   pratik hızda çalışır" güvencesi için.

## Sıradaki adım

`docs/DECISIONS.md`'deki "İmzalayıcı boşluğu" kararına bakın — üç seçenek
tartışılıyor (kendi JS/WASM imzalayıcımızı yazma, C referansını WASM'a
taşıma, ya da hedef şemayı C13'e çevirme). Karar Akif+Hakan onayı bekliyor.
