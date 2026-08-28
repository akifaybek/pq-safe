# İşlem Oluşturma ve İmzalama Akışı — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Kullanıcının girdiği işlem alanlarından (`to`/`value`/`data`/`nonce`/PQWallet adresi) dondurulmuş formata uygun digest üretmek ve o digest'i sayfadaki anahtarla gerçekten imzalamak.

**Architecture:** Mantık yeni bir `frontend/src/tx/buildTransaction.js` modülünde toplanır; `main.js` DOM tutkalı olarak kalır. Modül iki fonksiyon verir: `buildDigest()` saf ve node'da test edilebilir, `buildAndSign()` WASM kullandığı için yalnızca tarayıcıda doğrulanabilir. Bu ayrım görev bölünmesini de belirliyor.

**Tech Stack:** `ethers` v6 (`getAddress`, `isHexString`, ABI kodlama), mevcut `digest.js` ve `signer.js`, Vite dev server, vanilla JS/HTML.

## Global Constraints

- **Implementer ASLA `git add`/`git commit`/`git push` çalıştırmaz.** Commit adımlarındaki komutlar kullanıcıya verilir, kullanıcı çalıştırır. Bu proje kuralı, istisnası yok.
- Dosya sahipliği: yalnızca `frontend/` altına dokunulur. `contracts/` altındaki hiçbir şeye dokunulmaz.
- `chainId` kullanıcı girdisi DEĞİLDİR — `sepolia.js`'ten gelen `SEPOLIA_CHAIN_ID` sabiti kullanılır (spec: "zincir kimliği kullanıcı girdisi olsaydı yanlış değer sessizce geçersiz imza üretirdi").
- `value` alanı **wei** alır; birim çevrimi YAPILMAZ. ETH karşılığı sadece geri okuma olarak gösterilir (spec: "sessiz bir hata sınıfı açardı").
- Her girdi alanı **kendi adıyla** doğrulanır; ethers'ın çıplak `invalid address` hatası kullanıcıya gösterilmez (spec: "Hata yönetimi").
- `digest.js` dondurulmuş formatı taşır — bu planda **değiştirilmez**, sadece çağrılır.
- Beklenen digest değerleri Foundry `cast`'ten gelir (`docs/evidence/crypto-tests/sprint2-js-digest-function.md`). Test bunlara uydurulur; kod bu değerleri üretmiyorsa **kod yanlıştır**, beklenen değer değil.
- Spec dosyası: `docs/superpowers/specs/2026-08-28-transaction-builder-design.md` — çelişki çıkarsa spec esas alınır.

### Doğrulanmış ortam gerçekleri (tahmin değil, bu plan yazılırken ölçüldü)

- `signer.js` node'da **yüklenir** (static import sorun çıkarmaz), ama `signDigest()` node'da `fetch failed` ile patlar — `wasm-pkg-web` build'i `.wasm` dosyasını fetch'lemeye çalışır. Bu yüzden `buildAndSign()` node'da test EDİLEMEZ; tarayıcıda doğrulanır.
- `computeDomainSeparator(11155111n, ...)` ile `computeDomainSeparator(11155111, ...)` **aynı** sonucu verir (bigint güvenli).
- `getAddress()` checksum'lu (karışık harfli) adres döndürür; küçük harfli girdiyle **aynı digest** çıkar.
- `isHexString('0x')` → `true`; `isHexString('0xabc')` → `true` ama uzunluğu tek, bu yüzden ayrıca `% 2` kontrolü gerekir.

---

### Task 1: `buildDigest()` + otomatik doğrulama

**Files:**
- Modify: `/Users/akif/pq-safe/frontend/src/network/sepolia.js` (tek satır: `const` → `export const`)
- Create: `/Users/akif/pq-safe/frontend/src/tx/buildTransaction.js`
- Create: `/Users/akif/pq-safe/frontend/src/tx/build-transaction-test.mjs`

**Interfaces:**
- Consumes: `computeDigest`, `computeDomainSeparator` (`../crypto/digest.js`, mevcut); `getAddress`, `isHexString` (`ethers`).
- Produces: `SEPOLIA_CHAIN_ID` (`sepolia.js`'ten export) ve
  `buildDigest({ walletAddress, nonce, to, value, data }) → { domainSeparator, digest }`
  — Task 2 bu fonksiyonu `buildAndSign()` içinde çağıracak.

- [ ] **Step 1: `SEPOLIA_CHAIN_ID`'yi export et**

`frontend/src/network/sepolia.js` içinde şu satırı:
```js
const SEPOLIA_CHAIN_ID = 11155111n;
```
şuna değiştir:
```js
export const SEPOLIA_CHAIN_ID = 11155111n;
```
Dosyanın geri kalanına dokunma.

- [ ] **Step 2: Başarısız olacak testi yaz**

`frontend/src/tx/build-transaction-test.mjs` oluştur:

```js
// buildDigest() doğrulaması. Beklenen değerler Foundry `cast` ile bağımsız
// olarak üretildi (bkz. docs/evidence/crypto-tests/sprint2-js-digest-function.md),
// yani bu, kendi kodunu kendine onaylatan bir test değil.
//
// buildAndSign() burada test EDİLMİYOR: signer.js web WASM build'ini
// (wasm-pkg-web) kullanıyor, node'da init() "fetch failed" ile patlıyor.
// Onun doğrulaması tarayıcıda yapılır (bkz. plan Task 2).

import { buildDigest } from './buildTransaction.js';

const WALLET = '0x1234567890123456789012345678901234567890';
const TO = '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd';

let failures = 0;

function check(name, actual, expected) {
  if (actual === expected) {
    console.log(`✓ ${name}`);
  } else {
    failures++;
    console.error(`✗ ${name}\n    beklenen: ${expected}\n    gelen   : ${actual}`);
  }
}

function checkThrows(name, fn, expectedFragment) {
  try {
    fn();
    failures++;
    console.error(`✗ ${name}: hata bekleniyordu, fırlatılmadı`);
  } catch (e) {
    if (e.message.includes(expectedFragment)) {
      console.log(`✓ ${name} → "${e.message}"`);
    } else {
      failures++;
      console.error(`✗ ${name}\n    mesaj "${expectedFragment}" içermeliydi\n    gelen: ${e.message}`);
    }
  }
}

console.log('=== buildDigest testi (beklenen değerler: Foundry cast) ===\n');

console.log('--- Test 1: boş data ---');
const t1 = buildDigest({ walletAddress: WALLET, nonce: 0, to: TO, value: '1000000000000000000', data: '0x' });
check('DOMAIN_SEPARATOR', t1.domainSeparator, '0x8110c08d40ffb855149f3c041e89e6071a71c5f337ca317b9c24aea9da98e6a5');
check('digest', t1.digest, '0x417663f38b52fec7f71d3fb178fed03ac2559af424c9a01b72f65f23553a4746');

console.log('\n--- Test 2: dolu data, farklı nonce/value ---');
const t2 = buildDigest({ walletAddress: WALLET, nonce: 5, to: TO, value: 42, data: '0xdeadbeef' });
check('digest', t2.digest, '0xc9463c6053d8c0e0573012df0e7f5ab40fd74ffdbc840a65b3be0bd7b332ec29');

console.log('\n--- Test 3: küçük harfli adres, checksum ile aynı digest ---');
const t3 = buildDigest({ walletAddress: WALLET.toLowerCase(), nonce: 0, to: TO.toLowerCase(), value: '1000000000000000000', data: '0x' });
check('digest', t3.digest, t1.digest);

console.log('\n--- Test 4: boş data alanı 0x sayılmalı ---');
const t4 = buildDigest({ walletAddress: WALLET, nonce: 0, to: TO, value: '1000000000000000000', data: '' });
check('digest', t4.digest, t1.digest);

console.log('\n--- Test 5: alan adıyla hata mesajları ---');
checkThrows('geçersiz to adresi', () => buildDigest({ walletAddress: WALLET, nonce: 0, to: '0xzzz', value: 0, data: '0x' }), 'to alanı');
checkThrows('geçersiz cüzdan adresi', () => buildDigest({ walletAddress: 'abc', nonce: 0, to: TO, value: 0, data: '0x' }), 'PQWallet adresi alanı');
checkThrows('negatif value', () => buildDigest({ walletAddress: WALLET, nonce: 0, to: TO, value: -1, data: '0x' }), 'value alanı negatif olamaz');
checkThrows('geçersiz nonce', () => buildDigest({ walletAddress: WALLET, nonce: 'x', to: TO, value: 0, data: '0x' }), 'nonce alanı');
checkThrows('bozuk hex data', () => buildDigest({ walletAddress: WALLET, nonce: 0, to: TO, value: 0, data: '0xabc' }), 'data alanı');

console.log(failures === 0 ? '\nTÜM TESTLER GEÇTİ' : `\n${failures} TEST BAŞARISIZ`);
process.exit(failures === 0 ? 0 : 1);
```

- [ ] **Step 3: Testi çalıştır, başarısız olduğunu gör**

Run: `node src/tx/build-transaction-test.mjs`
Expected: `ERR_MODULE_NOT_FOUND` — `buildTransaction.js` henüz yok. Bu beklenen; testin gerçekten çalıştığını kanıtlıyor.

- [ ] **Step 4: `buildTransaction.js`'i yaz**

`frontend/src/tx/buildTransaction.js` oluştur:

```js
// İşlem alanlarından PQWallet'ın imzalayacağı digest'i kurar.
//
// İsimlendirme: `digest.js`'teki compute* fonksiyonları dondurulmuş formatı
// uygular — saf, ağdan habersiz, verileni olduğu gibi kullanır. Buradaki
// build* fonksiyonları ise zincir bağlamını (chainId) enjekte eder, girdileri
// doğrular ve imzalamayla kompoze eder. Format burada değişmez.

import { getAddress, isHexString } from 'ethers';
import { computeDigest, computeDomainSeparator } from '../crypto/digest.js';
import { SEPOLIA_CHAIN_ID } from '../network/sepolia.js';

// ethers hatalı adres için "invalid address" diyor ama HANGİ alan olduğunu
// söylemiyor. Beş girdili bir formda bu kullanılamaz — her alanı kendi adıyla
// sarıyoruz.
function requireAddress(fieldName, value) {
  try {
    return getAddress(String(value ?? '').trim());
  } catch {
    throw new Error(`${fieldName} alanı geçerli bir adres değil: ${value}`);
  }
}

function requireUint(fieldName, value) {
  let parsed;
  try {
    parsed = BigInt(String(value ?? '').trim());
  } catch {
    throw new Error(`${fieldName} alanı geçerli bir tamsayı değil: ${value}`);
  }
  if (parsed < 0n) {
    throw new Error(`${fieldName} alanı negatif olamaz: ${value}`);
  }
  return parsed;
}

// isHexString('0xabc') true döner ama uzunluk tek — Solidity bytes'a
// çevrilemez, o yüzden ayrıca çift uzunluk kontrolü var.
function requireHexData(fieldName, value) {
  const raw = String(value ?? '').trim();
  if (raw === '') return '0x';
  if (!isHexString(raw) || raw.length % 2 !== 0) {
    throw new Error(
      `${fieldName} alanı geçerli hex değil (0x ile başlamalı, çift sayıda karakter): ${value}`,
    );
  }
  return raw;
}

export function buildDigest({ walletAddress, nonce, to, value, data }) {
  const wallet = requireAddress('PQWallet adresi', walletAddress);
  const recipient = requireAddress('to', to);
  const nonceValue = requireUint('nonce', nonce);
  const weiValue = requireUint('value', value);
  const callData = requireHexData('data', data);

  const domainSeparator = computeDomainSeparator(SEPOLIA_CHAIN_ID, wallet);
  const digest = computeDigest({
    chainId: SEPOLIA_CHAIN_ID,
    walletAddress: wallet,
    nonce: nonceValue,
    to: recipient,
    value: weiValue,
    data: callData,
  });

  return { domainSeparator, digest };
}
```

- [ ] **Step 5: Testi çalıştır, geçtiğini gör**

Run: `cd /Users/akif/pq-safe/frontend && node src/tx/build-transaction-test.mjs`
Expected: her satırda `✓`, son satır `TÜM TESTLER GEÇTİ`, exit code `0`.
Exit code'u görmek için: `node src/tx/build-transaction-test.mjs; echo "exit: $?"` → `exit: 0`.

- [ ] **Step 6: Commit (komutu kullanıcıya ver, ÇALIŞTIRMA)**

```bash
git add frontend/src/network/sepolia.js frontend/src/tx/buildTransaction.js frontend/src/tx/build-transaction-test.mjs
git commit -m "feat(frontend): işlem alanlarından digest kuran buildDigest + cast vektörlerine karşı test"
```

> **Uygulama notu (28 Ağustos, review sonrası eklendi):** Yukarıdaki
> `requireUint` kodu eksikti ve repodaki hâli ondan farklıdır. Review iki
> açık buldu: (1) `BigInt('') === 0n` olduğu için boş/eksik `nonce` veya
> `value` sessizce `0`'a çöküyordu — nonce bu projenin tek replay koruması
> olduğundan "girmedim" ile "0 girdim" ayırt edilemez hale geliyordu;
> (2) uint256 üst sınırı kontrol edilmediği için taşan değerde hata
> `abiCoder.encode`'dan çıplak ethers mesajı olarak geliyordu. İkisi de
> düzeltildi (boş girdi açıkça reddediliyor, `UINT256_MAX` kontrolü eklendi)
> ve Test 6/7/8 ile kapsandı. **Bu plandaki kod parçası artık geçmişe ait bir
> anlık görüntüdür; doğruluk kaynağı repodaki dosyadır.**

---

### Task 2: `buildAndSign()` + 4. bölüm UI

**Files:**
- Modify: `/Users/akif/pq-safe/frontend/src/tx/buildTransaction.js` (dosyanın sonuna ekleme)
- Modify: `/Users/akif/pq-safe/frontend/index.html`
- Modify: `/Users/akif/pq-safe/frontend/src/main.js`

**Interfaces:**
- Consumes: `buildDigest({ walletAddress, nonce, to, value, data }) → { domainSeparator, digest }` (Task 1); `signDigest(mnemonic, digestHex) → { signature, sigBytes }` (`../crypto/signer.js`, mevcut).
- Produces: `buildAndSign({ walletAddress, nonce, to, value, data, mnemonic }) → { domainSeparator, digest, signature, sigBytes, signMs }` — bu planın son çıktısı, başka task tüketmiyor.

- [ ] **Step 1: `buildAndSign()`'ı ekle**

`frontend/src/tx/buildTransaction.js`'in **en üstündeki** import bloğuna şu satırı ekle:
```js
import { signDigest } from '../crypto/signer.js';
```

Dosyanın **sonuna** (mevcut `buildDigest`'ten sonra) şunu ekle:

```js

// signMs YALNIZCA signDigest() süresini ölçer. Digest hesaplama ayrıca
// ölçülmüyor: milisaniye altı olduğu için kanıt değeri yok ve tek bir
// birleşik süre "bu rakam neyi ölçüyor" belirsizliği yaratırdı.
export async function buildAndSign({ walletAddress, nonce, to, value, data, mnemonic }) {
  if (!mnemonic) {
    throw new Error('mnemonic yok — önce 1. bölümde anahtar üretin');
  }
  const { domainSeparator, digest } = buildDigest({ walletAddress, nonce, to, value, data });

  const t0 = performance.now();
  const { signature, sigBytes } = await signDigest(mnemonic, digest);
  const signMs = performance.now() - t0;

  return { domainSeparator, digest, signature, sigBytes, signMs };
}
```

- [ ] **Step 2: Task 1 testinin hâlâ geçtiğini doğrula**

`signer.js` artık static olarak import ediliyor. Node'da bu yüklenir ama `signDigest()` çağrılmadığı için test etkilenmemeli — yine de doğrula:

Run: `cd /Users/akif/pq-safe/frontend && node src/tx/build-transaction-test.mjs; echo "exit: $?"`
Expected: `TÜM TESTLER GEÇTİ`, `exit: 0`. Eğer `fetch failed` veya modül hatası alırsan DUR ve bildir — o durumda `signDigest` import'unun `buildAndSign` içine dinamik import olarak taşınması gerekir.

- [ ] **Step 3: `index.html`'e 4. bölümü ekle**

`frontend/index.html`'de şu satırı:
```html
  <script type="module" src="/src/main.js"></script>
```

şununla değiştir:
```html
  <section>
    <h2>4. İşlem Oluştur ve İmzala</h2>
    <p class="warn">Alanlar <code>docs/evidence/crypto-tests/sprint2-js-digest-function.md</code>'deki Foundry <code>cast</code> test vektörüyle ön-doldurulmuştur — çıkan digest oradaki değerle karşılaştırılabilir.</p>
    <label for="tx-wallet">PQWallet adresi</label>
    <input id="tx-wallet" value="0x1234567890123456789012345678901234567890" />
    <label for="tx-to">to (alıcı adresi)</label>
    <input id="tx-to" value="0xabcdefabcdefabcdefabcdefabcdefabcdefabcd" />
    <label for="tx-value">value (wei)</label>
    <input id="tx-value" value="1000000000000000000" />
    <label for="tx-nonce">nonce</label>
    <input id="tx-nonce" value="0" />
    <label for="tx-data">data (hex, boşsa 0x)</label>
    <input id="tx-data" value="0x" />
    <button id="btn-build-sign" style="margin-top:10px;">Digest hesapla ve imzala</button>
    <div id="tx-out"></div>
  </section>

  <script type="module" src="/src/main.js"></script>
```

- [ ] **Step 4: `main.js`'e import ve listener ekle**

`frontend/src/main.js`'in en üstündeki import bloğuna şu iki satırı ekle:
```js
import { formatEther } from 'ethers';
import { buildAndSign } from './tx/buildTransaction.js';
```

Diğer çıktı elementlerinin yanına (`connectionOut`'un hemen altına) ekle:
```js
const txOut = document.getElementById('tx-out');
```

Dosyanın **sonuna** ekle:

```js

const btnBuildSign = document.getElementById('btn-build-sign');

btnBuildSign.addEventListener('click', async () => {
  if (!currentMnemonic) {
    txOut.innerHTML = '<p class="err">Önce anahtar üret.</p>';
    return;
  }
  // İmzalama ~7.5 sn sürüyor; buton açık kalırsa kullanıcı rahatlıkla
  // tekrar tıklar ve eşzamanlı WASM çağrısı başlatır.
  btnBuildSign.disabled = true;
  txOut.innerHTML = '<p>Digest hesaplanıyor ve imzalanıyor… (~7-8 sn)</p>';
  try {
    const weiValue = document.getElementById('tx-value').value.trim();
    const { domainSeparator, digest, signature, sigBytes, signMs } = await buildAndSign({
      walletAddress: document.getElementById('tx-wallet').value.trim(),
      to: document.getElementById('tx-to').value.trim(),
      value: weiValue,
      nonce: document.getElementById('tx-nonce').value.trim(),
      data: document.getElementById('tx-data').value.trim(),
      mnemonic: currentMnemonic,
    });
    const lengthOk = sigBytes === 3688;
    txOut.innerHTML = `
      <label>DOMAIN_SEPARATOR (chainId + cüzdan adresine bağlı)</label>
      <div class="field">${domainSeparator}</div>
      <label>digest</label>
      <div class="field">${digest}</div>
      <label>value geri okuma</label>
      <div class="field">${weiValue} wei = ${formatEther(weiValue)} ETH</div>
      <label>İmza (${sigBytes} bayt)</label>
      <div class="field">${signature}</div>
      <p class="${lengthOk ? 'ok' : 'err'}">${lengthOk ? '✓ imza uzunluğu 3688 bayt (C13 beklenen)' : '✗ beklenmeyen uzunluk'}</p>
      <p class="ok">imzalama tamamlandı (${signMs.toFixed(1)} ms)</p>
    `;
  } catch (e) {
    txOut.innerHTML = `<p class="err">Hata: ${e.message}</p>`;
  } finally {
    btnBuildSign.disabled = false;
  }
});
```

- [ ] **Step 5: Dev server'ı başlat**

Run: `cd /Users/akif/pq-safe/frontend && npx vite`
Expected: `Local: http://localhost:5173/` (veya benzeri) — gerçek portu not al.

- [ ] **Step 6: Mutlu yolu tarayıcıda doğrula**

Tarayıcıda dev server URL'ini aç. Önce **"1. Anahtar Üret"** bölümündeki "Yeni anahtar çifti üret" butonuna tıkla (4. bölüm o anahtarı kullanıyor). Sonra 4. bölümdeki "Digest hesapla ve imzala" butonuna tıkla ve ~8 saniye bekle.

Expected — ön-doldurulmuş değerlerle **tam olarak** şunlar:
```
DOMAIN_SEPARATOR : 0x8110c08d40ffb855149f3c041e89e6071a71c5f337ca317b9c24aea9da98e6a5
digest           : 0x417663f38b52fec7f71d3fb178fed03ac2559af424c9a01b72f65f23553a4746
value geri okuma : 1000000000000000000 wei = 1.0 ETH
```
artı 3688 baytlık bir imza ve yeşil `✓ imza uzunluğu 3688 bayt (C13 beklenen)`.

İlk iki değer yukarıdakilerden **farklıysa** kod yanlıştır — beklenen değerler Foundry `cast`'ten geliyor, uydurma değil. DUR ve bildir.

- [ ] **Step 7: Hata yolunu doğrula (alan adı görünüyor mu)**

`to` alanını `0xzzz` yap, tekrar "Digest hesapla ve imzala"ya tıkla.
Expected: kırmızı `Hata: to alanı geçerli bir adres değil: 0xzzz` — mesajda **`to` kelimesi geçmeli**. Sadece `invalid address` yazıyorsa alan-adlı sarma çalışmıyor demektir.

Doğruladıktan sonra `to` alanını `0xabcdefabcdefabcdefabcdefabcdefabcdefabcd` olarak geri yaz.

- [ ] **Step 8: Dev server'ı durdur**

Ctrl+C ile durdur, portun boşaldığını doğrula: `lsof -i :5173` → çıktı yok.

- [ ] **Step 9: Commit (komutu kullanıcıya ver, ÇALIŞTIRMA)**

```bash
git add frontend/src/tx/buildTransaction.js frontend/index.html frontend/src/main.js
git commit -m "feat(frontend): işlem oluşturma ve imzalama akışını 4. bölüm olarak ekle"
```

---

## Self-Review Notu

- **Spec kapsaması:** `buildDigest`/`buildAndSign` imzaları (Task 1 Step 4, Task 2 Step 1), `SEPOLIA_CHAIN_ID` export'u (Task 1 Step 1), UI tablosu ve ön-doldurma (Task 2 Step 3), `value` wei + ETH geri okuma (Task 2 Step 4), alan-adlı hata yönetimi (Task 1 Step 4 yardımcıları, Task 2 Step 7'de doğrulanıyor), `signMs` tanımı (Task 2 Step 1 yorumu), `cast` vektörlerine karşı otomatik test (Task 1 Step 2) — spec'in "Dahil" listesindeki her madde bir adıma karşılık geliyor. "Kapsam dışı" maddelere (execute() calldata, tx gönderme, kontrat state okuma, on-chain doğrulama) hiçbir adımda dokunulmuyor.
- **Placeholder taraması:** Yok — her adımda tam kod veya tam komut var.
- **Tip/isim tutarlılığı:** `buildDigest` Task 1'de `{ domainSeparator, digest }` döndürüyor; Task 2 `buildAndSign` içinde tam olarak bu iki alanı destructure ediyor. `signDigest` mevcut `signer.js` imzasıyla (`(mnemonic, digestHex) → { signature, sigBytes }`) birebir çağrılıyor. `SEPOLIA_CHAIN_ID` Task 1'de export edilip aynı adla import ediliyor.
- **Bilinen sınır (spec'ten taşınıyor):** `nonce` serbest metin olduğu için replay koruması bu akışta gösterilmiyor; gerçek koruma nonce'un on-chain state'ten okunmasını gerektirir ve Hakan'ın deploy adresine bağlıdır. Bu kalıcı bir tasarım kararı değil.
