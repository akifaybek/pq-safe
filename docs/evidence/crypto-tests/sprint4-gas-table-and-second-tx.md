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
| **2026-09-23 12:43** | **11764958** | **2** | **50900000000000000** | **17** | **TASK 6 KAPISI — koşu günü** |

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

**DÜZELTME — 23 Eylül 2026 12:43 UTC: 22 Eylül kapısı KULLANILMADAN bayatladı.**

22 Eylül'ün kapısı koşuldu ama Adım 1'e geçilmedi — tarayıcıda hiçbir şey
yapılmadı, kayıt başlamadı. Kapının koruduğu şey **oturum anı** olduğundan
(yukarıdaki EK'in gerekçesi) o okuma bir gün sonraki koşuya devredilemez;
bu yüzden kapı 23 Eylül'de **baştan** koşuldu. 22 Eylül satırı **olduğu gibi
kalır** — o gün doğru okunmuş bir ölçümdür, yalnızca kullanılmadan süresi
dolmuştur.

Bugünkü okuma dört değerin dördünde de kapıyı geçti; `git status --porcelain`
boş döndü. **B0 değişmedi:**

```
B0 (Task 6, 23 Eylül) = 50900000000000000 wei · 17 hane · 0,0509 ETH
```

Bu yüzden §8'deki `B0 − value = 50800000000000000` beklentisi **aynen geçerli**;
üzerine yazılacak ya da yeniden türetilecek bir şey yok.

**ÖLÇÜM PENCERESİ UZADI.** `nonce()` artık **beş** okumanın beşinde de 2:
19 Eylül 08:46'dan 23 Eylül 12:43'e kadar PQWallet'a plan dışı `execute()`
girmedi. Pencere 4 gün 4 saate çıktı.

> **Hane kuralı bu turda nasıl karşılandı — sınırı yazılıyor.** Ham sayının
> 17 hanesi **sayılarak** doğrulandı, ETH karşılığı bundan **türetildi**.
> 22 Eylül'deki gibi ikinci bir bağımsız okuma (`cast balance --ether`)
> **koşulmadı**. Yani bu satır bir aktarım hatasını ham sayının kendi hane
> sayısı kadar yakalar, daha fazlasını değil.

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

---

## 9. Task 6 faz 2 — 23 Eylül koşusu: tx gitti, gas ölçümü 7702 paketiyle kirlendi

### Kayıt kimliği

| | |
|---|---|
| `KAYIT_COMMIT` | `d07bb1f41e57c00eb9e3ee43c7af5e1106a9c111` |
| `index.html` | `3b701338fe6107e0a241501ab261da73` |
| `src/main.js` | `10e02c8bfa36531d55d581747a9a7ee9` |
| `src/tx/sendTransaction.js` | `98a45cf795400dacbeefc35d95c10319` |
| `src/crypto/digest.js` | `fd93a71edd1f27b664414195c0cbaf3f` |
| `src/tx/buildTransaction.js` | `c4a061dedc27b7339738d2bc42eb3038` |

Kayıt öncesi iki metin düzeltmesi yapıldı (`index.html` satır 30 ve 55, bayat
iddialar); `KAYIT_COMMIT` ve `index.html` md5'i bu yüzden iki kez geçersiz
kılındı. Eskiler: `524e7cf`/`c7fe9ba…`, sonra `1420508`/`126e153…`.

**SPRINT 3'TEN SAPMA — DevTools AÇIK koşuldu.** Sprint 3 kaydı "DevTools
kapalı" diye tutanağa geçmişti; bu koşu `progress.md:1288`'in Keep log
kuralını uyguladı. Kayıt başlangıcında Console **Errors = 2**
(`favicon.ico` 404 · `Unchecked runtime.lastError`). Sorunlar paneli 6 =
1 CSP `eval` + 5 bağlanmamış `<label>`; ayrıştırma ekrandaki `6 sorun: 1 + 5`
rozetiyle doğrulandı. **5 label'ın hangi düğümler olduğu DOĞRULANMADI** —
3 statik (`index.html` 64/67/70) + 2 dinamik (`main.js` 476/478) hesabı sayıya
uyuyor ama düğümler tek tek görülmedi.

### Gönderim öncesi bağımsız digest doğrulaması

`cast` ile, CLAUDE.md'deki dondurulmuş formülden yeniden hesaplandı:

```
DOMAIN_SEPARATOR = 0xa6238098b5d49d6e94eb134fa1e5ce7f888c5a9f870626079776fb42874c228b
digest           = 0xebe1c8d442c4018d45a299a4ec1d08eb37f8da1c9f564c525bd286e56775c5be
```

İkisi de ekrandakiyle **birebir**. Sayfanın kendi hesabına güvenilmedi.

Gönderim öncesi kapı (16:53 UTC, blok 11766167): `nonce()` = 2,
bakiye = `50900000000000000` wei · 17 hane · 0,0509 ETH.

### Tx

| | |
|---|---|
| hash | `0x62d0909440b9f6e3afd8ab79913fa9a4e00688b62912c57badc752f067de0b8f` |
| blok | 11766174 · `status 0x1` |
| **tip** | **`0x4` — EIP-7702** |
| `to` | `0xdb9b1e94b5b69df7e401ddbede43491141047db3` — **PQWallet DEĞİL** |
| `gasUsed` | **321.713** (`0x4e8b1`) |
| tx gaz limiti | **355.384** — bizim kodumuzun hesapladığı 263.026 DEĞİL |

### TUTAN İKİ BEKLENTİ

**1. Bakiye.** §0'un 22 Eylül'de commit'lenmiş beklentisi (`5df85ef`):

```
beklenen: B0 − value = 50900000000000000 − 100000000000000 = 50800000000000000
ölçülen : 50800000000000000 wei · 17 hane · 0,0508 ETH   ✓
```

`nonce()` 2 → 3 ✓. Gaz cüzdandan değil EOA'dan ödendi ✓.
**PQWallet uçtan uca çalıştı: C13 imzası zincirde doğrulandı, `execute()` yürüdü.**

**2. `EST_A_F2` = 219.189.** UI'daki `limit: 263026`, `sendTransaction.js:202`'deki
`(estimated * 12n) / 10n`'in çıktısı; ters çözümü TEK (`219188 → 263025`).
22 Eylül'de ölçümden önce yazılan sayının kendisi.

**KAYNAK:** `sendTransaction.js:15` → `new BrowserProvider(window.ethereum)`.
Yani tahmin **MetaMask'in kendi provider'ından** geldi, Tenderly'den değil.
**MetaMask'in Sepolia ucu = Infura (`sepolia.infura.io`)** — 23 Eylül'de
MetaMask ağ ayarlarından okundu. API anahtarı kaydedilmedi, sağlayıcı adı
kanıt için yeterli. *(Bu satır 23 Eylül'de açık kalemdi, aynı gün kapandı.)*

> **Bu modeli DOĞRULAMAZ, yalnız bir sapma kaynağını eler.** §8'in modeli
> geth'in `gasestimator`'ına dayanıyor ve reth/Tenderly uyumu **varsayım**
> olarak yazılmıştı. Infura geth ailesi çalıştırır, yani tahminin oradan
> gelmesi modelle **çelişmiyor**. Çelişmemek ile doğrulanmak ayrı şeylerdir.

**DÜĞÜM İSTEMCİSİ ÖĞRENİLEMEDİ — denendi, yöntem yetersiz çıktı.**
Tarayıcı konsolunda `ethereum.request({method:'web3_clientVersion'})`
koşuldu; dönen değer **`MetaMask/v13.48.0`**, yani **MetaMask'in kendi sürümü**.
Çağrı MetaMask katmanında yakalandı, Infura'ya **ulaşmadı**. Bu ne bir dönüş
ne bir rettir — **yanlış katmandan gelen bir yanıttır** ve sorulan soruyu
cevaplamaz. Arkadaki istemcinin geth mi reth mi olduğu **BİLİNMİYOR**;
yukarıdaki şerh olduğu gibi geçerli.

### KARŞILAŞTIRILMAYAN: `gasUsed` = 321.713

Gönderim öncesi konan kural: `n ≠ 3908` → "calldata yapısı değişti" bulgusu,
**karşılaştırma yapılmaz**, önce sebep bulunur.

Dış paket: **n = 5028 · z = 1060** (`bytes.count(0)`, hex taramasından bağımsız
ikinci yöntemle teyit edildi; `z = 1060` ile `offset 1060`'ın aynı çıkması
rastlantı).

**SEBEP BULUNDU — MetaMask EIP-7702 akıllı hesap modu.** Zincirden okundu:

```
cast code <EOA> = 0xef010063c0c19a282a1b52b07dd5a65b58948a07dae32b
                  └ef0100┘└──── delege adresi ────┘
```

`authorizationList` EOA'yı `0x63c0c19a…dae32b`'ye delege ediyor; tx bu yüzden
tip `0x4` ve `to` bir dağıtım kontratı.

**Bu yüzden 321.713 ile 216.305 KARŞILAŞTIRILMADI.** Yuvarlanmadı, "yaklaşık
tuttu" denmedi, aday sıralamasına sokulmadı. **§8'in asıl sorusu — aday 2 mi
aday 3 mü — bu tx ile KAPANMADI, AÇIK.**

321.713'ün içinde en az iki ayrı kalem var ve bu koşu onları **ayırmıyor**:

- **7702 yetkilendirme maliyeti** — yetkilendirme başına sabit ücret.
  *(7702'de kod dağıtılmaz; "dağıtım maliyeti" diye bir kalem YOKTUR.)*
  **Rakamı atanmadı.**
- **dış paketin intrinsic calldata maliyeti** — tek hesaplanabilen kalem:
  ```
  dış: 16·3968 + 4·1060 = 67.728
  iç : 16·3705 + 4·203  = 60.092
  fark                  =  7.636
  ```

Kalan **ölçülmedi, atanmayacak.**

### BU TX'TEN ÇIKARILAN SIFIR MALİYETLİ ÖLÇÜMLER

**İç `execute()` calldata'sı — paketin içinden çıkarıldı** (offset 1112):

| | ölçülen | beklenen (A satırı) |
|---|---|---|
| `n_iç` | **3908** | 3908 ✓ |
| `z_iç` | **203** | 203 ✓ |
| selector | `0xda0980c7` = `execute(address,uint256,bytes,bytes)` | ✓ |
| `data` uzunluğu | 0 (`data = 0x`) | ✓ |
| imza uzunluğu | 3688 | ✓ |

**Dilim keyfi değil, sınırı kapanıyor:** imzanın son baytı `0xc3` (sıfır değil),
ardından tam 24 sıfır dolgu = `3712 − 3688`. Yapı aritmetiği kendi içinde
kapanıyor: `4 + 128 + 32 + 32 + 3712 = 3908`. Bir bayt kayma olsa tutmazdı.

> **`n = 3908` ARTIK ÇIKARIM DEĞİL, ÖLÇÜM.** Gönderim öncesi *"ABI deterministik,
> `data = 0x`, C13 imza uzunluğu sabit"* gerekçesiyle **varsayım** olarak
> yazılmıştı; zincire yazılan baytlardan sayılarak doğrulandı. `z_iç = 203`
> olduğu için düzeltme formülü `216.305 − 12·(203−203)` = **216.305**,
> yani temiz tx'in beklentisi **düzeltmesiz**.

**Trace — ALINAMADI.** `debug_traceTransaction` ve `tenderly_traceTransaction`
ikisi de `HTTP 429 · {"code":-32005,"message":"rate limit exceeded"}` döndü.
**Bu hız sınırıdır, "yöntem desteklenmiyor" DEĞİLDİR** — ikisi farklı şeydir ve
bu ayrım burada yazılıdır. `PQWallet.execute` frame'inin kendi `gasUsed`'ı
**ölçülmedi**; 138.097 ile karşılaştırma yapılmadı.

**NONCE 3'E BIRAKILDI.** Bu koşuda alınamadı; nonce 3 tx'i temiz gelirse
(tip `0x2`, `to` = PQWallet) trace orada denenir ve **bu kalemi geçersiz
kılar** — çünkü o zaman `gasUsed`'ın tamamı zaten PQWallet'ın kendi
çağrısıdır ve ayrı bir frame ölçümüne ihtiyaç kalmaz.

> **Erteleme YALNIZ trace içindir.** Aynı paketten çıkarılan `n_iç` = 3908 ve
> `z_iç` = 203 **ölçüldü**, ertelenmedi; nonce 3 onları geçersiz kılmaz,
> teyit eder ya da çürütür.

### Ekran kaydı — 7702 koşusunun kaydı, JÜRİ VİDEOSU DEĞİL

| | |
|---|---|
| SHA-256 | `c375474d741d9fc40349663c1db3e576c671cef3656b6b3bfacb9fb8ca3adc31` |
| Boyut | **13.290.678 bayt** (~13,3 MB) |
| Süre | **54,77 saniye** |
| Konum | `~/Desktop/Ekran Kaydı 2026-09-23 19.54.18.mp4` — **repo DIŞINDA** |

**Dosya repoya girmez.** Kimliği SHA-256'dır; adı değişebilir. Sprint 3
kaydının (`f7be0790…`) yerine geçmez, onun yanına konur.

**NE DEĞİLDİR:** bu, Task 10'un aradığı jüri videosu **değildir**. Kaydedilen
koşu 7702 paketiyle gitti, yani `gasUsed` ölçümü kirli. Task 10 Adım 3'ün
*"imza → negatif kanıt reddi → aynı imzayla gönderim → receipt, kesintisiz"*
ölçütünü de karşılamaz: negatif kanıt bu koşuda **kayıt dışında** bir kez
koşulmuştu, kayıt yeniden imzalamayla başladı.

**NE İÇİN SAKLANIYOR:** EIP-7702 bulgusunun ve PQWallet'ın uçtan uca
çalıştığının görsel kaydı.

> **İçeriği bu notu yazan tarafından DOĞRULANMADI.** Yukarıdaki dört satır
> dosyanın kendisinden ölçüldü (`shasum`, `stat`, `mdls`); videoda hangi
> karelerin olduğu **izlenerek** kontrol edilmedi.

### BULGU — Task 9'un ortam değişkeni sınıfına eklenir

**MetaMask'in akıllı hesap modu tx tipini değiştiriyor ve gas ölçümünü
kirletiyor.** Task 10'un md5 kapısı bunu **göremez**, çünkü bir repo dosyası
değil. Task 9 kutusundaki "MetaMask'in RPC ucu" kalemiyle aynı sınıf.

İkinci, ayrı bulgu: **bizim kodumuzun hesapladığı `gasLimit` zincire gitmedi.**
`sendExecute` 263.026 verdi, zincirdeki limit 355.384. MetaMask değiştirdi.
Farkın (92.358) nereden geldiği **ölçülmedi.**

---

## 10. ÖN KAYIT — nonce 3 koşusu, ölçümden ÖNCE yazıldı

Bu bölüm nonce 3 tx'i gönderilmeden **önce** commit'lenmiştir; geriye dönük
ayarlanamaz.

### Beklenen

| | beklenen |
|---|---|
| tx tipi | **`0x2`** |
| `to` | **`0x2EafA294C14b6752128bfd4f5873D1EA39f000BB`** (PQWallet) |
| `n` | **3908** |
| `z` | 203 |
| `EST` | **219.189** (`z = 203` ise) |
| `LIMIT` | **263.026** |
| **`gasUsed_3`** | **216.305 − 12·(z − 203)**, yani `z = 203` ise **216.305** |
| `nonce()` | 3 → 4 |
| bakiye | `50800000000000000` → **`50700000000000000`** wei · 17 hane · 0,0507 ETH |

### Çürütme ölçütleri

- `gasUsed_3 = 216.305` → model tuttu, **aday 2**.
- `gasUsed_3 = 219.189` → tahminler kesin, **aday 3**, model eksik.
- **başka değer** → açıklanamayan kalan, **yuvarlanmaz**.

### KARŞILAŞTIRMA YAPILMAMA KOŞULLARI

Şunlardan **biri** bile çıkarsa `gasUsed_3` hiçbir beklentiyle
karşılaştırılmaz, "calldata/işlem yapısı değişti" bulgusu yazılır:

- tip ≠ `0x2`
- `to` ≠ PQWallet
- `n` ≠ 3908

### Gönderim ön koşulları — sağlanmadan gönderilmez

1. **`cast code <EOA>` == `0x`** — 7702 delegasyonu geri alınmış olmalı.
   Şu an `0xef010063c0c19a…dae32b`. **Boş değilse gönderilmez.**
2. MetaMask akıllı hesap ayarı **kapalı**, kayıttan önce gözle doğrulanır.
3. Adım 4 yeniden koşulur: `KAYIT_COMMIT`, beş md5, `5df85ef` ata mı,
   kapı (`nonce()` = 3, bakiye = `50800000000000000`).

### Ön koşulların sağlanışı — 23 Eylül 2026

**Ayarı kapatmak yetmedi.** 17:51 UTC'de MetaMask'in *"Smart account requests
from dapps"* ve *"Smart Transactions"* anahtarları kapatıldıktan **sonra**
okunan `cast code <EOA>` hâlâ `0xef010063c0c19a…dae32b` döndü. Ayar
**gelecekteki** yükseltmeyi engelliyor, **zincire yazılmış** delegasyonu
silmiyor — bu ikisi ayrı şey ve ölçümle ayrıldı.

Geri alma, MetaMask'te *Account details → Smart account* bölümünden ağ başına
yapıldı; hedefi sıfır adres olan bir yetkilendirme işlemi gönderiyor ve gaz
istiyor.

| zaman (UTC) | blok | `cast code <EOA>` | ön koşul 1 |
|---|---|---|---|
| 2026-09-23 17:51 | 11766449 | `0xef010063c0c19a…dae32b` | ✗ |
| **2026-09-23 18:00** | **11766494** | **`0x`** | **✓ SAĞLANDI** |

Aynı okumada PQWallet §10'un başlangıç durumunda: `nonce()` = **3**,
bakiye = **`50800000000000000`** wei · 17 hane · 0,0508 ETH.
EOA bakiyesi `48708450739561606` wei — gaz için yeterli.

Geri alma işlemi PQWallet'a **dokunmadı**: iki okuma arasında `nonce()` 3'te,
bakiye `50800000000000000`'de kaldı.

---

## 11. Nonce 3 koşusu — 7702 GERİ GELDİ, karşılaştırma yine yapılmadı

### Kayıt kimliği

`KAYIT_COMMIT` = `5fa5ce5425c28bd2263d26f22f0d1e0030cf48c6` · ağaç temiz.
Beş md5 §9'dakiyle **birebir aynı** — aradaki commit'ler yalnız `docs/` ve
`.superpowers/`'a dokundu, frontend değişmedi.

> **Adım 4 bu koşudan ÖNCE koşulmadı.** Kayıt kimliği geriye dönük belirlendi:
> ağaç temizdi ve beş dosyanın hash'i değişmemişti. Usul olarak eksiktir ve
> öyle yazılıyor; sonuç aynı çıksa da kapı zamanında koşulmadı.

### Ekran kaydı

| | |
|---|---|
| SHA-256 | `ee809b29f6704d9aadf667e3f9e43576eb7342ad1da2738b621b6c6628f78023` |
| Boyut | **77.333.153 bayt** (~77 MB) |
| Süre | **99,38 saniye** |
| Konum | `~/Desktop/Ekran Kaydı 2026-09-23 22.14.37.mov` — **repo DIŞINDA** |

İçeriği izlenerek doğrulanmadı; dört satır dosyadan ölçüldü.

### Tx — yine paketlendi

| | |
|---|---|
| hash | `0x8f40543a3851e9327342a8948aabb863367185b146c9a2b078a54889fd0e2cc3` |
| blok | 11766873 · `status 0x1` |
| **tip** | **`0x4`** — beklenen `0x2` DEĞİL |
| `to` | `0xdb9b1e94…047db3` — PQWallet DEĞİL |
| `authorizationList` | **VAR** |
| `n` · `z` | **5028** · **1061** |
| `gasUsed` | **321.701** |
| tx gaz limiti | 355.372 |

**§10'un ön kayıtlı kuralı uygulandı: üç koşulun üçü de ihlal edildi
(tip ≠ `0x2`, `to` ≠ PQWallet, `n` ≠ 3908), dolayısıyla `321.701` hiçbir
beklentiyle KARŞILAŞTIRILMADI.** §8'in sorusu hâlâ AÇIK.

### ÇÜRÜYEN İDDİA — geri alma TUTMADI

18:00'de `cast code <EOA>` = `0x` ölçülmüştü ve §10'un 1. ön koşulu
"SAĞLANDI" diye yazılmıştı. **O cümle bu koşuyla çürüdü:** gönderim sonrası
aynı okuma yine `0xef010063c0c19a…dae32b` veriyor.

**Mekanizma ölçüldü, atanmadı:** tx 2'nin kendisi bir `authorizationList`
taşıyor. Yani delegasyon "geri gelmedi" — **bu gönderim sırasında yeniden
kuruldu**. MetaMask yükseltmeyi tekrar istedi ve onaylandı.

> **Ön koşul 1 ARTIK YETERLİ DEĞİL.** `cast code <EOA> == 0x` gönderimden
> *önce* okunuyor, ama yükseltme gönderimin *içinde* oluyor. Kapı yanlış anı
> ölçüyor. Nonce 4 koşusu için ön koşul yeniden yazılmalı — gönderim anında
> MetaMask'in yükseltme istemediğinin doğrulanması gerekiyor, bunun nasıl
> ölçüleceği **BİLİNMİYOR**.

### TUTAN BEKLENTİLER

- bakiye `50800000000000000` → **`50700000000000000`** wei · 17 hane · 0,0507 ETH ✓
- `nonce()` 3 → **4** ✓
- `LIMIT` = **263.026** ✓ (UI'da okundu; zincire giden limit yine başka: 355.372)

PQWallet ikinci kez uçtan uca çalıştı: C13 imzası zincirde doğrulandı.

### ÖLÇÜM — 12 gas/sıfır bayt, iki gerçek tx ile

İki koşu aynı yolu izledi, aynı sarmalayıcıya gitti, `n` ikisinde de 5028:

| | tx 1 `0x62d09094…` | tx 2 `0x8f40543a…` | fark |
|---|---|---|---|
| `z` | 1060 | 1061 | **+1** |
| `gasUsed` | 321.713 | 321.701 | **−12** |

Bir fazla sıfır bayt → tam **12 gas** daha az. Düzeltme formülünün
(`216.305 − 12·(z − 203)`) katsayısı artık zincirde ölçülü.

> **AYIRMADIĞI ŞEY — sınır peşinen yazılıyor.** Bu fark, yürütme gazının iki
> koşuda **aynı** olduğu varsayılırsa tamamen sıfır bayta düşer. İki imza
> farklıdır; WOTS+C'nin sabit checksum toplamı yürütmeyi sabit tutuyorsa
> beklenen budur. Yani gözlem **"sabit yürütme + 12 gas/sıfır bayt"** ikilisiyle
> **TUTARLI**, ama ikisini birbirinden **AYIRMIYOR**. Tek başına
> "yürütme gazı sabittir" hükmü bu iki ölçümden çıkarılamaz.

### §11'E EK — 12 gas nereden geldi, ve yürütme sabitliği

İki tx'in **iç** calldata'sı da paketten çıkarıldı:

| | tx 1 `0x62d09094…` | tx 2 `0x8f40543a…` |
|---|---|---|
| dış `n` · `z` | 5028 · **1060** | 5028 · **1061** |
| **iç `n` · `z`** | 3908 · **203** | 3908 · **203** |
| imzadaki sıfır bayt | 16 | 16 |
| imzanın son baytı | `0xc3` | `0xa3` |

**DÜZELTME:** §11'de "bir fazla sıfır bayt" denirken kaynağı yazılmamıştı.
Fazladan sıfır bayt **bizim calldata'mızda DEĞİL** — iç `z` iki koşuda da
203. Fark MetaMask'in sarmalayıcı baytlarında.

Bunun ölçülebilir bir sonucu var:

> İki koşu **farklı imzalar** kullandı (son baytlar `0xc3` ve `0xa3`), ama iç
> calldata'nın `n`'i ve `z`'si özdeş — yani bizim kısmımızın intrinsic
> maliyeti iki koşuda **aynı**. Toplam `gasUsed` farkı 12 ve bu farkın
> **tamamı** dış paketin sıfır baytıyla açıklanıyor. Geriye kalan fark:
> **sıfır.**
>
> **Yani yürütme gazı, iki farklı C13 imzasıyla tam olarak aynı çıktı.**
> Bu, "WOTS+C'nin sabit checksum toplamı yürütmeyi sabit tutar"
> **çıkarımına iki örnekli destek**tir.
>
> **KANIT DEĞİL:** tek bir karşılaştırma, iki örnek, ve sarmalayıcının kendi
> yürütmesinin de iki koşuda özdeş olduğunu **varsayıyor**. Sarmalayıcı
> imzanın içeriğine göre farklı davransaydı bu akıl yürütme çökerdi;
> davranmadığı **ölçülmedi**.

---

## 12. ÖN KAYIT — nonce 4 koşusu, ölçümden ÖNCE yazıldı

§10 **nonce 3** için yazılmıştı; nonce 3 ikinci paketlenmiş tx tarafından
tüketildi (§11). Bu bölüm §10'un yeniden ifadesi değil, **nonce 4'e özgü
tarihli bir ektir**. §10'un çürütme ölçütleri ve karşılaştırma-yapılmama
koşulları **aynen geçerlidir**; burada yalnız koşuya özgü sayılar ve yeni
öğrenilen ön koşul yazılıdır.

### SEBEP BULUNDU — "Added protection"

MetaMask onay ekranında, `Interacting with 0x2EafA…000BB` satırının hemen
üstünde:

> 🛡 **Added protection** `Optional` ☑️ *(işaretliydi)*
> *"Because you're interacting with an unknown address, protection can
> prevent some malicious transactions."*

PQWallet MetaMask için **bilinmeyen bir adres**; koruma yolu işlemi kendi
kontratı üzerinden geçiriyor ve bunun için 7702 yetkilendirmesi gerekiyor.
İlk iki koşuda bu kutu işaretliydi ve okunmadan onaylandı.

**Bu bir ADAY olarak yazıldı, ölçüm sonucu değil.** Ayıracak olan şey nonce 4
tx'inin tipidir: kutu kaldırılmış haldeyken tx `0x2` çıkarsa aday doğrulanır,
yine `0x4` çıkarsa aday çürür ve sebep başka yerdedir.

**Ekrandan okunan yan gözlem:** kutu kaldırılınca `Network fee` **0,0009 →
0,0005 SepoliaETH**. Yön olarak koruma yolunun pahalı olmasıyla tutarlı, ama
bu **ölçüm değildir** — MetaMask tek anlamlı haneye yuvarlıyor, oran
çıkarılamaz.

### Beklenen

| | beklenen |
|---|---|
| tx tipi | **`0x2`** |
| `to` | **PQWallet** `0x2EafA294…f000BB` |
| `authorizationList` | **YOK** |
| `n` | **3908** |
| `z` | **ölçülecek.** İki koşuda da 203 gözlendi, ama imza her koşuda değişiyor — sabit varsayılmaz |
| **`gasUsed_4`** | **216.305 − 12·(z − 203)** · `z = 203` ise **216.305** |
| `LIMIT` | `floor(1,2 · EST)` |
| `nonce()` | 4 → 5 |
| bakiye | `50700000000000000` → **`50600000000000000`** wei · 17 hane · 0,0506 ETH |

`z` için tek bir sayı ön kayda YAZILMIYOR: iç `z` iki koşuda 203 çıktı ama
imza gövdesi her imzalamada değişiyor. Ön kayıt **formüldür**, sayı değil.

### Yeni ön koşul — eskisinin yerine

§10'un 1. ön koşulu (`cast code <EOA> == 0x`) **yetersiz çıktı**: yükseltme
gönderimden önce değil, gönderimin **içinde** oluyor (§11). Yerine:

1. **Onay ekranında "Added protection" kutusu İŞARETSİZ** olmalı — gözle
   doğrulanır, her gönderimde yeniden bakılır.
2. Onay ekranında `Interacting with` satırı **PQWallet adresini** göstermeli.
3. "Account update" / "Smart account" / "Upgrade" ibaresi görülürse
   **Confirm'e basılmaz, Cancel'a basılır.** Reddetmenin maliyeti sıfırdır.
4. *Account details → Smart account → Sepolia* şalteri kapalı olmalı.

---

## 13. §8 KAPANDI — temiz tip-`0x2` tx, ön kayıtlı beklenti birebir tuttu

**Kayıt alınmadı** — bu koşu, "Added protection" adayını sınamak için
bilerek kayıtsız yapıldı.

### Tx

| | |
|---|---|
| hash | `0x0fd4b9b3c992053c7a3c8b3133cfbfdcefacf0242e42b88750b921c718c3e71c` |
| blok | 11767186 · `status 0x1` |
| digest | `0x8aa46c4218015c05323e2c09cd82ab191fc664d7563c7573e5c76dbacd67c76f` |

### ÖN KAYDIN SIRASI — marjıyla birlikte

Beklentinin gerçekten ölçümden önce yazıldığı, iki bağımsız zaman damgasıyla:

```
§12 ön kaydının commit'i (3acb421) : 2026-09-23 23:18:02 +03:00
tx'in blok zamanı (11767186)       : 2026-09-23 23:18:48 +03:00
                                     commit 46 saniye ÖNDE
```

> **Marjın sınırı yazılıyor.** Blok zamanı tx'in **kazıldığı** andır, kullanıcının
> MetaMask'te Confirm'e **bastığı** an değil; o an hiçbir yerde kayıtlı değil.
> Gönderim kazılmadan yaklaşık bir blok (~12 sn) önce olur, yani tıklama
> muhtemelen 23:18:36 civarındaydı — commit'ten sonra. **"Muhtemelen" bir
> çıkarımdır.** Kanıtlanabilir olan tek şey commit'in bloktan 46 saniye önce
> olduğudur; bu, beklentinin geriye dönük ayarlanmadığını gösterir ama
> marj dardır ve öyle yazılmıştır.

### §12'nin üç kapısı — gönderimden önce yazılmıştı, üçü de geçti

| kapı | ölçülen | |
|---|---|---|
| tip | **`0x2`** | ✓ |
| `to` | `0x2eafa294…f000bb` = PQWallet | ✓ |
| `authorizationList` | **YOK** | ✓ |
| `n` | **3908** | ✓ |
| `cast code <EOA>` (gönderimden sonra) | **`0x`** | ✓ delegasyon kurulmadı |

Üç kapı da geçtiği için **karşılaştırma yapıldı.**

### ADAY DOĞRULANDI — "Added protection"

§12'de aday olarak yazılan şey sınandı ve **tuttu**: kutu kaldırılmış haldeki
gönderim tip `0x2` üretti, `to` PQWallet oldu, hiçbir yetkilendirme
kurulmadı. İlk iki koşuyu paketleyen şey **MetaMask'in "Added protection"
özelliğiydi.**

> **Sınırı:** tek koşuluk bir sınama ve tek değişkenli değildi — aynı turda
> *Account details → Smart account → Sepolia* şalteri de kapatılmıştı.
> İkisinin **hangisinin** belirleyici olduğu **AYRILMADI**. Ayıracak deney:
> şalter kapalıyken kutuyu işaretli bırakıp göndermek. Yapılmadı.

### ÖN KAYITLI BEKLENTİ — BİREBİR TUTTU

```
z (zincirden ölçüldü) = 206
beklenti = 216.305 − 12·(206 − 203) = 216.269
ölçülen  gasUsed      = 216.269                  ✓
```

**§8'İN SORUSU KAPANDI: ADAY 2.** Model tuttu. `gasUsed` tahminin kendisi
(219.153) çıkmadı, yani **aday 3 çürüdü**.

### Modelin kendi içinde kapanması — dört bağımsız kontrol

| kontrol | sonuç |
|---|---|
| `est(216269)` | **219.153** = zincirdeki tx gaz limiti ✓ |
| `Δ₄ = EST − gasUsed` | **2.884** = ön kayıtlı `Δ₂` ✓ |
| `z` farkının etkisi | `gasUsed` −36 **ve** tahmin −36; `12 × 3 = 36` ✓ |
| `inv[219153]` | `[216269]` — ters çözüm TEK, ölçülen `gasUsed`'a eşit ✓ |

§8'in doğrulama betiğindeki dört `assert` hâlâ geçiyor.

> **Çapraz kontrolün gücü buradan geliyor:** `z` beklenenden **üç** sıfır bayt
> fazla çıktı ve bu, hem harcanan gazı hem tahmini **aynı miktarda** (36 gas)
> aşağı kaydırdı. Düzeltme formülü ile afin ilişki aynı anda sınandı; biri
> tutup diğeri tutmasa fark açılırdı.

### YAN BULGU — %20 payı zincire ulaşmıyor

```
sendExecute'un hesapladığı gasLimit : 262.983   (UI'da görünen)
zincirdeki tx gaz limiti            : 219.153   (ham tahminin kendisi)
```

MetaMask limitimizi yine değiştirdi — bu sefer **aşağı**, ham tahmine.
`sendTransaction.js:202`'deki `(estimated * 12n) / 10n` payı, MetaMask
imzalayıcıyken **pratikte ölü**. Bu koşuda sorun çıkmadı (216.269 < 219.153)
ama güvenlik payı diye yazılan şey zincire gitmiyor.

**Üç koşuda da aynı desen:** bizim verdiğimiz `gasLimit` hiç kullanılmadı
(263.026 → 355.384 · 263.026 → 355.372 · 262.983 → 219.153).

### AÇIK KALANLAR

- **Trace hâlâ alınmadı.** §9'da nonce 3'e bırakılmıştı; bu tx temiz geldiği
  için `gasUsed`'ın tamamı zaten PQWallet'ın kendi çağrısıdır ve ayrı frame
  ölçümüne gerek kalmadı. **`138.097` ile karşılaştırma yine YAPILMADI** —
  o sayı yürütme bileşeniydi, bu ölçüm toplam `gasUsed`.
- **Kayıtlı demo koşusu yapılmadı.** Task 6'nın kayıt ayağı açık; nonce 5
  ile çekilecek.
- "Added protection" ile Sepolia şalterinin hangisinin belirleyici olduğu
  ayrılmadı.
