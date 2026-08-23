# ARCHITECTURE — PQ-SAFE İmza Yolu

**Kapsam:** Bu belge Akif'in sorumluluk alanını kapsar — imzanın doğru olup
olmadığını belirleyen her şey: C13 doğrulayıcı kontratı, bizim `SPHINCSVerifier`
sarmalayıcımız, ve mesaj özeti (digest) formatı. Hakan'ın tarafı (cüzdan
durumu, transfer mantığı, migration) burada ele alınmaz — bkz.
`GOREV_SINIRLARI.md`.

Sprint 0 görevi: `nconsigny/SPHINCS-` reposundaki C13 verifier kodunu incele.
Aşağıdaki özet, kodun kendisini ve repodaki agent-destekli güvenlik
incelemesini (`contracts/lib/sphincs-minus/SECURITY-REVIEW-C13-SLHDSA.md`)
okuyarak çıkarıldı.

---

## 1. Genel akış

```
Kullanıcı cüzdanı (frontend, WASM signer)
    │  seed (BIP-39/44) → sk_seed, pkSeed, pkRoot
    │  digest = keccak256(DOMAIN_SEPARATOR, nonce, to, value, keccak256(data))
    │  imza = C13.sign(sk_seed, digest)
    ▼
PQWallet.sol (Hakan)
    │  aynı digest'i on-chain yeniden hesaplar
    │  verifier.verify(digest, signature, publicKey) çağırır
    ▼
IPQVerifier.verify()  ← dondurulmuş arayüz, ASLA revert etmez
    ▼
SPHINCSVerifier.sol (bizim sarmalayıcımız)
    │  publicKey (64 bayt) → pkSeed(32) ‖ pkRoot(32)
    │  try/catch ile referansı sarar
    ▼
SphincsC13Asm.verify()  (nconsigny/sphincs-minus referans kontratı, Yul)
    │  FORS+C (k=7,a=19) + Hypertree WOTS+C (h=22,d=2,w=8,l=43,target_sum=208)
    │  yapılı ama geçersiz imza → return(false)
    │  malformed girdi (yanlış uzunluk, non-canonical pk) → revert (string reason)
    ▼
true/false
```

**Neden bir sarmalayıcı var, referans doğrudan kullanılmıyor:** Referans
kontrat malformed girdilerde (yanlış imza uzunluğu, non-canonical public key)
`revert` atar; `IPQVerifier` sözleşmesi ise "asla revert etmez" garantisi
veriyor (Hakan'ın `require(verifier.verify(...), "...")` çağrısını
`try/catch` derdine sokmadan yazabilmesi için). `SPHINCSVerifier.sol` bu
farkı `try/catch` ile kapatıyor — referans revert ederse `false` döner.
Bu sarmalamanın gerçek gas maliyeti ölçüldü ve kanıtlandı:
`docs/evidence/gas-reports/sprint1-sphincsverifier-wrapper-gas.md`
(111,074 gas — çıplak referansın 106,672 gas'ının ~%4 üzerinde).

---

## 2. C13 nedir, neden seçildi

C13, FIPS 205 (SLH-DSA) standardının resmi bir parametre seti **değil** —
`nconsigny/sphincs-minus` reposundaki "+C" ailesinden (ePrint 2025/2203),
EVM gaz maliyetini düşürmek için tasarlanmış bir araştırma varyantı:

- **WOTS+C** (checksum yerine sabit "target sum" kısıtı — imza doğrulamada
  gezilen zincir adımı sayısını azaltır)
- **FORS+C** (son FORS ağacı "forced-zero" — imzanın bir kısmını gizli
  anahtar entropisinden feragat ederek kısaltır)

Parametreler: `h=22 d=2 a=19 k=7 w=8`, imza boyutu 3688 bayt.
Ölçülen doğrulama maliyeti: **106,672 gas** (çıplak referans,
`docs/evidence/gas-reports/sprint0-c13-verifier-gas.md`). Bu proje 19
Ağustos 2026'da eski hedef olan resmi `SLH-DSA-SHA2-128-24`'ten C13'e geçti
(Hakan onayladı, bkz. `DECISIONS.md`); karar dondurulmuş.

Ödünleşim: standart-dışı olmanın bedeli, güvenlik kanıtının FIPS 205'in
kendisi değil, C13'e özgü ayrı bir analiz olması. Aşağıdaki bölüm bunu özetliyor.

---

## 3. Kontratın iç mantığı — yüksek seviye

`SphincsC13Asm.verify(pkSeed, pkRoot, digest, sig)` (`src/SPHINCs-C13Asm.sol`,
tamamen Yul/inline-assembly, gas için el ile optimize edilmiş):

1. **Girdi kontrolü:** `sig.length == 3688` değilse revert; `pkSeed`/`pkRoot`
   canonical değilse (alt 128 bit sıfır değilse) revert.
2. **H_msg:** `digest' = keccak256(pkSeed ‖ pkRoot ‖ R ‖ digest ‖ 0xFF..FF)` —
   `R`, imzanın ilk 16 baytından okunan bir randomizer (imzalayıcı bunu
   `keccak256("R_grind" ‖ nonce)` ile "grind" ederek forced-zero koşulunu
   sağlayana kadar arar).
3. **htIdx çıkarımı:** `digest'`in belirli bitlerinden 22 bitlik hypertree
   yaprak indeksi (`htIdx`) ve forced-zero kontrolü (`digest'`in [114,133)
   bitleri sıfır olmalı — FORS+C'nin K. ağacının kısaltılma koşulu).
4. **FORS+C (K=7 ağaç, A=19 seviye):** İlk 6 ağaç için imzadaki sırlardan
   yaprak düğümleri hesaplanır, 19 seviyelik auth path ile kök bulunur; 7.
   (forced-zero) ağaç doğrudan açıklanan kök olarak alınır. 7 kök
   `keccak256` ile tek bir `forsPk`'ye sıkıştırılır.
5. **Hypertree (D=2 katman, katman başına 11 seviyelik alt ağaç, WOTS+C
   w=8 l=43):** Her katmanda — imzadaki `count` değeriyle WOTS-mesaj
   digest'i hesaplanır, 43 basamağın toplamının **tam olarak 208** olması
   zorunlu tutulur (WOTS+C'nin checksum yerine kullandığı kısıt), 43 zincir
   yürütülür, WOTS public key'e sıkıştırılır, 11 seviyelik Merkle auth path
   ile katman kökü bulunur. Katman 0'ın kökü katman 1'in mesajı olur.
6. **Son karşılaştırma:** katman 1'in kökü `pkRoot`'a eşit mi → `true`/`false`.

Tüm "yapılı ama geçersiz imza" durumları (forced-zero ihlali, digit-sum
uyuşmazlığı, kök eşleşmemesi) `return(false)` ile biter — `revert` ile
değil. Bu, bizim sarmalayıcımızın `try/catch`'inin *asla* tetiklenmemesi
gereken, yalnızca gerçekten malformed girdilerde (uzunluk, non-canonical
key) devreye giren durumdur.

---

## 4. Güvenlik değerlendirmesi — özet

`sphincs-minus` reposu C13 ve SLH-DSA-SHA2-128-24 için agent-destekli bir
güvenlik incelemesi içeriyor (`SECURITY-REVIEW-C13-SLHDSA.md` — bağımsız
profesyonel denetim değil, en iyi çaba mühendislik incelemesi olarak
etiketlenmiş). Bizim doğrudan kullandığımız C13 tarafı için sonuç:

> **Sahtecilik (forgery), anahtar kurtarma veya yanlış-kabul (false-accept)
> zafiyeti bulunamadı.**

Bulunan maddeler güvenlik-modeli/dokümantasyon boşlukları, sağlamlık
tutarsızlıkları, ve test-oracle boşlukları — pratik bir kırılma değil.
Bizim açımızdan en önemli iki madde:

| Bulgu | Önem | Ne anlama geliyor |
|---|---|---|
| **C13-X-f2** — mesaj randomizer'ı `R` tamamen kamuya açık, sır bağlı değil (`grind_r`, `sk_seed` almıyor) | Orta (özgün: yüksek, deneysel olarak düşürüldü) | En iyi bilinen sahtecilik ~2^133 iş — 128-bit hedefin üzerinde, pratik bir kırılma değil. Ama "few-time" güvenlik kanıtı bu daha güçlü modelde (saldırgan indeks haritasını kontrol ediyor) henüz repo içinde ispatlanmamış. |
| **C13-X-f3** — target-sum WOTS+C'nin çoklu-kullanım (reuse) direnci ispatlanmamış | Orta | 2^22 tavanda ~2^21 `htIdx` çakışması bekleniyor (doğum günü paradoksu); aynı katman-0 WOTS anahtarının iki farklı mesaj için kullanılmasının somut bir sahtecilikle sonuçlandığı gösterilmemiş, ama teorik güvenlik argümanı eksik. |

Ayrıca bizim doğrudan kullandığımız sarmalama noktasıyla ilgili düşük/bilgi
seviyeli maddeler: canonical public key kontrolü var (C13-V-f1, bizim
`SphincsC13Asm` versiyonumuzda zaten düzeltilmiş — kodda "review C13-V-f1"
yorumu görülebilir), forced-zero/digit-sum reddi `return(false)` ile
tekdüze (C13-V-f2, bizim `try/catch` tasarımımızla uyumlu).

**Bizim için pratik sonuç:** C13, projenin hedeflediği güvenlik düzeyinde
(pratik saldırı yüzeyi yok) kullanılabilir durumda; ama "resmi FIPS 205
seti değil, araştırma varyantı" uyarısı CLAUDE.md'de zaten var ve doğru —
bu inceleme onu teyit ediyor. Repo'daki test-oracle boşlukları (Rust↔Python
parity testi derlenmiyor — C13-S-f1/f2) bizim `SPHINCSVerifier.t.sol`
testlerimizi etkilemiyor çünkü biz doğrudan Solidity ↔ WASM signer
tutarlılığını KAT fixture'ı üzerinden test ediyoruz (`c13-kat.json`,
`signer-wasm` ile üretildi), Rust↔Python karşılaştırmasına bağımlı değiliz.

---

## 5. Bizim tarafımızdaki sınırlar / henüz kapanmamış işler

- Frontend'de gerçek keygen/imza akışı henüz UI'a bağlanmadı (Sprint 1,
  devam ediyor — bkz. `GOREV_SINIRLARI.md`).
- Digest formatının Solidity ↔ JS tarafında birebir eşleştiği testi Sprint
  2'de zorunlu (bkz. `GOREV_SINIRLARI.md` Bölüm 4).
- `SPHINCSVerifier.sol` referans kontratı `immutable` olarak deploy anında
  `new SphincsC13Asm()` ile oluşturuyor — referans kontrat güncellenirse
  (ör. C13-X-f2/f3'ün üstündeki dokümantasyon/ispat boşlukları
  kapatılırsa) sarmalayıcının yeniden deploy edilmesi gerekir.
