# Sprint 4 — Demo Cilası, Ölçüm ve Rapor: Uygulama Planı

> **Ajan çalışanlar için:** ZORUNLU ALT BECERİ: Bu planı görev görev uygulamak
> için `superpowers:subagent-driven-development` (önerilen) veya
> `superpowers:executing-plans` kullanın. Adımlar takip için checkbox (`- [ ]`)
> sözdizimi kullanıyor.

**Hedef:** Sprint 3'te canlı kanıtlanan uçtan uca akışı jüriye gösterilebilir
hale getirmek — render yolunu tek noktaya toplamak, gas tablosunu üç alıcı
durumu için ölçmek, sınanmamış iki dalı kapatmak, kesintisiz demo videosunu
çekmek ve raporun Akif bölümlerini yazmak.

**Mimari:** Kod değişikliği tek bir yere sınırlı: `main.js`'teki 56 DOM yazma
noktası yeni bir `src/ui/render.js` modülünün üç fonksiyonuna yönlendirilir.
Geri kalan işler ölçüm, sınama ve belge — kontrat kodu, imza yolu ve gönderim
mantığı **değişmez**. Ölçümler tarayıcı içinde, geçici ve md5 ile sabitlenmiş
bir kanca üzerinden yapılır; owner mnemonic'i hiçbir komuta, hiçbir script'e
verilmez.

**Tech Stack:** Vite 8 · ethers 6.17 · bip39 · Rust/WASM C13 signer
(`sphincs_c13_signer`) · Playwright (tarayıcı oracle'ı) · Foundry `cast`
(zincir oracle'ı) · Node.js `.mjs` test dosyaları

**Spec:** `docs/superpowers/specs/2026-09-14-sprint4-scope-design.md`

---

## Global Constraints

Her görevin gereksinimleri bu bölümü örtük olarak içerir.

- **Sıra anahtarı: SENARYO A** (finalden önce rapor teslimi YOK varsayımı).
  Tarih teyit edilirse spec § 5'teki Senaryo B anahtarına geçilir; **görev
  içerikleri değişmez**, yalnızca sıra ve K2 faz 2'nin `kayıt` bayrağı değişir.
- **Claude `git commit` / `git push` ÇALIŞTIRMAZ.** Her commit adımı komutu
  metin olarak verir; Akif çalıştırır.
- **`.env.pqwallet-owner-key` açılmaz, okunmaz, hiçbir komuta verilmez.**
  Mnemonic'i tarayıcıya Akif elle girer.
- **Dokunulmaz dosyalar (Hakan'ın):** `contracts/src/PQWallet.sol`,
  `contracts/src/Migration.sol`, `contracts/test/`, `contracts/script/`,
  `README.md`, `docs/evidence/tx-hashes.md`.
- **Dondurulmuş dosyalar:** `frontend/src/crypto/digest.js`,
  `frontend/src/tx/buildTransaction.js`. Bu planda hiçbir görev bunlara yazmaz.
- **Kapsam dışı:** SAPMA 3 (negatif kanıtın salt-okunur provider'a taşınması),
  kalkan sırası, `syncSendButtons`, `sig` fotoğrafı, `sendExecute` yolu.
- **3'ten fazla dosya commit'siz biriktirilmez.**
- **Test olmadan "bitti" denmez;** kanıt `docs/evidence/crypto-tests/` altına.
- **Ölçüm yolu tekliği:** A, B, C tahminlerinin **hepsi aynı provider yolundan**
  alınır (MetaMask signer'ının provider'ı). Gerekçe Task 5'te.
- **Testler npm script'i yok**, doğrudan çalıştırılır:
  `cd frontend && node src/tx/send-transaction-test.mjs` gibi.
  Build: `cd frontend && npx vite build`.

### Zincir durumu (plan yazıldığı an)

| | |
|---|---|
| `PQWallet.nonce()` | **2** |
| `PQWallet` bakiyesi | 0,0009 ETH |
| Gas hesabı | `0xe0BF2D190f8e2F2fc97cF19244845F8FeBDB7351` (~0,0495 ETH) |
| `ownerPublicKey` | `0x5c0adf08…` (2. rotasyon) |
| Referans ölçüm (A) | **216.221** gas, tx `0x320e03d9…e50da` |
| Δ₁ | 219.104 − 216.221 = **2.883** |

---

## Dosya Yapısı

| Dosya | Sorumluluk | Durum |
|---|---|---|
| `frontend/src/ui/render.js` | **YENİ.** DOM'a yazan tek yol: `render()`, `append()`, `setText()`. Bölge kimliğini parametre alır, bölgeleri birleştirmez | Task 2 |
| `frontend/src/ui/render-test.mjs` | **YENİ.** `render.js`'in birim testleri, sahte element kayıt defteriyle (DOM gerektirmez) | Task 2 |
| `frontend/src/main.js` | 56 yazma noktası modüle yönlendirilir. **Mantık değişmez** | Task 3, 4 |
| `docs/evidence/crypto-tests/sprint4-render-refactor.md` | **YENİ.** Envanter (önce/sonra) + Playwright doğrulaması | Task 1, 3 |
| `docs/evidence/crypto-tests/sprint4-gas-table-and-second-tx.md` | **YENİ.** Faz 1/2 ölçümleri, tablo, Δ₂, karar ağacı sonucu | Task 5, 6, 7 |
| `docs/evidence/crypto-tests/sprint4-untested-branches.md` | **YENİ.** Erişilebilirlik analizi + iki dalın sonucu | Task 8, 9 |
| `docs/RAPOR.md` | **YENİ.** Rapor iskeleti + bölüm→kanıt haritası + Akif bölümleri | Task 11, 12 |

**`render.js` neden bölgeleri birleştirmiyor:** sekiz çıktı bölgesi semantik
olarak ayrı. `chain-warn`'ın `send-out`'tan ayrı olması SAPMA 3'ün kararı
(sessiz tazeleme tx kanıtını ezmesin); `main.js:752`'deki `insertAdjacentHTML`
A3'ün teşhis satırını **ekleyerek** yazıyor, ezerek değil. İkisi de kanıt
davranışı. Birleştirilen şey **yazma yolu**, bölge sayısı değil.

---

## Task 0: Ön koşullar — AKİF, ELLE, AJANSIZ (BLOKÖR)

Bu görev ajan tarafından yapılmaz. Task 5'ten önce ikisi de kapanmalı.

**Files:**
- Modify: `docs/evidence/crypto-tests/sprint4-preconditions.md` (yeni, Akif yazar)

- [ ] **Adım 1: Yedek doğrulaması** — kağıttaki mnemonic tarayıcıya elle
      girilir, `✓ Zincirdeki ownerPublicKey ile AYNI` görülür.
      Sonuç yazılır: doğrulandı / doğrulanmadı. **Doğrulanmamış yedek yedek
      değildir.** Kağıt çalışmazsa `.env.pqwallet-owner-key` hâlâ duruyor,
      iş durmaz ama sonuç notta yazılı olur.

- [ ] **Adım 2: Temiz klon testi** — tercihen ikinci makinede, ağdan taze:
```bash
git clone --recursive https://github.com/akifaybek/pq-safe.git pq-safe-clean
cd pq-safe-clean/frontend && npm i
bash scripts/build-wasm.sh
cp .env.example .env   # VITE_SEPOLIA_RPC_URL doldurulur
npx vite build
```
Beklenen: build geçer ve `npm run dev` ile açılan sayfada bir imza üretilebilir.
**Takılan her adım not edilir** — bunlar raporun kurulum bölümü olacak.

- [ ] **Adım 3: Submodule pin dayanıklılığı** — `contracts/lib/sphincs-minus`
      üçüncü taraf deponun yan dalındaki `eef1f889…` commit'ine sabitli.
      Taze klonda gerçekten çekilebildiği doğrulanır:
```bash
cd pq-safe-clean && git submodule status
```
Beklenen: `eef1f889a46c77d45dca013d321e9648fd3eaa7e` başında `-` veya `+`
**olmadan** listeleniyor.

- [ ] **Adım 4: Teslim tarihi teyidi** — yarışma şartnamesinin takvim bölümü ve
      duyurular: "rapor", "teslim", "değerlendirme". Sonuç sıra anahtarını
      belirler (A varsayılan).

---

## Task 1: Render envanteri — refactor ÖNCESİ taban

Envanter refactor'den **önce** alınır ve commit'lenir. Sonradan çıkarılan
envanter kendine referanslıdır: kaybolan nokta envantere de girmez, liste
kendini doğrular.

**Files:**
- Create: `docs/evidence/crypto-tests/sprint4-render-refactor.md`

**Interfaces:**
- Produces: `TABAN_ENVANTER` — bölge başına yazma sayısı tablosu. Task 3 bunu
  birebir karşılaştırma tabanı olarak kullanır.

- [ ] **Adım 1: Yazma noktalarını say**

```bash
cd /Users/akif/pq-safe/frontend
grep -cE "innerHTML|textContent|insertAdjacentHTML" src/main.js
```
Beklenen (plan yazıldığı an): `56`

- [ ] **Adım 2: Bölge başına dökümü çıkar**

```bash
cd /Users/akif/pq-safe/frontend
grep -oE '[A-Za-z0-9_$.]+\.(innerHTML|textContent)\s*(\+?=)' src/main.js \
  | sort | uniq -c | sort -rn
grep -n "insertAdjacentHTML" src/main.js
```
Beklenen döküm:

| Bölge | Yazma sayısı |
|---|---|
| `sendOut.innerHTML` | 16 |
| `keygenOut.innerHTML` | 8 |
| `txOut.innerHTML` | 6 |
| `chainWarn.innerHTML` | 5 |
| `walletOut.innerHTML` | 4 |
| `signOut.innerHTML` | 4 |
| `connectionOut.innerHTML` | 3 |
| `nonceDisplay.textContent` | 3 |
| `balanceDisplay.textContent` | 3 |
| `walletDisplay.textContent` | 1 |
| `sendOut.insertAdjacentHTML` (satır 752) | 1 |

- [ ] **Adım 3: Nadir dalları tetikleme yoluyla etiketle**

Her bölge için, metnin ekrana **hangi yolla** geldiği yazılır:

| Etiket | Anlamı |
|---|---|
| `DOĞAL` | Playwright ile normal kullanıcı akışından tetiklenebilir |
| `KANCA` | Yalnızca geçici test kancasıyla tetiklenebilir (ör. `receipt.status === 0`, ağ hatası sınıfları) |

Etiketlenmezse envanter "hepsi doğrulandı" izlenimi verir. `KANCA` etiketli her
nokta Task 3'te kanca ile tetiklenir ve md5 artık-sıfır kuralı uygulanır.

- [ ] **Adım 4: main.js'in taban md5'ini sabitle**

```bash
cd /Users/akif/pq-safe/frontend && md5 -q src/main.js
```
Sonuç kanıt notuna yazılır (`TABAN_MD5`).

- [ ] **Adım 5: Kanıt notunu yaz**

`docs/evidence/crypto-tests/sprint4-render-refactor.md` — bölüm 1 "Refactor
öncesi envanter": yukarıdaki üç tablo, `TABAN_MD5`, ve şu cümle:

> Bu envanter refactor'den **önce** alındı. Refactor sonrası doğrulama buna
> karşı yapılacak; sonradan çıkarılan bir envanter kaybolan noktayı da
> kaybederdi.

- [ ] **Adım 6: Commit (komut Akif'e verilir)**

```bash
git add docs/evidence/crypto-tests/sprint4-render-refactor.md
git commit -m "docs(evidence): render envanteri — refactor öncesi taban, 56 yazma noktası"
git push
```

---

## Task 2: `render.js` modülü (TDD)

**Files:**
- Create: `frontend/src/ui/render.js`
- Test: `frontend/src/ui/render-test.mjs`

**Interfaces:**
- Produces:
  - `render(el, html)` — `el.innerHTML = html`, tek yazma yolu
  - `append(el, html)` — `el.insertAdjacentHTML('beforeend', html)`
  - `setText(el, text)` — `el.textContent = text`
  - `getWriteLog()` / `resetWriteLog()` — test ve envanter doğrulaması için
    yazma kaydı (bölge kimliği + çağrı sayısı)

- [ ] **Adım 1: Başarısız testi yaz**

`frontend/src/ui/render-test.mjs`:
```javascript
import { render, append, setText, getWriteLog, resetWriteLog } from './render.js';

let fails = 0;
const ok = (cond, msg) => {
  console.log(`${cond ? '✓' : '✗'} ${msg}`);
  if (!cond) fails++;
};

// Sahte element — DOM gerekmiyor
const fakeEl = (id) => ({ id, innerHTML: '', textContent: '' });

resetWriteLog();

const a = fakeEl('send-out');
render(a, '<p>bir</p>');
ok(a.innerHTML === '<p>bir</p>', 'render innerHTML yazıyor');

render(a, '<p>iki</p>');
ok(a.innerHTML === '<p>iki</p>', 'render EZİYOR (append değil)');

const b = fakeEl('chain-warn');
setText(b, 'uyarı');
ok(b.textContent === 'uyarı', 'setText textContent yazıyor');
ok(b.innerHTML === '', 'setText innerHTML\'e DOKUNMUYOR');

// append: gerçek DOM API'si yok, sahte elemana insertAdjacentHTML eklenir
const c = { id: 'send-out', innerHTML: '<p>tx</p>',
            insertAdjacentHTML(pos, html) { this.innerHTML += html; } };
append(c, '<p>teşhis</p>');
ok(c.innerHTML === '<p>tx</p><p>teşhis</p>', 'append EKLİYOR, ezmiyor');

const log = getWriteLog();
ok(log['send-out'] === 3, `send-out 3 yazma kaydedildi (görülen: ${log['send-out']})`);
ok(log['chain-warn'] === 1, `chain-warn 1 yazma kaydedildi (görülen: ${log['chain-warn']})`);

console.log(fails === 0 ? '\nTÜM TESTLER GEÇTİ' : `\n${fails} TEST BAŞARISIZ`);
process.exit(fails === 0 ? 0 : 1);
```

- [ ] **Adım 2: Testi çalıştır, başarısız olduğunu gör**

```bash
cd /Users/akif/pq-safe/frontend && node src/ui/render-test.mjs
```
Beklenen: `ERR_MODULE_NOT_FOUND` — `src/ui/render.js` yok.

- [ ] **Adım 3: Minimal implementasyonu yaz**

`frontend/src/ui/render.js`:
```javascript
// DOM'a yazan TEK yol. Bölgeleri birleştirmez — bölge kimliği parametredir.
//
// Neden bölgeler ayrı kalıyor: #chain-warn'ın #send-out'tan ayrı olması
// SAPMA 3'ün kararı (sessiz tazeleme tx kanıtını ezmesin); teşhis satırı
// append ile yazılır (A3), ezerek değil. İkisi de kanıt davranışıdır.

const writeLog = Object.create(null);

function note(el) {
  const id = el && el.id ? el.id : '(id yok)';
  writeLog[id] = (writeLog[id] || 0) + 1;
}

export function render(el, html) {
  note(el);
  el.innerHTML = html;
}

export function append(el, html) {
  note(el);
  el.insertAdjacentHTML('beforeend', html);
}

export function setText(el, text) {
  note(el);
  el.textContent = text;
}

export function getWriteLog() {
  return { ...writeLog };
}

export function resetWriteLog() {
  for (const k of Object.keys(writeLog)) delete writeLog[k];
}
```

- [ ] **Adım 4: Testi çalıştır, geçtiğini gör**

```bash
cd /Users/akif/pq-safe/frontend && node src/ui/render-test.mjs
```
Beklenen: `TÜM TESTLER GEÇTİ`, çıkış kodu 0.

- [ ] **Adım 5: Commit (komut Akif'e verilir)**

```bash
git add frontend/src/ui/render.js frontend/src/ui/render-test.mjs
git commit -m "feat(frontend): render.js — DOM yazmanın tek yolu, 7 birim testi"
git push
```

---

## Task 3: `main.js`'i `render.js`'e geçir + envanteri doğrula

**Files:**
- Modify: `frontend/src/main.js` (56 yazma noktası)
- Modify: `docs/evidence/crypto-tests/sprint4-render-refactor.md`

**Interfaces:**
- Consumes: Task 2'nin `render()`, `append()`, `setText()`, `getWriteLog()`;
  Task 1'in `TABAN_ENVANTER` ve `TABAN_MD5`

- [ ] **Adım 1: Import ekle**

`frontend/src/main.js` başına:
```javascript
import { render, append, setText, getWriteLog } from './ui/render.js';
```

- [ ] **Adım 2: Yazma noktalarını mekanik olarak çevir**

Kural — **mantık değişmez, yalnızca yazma yolu değişir**:

| Önce | Sonra |
|---|---|
| `sendOut.innerHTML = X;` | `render(sendOut, X);` |
| `nonceDisplay.textContent = X;` | `setText(nonceDisplay, X);` |
| `sendOut.insertAdjacentHTML('beforeend', diagnosis);` | `append(sendOut, diagnosis);` |

**DEĞİŞTİRİLMEYECEKLER:** koşullar, sıra, `syncSendButtons` çağrıları, kalkan
mantığı, `sig` fotoğrafı, `sendExecute` yolu. Bir `if` bile taşınmaz.

- [ ] **Adım 3: Kalan doğrudan yazma olmadığını doğrula**

```bash
cd /Users/akif/pq-safe/frontend
grep -nE "\.(innerHTML|textContent)\s*\+?=" src/main.js
grep -n "insertAdjacentHTML" src/main.js
```
Beklenen: **her ikisi de boş** (yalnızca `render.js` içinde kalmalı).
Boş değilse geçirilmemiş nokta var — devam edilmez.

- [ ] **Adım 4: Mevcut testler + build**

```bash
cd /Users/akif/pq-safe/frontend
node src/ui/render-test.mjs
node src/tx/send-transaction-test.mjs
node src/tx/build-transaction-test.mjs
node src/contracts/pqwallet-test.mjs
npx vite build
```
Beklenen: sırasıyla `TÜM TESTLER GEÇTİ` · 75 test · 21 test · 9 test (cast
oracle dahil) · build geçer.

> **Bu adım "bitti" ölçütü DEĞİLDİR.** Bu üç paket saf fonksiyon testidir ve
> DOM çıktısına hiç assertion koymaz; yeşil kalmaları "bozmadım" demez,
> "oraya bakmıyordum" der. Ölçüt Adım 5.

- [ ] **Adım 5: Envanteri Playwright ile doğrula — ASIL ÖLÇÜT**

Task 1'in `DOĞAL` etiketli her noktası tarayıcıda tetiklenir ve metni okunur.
`KANCA` etiketli noktalar geçici kanca ile tetiklenir.

Playwright doğrulaması `getWriteLog()`'a dayanır:
```javascript
// Akış sonunda, sayfa bağlamında:
const log = await page.evaluate(() => window.__renderLog());
// Beklenen: Task 1'in TABAN_ENVANTER'indeki her bölge kimliği log'da VAR
```
Bunun için `main.js`'e **geçici** bir kanca konur:
```javascript
// GEÇİCİ — Task 3 doğrulaması, adım 7'de SİLİNECEK
window.__renderLog = getWriteLog;
```

Beklenen: `TABAN_ENVANTER`'deki **on bölgenin onu da** log'da görünür.
Görünmeyen bölge = refactor'de düşmüş render noktası.

- [ ] **Adım 6: Kanıt notunu tamamla**

`sprint4-render-refactor.md` bölüm 2 "Refactor sonrası doğrulama": hangi
bölgenin hangi yolla tetiklendiği, `DOĞAL`/`KANCA` etiketleri, Playwright
çıktısı, düşen nokta sayısı (beklenen: 0).

- [ ] **Adım 7: Kancayı sil ve artık-sıfırı md5 ile kanıtla**

```bash
cd /Users/akif/pq-safe/frontend
md5 -q src/main.js                          # kancalıyken
# kanca satırı silinir
md5 -q src/main.js                          # kancasız — kanıt notuna yazılır
grep -c "__renderLog" src/main.js           # beklenen: 0
```
Sayfa yenilenir, tarayıcı konsolunda `window.__renderLog` → `undefined`.

- [ ] **Adım 8: Commit (komut Akif'e verilir)**

```bash
git add frontend/src/main.js docs/evidence/crypto-tests/sprint4-render-refactor.md
git commit -m "refactor(frontend): 56 DOM yazma noktası render.js'e alındı — envanterle doğrulandı"
git push
```

---

## Task 4: Mnemonic'in DOM'a yazılmasının kaldırılması

**Files:**
- Modify: `frontend/src/main.js` (bölüm 1, `btn-keygen` yolu — `main.js:195`
  civarı, kanıt notlarına göre mnemonic'in DOM'a yazıldığı **tek** yer)
- Modify: `docs/evidence/crypto-tests/sprint4-render-refactor.md`

- [ ] **Adım 1: Yazılan yeri bul ve doğrula**

```bash
cd /Users/akif/pq-safe/frontend
grep -n "currentMnemonic" src/main.js
```
Mnemonic'in `render()`/`setText()` ile ekrana gittiği satır(lar) tespit edilir.
Başka hiçbir yerde DOM'a gitmediği aynı çıktıyla doğrulanır.

- [ ] **Adım 2: Başarısız testi yaz — kanarya**

Playwright: `btn-keygen`'e basılır, sonra sayfanın **tüm** metninde üretilen
mnemonic'in ilk kelimesi aranır.
Beklenen (düzeltmeden önce): **bulunur** → test KIRMIZI.

> Gerçek owner mnemonic'i **kullanılmaz**. `btn-keygen` rastgele üretir;
> aranan o rastgele değerdir.

- [ ] **Adım 3: Yazmayı kaldır**

Mnemonic ekrana basılmaz. Yerine ne yazılacağı: üretildiği bilgisi ve kelime
sayısı **değil** — yalnızca "anahtar çifti üretildi" ve türetilen **açık**
anahtar (zincirde zaten herkese açık).

- [ ] **Adım 4: Testi tekrar çalıştır**

Beklenen: mnemonic kelimesi sayfada **0 kez** → YEŞİL.
Pozitif kontrol: aynı akışta açık anahtarın ekranda **görüldüğü** doğrulanır —
yoksa test "sayfa boş olduğu için" geçmiş olur.

- [ ] **Adım 5: Mevcut testler + build**

```bash
cd /Users/akif/pq-safe/frontend
node src/tx/send-transaction-test.mjs && node src/contracts/pqwallet-test.mjs && npx vite build
```

- [ ] **Adım 6: Commit (komut Akif'e verilir)**

```bash
git add frontend/src/main.js docs/evidence/crypto-tests/sprint4-render-refactor.md
git commit -m "fix(frontend): mnemonic artık DOM'a yazılmıyor — kanarya testiyle doğrulandı"
git push
```

---

## Task 5: K2 Faz 1 — kayıtsız ölçüm (AKİF sürüyor, ajan hazırlar)

**ÖN KOŞUL: Task 0 kapanmış olmalı.**

**Files:**
- Modify: `frontend/src/main.js` (GEÇİCİ ölçüm kancası, Task 6 sonunda silinir)
- Create: `docs/evidence/crypto-tests/sprint4-gas-table-and-second-tx.md`

**Interfaces:**
- Produces: `EST_A_F1`, `EST_B`, `EST_C` (ham tahminler) · her biri için
  sıfır/sıfır-dışı bayt sayısı · `TEKRAR_A`, `TEKRAR_B`, `TEKRAR_C` (n ≥ 5
  dizileri) · `C_BOS` (üçlü boşluk kanıtı)

> **Ölçüm neden tarayıcıda:** B ve C tahminleri owner imzası gerektiriyor
> (`execute()` önce imzayı doğruluyor, geçersiz imzada tahmin hiç alınamaz) ve
> mnemonic yalnızca tarayıcıda, Akif'in elinde. Node script'i bu ölçümü
> yapamaz. Kanca yolu bu kod tabanının yerleşik deseni (`__t5`, `__t6`) ve
> md5 artık-sıfır kuralıyla birlikte gelir.

> **Ölçüm yolu tekliği — SERT KURAL:** Üç tahmin de **MetaMask signer'ının
> provider'ından** alınır, uygulamanın salt-okunur provider'ından değil.
> Gerekçe: Δ₁ signer yolundan geldi. Karışık yol, gas defterindeki 108.574
> hatasının aynısını üretir — farklı bağlamdan iki sayıyı çıkarıp "fark" demek.
> İkinci endpoint tekrarı bu kuralın **bilinçli istisnasıdır**: orada ölçülen
> şey zaten sağlayıcı bağımlılığının kendisidir.

- [ ] **Adım 1: Ölçüm kancasını ekle**

`frontend/src/main.js` sonuna. Kanca **yeni mantık yazmaz** — dondurulmuş
`buildAndSign`'ı, mevcut `encodeExecute`'u ve `sendExecute`'un tahmin satırının
**birebir aynısını** çağırır:

```javascript
// GEÇİCİ — Sprint 4 Task 5 ölçüm kancası. Task 6 adım 9'da SİLİNECEK.
// signer.estimateGas çağrısı sendTransaction.js:201 ile BİREBİR aynı:
//   await signer.estimateGas({ to: CONTRACTS.pqWallet, data: calldata })
window.__m4 = {
  async estimate(to, { value = 100000000000000n, data = '0x' } = {}) {
    const signed = await buildAndSign({
      walletAddress: CONTRACTS.pqWallet,
      nonce: chainNonce,          // nonce 2 — faz 1 boyunca sabit
      to, value, data,
      mnemonic: currentMnemonic,
    });
    const calldata = encodeExecute({ ...signed.fields, signature: signed.signature });
    const est = await connected.signer.estimateGas({
      to: CONTRACTS.pqWallet,
      data: calldata,
    });
    return { to, est, calldataBytes: (calldata.length - 2) / 2, calldata };
  },
};
```

> **Kullanılan gerçek API'ler** (hiçbiri bu plan için yazılmadı):
> - `buildAndSign({ walletAddress, nonce, to, value, data, mnemonic })` —
>   `src/tx/buildTransaction.js:105`, **dondurulmuş**, değiştirilmiyor
> - `encodeExecute({ ...fields, signature })` — `src/contracts/pqwallet.js`,
>   `main.js:639`'daki çağrının aynısı
> - `signer.estimateGas({ to: CONTRACTS.pqWallet, data: calldata })` —
>   `src/tx/sendTransaction.js:201`, `sendExecute`'un içindeki satırın birebiri
> - `CONTRACTS.pqWallet` = `0x2EafA294C14b6752128bfd4f5873D1EA39f000BB`
>
> `chainNonce` ve `currentMnemonic` `main.js`'in modül kapsamındaki mevcut
> değişkenleri; kanca onları yalnızca **okuyor**.

- [ ] **Adım 2: Kancalı md5'i sabitle**

```bash
cd /Users/akif/pq-safe/frontend && md5 -q src/main.js   # KANCALI_MD5
```

- [ ] **Adım 3: C adresinin boşluğunu kanıtla**

```bash
cast balance <C_ADRESI> --rpc-url $SEPOLIA_RPC
cast nonce   <C_ADRESI> --rpc-url $SEPOLIA_RPC
cast code    <C_ADRESI> --rpc-url $SEPOLIA_RPC
```
Beklenen: `0` · `0` · `0x`. Üçü birden sağlanmazsa **C satırı ölçülemez** —
başka bir taze adres seçilir. "Taze adres" demek ölçüm değildir.

- [ ] **Adım 4: Mnemonic'i içe aktar (AKİF, elle)**

Kağıttaki yedekten girilir → `✓ Zincirdeki ownerPublicKey ile AYNI`.
Bu aynı zamanda Task 0 Adım 1'in doğrulamasıdır; sonucu nota yazılır.

- [ ] **Adım 5: Üç imza — A, B, C, hepsi nonce 2'de**

A'nın imzası **gönderim için değil**, tekrar testi için. A'nın gerçek gönderimi
Task 6'da, sayfa yenilendikten sonra kendi imzasıyla yapılır.

- [ ] **Adım 6: Tekrar testi — üçü İÇ İÇE, her biri n ≥ 5**

Tarayıcı konsolunda:
```javascript
const out = { A: [], B: [], C: [] };
for (let i = 0; i < 5; i++) {
  out.A.push(await window.__m4.estimate(A_ADRESI));
  out.B.push(await window.__m4.estimate(B_ADRESI));
  out.C.push(await window.__m4.estimate(C_ADRESI));
}
console.log(JSON.stringify(out));
```
**İç içe olması şart:** art arda beş çağrı tek arka uca düşüp o düğümün
önbelleğini ölçebilir; sıra karıştırılınca gerçek dağılım yakalanır.

- [ ] **Adım 7: İkinci RPC endpoint'inde tekrarla**

Farklı bir public sağlayıcıya geçilip Adım 6 tekrarlanır.
İki sağlayıcı **farklı** Δ veriyorsa "ofset" EVM'in değil **node'un**
özelliğidir ve tabloya hiç giremez.

- [ ] **Adım 8: Intrinsic ayrıştırması**

Her imza için calldata baytları sayılır:
```
intrinsic = 21000 + 4×(sıfır bayt) + 16×(sıfır-dışı bayt)
yürütme   = estimateGas − intrinsic
```
Tablo dört sütunlu: **ham tahmin · sıfır/sıfır-dışı bayt · intrinsic · yürütme**.

- [ ] **Adım 9: Beklenen değerleri ÖLÇÜMDEN ÖNCE yazmış ol**

Kanıt notunda ayrı başlık altında, Adım 6'dan **önce** yazılmış olmalı:
```
Yürütme sütununda beklenen:
  B − A = +2.500     (EIP-2929 soğuk hesap erişimi: 2.600 − 100)
  C − A = +27.500    (+2.500 soğuk erişim, +25.000 boş hesap oluşturma)
Tutmazsa hipotez çürümüştür ve öyle yazılır.
```

- [ ] **Adım 10: SERT HATIRLATMA — faz 1 ile faz 2 arasında HİÇBİR tx**

Üç imza da nonce 2'ye bağlı. Araya **herhangi** bir `execute()` girerse —
test amaçlı, kazara, "bir şeyi denemek için" — üçü birden ölür ve ölçüm zinciri
ikinci bir elle mnemonic oturumuyla baştan kurulur.

- [ ] **Adım 11: Kanıt notunun faz 1 bölümünü yaz**

`sprint4-gas-table-and-second-tx.md` bölüm 1-3: boşluk kanıtı, beklenen
değerler, tekrar testi dizileri, intrinsic tablosu, iki endpoint karşılaştırması.

> **Ayrım açıkça yazılacak:** B ve C'nin tekrarları **determinizmi** ölçüyor,
> Δ'yı değil. Δ ancak gerçek receipt'in olduğu yerde hesaplanır, o da
> **yalnızca A**. Yazılmazsa "C'nin Δ'sını ölçtük" diye okunur.

**Commit YOK** — faz 2 aynı oturumda devam ediyor, kanca hâlâ yerinde.

---

## Task 6: K2 Faz 2 — kayıtlı gerçek tx (AKİF sürüyor)

**Files:**
- Modify: `frontend/src/main.js` (kanca silinir)
- Modify: `docs/evidence/crypto-tests/sprint4-gas-table-and-second-tx.md`

**Interfaces:**
- Consumes: Task 5'in `KANCALI_MD5`
- Produces: `TX2_HASH`, `GAS_USED_2`, `LIMIT_2`, `EST_A_F2`, `Δ₂`,
  `KAYIT_MD5` (dört dosyanın hash'i), `KAYIT_SHA256`

- [ ] **Adım 1: Sayfayı yenile**

Faz 1'in çıktısı ekranda birikti; temiz demo kaydı onun üstüne çekilemez.
Yenileme owner anahtarını düşürür — beklenen davranış.

- [ ] **Adım 2: Mnemonic'i tekrar içe aktar — KAYIT BAŞLAMADAN**

Sprint 3 kaydında da böyleydi. `✓ AYNI` satırı içe aktarmadan sonra ekranda
kalıyor, yani kayda yine giriyor.

- [ ] **Adım 3: Mnemonic taraması (Sprint 3 prosedürü)**

- `btn-keygen`'e **hiç basılmaz** (Task 4 sonrası zaten DOM'a yazmıyor, ama
  prosedür korunur)
- `import-mnemonic` alanı boş
- `Cmd+F` ile mnemonic'ten bir kelime → **0 sonuç**
- DevTools kapalı, başka pencere/bildirim yok

- [ ] **Adım 4: Kayıt anındaki md5'leri not et**

```bash
cd /Users/akif/pq-safe/frontend
md5 -q index.html src/main.js src/tx/sendTransaction.js src/crypto/digest.js src/tx/buildTransaction.js
```
Beş hash `KAYIT_MD5` olarak nota yazılır. (CSS ayrı dosyada değilse
`index.html` onu zaten kapsıyor.) Task 10'un kapısı bunları karşılaştıracak.

- [ ] **Adım 5: KAYIT BAŞLAT**

- [ ] **Adım 6: İmzala → negatif kanıt → gerçek A tx'i**

Sıra Sprint 3 kaydıyla aynı: `✓ AYNI` → zincir okuma → imzalama → negatif
kanıt reddi → gerçek tx → MetaMask onayı → hash/gas/blok → bakiye düşüşü.

Nonce 2→3. Δ₂ bu adımın **kendi** limitinden ve **kendi** receipt'inden çıkar:
```
EST_A_F2 = LIMIT_2 / 1,2
Δ₂       = EST_A_F2 − GAS_USED_2
```
Ek ölçüm yapılmaz.

- [ ] **Adım 7: Kaydı durdur, SHA-256'yı al**

```bash
shasum -a 256 <kayit-dosyasi>.mp4
ls -l <kayit-dosyasi>.mp4
```
Dosya **repo dışında** tutulur; kimliği SHA-256'dır.

- [ ] **Adım 8: `cast` ile bağımsız doğrulama — UI'a hiç güvenmeden**

```bash
cast nonce   <PQWALLET> --rpc-url $SEPOLIA_RPC   # beklenen: 3
cast balance <PQWALLET> --rpc-url $SEPOLIA_RPC   # beklenen: 0,0009 − 0,0001 ETH
cast receipt <TX2_HASH> --rpc-url $SEPOLIA_RPC   # status 1, gasUsed
```

- [ ] **Adım 9: Kancayı sil, artık-sıfırı kanıtla**

```bash
cd /Users/akif/pq-safe/frontend
md5 -q src/main.js                  # kancasız — KANCALI_MD5 ile FARKLI olmalı
grep -c "__m4" src/main.js          # beklenen: 0
diff <(git show HEAD:frontend/src/main.js) src/main.js   # beklenen: BOŞ
```
Son diff kritik: kanca dışında hiçbir şey değişmediğini gösterir.
Sayfa yenilenir, konsolda `window.__m4` → `undefined`.

- [ ] **Adım 10: Faz 1'in A tahmini ile faz 2'ninkini karşılaştır — ölçüm, çıkarım değil**

`EST_A_F1` ile `EST_A_F2` karşılaştırılır. Fark varsa kaynağı **hesaplanır**,
atanmaz: iki imzanın sıfır/sıfır-dışı baytları sayılır, intrinsic ikisi için
de hesaplanır.

| Bulgu | Anlamı |
|---|---|
| Baytlar aynı | İmzalayıcı deterministik. Nokta |
| Baytlar farklı, tahmin farkı = hesaplanan intrinsic farkı | İmzalayıcı hedged; açıklama kapandı |
| Baytlar farklı, fark intrinsic farkına **eşit değil** | **Açıklanamayan kalan var** — yuvarlanmaz, yazılır |

Üçüncü ihtimal baştan dışlanmaz. Bu bir **"bitti" ölçütü değildir**.

- [ ] **Adım 11: Commit (komut Akif'e verilir)**

```bash
git add frontend/src/main.js docs/evidence/crypto-tests/sprint4-gas-table-and-second-tx.md
git commit -m "docs(evidence): ikinci gerçek tx + üç alıcı durumu ölçümü, kanca artığı sıfır"
git push
```

---

## Task 7: Gas tablosu — karar ağacı ve format

**Files:**
- Modify: `docs/evidence/crypto-tests/sprint4-gas-table-and-second-tx.md`

**Interfaces:**
- Consumes: Task 5'in `TEKRAR_*` dizileri ve intrinsic tablosu; Task 6'nın `Δ₂`

- [ ] **Adım 1: Karar ağacını uygula**

```
Task 5 Adım 6-7'deki tekrarlar birebir aynı mı?
├─ HAYIR → ofset modeli YOK. B ve C "≤ üst sınır" yazılır. Kovalara BAKILMAZ.
└─ EVET  → Δ₂ = EST_A_F2 − GAS_USED_2 hesaplanır, kovalar uygulanır.
```

- [ ] **Adım 2: Kovayı belirle** (yalnızca tekrarlar aynıysa)

| `\|Δ₂ − Δ₁\|` | Format |
|---|---|
| ≲ 100 gas | Ofset sistematik. B **"ölçüm"**, C **"tahmin − ölçülmüş ofset"** + "model riski ≤ ~366 gas" dipnotu. İkinci gerçek tx YOK |
| ~100–500 gas | Ofset gevşek. B ve C **bant (±)** ile |
| > 500 gas veya işaret değişimi | Kalibrasyon yok. B ve C **"≤ üst sınır"**. C'ye gerçek tx **GEREKLİ** → Sprint 5 |

Eşikler başlangıç değeridir; deneyin sonucu eşikleri değiştirebilir.

- [ ] **Adım 3: Dört satırlık tabloyu yaz**

Sıralama **B → A → C**, dördüncü satır Hakan'ın ilk tx'i:

| Satır | Alıcı durumu | Değer | Not |
|---|---|---|---|
| **B** | soğuk + var olan | *(ölçülen)* | **MANŞET SAYI** — tipik kullanıcı işlemi |
| A | sıcak + var olan | 216.221 / *(Task 6'nın ölçümü)* | Kendine iade — **test düzeneği** |
| C | soğuk + boş | *(ölçülen)* | Taze adres fonlama — üst sınır |
| — | İLK tx, nonce 0→1 | 233.429 | Hakan, 7 Eylül. Tek seferlik `SSTORE_SET` |

**Her satırın etiketi: ALICI EOA, `data = 0x`.** Alıcı kontrat olursa maliyet
sınırsız; calldata dolu olursa intrinsic değişir.

- [ ] **Adım 4: Beklenen değerlerin tutup tutmadığını raporla**

Adım 9'da (Task 5) önceden yazılan `B − A = +2.500` ve `C − A = +27.500`
karşısına ölçülen fark konur. **Tutmazsa hipotez çürümüştür ve öyle yazılır** —
sayı yuvarlanmaz, terim uydurulmaz.

- [ ] **Adım 5: Definisyonel cümle + koşulu**

> `eth_estimateGas`, işlemin başarıyla yürütülmesine yeten bir gas limiti
> döndürür. Bu limitle gönderilen işlemin gerçek tüketimi ona eşit ya da ondan
> küçüktür.

Doğrulanmış koşul: `contracts/src/` altında `gasleft` hiç geçmiyor ve
`execute()`'un dış çağrısı düz `to.call{value: value}(data)`. **Koşul
kapsamlıdır:** alıcı EOA ve `data = 0x` iken hedefte kod koşmaz. Alıcı kontrat
olsaydı kalan gas'ın 63/64'ü iletileceği için tüketim limite bağlı hale
gelebilirdi. Bu cümle ve tablodaki "alıcı EOA, `data = 0x`" etiketi **aynı
dipnota** bağlanır.

Δ₁ > 0 olması tahminin **tam minimum olmadığını** söyler — gözlem, sebep değil.
**Sebep aramak kapsam dışı.**

- [ ] **Adım 6: Commit (komut Akif'e verilir)**

```bash
git add docs/evidence/crypto-tests/sprint4-gas-table-and-second-tx.md
git commit -m "docs(evidence): dört satırlık gas tablosu — B manşet, karar ağacı uygulandı"
git push
```

---

## Task 8: `GAS_FALLBACK` erişilebilirlik analizi — ÖNCE ANALİZ

**Files:**
- Create: `docs/evidence/crypto-tests/sprint4-untested-branches.md`

**Interfaces:**
- Produces: `FALLBACK_SONUC` ∈ {`DOĞAL`, `DENETİMLİ_AĞ`, `ÖLÜ_KOD`}

- [ ] **Adım 1: Akışı kaynaktan oku**

```bash
cd /Users/akif/pq-safe/frontend
grep -n "GAS_FALLBACK\|estimateGas\|preflight" src/tx/sendTransaction.js src/main.js
```
Soru: **ön-uçuş (`eth_call`) ile `estimateGas` arasında, tahmini patlatıp
ön-uçuşu patlatmayan bir hata sınıfı var mı?**

> **BU ADIMIN GİRDİSİ KISMEN ZATEN TOPLANDI** — plan yazılırken Task 5'in
> kancası için `sendTransaction.js` okundu ve şunlar görüldü. Analiz sıfırdan
> başlamıyor, bu üç olgunun üstüne kuruluyor:
>
> 1. `preflight` = `signer.call({ to, data })` → **`eth_call`**
>    (`sendTransaction.js:124-126`)
> 2. `GAS_FALLBACK` dalı = `signer.estimateGas(...)` etrafındaki `try/catch`
>    → **`eth_estimateGas`** (`sendTransaction.js:200-207`). İkisi **ayrı RPC
>    metodu**, aynı taşıma katmanı üzerinden
> 3. Dalın kendi yorumu amacını yazıyor: *"Public RPC bu calldata boyutunda
>    (3,9 KB) `eth_estimateGas`'ta zorlanabilir."*
>
> Yani `ÖLÜ_KOD` sonucu **olası görünmüyor** — ama bu bir ön izlenimdir, hüküm
> değildir. Analizin kapatması gereken soru hâlâ açık: taşıma katmanı ortak
> olduğu için pratikte `eth_call` de **her zaman** birlikte mi düşüyor? Cevap
> "evet"se sonuç `DENETİMLİ_AĞ`, "hayır"sa `DOĞAL`.

- [ ] **Adım 2: Üç sonuçtan birine karar ver**

| Sonuç | Gereği |
|---|---|
| `DOĞAL` | Doğrudan sınanır (Task 9), proxy'ye gerek yok |
| `DENETİMLİ_AĞ` | Task 9'da proxy yolu denenir |
| `ÖLÜ_KOD` | Sınama YOK. Kanıt notuna dalın neden var olduğu ve neden erişilemediği yazılır. **Bu bir bulgudur, başarısızlık değil** |

Analizde tartılacak olgu: `eth_call` ile `eth_estimateGas` aynı yolda olsalar
da **aynı maliyette değiller** — `estimateGas` ikili aramadır, yürütmeyi
defalarca koşar; 3,9 KB calldata + ~216k gas'lık bir yürütmede sunucu tarafı
maliyeti `eth_call`'un katları. Public sağlayıcılarda metod başına ayrı
limit/zaman aşımı kuraldır. Üstüne iki çağrı arasında zaman aralığı var.

- [ ] **Adım 3: Sonucu yaz**

`sprint4-untested-branches.md` bölüm 1: okunan kod satırları, hata sınıfı
analizi, `FALLBACK_SONUC` ve gerekçesi.

- [ ] **Adım 4: Commit (komut Akif'e verilir)**

```bash
git add docs/evidence/crypto-tests/sprint4-untested-branches.md
git commit -m "docs(evidence): GAS_FALLBACK erişilebilirlik analizi — sonuç <FALLBACK_SONUC>"
git push
```

---

## Task 9: İki dalın sınanması

**Files:**
- Modify: `docs/evidence/crypto-tests/sprint4-untested-branches.md`
- Create: `docs/evidence/screenshots/sprint4-action-rejected.png`
- Create: `docs/evidence/screenshots/sprint4-gas-fallback.png` *(yalnızca
  `FALLBACK_SONUC ≠ ÖLÜ_KOD` ise)*

**Interfaces:**
- Consumes: Task 8'in `FALLBACK_SONUC`

- [ ] **Adım 1: `ACTION_REJECTED` — gerçekten beş dakikalık iş**

Gönder'e basılır, MetaMask'te **Reddet**. Beklenen: ekranda iptal mesajı,
`signed` korunuyor, buton durumu tutarlı, zincire hiçbir şey gitmiyor.
Ekran görüntüsü alınır.

- [ ] **Adım 2: `GAS_FALLBACK` — `FALLBACK_SONUC`'a göre**

**`DOĞAL` ise:** doğal yoldan tetiklenir.

**`DENETİMLİ_AĞ` ise:** MetaMask'in Sepolia RPC adresi yerel küçük bir proxy'ye
çevrilir; proxy her metodu geçirir, **yalnızca `eth_estimateGas`'a hata döner**.
Ön-uçuş sağlıklı geçer, tahmin patlar, dal koşar.

> Bu **enjeksiyon değildir**: kodumuzun tek satırı değişmiyor, ethers'ın kendi
> yolu, gerçek handler, gerçek MetaMask. Üretilen şey gerçek bir RPC-katmanı
> hatası — dalın savunmak için var olduğu durumun ta kendisi, sadece kaynağı
> denetimli. "Kendi taklidinle sınama" kuralı **kendi kodunun** taklidini
> yasaklar, denetimli bir ağ koşulunu değil.
>
> Maliyet: 30–45 dakika, beş dakika değil.

**`ÖLÜ_KOD` ise:** sınama yapılmaz, Task 8'in bulgusu nihai.

- [ ] **Adım 3: Ekranda "tahmin başarısız, sabit limite düşüldü" notunun
      çıktığını ve limitin **350.000** olduğunu doğrula** (sınandıysa)

- [ ] **Adım 4: Mevcut testler + build**

```bash
cd /Users/akif/pq-safe/frontend
node src/tx/send-transaction-test.mjs && node src/ui/render-test.mjs && npx vite build
```

- [ ] **Adım 5: Commit (komut Akif'e verilir)**

```bash
git add docs/evidence/crypto-tests/sprint4-untested-branches.md docs/evidence/screenshots/
git commit -m "docs(evidence): ACTION_REJECTED ve GAS_FALLBACK dalları kapatıldı"
git push
```

---

## Task 10: Diff kapısı → video finali

**Files:**
- Modify: `docs/evidence/crypto-tests/sprint4-gas-table-and-second-tx.md`

**Interfaces:**
- Consumes: Task 6'nın `KAYIT_MD5` (beş dosya) ve `KAYIT_SHA256`

- [ ] **Adım 1: Kapıyı çalıştır — karar değil, kontrol**

```bash
cd /Users/akif/pq-safe/frontend
md5 -q index.html src/main.js src/tx/sendTransaction.js src/crypto/digest.js src/tx/buildTransaction.js
```
Task 6 Adım 4'teki `KAYIT_MD5` ile karşılaştırılır.

```
eşit      →  mevcut çekim FİNAL
eşit değil →  video YENİDEN ÇEKİLİR
```

`index.html`'in dahil olması şart: **kamera DOM'u görüyor, mantığı değil.**
Task 9'da bir uyarı satırı veya yeni `.class` eklendiyse mantık dosyaları hiç
değişmeden kayıt ile gönderilen UI ayrışır.

Dondurulmuş `digest.js` / `buildTransaction.js` de sette: eşit çıkmaları
dondurmanın tuttuğunun yan kanıtıdır.

- [ ] **Adım 2: Yeniden çekim gerekiyorsa**

Task 6 Adım 1-8 tekrarlanır (yeni bir gerçek tx, nonce 3→4). **Taze çekimde
`cast` doğrulaması da yapılır** — çünkü o tx artık K1'in canlı regresyon
kanıtını taşıyor.

- [ ] **Adım 3: "Bitti" ölçütü**

**Tek çekim, kesme yok**, SHA-256 kanıt notunda, taze çekim yapıldıysa `cast`
doğrulaması yapılmış. Kesme, "kesilen yerde ne oldu" itirazını davet eder ve bu
videonun değeri tam olarak sürekliliğinden geliyor (imza → negatif kanıt reddi
→ *aynı* imzayla gönderim → receipt, aralıksız).

- [ ] **Adım 4: Sprint 3 kaydı silinmez**

`sprint3-end-to-end-recording.mp4`, SHA-256
`f7be0790747634e8e2fc38ac68d28843462b932d2136d84d1722089cc22abe1b` — **yedek
olarak kalır.**

- [ ] **Adım 5: Commit (komut Akif'e verilir)**

```bash
git add docs/evidence/crypto-tests/sprint4-gas-table-and-second-tx.md
git commit -m "docs(evidence): diff kapısı sonucu — video finali"
git push
```

---

## Task 11: Rapor iskeleti + bölüm→kanıt haritası

**Files:**
- Create: `docs/RAPOR.md`

- [ ] **Adım 1: Kanıt envanterini çıkar**

```bash
ls docs/evidence/crypto-tests/
```
Beklenen: **16 not**, **10'u Sprint 3**. Devir notundaki "7 not" eksik sayımdı —
`sprint3-live-signature-verification.md`, `sprint3-owner-key-rotation.md`,
`sprint3-transaction-builder.md` listede yoktu.

- [ ] **Adım 2: İskeleti yaz — her bölümün kanıt kaynağı yazılı**

Her bölüm başlığının altına hangi kanıt notundan beslendiği yazılır. Kaynağı
olmayan bölüm yazılmaz.

- [ ] **Adım 3: Hakan'ın ham içeriğini YERLEŞTİR, redakte ETME**

`docs/RAPOR_HAM_ICERIK.md` bölümleri ilgili başlıkların altına konur.
Sprint 4'ün hedefi **iskelet + Akif bölümleri**; birleştirme ve redaksiyon
Sprint 5.

- [ ] **Adım 4: İki gas tablosunun çelişkisini işaretle — köprü HENÜZ YAZILMAZ**

| Kaynak | `PQWallet.execute` | `verify` |
|---|---|---|
| `RAPOR_HAM_ICERIK.md` Böl. 5 (Foundry) | 31.751 / 85.793 / **88.247** | 589 / 1.672 / **111.074** |
| Canlı Sepolia | **216.221** | **113.771** |

`execute` satırında **2,5 kat** fark var. Rapora `> ⚠️ UZLAŞTIRMA NOTU
BEKLİYOR — Hakan'ın cevabı` bloğu konur. **Sebep ölçülmedi, iddia
edilmeyecek.** Aday açıklamalar (Foundry'nin intrinsic'i saymaması,
`MockVerifier` kullanımı) Hakan'ın cevabı gelmeden **yazılmaz** — tahminle
köprü kurmak, gas defterinde üç kez yakalanan hata sınıfının tekrarı olur.

- [ ] **Adım 5: Commit (komut Akif'e verilir)**

```bash
git add docs/RAPOR.md
git commit -m "docs(rapor): iskelet + bölüm-kanıt haritası (16 not), uzlaştırma notu bloke"
git push
```

---

## Task 12: Raporun Akif bölümleri

**Files:**
- Modify: `docs/RAPOR.md`

- [ ] **Adım 1: Bölümleri yaz**

C13 ve neden seçildiği · verifier ve "asla revert etmez" sözleşmesi · imza yolu
(BIP-39/44 → WASM → calldata) · digest formatı ve donmuşluğu · üç kalkan ·
negatif kanıt ve **tek yol ilkesi** · gas defteri (216.221 vs 233.429, kalansız
kapanış) · Task 7'nin dört satırlık tablosu.

Kaynaklar: `docs/ARCHITECTURE.md` (§1-5) ve 16 kanıt notu.

- [ ] **Adım 2: "Sınanmamış yollar" bölümünü DÜRÜSTÇE yaz**

| Yol | Durum |
|---|---|
| `GAS_FALLBACK` | Task 8-9'un sonucu — `DOĞAL` / `DENETİMLİ_AĞ` / `ÖLÜ_KOD` |
| `ACTION_REJECTED` | Task 9'da kapatıldı |
| `receipt.status === 0`, PQWallet'ın **kendi** revert'iyle | **HÂLÂ AÇIK.** İddia `PQWallet.sol:48` **kaynak okumasına** dayanıyor, ampirik gözleme değil. Foundry'de sınanacaksa `contracts/test/` — **Hakan'ın alanı** |

Bu tablo raporda **gizlenmez**. Ampirik dayanağı olmayan tek iddia üçüncü satır
ve rapora o etiketle girer.

- [ ] **Adım 3: Stateless yan gözlemini ekle**

Üç imza üretilip ikisinin kullanılmaması bedava — C13 stateless, leaf tüketimi
yok (`GOREV_SINIRLARI.md` Bölüm 5). XMSS'te bu bir güvenlik olayı olurdu.
**Ölçüm özgürlüğümüz doğrudan şemanın stateless olmasından geliyor.**

- [ ] **Adım 4: `elements-of-style:writing-clearly-and-concisely` ile gözden geçir**

- [ ] **Adım 5: Commit (komut Akif'e verilir)**

```bash
git add docs/RAPOR.md
git commit -m "docs(rapor): Akif bölümleri — C13, verifier, imza yolu, gas defteri, sınanmamış yollar"
git push
```

---

## Hakan'a gidecek — mesaj listesi (plan bu dosyalara İŞ yazmaz)

1. **Tx hash `0x320e03d98cec857bbae8ecb49bcb0736c960287d76a19f2fad39b471b09e50da`**
   → `docs/evidence/tx-hashes.md` (🔴 HAKAN, append-only). Task 6'nın yeni tx'i
   de aynı yolla iletilir
2. **`execute()` kendi revert'inde nonce artmıyor — Foundry testi.** İddia
   `PQWallet.sol:48` kaynak okumasına dayanıyor ve **rapora giriyor** (Task 12)
3. **README gas tablosu** — Task 7'nin dört satırlık koşullu tablosu hazır
   olunca
4. **`RAPOR_HAM_ICERIK.md` Böl. 5'teki Foundry tablosu neyi ölçüyor?**
   `MockVerifier` mı, intrinsic dahil mi? **Task 11 Adım 4 bu cevap olmadan
   ilerlemiyor**
5. **`RAPOR_HAM_ICERIK.md` Böl. 4'te 233.429** koşulsuz geçiyor; artık
   **"İLK `execute()`, nonce 0→1"** koşuluyla

---

## Sprint 5'e bilerek bırakılanlar

- Raporun birleştirilmesi, redaksiyonu, görsel düzeni
- Sunum + soru-cevap listesi + en az 3 tam prova
- Farklı makinede demo (Task 0 Adım 2 kısmen karşılar)
- **Sunum için kurgulu kısa video** — kanıt olan ham ve kesintisiz olan
- **C'ye gerçek tx** — yalnızca Task 7'nin üçüncü kovası çıkarsa. Gönderimden
  **hemen önce** üçlü boşluk kontrolü tekrarlanır: faz 1'de boş olması haftaya
  boş olduğunu göstermez
- `sphincs-minus` pin dayanıklılığı (fork / vendor kararı)
