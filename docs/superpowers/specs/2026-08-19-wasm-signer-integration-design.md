# WASM Signer Entegrasyonu — Tasarım

**Tarih:** 19 Ağustos 2026
**Yazan:** Akif
**Sahiplik:** 🔵 Akif (frontend/, docs/) — bkz. `CLAUDE.md` Bölüm 1

## Amaç

`contracts/lib/sphincs-minus/signer-wasm` (Rust/WASM, C13, BIP-39/44 anahtar
türetmeli) imzalayıcısını Node.js'ten çağrılabilir hale getirip keygen/sign
akışını çalıştığını kanıtlamak. Bu, `docs/GOREV_SINIRLARI.md` Sprint 1'deki
"JS tarafında imzalama + anahtar üretimi/yedekleme" görevini ve Sprint 0'da
C13'e taşınan "keygen/sign/verify çalıştır" + "performans testi" maddelerini
karşılar.

**Kapsam: sadece Node.js script + kanıt.** UI yok, framework kurulumu yok.

## Arka plan / önceki tespitler

- `@noble/post-quantum` C13'ü üretemiyor (bkz.
  `docs/evidence/crypto-tests/sprint0-noble-post-quantum-risk-test.md`,
  `docs/DECISIONS.md` 19 Ağustos "İmza şeması ... C13'e değiştirildi" kaydı).
- `signer-wasm` zaten üç `wasm_bindgen` fonksiyonu dışa veriyor
  (`contracts/lib/sphincs-minus/signer-wasm/src/lib.rs`):
  - `keygen_from_mnemonic(mnemonic, passphrase) -> { seed, root, ecdsa_address }`
    — `seed` = pkSeed, `root` = pkRoot (bkz. `keygen.rs`, dönüş tipi
    `(pkSeed, skSeed, pkRoot, ecdsa_address)`).
  - `sign_from_mnemonic(mnemonic, passphrase, message_hex) -> signature_hex`
    (3688 bayt, C13 imza boyutu).
  - `sign_with_keys(...)` — önceden türetilmiş anahtarlarla imzalama (bu
    tasarımda kullanılmıyor, ileride performans optimizasyonu için var).
- `pkSeed(32) ‖ pkRoot(32)` = `SPHINCSVerifier.sol`'ün beklediği 64 baytlık
  `publicKey` formatı — ek bir dönüştürme gerekmiyor.
- `frontend/` şu an neredeyse boş: `src/crypto/noble-risk-test.mjs` (artık
  sadece referans/tarihsel kayıt, silinmiyor), `package.json`'da tek
  bağımlılık `@noble/post-quantum` (kullanımdan kalkıyor).

## Bileşenler

### 1. `frontend/scripts/build-wasm.sh` (yeni)

```bash
wasm-pack build ../contracts/lib/sphincs-minus/signer-wasm \
  --target nodejs \
  --out-dir ../../frontend/src/crypto/wasm-pkg
```

(Gerçek script göreli yolları `frontend/scripts/` içinden doğru hesaplayacak
şekilde yazılacak.)

- Çıktı **sadece** `frontend/src/crypto/wasm-pkg/` altına yazılır — submodule
  dizinine (`contracts/lib/sphincs-minus/`) hiçbir dosya yazılmaz, pinned
  commit (`eef1f889a46c77d45dca013d321e9648fd3eaa7e`) kirlenmez.
- Ön koşul kontrolü: `wasm-pack` PATH'te var mı, `rustup target list --installed`
  içinde `wasm32-unknown-unknown` var mı — yoksa açıklayıcı hata mesajı basılır
  (otomatik kurulum yapılmaz, kullanıcı kendi kurar).
- Script tekrar çalıştırılabilir (idempotent) — mevcut `wasm-pkg/` üzerine
  yazar.

### 2. `.gitignore` güncellemesi

`frontend/src/crypto/wasm-pkg/` eklenir. Derlenmiş `.wasm` + JS glue kodu
commit edilmez — reprodüktibilite `signer-wasm` submodule'ünün pinned
commit'i + `build-wasm.sh` script'i ile sağlanır.

### 3. `frontend/src/crypto/wasm-signer-test.mjs` (yeni)

Akış:
1. `frontend/src/crypto/wasm-pkg` içindeki (wasm-pack `--target nodejs`
   çıktısı CommonJS formatında olduğu için `createRequire(import.meta.url)`
   ile) modülü yükler.
2. Sabit BIP-39 test mnemonic'i kullanır:
   `"abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about"`
   (herkesçe bilinen bir BIP-39 test vektörü — gerçek/gizli bir anahtar
   değil, script içinde de böyle belgelenir).
3. `keygen_from_mnemonic(mnemonic, "")` çağrılır, süresi `Date.now()` ile
   ölçülür. Çıktı: `pkSeed`, `pkRoot`, `ecdsa_address`.
4. Sabit 32-baytlık test mesajıyla (`0xdeadbeef...` gibi, tekrarlanabilir)
   `sign_from_mnemonic(mnemonic, "", message_hex)` çağrılır, süresi ölçülür.
5. `assert`: imza uzunluğu 3688 bayt (C13 parametresi, `params.rs` ile
   tutarlı).
6. Konsola basılan bilgiler:
   - pkSeed/pkRoot/ecdsa_address (hex)
   - imza uzunluğu (bayt)
   - `pkSeed ‖ pkRoot` birleşiminin `SPHINCSVerifier.sol`'ün 64 baytlık
     `publicKey` girdisiyle eşleştiği notu
   - keygen süresi (ms), sign süresi (ms) — performans testi verisi

### 4. `frontend/package.json` güncellemesi

`@noble/post-quantum` bağımlılığı kaldırılır (artık kullanılmıyor;
`CLAUDE.md`'nin 19 Ağustos düzeltmesiyle zaten tutarlı).

### 5. Kanıt: `docs/evidence/crypto-tests/sprint1-wasm-signer-test.md`

İçerik:
- Çalıştırılan komutlar (`build-wasm.sh` + `node wasm-signer-test.mjs`)
- Tam konsol çıktısı
- Ortam bilgisi: Rust/`wasm-pack`/Node sürümleri
- **Uyarı notu:** SPHINCS+ imzalama tipik olarak rastgeleleştirilmiş
  (opt-rand) olabilir — aynı mnemonic + aynı mesajla farklı çalıştırmalarda
  farklı imza baytları çıkması **beklenen davranıştır**, bug değildir. (Bu,
  `sphincs::sign` içinde rastgelelik kullanılıp kullanılmadığına bağlı;
  script çalıştırılırken gözlemlenip kanıt dosyasına dürüstçe yazılacak —
  CLAUDE.md kural 6.)

### 6. `docs/GOREV_SINIRLARI.md` güncellemesi

Sprint 0'da daha önce "❌ İptal ... ⬜ (Sprint 1'e taşındı)" olarak işaretlenen
"`signer-wasm` ile keygen/sign/verify çalıştır" ve "performans testi"
satırları artık ✅ olarak işaretlenip yeni kanıt dosyasına link verilir.

## Kapsam dışı (bilinçli, bu görevde yapılmayacak)

- On-chain doğrulama round-trip'i (üretilen imzayı Foundry FFI ile gerçek
  `SPHINCSVerifier.sol`'e gönderip doğrulatma) — ayrı bir görev olarak ele
  alınabilir.
- UI/framework kurulumu (React/Vite vb.).
- Anahtar yedekleme/kurtarma UX tasarımı.
- `sign_with_keys` (önceden türetilmiş anahtarla hızlı imzalama) kullanımı —
  bu script her seferinde mnemonic'ten türetiyor, optimizasyon değil kanıt
  amaçlı.

## Test / "Bitti" tanımı

- `node frontend/src/crypto/wasm-signer-test.mjs` hatasız çalışır, `assert`
  imza uzunluğunu doğrular (çalıştırılabilir doğrulama — `CLAUDE.md` kural 3).
- Kanıt dosyası `docs/evidence/crypto-tests/` altında.
- `docs/GOREV_SINIRLARI.md` güncel.
- Commit + push (kullanıcı kendi atacak, `CLAUDE.md` kural 2 ve önceki oturum
  geri bildirimi gereği).
