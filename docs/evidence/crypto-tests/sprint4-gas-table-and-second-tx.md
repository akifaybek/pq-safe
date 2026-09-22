# Sprint 4 — Gas tablosu ve ikinci tx (Task 5 faz 1 / Task 6 faz 2)

Plan: `docs/superpowers/plans/2026-09-14-sprint4-demo-measurement-report.md`
Başlangıç commit'i: `ae02020`

---

## 0. Kapı ve ön koşullar

### Adım 0 — NONCE KAPISI

`cast nonce <PQWALLET>` **kullanılmadı.** Kontrat hesabında EIP-161 gereği her
zaman `1` döner; replay korumasını sağlayan sayı kontratın storage'ındaki
`nonce()` değişkeni ve ona ancak `cast call` ile bakılır. Planın 585. satırı bu
yüzden düzeltilerek koşuldu (plan dondurulmuş, düzeltme kaydı
`.superpowers/sdd/progress.md`).

| zaman (UTC) | blok | `nonce()` | bakiye (wei) | hane | ne |
|---|---|---|---|---|---|
| 2026-09-19 08:46 | 11736605 | 2 | 50900000000000000 | 17 | ön-kontrol |
| 2026-09-20 11:56 | 11744141 | 2 | 50900000000000000 | 17 | ön-kontrol |
| 2026-09-20 12:21 | 11744259 | 2 | 50900000000000000 | 17 | **KAPI** |

**Üç okuma da birbirinin yerine geçmez.** Kapının koruduğu şey oturum anıdır:
araya giren bir `execute()` herhangi bir okumadan sonra da girebilir. Tabloya
kapı olarak yalnızca son satır girer; ilk ikisi ön-kontroldür.

```
B0 = 50900000000000000 wei · 17 hane · 0,050900000000000000 ETH
```

#### EK — 22 Eylül: Task 6'nın KENDİ kapısı

Yukarıdaki tablo **Task 5'in** kapısıdır; son satırındaki **KAPI** etiketi Task 5
faz 1'e aittir ve **öyle kalır**. Task 6 aynı okumayı devralamaz: kapının
koruduğu şey **oturum anı**dır, araya giren bir `execute()` herhangi bir
okumadan *sonra* da girebilir. Bu yüzden Task 6 kendi kapısını koştu.

| zaman (UTC) | blok | `nonce()` | bakiye (wei) | hane | Task 6 açısından ne |
|---|---|---|---|---|---|
| 2026-09-19 08:46 | 11736605 | 2 | 50900000000000000 | 17 | ön-kontrol |
| 2026-09-20 11:56 | 11744141 | 2 | 50900000000000000 | 17 | ön-kontrol |
| 2026-09-20 12:21 | 11744259 | 2 | 50900000000000000 | 17 | ön-kontrol (Task 5'in kapısıydı) |
| **2026-09-22 19:51** | **11760035** | **2** | **50900000000000000** | **17** | **TASK 6 KAPISI** |

Koşulan komut — `cast nonce` **değil**, kontratın storage'ındaki değişken:

```bash
cast call 0x2EafA294C14b6752128bfd4f5873D1EA39f000BB "nonce()(uint256)" \
  --rpc-url https://sepolia.gateway.tenderly.co
cast balance 0x2EafA294C14b6752128bfd4f5873D1EA39f000BB \
  --rpc-url https://sepolia.gateway.tenderly.co
```

```
B0 (Task 6) = 50900000000000000 wei · 17 hane · 0,050900000000000000 ETH
```

**BEKLENTİ — ölçümden ÖNCE yazıldı, 22 Eylül 2026 19:51 UTC:**

> Adım 8'de beklenen bakiye = `B0 − value`
> = `50900000000000000 − 100000000000000`
> = **`50800000000000000` wei · 17 hane · 0,0508 ETH**

Düşüş **tam `value` kadardır**: gas cüzdandan değil, gönderen EOA'dan ödenir.
Bu satır Adım 8 koşulmadan yazıldı ve commit'lendi; sonradan ayarlanamaz.

**ÖLÇÜM PENCERESİ İHLAL EDİLMEDİ.** 19 Eylül 00:00'da açılan pencere boyunca
`nonce()` **2**'de kaldı — dört okumanın dördü de 2. Pencere, PQWallet'a plan
dışı hiçbir `execute()` girmediği iddiasını taşıyor ve bu okuma onu **22 Eylül
19:51'e kadar** uzatıyor. **Hakan'ın 22 Eylül teyidi de aynı yönde:** PQWallet'a
plan dışı `execute()` yok. İki kaynak bağımsız — biri zincir okuması, biri
Hakan'ın beyanı — ve **çelişmiyorlar**.

Task 6 Adım 8'in `B0 - value` formülünün girdisi budur.

> **HANE KURALI — bu turda fiilen gerekti.** Kapı sonucu sohbete aktarılırken
> bakiye **14 haneye** düştü (`50900000000000`, 0,0000509 ETH — bindebiri).
> Zincirde bir şey olmamıştı, aktarımda hane kaybolmuştu; ama mesajın kendisi
> iki ihtimali ayırt etmiyordu ve ikincisi doğru olsaydı Task 6'nın göndereceği
> 0,0001 ETH cüzdanda olmazdı, gerçek tx kaydın ortasında zincirde düşerdi.
> Bu yüzden **her wei değeri üç gösterimle yazılır: ham sayı · hane sayısı ·
> ETH karşılığı.** Üçü birbirini tutmuyorsa değer kabul edilmez.
> Teyit ikinci bir okumayla alındı: `cast balance --ether` →
> `0.050900000000000000`.

### Adım 3 — C adresinin boşluğu

`C = 0xD999e3B2e4bE3D3ECb7523b8Cb4F4Dc99e2734Fc`

2026-09-20 12:11 UTC, blok 11744214, publicnode:

```
cast balance  → 0
cast nonce    → 0
cast code     → 0x
```

Üçlü tuttu, C satırı ölçülebilir. `cast nonce` burada **doğru** komuttur:
C bir EOA adresi ve ölçülen şey zaten hesap nonce'u.

> Bu da tarihli bir okumadır. 19 Eylül 11:18 UTC'de aynı üçlü alınmıştı ve o
> okuma bugünün boşluğunu göstermiyordu; bugünkü okuma da gönderim anının
> boşluğunu göstermez. Planın kendi cümlesi: *"faz 1'de boş olması haftaya boş
> olduğunu göstermez."* C'ye fon girerse `+25.000` boş-hesap-oluşturma kalemi
> düşer ve C satırının beklenen değeri çürür — beklenti değil, ön koşul.

### Adım 1–2 — ölçüm kancası

`window.__m4` `frontend/src/main.js` sonuna eklendi. Kanca **yeni mantık
yazmıyor**: dondurulmuş `buildAndSign`'ı, `main.js:656`'daki `encodeExecute`
çağrısını ve `sendTransaction.js:201`'deki tahmin satırının birebir aynısını
çağırıyor.

```
KANCALI_MD5 = 714049c4373ac16f5534597c364560ab   (frontend/src/main.js, 988 satır)
```

`npx vite build` yeşil (190 modül, 174 ms). Kanca Task 5B Adım 2'de silinecek;
kayıt **kancasız ve commit'li** ağaçtan alınacak.

---

## 1. BEKLENEN DEĞERLER — ölçümden ÖNCE yazıldı

**Bu bölüm Adım 6 koşulmadan önce yazılmıştır** (plan Adım 9). Yazılma anı:
2026-09-20, `nonce()` kapısı açılmadan ve mnemonic girilmeden önce.

Yürütme sütununda beklenen:

```
B − A = +2.500      (EIP-2929 soğuk hesap erişimi: 2.600 − 100)
C − A = +27.500     (+2.500 soğuk erişim, +25.000 boş hesap oluşturma)
```

**Tutmazsa hipotez çürümüştür ve öyle yazılır.**

### Hipotezin ön koşulu: `from` üç çağrıda da AYNI

A satırı "sıcak alıcı"dır ve sıcak olmasının **tek** sebebi `execute()`'un iç
`to`'sunun tx göndericisiyle aynı adres olmasıdır (EIP-2929 `tx.origin`'i baştan
sıcak listeye koyar). MetaMask'te hesap değişirse `from` sessizce kayar, A'nın
iç alıcısı soğur, tahminine `+2.500` girer, `B − A ≈ 0` çıkar ve yanlışlıkla
"hipotez çürüdü" yazılır. Çürüyen hipotez değil, **ölçümün ön koşulu** olur.

Bu yüzden `from` örtük davranışa bırakılmıyor, **ölçülüyor**: kanca
`signer.getAddress()` sonucunu döndürüyor. `"bitti"` ölçütü: on beş çağrının
on beşinde de `from` aynı ve `A` adresine eşit.

> **Örtük dolduruluş kaynaktan teyit edildi:** `signer.estimateGas()` çağrıyı
> sağlayıcıya vermeden önce `populateCall`'dan geçiriyor ve `from` boşsa
> `pop.from = signer.getAddress()` yapıyor
> (`ethers@6.17.0`, `lib.commonjs/providers/abstract-signer.js`, else dalı).
> Yani sıfır adresi varsayımı bu yolda oluşmuyor — Δ₁ de aynı yoldan geldiği
> için tabanı sağlam. Kanca yine de ayrıca ölçüyor: teyit edilmiş davranış,
> ölçülmüş değerin yerine geçmez.

### Adresler

| satır | iç `to` | adres | neden |
|---|---|---|---|
| A | `from`'un kendisi | `0xe0bf2d190f8e2f2fc97cf19244845f8febdb7351` | sıcak alıcı |
| B | var olan başka adres | `0x7268a7c3d52baa50486930e6ed25d29804d075b6` | soğuk, dolu (Hakan EOA) |
| C | boş adres | `0xD999e3B2e4bE3D3ECb7523b8Cb4F4Dc99e2734Fc` | soğuk, boş |

Satırlar arasındaki **tek değişken** `execute()`'un iç `to`'sudur. `value` üçünde
de `100000000000000n` (0,0001 ETH), `data` üçünde de `0x`.

---

## 2. Tekrar testi — Adım 6

20 Eylül, tarayıcı konsolu, A→B→C sırası **iç içe** beş tur (plan gereği: art
arda beş çağrı tek arka uca düşüp o düğümün önbelleğini ölçebilirdi).

**Beş koşunun beşi de her satırda BİREBİR AYNI.** `ham`, `bayt`, `sıfır`,
`yürütme` kümelerinin dördü de her satırda tek elemanlı — yayılım **sıfır**.

```
A: ham_tekil [219189] · bayt_tekil [3908] · sifir_tekil [203] · yurutme_tekil [138097]
B: ham_tekil [221685] · bayt_tekil [3908] · sifir_tekil [205] · yurutme_tekil [140617]
C: ham_tekil [246871] · bayt_tekil [3908] · sifir_tekil [206] · yurutme_tekil [165815]
```

Bu **iki ayrı şeyi** gösteriyor ve ikisi de ayrı yazılmalı:

1. **C13 imzalama sabit girdide deterministik.** Aynı `(nonce, to, value, data)`
   üçlüsü beş kez imzalandı, calldata bayt sayısı ve sıfır bayt sayısı beşinde
   de aynı çıktı. Rastgele tuz kullanılsaydı sıfır bayt sayısı turdan tura
   oynardı.
2. **`estimateGas` bu sağlayıcıda deterministik.** Aynı calldata beş kez
   tahmin edildi, beşinde de aynı sayı döndü.

Birincisi imzalayıcının, ikincisi node'un özelliği. Tek satırda "tekrarlar
aynı çıktı" yazılsaydı hangisinin gösterildiği belirsiz kalırdı.

### `from` ön koşulu — "bitti" ölçütü KARŞILANDI

```
from tekil: 1 | hepsi A: true
```

On beş çağrının on beşinde de `from` = `0xe0BF2D190f8e2F2fc97cF19244845F8FeBDB7351`,
yani A. Satırlar arasındaki tek değişken `execute()`'un iç `to`'su olarak kaldı.

### Konsol hata sayacı — bu koşu EKLENTİLİ profilde

Açılışta **21**, ölçüm sonunda **30**. Tırmanış ölçümden değil: bir eklentinin
Sentry istemcisi `o370968.ingest.sentry.io`'ya yeniden deneme yapıyor ve her
denemede `ERR_CERT_AUTHORITY_INVALID` / `ERR_CONNECTION_TIMED_OUT` basıyor.

**Projenin kendi kodundan 0 hata.** Kaynaklar tek tek okundu:

| kaynak | seviye | kimin |
|---|---|---|
| `o370968.ingest.sentry.io/…` | ❌ | eklenti (dış uç) |
| `content.js:50` POST | ❌ | eklenti |
| `:5173/favicon.ico` 404 | ❌ | tarayıcının kendi isteği |
| `contentscript.js:14083` | ⚠️ | MetaMask |
| `Unchecked runtime.lastError` | ⚠️ | eklenti mesajlaşması |
| `client:859/968 [vite]` | ℹ️ | Vite dev istemcisi |
| `[DOM] Password field is not contained in a form` | ℹ️ | **bizim** — `index.html:38`, kayıtlı kozmetik kalem |

Sentry'nin bizim olmadığı **ölçüldü**: `package.json`, `src/` ve `index.html`'de
`sentry` ya da `react` geçmiyor (bağımlılıklar: `bip39`, `buffer`, `ethers`),
depoda `content.js` diye dosya yok, ve kaydın kendi imzası
`sentry.javascript.react/7.61.0` — React kullanmıyoruz.

> **Madde 7'yi KAPATMAZ.** Madde 7'nin okunamayan ❌1'i **eklentisiz** Misafir
> penceresinde çıkmıştı; eklentiler onu açıklayamaz. Bu koşu eklentili, yani o
> soruya hiç değmiyor. Bu koşunun eklediği şey ayrı: 20 Eylül'ün Misafir
> koşusu Sentry kalemlerinin eklentiden geldiğini *kaybolmalarıyla*
> göstermişti; burada **ne oldukları görünüyor** — dosya adı, satır numarası,
> istemci imzası. Aynı sonucun ikinci ve daha güçlü kanıtı.
>
> Ölçüm koşulu da birebir aynı değil: önceki koşularda DevTools sayfa
> yüklenmeden ÖNCE açıktı, bu koşuda sonradan açıldı. Chrome açılış
> kayıtlarını tamponluyor, ama "aynı şartta ölçüldü" denmiyor.

## 3. Intrinsic ayrıştırması — Adım 8

Sıfır/sıfır-dışı baytlar **gerçek calldata'dan sayıldı** (elle değil, konsolda;
15 çağrı × 3908 bayt ≈ 117 KB elle ayrıştırılamaz). Aritmetik plandaki:
`intrinsic = 21000 + 4×sıfır + 16×sıfır-dışı`, `yürütme = ham − intrinsic`.

| satır | ham tahmin | bayt | sıfır | sıfır-dışı | intrinsic | **yürütme** |
|---|---|---|---|---|---|---|
| A (sıcak alıcı) | 219.189 | 3908 | 203 | 3705 | 81.092 | **138.097** |
| B (soğuk, dolu) | 221.685 | 3908 | 205 | 3703 | 81.068 | **140.617** |
| C (soğuk, boş) | 246.871 | 3908 | 206 | 3702 | 81.056 | **165.815** |

Üç satırın da `value` = `100000000000000` (0,0001 ETH), `data` = `0x`,
nonce = 2. `bayt` üçünde de 3908 — imza 3688 bayt, kalan 220 bayt ABI
çerçevesi. İmza uzunluğu beş koşunun beşinde de sabit.

### Beklenen değerler TUTMADI

Bölüm 1'de, ölçümden önce yazılmıştı:

| karşılaştırma | beklenen | **ölçülen** | sapma |
|---|---|---|---|
| B − A | +2.500 | **+2.520** | +20 |
| C − A | +27.500 | **+27.718** | +218 |
| C − B _(türetilmemişti, kendiliğinden çıktı)_ | +25.000 | **+25.198** | +198 |

**Yapı tuttu, sayılar tutmadı — ikisi ayrı cümle.** B'nin A'dan ~2.500,
C'nin A'dan ~27.500 pahalı olduğu doğrulandı; EIP-2929 modelinin *şekli*
ayakta. Ama `+2.500` (soğuk hesap erişimi: 2.600 − 100) ve `+25.000` (boş
hesap oluşturma) EVM spesifikasyonunda **kesin** sayılardır, yaklaşık değil.
Sapma varsa modelin dışından geliyor.

### Sapma TOPLAMSAL DEĞİL, ÇARPIMSAL — aynı veriden, bölme yapılarak

`+20` / `+218` diye yazmak örüntüyü gizliyordu. Üç farkı beklenenlerine
bölünce tek bir çarpan çıkıyor:

| | fark | beklenen | oran |
|---|---|---|---|
| B − A | 2.520 | 2.500 | **×1,00800** |
| C − B | 25.198 | 25.000 | **×1,00792** |
| C − A | 27.718 | 27.500 | **×1,00793** |

**Aynı model HAM sütundan da sınandı — ikinci ve bağımsız aritmetik yol.**
Ham farklar intrinsic farklarını da taşıyor, model yanlış olsaydı orada
çatlardı:

| | ham fark | taban (intrinsic farkı + beklenen) | gereken çarpan |
|---|---|---|---|
| B − A | 2.496 | −24 + 2.500 = 2.476 | ×1,00808 |
| C − B | 25.186 | −12 + 25.000 = 24.988 | ×1,00792 |
| C − A | 27.682 | −36 + 27.500 = 27.464 | ×1,00794 |

Ham `B − A = 2.496` çıplak gözle beklenenin **altında** görünüyor; çarpımsal
model bunu tam olarak öngörüyor (intrinsic farkı −24). İki sütun, iki ayrı
aritmetik, aynı çarpan: **eps ≈ +%0,79–0,81.** Üç oranın 0,792 ile 0,808
arasında oynaması tam sayı gas yuvarlamasıyla tutarlı — en küçük taban (2.476)
en az çözünürlüğe sahip olan.

### Aday sıralaması — ölçümden değil, veriden

Bunların hiçbiri hüküm değil, **sıralama**.

1. **Doğrulayıcı gas'ı mesaja bağlı** — **ZAYIFLADI.** Mesaja bağlı bir fark
   toplamsal ve düzensiz olurdu; farkın *büyüklüğüyle orantılı* binmesi için
   bir sebep yok. Ölmedi: bölüm 4 doğrudan sınadı — sonuç orada.
2. **`eth_estimateGas` bağıl hata eşiğinde kesiyor** (tahmin = gerçek ×(1+eps))
   — **ÖNE GEÇTİ.** Gözlenen çarpımsal örüntüyü tek başına açıklıyor ve
   determinizmle çelişmiyor: sabit girdide sabit eps.
3. Adlandırılmamış bir yürütme farkı — duruyor.

> **63/64 GAS İLETME KURALI ELENMEDİ — eleme gerekçesi kaynakla çelişti.**
> Öne sürülen gerekçe "2.500 dış çerçevede, 25.000 iç çağrıda ödeniyor,
> iletme kuralı sebep olsaydı iki oran farklı çıkardı" idi.
> `contracts/src/PQWallet.sol` bunu desteklemiyor:
> ```
> 44:  require(verifier.verify(digest, signature, ownerPublicKey), ...);  // STATICCALL
> 50:  (bool success,) = to.call{value: value}(data);                     // CALL
> ```
> **2.500 (EIP-2929 soğuk hesap erişimi) ve 25.000 (boş hesap oluşturma)
> ikisi de satır 50'deki CALL opcode'unun maliyet bileşeni ve ikisi de
> `execute()`'un KENDİ çerçevesinde ödeniyor** — biri dışta biri içte değil.
> Gerçek iç çerçeve satır 44 ve o, üç satırın da farklarının dışında kalıyor.
> Oranların eşit çıkması bu yoldan 63/64 hakkında hiçbir şey söylemiyor.
>
> **Ayrı bir gerekçe var, ÇIKARIM olarak yazılıyor:** 63/64 kısıtı satır 44'te
> bağlayıcı olsaydı ikili arama zaten fazla gas'a ayarlanmış olurdu ve satır
> 50'ye 2.500 eklemek `G`'yi hiç artırmazdı — `B − A ≈ 0` görürdük. 2.520
> gördük, yani o kısıt bağlayıcı değil. Bu 63/64'ü zayıflatır ama ölçmez.

> **Tekrarlar determinizmi ölçtü, Δ'yı DEĞİL.** B ve C satırlarının beş
> koşusu birbirinin aynısı çıktı; bu, tahminlerin kararlı olduğunu gösterir.
> Δ ancak gerçek receipt'in olduğu yerde hesaplanır, o da **yalnızca A**
> (Task 6). Bu cümle yazılmazsa tablo "C'nin Δ'sını ölçtük" diye okunur.


> **Ayrım, tablo yazılmadan önce:** B ve C'nin tekrarları **determinizmi**
> ölçüyor, Δ'yı değil. Δ ancak gerçek receipt'in olduğu yerde hesaplanır, o da
> **yalnızca A**. Bu cümle yazılmazsa tablo "C'nin Δ'sını ölçtük" diye okunur.

---

## 4. Gürültü tabanı — B varyant deneyi


**Tasarım:** `to` = B sabit, `value` birer wei oynatılır. B yine soğuk ve yine
dolu, yani **EVM model gas'ı beş çağrıda da birebir aynı**; değişen tek şey
digest → imza → doğrulayıcı yolu. Çıkan yürütme yayılımı doğrudan 1. adayın
büyüklüğüdür. Intrinsic her çağrıda kendi calldata'sından sayıldığı için
`value`'nun bayt kompozisyonu değiştirmesi sonucu kirletmez.

**Neden yan yol değil:** çıkan yayılım, aşağıdaki her şeyin gürültü tabanı.
Task 6'nın Δ₂'si ve faz 1 ile faz 2'nin A karşılaştırması bu tabanın üstünde
okunacak. Taban bilinmezse "+218 sapma" ile "Δ₂ farkı" aynı kefeye girer.

**Maliyet:** 5 imza, kabaca 1–2 dakika, zincire hiçbir şey gitmiyor, nonce
yanmıyor.

**Karşılaştırılacak sütun YÜRÜTME'dir, ham değil.** `value` değişimi
calldata'nın sıfır bayt sayısını oynatıyor, dolayısıyla intrinsic'i de
oynatıyor; ham sütun bu ikisini birbirine karıştırır.

### BEKLENTİ — ölçümden ÖNCE yazıldı

```
Yürütme sütununda beklenen yayılım: SIFIR.
Yayılım çıkarsa beklenti çürümüştür ve öyle yazılır.
```

**Bu deneyin sınadığı iddia:** *"C13 doğrulama maliyeti mesajdan bağımsızdır."*

**Beklentinin kaynağı bir ÇIKARIM, ölçüm değil.** C13, Consigny'nin
**WOTS+C / FORS+C** ailesinden (bkz. `CLAUDE.md`, ePrint 2025/2203). O ailedeki
"C" tam olarak **zincir toplamını sabitlemek** demek: imzalayıcı bir sayaç
arayarak WOTS+ zincir uzunluklarının toplamını sabit bir değere kilitliyor.
Toplam sabitse doğrulamadaki hash adım sayısı da sabittir, yani mesajdan
bağımsızdır. FORS+C aynı şeyi FORS tarafında yapıyor.

**Çıkarımın dayandığı şey şemanın tasarım amacı, bizim doğrulayıcımızın
ölçülmüş davranışı DEĞİL.** `SPHINCSVerifier.sol` bu sabitliği gerçekten
koruyor mu, ölçülmedi — deney tam olarak bunu sınıyor.

**Sonucun iki yorumu, ikisi de peşinen yazılıyor ki sonradan seçilmesin:**

- **Yayılım 0 çıkarsa:** aday 1 (mesaja bağlı doğrulayıcı gas'ı) **elenir**,
  ve `+%0,79`'un tek ayakta kalan adayı `estimateGas`'ın bağıl kesmesi olur.
- **Yayılım > 0 çıkarsa:** iki şey birden olur — WOTS+C beklentisi çürür
  (kendi başına kayda değer bir bulgu, Task 7'yi ilgilendirir) **ve** aday 1
  geri döner. Yayılımın büyüklüğü `+%0,79`'u açıklamaya yetiyor mu, ayrıca
  bakılır; yetmiyorsa iki kaynak birden var demektir.

### SONUÇ — beklenti TUTTU, yayılım sıfır

20 Eylül, aynı oturum, `to` = B sabit, `value` = `100000000000000 + i` (i = 1…5).

| i | ham | bayt | sıfır | sıfır-dışı | intrinsic | **yürütme** |
|---|---|---|---|---|---|---|
| 1 | 221.721 | 3908 | 202 | 3706 | 81.104 | **140.617** |
| 2 | 221.709 | 3908 | 203 | 3705 | 81.092 | **140.617** |
| 3 | 221.733 | 3908 | 201 | 3707 | 81.116 | **140.617** |
| 4 | 221.709 | 3908 | 203 | 3705 | 81.092 | **140.617** |
| 5 | 221.685 | 3908 | 205 | 3703 | 81.068 | **140.617** |

```
yurutme tekil: [140617]
yayilim: 0 BEKLENEN 0
tabanla: 0 | taban 140617        ← ilk turun B ölçümü de dahil, n = 6
from tekil: 1 | hepsi A: true
```

**Deneyin gücü ham sütunda görünüyor:** ham tahmin 221.685 ile 221.733 arasında
**48 gas oynuyor**, intrinsic de 81.068 ile 81.116 arasında **48 gas** oynuyor,
ve ikisi birbirini **tam olarak** götürüyor. Yani ham sütundaki tüm değişim
calldata'nın sıfır bayt kompozisyonundan geliyor — `value`'nun son baytları
değiştikçe sıfır sayısı 201–205 arasında geziyor. Yürütme altı mesajda da
**bit birebir aynı**.

**ADAY 1 ELENDİ.** "Doğrulayıcı gas'ı mesaja bağlı" açıklaması artık ayakta
değil: altı farklı digest, altı farklı imza, tek bir yürütme değeri.

**Bu aynı zamanda bağımsız bir bulgu:** WOTS+C / FORS+C'nin zincir toplamını
sabitleme özelliği **bizim `SPHINCSVerifier.sol`'umuzda gerçekten korunuyor.**
Bu bölümün başında bir ÇIKARIM olarak yazılmıştı (şemanın tasarım amacından
türetilmişti, ölçülmemişti); artık ölçüldü. Doğrulama maliyeti mesajdan
bağımsız — yan kanal açısından da kayda değer, çünkü gas'tan mesaj hakkında
bilgi sızmıyor.

### Bu deneyin AYIRMADIĞI şey — sınırı peşinen yazılıyor

Yayılımın sıfır olması `+%0,79`'un kaynağını **söylemiyor**. İki model de bu
veriyle uyumlu:

- **eps = 0**, yürütme gerçekten tam 140.617;
- **çarpımsal eps ≈ 0,0079**, gerçek yürütme 138.879 ve tahmin onu
  `×1,0079` ile şişiriyor.

Ayıramamasının sebebi ölçülebilir: çarpımsal modelde yürütme sütunu
`exec×(1+eps) + intrinsic×eps` olur, yani intrinsic'in değişimi yürütmeye
`intrinsic_farkı × eps` kadar sızar. Burada intrinsic farkı **48**, eps ≈
0,0079 → sızıntı **0,38 gas**. Tam sayı gas'ta bu sıfıra yuvarlanır.
**Deney bu ayrımı yapacak çözünürlüğe sahip değil** ve olmasına da gerek yoktu
— sorduğu soru başkaydı.

Ayakta kalan adaylar: **2** (`estimateGas` bağıl kesme) ve **3**
(adlandırılmamış). Ayıracak ölçüm **Adım 7**: eps düğümden düğüme değişiyorsa
tahmin tarafındadır.

### ADAY 4 — yeni, B-varyanttan sonra adlandırıldı

**MetaMask'in kendisi `eth_estimateGas` cevabını şişiriyor olabilir.**

Şimdiye kadarki her tahmin `connected.signer.estimateGas` üzerinden, yani
`BrowserProvider(window.ethereum)` üzerinden alındı — **hepsi MetaMask'ten
geçti.** MetaMask'in RPC cevabını aynen ilettiği **varsayıldı, ölçülmedi.**
İletmeyip bir pay ekliyorsa `+%0,79`'un kaynağı düğüm de değil, EVM de değil,
cüzdan eklentisidir.

Bu aday bugüne kadar adlandırılmamıştı çünkü ölçüm yolunun tekliği (planın
SERT KURALI) doğru bir kural olarak uygulandı ve **tek yol kullanıldığında o
yolun kendisi değişken olarak görünmez.** Kuralın kör noktası bu; kural yanlış
değil, kapsamı dar.

**Ayıracak ölçüm:** aynı calldata, aynı düğüm, `cast` ile — yani MetaMask'siz.
Dönen sayı 219.189 ise MetaMask şeffaf; daha küçükse payı ekleyen MetaMask.

---
---

## 5. İkinci endpoint — Adım 7

**Endpoint MetaMask'in ağ tanımından değiştirilir, `.env`'den DEĞİL.**
Bu koddan okundu, varsayılmadı:

| yol | nasıl kuruluyor | sağlayıcıyı belirleyen | kancanın kullandığı |
|---|---|---|---|
| MetaMask | `new BrowserProvider(window.ethereum).getSigner()` — `sendTransaction.js:15,24` | MetaMask'in kendi ağ tanımı | ✅ `connected.signer.estimateGas` |
| uygulamanın salt-okunur yolu | `new JsonRpcProvider(VITE_SEPOLIA_RPC_URL)` — `sepolia.js:18-24` | `frontend/.env` | ❌ hiç |

`VITE_SEPOLIA_ARCHIVE_RPC_URL`'i değiştirmek ölçüm yolunu **hiç** değiştirmez;
`.env` yalnızca `readNonce`/`readBalance`/`readDigest`/`readOwnerPublicKey`
yolunu besliyor ve kanca onların hiçbirini çağırmıyor. Plan Adım 7 o env
değişkenini **değerin kaynağı** olarak anıyor (anahtarsız çalıştığı ölçülen
`https://sepolia.gateway.tenderly.co`), **mekanizma** olarak değil; mekanizma
planın kendi Task 9 tablosunda zaten yazılı: *"`VITE_SEPOLIA_RPC_URL`'e proxy
koymak HİÇBİR ŞEY YAPMAZ — hedef çağrı o yoldan geçmiyor."* Aynı cümle
buraya da uyuyor.

> **Bedeli de ölçüldü:** MetaMask ağ tanımını değiştirmek sayfayı YENİLEMEZ.
> `chainChanged` gelirse `watchWalletChanges` yalnızca `connected = null`
> yapıyor; imza düşürülmüyor (`main.js:539` yorumu) ve `currentMnemonic`
> modül kapsamında duruyor. Yani en kötü ihtimalle "Bağlan"a bir kez daha
> tıklanır — **mnemonic ikinci kez girilmez.** `.env` yolu bu güvenceyi
> vermiyordu: Vite yeniden yükler, anahtar düşer.

### Adım 7 artık BAŞKA BİR SORU soruyor

Plan yazıldığında Adım 7'nin sorusu *"iki sağlayıcı farklı Δ veriyor mu"*
idi. Bölüm 3'ten sonra soru değişti: **eps düğüme bağlı mı?**

İki sağlayıcı farklı **oran** veriyorsa tahminin kendisi düğümün özelliğidir
ve "ofset" kavramı tabloya hiç giremez. Aynı oranı veriyorsa eps sağlayıcıdan
bağımsız, yani EVM/istemci davranışı.

Adım 6 + 8 aynen tekrarlanır, oranlar ilk turunkiyle **yan yana** yazılır.

### KOŞULDU — terminal turu, MetaMask'siz, 20 Eylül

**Plandaki "MetaMask ağ ayarını çevir" yolu yerine terminal turu koşuldu.**
Sapma bilerek yapıldı; kazancı ve feda ettiği aşağıda.

Tarayıcıdaki `out.A[0].calldata` / `B` / `C` panoya alınıp dosyaya yazıldı.
**Aktarımın bozulmadığı ölçüldü:** üç calldata'nın bayt sayısı (3908) ve sıfır
bayt sayısı (203 / 205 / 206) tarayıcının bastığı sayılarla birebir aynı.
Sonra **ham JSON-RPC** ile — ne ethers, ne MetaMask, yalnızca `fetch` —
`eth_estimateGas` çağrıldı, `from` açıkça verildi.

| satır | reth (publicnode) | Tenderly | MetaMask üzerinden (ilk tur) | fark |
|---|---|---|---|---|
| A | 219.189 | 219.189 | 219.189 | **0** |
| B | 221.685 | 221.685 | 221.685 | **0** |
| C | 246.871 | 246.871 | 246.871 | **0** |

**İki uç FARKLI İSTEMCİ çalıştırıyor**, `web3_clientVersion` ile ölçüldü:

```
publicnode → reth/v2.5.2-5a6940e/x86_64-unknown-linux-gnu
tenderly   → Tenderly/1.0
```

İkisi de aynı blokta (`0xb337b4`). Yani bu **iki geth örneği değil** — biri
bağımsız bir Rust istemcisi, biri Tenderly'nin kendi simülasyon motoru.

### Sonuçlar

**ADAY 4 ELENDİ — MetaMask şeffaf.** Ham `fetch` ile alınan üç sayı, MetaMask
üzerinden alınan üç sayının birebir aynısı. `+%0,79`'u cüzdan eklentisi
eklemiyor.

**eps DÜĞÜME BAĞLI DEĞİL.** Planın Adım 7'de sorduğu soru buydu: *"İki
sağlayıcı farklı Δ veriyorsa 'ofset' EVM'in değil node'un özelliğidir ve
tabloya hiç giremez."* Vermiyorlar. Ofset düğümün özelliği değil.

**ADAY 2 ZAYIFLADI, ELENMEDİ — ayrım yazılıyor.** İki *farklı uygulamanın* bit
birebir aynı sayıyı vermesi "bu düğümün ikili arama eşiği" açıklamasını büyük
ölçüde düşürüyor. Ama elemiyor: `reth` açıkça geth uyumluluğunu hedefliyor ve
Tenderly de aynı uzlaşıyı izliyor olabilir. **Paylaşılan bir tahmin uzlaşısı
ile gerçek minimum, bu veriyle ayırt edilemez.**

**ADAY 3 ÖNE ÇIKTI.** Tahminler gerçekten kesinse `+2.500` / `+25.000` modeli
eksik demektir ve `+20` / `+198` adlandırılmamış bir yürütme farkından geliyor.
Bu ihtimal artık ikinci sırada değil.

### AYIRACAK TEK ÖLÇÜM: Task 6'nın gerçek `gasUsed`'ı

- `gasUsed == estimate` ise tahminler **kesin** → aday 3, model eksik.
- `gasUsed ≈ estimate / 1,0079` ise → aday 2, ortak bir tahmin uzlaşısı var.

Bu, bölüm 6'daki açık kalemin ta kendisi. İki soru tek ölçümle kapanıyor.

### Plandan sapıldı — neyin feda edildiği

**Kazanç:** calldata bayt birebir aynı (yeniden imzalanmadı — imzalamanın
deterministik olduğu bölüm 2'de gösterilmişti), `from` açıkça verildi,
istenirse daha fazla uç denenebilirdi, **mnemonic'e hiç dokunulmadı ve
MetaMask ağ ayarı kurcalanmadı.** Üstelik bu yol aday 4'ü ayırdı — MetaMask
yolu onu **ayıramazdı**, çünkü iki ölçüm de MetaMask'ten geçerdi.

**Feda edilen:** MetaMask'in kendi RPC borularının tenderly ucuyla sınanması.
Şeffaflığı yalnızca publicnode üzerinde ölçtük; tenderly'de de şeffaf olduğu
**çıkarım**, ölçüm değil. Yanlış olması için MetaMask'in sağlayıcıya göre
farklı davranması gerekir — mümkün ama beklenmez.

**MetaMask ağ turu artık bir şey EKLEMİYOR:** aday 4 elendiğine göre o yoldan
dönecek sayılar yapı gereği bu tablodakilerle aynı olur.

---

## 6. AÇIK KALEM — ofset modeli mi, oran modeli mi? (Task 7'nin girdisi)

Defterde `Δ₁ = 219.104 − 216.221 = 2.883` **ofset** olarak kayıtlı. Aynı bölme:
`219.104 / 216.221 = 1,0133`, yani **+%1,33**.

**Bugünkü +%0,79 ile aynı sayı DEĞİL ve karşılaştırılamaz:** farklı gün,
farklı düğüm, farklı depolama yazma maliyeti (nonce 1→2 `SSTORE_SET` iken
2→3 `SSTORE_RESET`). Bu yüzden **hüküm yazılmıyor.** Yazılan şey kalemin
kendisi:

> **Tahmin ile gerçek `gasUsed` arasındaki ilişki ofset mi, oran mı?**
> Gas tablosu (Task 7) şu an **ofset modeli** üzerine kurulu. Task 6'nın
> gerçek receipt'i geldiğinde **Δ₂ HEM fark HEM oran olarak** hesaplanacak
> ve model o zaman seçilecek. **Seçilmeden tablo yazılmayacak.**

**Task 6 Adım 8'e not:** `gasUsed` okunduğunda `gasUsed / estimate` oranı da
hesaplanacak, yalnızca farkı değil.

**Neden bu kalem şimdi açılıyor:** bugünkü ölçüm ofset modelinin *tek*
seçenek olmadığını gösterdi. Kalem açılmazsa Task 7 ofset modelini varsayılan
sanıp devam eder ve seçimin hiç yapılmadığı görünmez olur.

**DÜZELTME — 22 Eylül.** Yukarıdaki paragrafta (bu bölümün 4. satırı)
`nonce 1→2 SSTORE_SET` yazıyor. **Bu YANLIŞ.** Doğrusu `nonce 1→2` =
**`SSTORE_RESET`** (2.900). `SSTORE_SET` (20.000) olan, Hakan'ın tx'indeki
`nonce 0→1`'dir. Kaynak: `sprint3-end-to-end-transaction.md:147` tablosu ve
`progress.md:374`. Karşılaştırılamazlık gerekçesi **ayakta kalıyor** — bu
turun tx'i `nonce 2→3`, Sprint 3'ünki `1→2`; ikisi de RESET olduğundan
depolama yazma maliyeti farkı bu kalemde gerekçe DEĞİL, gerekçe "farklı gün,
farklı düğüm"dür. Yani hüküm değişmiyor, dayanağı daralıyor.


---

## 7. Task 5B — kanca silindi, artık-sıfır kanıtlandı

**Sıra plana uygun:** kanıt yazımı → kanca silme → commit. Kayıt (Task 6)
**kancasız ve commit'li** ağaçtan alınacak.

### Adım 1 [D3] — sayılar DOSYADAN OKUNARAK doğrulandı

Bölüm 3'teki Adım 8 tablosu markdown'dan ayrıştırıldı ve **altı sütunu da ham
veriden yeniden üretildi**: bayt/sıfır/sıfır-dışı/intrinsic kaydedilmiş
calldata'dan yeniden sayıldı, ham tahmin zincirden **yeniden** okundu, yürütme
yeniden hesaplandı. Üç satır × altı sütun = **18 sayının 18'i tuttu.**
Bellekten yazılmış sayı kalmadı.

### Adım 2 — artık-sıfır, dört ayrı kanıt

```
grep -c "__m4" src/main.js                              → 0
md5 src/main.js                                         → 10e02c8bfa36531d55d581747a9a7ee9
diff <(git show a64129b:frontend/src/main.js) src/main.js → BOŞ
git diff -- frontend/src/main.js                        → BOŞ
```

`10e02c8bfa36531d55d581747a9a7ee9`, `main.js`'e dokunan son commit olan
`a64129b`'deki değerin **birebir aynısı**. Kancalı değer
`714049c4373ac16f5534597c364560ab` idi; ağaçta iz kalmadı.

> Beklenen md5 ve `a64129b` referansı **hatırlanan değerlerdi, ölçüldüler:**
> `git cat-file -t a64129b` → commit, `git log -- frontend/src/main.js` → en
> son ona dokunan commit o, ve `git show a64129b:…​ | md5` beklenen hash'i
> verdi. Üçü de tuttuğu için silme işlemi kanıtlanabilir bir tabana oturdu.

### Yeşil durum

```
npx vite build                   → 190 modül, 177 ms
send-transaction-test.mjs        → 83 assertion
build-transaction-test.mjs       → 21 assertion
pqwallet-test.mjs                →  9 assertion (CAST_EXPECTED oracle'ıyla)
```

`pqwallet-test.mjs` canlı okumaları kapıyı **dördüncü kez** teyit etti, saatler
sonra: `readNonce() = 2`, `readBalance() = 50900000000000000 wei`.


---

## 8. BEKLENTİ — Task 6'dan ÖNCE yazıldı: estimateGas algoritma modeli

Bu bölüm Task 6 Adım 4 koşulmadan yazıldı ve commit'lendi. Amacı: ölçüm
geldiğinde beklentinin geriye dönük ayarlanamaz olması.

### Model

**ÇIKARIM** — geth'in `gasestimator` mantığı. `reth` ve Tenderly'nin aynısını
uyguladığı **VARSAYIM**; doğrulanmadı, yalnızca üçünün aynı sayıyı vermesiyle
uyumlu (§5).

```
hi = (U + R + 2300) * 64 // 63          # 2300 = CallStipend
lo = U - 1                              # bilinen başarısız sınır
(hi - lo) / hi < 0.015 olana kadar:     # 0.015 = estimateGasErrorRatio
    mid = (hi + lo) // 2
    mid'te çalışıyorsa hi = mid, değilse lo = mid
dönen = hi
```

`U` = gerçek `gasUsed`, `R` = refund (bu tx'lerde 0 alındı).

### Kayıtlı veriye uyum — ÖLÇÜM (aritmetik, betik aşağıda)

| girdi | model çıktısı | kayıtlı değer | tuttu mu |
|---|---|---|---|
| `U = 216.221` (Sprint 3) | **219.104** | 219.104 | **EVET** |

Üç tahminin **ters çözümü tek** — taranan aralıkta (180.000–260.000) her biri
için **yalnızca bir** `U` değeri o tahmini üretiyor:

| satır | tahmin `E` | tek ters çözüm `U` | çözüm sayısı |
|---|---|---|---|
| A | 219.189 | **216.305** | 1 |
| B | 221.685 | **218.781** | 1 |
| C | 246.871 | **243.769** | 1 |

Ters çözümler arası farklar:
`218.781 − 216.305 = 2.476 = 2.500 − 24`
`243.769 − 216.305 = 27.464 = 27.500 − 36`

### İlişki afin — ofset de değil, oran da değil

Tek ikili arama adımından sonra `hi ≈ (U·64/63 + U)/2`, yani katsayı
`127/126 = 1,0079365…`. Buradan:

> **Δ ≈ U/126 + 1168**

| `U` | ölçülen Δ | formül | kalan |
|---|---|---|---|
| 216.221 | 2.883 | 2.884,04 | −1,04 |
| 216.305 | 2.884 | 2.884,71 | −0,71 |
| 218.781 | 2.904 | 2.904,36 | −0,36 |
| 243.769 | 3.102 | 3.102,67 | −0,67 |

Kalanların tamamı negatif ve 1'den küçük — tamsayı bölmesinin (`//`) aşağı
yuvarlamasıyla uyumlu. **ÖLÇÜM.**

Bu yüzden ne saf ofset (`Δ` sabit değil: 2.883 → 3.102) ne saf oran
(`E/U` sabit değil) modeli doğru. Bölüm 6'nın "ofset mi oran mı" ikilemi
**yanlış kurulmuş olabilir**; üçüncü seçenek afin ilişkidir.

### Task 6 tahmini — ölçümden ÖNCE

> **`gasUsed_2` = 216.305**, dolayısıyla **Δ₂ = 2.884**.

Koşul: calldata'nın **203 sıfır baytı** olması (A satırı). Her **ek** sıfır
bayt `gasUsed`'ı **−12** düşürür (sıfır olmayan bayt 16, sıfır bayt 4 gas).

**Çürütme ölçütleri:**

- `gasUsed_2 = 216.305` → model tuttu, **aday 2** (ortak tahmin uzlaşısı).
- `gasUsed_2 = 219.189` (yani tahminin kendisi) → tahminler kesin,
  **aday 3**, model eksik.
- **Başka herhangi bir değer** → açıklanamayan kalan. **Yuvarlanmaz,
  "yaklaşık tuttu" denmez**, kalem açık yazılır.

**Bölüm 5'e şerh:** §5'te aday 2'nin ölçütü `gasUsed ≈ estimate / 1,0079`
diye yazılmıştı; bu `217.471` verir. Afin ilişkinin tam tersi ise `216.305`.
İkisi arasında **~1.166 gas** fark var. Bu bölümdeki keskin sayı (216.305)
geçerlidir; §5'teki kaba bölme `+1168` terimini ihmal ettiği için sapar.

### Doğrulama betiği

Aşağıdaki betik bu bölümdeki **her** sayıyı yeniden üretir.

```python
def est(U, R=0):
    hi, lo = (U + R + 2300) * 64 // 63, U - 1
    while lo + 1 < hi and (hi - lo) / hi >= 0.015:
        mid = (hi + lo) // 2
        if mid >= U: hi = mid
        else: lo = mid
    return hi

assert est(216221) == 219104                      # Sprint 3 çapası
inv = {}
for U in range(180000, 260001): inv.setdefault(est(U), []).append(U)
assert inv[219189] == [216305] and inv[221685] == [218781]
assert inv[246871] == [243769]                     # ters çözümler TEK
assert est(216305) - 216305 == 2884                # Δ₂ beklentisi
assert (12 * 219189) // 10 == 263026                # LIMIT_2 (madde 3)
```
