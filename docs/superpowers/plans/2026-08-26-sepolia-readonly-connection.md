# Sepolia Read-Only Bağlantısı Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Frontend'in Sepolia'ya `ethers.JsonRpcProvider` ile salt-okunur bağlanabildiğini, gerçek bir RPC çağrısıyla (chainId + son blok numarası) kanıtlamak.

**Architecture:** Yeni, bağımsız bir modül (`frontend/src/network/sepolia.js`) provider oluşturma ve bağlantı doğrulamayı kapsüller; mevcut `index.html`/`main.js` demo desenine (bölüm + buton + sonuç `div`'i) uygun üçüncü bir bölüm bu modülü çağırır.

**Tech Stack:** `ethers` (zaten bağımlılık), Vite (`import.meta.env` ile client env var'ları), vanilla JS/HTML (mevcut frontend hiçbir framework kullanmıyor).

## Global Constraints

- RPC URL için sessiz fallback YOK — `VITE_SEPOLIA_RPC_URL` tanımlı değilse açık hata fırlatılır (spec: "Kapsam dışı" + "Hata yönetimi").
- Yanlış ağa (chainId ≠ 11155111) bağlanma ayrı, açıklayıcı bir hatayla yakalanmalı (spec: digest formatı chainId'e bağlı).
- Otomatik birim testi yok — doğrulama Vite dev server üzerinden manuel/çalıştırılabilir (spec: "Test / doğrulama"). Bu bilinçli bir karar, eksiklik değil.
- Bu adımda tx gönderme, signer/MetaMask, kontrat adresleri YOK (spec: "Kapsam dışı").
- Spec dosyası: `docs/superpowers/specs/2026-08-26-sepolia-readonly-connection-design.md` — çelişki çıkarsa spec esas alınır.

---

### Task 1: `.gitignore` istisnası + `.env.example` şablonu

**Files:**
- Modify: `/Users/akif/pq-safe/.gitignore`
- Create: `/Users/akif/pq-safe/frontend/.env.example`

**Interfaces:**
- Consumes: yok.
- Produces: `VITE_SEPOLIA_RPC_URL` adlı env var'ın adı ve varlığı — Task 2'nin `getProvider()`'ı bu adı okuyacak.

- [ ] **Step 1: Mevcut `.gitignore`'un `.env.example`'ı yanlışlıkla ignore ettiğini doğrula**

Run: `cd /Users/akif/pq-safe && touch frontend/.env.example && git check-ignore -v frontend/.env.example`
Expected: `.gitignore:5:.env.*	frontend/.env.example` (eşleşme var, yani ignore ediliyor — bu beklenen, düzeltilecek durum)

- [ ] **Step 2: `.gitignore`'a istisna ekle**

`.gitignore` şu an:
```
node_modules/
out/
cache/
.env
.env.*
broadcast/
dist/
.DS_Store
```

`.env.*` satırından hemen sonra şu satırı ekle:
```
!frontend/.env.example
```

Dosyanın tamamı şöyle olmalı:
```
node_modules/
out/
cache/
.env
.env.*
!frontend/.env.example
broadcast/
dist/
.DS_Store
```

- [ ] **Step 3: İstisnanın çalıştığını doğrula**

Run: `git check-ignore -v frontend/.env.example`
Expected: hiçbir çıktı YOK ve exit code `1` (artık ignore edilmiyor demek). Terminalde exit code'u görmek için: `git check-ignore -v frontend/.env.example; echo "exit: $?"` → `exit: 1` beklenir.

- [ ] **Step 4: `.env.example` içeriğini yaz**

`frontend/.env.example` içeriği (tek satır, değer boş — gerçek URL kullanıcının kendi `.env`'inde):
```
VITE_SEPOLIA_RPC_URL=
```

- [ ] **Step 5: Git'in artık bu dosyayı takip edebildiğini doğrula**

Run: `git status --porcelain frontend/.env.example`
Expected: `?? frontend/.env.example` (untracked ama ignore edilmiyor — `git add` ile eklenebilir durumda)

- [ ] **Step 6: Commit**

```bash
git add .gitignore frontend/.env.example
git commit -m "chore(frontend): Sepolia RPC env var şablonu ekle (.env.example)"
```

---

### Task 2: `frontend/src/network/sepolia.js` modülü

**Files:**
- Create: `/Users/akif/pq-safe/frontend/src/network/sepolia.js`

**Interfaces:**
- Consumes: `VITE_SEPOLIA_RPC_URL` (Task 1'de tanımlanan env var adı), `ethers` paketinden `JsonRpcProvider`.
- Produces: `getProvider(): JsonRpcProvider` ve `checkSepoliaConnection(): Promise<{ chainId: bigint, blockNumber: number }>` — Task 3'ün `main.js`'i bu ikinci fonksiyonu çağıracak.

- [ ] **Step 1: Modülü yaz**

`frontend/src/network/sepolia.js`:
```js
// Sepolia RPC'sine salt-okunur bağlantı. Şimdilik sadece bağlantıyı
// doğrulamak için var (chainId + blok numarası) — tx gönderme ve kontrat
// state okuma, Hakan'ın deploy adresleri geldikten sonraki ayrı bir adım.
import { JsonRpcProvider } from 'ethers';

const SEPOLIA_CHAIN_ID = 11155111n;

export function getProvider() {
  const rpcUrl = import.meta.env.VITE_SEPOLIA_RPC_URL;
  if (!rpcUrl) {
    throw new Error(
      'VITE_SEPOLIA_RPC_URL tanımlı değil — frontend/.env dosyasına ekleyin (bkz. .env.example)',
    );
  }
  return new JsonRpcProvider(rpcUrl);
}

export async function checkSepoliaConnection() {
  const provider = getProvider();
  const network = await provider.getNetwork();
  if (network.chainId !== SEPOLIA_CHAIN_ID) {
    throw new Error(
      `Sepolia (${SEPOLIA_CHAIN_ID}) bekleniyordu, RPC chainId ${network.chainId} döndürdü — ` +
        "digest formatı chainId'e bağlı, yanlış ağda üretilen imzalar geçersiz olur.",
    );
  }
  const blockNumber = await provider.getBlockNumber();
  return { chainId: network.chainId, blockNumber };
}
```

- [ ] **Step 2: Sözdizimini doğrula (fonksiyonel test değil — `import.meta.env` sadece Vite/tarayıcı içinde çözülür, gerçek doğrulama Task 3'te dev server ile yapılacak)**

Run: `cd /Users/akif/pq-safe/frontend && node --check src/network/sepolia.js`
Expected: hiçbir çıktı yok, exit code `0` (dosya sözdizimsel olarak geçerli bir ES modülü).

- [ ] **Step 3: Commit**

```bash
git add frontend/src/network/sepolia.js
git commit -m "feat(frontend): Sepolia read-only provider + bağlantı doğrulama modülü"
```

---

### Task 3: UI entegrasyonu + uçtan uca manuel doğrulama

**Files:**
- Modify: `/Users/akif/pq-safe/frontend/index.html`
- Modify: `/Users/akif/pq-safe/frontend/src/main.js`

**Interfaces:**
- Consumes: `checkSepoliaConnection()` (Task 2).
- Produces: yok (bu, kullanıcıya bakan son adım — kapsam burada bitiyor).

- [ ] **Step 1: `index.html`'e üçüncü bölümü ekle**

`frontend/index.html`'de şu bloğu:
```html
  <section>
    <h2>2. İmzala</h2>
    <label for="digest">Digest (32 bayt, hex, 0x ile)</label>
    <input id="digest" value="0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef" />
    <button id="btn-sign" style="margin-top:10px;">İmzala</button>
    <div id="sign-out"></div>
  </section>

  <script type="module" src="/src/main.js"></script>
```

şuna değiştir:
```html
  <section>
    <h2>2. İmzala</h2>
    <label for="digest">Digest (32 bayt, hex, 0x ile)</label>
    <input id="digest" value="0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef" />
    <button id="btn-sign" style="margin-top:10px;">İmzala</button>
    <div id="sign-out"></div>
  </section>

  <section>
    <h2>3. Sepolia Bağlantısı</h2>
    <p class="warn">Salt-okunur bağlantı testi — henüz kontrat adresi yok, sadece RPC'nin çalıştığını kanıtlar.</p>
    <button id="btn-check-connection">Bağlantıyı test et</button>
    <div id="connection-out"></div>
  </section>

  <script type="module" src="/src/main.js"></script>
```

- [ ] **Step 2: `main.js`'e import ve listener ekle**

`frontend/src/main.js`'in en üstündeki import satırını:
```js
import { generateNewMnemonic, keygen, signDigest } from './crypto/signer.js';
```
şuna değiştir:
```js
import { generateNewMnemonic, keygen, signDigest } from './crypto/signer.js';
import { checkSepoliaConnection } from './network/sepolia.js';
```

Dosyanın sonuna (mevcut `btn-sign` listener'ından sonra) şunu ekle:
```js

const connectionOut = document.getElementById('connection-out');

document.getElementById('btn-check-connection').addEventListener('click', async () => {
  connectionOut.innerHTML = '<p>Bağlanılıyor…</p>';
  try {
    const { chainId, blockNumber } = await checkSepoliaConnection();
    connectionOut.innerHTML = `
      <label>Chain ID</label>
      <div class="field">${chainId}</div>
      <label>Son blok numarası</label>
      <div class="field">${blockNumber}</div>
      <p class="ok">Sepolia'ya bağlantı doğrulandı</p>
    `;
  } catch (e) {
    connectionOut.innerHTML = `<p class="err">Hata: ${e.message}</p>`;
  }
});
```

- [ ] **Step 3: Gerçek RPC URL'ini `.env`'e ekle (kullanıcı adımı — gerçek bir Infura/Alchemy/başka bir Sepolia RPC URL'i gerekiyor)**

Run: `cd /Users/akif/pq-safe/frontend && cp .env.example .env`

`.env` dosyasını aç, `VITE_SEPOLIA_RPC_URL=` satırının sonuna gerçek RPC URL'ini ekle (örn. `VITE_SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/<PROJE_ID>`).

- [ ] **Step 4: Dev server'ı başlat**

Run: `cd /Users/akif/pq-safe/frontend && npx vite`
Expected: `Local: http://localhost:5173/` (veya benzeri) çıktısı.

- [ ] **Step 5: Mutlu yolu tarayıcıda doğrula**

Tarayıcıda dev server URL'ini aç, "3. Sepolia Bağlantısı" bölümünde "Bağlantıyı test et" butonuna tıkla.
Expected: yeşil "Sepolia'ya bağlantı doğrulandı" mesajı, `Chain ID` alanında `11155111`, `Son blok numarası` alanında güncel bir Sepolia blok numarası (0'dan büyük, artan bir sayı).

- [ ] **Step 6: Hata yolunu doğrula (env var eksik senaryosu)**

Dev server'ı durdur (Ctrl+C). `.env` dosyasını geçici olarak yeniden adlandır:
Run: `cd /Users/akif/pq-safe/frontend && mv .env .env.bak`
Dev server'ı tekrar başlat: `npx vite`
Tarayıcıyı yenile, "Bağlantıyı test et" butonuna tekrar tıkla.
Expected: kırmızı hata mesajı — `Hata: VITE_SEPOLIA_RPC_URL tanımlı değil — frontend/.env dosyasına ekleyin (bkz. .env.example)`

Doğrulandıktan sonra `.env`'i geri getir: `mv .env.bak .env`

- [ ] **Step 7: Commit**

```bash
git add frontend/index.html frontend/src/main.js
git commit -m "feat(frontend): Sepolia bağlantısını index.html'de gösteren 3. bölüm"
```

---

## Self-Review Notu

- **Spec kapsaması:** `getProvider()`/`checkSepoliaConnection()` (Task 2), `.env.example` + `.gitignore` istisnası (Task 1), UI bölümü (Task 3), yanlış-ağ hatası (Task 2 Step 1 içinde), env-var-eksik hatası (Task 2 Step 1 + Task 3 Step 6'da doğrulanıyor) — spec'in "Dahil" listesindeki her madde bir task'a karşılık geliyor. "Kapsam dışı" maddelere (tx gönderme, kontrat adresleri, public RPC fallback) hiçbir task'ta dokunulmadı.
- **Placeholder taraması:** Yok — her adımda tam kod/komut var.
- **Tip/isim tutarlılığı:** `checkSepoliaConnection()` Task 2'de tanımlandığı gibi Task 3'te birebir aynı adla ve `{ chainId, blockNumber }` şekliyle kullanılıyor.
