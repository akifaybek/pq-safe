# Sprint 4 — Demo Cilası, Ölçüm ve Rapor: Uygulama Planı

> **Ajan çalışanlar için — UYGULAMA BİÇİMİ. Bu karar burada verilmiştir, her
> görevde yeniden açılmaz.** Ölçüt **"kod mu belge mi" DEĞİL, ETKİ ALANI:**
>
> - **Gönderim yoluna dokunanlar** (`sendExecute`, kalkan sırası,
>   `syncSendButtons`, `sig` fotoğrafı), **kayıt penceresinden önce** →
>   `superpowers:subagent-driven-development` **+ review turu.**
>   **Gerekçe ampirik:** bu projede SDD'nin review turu **her seferinde**
>   brief'te olmayan bir hata buldu — Task 3B keygen kilidi, Task 5 ethers
>   revert'te receipt döndürmüyor, Task 6 gönderim handler'ında imza fotoğrafı
>   yok.
> - **Dar ve görünür etki alanı** (tek bölge render'ı, mnemonic'in DOM'dan
>   kalkması, test dosyası düzeltmesi) → `superpowers:executing-plans`,
>   **inline**, checkpoint'li.
>
> **Inline bir görev ~90 dakikayı aşarsa DURDURULUR ve yeniden kapsamlanır.**
> Gerekçe: 15 gün kala bir günü "biraz daha uğraşayım" ile kaybetmemek.
>
> **NOT:** Task 1'in bir saati uygulama biçiminden değil **ortam hatasından**
> gitti; o veri biçim tartışmasına girdi sağlamıyor ve bu ayrıma dayanak olarak
> kullanılmaz.
>
> Adımlar takip için checkbox (`- [ ]`) sözdizimi kullanıyor.

**Hedef:** Sprint 3'te canlı kanıtlanan uçtan uca akışı jüriye gösterilebilir
hale getirmek — ekranın kendisiyle çeliştiği iki yeri düzeltmek, gas tablosunu
üç alıcı durumu için ölçmek, sınanmamış iki dalı kapatmak, kesintisiz demo
videosunu çekmek ve raporun Akif bölümlerini yazmak.

**Mimari:** Kod değişikliği **kasıtlı olarak asgari**: `main.js`'te iki küçük
düzeltme (bayat imza bloğu + mnemonic'in DOM'a yazılması), toplam ~10 satır.
`render.js` tesisat refactor'ü **bilerek Sprint 5'e ertelendi** (Task 3–4,
gerekçesiyle) — kayıt penceresinin hemen önünde 56 yazma noktasına dokunmanın
regresyon riski, kazancının karşılığı değil. Geri kalan işler ölçüm, sınama ve
belge; kontrat kodu, imza yolu ve gönderim mantığı **değişmez**. Ölçümler
tarayıcı içinde, geçici ve md5 ile sabitlenmiş bir kanca üzerinden yapılır;
owner mnemonic'i hiçbir komuta, hiçbir script'e verilmez.

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
- **PLAN–SPEC EŞ GÜNCELLEME:** bir plan revizyonu bir spec kalemini
  değiştiriyorsa **AYNI commit spec'i de günceller.** Güncellemiyorsa commit
  mesajı **nedenini yazar.** Gerekçe: `f508296` (K1'in "ekran tutarlılığı"na
  indirilmesi + render refactor'ün Sprint 5'e ertelenmesi) plan-only kaldı ve
  spec bir sprint boyunca planla çelişti — tam olarak bu kuralın yokluğundan.
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
- **ARAÇ NOTU — receipt sorguları `cast receipt` ile YAPILMAZ.** Kullanılacak
  komut:

  ```bash
  cast rpc eth_getTransactionReceipt <hash> --rpc-url <url>
  ```

  Gerekçe (ölçüldü, ÖK-2, 17 Eylül 2026): budanmış bir receipt'te `cast receipt`
  hata vermiyor, tx'in madenlenmesini beklemeye geçip **süresiz asılıyor** — 10
  dakika sonra elle kesildi. `cast rpc` aynı durumda anında `null` döner.
  Varsayılan public endpoint receipt'leri ~8.000–10.000 blok sonra buduyor, yani
  Sprint 3/4 kanıtlarının çoğu o endpoint'te zaten budanmış durumda. Task 5 ve 6
  baştan sona `cast`'e dayandığı için bu, ölçüm ya da **kayıt** oturumunun
  ortasında sessiz bir asılma demek. Arşiv endpoint'i kullanılsa bile kural
  geçerli: `cast receipt`'in bekleme davranışı endpoint'ten bağımsız.

### Zincir durumu (plan yazıldığı an)

| | |
|---|---|
| `PQWallet.nonce()` | **2** |
| `PQWallet` bakiyesi | **0,0509 ETH** (blok 11725303, 17 Eylül 2026). 14 Eylül'de 0,0009'du; Hakan `0x7268a7c3…`'ten 0,05 ETH yatırdı (`0x5b36f902…`, blok 11724079, düz transfer, `execute()` çağırmadığı için **nonce'a dokunmadı**). **Bu bir enstantane — bakiyeden türetilen hiçbir değer buradan SABİT yazılmaz, ölçüm anında okunur.** |
| Gas hesabı | `0xe0BF2D190f8e2F2fc97cF19244845F8FeBDB7351` (~0,0495 ETH) |
| `ownerPublicKey` | `0x5c0adf08…` (2. rotasyon) |
| Referans ölçüm (A) | **216.221** gas, tx `0x320e03d9…e50da` |
| Δ₁ | 219.104 − 216.221 = **2.883** |

---

## Dosya Yapısı

| Dosya | Sorumluluk | Durum |
|---|---|---|
| `frontend/src/main.js` | İki küçük düzeltme: `invalidateSignature` + gönderim başarı yolu `txOut`'u güncelliyor; mnemonic DOM'a yazılmıyor. **~10 satır, mantık değişmez** | Task 1, 2 |
| `docs/evidence/crypto-tests/sprint4-screen-consistency.md` | **YENİ.** Ölçülen kusur, kırmızı→yeşil Playwright, kanarya testi | Task 1, 2 |
| ~~`frontend/src/ui/render.js`~~ | **ERTELENDİ → Sprint 5.** Gerekçe Task 3–4'te | — |
| `docs/evidence/crypto-tests/sprint4-gas-table-and-second-tx.md` | **YENİ.** Faz 1/2 ölçümleri, tablo, Δ₂, karar ağacı sonucu | Task 5, 6, 7 |
| `docs/evidence/chain/<txhash>.json` | **YENİ DİZİN, Akif'in alanı.** Ham `eth_getTransactionByHash` + `eth_getTransactionReceipt` tutanakları (Sprint 4'ün tx'i + geriye dönük `0x320e03d9…`). `tx-hashes.md` **Hakan'ın, dokunulmaz** | Task 6 |
| `docs/evidence/crypto-tests/sprint4-untested-branches.md` | **YENİ.** Erişilebilirlik analizi + iki dalın sonucu | Task 8, 9 |
| `docs/RAPOR.md` | **YENİ.** Rapor iskeleti + bölüm→kanıt haritası + Akif bölümleri | Task 11, 12 |

**Bölgeler neden birleştirilemez (ve refactor'ün neden cila olmadığı):** sekiz
çıktı bölgesi semantik olarak ayrı. `chain-warn`'ın `send-out`'tan ayrı olması
SAPMA 3'ün kararı (sessiz tazeleme tx kanıtını ezmesin); `main.js:752`'deki
`insertAdjacentHTML` A3'ün teşhis satırını **ekleyerek** yazıyor, ezerek değil.
İkisi de kanıt davranışı, dokunulmaz. Dolayısıyla bir `render()` modülü
**ekranda hiçbir şeyi değiştirmezdi** — tesisat işi, demo cilası değil. Sprint
4'te düzeltilen şey bölge sayısı değil, **bölgelerin birbiriyle çelişmesi**.

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
cp .env.example .env   # İKİ değişken de doldurulur (aşağıdaki kutu)
npx vite build
node src/tx/send-transaction-test.mjs   # arşiv değişkeni yoksa KIRMIZI
```

> ### `.env`'de İKİ değişken var, biri yetmiyor
>
> - `VITE_SEPOLIA_RPC_URL` — uygulamanın normal yolu (publicnode yeter)
> - **`VITE_SEPOLIA_ARCHIVE_RPC_URL`** — `send-transaction-test.mjs`'in canlı
>   Sepolia oracle'ı, K2'nin ikinci-endpoint tekrarı ve `docs/evidence/` tx
>   kanıtlarının yeniden doğrulanması.
>
> **Arşiv endpoint'i konmadan paket KIRMIZI yanar** — mesaj eksik değişkenin
> adını yazar, zaman aşımına düşmez (0,14 sn'de). Public endpoint Sepolia
> receipt'lerini ~30 saat sonra buduyor; yalnızca public URL'yle kanıt tx'leri
> doğrulanamaz.

**"Bitti" ölçütü — JÜRİ SIFIR KAYITLA ÇALIŞTIRABİLİR:**

> **Taze klonda `cp .env.example .env` sonrası, HİÇBİR EL DÜZENLEMESİ OLMADAN
> test paketi yeşil.**

`.env.example`'daki iki değer de **birebir yazılı ve anahtarsızdır**
(publicnode + tenderly) — API anahtarı, kayıt, ücretli plan gerekmiyor.
**Doğrulandı 15 Eylül 2026:** `.env.example` olduğu gibi `.env`'ye kopyalandı ve
`83 · 21 · 9` + `vite build` yeşil geldi.

Bu ÖK-2'nin en değerli çıktısıdır: jürinin kurulum sürtünmesi sıfır. **Bu ölçüt
korunmalı** — `.env.example`'a placeholder (`VITE_...=`) geri konursa sessizce
kaybolur ve kimse fark etmez.
Sayfayı açmak için (imza üretimini elle görmek üzere):

```bash
npx vite        # NOT: `npm run dev` YOK — package.json'da hiç script tanımlı değil
```

Beklenen: build geçer ve `npx vite` ile açılan sayfada bir imza üretilebilir.
**Takılan her adım not edilir** — bunlar raporun kurulum bölümü olacak.

> **Bu adımdaki her satır çalışan bir komut olmalı** — taze klon testinin
> anlamı bu. 15 Eylül 2026'da altı satırın altısı tek tek denetlendi:
>
> | Satır | Durum |
> |---|---|
> | `git clone --recursive …/pq-safe.git` | ✅ `origin` URL'si birebir bu |
> | `npm i` | ✅ |
> | `bash scripts/build-wasm.sh` | ✅ dosya var (`frontend/scripts/build-wasm.sh`), cwd `frontend` iken yol doğru |
> | `cp .env.example .env` | ✅ dosya var, iki değer de birebir yazılı |
> | `npx vite build` | ✅ |
> | ~~`npm run dev`~~ → `npx vite` | 🔴 **DÜZELTİLDİ** — `package.json`'da `scripts` alanı **hiç yok** (`scripts: null`), `npm run dev` "Missing script: dev" ile patlıyordu |
>
> Belge kendi içinde çelişiyordu: Global Constraints zaten *"Testler npm
> script'i yok, doğrudan çalıştırılır"* diyor, ama Task 0 `npm run dev`
> çağırıyordu. Taze klonda jüri bu satıra **ilk dakikada** çarpardı.
>
> Submodule'ler de teyit edildi: `contracts/lib/forge-std` ve
> `contracts/lib/sphincs-minus` — Adım 3'ün beklediği ikisi de `.gitmodules`'te.

> **[D1] Bu adım İKİ TARAFI birden kapsar, biri değil:**
>
> 1. **Kurulum çalışıyor mu** — klon, `npm i`, WASM build, `.env`, `vite build`.
> 2. **Kanıt yeniden doğrulanabiliyor mu** — `docs/evidence/`'daki tx hash'leri
>    temiz klonun `.env`'iyle gerçekten okunabiliyor mu.
>
> **İkincisi ARŞİV ERİŞİMİ OLAN bir endpoint gerektiriyor.** Ölçüldü: mevcut
> public sağlayıcı receipt geçmişini ~8.000–10.000 blok sonra buduyor, yani
> `0x320e03d9…`'un receipt'i o endpoint'te `null` dönüyor. Jüri tekrar üretmeye
> kalkarsa **tam olarak bu duvara çarpar.**
>
> **Bu şart nota açıkça yazılır:** hangi endpoint kullanıldı, arşiv mi değil mi,
> hangi kanıtlar okunabildi. `.env.example`'ın arşiv endpoint'i gerektirdiği
> not düşülür. (Repoya yazılan ham JSON tutanakları — Task 6 Adım 9 — bu
> duvarı **azaltır, kaldırmaz**: tutanak kendi kendini doğrulamaz.)

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

## Task 1: Ekran tutarlılığı — bayat imza bloğu

**Ölçülmüş kusur.** `main.js`'te `innerHTML = ''` yalnızca **3 kez** geçiyor,
üçü de `chainWarn` (satır 147, 601, 824). Diğer yedi çıktı bölgesi
(`sendOut`, `txOut`, `signOut`, `keygenOut`, `walletOut`, `connectionOut` ve
göstergeler) **hiç temizlenmiyor** — yalnızca kendi handler'ları yazınca
değişiyorlar.

Sonucu ekranda görünür bir çelişki:

- `invalidateSignature()` (`main.js:124-129`) `signed = null` yapıyor ve
  `sendOut`'a *"imza geçersiz kılındı"* yazıyor — ama **`txOut`'a dokunmuyor.**
  `txOut` imza bloğunu tutuyor (`main.js:351`, `:376`) ve orada duruyor.
- Aynısı başarılı gönderimde: `txOut`'a yazan tüm satırlar 272–376 arasında,
  yani build-sign handler'ının içinde. Gönderim handler'ı (813+) `txOut`'a
  **hiç** dokunmuyor.

Yani aynı karede `txOut` "imza üretildi, 3688 bayt" derken `sendOut`
"gönderildi" ya da "imza geçersiz kılındı" diyor. **Ekran kendi kendisiyle
çelişiyor** ve bu kare kayda giriyor.

Bu, Task 6'nın "bayat yeşil sonuç" ve Task 3'ün "ekranda yeni `to`, calldata'da
eski `to`" hatalarıyla aynı aile: durum ile ekranın ayrışması.

**Files:**
- Modify: `frontend/src/main.js` (`invalidateSignature` + gönderim başarı yolu)
- Create: `docs/evidence/crypto-tests/sprint4-screen-consistency.md`

**Interfaces:**
- Consumes: mevcut `invalidateSignature()`, `syncSendButtons()`, `txOut`
- Produces: yok (iç düzeltme)

- [ ] **Adım 1: Kusuru Playwright ile KIRMIZI olarak göster**

Önce hata kanıtlanır, sonra düzeltilir. İki senaryo, ikisi de rastgele
anahtarla (owner mnemonic'i **kullanılmaz**):

```javascript
// Senaryo A — imza düşürme
// keygen → alanları doldur → imzala → txOut'ta imza bloğu var
// sonra `to` alanını değiştir → invalidateSignature koşar
const txOutText  = await page.locator('#tx-out').innerText();
const sendOutText = await page.locator('#send-out').innerText();
// BUGÜNKÜ DAVRANIŞ (beklenen KIRMIZI):
//   sendOutText  "imza geçersiz kılındı" içeriyor
//   txOutText    HÂLÂ imza bloğunu içeriyor  ← çelişki
```

Beklenen: assertion **KIRMIZI** — `txOut` bayat imza bloğunu gösteriyor.

- [ ] **Adım 2: Testi çalıştır, kırmızı olduğunu gör**

Playwright çalıştırılır. Beklenen: `txOut` metni imza bloğunu içeriyor →
assertion başarısız. **Kırmızı görülmeden düzeltmeye geçilmez** — yoksa
düzeltmenin bir şeyi düzelttiği kanıtlanmamış olur.

- [ ] **Adım 3: Minimal düzeltme**

`invalidateSignature()` (`main.js:124`):
```javascript
function invalidateSignature() {
  if (!signed) return;
  signed = null;
  syncSendButtons();
  txOut.innerHTML = '<p class="warn">İmza geçersiz kılındı — yeniden imzalayın.</p>';
  sendOut.innerHTML = '<p class="warn">Değerler değişti — imza geçersiz kılındı, yeniden imzalayın.</p>';
}
```

Gönderim başarı yolunda, `signed = null` yapılan yerin **hemen yanına**:
```javascript
txOut.innerHTML = '<p>İmza bu işlemde kullanıldı — yeni işlem için yeniden imzalayın.</p>';
```

**DEĞİŞTİRİLMEYECEKLER:** `syncSendButtons`'ın kendisi, kalkan sırası, `sig`
fotoğrafı, `sendExecute` yolu, `sendOut`'un mevcut metinleri. Yalnızca `txOut`
güncelleniyor.

> **Neden `sendOut` temizlenmiyor:** başarılı gönderimden sonra `sendOut`'ta
> tx hash'i, Etherscan linki ve ölçülen gas duruyor — **kanıtın kendisi.**
> Onu temizlemek SAPMA 3'ün ve A3'ün korumaya çalıştığı şeyi yok ederdi.
> Düzeltilen, kanıtı taşımayan bayat bölge.

- [ ] **Adım 4: Testi tekrar çalıştır — YEŞİL**

Beklenen: her iki senaryoda `txOut` artık bayat imza bloğunu göstermiyor.

**Pozitif kontrol (assertion boş değil):** aynı akışta, imza **geçerliyken**
`txOut`'un imza bloğunu **gösterdiği** doğrulanır. Yoksa test "`txOut` hep boş
olduğu için" geçmiş olur.

- [ ] **Adım 5: Mevcut testler + build**

```bash
cd /Users/akif/pq-safe/contracts
EXPECTED=$(cast calldata "execute(address,uint256,bytes,bytes)" \
  0x7268a7c3d52baa50486930e6ed25d29804d075b6 1000000000000000 0x 0xdeadbeef)
cd ../frontend
node src/tx/send-transaction-test.mjs
node src/tx/build-transaction-test.mjs
CAST_EXPECTED="$EXPECTED" node src/contracts/pqwallet-test.mjs
npx vite build
```
Beklenen: **83 · 21 · 9** (cast oracle dahil) · build geçer. Console: yalnızca
favicon 404. **Ölçüldü 15 Eylül 2026.**

> **`pqwallet-test.mjs` `CAST_EXPECTED` OLMADAN BİLEREK BAŞARISIZ OLUR.** `cast`
> bu paketin ethers'tan bağımsız tek oracle'ı; koşullu atlanan kontrol
> yapılmamış kontroldür. Komut yukarıdaki gibi verilir
> (`docs/superpowers/plans/2026-09-04-onchain-transaction-flow.md` Step 4).

> ### 75 → 83 — fark nereden geldi (ölçüldü, atanmadı)
>
> - **+8 yeni assertion**, D5 ve arşiv çalışmasında eklendi: arşiv değişkeninin
>   varlığı · iki RECEIPT okunabilirlik kontrolü · `wait()` asılmadı kontrolü ·
>   kırmızı-mesaj sınıflandırıcısının dört öz-testi.
> - **Eski 75'in 30'u asılma yüzünden KOŞAMIYORDU** (12'si canlı oracle'ın
>   `wait()` sonrası, 18'i `classifyNegativeProofError` bölümü). Bunlar yeni
>   değil; paket 15 Eylül'de 45'te asıldığı için o gün hiç çalışmamışlardı.
>   Arşiv endpoint'iyle yeniden koşuyorlar.
>
> `75 + 8 = 83` — aritmetik kapanıyor, yani eski 75'in hiçbiri kaybolmadı.

- [ ] **Adım 6: Kanıt notunu yaz**

`sprint4-screen-consistency.md`: ölçülen kusur (3 temizlik / 7 bölge sayımı,
satır numaralarıyla), kırmızı ekran görüntüsü, düzeltme, yeşil ekran görüntüsü,
pozitif kontrol.

- [ ] **Adım 7: Commit (komut Akif'e verilir)**

```bash
git add frontend/src/main.js docs/evidence/crypto-tests/sprint4-screen-consistency.md
git commit -m "fix(frontend): bayat imza bloğu — txOut, imza düşünce ve gönderim sonrası güncelleniyor"
git push
```

---

## Task 2: Mnemonic'in DOM'a yazılmasının kaldırılması

**Files:**
- Modify: `frontend/src/main.js` (bölüm 1, `btn-keygen` yolu — `main.js:195`
  civarı, kanıt notlarına göre mnemonic'in DOM'a yazıldığı **tek** yer)
- Modify: `docs/evidence/crypto-tests/sprint4-screen-consistency.md`

- [ ] **Adım 1: Yazılan yeri bul ve tekliğini doğrula**

```bash
cd /Users/akif/pq-safe/frontend
grep -n "currentMnemonic" src/main.js
```
Mnemonic'in DOM'a gittiği satır(lar) tespit edilir ve başka hiçbir yerde
gitmediği **aynı çıktıyla** doğrulanır.

- [ ] **Adım 2: Kanarya testini yaz — KIRMIZI olmalı**

Playwright: `btn-keygen`'e basılır, sonra sayfanın **tüm** metninde üretilen
mnemonic'in ilk kelimesi aranır.

Beklenen (düzeltmeden önce): **bulunur** → KIRMIZI.

> Gerçek owner mnemonic'i **kullanılmaz.** `btn-keygen` rastgele üretir;
> aranan o rastgele değerdir. `.env.pqwallet-owner-key` açılmaz.

- [ ] **Adım 3: Testi çalıştır, kırmızı olduğunu gör**

- [ ] **Adım 4: Yazmayı kaldır**

Mnemonic ekrana basılmaz. Yerine yazılacak olan: "anahtar çifti üretildi" ve
türetilen **açık** anahtar (zincirde zaten herkese açık). Kelime sayısı, nokta
maskesi, kısaltma — hiçbiri yazılmaz.

- [ ] **Adım 5: Testi tekrar çalıştır — YEŞİL**

Beklenen: mnemonic kelimesi sayfada **0 kez**.

**Pozitif kontrol:** aynı akışta açık anahtarın ekranda **görüldüğü**
doğrulanır — yoksa test "sayfa boş olduğu için" geçmiş olur.

- [ ] **Adım 6: Mevcut testler + build**

```bash
cd /Users/akif/pq-safe/contracts
EXPECTED=$(cast calldata "execute(address,uint256,bytes,bytes)" \
  0x7268a7c3d52baa50486930e6ed25d29804d075b6 1000000000000000 0x 0xdeadbeef)
cd ../frontend
node src/tx/send-transaction-test.mjs
node src/tx/build-transaction-test.mjs
CAST_EXPECTED="$EXPECTED" node src/contracts/pqwallet-test.mjs
npx vite build
```
Beklenen: **83 · 21 · 9** · build geçer. Console: yalnızca favicon 404.
(`CAST_EXPECTED` olmadan `pqwallet-test.mjs` bilerek başarısız olur — Task 1
Adım 5'teki kutu.)

- [ ] **Adım 7: Commit (komut Akif'e verilir)**

```bash
git add frontend/src/main.js docs/evidence/crypto-tests/sprint4-screen-consistency.md
git commit -m "fix(frontend): mnemonic artık DOM'a yazılmıyor — kanarya testiyle doğrulandı"
git push
```

---

## Task 3–4: `render.js` tesisatı ve envanter — **ERTELENDİ → Sprint 5**

**Bu görevler Sprint 4'te YAPILMAZ.** Silinmiyorlar; kararın gerekçesi burada
duruyor ki sonraki okuyan aynı yola baştan girmesin (SAPMA 3'ün `main.js`'e
yazılmış gerekçesiyle aynı refleks).

**Ne olacaktı:** `src/ui/render.js` modülü (`render` / `append` / `setText` +
`getWriteLog`), `main.js`'teki **56** DOM yazma noktasının bu modüle
yönlendirilmesi, ve refactor öncesi/sonrası envanter doğrulaması.

**Neden ertelendi:**

1. **Bölgeler birleşmiyor, birleşemez.** Sekiz çıktı bölgesi semantik olarak
   ayrı: `chainWarn`'ın `sendOut`'tan ayrı olması SAPMA 3'ün kararı (sessiz
   tazeleme tx kanıtını ezmesin), `main.js:752`'deki `insertAdjacentHTML`
   A3'ün teşhis satırını **ekleyerek** yazıyor. İkisi de kanıt davranışı.
   Dolayısıyla refactor **ekranda hiçbir şeyi değiştirmiyor** — tesisat işi,
   cila değil.
2. **Tek dışsal kazanç "bundan sonraki değişiklikler test edilebilir olur."**
   Finale 16 gün var ve bundan sonraki değişiklik sayısı az.
3. **Envanter doğrulaması kendi kendini gerekçelendiriyordu:** refactor
   yapılmazsa doğrulanacak refactor da yok.
4. **Kayıt penceresi hemen önde.** 56 yazma noktasına dokunmanın regresyon
   riski, (2)'deki kazancın karşılığı değil. Task 10'un diff kapısı da bu
   değişiklikten tetiklenip yeniden çekim istetirdi.

**Sprint 5'te yapılırsa uyulacak kural** (şimdiden yazılı, çünkü asıl tuzak
burada):

> `getWriteLog()` **yazma çağrısının yapıldığını** kanıtlar, metnin DOM'a doğru
> düştüğünü **değil.** Tek oracle olarak bırakılırsa kendi kaydınla kendini
> sınamak olur. Doğrulama iki satır olmalı:
> - **Envanter kapsamı:** log'dan, **%100** — hiçbir bölge düşmemiş
> - **Metin doğruluğu:** DOM'dan, **örneklem** — nadir dalların metni
>   Playwright ile okunarak
>
> Ayrıca her render noktası `DOĞAL` (Playwright ile normal akıştan
> tetiklenebilir) / `KANCA` (yalnızca geçici test kancasıyla) diye
> etiketlenmeli; etiketlenmezse envanter "hepsi doğrulandı" izlenimi verir.
> `KANCA` kullanılan yerlerde md5 artık-sıfır kuralı işler.

## Task 5: K2 Faz 1 — kayıtsız ölçüm (AKİF sürüyor, ajan hazırlar)

**ÖN KOŞUL: Task 0 kapanmış olmalı.**

**Files:**
- Modify: `frontend/src/main.js` (GEÇİCİ ölçüm kancası, Task 6 sonunda silinir)
- Create: `docs/evidence/crypto-tests/sprint4-gas-table-and-second-tx.md`

**Interfaces:**
- Produces: `EST_A_F1`, `EST_B`, `EST_C` (ham tahminler) · her biri için
  sıfır/sıfır-dışı bayt sayısı · `TEKRAR_A`, `TEKRAR_B`, `TEKRAR_C` (n ≥ 5
  dizileri) · `C_BOS` (üçlü boşluk kanıtı) · **üç çağrının `from`'u**

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

- [ ] **Adım 0: NONCE KAPISI — mnemonic içe aktarmadan ÖNCE**

```bash
cast nonce <PQWALLET> --rpc-url $SEPOLIA_RPC   # beklenen: 2
```

**2 değilse DUR.** İmza atılmaz, mnemonic girilmez, Akif'e bildirilir. Yeni
nonce'a göre plan güncellenir, sonra devam edilir.

> **Neden ayrı bir adım:** plan C adresine şüpheci davranıyor — *"faz 1'de boş
> olması haftaya boş olduğunu göstermez"* deyip üçlü boşluk kontrolünü
> gönderimden hemen önce **tekrarlatıyor**. Aynı şüphe cüzdanın **kendi
> nonce'una** uygulanmamıştı: Task 5 ve 6 boyunca nonce 2 varsayılıyor ve
> **üç imzanın üçü de ona bağlı**.
>
> Bugün 2 olması, elle oturum gününde 2 olacağını göstermez — C adresi için
> yazılmış cümlenin birebir aynısı. Araya giren herhangi bir `execute()`
> (test, kaza, "bir şeyi denemek için") nonce'u 3 yapar.
>
> **Sonradan fark edilirse bedeli:** üç imza birden çöp ve ölçüm zinciri
> **ikinci bir elle mnemonic oturumuyla** baştan kurulur — spec'in "kıt kaynak"
> dediği şeyin ta kendisi. Bu kontrol otuz saniye sürüyor.
>
> **Ölçüm (15 Eylül 2026):** nonce hâlâ **2**, bakiye **0,0009 ETH** —
> `pqwallet-test.mjs`'in canlı okumasıyla doğrulandı. Bu kayıt o günü
> belgeliyor; **adımın koruduğu şey oturum günü.**
>
> **Sonraki ölçüm (17 Eylül 2026, blok 11725303):** nonce **hâlâ 2** — kapı
> geçerli. Bakiye **0,0509 ETH**'ye çıktı (Hakan'ın 0,05 ETH düz transferi,
> `0x5b36f902…`). Düz transfer `execute()` çağırmadığı için nonce'a dokunmadı;
> nonce'u ancak **owner anahtarıyla `execute()` çağıran** biri kaydırır. Yani
> bu adımın koruduğu risk dar, ama sıfır değil: kontrol yine yapılır.
> **Bakiye sayısı buraya kayıt olarak yazıldı, türetme girdisi olarak DEĞİL.**

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
    // `from` ÖLÇÜLÜR, örtük davranışa güvenilmez — aşağıdaki kutu neden.
    const from = await connected.signer.getAddress();
    const est = await connected.signer.estimateGas({
      to: CONTRACTS.pqWallet,
      data: calldata,
    });
    return { from, to, est, calldataBytes: (calldata.length - 2) / 2, calldata };
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
> - `signer.getAddress()` — ethers'ın kendi API'si; `estimateGas`'ın **zaten**
>   çağırdığı şey (bkz. aşağıdaki kutu). Kanca onu bir kez daha çağırıp dönen
>   nesneye koyuyor ki ölçülebilsin
> - `CONTRACTS.pqWallet` = `0x2EafA294C14b6752128bfd4f5873D1EA39f000BB`
>
> `chainNonce` ve `currentMnemonic` `main.js`'in modül kapsamındaki mevcut
> değişkenleri; kanca onları yalnızca **okuyor**.

> ### `from` SABİT KALMALI — tablonun ön koşulu
>
> **Ölçülmüş olgu:** `signer.estimateGas()` çağrıyı sağlayıcıya vermeden önce
> `populateCall` → `populate`'tan geçiriyor ve `from` boşsa **signer'ın
> adresiyle dolduruyor** (`node_modules/ethers/lib.commonjs/providers/
> abstract-signer.js:36-38` ve `:187-188`). Yani sıfır adresi varsayımı bu
> yolda oluşmuyor; Δ₁ de aynı yoldan geldiği için tabanı sağlam.
>
> **Ama `signer.getAddress()` MetaMask'in O AN AKTİF olan hesabını
> döndürüyor.** Akif ölçümler arasında hesap değiştirirse `from` sessizce
> değişir — ve sonuç tam olarak şu olur:
>
> A satırı "sıcak alıcı"dır ve sıcak olmasının **tek** sebebi `execute()`'un iç
> `to`'sunun tx göndericisiyle aynı adres olmasıdır (EIP-2929 `tx.origin`'i
> baştan sıcak listeye koyuyor). `from` değişirse iç alıcı soğur, A'nın
> tahminine **+2.500** girer, **B − A ≈ 0** çıkar ve "hipotez çürüdü" yazılır.
> Çürüyen hipotez değil, **ölçümün ön koşulu** olur.
>
> **Kural:** üç çağrının üçü de `from` = gerçek tx'i atacak MetaMask adresiyle
> koşulur. Satırlar arasındaki **tek değişken** `execute()`'un iç `to`'sudur:
> A'nınki `from`'un kendisi, B'ninki başka ama **var olan** bir adres,
> C'ninki **boş** adres.
>
> **Bu bir "bitti" ölçütüdür:** her çağrının `from`'u kanıt notuna yazılır ve
> üçünün **aynı olduğu** gösterilir. Örtük davranışa güvenilmez, ölçülür —
> bu yüzden kanca `from: await connected.signer.getAddress()` alanını **döndürür**
> (Adım 1'deki koda bak). Alan olmadan ölçüt karşılanamaz.

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

**İkinci endpoint belli: `VITE_SEPOLIA_ARCHIVE_RPC_URL`** (spec § 8, açık
soru 4 — 15 Eylül 2026'da kapandı). Anahtarsız çalıştığı ölçülen değer
`https://sepolia.gateway.tenderly.co`. Aynı değişken canlı test oracle'ını ve
`docs/evidence/chain/` tutanaklarını da besliyor; ayrıca bir sağlayıcı aranmaz.

Bu endpoint'e geçilip Adım 6 tekrarlanır. İki sağlayıcı **farklı** Δ veriyorsa
"ofset" EVM'in değil **node'un** özelliğidir ve tabloya hiç giremez.

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

**Commit burada DEĞİL, Task 5B Adım 3'te** — önce kanca silinir, sonra commit
atılır, kayıt **temiz ve commit'li ağaçtan** alınır. (Eski plan burada "Commit
YOK" diyordu; o satır düştü, gerekçesi Task 5B'nin başında.)

---

## Task 5B: Faz 1'in kapatılması — kanıt yazımı → kanca silme → COMMIT

**Bu görev Task 5 ile Task 6 arasında, aynı oturumda, KAYIT BAŞLAMADAN önce
koşar. Atlanamaz.**

**Neden var — iki ayrı sorun, ikisi de eski akışta garantiydi:**

1. **Kapı kendi kendini tetikliyordu.** Eski akış: kanca Task 5 Adım 1'de
   eklenir → `KAYIT_MD5` Task 6 Adım 4'te `main.js` **KANCALIYKEN** alınır →
   kayıt → Adım 9'da kanca silinir → Task 10'un kapısı eşitsizlik görür →
   *"video YENİDEN ÇEKİLİR"*. **K3 hiçbir şeye dokunmasa bile yeniden çekim
   garantiliydi.** Bedeli tam olarak spec'in "kıt kaynak" dediği şey: ikinci
   bir elle mnemonic oturumu + fazladan bir gerçek tx.
2. **Daha ağırı: kayıt, içinde `window.__m4` test kancası duran kodla
   alınıyordu.** Sprint 3'te kancaların iz bırakmadığı md5'lerle kanıtlandı ve
   sayfa yenilenip `window.__t6 === undefined` gösterildi. **Jüriye gösterilen
   sürümün gönderilen sürüm olmaması o disiplinin tam karşıtıdır.**

**Files:**
- Modify: `docs/evidence/crypto-tests/sprint4-gas-table-and-second-tx.md`
- Modify: `frontend/src/main.js` (kanca **silinir**)

**Interfaces:**
- Consumes: Task 5'in `EST_A_F1`, `EST_B`, `EST_C`, `TEKRAR_*`, `C_BOS`,
  `KANCALI_MD5`
- Produces: `TASK5B_COMMIT` (Task 6'nın kaydının atılacağı temiz taban)

> ### SIRA NEDEN BÖYLE — kanca, mnemonic'ten ÖNCE silinir
>
> Kanca silmek `main.js`'i değiştirir, **Vite HMR sayfayı yeniden yükletir** ve
> yükleme owner anahtarını düşürür. Mnemonic önce girilirse anahtar düşer ve
> **ikinci kez elle girilir** — kıt kaynağın boşa harcanması. Bu yüzden:
> kanıt yazımı → kanca silme → commit → **sonra** yenileme + mnemonic + kayıt.

- [ ] **Adım 1: [D3] Faz 1'in TÜM ölçümleri kanıt notuna yazılır ve DOSYADAN
      OKUNARAK doğrulanır**

**GEREKÇE — geri dönüşü olmayan kapı:** bir sonraki adım sayfayı yeniliyor ve
kancayı siliyor. **Sayfa belleği gidiyor, kanca gidiyor.** O anda dosyaya
yazılmamış hiçbir faz 1 ölçümü geri getirilemez; getirmenin tek yolu ikinci bir
elle mnemonic oturumudur.

Yazılacakların tamamı — her biri ayrı ayrı işaretlenir:

- [ ] `EST_A_F1`, `EST_B`, `EST_C` (ham tahminler)
- [ ] `TEKRAR_A`, `TEKRAR_B`, `TEKRAR_C` — **dizilerin tamamı**, özet değil
- [ ] **Her imzanın sıfır ve sıfır-dışı bayt sayısı** (A, B, C ayrı ayrı)
- [ ] Intrinsic tablosu (dört sütun: ham tahmin · bayt · intrinsic · yürütme)
- [ ] `C_BOS` — üçlü boşluk kanıtı (`balance` / `nonce` / `code` çıktıları)
- [ ] İkinci endpoint tekrarının dizileri
- [ ] **Üç çağrının `from`'u** ve üçünün aynı olduğu (Task 5'in "bitti" ölçütü)

> **Bayt sayıları özellikle kritik:** Task 6 Adım 9'un `EST_A_F1` ↔ `EST_A_F2`
> intrinsic karşılaştırması **bunlara dayanıyor** ve faz 1 tarafı yenilemeden
> sonra **yok**. Yazılmazsa o karşılaştırma bir daha hiç yapılamaz.

**Doğrulama biçimi:** yukarıdakiler ekrandan/konsoldan değil, **kaydedilmiş
dosyadan geri okunarak** onaylanır:

```bash
cd /Users/akif/pq-safe
cat docs/evidence/crypto-tests/sprint4-gas-table-and-second-tx.md
```

Listedeki yedi kalemin yedisi de çıktıda görünmüyorsa **Adım 2'ye geçilmez.**

- [ ] **Adım 2: Kancayı sil, artık-sıfırı kanıtla**

```bash
cd /Users/akif/pq-safe/frontend
md5 -q src/main.js                  # kancasız — KANCALI_MD5 ile FARKLI olmalı
grep -c "__m4" src/main.js          # beklenen: 0
diff <(git show <TASK2_COMMIT>:frontend/src/main.js) src/main.js   # beklenen: BOŞ
cd /Users/akif/pq-safe && git status --porcelain                   # SADECE kanıt notu
```

**Diff'in tabanı `HEAD` DEĞİL, Task 2'nin commit'i** (`<TASK2_COMMIT>`):
`main.js`'e en son yazan görev Task 2'dir ve `HEAD` o günden beri kanıt notu
commit'leriyle ilerlemiş olabilir.

**`git status --porcelain` md5'ten güçlü bir oracle:** kanca temiz silinmişse
`main.js` **git'in gözünde hiç değişmemiştir** ve listede hiç görünmez. Listede
yalnızca kanıt notu duruyorsa artık sıfırdır.

Sayfa yenilenir (HMR zaten yeniler), konsolda `window.__m4` → `undefined`.

- [ ] **Adım 3: COMMIT (komut Akif'e verilir)**

**Gerekçe:** kayıt **temiz ağaçtan** alınacak; kanıt notu ise bir **repo
dosyası** ve commit'siz kalamaz. İkisi aynı adımda çözülür.

```bash
git add docs/evidence/crypto-tests/sprint4-gas-table-and-second-tx.md
git commit -m "docs(evidence): faz 1 ölçümleri — üç alıcı durumu, tekrar dizileri, intrinsic tablosu; kanca artığı sıfır"
git push
git rev-parse HEAD   # TASK5B_COMMIT — Task 6 Adım 4 bunu KAYIT_COMMIT olarak görecek
```

`git status --porcelain` bu komuttan sonra **BOŞ** olmalı. Boş değilse Task 6'ya
geçilmez.

---

## Task 6: K2 Faz 2 — kayıtlı gerçek tx (AKİF sürüyor)

**ÖN KOŞUL: Task 5B kapanmış olmalı** — kanca silinmiş, kanıt notu commit'li,
`git status --porcelain` boş. **Kancalı ya da commit'siz ağaçta kayıt alınmaz.**

**Files:**
- Modify: `docs/evidence/crypto-tests/sprint4-gas-table-and-second-tx.md`
- Create: `docs/evidence/chain/<TX2_HASH>.json` (Adım 9)
- Create: `docs/evidence/chain/0x320e03d9…e50da.json` (Adım 9, geriye dönük)

**Interfaces:**
- Consumes: Task 5'in `EST_A_F1` + faz 1 bayt sayıları (Task 5B Adım 1'de
  dosyaya yazıldı), Task 5B'nin `TASK5B_COMMIT`
- Produces: `TX2_HASH`, `GAS_USED_2`, `LIMIT_2`, `EST_A_F2`, `Δ₂`,
  `KAYIT_MD5` (beş dosyanın hash'i), `KAYIT_COMMIT`, `KAYIT_SHA256`

- [ ] **Adım 1: Sayfayı yenile**

Faz 1'in çıktısı ekranda birikti; temiz demo kaydı onun üstüne çekilemez.
Yenileme owner anahtarını düşürür — beklenen davranış. (Task 5B'nin kanca
silmesi HMR ile sayfayı zaten yeniden yüklemiş olabilir; bu adım onu garantiler.)

- [ ] **Adım 2: Mnemonic'i tekrar içe aktar — KAYIT BAŞLAMADAN**

Sprint 3 kaydında da böyleydi. `✓ AYNI` satırı içe aktarmadan sonra ekranda
kalıyor, yani kayda yine giriyor.

- [ ] **Adım 3: Mnemonic taraması (Sprint 3 prosedürü)**

- `btn-keygen`'e **hiç basılmaz** (**Task 2** sonrası zaten DOM'a yazmıyor, ama
  prosedür korunur)
- `import-mnemonic` alanı boş
- `Cmd+F` ile mnemonic'ten bir kelime → **0 sonuç**
- DevTools kapalı, başka pencere/bildirim yok

- [ ] **Adım 4: Kayıt anındaki md5'leri VE commit'i not et**

```bash
cd /Users/akif/pq-safe/frontend
md5 -q index.html src/main.js src/tx/sendTransaction.js src/crypto/digest.js src/tx/buildTransaction.js
cd /Users/akif/pq-safe
git rev-parse HEAD      # KAYIT_COMMIT
git status --porcelain  # BOŞ olmalı — değilse kayıt başlatılmaz
```

Beş hash `KAYIT_MD5` olarak nota yazılır. **CSS ayrı dosya değil** — `frontend/`
altında hiç `.css` dosyası yok ve `index.html`'de `.css` linki yok, stiller
inline; yani `index.html`'in hash'i stilleri de kapsıyor. Task 10'un kapısı bu
beş hash'i karşılaştıracak.

> **[D2] `KAYIT_COMMIT` neden alınıyor — kapının ötesinde bir iş için:**
> kayıt **temiz ve commit'li** bir ağaçtan alınmışsa *"videodaki sürüm repodaki
> `<KAYIT_COMMIT>` sürümüdür"* **doğrulanabilir bir iddia** olur; okuyan o
> commit'i çekip kendi gözüyle bakabilir. Kancalı ya da commit'siz bir ağaçta
> o cümle **hiç kurulamaz** — gösterilen kod hiçbir yerde durmuyordur.
>
> **md5 seti KALIR, `KAYIT_COMMIT` onun yerine geçmez:** commit sonrası yapılmış
> yerel bir düzenlemeyi (commit'e girmemiş, `HEAD` değişmemiş) **yalnızca md5**
> yakalar. İkisi farklı şeyleri ölçüyor.
>
> **`KAYIT_COMMIT` Task 10'un kapısına GİRMEZ** — gerekçesi Task 10 Adım 1'de.

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
# Adım 0'da okunan bakiyeyi B0 olarak not et; beklenen düşüş B0 - value - 0
# (gas cüzdandan DEĞİL, gönderen EOA'dan ödenir).
cast nonce   <PQWALLET> --rpc-url $SEPOLIA_RPC   # beklenen: 3
cast balance <PQWALLET> --rpc-url $SEPOLIA_RPC   # beklenen: B0 - value
cast rpc eth_getTransactionReceipt <TX2_HASH> --rpc-url $SEPOLIA_RPC  # status 1, gasUsed
```

> **Bakiye SABİT yazılmaz.** Bu satır 14 Eylül'de `0,0009 − 0,0001 ETH` diye
> sabitlenmişti; 17 Eylül'de bakiye 0,0509 ETH oldu ve beklenti sessizce
> yanlışa döndü. Doğru biçim: Adım 0'da okunan `B0`'dan türet.

> **Receipt sorgusu için `$SEPOLIA_RPC` ARŞİV endpoint'i olmalı** (komut
> `cast rpc eth_getTransactionReceipt`, `cast receipt` DEĞİL — bkz. Global
> Constraints araç notu). Gönderim
> anında taze receipt her endpoint'ten gelir; **sonradan** her yeniden
> doğrulama public endpoint'te `null` döner (~30 saat sınırı). Adım 9'un
> tutanağı da bu yüzden aynı gün alınıyor.

> **Kanca silme burada DEĞİL.** Task 5B Adım 2'de, kayıttan **önce** yapıldı.

- [ ] **Adım 9: [D1] Ham tx/receipt JSON'ı repoya al — K2'nin "bitti" ölçütü**

**Neden:** `.env`'deki public RPC sağlayıcı **receipt geçmişini buduyor** —
ölçüldü, sınır ~8.000–10.000 blok (≈ 30 saat). Bu Sprint 3'ün kanıt zincirini de
vuruyor: `0x320e03d9…`'un *"`cast receipt` → status 1 · gasUsed 216221"* satırı
**artık o endpoint'ten tekrar üretilemiyor olabilir.** Sprint 4'ün kendi tx'i de
günler içinde aynı duruma düşer. Ölçüm anında alınıp repoya yazılmazsa kanıt
sessizce buharlaşır.

- [ ] **G1 — Sprint 4'ün tx'i.** `eth_getTransactionByHash` **ve**
      `eth_getTransactionReceipt` çıktılarının **TAM JSON'ı** yazılır:
      `docs/evidence/chain/<TX2_HASH>.json`
- [ ] **G2 — Sprint 3'ün tx'i, geriye dönük:**
      `docs/evidence/chain/0x320e03d98cec857bbae8ecb49bcb0736c960287d76a19f2fad39b471b09e50da.json`.
      Mevcut public endpoint vermiyorsa **arşiv erişimi olan bir endpoint**
      kullanılır (açık sorular § 4'teki ikinci endpoint adayı).
- [ ] **G3 — Her JSON dosyasının başına** hangi **endpoint**'ten, hangi
      **tarihte** çekildiği yazılır.

> **DOSYA SAHİPLİĞİ:** `docs/evidence/chain/` **Akif'in alanıdır**, yeni dizin.
> `docs/evidence/tx-hashes.md`'ye **DOKUNULMAZ** — o Hakan'ın dosyası,
> append-only, hash oraya mesajla iletilir.

> ### G4 — KAPSAM: raporda fazla iddia edilmesin
>
> **Ham JSON kriptografik kanıt DEĞİL, tutanaktır; kendi kendini doğrulamaz.**
> Bir JSON dosyası elle de yazılabilir. Kanıt değeri, zincirdeki tx'e işaret
> etmesinden gelir.
>
> Rapora girecek cümle **tam olarak** budur:
>
> > tx hash ve blok numarası **herhangi bir ARŞİV düğümüyle yeniden
> > doğrulanabilir**; aşağıdaki JSON kolaylık kopyasıdır.
>
> **"Zincirden yeniden üretilebilir" diye YAZILMAZ** — budayan bir endpoint'te
> üretilemiyor, cümle olduğu gibi yanlış olur.

- [ ] **Adım 10: Faz 1'in A tahmini ile faz 2'ninkini karşılaştır — ölçüm, çıkarım değil**

`EST_A_F1` ile `EST_A_F2` karşılaştırılır. Fark varsa kaynağı **hesaplanır**,
atanmaz: iki imzanın sıfır/sıfır-dışı baytları sayılır, intrinsic ikisi için
de hesaplanır.

> **Faz 1 tarafı ekranda değil, DOSYADA.** Sayfa Adım 1'de yenilendi, kanca
> Task 5B'de silindi; `EST_A_F1` ve A'nın faz 1 bayt sayıları **yalnızca**
> Task 5B Adım 1'de kanıt notuna yazıldıkları için erişilebilir. Orada
> yazılmadılarsa bu adım yapılamaz.

| Bulgu | Anlamı |
|---|---|
| Baytlar aynı | İmzalayıcı deterministik. Nokta |
| Baytlar farklı, tahmin farkı = hesaplanan intrinsic farkı | İmzalayıcı hedged; açıklama kapandı |
| Baytlar farklı, fark intrinsic farkına **eşit değil** | **Açıklanamayan kalan var** — yuvarlanmaz, yazılır |

Üçüncü ihtimal baştan dışlanmaz. Bu bir **"bitti" ölçütü değildir**.

- [ ] **Adım 11: Commit (komut Akif'e verilir)**

`frontend/src/main.js` bu commit'te **YOK** — kanca Task 5B'de silindi ve
`main.js` o commit'ten beri hiç değişmedi.

```bash
git add docs/evidence/crypto-tests/sprint4-gas-table-and-second-tx.md docs/evidence/chain/
git commit -m "docs(evidence): ikinci gerçek tx + faz 2 ölçümü + ham zincir tutanakları (tx/receipt JSON)"
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
> **UYARI — 3. madde kanıt DEĞİLDİR.** Yorum yazarın **niyetini** gösteriyor,
> dalın **koşabilirliğini** değil. Analizde yorum bağlam olarak okunur, delil
> olarak sayılmaz; hüküm 1. ve 2. maddelerin üstüne kurulur. (Bu ayrım
> yapılmazsa "kod öyle diyor" ile "kod öyle çalışıyor" karışır — bu kod
> tabanında `e.txHash` ölü kod sanılıp sonradan çalıştırılabilir çıkmıştı, A2.)
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

> ### KAPI `KAYIT_COMMIT` ile HEAD EŞİTLİĞİNE BAĞLANMAZ
>
> Bu bir md5 karşılaştırmasıdır ve **öyle kalır.** `KAYIT_COMMIT` (Task 6
> Adım 4) buraya **girmez.**
>
> **Neden:** Task 8'in kanıt notu commit'lendi (ve Task 9 bu kapıdan sonra
> bir tane daha commit'leyecek), yani `HEAD` kayıttan sonra **zorunlu olarak**
> ilerliyor. Kapıyı `KAYIT_COMMIT == HEAD`'e bağlarsak
> beş dosyanın tek baytı değişmese bile kapı **yanlış tetiklenir** ve yeniden
> çekim ister — bedeli ikinci bir elle mnemonic oturumu artı bir gerçek tx.
> Kapının ölçtüğü şey **kaydedilen UI'ın değişip değişmediğidir**, reponun
> ilerleyip ilerlemediği değil.
>
> `KAYIT_COMMIT` yalnızca Task 6 Adım 4'teki **provenans cümlesi** için var:
> *"videodaki sürüm repodaki `<KAYIT_COMMIT>` sürümüdür."*
>
> Bu ayrım burada yazılı ki sonraki okuyan *"madem commit'imiz var, hash'i de
> karşılaştıralım"* diye aynı tuzağa girmesin.

`index.html`'in dahil olması şart: **kamera DOM'u görüyor, mantığı değil.**
Kayıttan sonra bir uyarı satırı veya yeni `.class` eklendiyse mantık dosyaları
hiç değişmeden kayıt ile gönderilen UI ayrışır.

> **Task 9 artık bu kapının ARKASINDA** (Task 10'dan sonra koşuyor), yani
> kapının kontrol ettiği pencerede K3'ün dal testleri **henüz yapılmamış**
> olur. Kapı buna rağmen gerekli: Task 8'in kanıt notu commit'lendi ve
> Task 5B/6 arasında `index.html`'e dokunulmuş olabilir.
>
> **Kapının GÖREMEDİĞİ şey Task 9'un ortam değişikliğidir** (MetaMask'in RPC
> ucu) — repo dosyası olmadığı için md5'e girmiyor. Task 9'un kayıttan sonraya
> alınmasının sebebi tam olarak budur; ayrıntı Task 9'un başındaki kutuda.

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

## Task 9: İki dalın sınanması — **TEK OTURUM, SIFIR GAZ** (Task 10'DAN SONRA)

> ### NEDEN TASK 10'DAN SONRAYA TAŞINDI
>
> Task 9 `DENETİMLİ_AĞ` sonucu yüzünden **MetaMask'in ağ tanımına** dokunmak
> zorunda (aşağıda ölçüldü). Bu, repo dosyalarına dokunmayan bir **ortam**
> değişikliği — ve Task 10'un diff kapısı yalnızca **beş repo dosyasının**
> md5'ine bakıyor, yani **bu değişikliği GÖREMEZ.**
>
> Risk somut: MetaMask'in RPC'si eski hâline döndürülmezse, ya da Task 10
> **yeniden çekim** tetiklerse, taze kayıtta MetaMask arayüzünde `localhost`
> RPC görünür — üstelik o kayıt **gerçek bir tx** taşır, yani proxy gerçek
> gönderim yolunda olur. Kapı bunu yakalayamaz çünkü hiçbir dosya değişmemiştir.
>
> **Kayıt kesinleştikten sonra koşarsa risk SIFIRLANIYOR.** Task 9 kritik yolda
> değil (60–90 dk, kimseyi bloke etmiyor) ve sonucu yalnızca rapora giriyor.
> Kaydı kirletebilecek bir pencerede koşmanın gerekçesi yok.
>
> **Yeni sıra:** Task 0 → Task 5 → Task 5B → Task 6 → **Task 10 (kapı kapanır)**
> → **Task 9** → Task 11/12. Spec § 5'teki sıra anahtarı da buna göre
> güncellendi (K3, K4'ten sonra).

**Files:**
- Modify: `docs/evidence/crypto-tests/sprint4-untested-branches.md`
- Create: `docs/evidence/screenshots/sprint4-gas-fallback-metamask-350k.png`
- Create: `docs/evidence/screenshots/sprint4-action-rejected.png`
- Create: `docs/evidence/screenshots/sprint4-metamask-rpc-restored.png`

**Interfaces:**
- Consumes: Task 8'in `FALLBACK_SONUC = DENETİMLİ_AĞ`

### İKİ DAL TEK KOŞUDA KAPANIR — sıfır gaz, zincire hiçbir şey gitmez

Task 7'nin "HÂLÂ SINANMADI" listesi tam iki kalemdi ve akış ikisini arka arkaya
diziyor:

```
estimateGas PATLAR (proxy)  →  gasLimit = GAS_FALLBACK = 350.000n
                            →  signer.sendTransaction  →  MetaMask açılır
                            →  İPTAL  →  ACTION_REJECTED (main.js:780)
```

İptal **hem** `ACTION_REJECTED`'ı kapatıyor **hem de** 350.000 limitli **gerçek
bir tx'i önlüyor**. Nonce yanmıyor, Task 5/6'nın nonce varsayımı korunuyor.

### PROXY HEDEFİ: **MetaMask'in ağ tanımı** — `.env` DEĞİL (ölçüldü)

| Yol | Sağlayıcı | Çağrılar |
|---|---|---|
| **MetaMask** — `BrowserProvider(window.ethereum).getSigner()` (`sendTransaction.js:15,24`) | MetaMask'in kendi ağ tanımı | `signer.call` `:125` (ön-uçuş) · **`signer.estimateGas` `:201` (HEDEF)** · `signer.sendTransaction` `:211` |
| Uygulamanın RPC'si — `JsonRpcProvider(VITE_SEPOLIA_RPC_URL)` (`sepolia.js:18-24`) | `.env` | `readNonce`, `readDigest`, `readBalance`, `readOwnerPublicKey` |

**`VITE_SEPOLIA_RPC_URL`'e proxy koymak HİÇBİR ŞEY YAPMAZ** — hedef çağrı o
yoldan geçmiyor. Bu, SAPMA 3'ün kararının doğrudan sonucu.

**Süre: 60–90 dakika** (eski tahmin 30–45'ti, `.env` varsayımına dayanıyordu).
Fark proxy'nin kendisi değil, MetaMask tarafı:
- Proxy **tam geçirgen** olmalı: MetaMask arka planda sürekli yokluyor
  (`eth_chainId`, `eth_blockNumber`, `eth_getBalance`, `net_version`). Oyuncak
  bir pass-through cüzdanı kilitler.
- **`chainId` 11155111 KORUNMALI.** Yeni ağ olarak eklenirse MetaMask
  `chainChanged` yayar → `watchWalletChanges` (`sendTransaction.js:43`)
  bağlantıyı düşürür → dala hiç gelinmez. Doğru yol: **mevcut Sepolia ağının
  RPC ucunu değiştirmek**, yeni ağ eklemek değil.
- Geri alma ve geri alındığının **doğrulanması** işin parçası.

- [ ] **Adım 1: Proxy'yi kur ve tam geçirgenliğini doğrula**

Her metodu yukarı geçirir, **yalnızca `eth_estimateGas`'a hata döner.**
Kurulduktan sonra, hata enjeksiyonu **kapalıyken**, cüzdanın normal çalıştığı
görülür (bakiye okunuyor, ağ göstergesi sağlıklı). Bu adım geçilmeden
enjeksiyon açılmaz — yoksa "proxy mi bozuk, dal mı koştu" ayrılamaz.

- [ ] **Adım 2: MetaMask'in Sepolia RPC ucunu proxy'ye çevir**

Yeni ağ **EKLENMEZ**, mevcut Sepolia'nın RPC ucu değiştirilir (`chainId`
11155111 aynı kalsın). Değiştirdikten sonra sayfada bağlantının **düşmediği**
doğrulanır — düştüyse `chainChanged` yayılmış demektir, kurulum yanlış.

- [ ] **Adım 3: İmzala → Gönder → MetaMask onay ekranı**

Buraya kadar zincire hiçbir şey gitmedi. MetaMask açıldığında **DURULUR**.

- [ ] **Adım 4: `GAS_FALLBACK` KANITI — MetaMask onay ekranında limit 350.000**

> **Oracle neden ekran notu DEĞİL:** `main.js:694`'teki *"tahmin başarısız
> oldu, sabit limite düşüldü"* notu `sendExecute` **başarıyla döndükten sonra**
> üretiliyor. İptal edilirse `sendExecute` fırlatır, `:694`'e hiç gelinmez ve
> `catch` `sendOut`'u *"İşlem MetaMask'te iptal edildi"* ile ezer.
> **İptal senaryosunda o not EKRANDA HİÇ GÖRÜNMEZ.**
>
> Bunun yerine cüzdana giden **gerçek parametre** okunur. Ayırt edici sayı net:
>
> | Dal koştuysa | Koşmadıysa |
> |---|---|
> | `gasLimit = 350.000` (sabit) | `estimated × 1,2 ≈ 259.000` |
>
> İkisi karışmaz.

**(a) SAYININ YERİ ÖLÇÜLECEK — VARSAYILMAYACAK.** MetaMask ana onay ekranında
genelde **kendi ücret tahminini** gösterir; tx'in `gasLimit`'i
**"Gelişmiş / Düzenle"** görünümüne düşebilir. Sıra:

1. Önce **ana onay ekranı** okunur. `350.000` orada görünüyorsa ekran görüntüsü
   oradan alınır.
2. Görünmüyorsa **"Gelişmiş/Düzenle" (gas düzenleme)** görünümü açılır ve
   `Gas limit` alanı oradan okunur.
3. **Hangisinde bulunduğu kanıt notuna yazılır.** Bu, bu projede daha önce
   ölçülmemiş bir MetaMask davranışıdır; sonraki okuyan aynı aramayı baştan
   yapmasın.

> **DİKKAT — ücret tahmini ile gas limiti aynı şey değil.** Ayırt edici alan
> **gas limit**, "estimated fee" değil. Yanlış alandan okunan bir sayı dalı
> kanıtlamaz.

- [ ] **Adım 5: İKİ ORACLE — biri dalın GİRİLDİĞİNİ, diğeri DEĞERİ kanıtlar**

| Oracle | Neyi kanıtlar | Neden tek başına yetmez |
|---|---|---|
| **Proxy log'u**: `eth_estimateGas`'a hata döndüğü | Dala **girildi** | İptal edilince `eth_sendTransaction` proxy'ye **hiç ulaşmaz**, yani proxy `gasLimit`'in 350.000 olduğunu **göremez** |
| **MetaMask onay ekranı**: limit 350.000 | **Hangi değerin** kullanıldığı | Tek başına "tahmin mi patladı, kullanıcı mı elle girdi" ayrımını yapmaz |

İkisi birlikte zinciri kapatıyor: tahmin patladı **ve** sonucu 350.000 oldu.

- [ ] **Adım 6: `ACTION_REJECTED` — MetaMask'te REDDET**

Beklenen: `sendOut` *"İşlem MetaMask'te iptal edildi. İmza hâlâ geçerli, tekrar
gönderebilirsiniz."* (`main.js:780-782`), `signed` **korunuyor**, buton durumu
tutarlı, zincire hiçbir şey gitmiyor. Ekran görüntüsü alınır.

Ayrıca `cast nonce <PQWALLET>` ile nonce'un **değişmediği** doğrulanır — iptalin
gerçekten sıfır gaz olduğunun bağımsız kanıtı.

- [ ] **Adım 7: MetaMask'in RPC'sini GERİ AL — ve geri alındığını kanıtla**

Sepolia'nın RPC ucu eski değerine döndürülür, **ekran görüntüsü alınır**
(`sprint4-metamask-rpc-restored.png`). Sayfa yenilenip cüzdan normal ağda
bağlanıyor mu görülür.

> **Bu adım atlanamaz ve diff kapısı onu KORUYAMAZ.** MetaMask ayarı repo
> dosyası değil; Task 10 beş dosyanın md5'ine bakıyor ve bu değişikliği
> göremez. Kapının ölçmediği bir ortam değişikliği **elle** kapatılır.
> (Task 9 kayıttan sonraya alındığı için artık kaydı kirletemez — ama ayar yine
> de geri alınır, çünkü sonraki her oturum bu cüzdanı kullanacak.)

- [ ] **Adım 8: Mevcut testler + build**

```bash
cd /Users/akif/pq-safe/contracts
EXPECTED=$(cast calldata "execute(address,uint256,bytes,bytes)" \
  0x7268a7c3d52baa50486930e6ed25d29804d075b6 1000000000000000 0x 0xdeadbeef)
cd ../frontend
node src/tx/send-transaction-test.mjs
node src/tx/build-transaction-test.mjs
CAST_EXPECTED="$EXPECTED" node src/contracts/pqwallet-test.mjs
npx vite build
```
Beklenen: **83 · 21 · 9** · build geçer. Console: yalnızca favicon 404.

- [ ] **Adım 9: Kanıt notunu yaz — KAPSAM DIŞINI İDDİA ETME**

`sprint4-untested-branches.md` bölüm 2 ve 3'e yazılır. **"Bitti" ölçütü
(revize edildi):**

> ~~ekranda "tahmin başarısız, sabit limite düşüldü" notu çıktı~~
> **MetaMask onay ekranında limit 350.000 görüldü** (yeri belirtilerek)
> **+ not render'ı (`main.js:694`) SINANMADI**

**(b) İptal, dalın HESABINI kapatır, GÖSTERİMİNİ değil.** `gasLimit = 350000n`
ataması koştu; `main.js:694`'teki not render'ı **hiç koşmadı** ve bu oturumda
koşamaz. Bu bir **açık kalem** olarak yazılır — rapor sınanmamış bir gösterimi
sınanmış gibi sunmaz. (Kapatmak için 350.000 limitli gerçek bir tx gerekir;
o da Sprint 5 kararı.)

- [ ] **Adım 10: Commit (komut Akif'e verilir)**

```bash
git add docs/evidence/crypto-tests/sprint4-untested-branches.md docs/evidence/screenshots/
git commit -m "docs(evidence): ACTION_REJECTED + GAS_FALLBACK tek oturumda kapatıldı, sıfır gaz"
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

> **[D1] Zincir kanıtlarının rapordaki ifadesi — Task 6 Adım 9'un G4 kuralı
> burada uygulanır.** Ham JSON tutanaktır, kriptografik kanıt değil. Rapor
> cümlesi: *"tx hash ve blok numarası herhangi bir ARŞİV düğümüyle yeniden
> doğrulanabilir; aşağıdaki JSON kolaylık kopyasıdır."*
> **"Zincirden yeniden üretilebilir" yazılmaz.**
>
> **Rapora giren `cast` komutlarının yanına ŞU NOT konur:**
>
> > Receipt sorgusu (`cast rpc eth_getTransactionReceipt <hash>`; `cast receipt`
> > budanmış receipt'te süresiz asılıyor, kullanılmaz) bir **ARŞİV** düğümü
> > gerektirir. Ücretsiz public
> > Sepolia endpoint'leri (publicnode dahil) receipt'leri ~8.000–10.000 blok
> > (≈30 saat) sonra buduyor: `eth_getTransactionByHash` tx'i vermeye devam
> > ederken `eth_getTransactionReceipt` `null` döner. **Bu bir kusur değil, ağ
> > gerçeğidir** — arşiv geçmişi tutmak pahalıdır ve ücretsiz düğümler tutmaz.
> > `--rpc-url` bir arşiv endpoint'ine verilmelidir.
>
> **Bu not yazılmazsa jüri komutu koşar, `null` alır ve kanıt çürük görünür.**
> Ölçüm: `docs/evidence/crypto-tests/sprint4-screen-consistency.md` § 7.1;
> tutanaklar `docs/evidence/chain/`.

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
6. **`README.md`'ye tek satır referans:** § Kurulum yalnızca `contracts/`
   tarafını anlatıyor, frontend kurulumu hiç belgelenmemişti.
   `docs/FRONTEND-KURULUM.md` yazıldı (ön koşullar, komut sırası, ölçülmüş
   süreler). README Hakan'ın dosyası olduğu için ona **dokunulmadı** — eklenecek
   olan yalnızca bu belgeye bir referans satırı. ÖK-2'nin *"jüri elle hiçbir şey
   ayarlamasın"* amacı bu satır olmadan kapanmıyor
7. **Cross-machine WASM determinizmi teyidi — ÖLÇÜM İSTEĞİ.** C kararı
   (derlenmiş imzalayıcının depoya konması) sha256 tutarsızlık kontrolüne
   dayanıyor. Determinizm şu an **yalnızca tek makinede, tek toolchain
   sürümüyle** ölçüldü (rustc 1.93.1, wasm-pack 0.15.0, macOS/arm64). Hakan'ın
   aynı sürümlerle bir kez `bash frontend/scripts/build-wasm.sh` koşup
   `src/crypto/wasm-pkg-web/sphincs_c13_signer_bg.wasm`'ın sha256'sını
   bildirmesi yeterli. Beklenen değer
   `a0f1f0cb76a429098325601d49642aa045c7dbae8aad7c3b26fa38ef67c4d9cd`.
   **Tutmazsa C'nin kontrolü yeniden tasarlanır** — bu yüzden ölçüm, kontrolün
   yazılmasından önce değerli. Sürümleri farklıysa **hash beklenmez**, sürüm
   numaraları istenir

---

## Sprint 5'e bilerek bırakılanlar

- Raporun birleştirilmesi, redaksiyonu, görsel düzeni
- Sunum + soru-cevap listesi + en az 3 tam prova
- Farklı makinede demo (Task 0 Adım 2 kısmen karşılar)
- **`render.js` tesisatı + 56 yazma noktası + envanter doğrulaması** — Task 3–4,
  gerekçesi ve `getWriteLog` kapsam kuralı orada yazılı
- **Sunum için kurgulu kısa video** — kanıt olan ham ve kesintisiz olan
- **C'ye gerçek tx** — yalnızca Task 7'nin üçüncü kovası çıkarsa. Gönderimden
  **hemen önce** üçlü boşluk kontrolü tekrarlanır: faz 1'de boş olması haftaya
  boş olduğunu göstermez
- `sphincs-minus` pin dayanıklılığı (fork / vendor kararı)
