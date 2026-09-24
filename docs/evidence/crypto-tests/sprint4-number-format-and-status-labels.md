# Sprint 4 — Sayı biçimi ve gönderim DURUM etiketleri (video öncesi UI geçişi)

**Tarih:** 24 Eylül 2026
**Yazan:** Akif
**Ağ:** Sepolia (chainId `11155111`)
**Araçlar:** Node.js v22.21.0, Vite 8.2.2, Foundry `cast`, Chrome + MetaMask
**Kapsam:** okunabilirlik. Yeniden tasarım DEĞİL; renk, düzen, bileşen
değişmedi, `render.js` tesisat refactor'ü yine Sprint 5'te.

> **ZİNCİRE TX ATILMADI.** İş öncesi ve iş sonrası `nonce()` = **5**, bakiye
> değişmedi. Owner mnemonic'i tarayıcıya **Akif tarafından elle girildi**;
> `.env.pqwallet-owner-key` açılmadı, cat edilmedi, hiçbir komuta verilmedi.
> Nonce 5 kayıtlı demo için ayrılmış durumda ve **yerinde kaldı**.

---

## 1. Bu belge ne kanıtlıyor, ne kanıtlamıyor

| | |
|---|---|
| **Kanıtlıyor** | gas/wei değerleri ekranda binlik ayraçlı ve birim etiketli basılıyor; ön-uçuş başarısızlığı generic hata dalından ayrılıyor; MetaMask reddi kendi etiketiyle görünüyor ve buton kilidi geri açılıyor |
| **Kanıtlamıyor** | `DURUM: ONAYLANDI` ve `DURUM: ZİNCİRDE REVERT` satırlarının ekranda nasıl göründüğü. İkisi de **gerçek bir tx gerektiriyor** ve bu görevde tx atılmadı — yalnızca kodda var, **ekranda görülmedi** (§ 5) |

---

## 2. Madde 1 — sayı biçimi

### Değişen dört basım yeri

| dosya:satır | önce | sonra |
|---|---|---|
| `main.js:166` | `${b} wei = ${formatEther(b)} ETH` | `fmtWei(b)` |
| `main.js:376` | `${fields.value} wei = …` | `fmtWei(fields.value)` |
| `main.js:705` | `${esc(receipt.gasUsed)} kullanıldı (limit: …)` | `esc(fmtGas(receipt.gasUsed))` … |
| `main.js:763` | `bakiye: ${esc(chainState.balance)} wei = …` | `esc(fmtWei(chainState.balance))` |

### Kapsam dışı bırakılanlar — gerekçeli

- **Bayt sayıları** (`İmza (3688 bayt)`): ekran tutarlılığı testinin oracle'ı
  `/İmza \(\d+ bayt\)/` (`sprint4-screen-consistency.md:89`). Ayraç o regex'i
  kırar ve test sessizce boş assertion'a döner.
- **Blok numaraları**: Etherscan'de ayraçsız yazılı, kanıt birebir eşleşmeli.
  Karar Akif'in (24 Eylül).

### Biçimlendirme ayrı modülde — ÖLÇÜM boşluğu kapatıldı

İlk raporda çıktı `node -e` içine **elle yazılmış bir kopyadan** üretilmişti;
kopya ile ürünün aynı şeyi yaptığı **ölçülmemişti**. `frontend/src/format.js`
(DOM'suz, saf) o boşluğu kapatıyor: `main.js:5` oradan import ediyor, node
**aynı modülü** import ediyor.

```
$ node src/format-test.mjs
✓ fmtGas: ölçülen gasUsed (nonce 4 tx)              216.269 gas
✓ fmtGas: zincirdeki gaz limiti                     262.983 gas
✓ fmtGas: GAS_FALLBACK                              350.000 gas
✓ fmtWei: cüzdan bakiyesi biçimi (17 hane)          50.600.000.000.000.000 wei = 0,0506 ETH
✓ fmtWei: demo value (0,0001 ETH)                   100.000.000.000.000 wei = 0,0001 ETH
✓ fmtWei: tam ondalık korunuyor — yuvarlama YOK     1.000.000.000.000.000.001 wei = 1,000000000000000001 ETH
✓ fmtWei: sıfır                                     0 wei = 0,0 ETH
✓ fmtWei: tam 1 ETH                                 1.000.000.000.000.000.000 wei = 1,0 ETH
TÜM TESTLER GEÇTİ · çıkış 0
```

### Test boş değil — kırmızı/yeşil kontrolü (ÖLÇÜM)

`format.js` geçici olarak iki ayrı şekilde bozuldu, sonra yedekten geri alındı.
Hash önce ve sonra aynı: `2ee1607ac10816c3cac99c09eaffb849a3f85372652bfd5a560562af1e680105`.

| bozma | sonuç |
|---|---|
| `tr-TR` → `en-US` | **7 kırmızı**, çıkış 1 |
| `nf.format(wei)` → `nf.format(Number(wei))` | **1 kırmızı**, çıkış 1 |

**Bozma 2 bir iddia çürüttü.** Assertion'ın ilk adı *"17 hane —
Number.MAX_SAFE_INTEGER üstü"*dü, yani Number dönüşümüne karşı koruduğunu ima
ediyordu. **Korumuyor:** `Number(50600000000000000n)` bir double olarak tam
temsil edilebiliyor, o yüzden bozmada **yeşil kaldı**. Number hatasını yakalayan
**tek** satır `1000000000000000001n`; orada bir hane kayboluyor
(`…001` → `…000`). Assertion'ın adı daraltıldı, neyi kanıtlamadığı teste yorum
olarak yazıldı.

İkinci sınır: `fmtWei(0n)` ayraç bozmasında da yeşil kaldı — ayraçsız tek hane
olduğu için yerelleştirmeye duyarsız. Ondalık tarafını korur, ayracı korumaz.

### Oracle taraması — biçim değişikliği ÖNCESİ

Altı grep koşuldu (`docs` + `frontend`, `node_modules`/`dist` hariç): regex
çağrıları (`.test/.exec/.match/.replace/new RegExp`), `includes/indexOf/
startsWith/endsWith`, docs'ta yazılı `grep` komutları, ekran metni alıntıları,
gizli tarayıcının eşikleri, ve plan dosyasındaki elle kontrol.

**Gerçekten ARAMA yapan desenler** ürünün ürettiği dizelerle sınandı (`format.js`
import edilerek, `esc()` uygulanmış hâliyle):

| desen | yer | eşleşmesi gereken | sonuç |
|---|---|---|---|
| `/İmza \(\d+ bayt\)/` | `sprint4-screen-consistency.md:89` | `İmza (3688 bayt)` | **EŞLEŞTİ** — yeni gas/wei dizelerine de yanlışlıkla düşmüyor |
| `\b(?:0x)?[0-9a-fA-F]{64}\b` | `scan-secrets.mjs:118` | hiçbiri | eşleşmedi ✓ |
| `\b[A-Za-z0-9_-]{28,}\b` | `scan-secrets.mjs:124` | hiçbiri | eşleşmedi ✓ |
| `\b0x[0-9a-fA-F]{40}\b` | `scan-secrets.mjs:127` | hiçbiri | eşleşmedi ✓ |
| `/[&<>"']/g` (`esc`) | `main.js:31` | hiçbiri | eşleşmedi ✓ — yeni ayraçlar kaçış sınıfında değil |
| `GAS_FALLBACK\|estimateGas\|preflight` | `plan …report.md:1143` | main.js ≥1 | **EŞLEŞTİ** (sendTransaction 5, main 4) |

**Eşleşmesi gerekip eşleşmeyen desen yok.**

Taramada çıkan ~40 satırın geri kalanı **arama yapmıyor**: Foundry `forge test`
çıktıları (`[PASS] … (gas: 383119)`), tarihli ekran transkriptleri
(`sprint3-end-to-end-transaction.md:41`, `sprint3-three-shields.md:119,384`,
`sprint3-ui-chain-rewiring.md:37,57`, `sprint4-browser-signing.md:492`), plan
belgelerindeki eski kod alıntıları ve `tx-hashes.md`'nin elle tutulan tablosu.
**Defter kuralı gereği hiçbiri yeniden yazılmadı** — o kareler o günün biçimine
aittir.

---

## 3. Madde 2 — DURUM etiketleri

### Tasarım: `let stage`, hata nesnesine yazma YOK

Ön-uçuş başarısızlığını generic hata dalından ayırmak için hata nesnesine alan
yazılmadı (`e.pqStage = …` gibi). Gerekçe Akif'ten: modül strict mode; donmuş ya
da genişletilemez bir hata nesnesine atama **TypeError fırlatır ve o TypeError
orijinal hatayı EZER** — teşhis, teşhisi taşıyan mekanizma yüzünden kaybolurdu.

Yerine handler'a yerel `let stage` (`main.js:642`), dış `catch` onu `:840`'ta
okuyor. **Preflight etrafında ek `try` yok, yeniden fırlatma yok, hata nesnesi
değişmiyor.**

**Tasarıma bir ekleme yapıldı:** `stage`, ön-uçuş **döndükten sonra**
`'son-kontrol'`e bırakılıyor (`main.js:689`). Bırakılmasaydı, ön-uçuştan SONRA
gelen iki kontrol (bağlantı değişimi `:694`, imza değişimi `:710`) hata
verdiğinde ekrana **"ÖN-UÇUŞ (eth_call) BAŞARISIZ"** yazardı — kontratta olmayan
bir sorunu arattıran yanlış etiket. Eşleme bozulmuyor: `'son-kontrol'` de
`stage === 'preflight'` değil, yani GÖNDERİLEMEDİ'ye düşüyor.

### Etiket eşlemesi

| satır | etiket | sınıf | ekranda görüldü mü |
|---|---|---|---|
| 641 | `DURUM: KONTROL` | sınıfsız | **GÖZLENMEDİ** (§ 5) |
| 681 | `DURUM: KONTROL` (ön-uçuş) | sınıfsız | **GÖZLENMEDİ** (§ 5) |
| 717 | `DURUM: MetaMask ONAYI BEKLENİYOR` | sınıfsız | **EVET** (§ 4.2) |
| 742 | `DURUM: ONAYLANDI` | `.ok` | **HAYIR** — tx gerekir (§ 5) |
| 758 | `DURUM: ZİNCİRDE REVERT` | `.err` | **HAYIR** — tx gerekir (§ 5) |
| 816 | `DURUM: REDDEDİLDİ (MetaMask)` | `.warn` | **EVET** (§ 4.2) |
| 843 | `ÖN-UÇUŞ (eth_call) BAŞARISIZ` / `GÖNDERİLEMEDİ` | `.err` | **EVET** (§ 4.1) |

Mevcut `headline: reason` satırı aynen duruyor. İkisi farklı soruları
cevaplıyor: etiket "akış nerede koptu", headline "tx yayınlandı mı"
(`e.txHash`).

### Kısıt doğrulaması — diff üzerinden (ÖLÇÜM)

```
$ git diff -U0 frontend/src/main.js | grep -E "^[+-].*syncSendButtons"
(çıktı yok — syncSendButtons'ın tek satırına dokunulmadı)

$ git diff -U0 frontend/src/main.js | grep -E "^\+.*disabled = false"
(çıktı yok — koşulsuz açma eklenmedi)

$ git diff -U0 frontend/src/main.js | grep -E "^[+-].*(readNonce|readDigest|await preflight)"
(çıktı yok — üç kalkanın çağrılarının hiçbiri diff'te değil)
```

Kaynaktaki gerçek sıra:

```
656  KALKAN 1  →  659  await readNonce()
666  KALKAN 2  →  670  await readDigest(...)
678  KALKAN 3  →  683  await preflight(...)
```

`stage` atamaları 642 / 682 / 689 / 716 / 722 — hepsi düz atama, hiçbiri `await`
içermiyor, hiçbiri kontrol akışını dallandırmıyor.

---

## 4. Tarayıcı ölçümleri

Dev sunucu `npx vite --port 5173`, `http://localhost:5173/`.
Bağlı hesap `0xe0BF2D190f8e2F2fc97cF19244845F8FeBDB7351` (gas ödeyen; PQWallet'ın
sahibi DEĞİL — sahiplik C13 imzasıyla kanıtlanır).

### 4.1 Test 1 — ön-uçuş etiketi + kanarya (owner anahtarı KULLANILMADI)

Rastgele anahtar (`btn-keygen`) ile koşuldu; imza geçersiz olduğu için kontrat
ön-uçuşta reddetti. **MetaMask onay penceresi hiç açılmadı**, zincire hiçbir şey
gitmedi.

| gözlem | ekranda |
|---|---|
| bakiye göstergesi | `50.600.000.000.000.000 wei = 0,0506 ETH` |
| nonce göstergesi | `5` (ayraçsız — kapsam kararı gereği) |
| imza | `✓ imza uzunluğu 3688 bayt (C13 beklenen)`, `imzalama tamamlandı (9303.4 ms)` |
| keygen | `keygen tamamlandı (390.7 ms)` |
| **DURUM satırı** | **`DURUM: ÖN-UÇUŞ (eth_call) BAŞARISIZ`** |
| altındaki mevcut satır | `Gönderilemedi: PQWallet: invalid signature` |

Sebep metni kontrattan geldi (`PQWallet.sol:44`'teki require string'i), UI'dan
değil. Madde 1 ve Madde 2'nin ikisi de aynı karede doğrulandı.

**İmzalama süresi 9.303,4 ms** ölçüldü; koddaki yorum ve ekrandaki metin
*"~7-8 sn"* diyor. Küçük sapma, düzeltilmedi — ayrı kalem.

**Kanarya — kapsamıyla:** keygen çıktısında yalnız `pkSeed`, `pkRoot`,
`publicKey` ve ECDSA adresi göründü; mnemonic yok, "12 kelime" etiketi yok,
nokta maskesi yok. **Bu GÖRSEL bir kontroldür.** `sprint4-screen-consistency.md`
§ 7b'deki **betikli** kanarya (ardışık BIP-39 kelime dizisi taraması +
`window.__s4t2` kancası) bu görevde **yeniden koşulmadı** — o betik repoda
tutulmuyor. Görsel kontrol betikli taramadan **zayıftır** ve öyle okunmalıdır.

### 4.2 Test 2 — REDDET yolu (owner mnemonic'i elle girildi)

Owner mnemonic'i içe aktarıldı → `✓ Zincirdeki ownerPublicKey ile AYNI`.
`to` = PQWallet'ın kendi adresi, `value` = `100000000000000`, `data` = `0x`.

**Gönderim akışı sırasında alınan ekran görüntüsü** (MetaMask onay penceresi
açıkken) iki şeyi birden gösteriyor:

1. **İş-sürerken kilidi çalışıyor:** `Digest hesapla ve imzala`, `Zincire
   gönder` ve `Bozuk imzayla dene` — **üçü de gri**. Yalnız `Cüzdanı bağla`
   aktif.
2. MetaMask penceresi: `Network: Sepolia`, `Interacting with 0x2EafA…000BB`,
   `Network fee 0.0009 SepoliaETH`, `Speed Market ~12 sec`.

**Cancel'a basıldı.** Sonuç:

```
DURUM: REDDEDİLDİ (MetaMask)
İşlem MetaMask'te iptal edildi. İmza hâlâ geçerli, tekrar gönderebilirsiniz.
```

**Buton kilidi:** `Zincire gönder` ve `Bozuk imzayla dene` reddedişten sonra
**tekrar tıklanabilir** — imza tüketilmedi, bağlantı duruyor, `syncSendButtons`
tek kaynaktan doğru cevabı verdi.

**Zincir doğrulaması — iptalin gerçekten iptal olduğu:**

| | blok | `nonce()` | bakiye (wei) |
|---|---|---|---|
| iş öncesi · 16:42:37 UTC | 11773297 | **5** | 50600000000000000 |
| cancel sonrası · 16:53:01 UTC | 11773349 | **5** | 50600000000000000 |

52 blok geçti, iki değer de değişmedi.

### 4.3 Yan gözlem — görev dışı, hüküm değil

MetaMask onay penceresinde **"Added protection" kutusu İŞARETLİ**ydi. §8'in
aday 2 tartışmasında bu kutunun durumu geçiyor. **Bu koşuda tx atılmadı, gas
verisi YOK** — kayda geçen tek şey kutunun bu oturumda işaretli olduğudur.
§8'in hükmüne dokunmaz.

---

## 5. Ölçülmeyenler — açıkça

1. **`DURUM: ONAYLANDI` ekranda görülmedi.** Gerçek bir başarılı tx gerektirir;
   nonce 5 kayıtlı demoya ayrılı. Kodda `main.js:742`'de duruyor, davranışı
   **ölçülmedi**. Kayıtlı demo koşusunda görülecek.
2. **`DURUM: ZİNCİRDE REVERT` ekranda görülmedi.** Aynı gerekçe
   (`main.js:758`).
3. **`DURUM: KONTROL` gözlenmedi.** Bir saniyeden kısa sürüyor ve
   yakalanmadı — "çalışıyor" denmiyor.
4. **Receipt beklenirken ayrı bir satır YOK — ölçüldü, DÜZELTİLMEDİ.**
   `sendOut`, MetaMask onayından sonra `sendExecute` dönene kadar hiç
   yazılmıyor; `sendExecute` (`sendTransaction.js:197-238`) `estimateGas` →
   `sendTransaction` → `tx.wait()` yapıyor ve **hiçbir UI yazması içermiyor**.
   Yani kullanıcı onayladıktan sonra blok gelene kadar ekranda hâlâ *"MetaMask
   ONAYI BEKLENİYOR"* yazıyor — onaylamış olmasına rağmen. Sprint 3
   ölçümlerinde bu pencere 12-15 saniyeydi; kayıtta görünür bir yanlış etiket
   olur. Talimat gereği eklenmedi, **ayrı karar**.
5. **Betikli mnemonic kanaryası yeniden koşulmadı** (§ 4.1). Yapılan görsel
   kontroldür.
6. **Negatif kanıt handler'ı kapsam dışı** (Akif onayladı) — kendi üç sonucu
   zaten `.ok`/`.finding`/`.neutral` ile ayrışıyor, DURUM satırı almadı.

---

## 6. İş sonu zincir okuması

**Etiket: iş sonrası okundu.**

| | |
|---|---|
| okuma anı | blok **11773359** · **2026-09-24 16:55:09 UTC** |
| `nonce()` | **5** |
| bakiye | **50600000000000000** wei · **0,0506 ETH** |
| uç | `ethereum-sepolia-rpc.publicnode.com` (`cast call` / `cast balance`) |

İş öncesi okumayla (blok 11773297, `nonce()` 5, aynı bakiye) **birebir aynı**.
Nonce 5 kayıtlı demo için **bozulmadan duruyor**.

> **ŞERH.** Bu okuma, aradaki 62 blokta PQWallet'a hiçbir işlem gitmediğini
> **doğrudan ölçmez** — blok aralığı taranmadı. Doğrudan ölçtüğü şey: bu oturumda
> bizim gönderdiğimiz bir tx yok ve iki değer de başlangıç noktasında. Aradaki
> pencerede üçüncü bir taraftan gelip hem nonce'u hem bakiyeyi beklenen noktada
> bırakan bir işlem **ÇIKARIM yoluyla** eleniyor, ölçümle değil.

---

## 7. Test paketi

```
node src/format-test.mjs                                        → 8 ✓
node src/tx/build-transaction-test.mjs                          → 21 ✓
node src/tx/send-transaction-test.mjs                           → 83 ✓  (taban 83)
CAST_EXPECTED="$EXPECTED" node src/contracts/pqwallet-test.mjs  → 9 ✓   (cast oracle)
npx vite build                                                  → ✓ built in 175ms
```

`send-transaction-test.mjs`'in 83'ü `sprint4-screen-consistency.md:514`'teki
tabanla birebir aynı — assertion kaybı yok.

`format-test.mjs` `docs/FRONTEND-KURULUM.md`'deki test listesine eklendi;
beklenen sayı satırı `83 · 21 · 9` → **`8 · 83 · 21 · 9`**. Depoda testlerin
hepsini koşan **tek bir komut yok** (`package.json`'da `scripts` alanı tanımsız,
`frontend/scripts/` altında test betiği yok) — bu liste kanonik yer.

---

## 8. Kapsam dışı kalanlar / devredenler

- Madde 3 (mnemonic'in DOM'a yazılması) ve Madde 4 (bayat imza bloğu) **zaten
  kapalıydı** — commit `a64129b` ve `6722910`, kanıt
  `sprint4-screen-consistency.md` § 7b ve § 5. Bu görevde kod değişmedi.
- `render.js` tesisat refactor'ü ve sekiz yazma bölgesinin birleştirilmesi
  **Sprint 5**'te (`sprint4-screen-consistency.md:530`).
- İmzalama süresi metni ("~7-8 sn") ile ölçülen 9,3 sn arasındaki sapma
  düzeltilmedi.
- § 5'in 4. maddesi (receipt beklerken yanlış etiket) karara bağlanmadı.
