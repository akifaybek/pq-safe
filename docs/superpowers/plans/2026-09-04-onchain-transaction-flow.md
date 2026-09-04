# Zincir Üzerinde İşlem Akışı — Implementasyon Planı

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** PQ-SAFE frontend'inin Sepolia'daki gerçek `PQWallet`'tan nonce/bakiye okuyup C13 imzalı bir `execute()` işlemini MetaMask üzerinden zincire göndermesi, üç kalkanlı koruma ve negatif kanıt ile.

**Architecture:** Mevcut `compute*` (saf) ↔ `build*` (zincir bağlamı) ayrımı korunur. Üç yeni modül eklenir: `src/config/contracts.js` (adresler), `src/contracts/pqwallet.js` (zincir okuma + saf calldata/imza yardımcıları), `src/tx/sendTransaction.js` (MetaMask). `buildTransaction.js` ve `digest.js` değişmez.

**Tech Stack:** Vite 8, ethers v6.17, Node 22 (test koşucusu), Foundry `cast` (bağımsız oracle), MetaMask (EIP-1193).

**Spec:** `docs/superpowers/specs/2026-09-04-onchain-transaction-flow-design.md`

## Global Constraints

- **Digest formatı dondurulmuş.** `digest.js` ve `buildTransaction.js` bu planda DEĞİŞTİRİLMEZ.
- **`execute()` calldata'sı yalnızca `buildDigest`'in döndürdüğü `fields`'tan kurulur.** DOM'dan yeniden okunmaz. İhlali: digest kayar, ekranda "PQWallet: invalid signature" yazar, imza sağlamken.
- **Koruma sırası sabittir: nonce kontrolü → canlı digest karşılaştırması → `eth_call` ön-uçuşu.** Bu bir teşhis sırasıdır, performans için yeniden sıralanmaz (gerekçe spec'te).
- **Gas fallback: `2000000n`.** Tahmin başarısız olursa bu kullanılır.
- **Doğrulanmamış provider sızdırılmaz.** Her zincir okuması `getSepoliaProvider()` ya da `assertSepoliaNetwork()`'ten geçer.
- **Tüm hata metinleri `esc()` ile kaçırılır.** Sayfa mnemonic'i DOM'a yazıyor.
- **Sadece Akif'in dosyaları değiştirilir:** `frontend/**`, `docs/evidence/**`, `docs/superpowers/**`. `contracts/src/PQWallet.sol`, `docs/tx-hashes.md`, `README.md` Hakan'ın — DOKUNULMAZ.
- **Claude `git commit`/`git push` ÇALIŞTIRMAZ.** Commit komutu kullanıcıya verilir, o çalıştırır.
- Deploy adresleri (Sepolia, `docs/tx-hashes.md`):
  - `PQWallet`: `0x2EafA294C14b6752128bfd4f5873D1EA39f000BB`
  - `SPHINCSVerifier`: `0x143Db127BE77FdE689629b18F9F415014C514a2E`
  - `Migration`: `0x93e2938A04AE4FbC59a5FDe59D7683667eDD5536`
  - chainId: `11155111`

## Dosya yapısı

| Dosya | Sorumluluk |
|---|---|
| `frontend/src/config/contracts.js` | **Yeni.** Deploy adresleri, chainId, Etherscan taban URL'i. Saf veri, bağımlılığı yok. |
| `frontend/src/network/sepolia.js` | **Değişir.** `assertSepoliaNetwork(provider)` dışa açılır; `getSepoliaProvider()` onu kullanır. |
| `frontend/src/contracts/pqwallet.js` | **Yeni.** Zincir okuma (`readNonce`, `readBalance`, `readDigest`) + saf yardımcılar (`encodeExecute`, `tamperSignature`, `buildNegativeProofCalldata`). |
| `frontend/src/tx/sendTransaction.js` | **Yeni.** MetaMask (`connectWallet`), ön-uçuş (`preflight`), gönderme (`sendExecute`). |
| `frontend/index.html` | **Değişir.** 4. bölüm: `tx-wallet`/`tx-nonce` girdileri kalkar, salt-okunur göstergeler ve yeni butonlar eklenir. |
| `frontend/src/main.js` | **Değişir.** 4. bölümün listener'ları; state temizleme; yeni akışlar. |
| `frontend/src/contracts/pqwallet-test.mjs` | **Yeni.** Node testi: saf yardımcılar + canlı zincir okuma. |

---

### Task 1: Config modülü ve zincir okuma

**Files:**
- Create: `frontend/src/config/contracts.js`
- Modify: `frontend/src/network/sepolia.js`
- Create: `frontend/src/contracts/pqwallet.js`
- Test: `frontend/src/contracts/pqwallet-test.mjs`

**Interfaces:**
- Consumes: `SEPOLIA_CHAIN_ID`, `getSepoliaProvider` (`src/network/sepolia.js`)
- Produces:
  - `CONTRACTS = { pqWallet: string, sphincsVerifier: string, migration: string, chainId: bigint, explorerTxBase: string, explorerAddressBase: string }`
  - `assertSepoliaNetwork(provider): Promise<void>`
  - `readNonce(provider?): Promise<bigint>`
  - `readBalance(provider?): Promise<bigint>`
  - `readDigest({ to, value, data }, provider?): Promise<string>`

- [ ] **Step 1: Config modülünü yaz**

`frontend/src/config/contracts.js`:

```js
// Sepolia'ya deploy edilmiş kontrat adresleri. Kaynak: docs/tx-hashes.md
// (Hakan, 1 Eylül 2026 — 4/4 kontrat Etherscan'de doğrulandı).
//
// Neden .env değil: bu adresler gizli değil, zincirde zaten herkese açık.
// .env'de tutulursa demo başka bir makinede çalışmaz. .env yalnızca RPC
// URL'i için kullanılıyor.
export const CONTRACTS = {
  pqWallet: '0x2EafA294C14b6752128bfd4f5873D1EA39f000BB',
  sphincsVerifier: '0x143Db127BE77FdE689629b18F9F415014C514a2E',
  migration: '0x93e2938A04AE4FbC59a5FDe59D7683667eDD5536',
  chainId: 11155111n,
  explorerTxBase: 'https://sepolia.etherscan.io/tx/',
  explorerAddressBase: 'https://sepolia.etherscan.io/address/',
};
```

- [ ] **Step 2: `sepolia.js`'e `assertSepoliaNetwork` ekle**

`frontend/src/network/sepolia.js` içinde, `getSepoliaProvider`'ın ÜSTÜNE ekle:

```js
// Bir provider'ın gerçekten Sepolia'ya baktığını doğrular. Dışa açık, çünkü
// test koşucusu (Node) kendi provider'ını enjekte ediyor — ama enjeksiyon
// chainId kontrolünü ATLAYAMAMALI. Doğrulanmamış provider sızarsa yanlış
// ağda üretilen imzalar yerelde hiçbir belirti vermeden on-chain reddedilir.
// Doğrulanan Network nesnesini DÖNDÜRÜR — çağıranın chainId için ikinci bir
// getNetwork() (yani ikinci bir RPC gidiş-dönüşü) yapmasına gerek kalmasın.
export async function assertSepoliaNetwork(provider) {
  const network = await provider.getNetwork();
  if (network.chainId !== SEPOLIA_CHAIN_ID) {
    throw new Error(
      `Sepolia (${SEPOLIA_CHAIN_ID}) bekleniyordu, RPC chainId ${network.chainId} döndürdü — ` +
        "digest formatı chainId'e bağlı, yanlış ağda üretilen imzalar geçersiz olur.",
    );
  }
  return network;
}
```

Ve `getSepoliaProvider()` içindeki mevcut kontrol bloğunu bununla değiştir:

```js
export async function getSepoliaProvider() {
  if (validated) return validated.provider;

  const provider = createUncheckedProvider();
  // DİKKAT: assertSepoliaNetwork içindeki getNetwork() bilerek RPC'ye soruyor.
  // Provider'a `staticNetwork: true` eklenirse ethers ağı sormadan
  // yapılandırılmış değeri döndürür ve kontrol hiçbir zaman başarısız
  // olamayan bir totolojiye dönüşür. Performans gerekçesiyle değiştirmeyin.
  const network = await assertSepoliaNetwork(provider);

  validated = { provider, chainId: network.chainId };
  return provider;
}
```

`checkSepoliaConnection()` değişmiyor — `validated.chainId`'i okumaya devam ediyor.

- [ ] **Step 3: Başarısız testi yaz**

`frontend/src/contracts/pqwallet-test.mjs`:

```js
// Node testi. Çalıştırma: cd frontend && node src/contracts/pqwallet-test.mjs
// Canlı Sepolia'ya bağlanır — ağ gerekir.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JsonRpcProvider } from 'ethers';
import { CONTRACTS } from '../config/contracts.js';
import { readNonce, readBalance, readDigest } from './pqwallet.js';

// frontend/.env'den RPC URL'i oku (Vite'ın import.meta.env'i Node'da yok).
const envText = readFileSync(new URL('../../.env', import.meta.url), 'utf8');
const rpcUrl = envText.match(/^VITE_SEPOLIA_RPC_URL=(.*)$/m)?.[1]?.trim();
assert.ok(rpcUrl, 'frontend/.env içinde VITE_SEPOLIA_RPC_URL olmalı');
const provider = new JsonRpcProvider(rpcUrl);

let passed = 0;
const ok = (msg) => { console.log(`✓ ${msg}`); passed++; };

console.log('=== pqwallet.js — canlı zincir okuma ===');

const nonce = await readNonce(provider);
assert.equal(typeof nonce, 'bigint', 'readNonce bigint döndürmeli');
ok(`readNonce() = ${nonce}`);

const balance = await readBalance(provider);
assert.equal(typeof balance, 'bigint', 'readBalance bigint döndürmeli');
ok(`readBalance() = ${balance} wei`);

// Kontratın kendi _computeDigest'i, mevcut on-chain nonce'u kullanır.
const digest = await readDigest(
  { to: '0x7268a7c3d52baa50486930e6ed25d29804d075b6', value: 1000000000000000n, data: '0x' },
  provider,
);
assert.match(digest, /^0x[0-9a-f]{64}$/, 'readDigest 32 baytlık hex döndürmeli');
ok(`readDigest() = ${digest}`);

console.log(`\n=== ${passed} assertion geçti ===`);
```

- [ ] **Step 4: Testi çalıştır, başarısız olduğunu gör**

Run: `cd frontend && node src/contracts/pqwallet-test.mjs`
Expected: FAIL — `Cannot find module .../contracts/pqwallet.js`

- [ ] **Step 5: `pqwallet.js`'i yaz**

`frontend/src/contracts/pqwallet.js`:

```js
// Sepolia'daki gerçek PQWallet'a karşı zincir okuma + saf calldata/imza
// yardımcıları.
//
// Neden buildTransaction.js'e eklenmedi: o modül saf ve ağdan habersiz
// kalmalı (compute*/build* ayrımı). Zincir okuma yan etkisi onu test
// edilemez hale getirirdi.
import { Contract } from 'ethers';
import { CONTRACTS } from '../config/contracts.js';
import { getSepoliaProvider, assertSepoliaNetwork } from '../network/sepolia.js';

// Yalnızca çağırdığımız üç fonksiyon. Tam ABI src/contracts/PQWallet.json'da
// duruyor; Task 2'deki test bu parçaların o ABI ile aynı calldata'yı
// ürettiğini doğruluyor.
export const PQWALLET_FRAGMENTS = [
  'function nonce() view returns (uint256)',
  'function _computeDigest(address to, uint256 value, bytes data) view returns (bytes32)',
  'function execute(address to, uint256 value, bytes data, bytes signature)',
];

// provider enjeksiyonu test içindir, ama enjekte edilen provider da
// doğrulanır — doğrulanmamış provider chainId kontrolünü atlatamaz.
async function resolveProvider(provider) {
  if (!provider) return getSepoliaProvider();
  await assertSepoliaNetwork(provider);
  return provider;
}

async function walletContract(provider) {
  return new Contract(CONTRACTS.pqWallet, PQWALLET_FRAGMENTS, await resolveProvider(provider));
}

export async function readNonce(provider) {
  return (await walletContract(provider)).nonce();
}

export async function readBalance(provider) {
  const p = await resolveProvider(provider);
  return p.getBalance(CONTRACTS.pqWallet);
}

// Kontratın kendi digest hesabı. JS tarafıyla karşılaştırmak için — Sprint
// 2'deki digest uyum testinin canlı, deploy edilmiş kontrat üzerindeki hali.
// DİKKAT: kontrat MEVCUT on-chain nonce'u kullanır (PQWallet.sol:34), yani
// karşılaştırma ancak imzalanan nonce güncelken anlamlıdır.
export async function readDigest({ to, value, data }, provider) {
  return (await walletContract(provider))._computeDigest(to, value, data);
}
```

- [ ] **Step 6: Testi çalıştır, geçtiğini gör**

Run: `cd frontend && node src/contracts/pqwallet-test.mjs`
Expected: PASS — 3 assertion, `readNonce() = 0` (Hakan henüz tx atmadıysa)

- [ ] **Step 7: Commit önerisini kullanıcıya ver**

```bash
git add frontend/src/config/contracts.js frontend/src/network/sepolia.js frontend/src/contracts/pqwallet.js frontend/src/contracts/pqwallet-test.mjs
git commit -m "feat(frontend): kontrat adresleri config'i ve PQWallet zincir okuma

readNonce/readBalance/readDigest + assertSepoliaNetwork. Enjekte edilen
provider da doğrulanıyor, chainId kontrolü atlatılamıyor."
```

---

### Task 2: Saf yardımcılar — `encodeExecute` ve `tamperSignature`

**Files:**
- Modify: `frontend/src/contracts/pqwallet.js`
- Test: `frontend/src/contracts/pqwallet-test.mjs`

**Interfaces:**
- Consumes: `PQWALLET_FRAGMENTS` (Task 1)
- Produces:
  - `encodeExecute({ to, value, data, signature }): string` — `execute()` calldata'sı (0x-önekli hex)
  - `tamperSignature(signature: string): string` — bir baytı bozulmuş **kopya**, uzunluk korunur
  - `buildNegativeProofCalldata(signed): string` — `signed = { fields: { to, value, data }, signature }` alır, bozuk imzalı calldata döndürür, **`signed`'ı asla yazmaz**

- [ ] **Step 1: Başarısız testleri yaz**

`frontend/src/contracts/pqwallet-test.mjs` dosyasının SONUNA ekle (import satırına
`encodeExecute, tamperSignature, buildNegativeProofCalldata` da ekle):

```js
console.log('\n=== saf yardımcılar ===');

const SAMPLE = {
  to: '0x7268a7c3d52baa50486930e6ed25d29804d075b6',
  value: 1000000000000000n,
  data: '0x',
  signature: '0xdeadbeef',
};

// 1) Calldata, commit'li tam ABI ile aynı mı? (fragment'lerimiz sapmasın)
const fullAbi = JSON.parse(readFileSync(new URL('./PQWallet.json', import.meta.url), 'utf8'));
const { Interface } = await import('ethers');
const fromFullAbi = new Interface(fullAbi).encodeFunctionData('execute', [
  SAMPLE.to, SAMPLE.value, SAMPLE.data, SAMPLE.signature,
]);
const mine = encodeExecute(SAMPLE);
assert.equal(mine, fromFullAbi, 'encodeExecute, commit li tam ABI ile aynı calldata üretmeli');
ok('encodeExecute == tam ABI (PQWallet.json) çıktısı');

// 2) BAĞIMSIZ oracle: Foundry cast. Yukarıdaki karşılaştırma gerçek bir
// bağımsız doğrulama DEĞİL — iki taraf da ethers kullanıyor. cast, ethers'tan
// tamamen bağımsız bir ABI kodlayıcısı.
//
// Zorunludur, atlanamaz: koşullu atlanan bir kontrol, hiç yapılmamış bir
// kontroldür ve testi sessizce yeşile boyar.
const CAST_EXPECTED = process.env.CAST_EXPECTED;
assert.ok(
  CAST_EXPECTED,
  'CAST_EXPECTED verilmedi — bu testi Step 4 te belirtilen komutla calistirin',
);
assert.equal(mine, CAST_EXPECTED, 'encodeExecute, cast calldata çıktısıyla aynı olmalı');
ok('encodeExecute == cast calldata (bağımsız oracle)');

// C13 imzası gerçekte 3688 bayt. Uzunluk kontrolünün anlamlı olması için
// test girdisi de gerçek uzunlukta.
const REAL_LEN_SIG = '0x' + 'ab'.repeat(3688);

// 3) SAKLANAN STATE KONTROLÜ — asıl olan bu.
//
// Demo günü patlayacak hata şu: negatif kanıt handler'ı
// `state.signature = tamperSignature(state.signature)` gibi bir ATAMA yaparsa,
// tamperSignature kusursuz saf olsa bile saklanan imza bozulur ve sonraki
// "Gönder" bozuk imzayı zincire yollar. Bu assertion'ın DİŞİ var, çünkü
// `state` bir nesne (mutable) — aşağıdaki boş assertion'ın aksine.
// Anlık görüntü TÜM `signed` nesnesini kapsıyor, sadece signature'ı değil.
// Sebep: fonksiyon calldata kurmak için `signed.fields`'a da erişiyor. Orada
// yapılacak yerinde bir normalizasyon `fields`'ı bozar, gerçek gönderim yolunu
// zehirler ve bu İMZA KONTROLÜNDEN KAÇAR (digest fields'tan türüyor).
//
// BigInt-güvenli replacer şart: `fields.value` bir BigInt ve düz
// JSON.stringify BigInt'te "Do not know how to serialize a BigInt" ile patlar.
const snap = (o) => JSON.stringify(o, (_, v) => (typeof v === 'bigint' ? `${v}n` : v));

const state = {
  fields: { to: SAMPLE.to, value: SAMPLE.value, data: SAMPLE.data },
  signature: REAL_LEN_SIG,
};
const before = snap(state);
const negativeCalldata = buildNegativeProofCalldata(state);
assert.equal(snap(state), before, 'negatif kanıt akışı SAKLANAN state i (signature VE fields) değiştirmemeli');
ok('buildNegativeProofCalldata saklanan state i bozmuyor (signature + fields)');
assert.notEqual(negativeCalldata, encodeExecute({ ...state.fields, signature: REAL_LEN_SIG }),
  'negatif kanıt calldata sı gerçek calldata dan farklı olmalı');
ok('negatif kanıt calldata si gercek calldata dan farkli');

// 4) Bozmanın anlamlı olduğu: farklı, AYNI UZUNLUKTA, tam olarak bir bayt.
//
// Uzunluk kritik: imza kısalırsa verifier onu "geçersiz imza" diye değil
// "bozuk girdi" diye reddedebilir. Negatif kanıtın jüriye ispatladığı şey
// "doğru biçimli ama geçersiz imza reddediliyor" olmalı — biçimsiz girdinin
// reddi çok daha zayıf bir iddiadır.
const tampered = tamperSignature(REAL_LEN_SIG);
assert.notEqual(tampered, REAL_LEN_SIG, 'tamperSignature farklı bir değer döndürmeli');
assert.equal(tampered.length, REAL_LEN_SIG.length, 'tamperSignature uzunluğu korumalı');
assert.equal((tampered.length - 2) / 2, 3688, 'bozulmuş imza da 3688 bayt olmalı');
const a = REAL_LEN_SIG.slice(2), b = tampered.slice(2);
let diffBytes = 0;
for (let i = 0; i < a.length; i += 2) if (a.slice(i, i + 2) !== b.slice(i, i + 2)) diffBytes++;
assert.equal(diffBytes, 1, 'tam olarak BİR bayt farklı olmalı');
ok('bozma anlamlı: 3688 bayt korunuyor, tam 1 bayt değişiyor');

// 5) Planın istediği orijinal assertion — KORUNUYOR, niyeti belgeliyor.
// UYARI: bu assertion tek başına ZAYIF. `signature` bir string ve JS
// string'leri immutable, yani bu kontrol tamperSignature kasten kirli
// yazılsaydı bile geçerdi — dilin garantisini sınıyor, implementasyonunkini
// değil. Gerçek güvence yukarıdaki (3) numaralı state kontrolünde.
const original = '0x' + 'ab'.repeat(64);
tamperSignature(original);
assert.equal(original, '0x' + 'ab'.repeat(64), 'tamperSignature girdiyi DEĞİŞTİRMEMELİ');
ok('tamperSignature girdi string ini değiştirmiyor (zayıf kontrol — bkz. yorum)');
```

- [ ] **Step 2: Testi çalıştır, başarısız olduğunu gör**

Run: `cd frontend && node src/contracts/pqwallet-test.mjs`
Expected: FAIL — `encodeExecute is not a function` (veya import hatası)

- [ ] **Step 3: Yardımcıları yaz**

`frontend/src/contracts/pqwallet.js` sonuna ekle (üstteki import'a `Interface` de ekle:
`import { Contract, Interface } from 'ethers';`):

```js
const IFACE = new Interface(PQWALLET_FRAGMENTS);

// execute() calldata'sı. Argümanlar HER ZAMAN buildDigest'in döndürdüğü
// `fields`'tan gelmeli — DOM'dan yeniden okunursa ikinci bir normalizasyon
// yolu doğar, digest'e giren baytlardan sessizce sapar ve zincirde
// "PQWallet: invalid signature" alırsınız (imza sağlamken).
export function encodeExecute({ to, value, data, signature }) {
  return IFACE.encodeFunctionData('execute', [to, value, data, signature]);
}

// Negatif kanıt için: imzanın bir baytını bozar.
//
// SAF: girdiyi yerinde değiştirmez, bozulmuş bir KOPYA döndürür. Aksi halde
// "bozuk imzayla dene" butonuna basan kullanıcı saklanan gerçek imzayı da
// bozar ve ardından gönderdiği tx anlaşılmaz şekilde başarısız olur.
export function tamperSignature(signature) {
  const body = signature.slice(2);
  if (body.length < 2) throw new Error('imza çok kısa, bozulamaz');
  // Ortadaki baytı çevir — baş/son baytlar bazı kodlamalarda özel anlam taşır.
  // Uzunluk KORUNUR: imza kısalırsa verifier onu "geçersiz imza" diye değil
  // "bozuk girdi" diye reddedebilir ve negatif kanıtın iddiası zayıflar.
  const i = Math.floor(body.length / 4) * 2;
  const byte = body.slice(i, i + 2);
  const flipped = (parseInt(byte, 16) ^ 0xff).toString(16).padStart(2, '0');
  return '0x' + body.slice(0, i) + flipped + body.slice(i + 2);
}

// Negatif kanıt akışının TAMAMI — bozma + calldata kurma tek yerde.
//
// Neden ayrı fonksiyon, neden `signed` nesnesini alıyor: negatif kanıt
// mantığı handler'a gömülü kalsaydı, orada yazılacak bir
// `signed.signature = tamperSignature(signed.signature)` ataması saklanan
// gerçek imzayı bozardı ve sonraki "Gönder" bozuk imzayı zincire yollardı.
// Buraya çekilince o hata otomatik testle yakalanabiliyor: `signed` bir
// NESNE, yani mutable — "state değişmedi" assertion'ının dişi var.
//
// Bu fonksiyon `signed`'ı OKUR, asla yazmaz.
export function buildNegativeProofCalldata(signed) {
  const { to, value, data } = signed.fields;
  return encodeExecute({ to, value, data, signature: tamperSignature(signed.signature) });
}
```

- [ ] **Step 4: Testi bağımsız oracle ile çalıştır, geçtiğini gör**

`cast`, ethers'tan bağımsız bir ABI kodlayıcısı — testin tek gerçek dış
doğrulaması bu. Bu yüzden `CAST_EXPECTED` olmadan test bilerek başarısız olur.

Run:
```bash
cd /Users/akif/pq-safe/contracts
EXPECTED=$(cast calldata "execute(address,uint256,bytes,bytes)" \
  0x7268a7c3d52baa50486930e6ed25d29804d075b6 1000000000000000 0x 0xdeadbeef)
cd ../frontend && CAST_EXPECTED="$EXPECTED" node src/contracts/pqwallet-test.mjs
```
Expected: PASS — içinde `✓ encodeExecute == cast calldata (bağımsız oracle)`
satırı. (Toplam assertion sayısını çıktıdan oku; plana sabit sayı yazma —
önceki turda brief "8" dedi, gerçek "7"ydi.)

- [ ] **Step 5: State assertion'ının boş olmadığını İKİ kasten bozmayla kanıtla**

Yeni yazılmış bir assertion'ın gerçekten bir şey doğruladığının tek kanıtı, onu
bir kez **başarısız görmektir**. Bu görevde iki ayrı şey iddia ediliyor
(`signature` bozulmadı, `fields` bozulmadı), dolayısıyla iki bozma gerekiyor.

**Bozma A — imza tarafı.** `buildNegativeProofCalldata`'nın İÇİNE, gerçek bir
handler'ın yapabileceği atamayı yaz:

```js
signed.signature = tamperSignature(signed.signature);   // KASTEN HATALI
```

Testi çalıştır. Beklenen: **kırmızı**, ve patlayan assertion
`negatif kanıt akışı SAKLANAN state i (signature VE fields) değiştirmemeli`
olmalı — başka bir assertion patlıyorsa hedef ispatlanmamıştır. Geri al.

**Bozma B — `fields` tarafı ve replacer'ın kendisi.** Fonksiyonun içine:

```js
signed.fields.value = signed.fields.value + 1n;   // KASTEN HATALI
```

Testi çalıştır. Beklenen: yine **kırmızı**, yine aynı assertion.

Bozma B neden şart: `snap()`'teki BigInt replacer **test edilmemiş bir kod
parçası**. Hatalıysa (ör. BigInt için `undefined` döndürüyorsa) `fields.value`
farkları anlık görüntüden tamamen düşer ve assertion sessizce yine boşalır —
kaçınmaya çalıştığımız hatanın bir kat derini. Bozma B replacer'ı da sınıyor.

Her iki bozmanın kırmızı çıktısını (patlayan assertion adı ve mesajıyla) ve
düzeltilmiş halin yeşil çıktısını rapora koy. Bozmaları geri almayı unutma.

- [ ] **Step 6: Commit önerisini kullanıcıya ver**

```bash
git add frontend/src/contracts/pqwallet.js frontend/src/contracts/pqwallet-test.mjs
git commit -m "feat(frontend): execute() calldata kodlama ve saf imza bozma yardımcısı

encodeExecute cast calldata ve commit'li ABI ile doğrulandı. tamperSignature
saf — girdiyi mutasyona uğratmadığı testle sabitlendi."
```

---

### Task 3: UI yeniden kablolama ve state temizleme

**Files:**
- Modify: `frontend/index.html:43-60`
- Modify: `frontend/src/main.js:91-136`

**Interfaces:**
- Consumes: `CONTRACTS` (Task 1), `readNonce`, `readBalance` (Task 1)
- Produces: `main.js` modül state'i `signed = { digest, signature, fields } | null`; `chainNonce: bigint | null`

- [ ] **Step 1: `index.html`'in 4. bölümünü değiştir**

`frontend/index.html` içinde `<section>` … `4. İşlem Oluştur ve İmzala` … `</section>`
bloğunun TAMAMINI şununla değiştir:

```html
  <section>
    <h2>4. İşlem Oluştur, İmzala ve Gönder</h2>
    <p class="warn">Cüzdan adresi ve nonce artık girdi değil — adres yapılandırmadan, nonce zincirden geliyor.</p>

    <label>PQWallet adresi (yapılandırmadan)</label>
    <div class="field" id="tx-wallet-display">—</div>

    <label>Zincirdeki nonce</label>
    <div class="field" id="tx-nonce-display">—</div>

    <label>Cüzdan bakiyesi</label>
    <div class="field" id="tx-balance-display">—</div>

    <button id="btn-refresh-chain">Zincirden yenile</button>

    <label for="tx-to">to (alıcı adresi)</label>
    <input id="tx-to" value="" />
    <label for="tx-value">value (wei)</label>
    <input id="tx-value" value="100000000000000" />
    <label for="tx-data">data (hex, boşsa 0x)</label>
    <input id="tx-data" value="0x" />

    <button id="btn-build-sign" style="margin-top:10px;">Digest hesapla ve imzala</button>
    <button id="btn-connect-wallet">Cüzdanı bağla</button>
    <button id="btn-send" disabled>Zincire gönder</button>
    <button id="btn-negative-proof" disabled>Bozuk imzayla dene (negatif kanıt)</button>
    <div id="tx-out"></div>
    <div id="send-out"></div>
  </section>
```

- [ ] **Step 2: `main.js`'te state ve yenileme mantığını kur**

`frontend/src/main.js` başındaki import bloğuna ekle:

```js
import { CONTRACTS } from './config/contracts.js';
import { readNonce, readBalance } from './contracts/pqwallet.js';
```

`let currentKeys = null;` satırının ALTINA ekle:

```js
// İmzalama sonucu burada saklanır. execute() calldata'sı BUNUN fields'ından
// kurulur, DOM'dan değil.
let signed = null;
// Son okunan on-chain nonce. Gönderim öncesi karşılaştırma için.
let chainNonce = null;

const walletDisplay = document.getElementById('tx-wallet-display');
const nonceDisplay = document.getElementById('tx-nonce-display');
const balanceDisplay = document.getElementById('tx-balance-display');
const sendOut = document.getElementById('send-out');
const btnSend = document.getElementById('btn-send');
const btnNegativeProof = document.getElementById('btn-negative-proof');

walletDisplay.textContent = CONTRACTS.pqWallet;

// İmzadan sonra girdileri değiştirmek, üç kalkanın da GÖREMEDİĞİ bir hata
// modu: calldata fields'tan kurulduğu için tx eski değerlere gider, ama
// ekranda yeni değerler yazar. Nonce doğru, digest karşılaştırması uyuşur
// (ikisi de eski fields'tan), ön-uçuş geçer — her şey yeşil, kullanıcı
// yanlış bilgiye bakıyor. Bu yüzden herhangi bir değişiklik imzayı düşürür.
function invalidateSignature() {
  if (!signed) return;
  signed = null;
  btnSend.disabled = true;
  btnNegativeProof.disabled = true;
  sendOut.innerHTML = '<p class="warn">Değerler değişti — imza geçersiz kılındı, yeniden imzalayın.</p>';
}

for (const id of ['tx-to', 'tx-value', 'tx-data']) {
  document.getElementById(id).addEventListener('input', invalidateSignature);
}

async function refreshChainState() {
  const btn = document.getElementById('btn-refresh-chain');
  btn.disabled = true;
  nonceDisplay.textContent = 'okunuyor…';
  balanceDisplay.textContent = 'okunuyor…';
  try {
    const [n, b] = await Promise.all([readNonce(), readBalance()]);
    chainNonce = n;
    nonceDisplay.textContent = String(n);
    balanceDisplay.textContent = `${b} wei = ${formatEther(b)} ETH`;
  } catch (e) {
    nonceDisplay.textContent = '—';
    balanceDisplay.textContent = '—';
    sendOut.innerHTML = `<p class="err">Zincir okunamadı: ${esc(e.message)}</p>`;
  } finally {
    btn.disabled = false;
  }
}

document.getElementById('btn-refresh-chain').addEventListener('click', refreshChainState);
refreshChainState();
```

- [ ] **Step 3: `btn-build-sign` listener'ını güncelle**

`main.js`'teki `btnBuildSign.addEventListener` içinde, `buildAndSign` çağrısını
şununla değiştir (walletAddress config'ten, nonce zincirden):

```js
    if (chainNonce === null) {
      throw new Error('nonce henüz okunmadı — "Zincirden yenile"ye basın');
    }
    const { domainSeparator, digest, fields, signature, sigBytes, signMs } = await buildAndSign({
      walletAddress: CONTRACTS.pqWallet,
      to: document.getElementById('tx-to').value.trim(),
      value: document.getElementById('tx-value').value.trim(),
      nonce: chainNonce,
      data: document.getElementById('tx-data').value.trim(),
      mnemonic: currentMnemonic,
    });
    signed = { digest, signature, fields, nonce: chainNonce };
    btnSend.disabled = false;
    btnNegativeProof.disabled = false;
```

Ve aynı listener'ın `catch` bloğunun başına ekle:

```js
    signed = null;
    btnSend.disabled = true;
    btnNegativeProof.disabled = true;
```

- [ ] **Step 4: Tarayıcıda doğrula**

Run: `cd frontend && npx vite`
Tarayıcıda `http://localhost:5173` aç. Beklenen:
- PQWallet adresi `0x2EafA294…` görünüyor
- Nonce ve bakiye zincirden okunup yazılıyor (nonce `0`, bakiye `0.002 ETH`)
- 1. bölümden anahtar üret, `to` alanına kendi MetaMask adresini yaz, imzala → imza çıkıyor
- `to` alanını değiştir → "Değerler değişti — imza geçersiz kılındı" uyarısı çıkıyor, Gönder butonu tekrar devre dışı

- [ ] **Step 5: Commit önerisini kullanıcıya ver**

```bash
git add frontend/index.html frontend/src/main.js
git commit -m "feat(frontend): cüzdan adresi config'ten, nonce zincirden okunuyor

tx-wallet ve tx-nonce girdileri kaldırıldı. İmzadan sonra herhangi bir girdi
değişirse imza geçersiz kılınıyor — üç kalkanın da göremediği hata modu."
```

---

### Task 3B: Owner mnemonic'ini içe aktarma (mnemonic ekrana YAZILMADAN)

**Neden gerekli:** 1. bölümdeki "Anahtar Üret" rastgele YENİ bir mnemonic
üretir. Zincirdeki `PQWallet`'ın `ownerPublicKey`'i ise 2. rotasyon anahtarıdır
(`sprint3-owner-key-rotation.md`). Rastgele anahtarla üretilen imza
`verify()`'dan `false` döner ve Task 7 "PQWallet: invalid signature" ile
başarısız olur. Uçtan uca akış, mevcut owner mnemonic'i olmadan çalışmaz.

**Neden gösterilmiyor:** Task 7'de ekran kaydı alınacak ve sayfa mevcut halinde
mnemonic'i DOM'a yazıyor (`main.js:29`). Owner mnemonic'i ekrana basılırsa
jüriye/rapora gidecek videoya düşer. Bu proje aynı sınıf hatayı 1 Eylül'de iki
kez yaptı (bkz. `sprint3-owner-key-rotation.md`).

> ### ⛔ SIZINTININ BEDELİ ARTIK ROTASYON DEĞİL
>
> 1 Eylül'deki iki ifşa bedelsizdi, çünkü kontrat henüz deploy edilmemişti.
> **Artık değil.** `PQWallet.ownerPublicKey` yalnızca constructor'da yazılıyor
> (`contracts/src/PQWallet.sol:23`) ve onu değiştirecek hiçbir fonksiyon yok —
> ABI'nın tamamı: `constructor`, `receive`, `_computeDigest`, `execute`,
> `nonce`, `ownerPublicKey`, `verifier`.
>
> Üçüncü sızıntının çaresi anahtar rotasyonu değil, **`PQWallet`'ı yeniden
> deploy etmek**: yeni adres, Hakan'ın yeniden deploy + Etherscan verify'ı,
> `docs/tx-hashes.md`'nin baştan yazılması ve
> `sprint3-live-signature-verification.md`'deki canlı doğrulama kanıtının
> geçersizleşmesi. Yarışmaya dört hafta kala ödenecek bedel değil.
>
> **Bağlayıcı kısıt — içe aktarılan owner mnemonic'i hiçbir koşulda:**
>
> 1. **DOM'a yazılmaz.** 1. bölümün ürettiği rastgele mnemonic'ten farklı
>    olarak gösterilmez. Yalnızca ondan türeyen AÇIK anahtar gösterilir.
> 2. **Girdi alanı `type="password"`** olur ve içe aktarma sonrası temizlenir.
> 3. **Hata mesajlarına ham girdi olarak sarılmaz.** Bu kod tabanının
>    "hangi alan hatalı, değeriyle söyle" deseni (`buildTransaction.js`
>    `requireAddress`/`requireUint`) burada **tersine çalışır** — mnemonic'i
>    ekrana basar. Bu alanda hata mesajı SABİTTİR, ham girdi içermez;
>    yakalanan istisnanın `message`'ı da basılmaz (WASM/bip39 hatası girdiyi
>    içerebilir).
> 4. **`console.log`/`console.error`'a düşmez.**
>
> Ekran kaydından önce tek maddelik kontrol: sayfada, hata kutularında ve
> tarayıcı console'unda mnemonic'in hiçbir parçası görünmüyor.

**Files:**
- Modify: `frontend/index.html` (1. bölüm)
- Modify: `frontend/src/main.js`

**Interfaces:**
- Consumes: `keygen` (`src/crypto/signer.js`)
- Produces: `currentMnemonic` (mevcut modül değişkeni) içe aktarılan değerle dolar

- [ ] **Step 1: `index.html`'in 1. bölümüne içe aktarma alanı ekle**

`<h2>1. Anahtar Üret</h2>` bölümünde, `btn-keygen` butonunun ALTINA ekle:

```html
    <hr />
    <label for="import-mnemonic">Mevcut mnemonic'i içe aktar (zincirdeki cüzdanın owner anahtarı)</label>
    <input id="import-mnemonic" type="password" autocomplete="off" placeholder="12 kelime — ekrana yazdırılmaz" />
    <button id="btn-import-mnemonic">İçe aktar</button>
    <p class="warn">Bu alan <code>type="password"</code>. Girilen mnemonic ekranda ve çıktıda GÖSTERİLMEZ — yalnızca türetilen açık anahtar gösterilir. Ekran kaydı sırasında güvenlidir.</p>
```

- [ ] **Step 2: `main.js`'e içe aktarma listener'ı ekle**

`main.js` sonuna ekle:

```js
// Owner mnemonic'ini içe aktarır. Mnemonic HİÇBİR yere yazdırılmaz —
// yalnızca ondan türeyen AÇIK anahtar gösterilir. Task 7'de ekran kaydı
// alınacak; mnemonic DOM'a yazılırsa videoya düşer.
document.getElementById('btn-import-mnemonic').addEventListener('click', async () => {
  const input = document.getElementById('import-mnemonic');
  const phrase = input.value.trim();
  if (!phrase) {
    keygenOut.innerHTML = '<p class="err">Mnemonic girin.</p>';
    return;
  }
  keygenOut.innerHTML = '<p>Anahtar türetiliyor…</p>';
  try {
    const keys = await keygen(phrase);
    currentMnemonic = phrase;
    currentKeys = keys;
    input.value = ''; // alanı hemen temizle
    invalidateSignature();
    keygenOut.innerHTML = `
      <p class="ok">Mnemonic içe aktarıldı (ekranda gösterilmiyor).</p>
      <label>publicKey (pkSeed‖pkRoot, 64 bayt)</label>
      <div class="field">${esc(keys.publicKey)}</div>
      <label>ECDSA adresi</label>
      <div class="field">${esc(keys.ecdsaAddress)}</div>
      <p class="warn">Bu publicKey zincirdeki <code>ownerPublicKey</code> ile aynı olmalı — değilse imzalar reddedilir.</p>
    `;
  } catch {
    currentMnemonic = null;
    currentKeys = null;
    input.value = '';
    // SABİT mesaj. `e.message` BASILMAZ: bip39/WASM hatası girdiyi içerebilir
    // ve bu alandaki girdi owner mnemonic'idir. Bu kod tabanının "hatayı
    // değeriyle söyle" deseni burada bilerek uygulanmıyor.
    keygenOut.innerHTML =
      '<p class="err">Mnemonic içe aktarılamadı — 12 kelimelik geçerli bir BIP-39 ifadesi girin. ' +
      '(Ayrıntı güvenlik gereği gösterilmiyor.)</p>';
  }
});
```

- [ ] **Step 3: Sızıntı denetimi — dört kontrol, hepsi geçmeli**

Run: `cd frontend && npx vite`

**Önce hata yolunu dene (sızıntı en çok orada olur):** alana `gecersiz mnemonic
denemesi bu bir test` yaz → "İçe aktar".
- Expected: sabit hata mesajı çıkıyor, girdiğin kelimeler **hata kutusunda
  görünmüyor**, alan boşalmış

**Sonra gerçek mnemonic'i içe aktar:** `.env.pqwallet-owner-key`'deki mnemonic'i
yapıştır → "İçe aktar".
- Alan noktalarla görünüyor, içe aktarma sonrası **boşalıyor**
- Çıktıda yalnızca publicKey ve ECDSA adresi var
- Gösterilen publicKey, `jq -r .publicKeyConcat .env.pqwallet-owner-key`
  çıktısıyla **birebir aynı** — değilse yanlış mnemonic girilmiştir

**Dört sızıntı kontrolü:**
1. Sayfada `Ctrl+F` → mnemonic'in ilk kelimesi **bulunmamalı**
2. DevTools → Elements → `Ctrl+F` ile DOM içinde ara → **bulunmamalı**
3. DevTools → Console → temiz, mnemonic parçası **yok**
4. DevTools → Network → giden istekte mnemonic **yok**

Herhangi biri başarısızsa **DUR**, ekran kaydına geçme, sızıntıyı kapat.

- [ ] **Step 4: Commit önerisini kullanıcıya ver**

```bash
git add frontend/index.html frontend/src/main.js
git commit -m "feat(frontend): owner mnemonic'ini ekrana yazdırmadan içe aktarma

Zincirdeki PQWallet'ın owner anahtarıyla imzalayabilmek için gerekli.
type=password alan, içe aktarma sonrası temizleniyor, yalnızca türetilen
açık anahtar gösteriliyor — ekran kaydında mnemonic görünmüyor."
```

---

### Task 4: MetaMask bağlantısı

**Files:**
- Create: `frontend/src/tx/sendTransaction.js`
- Modify: `frontend/src/main.js`

**Interfaces:**
- Consumes: `CONTRACTS` (Task 1)
- Produces: `connectWallet(): Promise<{ signer, address: string, chainId: bigint }>`

- [ ] **Step 1: `sendTransaction.js`'i yaz**

`frontend/src/tx/sendTransaction.js`:

```js
// MetaMask (EIP-1193) üzerinden execute() gönderme katmanı.
//
// Neden ayrı modül: buildTransaction.js saf kalmalı; cüzdan bağlama ve tx
// gönderme yan etkileri onu test edilemez hale getirir.
import { BrowserProvider } from 'ethers';
import { CONTRACTS } from '../config/contracts.js';

export async function connectWallet() {
  if (!window.ethereum) {
    throw new Error(
      'MetaMask bulunamadı — tarayıcı eklentisini kurup sayfayı yenileyin.',
    );
  }
  const browserProvider = new BrowserProvider(window.ethereum);
  await browserProvider.send('eth_requestAccounts', []);
  const network = await browserProvider.getNetwork();
  if (network.chainId !== CONTRACTS.chainId) {
    throw new Error(
      `MetaMask ${network.chainId} ağında; Sepolia (${CONTRACTS.chainId}) gerekiyor. ` +
        "Digest chainId'e bağlı olduğu için yanlış ağda gönderilen işlem geçersizdir.",
    );
  }
  const signer = await browserProvider.getSigner();
  return { signer, address: await signer.getAddress(), chainId: network.chainId };
}
```

- [ ] **Step 2: `main.js`'e bağlan listener'ı ekle**

`main.js` import bloğuna ekle:

```js
import { connectWallet } from './tx/sendTransaction.js';
```

Dosyanın sonuna ekle:

```js
let connected = null;

document.getElementById('btn-connect-wallet').addEventListener('click', async () => {
  const btn = document.getElementById('btn-connect-wallet');
  btn.disabled = true;
  sendOut.innerHTML = '<p>Cüzdan bağlanıyor…</p>';
  try {
    connected = await connectWallet();
    sendOut.innerHTML = `
      <label>Bağlı hesap (gas'ı bu öder)</label>
      <div class="field">${esc(connected.address)}</div>
      <p class="ok">MetaMask bağlandı, ağ Sepolia (${connected.chainId})</p>
    `;
  } catch (e) {
    connected = null;
    sendOut.innerHTML = `<p class="err">Hata: ${esc(e.message)}</p>`;
  } finally {
    btn.disabled = false;
  }
});
```

- [ ] **Step 3: Tarayıcıda doğrula**

Run: `cd frontend && npx vite`
- "Cüzdanı bağla"ya bas → MetaMask açılır, onayla → hesap adresi ve "Sepolia (11155111)" görünür
- MetaMask'i Ethereum Mainnet'e al, tekrar bas → chainId söyleyen net hata çıkar
- Sepolia'ya geri dön

- [ ] **Step 4: Commit önerisini kullanıcıya ver**

```bash
git add frontend/src/tx/sendTransaction.js frontend/src/main.js
git commit -m "feat(frontend): MetaMask bağlantısı ve chainId doğrulaması

Yanlış ağda gönderim engelleniyor — digest chainId'e bağlı."
```

---

### Task 5: Üç kalkanlı gönderim

**Files:**
- Modify: `frontend/src/tx/sendTransaction.js`
- Modify: `frontend/src/main.js`

**Interfaces:**
- Consumes: `encodeExecute`, `readNonce`, `readDigest` (Task 1-2), `connectWallet` (Task 4)
- Produces: `preflight({ signer, calldata }): Promise<void>`, `sendExecute({ signer, calldata }): Promise<{ hash, receipt }>`

- [ ] **Step 1: Ön-uçuş ve gönderimi `sendTransaction.js`'e ekle**

```js
import { CONTRACTS } from '../config/contracts.js';

// Gas tahmini başarısız olursa kullanılacak sabit limit.
//
// Neden 2.000.000: execute()'un izole edilmiş gerçek on-chain maliyeti
// elimizde YOK. Ölçümler tutarsız (saf verify 106.672; Foundry'de
// execute() 1.130.002 — fixture okuma maliyetiyle şişmiş). Kullanılmayan
// gas iade edildiği için yüksek tutmanın tek maliyeti peşin bloke edilen
// bakiye (~0,0022 ETH); düşük tutmanın maliyeti ölü bir demo tx'i.
// Sepolia blok limiti ~36M, 2M sorun değil.
export const GAS_FALLBACK = 2000000n;

// eth_call ön-uçuşu: gaz harcamadan aynı çağrıyı simüle eder. Nonce
// uyuşmazlığı, bozuk imza, yetersiz bakiye ve hedef çağrının patlaması —
// hepsini yakalar. Kontrattaki require string'leri okunabilir metin olarak
// geri döner ("PQWallet: invalid signature", "PQWallet: call failed").
export async function preflight({ signer, calldata }) {
  await signer.call({ to: CONTRACTS.pqWallet, data: calldata });
}

export async function sendExecute({ signer, calldata }) {
  let gasLimit;
  try {
    const estimated = await signer.estimateGas({ to: CONTRACTS.pqWallet, data: calldata });
    gasLimit = (estimated * 12n) / 10n; // %20 pay
  } catch {
    gasLimit = GAS_FALLBACK;
  }
  const tx = await signer.sendTransaction({ to: CONTRACTS.pqWallet, data: calldata, gasLimit });
  const receipt = await tx.wait();
  return { hash: tx.hash, receipt, gasLimit };
}
```

- [ ] **Step 2: `main.js`'e gönder listener'ı ekle**

`main.js` import bloğunu güncelle:

```js
import { connectWallet, preflight, sendExecute } from './tx/sendTransaction.js';
import { readNonce, readBalance, readDigest, encodeExecute } from './contracts/pqwallet.js';
```

Dosyanın sonuna ekle:

```js
btnSend.addEventListener('click', async () => {
  if (!signed) { sendOut.innerHTML = '<p class="err">Önce imzalayın.</p>'; return; }
  if (!connected) { sendOut.innerHTML = '<p class="err">Önce cüzdanı bağlayın.</p>'; return; }

  btnSend.disabled = true;
  sendOut.innerHTML = '<p>Kontroller yapılıyor…</p>';
  try {
    const { fields, signature, digest } = signed;

    // KALKAN 1 — nonce. En spesifik mesajı verir. Hakan da aynı cüzdana tx
    // atıyor, bu gerçekten olabilecek bir durum.
    const freshNonce = await readNonce();
    if (freshNonce !== signed.nonce) {
      throw new Error(
        `nonce değişti (imzalanan: ${signed.nonce}, zincirdeki: ${freshNonce}) — yeniden imzalayın`,
      );
    }

    // KALKAN 2 — canlı digest karşılaştırması. Nonce sebebi bir önceki adımda
    // elendiği için, buradaki uyuşmazlığın tek olası açıklaması `fields`
    // sapmasıdır. Sıra bu yüzden sabit (bkz. spec, "Koruma sırası").
    const onChainDigest = await readDigest({ to: fields.to, value: fields.value, data: fields.data });
    if (onChainDigest.toLowerCase() !== digest.toLowerCase()) {
      throw new Error(
        `digest uyuşmuyor — JS: ${digest}, kontrat: ${onChainDigest}. ` +
          'Nonce güncel olduğuna göre sebep `fields` sapmasıdır.',
      );
    }

    // KALKAN 3 — eth_call ön-uçuşu. En genel kalkan, gaz harcamaz.
    const calldata = encodeExecute({ ...fields, signature });
    sendOut.innerHTML = '<p>Ön-uçuş (eth_call) yapılıyor…</p>';
    await preflight({ signer: connected.signer, calldata });

    sendOut.innerHTML = '<p>MetaMask onayı bekleniyor…</p>';
    const { hash, receipt, gasLimit } = await sendExecute({ signer: connected.signer, calldata });

    const url = CONTRACTS.explorerTxBase + hash;
    sendOut.innerHTML = `
      <p class="ok">İşlem zincire gönderildi ve onaylandı.</p>
      <label>Tx hash</label>
      <div class="field">${esc(hash)}</div>
      <label>Etherscan</label>
      <div class="field"><a href="${esc(url)}" target="_blank" rel="noopener">${esc(url)}</a></div>
      <label>Kullanılan gas (ÖLÇÜLEN — spec'teki tahmin bununla değiştirilecek)</label>
      <div class="field">${receipt.gasUsed} (limit: ${gasLimit})</div>
      <label>Blok</label>
      <div class="field">${receipt.blockNumber}</div>
    `;
    signed = null;
    btnNegativeProof.disabled = true;
    await refreshChainState();
  } catch (e) {
    // Kullanıcının MetaMask'te iptal etmesi bir HATA değil — kırmızı hata
    // metni göstermek demoda gereksiz panik yaratır.
    if (e.code === 'ACTION_REJECTED') {
      sendOut.innerHTML = '<p class="warn">İşlem MetaMask\'te iptal edildi. İmza hâlâ geçerli, tekrar gönderebilirsiniz.</p>';
      btnSend.disabled = false;
      return;
    }
    // ethers, revert sebebini `reason` alanında verir; yoksa message'a düş.
    const reason = e.reason ?? e.shortMessage ?? e.message;
    sendOut.innerHTML = `<p class="err">Gönderilemedi: ${esc(reason)}</p>`;
    btnSend.disabled = false;
  }
});
```

- [ ] **Step 3: Ön-uçuşun gerçekten yakaladığını doğrula (gaz harcamadan)**

Run: `cd frontend && npx vite`
Tarayıcıda: anahtar üret → imzala → **`tx-value`'yu cüzdan bakiyesinden büyük yap**
(ör. `9000000000000000000`) → yeniden imzala → Gönder.
Expected: MetaMask AÇILMADAN hata çıkar, mesaj `PQWallet: call failed` içerir.

- [ ] **Step 4: Commit önerisini kullanıcıya ver**

```bash
git add frontend/src/tx/sendTransaction.js frontend/src/main.js
git commit -m "feat(frontend): üç kalkanlı execute() gönderimi

Nonce kontrolü, canlı digest karşılaştırması, eth_call ön-uçuşu; gas tahmini
başarısız olursa 2M fallback. Kullanılan gas sonuçta gösteriliyor."
```

---

### Task 6: Negatif kanıt

**Files:**
- Modify: `frontend/src/main.js`

**Interfaces:**
- Consumes: `buildNegativeProofCalldata` (Task 2), `preflight` (Task 5)

- [ ] **Step 1: Listener'ı ekle**

`main.js`'in `./contracts/pqwallet.js` import satırına `buildNegativeProofCalldata` ekle, sonuna şunu koy:

```js
// NEGATİF KANIT — "transfer geçti" tek başına imzanın DOĞRULANDIĞINI
// kanıtlamaz. Şüpheci bir jüri üyesi "imza gerçekten kontrol ediliyor mu,
// yoksa kod onu yok mu sayıyor?" diye sorabilir ve haklıdır. Bir baytı
// bozulmuş imzayla eth_call yapıp kontratın reddettiğini gösteriyoruz.
// Gaz harcanmaz.
btnNegativeProof.addEventListener('click', async () => {
  if (!signed) { sendOut.innerHTML = '<p class="err">Önce imzalayın.</p>'; return; }
  if (!connected) { sendOut.innerHTML = '<p class="err">Önce cüzdanı bağlayın.</p>'; return; }

  btnNegativeProof.disabled = true;
  sendOut.innerHTML = '<p>Bozuk imzayla ön-uçuş yapılıyor…</p>';
  try {
    // DİKKAT: bozma ve calldata kurma buraya AÇILMAZ. buildNegativeProofCalldata
    // `signed`'ı yalnızca okur; burada `signed.signature = tamperSignature(...)`
    // gibi bir atama yapılırsa saklanan gerçek imza bozulur ve ardından
    // "Gönder"e basan kullanıcı bozuk imzayı zincire yollar. O fonksiyonun
    // state'i bozmadığı otomatik testle sabitlenmiş durumda.
    const badCalldata = buildNegativeProofCalldata(signed);
    await preflight({ signer: connected.signer, calldata: badCalldata });
    sendOut.innerHTML =
      '<p class="err">BEKLENMEYEN: bozuk imza reddedilmedi. Bu bir güvenlik bulgusudur, araştırın.</p>';
  } catch (e) {
    const reason = e.reason ?? e.shortMessage ?? e.message;
    const rejected = String(reason).includes('PQWallet: invalid signature');
    sendOut.innerHTML = `
      <p class="${rejected ? 'ok' : 'warn'}">${rejected
        ? '✓ Kontrat bozuk imzayı reddetti — imza gerçekten doğrulanıyor.'
        : 'Reddedildi, ama beklenen mesaj değil:'}</p>
      <label>Kontratın döndürdüğü sebep</label>
      <div class="field">${esc(reason)}</div>
      <p class="warn">Gaz harcanmadı (eth_call). Saklanan gerçek imza değişmedi — "Zincire gönder" hâlâ kullanılabilir.</p>
    `;
  } finally {
    btnNegativeProof.disabled = false;
  }
});
```

- [ ] **Step 2: Tarayıcıda doğrula**

Run: `cd frontend && npx vite`
- Anahtar üret → imzala → cüzdanı bağla → "Bozuk imzayla dene"
- Expected: yeşil `✓ Kontrat bozuk imzayı reddetti` ve `PQWallet: invalid signature`
- **Ardından "Zincire gönder"e bas** → ön-uçuş geçmeli (saklanan imza bozulmadı)

- [ ] **Step 3: Commit önerisini kullanıcıya ver**

```bash
git add frontend/src/main.js
git commit -m "feat(frontend): negatif kanıt — bozuk imza kontrat tarafından reddediliyor

eth_call ile, gaz harcamadan. Saklanan imza mutasyona uğramıyor."
```

---

### Task 7: Gerçek işlem, gas ölçümü ve kanıt

**Files:**
- Modify: `docs/superpowers/specs/2026-09-04-onchain-transaction-flow-design.md` (gas tablosu)
- Create: `docs/evidence/crypto-tests/sprint3-end-to-end-transaction.md`
- Create: `docs/evidence/screenshots/sprint3-end-to-end-*.png`

**Ön koşul:** MetaMask hesabında Sepolia ETH olmalı. `to` alanı **kendi MetaMask
adresin** olsun — transfer edilen ETH geri gelir ve `PQWallet.receive()`
(`PQWallet.sol:27`) üzerinden cüzdana iade edilebilir; provalar bakiye yakmaz.

- [ ] **Step 1: Gerçek işlemi at**

Run: `cd frontend && npx vite`
Sırayla: anahtar üret → `to` = kendi MetaMask adresin → `value` = `100000000000000`
(0.0001 ETH) → imzala → cüzdanı bağla → **negatif kanıt** → **Zincire gönder**.

**Anahtar:** "Anahtar Üret" DEĞİL, Task 3B'deki **"İçe aktar"** kullanılır —
`.env.pqwallet-owner-key`'deki mnemonic ile. Rastgele üretilen anahtar
zincirdeki `ownerPublicKey` olmadığı için imza reddedilirdi. İçe aktarma
sonrası gösterilen publicKey'in `jq -r .publicKeyConcat .env.pqwallet-owner-key`
çıktısıyla aynı olduğu doğrulanır.

**Ekran kaydı öncesi kontrol:** mnemonic alanı boşaldı mı, sayfada mnemonic'in
hiçbir kelimesi görünüyor mu (`Ctrl+F`)? Kayıt başlamadan doğrula.

- [ ] **Step 2: Ekran kaydını HEMEN al**

Çalıştığı anda kaydet, sonraya bırakma. Kayıt şunları göstermeli: nonce/bakiye
zincirden okunuyor → imza üretiliyor → negatif kanıt reddediliyor → gerçek tx
gönderiliyor → Etherscan linki → bakiye düşüyor.

- [ ] **Step 3: Ölçülen gas'ı spec'e yaz**

`docs/superpowers/specs/2026-09-04-onchain-transaction-flow-design.md` içindeki
"Elimizdeki ölçümler tutarlı bir tahmin vermiyor" tablosuna gerçek satırı ekle
ve "Bugün ölçülecek" bölümünü ölçülen değerle güncelle.

- [ ] **Step 4: Kanıt notunu yaz**

`docs/evidence/crypto-tests/sprint3-end-to-end-transaction.md` — tx hash,
Etherscan linki, **ölçülen gas**, negatif kanıt çıktısı, ekran görüntüleri,
nonce'un 0→1 arttığının zincirden doğrulaması.

- [ ] **Step 5: Tx hash'ini Hakan'a gönder**

`docs/tx-hashes.md` 🔴 HAKAN'ın (`GOREV_SINIRLARI.md:83`, append-only) ve
`CLAUDE.md` kural 1 karşı tarafın dosyasına dokunmayı yasaklıyor. Hash Hakan'a
iletilir, o ekler. Bu, o dosyadaki *"Kapsam dışı: gerçek migration + transfer
denemesi"* satırını kapatır.

- [ ] **Step 6: Commit önerisini kullanıcıya ver**

```bash
git add docs/evidence/crypto-tests/sprint3-end-to-end-transaction.md docs/evidence/screenshots/ docs/superpowers/specs/2026-09-04-onchain-transaction-flow-design.md
git commit -m "docs(evidence): uçtan uca zincir işlemi — gerçek tx, ölçülen gas, negatif kanıt

Spec'teki gas tahmini ölçülen gerçek değerle değiştirildi."
```

---

## Bitiş kontrolü

- [ ] `cd frontend && node src/contracts/pqwallet-test.mjs` → tüm assertion'lar geçiyor
- [ ] `cd contracts && forge test` → 31/31 geçiyor (bu plan Solidity'ye dokunmuyor, regresyon olmamalı)
- [ ] `git status` temiz
- [ ] **Ekran kaydında mnemonic görünmüyor** — kayıt öncesi sayfada arandı, bulunamadı
- [ ] Ekran kaydı alındı
- [ ] Ölçülen gas spec'te ve kanıt notunda
- [ ] Tx hash Hakan'a iletildi
- [ ] `GOREV_SINIRLARI.md` Sprint 3 Akif satırı — ekran kaydı alındıktan SONRA kapatılabilir; kanıtsız ✅ konmaz
