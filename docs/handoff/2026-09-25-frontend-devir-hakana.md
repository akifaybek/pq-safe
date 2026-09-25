# Frontend devir notu — Hakan'a

**Yazıldı:** 25 Eylül 2026
**Sebep:** Frontend'i sen halledeceksin (Akif'le sözlü karar).
**Bağlam:** `docs/handoff/2026-09-25-son-5-gun-plani.md` — takvim ve senden
istenen dört kalem orada. Bu dosya onun yerine geçmez, frontend kısmını açar.

> Bu notun her sayısı **25 Eylül 2026'da ölçüldü** ve nasıl ölçüldüğü yazılı.
> "Çalışıyor" diye yazdığım hiçbir şey yok — koştuğum komut ve çıktısı var.
> Ölçmediğim şeyleri de **ölçülmedi** diye işaretledim.

---

## 0. Beş madde — geri kalanı okumazsan bunlar

1. **Frontend hiçbir şeyi bloke etmiyor. Foundry ↔ Sepolia 2,5 kat cevabı
   raporu bloke ediyor.** Sıra: önce o, sonra cila. (§ 2)
2. **Görsel hiçbir değişiklik md5 kapısından kaçamaz** — CSS `index.html`'in
   içinde. Dokunursan **demo videosu yeniden çekilir.** Başlamadan haber ver. (§ 4)
3. **Dört bölgeye dokunma.** Hepsi bu kod tabanında bir kez pahalıya patlamış
   yerler, gerekçeleri kodun içinde yazılı. Gerçek satır numaraları § 5'te.
4. **Değişiklikten sonra 4 komut + build.** Yeşil taban ölçüldü: **8 / 21 / 99**. (§ 6)
5. **Bu 4 test ekranı KORUMUYOR** (ölçüldü, § 6.2). DOM'u bozarsan hiçbir test
   kırmızı yanmaz. Ekran metnini değiştirirsen bana söyle.

---

## 1. Ne değişti, ne değişmedi

`CLAUDE.md` kuralı 1 hâlâ şöyle diyor:

> Akif: `frontend/`, `contracts/src/verifier/`, … · *"Bir oturumda karşı
> tarafın dosyasına dokunma."*

Bu satır artık gerçekle çelişiyor. `CLAUDE.md` **ortak dosya** — tek taraflı
değiştirmedim. İkinizin kararıyla güncellenmeli, yoksa bir sonraki oturumda
açan ajan (benim gibi) sana "frontend'e dokunma" diyecek.

**Değişmeyenler:** `contracts/src/verifier/`, `docs/`, rapor ve verifier tarafı
Akif'te. Senin dört kalemin (README gas tablosu, EIP teyidi, 2,5 kat, WASM
derleme) **aynen duruyor** — frontend onların yerine geçmiyor, yanına geldi.

---

## 2. SIRALAMA — en önemli madde

Pazar akşamına kadar elinde beş iş var ve **ikisi aynı ağırlıkta değil:**

| iş | neyi bloke ediyor |
|---|---|
| **Foundry ↔ Sepolia 2,5 kat açıklaması** | **RAPORU** — 30 Eylül teslimi |
| README gas tablosu | jürinin ilk baktığı yer |
| EIP referans teyidi | rapora kaynaksız sayı giremez |
| WASM derleme (opsiyonel) | hiçbir şey — "ölçülmedi" diye yazılabilir |
| **frontend cilası** | **hiçbir şey** |

Frontend cilası **kozmetik**. Rapor yazılmamış (`docs/RAPOR.md` — ÖLÇÜM: dosya
hiç oluşturulmadı, git geçmişinde de yok, 0 satır) ve içindeki bir bölüm senin
cevabını bekliyor. Cila o cevabın önüne geçerse kötü bir takas yapmış oluruz:
arayüz güzelleşir, rapor eksik kalır.

**Önerim:** 2,5 kat cevabını ve README tablosunu bitir, sonra cilaya bak.
Cila yapılamazsa kaybımız sıfır — bugünkü arayüz çalışıyor ve videosu çekilmiş.

---

## 3. Nasıl çalıştırırsın — ÖLÇÜM

```
1) cd pq-safe/frontend
2) npm i
3) cp .env.example .env
4) npx vite
```

3. adımda **elle düzenleme gerekmiyor** — `.env.example` olduğu gibi çalışıyor,
iki RPC değeri de anahtarsız ve dosyada birebir yazılı (gerekçe dosyanın kendi
başında). Rust / wasm-pack **gerekmez**; derlenmiş imzalayıcı depoda geliyor
(`src/crypto/wasm-pkg-web/`, 17 Eylül kararı — `frontend/.gitignore` başında
yazılı).

Zincirle konuşan kısım için MetaMask ve Sepolia gerekiyor. **Owner mnemonic'i
sende yok ve olmasın** — `.env.pqwallet-owner-key` hiç okunmayan bir dosya
(çalışma kuralı, `2026-09-25-devir.md` § A.5 #8). Mnemonic'i tarayıcıya Akif
elle giriyor. Yani **gönderim yolunu sen uçtan uca koşamazsın**; cila için
gerekmiyor da — 1-3. bölümler ve 4. bölümün görünümü mnemonic'siz görülüyor.

---

## 4. md5 KAPISI — mekanik kural, karar değil

Kayıtlı demo videosu var (tek çekim, SHA-256 `c5471c98…`,
`docs/evidence/crypto-tests/sprint4-recorded-demo-run.md`). Spec'te
(`docs/superpowers/specs/2026-09-14-sprint4-scope-design.md:325-334`) mekanik
bir kapı tanımlı:

```
kayıt anındaki md5  ==  şimdiki md5  →  çekim FİNAL
kayıt anındaki md5  !=  şimdiki md5  →  video YENİDEN ÇEKİLİR
```

### Kapının şu anki durumu — ÖLÇÜM (25 Eylül 2026)

Beş dosyayı `md5 -q` ile hash'ledim, kayıt anındaki tabloyla
(`sprint4-recorded-demo-run.md:331-337`) karşılaştırdım:

| dosya | kayıt anı | 25 Eylül | |
|---|---|---|---|
| `index.html` | `3b701338fe6107e0a241501ab261da73` | aynı | ✓ |
| `src/main.js` | `2115125f1e366b3ca8cb224e883242b3` | aynı | ✓ |
| `src/tx/sendTransaction.js` | `250014298ea216e667344eca24c16984` | aynı | ✓ |
| `src/crypto/digest.js` | `fd93a71edd1f27b664414195c0cbaf3f` | aynı | ✓ |
| `src/tx/buildTransaction.js` | `c4a061dedc27b7339738d2bc42eb3038` | aynı | ✓ |

**Beşi de sapmasız. Video şu an GEÇERLİ.**

### Kaçış yolu YOK — bunu bilerek yazıyorum

CSS ayrı bir dosyada değil: **`index.html:6-26` içindeki `<style>` bloğu**
(ÖLÇÜM: `frontend/` altında hiç `.css` dosyası yok). Spec kapının kapsamını
*"`index.html` + CSS + `main.js` + `sendTransaction.js`"* diye tanımlıyor ve
gerekçesini de yazıyor (`:337-340`): **kamera DOM'u görüyor, mantığı değil.**

Sonuç (ÇIKARIM): tipografi, renk, boşluk — hangisini değiştirirsen `index.html`
değişir. Yeni bir `.css` dosyası açmak da kurtarmaz; o dosya "CSS" kapsamında,
üstelik `index.html`'e `<link>` satırı eklenir. **Görsel hiçbir değişiklik
kapıdan muaf değil.**

### Bu ne demek

Cila yapılırsa video **nonce 7** ile yeniden çekilecek ve aynı protokol
uygulanacak: ön kayıt → commit → push → `pushed_at` ile sıra kanıtı → tx.
Şablonlar `docs/evidence/c-nonce6-prerecord.md` ve
`docs/evidence/c-run-sheet.md`. Bu **Akif'in işi**, senin değil — ama
zamanlaması sana bağlı.

> **Ricam:** `index.html` ya da `main.js`'e dokunmaya karar verirsen
> **başlamadan önce** Akif'e söyle. Çekim, frontend dondurulduktan **sonra**
> yapılabiliyor; ne zaman donacağını bilmeden çekim planlanamaz.
> Dokunmazsan bugünkü video final kalır ve nonce 7 serbest kalır.

---

## 5. DOKUNULMAYACAK MANTIK — dört bölge

Bunlar keyfi yasaklar değil. **Dördü de bu kod tabanında bir kez patladı**,
gerekçeleri kodun içinde uzun uzun yazılı. Bir yere dokunman gerekirse önce
üstündeki yorumu oku — hepsi "neden böyle" anlatıyor.

### 5.1 `syncSendButtons()` — tek kaynak kuralı · `main.js:92-129`

```javascript
function syncSendButtons() {
  const ready = Boolean(signed && connected);
  btnSend.disabled = !ready;
  btnNegativeProof.disabled = !ready;
}
```

İki butonun kilidi **yalnızca** buradan türer. **Hiçbir yerde koşulsuz
`btnSend.disabled = false` yazılmaz.** Kapatma her yerde olabilir, **açma tek
kaynaktan** (`main.js:606-609`).

Neden: Task 3B'de bir `finally` bloğu `btnKeygen.disabled = false` yazdı ve
keygen kilidini sessizce kaldırdı — kilidin sahibi state'ti, `finally` değil.
Aynı hata burada daha pahalı: başarılı gönderimden sonra imza tükenmişken
(`signed = null`, kontratın nonce'u arttı) açık kalan bir gönder butonu bir
sonraki imzayla **ikinci bir tx** gönderir.

**Cila için:** butonların görünümünü değiştir, `disabled` durumunu değiştirme.
`:disabled` için CSS yazacaksan serbest — kilidi CSS ile "açmaya" çalışma
(`pointer-events`, `opacity` ile disabled'ı gizlemek gibi).

### 5.2 Üç kalkanın SIRASI · `main.js:658-716`

Sıra tesadüf değil, her kalkanın yorumu neden o sırada olduğunu yazıyor:

| # | kalkan | yer | neden bu sırada |
|---|---|---|---|
| 1 | **nonce** taze mi | `:658-666` | en spesifik mesajı veren kalkan |
| 2 | **canlı digest** karşılaştırması | `:668-678` | kontrat *mevcut* nonce'u kullanır → ancak 1'den sonra anlamlı |
| 3 | **`eth_call` ön-uçuşu** | `:680-685` | en genel, gaz harcamaz |

Sonra **yayından hemen önce** iki son kontrol daha var (`:693-716`): bağlantı
değişti mi, imza düştü mü. Gerekçe kodda: *"tx yayınlandıktan sonra iptal diye
bir şey yok."*

Ayrıca `:682` — calldata **yalnızca** `fields`'tan kurulur, **DOM'dan yeniden
okunmaz.** Bir input'un `id`'sini değiştirirsen bu kural bozulmaz, ama
`invalidateSignature`'ın bağlı olduğu dinleyiciler kopabilir (§ 5.4).

### 5.3 `stage` değişkeni ve DURUM etiketleri · `main.js:40, 641-644, 684-734, 875-882`

`stage` akışın neresinde olduğumuzun kaydı: `'kontrol'` → `'preflight'` →
`'son-kontrol'` → `'metamask'` → `'zincir'`. Hata **nesnesine** alan yazılmıyor
(gerekçe `:636-639`: strict mode'da donmuş hata nesnesine atama `TypeError`
fırlatır ve teşhisi taşıyan mekanizma teşhisi yok eder).

`'zincir'` **tek bir yerde** atanıyor (`:734`, `onSubmitted` içinde) — tek
kaynak. Catch'teki etiket `stage`'den okunuyor, `e.txHash`'ten değil (`:870-873`).

Ekrandaki DURUM satırı tek bir yerden üretiliyor:

```javascript
// main.js:40
const statusLine = (label, cls) => `<p${cls ? ` class="${cls}"` : ''}><strong>DURUM: ${label}</strong></p>`;
```

Sekiz çağrı yeri ve etiketleri (ÖLÇÜM — `grep -no "statusLine('[^']*')"`):

| satır | etiket | sınıf |
|---|---|---|
| `:645` | `KONTROL` | — |
| `:683` | `KONTROL` | — |
| `:719` | `MetaMask ONAYI BEKLENİYOR` | — |
| `:736` | `ZİNCİRDE BEKLENİYOR` | — |
| `:762` | `ONAYLANDI` | `ok` |
| `:778` | `ZİNCİRDE REVERT` | `err` |
| `:836` | `REDDEDİLDİ (MetaMask)` | `warn` |
| `:882` | `stage`'den hesaplanan üç değer | `err` |

`:882`'nin üç değeri (`:877-881`): `ÖN-UÇUŞ (eth_call) BAŞARISIZ` ·
`SONUÇ ALINAMADI (tx gönderildi)` · `GÖNDERİLEMEDİ`.

**Cila için:** `statusLine`'ın **görünümünü** (punto, ağırlık, arka plan, kutu)
`main.js:40`'ta ya da CSS'te değiştirebilirsin. **Etiket metinlerini
değiştirme** — bunlar kanıt dosyalarında ve videoda geçiyor; birini
yeniden adlandırırsan yazılı kanıtla ekran ayrışır.

### 5.4 `invalidateSignature()` — imzayı düşüren kural · `main.js:131-148`

İmzadan sonra herhangi bir girdi değişirse imza **düşer**. Gerekçe (`:131-135`):
üç kalkanın hiçbirinin göremediği bir hata modu — calldata `fields`'tan
kurulduğu için tx eski değerlere gider, ekranda yeni değerler yazar, nonce
doğru, digest uyuşur, ön-uçuş geçer. **Her şey yeşil, kullanıcı yanlış bilgiye
bakıyor.**

`txOut` da temizlenir; temizlenmezse ekran kendi kendisiyle çelişir — aynı
karede `txOut` "imza üretildi", `sendOut` "imza geçersiz kılındı" der ve
**o kare demo kaydına giriyor** (`:140-143`).

**Cila için:** `tx-to` / `tx-value` / `tx-data` input'larının dinleyicilerini
koparma. `TX_INPUT_IDS` (`:88`) iki ayrı yerde geziliyor.

### 5.5 Bir tuzak daha — `.finding` ve `.neutral` renkleri birleştirme

`index.html:17-25`'te uzun bir yorum var ve bir tasarımcının en doğal
hareketini yasaklıyor: **palet sadeleştirirken bu iki sınıfı `.warn`/`.err`
ile birleştirmek.**

| sınıf | ne demek | neden ayrı |
|---|---|---|
| `.ok` | kanıt geçerli | yeşil |
| `.err` | işlem başarısız | kırmızı |
| `.finding` | kontrat cevap verdi ama **beklenen mesajı vermedi** — bulgu adayı | `.warn`'un 12px dipnot görünümü bunu sahnede gözden kaçırtır |
| `.neutral` | kontrata **ulaşılamadı**, kanıt ALINAMADI | gri **bilerek**: ekranda hiçbir hüküm iddia etmiyor |

Kullanım yerleri (ÖLÇÜM): `main.js:970`, `:1008`, `:1024`.

Bu dört sınıf **anlam taşıyor**, dekorasyon değil. Rengi değiştir, **ayrımı
koru** — özellikle `.neutral`'ın "hüküm yok" grisini yeşile ya da kırmızıya
çekme; ekran o anda bilmediği bir şeyi iddia etmiş olur.

---

## 6. Değişiklikten sonra ZORUNLU

### 6.1 Dört komut — yeşil taban ÖLÇÜLDÜ (25 Eylül 2026)

```
cd pq-safe/frontend
node src/format-test.mjs                #  8 assertion  → TÜM TESTLER GEÇTİ
node src/tx/build-transaction-test.mjs  # 21 assertion  → TÜM TESTLER GEÇTİ
node src/tx/send-transaction-test.mjs   # 99 assertion  → TÜMÜ GEÇTİ
npx vite build                          # ✓ built (106 ms)
```

Dördünü de bugün koştum, **hepsi yeşil**, sayılar planın beklediğiyle birebir.
`build` `dist/`e yazıyor ve `dist/` kök `.gitignore`'da — **çalışma ağacını
kirletmiyor** (ÖLÇÜM: build sonrası `git status --short frontend/` boş).

`send-transaction-test.mjs`'in sonunda **canlı Sepolia oracle'ı** var, ağa
çıkıyor. Orası düşerse sebep senin değişikliğin olmayabilir — anahtarsız bir
gateway'e bağlı. Saf testler dosyanın başında, canlı kısım sonda (bilerek,
`sprint4-screen-consistency.md` § 7.2).

### 6.2 Bu testlerin KORUMADIĞI şey — ÖLÇÜM

**Bu 4 test ekranı denetlemiyor.** Ölçtüm: depoda ekran metnini arayan **hiçbir
kod yok** — `grep -rn 'İmza ('` yalnızca `main.js`'in o metni *ürettiği* üç
satırı buluyor (`:140` yorum, `:252`, `:388`), *tüketen* bir yer yok.

Sprint 4'te `/İmza \(\d+ bayt\)/` deseniyle çalışan bir ekran oracle'ı vardı,
ama o **geçici bir tarayıcı betiğiydi ve depoda tutulmuyor**
(`sprint4-screen-consistency.md:84`, § 4); `window.__s4t1` kancası da
kaldırıldı (aynı dosya, "Kanca kaldırıldı, artık 0").

**Sonuç (ÇIKARIM):** DOM'u bozarsan hiçbir test kırmızı yanmaz. Ekranın tek
koruması gözle kontrol ve md5 kapısı. Bu yüzden:

- Ekran metnini değiştirdiysen **Akif'e söyle** — kanıt dosyalarındaki
  alıntılar ve video onunla eşleşiyor.
- Değişiklik sonrası **diff'i göster** (`git diff frontend/`), ki § 5'teki dört
  bölgeye dokunulmadığı görülsün. Plan da bunu istiyor
  (`son-5-gun-plani.md:239-240`).

---

## 7. Kapsam — Akif'le kararlaştırıldı

| dahil | hariç |
|---|---|
| Tipografi, boşluk, hizalama | Yapı ve akış değişikliği |
| Renk düzeni, başlıklar | Bölümlerin yeniden düzenlenmesi |
| Buton ve alan görünümü | Yeni özellik |
| Sayfa başlığı ve açıklama metinleri | `render.js` refactor'ü (Sprint 5) |

Son satır için bir uyarı: **`render.js` bu depoda yok.** Ölçüldü —
`find . -name "render*"` çıktı vermiyor. Planlanmış ama yazılmamış bir dosya
(`sprint4-screen-consistency.md:530`, Sprint 5'e ertelendi). Bir yerde adını
görürsen var sanma.

**Mevcut arayüz (ÖLÇÜM):** `index.html` 100 satır, inline `<style>` 20 satır,
sistem fontu, 720px sütun, gri çerçeveli 4 bölüm, `h1` 20px. Yani **tasarım
yönü diye bir şey hiç seçilmemiş** — ortada bozulacak bir estetik karar yok,
elin serbest.

---

## 8. Bende kalanlar

- `docs/` — rapor, kanıt dosyaları, bu notlar
- `contracts/src/verifier/` ve `SPHINCSVerifier.t.sol`
- Demo yeniden çekimi (sen dokunursan) — protokol § 4'te
- Rapor iskeleti (`docs/RAPOR.md`, Task 11) ve Akif bölümleri (Task 12)

---

## 9. Bu notun sınırı

- Her md5, test sayısı ve dosya durumu **25 Eylül 2026'da** ölçüldü. Depo
  değişmiş olabilir; şüphedeysen § 4 ve § 6.1'i **yeniden koş**.
- **Senin makinende çalıştığı ölçülmedi.** Yukarıdaki kurulum adımları bu
  makinede geçerli; `npm i` ve `npx vite`'ın sende sorunsuz koştuğunu
  görmedim. Patlarsa çıktıyı yolla.
- § 5'teki dört bölgenin **hepsi kod okumasıyla** doğrulandı, gerçek satır
  numaralarıyla. Ama *"bunlara dokunmak neyi bozar"* iddiası büyük ölçüde
  **kodun kendi yorumlarına ve geçmiş kayıtlara** dayanıyor — her senaryoyu
  yeniden koşup kırmadım.

---

# TARİHLİ EK — 25 Eylül 2026, aynı gün ikinci oturum

**Yukarısı değiştirilmedi.** Bu ek § 6.2'deki açığı kapatıyor.

§ 6.2 doğru bir şey söylüyordu — *"dört test ekranı korumuyor"* — ama sana
**yerine bir koruma vermiyordu.** Teşhis edip çözümsüz bırakmak, teşhis
etmemekten çok da iyi değil. Aşağıdaki kontrol o boşluğun **bir kısmını**
kapatıyor; neyi kapatmadığı Ek.5'te açıkça yazılı.

## Ek.1 JS'in DOM'dan aradığı her şey — ÖLÇÜM

`frontend/src` altında DOM'a dokunan **tek dosya `main.js`** (ÖLÇÜM:
`grep -rln "getElementById\|querySelector\|getElementsBy\|classList" src/`).

**`querySelector`, `querySelectorAll`, `getElementsByClassName`,
`getElementsByTagName` ve `classList` hiç kullanılmamış** — aynı grep sıfır
eşleşme veriyor. Erişimin tamamı `getElementById`. Bu iyi haber: kontrol edilecek
yüzey küçük ve kesin.

### 24 id (hepsi `getElementById`)

| id | `main.js` satırı |
|---|---|
| `btn-build-sign` | `:296` |
| `btn-check-connection` | `:273` |
| `btn-connect-wallet` | `:516` |
| `btn-import-mnemonic` | `:429` |
| `btn-keygen` | `:84`, `:207` |
| `btn-negative-proof` | `:79` |
| `btn-refresh-chain` | `:80` |
| `btn-send` | `:78` |
| `btn-sign` | `:239` |
| `chain-warn` | `:68` |
| `connection-out` | `:204` |
| `digest` | `:244` |
| `import-mnemonic` | `:432` |
| `keygen-out` | `:202` |
| `send-out` | `:69` |
| `sign-out` | `:203` |
| `tx-balance-display` | `:65` |
| `tx-data` | `:317` + dolaylı |
| `tx-nonce-display` | `:64` |
| `tx-out` | `:205` |
| `tx-to` | `:315` + dolaylı |
| `tx-value` | `:316` + dolaylı |
| `tx-wallet-display` | `:63` |
| `wallet-out` | `:77` |

**Dolaylı yol:** `TX_INPUT_IDS` (`:88`) üç id'yi dizi olarak tutuyor ve üç yerde
geziliyor — `:153` (imza düşürme dinleyicileri), `:364` ve `:628` (kilitler).
Bu üç id literal listede **zaten var**, yani dolaylı yol yeni id eklemiyor.
Ama dizi bozulursa kaybolan şey bir `getElementById` değil, **imzayı düşüren
dinleyici** olur (§ 5.4) — kontrol bunu görmez.

### 6 sınıf (JS'in DOM'a *yazdığı*, CSS'in tanımladığı)

| sınıf | `main.js`'te kaç yerde | `index.html` tanımı |
|---|---|---|
| `.field` | 23 | `:13` |
| `.err` | 21 | `:16` |
| `.warn` | 20 | `:15` |
| `.ok` | 10 | `:14` |
| `.neutral` | 2 (`:970`, `:1024`) | `:25` |
| `.finding` | 1 (`:1008`) | `:24` |

Toplam **77 kullanım**. `.finding` ve `.neutral`'ın neden ayrı durması
gerektiği § 5.5'te.

**Toplam yüzey: 24 id + 6 sınıf = 30 seçici.**

## Ek.2 Değişiklikten sonra koşacağın TEK komut

`frontend/` içinde, tek satır. Listeyi **elle tutmuyor** — her koşuda
`main.js`'ten yeniden çıkarıyor, yani yeni bir `getElementById` eklersen
kontrol onu kendiliğinden kapsar.

```
node -e 'const fs=require("fs");const m=fs.readFileSync("src/main.js","utf8"),h=fs.readFileSync("index.html","utf8");const ids=new Set([...m.matchAll(/getElementById\(([\x27"])([^\x27"]+)\1\)/g)].map(x=>x[2]));const a=m.match(/TX_INPUT_IDS = .*/);if(a)(a[0].match(/[\x27"][a-z][a-z0-9-]*[\x27"]/g)||[]).forEach(s=>ids.add(s.slice(1,-1)));const cls=new Set([...m.matchAll(/class="([^"{}]+)"/g)].flatMap(x=>x[1].trim().split(/\s+/)));const bad=[];ids.forEach(i=>{if(h.indexOf("id=\""+i+"\"")<0)bad.push("EKSIK id: "+i)});cls.forEach(c=>{if(!new RegExp("\\."+c+"\\s*\\{").test(h))bad.push("EKSIK class kurali: ."+c)});console.log("kontrol: "+ids.size+" id + "+cls.size+" class");if(bad.length){console.log(bad.join("\n"));process.exit(1)}console.log("HEPSI BULUNDU")'
```

Bulunamayan olursa **adını yazar** ve **çıkış kodu 1** döner; § 6.1'deki dört
komutun yanına beşinci olarak koyabilirsin.

**Depoya betik dosyası eklenmedi** (bilerek — kapsam dışı). Komut bu notta
duruyor, kopyala-yapıştır.

## Ek.3 Kırmızı/yeşil — ÖLÇÜM, 25 Eylül 2026

Üç durum da bu makinede koşuldu, çıktılar birebir:

**YEŞİL — bozulmamış ağaç**
```
kontrol: 24 id + 6 class
HEPSI BULUNDU
cikis: 0
```

**KIRMIZI 1** — `index.html`'de `id="btn-send"` → `id="btn-send-BOZUK"`
```
kontrol: 24 id + 6 class
EKSIK id: btn-send
cikis: 1
```

**KIRMIZI 2** — `<style>` içinde `.warn {` → `.note {`
```
kontrol: 24 id + 6 class
EKSIK class kurali: .warn
cikis: 1
```

**Geri dönüş doğrulandı:** her iki mutasyon geri alındı, `index.html`'in md5'i
`3b701338fe6107e0a241501ab261da73` — yani § 4'teki kapı değerine döndü — ve
`git diff index.html` **boş**. Depoda iz kalmadı.

## Ek.4 Komutun ilk hâli YANLIŞ NEGATİF verdi — kayda geçiyor

İlk yazdığım kontrol sınıfı düz metin araması yapıyordu (`h.indexOf("."+c)`).
KIRMIZI 2'yi **yakalayamadı**: `.warn` yeniden adlandırıldığı hâlde çıktı
`HEPSI BULUNDU` ve çıkış kodu 0 oldu.

**Sebep ölçüldü:** `.warn` dizisi `index.html:20`'deki açıklama yorumunun
içinde de geçiyor (*"`.warn`'un 12px'lik dipnot görünümü…"*), yani düz metin
araması CSS kuralı silinse bile eşleşiyordu.

**Düzeltme:** sınıf kontrolü artık **CSS kuralını** arıyor — `.<sınıf>` ve
ardından `{` (`new RegExp("\\."+c+"\\s*\\{")`). Yukarıdaki Ek.2 komutu
düzeltilmiş hâlidir; Ek.3'teki üç çıktı da onunla alınmıştır.

Bunu yazıyorum çünkü sınanmamış bir kontrol, kontrol değildir — id dalını
sınayıp sınıf dalını sınamasaydım, kontrolün yarısı doğrulanmamış hâlde sana
teslim edilmiş olacaktı.

## Ek.5 Bu kontrolün KORUMADIĞI şey — açıkça

Kontrol **seçicinin VARLIĞINI** doğrular. Başka hiçbir şeyi doğrulamaz:

| korur | KORUMAZ |
|---|---|
| `getElementById`'nin aradığı id `index.html`'de duruyor mu | O id **doğru elemanda** mı (butonun id'sini yanlışlıkla `<div>`'e taşımak) |
| JS'in yazdığı sınıfın CSS **kuralı** duruyor mu | Kuralın **içeriği** doğru mu — `.neutral`'ı kırmızı yapmak kontrolden geçer |
| — | **Görsel doğruluk.** Hizalama, kontrast, okunabilirlik: hiçbiri |
| — | **Eleman sırası ve yerleşimi.** İki bölümü yer değiştirirsen sessiz geçer |
| — | `TX_INPUT_IDS` dinleyicilerinin bağlı kalması (§ 5.4) |
| — | **Hiç gözlenmemiş ekranlar** — aşağıya bak |

### Hiç gözlenmemiş iki ekran

`DURUM: ZİNCİRDE REVERT` (`main.js:778`) ve `DURUM: SONUÇ ALINAMADI
(tx gönderildi)` (`:880`) **hiç gözlenmedi** — açık kalem, `2026-09-25-devir.md`
§ A.3 #6. Bu iki yol yalnızca kodda var; ne testi var, ne ekran görüntüsü.

Bu kontrol onları da korumaz ve koruyormuş gibi okunmasın: `statusLine`'ın
ürettiği HTML'i bozarsan kontrol yine `HEPSI BULUNDU` der, çünkü `.err`
kuralı yerinde durur. Gözlenmemiş bir yolu bozup bozmadığını anlamanın bu
depoda bir yolu yok.

**Ayrım net olsun:** kontrat davranışı Foundry ile kanıtlı
(`contracts/test/PQWallet.t.sol:100-110`, `receipt.status === 0` testi var ve
geçiyor). Kanıtsız olan **arayüzün** o durumdaki ekranı.

### Sonuç

Bu kontrol § 6.2'deki boşluğu **kapatmıyor, daraltıyor.** En sık ve en sessiz
kırılmayı (bir id ya da sınıfı yeniden adlandırmak) yakalıyor. Geri kalanı
hâlâ **gözle kontrol + md5 kapısı**. Ekran metnini ya da yerleşimi
değiştirdiysen Akif'e söyle.
