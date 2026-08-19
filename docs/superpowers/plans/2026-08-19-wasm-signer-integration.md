# WASM Signer Entegrasyonu Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `signer-wasm` (Rust/WASM, C13, BIP-39/44) imzalayıcısını Node.js'ten çağrılabilir hale getirip keygen/sign akışının çalıştığını, imza uzunluğunun (3688 bayt) doğru olduğunu kanıtlamak.

**Architecture:** `wasm-pack --target nodejs` ile `contracts/lib/sphincs-minus/signer-wasm` submodule'ü `frontend/src/crypto/wasm-pkg/` altına derlenir (submodule'e hiçbir şey yazılmaz). Bir Node.js script (`wasm-signer-test.mjs`) bu paketi `createRequire` ile yükleyip `keygen_from_mnemonic` + `sign_from_mnemonic` çağırır, sonuçları doğrular ve konsola basar.

**Tech Stack:** Rust/wasm-pack (zaten var, submodule), Node.js (ESM script + `node:assert`), bash (build script).

## Global Constraints

- Spec: `docs/superpowers/specs/2026-08-19-wasm-signer-integration-design.md` — bu plan onun uygulamasıdır, spec'le çelişen bir adım varsa spec esastır.
- **`contracts/lib/sphincs-minus/` submodule'üne HİÇBİR dosya yazılmaz** — sadece okunur, pinned commit (`eef1f889a46c77d45dca013d321e9648fd3eaa7e`) kirlenmez.
- **`frontend/src/crypto/wasm-pkg/` commit edilmez** — `.gitignore`'a eklenir.
- Bu görevin kapsamı Akif'in dosya sahipliği içinde (`frontend/`, `docs/`) — `CLAUDE.md` Bölüm 1.
- **Claude/asistan `git commit` veya `git push` ÇALIŞTIRMAZ.** Her görevin son adımı, kullanıcının kendi terminaline kopyalayacağı `git add`/`git commit -m "..."`/`git push` komutlarını bir kod bloğu olarak sunmaktır — komutu çalıştırmak değil.
- Sabit BIP-39 test mnemonic'i: `abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about` (herkesçe bilinen bir test vektörü, gizli/gerçek bir anahtar değil — script ve kanıt dosyasında bu açıkça belirtilir).
- C13 imza uzunluğu sabiti: **3688 bayt** (`contracts/lib/sphincs-minus/signer-wasm/src/params.rs`, `docs/evidence/gas-reports/sprint0-c13-verifier-gas.md`).

---

## File Structure

```
frontend/
├── .gitignore                          (yeni — wasm-pkg/ ignore)
├── scripts/
│   └── build-wasm.sh                   (yeni — wasm-pack build wrapper)
├── package.json                        (değişecek — @noble/post-quantum kaldırılıyor)
└── src/crypto/
    ├── wasm-pkg/                       (build çıktısı, gitignore'lu, repoda yok)
    └── wasm-signer-test.mjs            (yeni — keygen/sign kanıt script'i)

docs/
├── evidence/crypto-tests/
│   └── sprint1-wasm-signer-test.md     (yeni — kanıt)
└── GOREV_SINIRLARI.md                  (değişecek — Sprint 0 satırları ✅'a çekilir)
```

---

### Task 1: Build script + `.gitignore`

**Files:**
- Create: `frontend/scripts/build-wasm.sh`
- Create: `frontend/.gitignore`

**Interfaces:**
- Consumes: `contracts/lib/sphincs-minus/signer-wasm` (mevcut submodule, değişmiyor).
- Produces: `frontend/src/crypto/wasm-pkg/sphincs_c13_signer.js` (CommonJS glue, Task 3'te `require` edilecek), `frontend/src/crypto/wasm-pkg/sphincs_c13_signer_bg.wasm`.

- [ ] **Step 1: `frontend/.gitignore` oluştur**

```
src/crypto/wasm-pkg/
```

- [ ] **Step 2: `frontend/scripts/build-wasm.sh` yaz**

```bash
#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FRONTEND_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
REPO_ROOT="$(cd "$FRONTEND_DIR/.." && pwd)"
CRATE_DIR="$REPO_ROOT/contracts/lib/sphincs-minus/signer-wasm"
OUT_DIR="$FRONTEND_DIR/src/crypto/wasm-pkg"

if ! command -v wasm-pack >/dev/null 2>&1; then
  echo "ERROR: wasm-pack bulunamadı. Kurulum: cargo install wasm-pack" >&2
  exit 1
fi

if ! rustup target list --installed 2>/dev/null | grep -q wasm32-unknown-unknown; then
  echo "ERROR: wasm32-unknown-unknown target kurulu değil. Kurulum: rustup target add wasm32-unknown-unknown" >&2
  exit 1
fi

echo "Derleniyor: $CRATE_DIR -> $OUT_DIR"
wasm-pack build "$CRATE_DIR" --target nodejs --out-dir "$OUT_DIR"
echo "Tamamlandı: $OUT_DIR"
```

- [ ] **Step 3: Çalıştırılabilir yap ve çalıştır**

```bash
chmod +x frontend/scripts/build-wasm.sh
./frontend/scripts/build-wasm.sh
```

Beklenen: `Tamamlandı: .../frontend/src/crypto/wasm-pkg` ile biter, hata yok.
`wasm-pack` veya `wasm32-unknown-unknown` kurulu değilse script açıklayıcı
hatayla durur — bu durumda `cargo install wasm-pack` ve
`rustup target add wasm32-unknown-unknown` çalıştırılıp script tekrar
denenir.

- [ ] **Step 4: Çıktıyı doğrula**

```bash
ls frontend/src/crypto/wasm-pkg/
```

Beklenen: `sphincs_c13_signer.js`, `sphincs_c13_signer_bg.wasm`,
`sphincs_c13_signer.d.ts`, `package.json` dosyaları listede.

- [ ] **Step 5: `contracts/lib/sphincs-minus` submodule'ünün kirlenmediğini doğrula**

```bash
git -C contracts/lib/sphincs-minus status --short
```

Beklenen: boş çıktı (hiçbir değişiklik yok). Eğer bir çıktı varsa Step 2'deki
`OUT_DIR` hesaplaması yanlış demektir — düzeltilip tekrar denenmeli.

- [ ] **Step 6: Durumu göster, commit komutlarını sun**

```bash
git status
git diff --stat
```

Kullanıcıya kopyalaması için:

```bash
git add frontend/.gitignore frontend/scripts/build-wasm.sh
git commit -m "chore(frontend): wasm-pack build script + wasm-pkg gitignore ekle"
git push
```

---

### Task 2: `wasm-signer-test.mjs` — keygen + sign kanıt script'i

**Files:**
- Create: `frontend/src/crypto/wasm-signer-test.mjs`

**Interfaces:**
- Consumes: `frontend/src/crypto/wasm-pkg/sphincs_c13_signer.js` (Task 1 çıktısı) — dışa verdiği fonksiyonlar: `keygen_from_mnemonic(mnemonic: string, passphrase: string) -> string` (JSON: `{seed, root, ecdsa_address}`), `sign_from_mnemonic(mnemonic: string, passphrase: string, message_hex: string) -> string` (hex, `0x` önekli).
- Produces: konsol çıktısı (Task 4'te kanıt dosyasına kopyalanacak).

- [ ] **Step 1: Script'i yaz**

```javascript
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';

const require = createRequire(import.meta.url);
const signer = require('./wasm-pkg/sphincs_c13_signer.js');

const TEST_MNEMONIC =
  'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
const TEST_MESSAGE_HEX =
  '0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef';
const EXPECTED_SIG_BYTES = 3688;

console.log('=== WASM signer testi (C13, signer-wasm) ===');
console.log('Not: aşağıdaki mnemonic bilinen bir BIP-39 test vektörüdür, gizli/gerçek bir anahtar DEĞİLDİR.');
console.log(`Mnemonic: ${TEST_MNEMONIC}`);

console.log('\n--- 1. keygen_from_mnemonic ---');
const t0 = Date.now();
const keygenResultJson = signer.keygen_from_mnemonic(TEST_MNEMONIC, '');
const t1 = Date.now();
const keygenResult = JSON.parse(keygenResultJson);
console.log('pkSeed (seed):', keygenResult.seed);
console.log('pkRoot (root):', keygenResult.root);
console.log('ecdsa_address:', keygenResult.ecdsa_address);
console.log(`keygen süresi: ${t1 - t0} ms`);

const publicKey =
  keygenResult.seed.replace(/^0x/, '') + keygenResult.root.replace(/^0x/, '');
console.log(
  `publicKey (pkSeed‖pkRoot, ${publicKey.length / 2} bayt, SPHINCSVerifier.sol formatı):`,
  `0x${publicKey}`,
);
assert.equal(publicKey.length, 128, 'publicKey 64 bayt (128 hex karakter) olmalı');

console.log('\n--- 2. sign_from_mnemonic ---');
console.log('Mesaj:', TEST_MESSAGE_HEX);
const t2 = Date.now();
const signatureHex = signer.sign_from_mnemonic(TEST_MNEMONIC, '', TEST_MESSAGE_HEX);
const t3 = Date.now();
console.log(`sign süresi: ${t3 - t2} ms`);

const sigBytes = (signatureHex.length - 2) / 2;
console.log(`İmza uzunluğu: ${sigBytes} bayt`);
assert.equal(
  sigBytes,
  EXPECTED_SIG_BYTES,
  `İmza ${EXPECTED_SIG_BYTES} bayt olmalı, ${sigBytes} bulundu`,
);

console.log('\n=== SONUÇ: keygen + sign başarılı, imza uzunluğu doğrulandı ===');
```

- [ ] **Step 2: Çalıştır**

```bash
node frontend/src/crypto/wasm-signer-test.mjs
```

Beklenen: "SONUÇ: keygen + sign başarılı" ile biter, `AssertionError` yok.

**Bilinen risk:** Rust tarafındaki `getrandom` crate'inin `js` özelliği
tarayıcı ortamı varsayabilir; Node'da `sign_from_mnemonic` çağrısı
rastgelelik kaynağıyla ilgili bir hata fırlatırsa (örn. "crypto.getRandomValues
is not a function" gibi), bu gerçek bir bulgu olarak kabul edilir —
**uydurulmaz, gizlenmez** (`CLAUDE.md` kural 6). Bu durumda:
1. Tam hata mesajı kaydedilir.
2. `contracts/lib/sphincs-minus/signer-wasm/src/sphincs.rs` içinde `sign`
   fonksiyonunun rastgelelik kullanıp kullanmadığına (opt-rand) bakılır.
3. Çözülemezse Task 4'teki kanıt dosyasına "başarısız, sebep X" olarak
   dürüstçe yazılır ve kullanıcıya haber verilir — sonraki task'lara
   geçilmez, kullanıcıyla B planı konuşulur.

- [ ] **Step 3: Durumu göster, commit komutlarını sun**

```bash
git status
git diff --stat
```

Kullanıcıya kopyalaması için:

```bash
git add frontend/src/crypto/wasm-signer-test.mjs
git commit -m "feat(frontend): C13 WASM signer keygen/sign kanıt script'i"
git push
```

---

### Task 3: `@noble/post-quantum` bağımlılığını kaldır

**Files:**
- Modify: `frontend/package.json`

**Interfaces:**
- Consumes: yok.
- Produces: yok (sadece bağımlılık listesi temizleniyor).

- [ ] **Step 1: `frontend/package.json`'dan `@noble/post-quantum` satırını kaldır**

Mevcut:
```json
{
  "name": "pq-safe-frontend",
  "version": "0.0.1",
  "private": true,
  "type": "module",
  "dependencies": {
    "@noble/post-quantum": "^0.5.2"
  }
}
```

Yeni:
```json
{
  "name": "pq-safe-frontend",
  "version": "0.0.1",
  "private": true,
  "type": "module"
}
```

- [ ] **Step 2: `wasm-signer-test.mjs`'in hâlâ çalıştığını doğrula (npm bağımlılığı kullanmıyor)**

```bash
node frontend/src/crypto/wasm-signer-test.mjs
```

Beklenen: Task 2 Step 2 ile aynı başarı çıktısı (script zaten npm paketi
değil, doğrudan `wasm-pkg/` dosyasını `require` ediyordu — bu adım sadece
regresyon olmadığını doğrular).

- [ ] **Step 3: Durumu göster, commit komutlarını sun**

```bash
git status
git diff --stat
```

Kullanıcıya kopyalaması için:

```bash
git add frontend/package.json
git commit -m "chore(frontend): kullanılmayan @noble/post-quantum bağımlılığını kaldır"
git push
```

---

### Task 4: Kanıt dosyası + `GOREV_SINIRLARI.md` güncellemesi

**Files:**
- Create: `docs/evidence/crypto-tests/sprint1-wasm-signer-test.md`
- Modify: `docs/GOREV_SINIRLARI.md` (Sprint 0 Akif tablosundaki iki satır)

**Interfaces:**
- Consumes: Task 2 Step 2'nin tam konsol çıktısı.
- Produces: yok (dokümantasyon).

- [ ] **Step 1: Ortam bilgisini topla**

```bash
wasm-pack --version
rustc --version
node --version
```

Çıktıları not al (kanıt dosyasına yapıştırılacak).

- [ ] **Step 2: `docs/evidence/crypto-tests/sprint1-wasm-signer-test.md` yaz**

```markdown
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
[wasm-pack --version çıktısı]
[rustc --version çıktısı]
[node --version çıktısı]
```

## Komutlar

```bash
./frontend/scripts/build-wasm.sh
node frontend/src/crypto/wasm-signer-test.mjs
```

## Çıktı

```
[Task 2 Step 2'nin tam konsol çıktısı buraya yapıştırılır]
```

## Notlar

- Kullanılan mnemonic (`abandon abandon ... about`) herkesçe bilinen bir
  BIP-39 test vektörüdür, gizli/gerçek bir anahtar değildir.
- `pkSeed ‖ pkRoot` birleşimi `SPHINCSVerifier.sol`'ün `IPQVerifier.verify()`
  fonksiyonunun beklediği 64 baytlık `publicKey` formatıyla birebir uyumlu —
  ek bir dönüştürme gerekmiyor.
- SPHINCS+ imzalama rastgeleleştirilmiş olabilir: aynı mnemonic + aynı
  mesajla tekrar çalıştırıldığında farklı imza baytları çıkması **beklenen
  davranıştır**, hata değildir — imza *uzunluğu* (3688 bayt) sabit kalır,
  içeriği değil.
- Kapsam dışı: bu testte üretilen imzanın gerçek `SPHINCSVerifier.sol`'e
  (on-chain) gönderilip doğrulanması yok — ayrı bir görev.

## Sonuç

[PASS/FAIL ve kısa özet — Task 2 Step 2'nin gerçek sonucuna göre doldurulur]
```

**Not:** Köşeli parantez içindeki yer tutucular Task 1-3'ün gerçek
çıktılarıyla doldurulur — dosya placeholder olarak commit edilmez, gerçek
komut çıktılarıyla tamamlanmış hâliyle commit edilir.

- [ ] **Step 3: `docs/GOREV_SINIRLARI.md`'yi güncelle**

Şu an dosyada (Sprint 0, Akif tablosu):
```
| ~~`@noble/post-quantum` ile keygen/sign/verify çalıştır~~ | — | ❌ İptal — C13'ü desteklemiyor, bkz. `DECISIONS.md` (19 Ağustos, JS kütüphanesi düzeltmesi) |
| ~~**Seed testi:** kütüphane dışarıdan seed alıyor mu?~~ | `evidence/crypto-tests/sprint0-noble-post-quantum-risk-test.md` (128f ile, referans amaçlı kaldı) | ❌ İptal — hedef `signer-wasm`'a taşındı, BIP-39/44 türetme zaten deterministik |
| `signer-wasm` (Rust/WASM C13 signer) ile keygen/sign/verify çalıştır | Konsol çıktısı → `evidence/crypto-tests/` | ⬜ (Sprint 1'e taşındı) |
| **Performans testi:** tarayıcıda keygen + imzalama süresi (WASM) | Ölçüm → `evidence/crypto-tests/` | ⬜ (Sprint 1'e taşındı) |
```

Bu dört satır şuna güncellenir:
```
| ~~`@noble/post-quantum` ile keygen/sign/verify çalıştır~~ | — | ❌ İptal — C13'ü desteklemiyor, bkz. `DECISIONS.md` (19 Ağustos, JS kütüphanesi düzeltmesi) |
| ~~**Seed testi:** kütüphane dışarıdan seed alıyor mu?~~ | `evidence/crypto-tests/sprint0-noble-post-quantum-risk-test.md` (128f ile, referans amaçlı kaldı) | ❌ İptal — hedef `signer-wasm`'a taşındı, BIP-39/44 türetme zaten deterministik |
| `signer-wasm` (Rust/WASM C13 signer) ile keygen/sign/verify çalıştır | `evidence/crypto-tests/sprint1-wasm-signer-test.md` | ✅ Bitti (Sprint 1'de) |
| **Performans testi:** node.js'te keygen + imzalama süresi (WASM) | `evidence/crypto-tests/sprint1-wasm-signer-test.md` | ✅ Bitti (Sprint 1'de, Node.js ortamında — tarayıcı ölçümü ayrı bir görev) |
```

- [ ] **Step 4: Durumu göster, commit komutlarını sun**

```bash
git status
git diff --stat
```

Kullanıcıya kopyalaması için:

```bash
git add docs/evidence/crypto-tests/sprint1-wasm-signer-test.md docs/GOREV_SINIRLARI.md
git commit -m "docs(evidence): WASM signer keygen/sign kanıtı ekle, Sprint 0 görevlerini kapat"
git push
```

---

## Self-Review Notları (planı yazarken yapıldı)

- **Spec kapsaması:** Spec'teki 6 bileşenin (build script, `.gitignore`,
  test script, `package.json` temizliği, kanıt dosyası, `GOREV_SINIRLARI.md`
  güncellemesi) hepsi Task 1-4'e dağıtıldı.
- **Placeholder taraması:** Kanıt dosyası şablonundaki köşeli parantezler
  bilinçli — gerçek komut çıktısıyla doldurulacağı Step 2'nin hemen altında
  açıkça belirtildi, "sonra doldururuz" anlamında bırakılmadı.
- **Tip/isim tutarlılığı:** `sphincs_c13_signer.js` (Task 1 üretir, Task 2
  `require` eder), `keygen_from_mnemonic`/`sign_from_mnemonic` imzaları
  (spec'teki `lib.rs` referansıyla birebir) tüm task'larda aynı.
