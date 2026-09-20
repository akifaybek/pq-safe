# Tarayıcı adımı — WASM imzalayıcı tarayıcıda koştu

**Tarih:** 20 Eylül 2026 — **İKİ AYRI KOŞU**, aşağıda ayrı ayrı yazıldı.
**Koşan:** Akif, elle. **Ajan tarayıcıyı çalıştırmadı**; aşağıdaki değerler Akif'in
ekran görüntülerinden okundu.
**Ortam:** macOS, Chrome, Vite dev sunucusu (`npx vite`), `localhost:5173`.
**Amaç:** ÖK-2'nin son açık parçası — `vite build`in geçmesi sayfanın çalıştığını
göstermiyordu.

> **KOŞU 1** (bu dosyanın ilk hâli): DevTools Ağ sekmesi `wasm` filtresiyle,
> konsol sekmesi yalnızca imzadan sonra açıldı. Konsol sayımı **eksik kaldı**.
>
> **KOŞU 2** (aşağıda, ayrı başlık): filtreler **kaldırılmış**, konsol keygen'den
> **önce** açık. Koşu 1'in beş eksik ölçümü burada kapandı. **Koşu 1'in sayıları
> silinmedi** — iki koşu ayrı oturum, sayıları karıştırılmıyor.

## SONUÇ

**İki teknik iddia da ayrı ayrı kanıtlandı** (`.wasm` örneklendi · 3688 baytlık
imza üretildi). "Sayfa açıldı, konsol temiz" ifadesi kanıt olarak
**kullanılmadı** ve kullanılamazdı.

> **KOŞU 1 SONRASI HÜKÜM (tarihsel, aşağıda güncellendi):** *"ÖK-2'nin tarayıcı
> maddesi HENÜZ KAPANMADI. Konsol sayımı eksik…"* — Koşu 2 bu beş eksiği
> kapattı; kapanış hükmü **"Koşu 2"** başlığının sonunda.
>
> **KOŞU 2 SONRASI:** konsol sayımı **tam**, ve **DEPO KAYNAKLI kayıtlar
> bulundu** — hepsi hata seviyesinin altında. *"Görünen kayıtların hepsi
> eklenti kaynaklıydı"* cümlesi **YANLIŞTI ve düzeltildi**. Bir kalem hâlâ
> açık: Sorunlar panelindeki CSP/`eval` kaleminin kaynağı ölçülmedi.

## İddia 1 — `.wasm` gerçekten örneklendi

Kanıt, boş listeden dolu listeye geçiş:

| An | Ağ sekmesi (`wasm` filtresi) |
|---|---|
| Sayfa açılışı | `sphincs_c13_signer.js` · 200 · **script** · başlatan `signer.js:5` · 54,1 kB · 26 ms |
| **keygen'den sonra** | yukarıdaki **+** `sphincs_c13_signer_bg.wasm` · 200 · **wasm** · başlatan `sphincs_c13_signer.js` · **228 kB** · 15 ms |

**Sayfa açılışında `.wasm` binary'si İSTENMEDİ.** Listede görünen tek satır JS
tutkalıydı; filtreye takılmasının sebebi dosya adı değil **yolu**:
`src/crypto/wasm-pkg-web/…`, ve `signer.js:5` tam olarak oradan import ediyor.

Bu ayrım `ensureWasmInit` teşhisini **doğruluyor ve keskinleştiriyor**:

- `import` **tutkalı** getirir — sayfa açılışında oldu (54,1 kB).
- `.wasm`'ı getiren **`init()`**'tir ve o tembel — yalnızca `keygen`'de koştu.

Ölçümden önce açık bırakılan ihtimal de kapandı: Vite dev sunucusunun ön-yükleme
yapıp yapmadığı bilinmiyordu. **Yapıyor — ama yalnızca modül için, binary için
değil.**

> Bu satır, 18 Eylül'de Hakan'ın Windows raporu için kurulan *"temiz konsol
> imzalayıcı hakkında sıfır kanıttır"* argümanının dayanağıdır ve artık
> ölçülmüştür: imza üretilmeden `.wasm` hiç indirilmiyor.

## İddia 2 — tarayıcıda 3688 baytlık imza üretildi

Bölüm 2 → **İmzala**, digest kutusundaki varsayılan
`0xdeadbeef…deadbeef` değeriyle:

```
İmza (3688 bayt)
✓ imza uzunluğu 3688 bayt (C13 beklenen)
sign tamamlandı (11008.8 ms)
```

İmzanın hex gövdesi ekranda tam olarak render edildi.

| Ölçüm | Değer |
|---|---|
| `keygen` | **628,5 ms** |
| `sign` | **11.008,8 ms** |
| İmza uzunluğu | **3688 bayt** — C13 beklenen değeri, kontrol **geçti** |

**SAPMA — kayda geçiyor:** aynı imzalama Node'da 7,5 sn ölçülmüştü
(`wasm-signer-test.mjs`, 18 Eylül); tarayıcıda **11,0 sn**, yani **yaklaşık %47
daha yavaş**. Sebep ölçülmedi. Node ölçümü ayrı bir süreçte ve farklı bir WASM
hedefiyle (`--target nodejs`) koştu; tarayıcı `--target web` tutkalını ve sekme
içindeki tek iş parçacığını kullanıyor. Bu iki açıklama da mümkün ve **bu ölçüm
ikisini ayırt etmez.**

Ekranda ayrıca `pkSeed`, `pkRoot`, `publicKey` (64 bayt, SPHINCSVerifier.sol
formatı) ve ECDSA adresi göründü — yani açık anahtar bileşenleri render edildi.
Değerler buraya **kasten kopyalanmadı**: ekran görüntüsünden hex kopyalamak
transkripsiyon hatası riski taşır ve bu değerler zaten taze, tek kullanımlık bir
mnemonic'ten türetildi. Gözlem: `pkSeed` ve `pkRoot` sondaki sıfır dolgusuyla
32'şer bayt olarak gösteriliyor, 64 baytlık doğrulayıcı formatıyla tutarlı.

## Konsol — SAYIM EKSİK, hüküm ASKIDA

> **DÜZELTME, 20 Eylül.** Bu bölüm önce *"görünen 12 kayıt, proje kodundan 0
> hata"* diye yazılmıştı. **İki hata vardı:** (i) 12, yalnızca **imzadan
> sonraki** ana ait — sayfa açılışında sayaç **3 hata · 6 uyarı** gösteriyordu
> ve iki an birbirine karışmıştı; (ii) o üç hatanın kaynağı **hiç
> enumerе edilmedi**, dolayısıyla "0 hata" hükmü gözleme değil **varsayıma**
> dayanıyordu. Akif yakaladı. Aşağısı yalnızca **gerçekten görülen** şeyi
> yazıyor.

### Sayaçlar, ana ana

| An | Hata | Uyarı |
|---|---|---|
| Sayfa açılışı (keygen'den ÖNCE) | **3** | 6 |
| keygen'den sonra | **6** | 6 |
| sign'dan sonra (Ağ sekmesindeyken) | **8** | 6 |
| Konsol sekmesi açıldığında | **12** | 6 |

Tek toplam yazılmıyor. Hata sayısı biz hiçbir şey yapmadan artmaya devam etti;
artışın kaynağı aşağıdaki Sentry isteklerinin yeniden denenmesi.

### Enumerasyon — YALNIZCA sign sonrası an için var

Konsol sekmesi **yalnızca imzadan sonra** açıldı. O listede görünen her kaydın
kaynak dosyası okundu:

| Kayıt (ilk satır) | Kaynak dosya | Etiket |
|---|---|---|
| `MaxListenersExceededWarning: Possible EventEmitter memory leak detected. 11 close listeners added.` | `contentscript.js:14083` | **eklenti** (MetaMask) |
| `MaxListenersExceededWarning: … 11 end listeners added.` | `contentscript.js:14083` | **eklenti** |
| `ObjectMultiplex - orphaned data for stream "app-init-liveness"` ×2 | `contentscript.js:14083` | **eklenti** |
| `ObjectMultiplex - orphaned data for stream "background-liveness"` ×2 | `contentscript.js:14083` | **eklenti** |
| `POST https://o370968.ingest.sentry.io/api/6260025/envelope/… net::ERR_CERT_AUTHORITY_INVALID` (çok sayıda) | `content.js:50` | **eklenti** |
| aynı istek, bir kez `net::ERR_CONNECTION_TIMED_OUT` | `content.js:50` | **eklenti** |
| `Unchecked runtime.lastError: The message port closed before a response was received.` | `(dizin):1` | **eklenti** (mesajlaşma) |

Etiketler dosya adına dayanıyor, tahmine değil; ve "eklenti" etiketi depodan
doğrulandı:

- `grep -rin "sentry" frontend/src frontend/index.html frontend/package.json` → **boş**
- `find frontend/src -name "content*.js"` → **boş**

### AÇIK KALAN İKİ BOŞLUK — hüküm bu yüzden askıda

1. **Sayfa açılışındaki 3 hata enumerе EDİLMEDİ.** O anda yalnızca sayaç
   görüldü, konsol sekmesi açılmadı. Üçünün kaynağı yazılmadan *"proje
   kodundan 0 hata"* denemez.
2. **DevTools filtre çubuğu "3 gizli" diyordu.** Yani sign sonrası listede bile
   üç kayıt filtre tarafından gizlenmişti ve **incelenmedi**. Görünen kayıtların
   hepsinin eklenti kaynaklı olması, gizlenenler için hiçbir şey söylemez.

**Koşu 1'de söylenebilecek en güçlü cümle:** *imzadan sonraki konsol listesinde
GÖRÜNEN kayıtların hepsi eklenti kaynaklıydı.* "Proje kodundan 0 hata" bundan
daha geniş bir iddiadır ve henüz karşılanmadı.

> **BU CÜMLE KOŞU 2'DE ÇÜRÜDÜ — 20 Eylül.** Filtre kaldırılınca **depo kaynaklı
> bir kayıt göründü** (`[DOM] Password field is not contained in a form`,
> `index.html:38`). Yani "hepsi eklenti kaynaklı" Koşu 1'de de yanlış olabilirdi
> ve bunu gizleyen şey **filtrenin kendisiydi** — koşu 1'de "3 gizli" yazıyordu.
> Hangi üç kaydın gizlendiği bilinmiyor ve artık ölçülemez; Koşu 2 bunu
> **gizlenen kayıt bırakmayarak** çözdü, gizlenenleri açarak değil.

| Kayıt | Kaynak | Bizim mi |
|---|---|---|
| `MaxListenersExceededWarning` ×2, `ObjectMultiplex — orphaned data` ×4 | `contentscript.js:14083` | Hayır — MetaMask |
| `POST …ingest.sentry.io… net::ERR_CERT_AUTHORITY_INVALID` (ve bir `ERR_CONNECTION_TIMED_OUT`) | `content.js:50` | Hayır — başka bir eklenti |
| `Unchecked runtime.lastError: The message port closed…` | `(dizin):1` | Hayır — eklenti mesajlaşması |

Doğrulama, ekran görüntüsüne değil depoya dayanıyor:

- `grep -rin "sentry" frontend/src frontend/index.html frontend/package.json` → **boş**.
  Uygulama Sentry kullanmıyor, bağımlılıklarında da yok.
- `find frontend/src -name "content*.js"` → **boş**. `content.js` ve
  `contentscript.js` bu depoda yok.

Sentry isteklerindeki `ERR_CERT_AUTHORITY_INVALID`, araya giren bir TLS
denetimine işaret ediyor (kurumsal ağ ya da güvenlik yazılımı) — **uygulamayla
ilgisi yok**, ve hata sayısı biz hiçbir şey yapmadan artmaya devam etti
(3 → 6 → 8 → 12), çünkü eklenti isteği yeniden deniyor.

### `favicon.ico` — GÖRÜNMEMESİ ÖLÇÜM DEĞİL (Koşu 1)

> Koşu 2'de Ağ sekmesinde arandı: **0/31 istek**. Kalan belirsizlik ve sunucu
> tarafı 404 ölçümü **Koşu 2 → `/favicon.ico`** başlığında.


Konsolda 404 görünmedi. **Bu, 404'ün olmadığını göstermez:** konsol filtresi
("3 gizli"), önbellek ya da DevTools ayarı da aynı sonucu verir. Chrome favicon
hatasını çoğu durumda Ağ sekmesine yazar, konsola değil.

**ÖLÇÜLMEDİ — Ağ sekmesinde `/favicon.ico` isteği aranmadı.** Filtre kutusunda
`wasm` yazılıydı, yani favicon isteği listede zaten görünemezdi. Yapılacak:
filtreyi temizleyip `favicon` aramak, istek varsa **durum kodunu**, yoksa
"istek hiç yok"u yazmak.

**Kayda geçen taahhüt hatırlatması:** 19 Eylül'de favicon'un kapatılmaması
kararı verilirken gerekçelerden biri *"404 ayrı satırda sayılacak"* idi
(bkz. defter, FAVICON KARARI). Bu koşuda **sayılmadı**; sebebi yukarıdaki
filtre. Ölçüm tamamlanınca buraya yazılacak.

## Kapsam — ne koşuldu, ne koşulmadı

Koşulan yol: **Bölüm 1 keygen → Bölüm 2 İmzala**, `btn-keygen` ile üretilen
**taze mnemonic** ile.

**KOŞULMAYANLAR, açıkça:**

- **Owner mnemonic GİRİLMEDİ.** Bölüm 1'in "İçe aktar" kutusuna dokunulmadı.
- **MetaMask bağlanmadı.** Bölüm 3 ve 4 kullanılmadı; `btn-sign` yalnızca
  bellekteki mnemonic'e bakıyor, cüzdan istemiyor.
- **Zincire hiçbir şey gitmedi.** Ölçüm penceresi (19-22 Eylül) ihlal edilmedi.
- **Bölüm 4'ün `build+sign` yolu koşulmadı** — bu adım `signDigest`'i doğrudan
  çağıran yolu kanıtlar, `buildAndSign` zincirini değil.
- **Gerçek tx yolu koşulmadı** — o Task 6'nın işi.

## Ölçüm ortamı — KOŞU 1'DE EKSİKTİ, KOŞU 2'DE YAZILDI

> Aşağısı Koşu 1'in durumudur. Ortam değerleri **Koşu 2 → Ortam** başlığında.


Sapma yorumlanmayacak (yukarıda öyle yazıldı), ama sebep ileride aranırsa girdi
olsun diye ortam kayda girer. **Şu an elde olmayanlar:** Chrome sürümü,
macOS sürümü, o an açık sekme sayısı ve makine yükü. Bunlar yazılmadan
"tarayıcı WASM yürütme farkı" ile "o andaki makine yükü" açıklamaları
arasında ileride bile seçim yapılamaz. İkisi de şu an ayakta, **ölçülmedi**.

## İki boyut — KOŞU 1'DE NETLEŞMEDİ, KOŞU 2'DE ÖLÇÜLDÜ

> Aşağıdaki *"akla yatkın açıklama … ama bu bir tahmindir"* cümlesi Koşu 2'de
> **ölçümle değiştirildi**: gövdenin %81'i satır içi kaynak haritası.
> Bkz. **Koşu 2 → İki boyut**.


DevTools'un **Boyut** sütunu okundu: JS **54,1 kB**, wasm **228 kB**.
**Önbelleği devre dışı bırak** işaretliydi, yani transfer bekleniyor.

| Dosya | Diskte (ölçüldü) | Ağ sekmesinde | Uyum |
|---|---|---|---|
| `sphincs_c13_signer_bg.wasm` | **227.416 bayt** | 228 kB | tutarlı |
| `sphincs_c13_signer.js` | **10.082 bayt** | **54,1 kB** | **TUTMUYOR — 5,4 kat** |

wasm satırı transfer ≈ kaynak olarak okunuyor ve diskle uyuşuyor. **JS satırı
uyuşmuyor** ve sebebi ölçülmedi. Akla yatkın açıklama Vite dev sunucusunun
modülü dönüştürüp satır içi kaynak haritası eklemesi — **ama bu bir tahmindir**,
DevTools satırı genişletilip transfer/kaynak ayrımı okunmadan yazılmaz.
Bu rakam hiçbir iddiayı taşımıyor; yine de açıklanmadan bırakılmıyor.

## Tamamlanacak ölçümler — KOŞU 2'DE BEŞİ DE ÖLÇÜLDÜ

1. ~~Sayfa açılışındaki hataların her biri: ilk satır + kaynak dosya + etiket.~~
   **Ölçüldü** — açılışta **1 hata**, tablo aşağıda. (Koşu 1'de 3'tü; ayrı koşu,
   ayrı sayı.)
2. ~~Konsol filtresinin gizlediği kayıtların açılması.~~ **Konu ortadan
   kaldırıldı** — filtre kutusu boş, seviye "Tüm seviyeler", gizlenen kayıt yok.
3. ~~Ağ sekmesinde `/favicon.ico` aranması.~~ **Ölçüldü** — `favicon` filtresi
   **0/31 istek**. Kalan belirsizlik aşağıda, ayrı başlıkta.
4. ~~Ortam.~~ **Ölçüldü** — aşağıda.
5. ~~`sphincs_c13_signer.js` transfer/kaynak ayrımı.~~ **Ölçüldü ve sebebi de
   ölçüldü** — aşağıda.

---

# KOŞU 2 — 20 Eylül 2026, filtresiz

**Değerler Akif'in altı ekran görüntüsünden okundu.** Ajan tarayıcıyı
çalıştırmadı; ajanın kendi koştuğu tek şey aşağıda `curl`/`grep` diye
işaretlenen yerel kontrollerdir.

## Ortam

| | |
|---|---|
| Chrome | **153.0.8010.48** (Resmi Derleme, **arm64**) |
| İşletim sistemi | **macOS 26.6.2** (Derleme 25G83) |
| V8 | 15.3.76.12 |
| Profil | `Profile 3` |
| Sunucu | `npx vite` → `localhost:5173` |

**Açık sekme sayısı — İKİ KAYNAK ÇELİŞİYOR, ikisi de yazılıyor:** Akif **1**
bildirdi; altı ekran görüntüsünün altısında da pencerede **2 sekme** sayıldı
(uygulama + `çeviri - Google'da Ara`). Ölçüm ekran görüntüsünden, bildirim
Akif'ten; hangisinin doğru olduğu **ayırt edilmedi**. Bu sayının tek işi sapma
ileride araştırılırsa girdi olmak, bu yüzden hüküm verilmiyor.

**DevTools ayarları:** Konsol filtre kutusu **boş**, seviye **"Tüm seviyeler"**.
Ağ filtre kutusu **boş**, "Büyük istek satırları" **açık**, "Önbelleği devre
dışı bırak" **işaretli**.

## İKİ SAYFA OTURUMU — karıştırılmıyor

Koşu 2 tek bir sayfa oturumu değil. **Akif ölçümün ortasında sayfayı yeniledi**
(kendisi bildirdi) ve iki bağımsız ölçüm de bunu doğruluyor:

| | Oturum A | Oturum B |
|---|---|---|
| `DOMContentLoaded` | **329 msn** | **296 msn** |
| Hata sayacı, en son görülen | 4 | 1 → 2 |

Hata sayacının **düşmesi** tek başına yeterli kanıttı: aynı oturumda sayaç
azalamaz, konsol temizlenseydi uyarılar ve `[vite]` satırları da silinirdi —
silinmemişler.

**SONUCU ŞU:** `keygen` süresi **Oturum A'ya**, `sign` süresi **Oturum B'ye**
ait. İkisi tek koşunun ardışık adımları **değil** ve öyle okunamaz.
Oturum B'nin `keygen` süresi **ölçülmedi** (ekran görüntüsü o bölümü
göstermiyor).

### Sayaçlar, an an

| Oturum | An | Hata | Uyarı | Bilgi |
|---|---|---|---|---|
| A | sayfa açılışı | **1** | 6 | 1 |
| A | ~aynı an, hiçbir şey yapılmadan | 2 | 6 | 1 |
| A | `keygen` sonrası | 4 | 6 | 1 |
| B | `sign` sonrası | **1** | 6 | 1 |
| B | ~1,1 dk sonra, favicon kontrolü | 2 | 6 | 1 |

Artışın kaynağı yine eklentinin Sentry isteğini yeniden denemesi; **biz hiçbir
şey yapmadan** 1'den 2'ye çıkıyor. Tek toplam yazılmıyor.

## Açılış anının TAM enumerasyonu — gizlenen kayıt yok

Oturum A ve Oturum B'nin açılış listeleri **birebir aynı**.

| Seviye | Kayıt (ilk satır) | Kaynak | Etiket |
|---|---|---|---|
| ⚠ ×2 | `MaxListenersExceededWarning: … 11 close listeners added.` / `… 11 end listeners added.` | `contentscript.js:14083` | eklenti (MetaMask) |
| ⚠ ×2 | `ObjectMultiplex – orphaned data for stream "app-init-liveness"` | `contentscript.js:14083` | eklenti |
| ⚠ ×2 | `ObjectMultiplex – orphaned data for stream "background-liveness"` | `contentscript.js:14083` | eklenti |
| log ×2 | `[vite] connecting…` / `[vite] connected.` | `client:859` / `client:968` | araç (Vite HMR) |
| 💬 ×1 | `[DOM] Password field is not contained in a form` | `(dizin):1` | **DEPO** |
| ❌ ×1 | `Unchecked runtime.lastError: The message port closed before a response was received.` | `(dizin):1` | eklenti — **çıkarım**, aşağı bak |

`keygen` sonrası (Oturum A) eklenen üç hata:

| Seviye | Kayıt | Kaynak | Etiket |
|---|---|---|---|
| ❌ ×1 | `POST https://o370968.ingest.sentry.io/api/6260025/envelope/…` → `net::ERR_CONNECTION_TIMED_OUT` | `content.js:50` | eklenti |
| ❌ ×2 | aynı istek → `net::ERR_CERT_AUTHORITY_INVALID` | `content.js:50` | eklenti |

## DEPO KAYNAKLI KAYIT — hüküm daraltıldı

Filtre kaldırılınca **bizim kodumuzdan bir kayıt göründü**:

```
[DOM] Password field is not contained in a form: (More info: https://goo.gl/9p2vKq)
  <input id="import-mnemonic" type="password" autocomplete="off"
         placeholder="12 kelime — ekrana yazdırılmaz">
```

Alıntılanan eleman `frontend/index.html:38`, birebir aynı satır. **Etiket
tahminle değil, alıntının kendisiyle konuldu.**

**İki cümle ayrı ayrı:**

- **"Konsolda proje kodundan 0 HATA" — AYAKTA.** Bu kayıt `❌` değil `💬`;
  seviye bilgi. Sayaç `❌1 ⚠6 💬1` ve o tek bilgi kaydı tam olarak budur.
- **"Görünen kayıtların hepsi eklenti kaynaklı" — ÇÖKTÜ.** Görünen kayıtlardan
  biri bizim. Bu cümle dosyanın Koşu 1 bölümünde duruyordu, orada da
  işaretlendi.

### `Unchecked runtime.lastError` etiketi — GÖZLEM DEĞİL, ÇIKARIM

Koşu 1 bu kaydı düpedüz **"eklenti (mesajlaşma)"** diye etiketlemişti. Kuralımız
*"etiket dosya adına dayanır, tahmine değil"* diyor ve **kaynak sütunu
`(dizin):1` gösteriyor — yani belge, bizim dosyamız.** O kurala göre bu kayıt
"eklenti" diye etiketlenemez. Elde iki ayrı şey var:

- **Gözlem:** kaynak sütunu belgeyi gösteriyor.
- **Depo ölçümü (ajan koştu):** `grep -rn "chrome\.runtime\|runtime\.lastError"
  src index.html` → **boş**. Kodumuz bu API'yi hiç çağırmıyor.

`runtime.lastError` yalnızca `chrome.runtime` API'sinden çıkar; bizde o API yok,
dolayısıyla kaydı bir eklenti üretiyor ve Chrome onu belge bağlamına yazıyor.
**Bu bir çıkarımdır**, dosya adı gözlemi değil — ve kayda böyle geçiyor.
Koşu 1'in düz "eklenti" etiketi bu gerekçeyi taşımıyordu.

## Sorunlar (Issues) paneli — AYRI YÜZEY, dört kalem

Koşu 1'de bu panel **hiç açılmamıştı**. Araç çubuğundaki *"4 sorun: ❌1 💬3"*
rozeti **gizli konsol kaydı sayacı değil**; ayrı bir yüzey.

| Seviye | Kalem | Kaynak — ÖLÇÜLDÜ |
|---|---|---|
| 💬 ×3 | `No label associated with a form field` | **DEPO — `index.html:64, 67, 70`** |
| ❌ ×1 | ``Content Security Policy of your site blocks the use of `eval` in JavaScript`` · yönerge `script-src` · Durum **Engellendi** · kaynak konumu **boş** | **ÖLÇÜLMEDİ** |

**Üç `label` kalemi kesin bizim, sayım birebir tutuyor:** `index.html`'de üç
çıplak `<label>` var (satır 64, 67, 70 — *PQWallet adresi*, *Zincirdeki nonce*,
*Cüzdan bakiyesi*) ve üçü de bir form alanına değil `<div class="field">`e
eşlik ediyor. Üç etiket, üç kalem. Kozmetik/erişilebilirlik; işlevsel etkisi yok.

### CSP/`eval` kalemi — kimin olduğu ÖLÇÜLMEDİ, AÇIK KALEM

Chrome *"your site"* diyor. **Bizim sayfamız olmadığı iki ayrı ölçümle
gösterildi** (ikisini de ajan koştu):

1. `grep -n -i "content-security-policy" index.html` → **boş**. HTML'imizde CSP
   meta'sı yok.
2. `curl -s -D - -o /dev/null http://localhost:5173/` → başlıklar arasında
   **`Content-Security-Policy` yok**. Vite dev sunucusu CSP göndermiyor.

Ayrıca `grep -rn "eval(\|new Function" src index.html` → **boş**; kodumuz
string değerlendirmiyor.

**Durum "Engellendi" olduğuna göre bir CSP gerçekten engelledi — ama o CSP
bizim değil.** Kimin olduğu **ölçülmedi**. Akla yatkın aday eklentinin kendi
CSP'si (eklenti bağlamları varsayılan olarak `eval`i yasaklar ve Chrome bu
kalemi ilgili sekmenin Sorunlar paneline yazabilir) — **ama bu bir tahmindir.**

**AYIRACAK ÖLÇÜM:** aynı sayfayı **eklentisiz** bir pencerede açmak (yeni profil
ya da Misafir). Kalem kaybolursa kaynak eklentidir; kalırsa arama bize döner.
Tek değişkenli deney, ~2 dakika. **Koşulmadı.**

## `/favicon.ico` — istek Ağ panelinde GÖRÜNMEDİ

| Ölçüm | Sonuç |
|---|---|
| Ağ sekmesi, filtre `favicon` | **0/31 istek** |
| Konsol | 404 yok |
| Sunucu tarafı (ajan, `curl -i http://localhost:5173/favicon.ico`) | **`HTTP/1.1 404 Not Found`**, `Content-Length: 0` |

Yani **istenseydi 404 dönecekti**; bu koşuda Ağ panelinde istek görünmedi.

> **KALAN BELİRSİZLİK, kapatılmıyor:** *"istek hiç yapılmadı"* ile *"istek
> yapıldı ama DevTools Ağ paneline yazılmadı"* bu ölçümle **AYRILMIYOR**.
> Chrome favicon'u tarayıcı sürecinden ister ve bu istek Ağ paneline her zaman
> düşmez. Ayıracak şey bir **sunucu erişim günlüğü**; Vite dev varsayılanda
> tutmuyor. Koşu 1'deki *"Chrome favicon hatasını çoğu durumda Ağ sekmesine
> yazar"* cümlesi bir varsayımdı ve **doğrulanmadı**.

**19 Eylül taahhüdü** (*"404 ayrı satırda sayılacak"*, bkz. defter, FAVICON
KARARI): bu koşuda sayılacak bir 404 **çıkmadı** ve sebebi yukarıdaki
belirsizlik. Taahhüt karşılandı sayılmıyor, durumu böyle yazılıyor.

## İki boyut — SORU KAPANDI, mekanizma ölçüldü

| Dosya | Transfer | Kaynak | Diskte |
|---|---|---|---|
| `sphincs_c13_signer.js` | **54,1 kB** | **53,8 kB** | **10.082 bayt** |

Transfer ≈ kaynak. Yani 5,4 katlık fark **aktarım kodlamasından değil** —
sunucunun verdiği gövdenin kendisi büyük. Koşu 1'de bu ayrım okunamadığı için
"Vite dönüştürüyor olabilir" bir **tahmin** olarak bırakılmıştı; artık ölçüldü
(ajan, `curl`):

```
sunucunun verdiği gövde   : 53.819 bayt      (DevTools "kaynak 53,8 kB" ile uyumlu)
diskteki dosya            : 10.082 bayt
satır içi kaynak haritası : 43.656 bayt      (base64, //# sourceMappingURL=data:…)
```

`10.082 + 43.656 = 53.738`; kalan ~81 bayt `//# sourceMappingURL=data:application/json;base64,`
öneki ve Vite'ın import yolu yeniden yazımı. **Fark tamamen açıklandı:
gövdenin %81'i satır içi kaynak haritası.** Bu bir dev sunucusu davranışıdır;
`vite build` çıktısını etkilemez ve hiçbir iddiayı taşımıyor.

## Koşu 2'nin süre ölçümleri — ÜÇÜNCÜ VE DÖRDÜNCÜ NOKTA

| | Koşu 2 | Koşu 1 | Node (18 Eylül) |
|---|---|---|---|
| `keygen` | **379,1 ms** (Oturum A) | 628,5 ms | — |
| `sign` | **24.213,6 ms** (Oturum B) | 11.008,8 ms | ~7.500 ms |
| İmza uzunluğu | **3688 bayt** ✓ | 3688 bayt ✓ | 3688 bayt |

Ekranda yine `✓ imza uzunluğu 3688 bayt (C13 beklenen)` geçti — **imzalayıcı
ikinci kez, bağımsız bir oturumda doğru uzunlukta imza üretti.**

> **KOŞU 1'İN "%47 YAVAŞ" CÜMLESİ TEK ÖLÇÜME DAYANIYORDU.** Elde artık üç sayı
> var: **7,5 sn (Node) · 11,0 sn (tarayıcı, koşu 1) · 24,2 sn (tarayıcı, koşu 2)**.
> Tarayıcının iki ölçümü arasında **2,2 kat** fark var ve ikisi de aynı makinede,
> aynı gün, aynı tarayıcıda alındı. Dolayısıyla "%47" bir **sabit değil**, tek
> koşunun rakamı.
>
> Sebep **ölçülmedi** ve yorumlanmıyor. Ayakta kalan açıklamalar: makine yükü ·
> `--target web` ile `--target nodejs` farkı · sekme içindeki tek iş parçacığı ·
> ikinci oturumda tarayıcının başka iş yapıyor olması. **Bu ölçümler hiçbirini
> ayırt etmiyor.** Ayıracak şey: aynı oturumda ard arda n ≥ 5 imza ve makine
> yükünün eşzamanlı kaydı. Yapılmadı, Sprint 4'ün işi değil.

Açık anahtar bileşenleri (`pkSeed`, `pkRoot`, `publicKey` 64 bayt, ECDSA adresi)
ekranda yine render edildi. **Hex değerler buraya yine kasten kopyalanmadı** —
ekran görüntüsünden transkripsiyon hatası riski ve değerler taze, tek
kullanımlık bir mnemonic'ten türetildi.

## Ağ — Koşu 2 toplamları

| | Oturum A | Oturum B |
|---|---|---|
| İstek sayısı | 30 → 31 (31.'si beklemede olan Sentry `envelope`) | 31 |
| Aktarılan | 5.245 kB | 5.473 kB |
| Kaynak | 5.240 kB | 5.467 kB |
| `DOMContentLoaded` | 329 msn | 296 msn |

`sphincs_c13_signer.js` · `200` · tür **script** · başlatan `signer.js:5` ·
yol `/src/crypto/wasm-pkg-web` · 66 msn.

**Yan gözlem — sayfa açılışta zinciri okuyor:** `sepolia.js:34` (×2),
`pqwallet.js:36`, `pqwallet.js:41` üzerinden `ethereum-sepolia-rpc.publicnode.com`
istekleri (200, önlerinde 204 preflight'lar) ve UI'da **nonce 2 · bakiye
50900000000000000 wei = 0,0509 ETH** göründü. Bu, Task 5 Adım 0 kapısıyla
**tutarlı** — ama **kapının yerine geçmez**: kapı `cast call` ile, uygulamanın
salt-okunur provider'ından bağımsız koşar.

## KOŞU 2'NİN HÜKMÜ

**Kapandı:**

- Açılış anının konsol kayıtları **tam enumere edildi**, her birinin kaynak
  dosyası yazıldı.
- **Gizlenen kayıt yok** — filtre kaldırıldı, seviye "Tüm seviyeler".
- Ortam yazıldı (sekme sayısı hariç, o çelişkili).
- Transfer/kaynak ayrımı **ve** farkın sebebi ölçüldü.
- İmzalayıcı **ikinci bağımsız oturumda** yine 3688 baytlık imza üretti.

**Söylenebilecek en güçlü cümle, artık bu:** *konsolda proje kodumuzdan
**sıfır hata** var; projeden gelen kayıtlar bir bilgi kaydı (`index.html:38`)
ve Sorunlar panelinde üç erişilebilirlik kalemi (`index.html:64, 67, 70`) ile
sınırlı; hata seviyesindeki tüm konsol kayıtları eklenti kaynaklı.*

**Açık kalan tek kalem:** Sorunlar panelindeki **CSP/`eval`** kaleminin kaynağı.
Bizim sayfamız olmadığı ölçüldü; kimin olduğu ölçülmedi. Eklentisiz tek
değişkenli koşu bunu kapatır.

## ÖK-2 için anlamı — MADDE KAPANDI

Teknik çekirdek **kanıtlandı**: derlenmiş imzalayıcı, depodan gelen çıktıyla,
gerçek bir tarayıcıda örneklendi ve doğru uzunlukta imza üretti — **iki ayrı
koşuda, üç ayrı sayfa oturumunda**.

**Kapanış kuralı neydi:** *"konsol sayımı iki ana ayrılmadan ve sayfa
açılışındaki hataların kaynağı yazılmadan işaretlenmez."* **Karşılandı** —
Koşu 2'de sayaçlar beş ana ayrıldı, açılış listesi tam enumere edildi ve
gizlenen kayıt bırakılmadı.

**Kapatan gözlem:** açılışta tek hata `Unchecked runtime.lastError` ve hata
seviyesindeki diğer her kayıt `content.js:50`'den, yani eklentiden geliyor;
depodan gelen iki kalem de hata seviyesinin **altında** (bir `💬` konsol kaydı,
üç `💬` erişilebilirlik sorunu). "Proje kodundan 0 hata" artık varsayıma değil
bu satırlara dayanıyor.

**Maddeyle birlikte kapanmayan, ayrı kalem olarak devrediliyor:** Sorunlar
panelindeki CSP/`eval` kaleminin kaynağı. ÖK-2'nin tarayıcı maddesini
bloklamıyor — hata konsolda değil, ayrı bir yüzeyde ve bizim sayfamızdan
gelmediği ölçüldü.

## Yan bulgu — `index.html:30` bayat, Task 2 ile ÇELİŞİYOR

Sayfanın giriş paragrafı şunu diyor:

> "Mnemonic ekranda gösterilir, hiçbir yere kaydedilmez."

Oysa Task 2 (commit `a64129b`) mnemonic'in DOM'a yazılmasını **kaldırdı** ve aynı
sayfa birkaç satır aşağıda *"Gizli anahtar ekrana yazılmıyor"* diyor. **Sayfa
kendi içinde çelişiyor** ve çelişen cümle jürinin ilk okuyacağı yerde.

Düzeltilmedi. `index.html` Task 10 diff kapısının beş dosyasından biri; kapı
henüz **kurulmadı** (referans Task 6 Adım 4'te alınacak), yani kayıttan önce
düzeltilebilir — ama bu bir UI kararı ve Akif'e ait. **Karar verilmezse kayda bu
cümleyle girer.**

**KOŞU 2'DE `index.html`'DE İKİ KALEM DAHA ÇIKTI**, ikisi de kozmetik ve ikisi
de **düzeltilmedi** (Sprint 4 UI'ına dokunulmuyor):

- satır 38 — `<input type="password">` bir `<form>` içinde değil; Chrome konsola
  bilgi kaydı yazıyor.
- satır 64, 67, 70 — üç çıplak `<label>`, hiçbiri bir form alanına bağlı değil
  (üçü de `<div class="field">`e eşlik ediyor); Sorunlar panelinde üç
  erişilebilirlik kalemi.

İşlevsel etkileri yok; buraya yazılmalarının sebebi **"proje kodundan 0 hata"
hükmünün kapsamını daraltmaları**. Karar verilirse Sprint 5'e ait.
