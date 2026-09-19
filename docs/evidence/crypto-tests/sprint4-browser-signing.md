# Tarayıcı adımı — WASM imzalayıcı tarayıcıda koştu

**Tarih:** 20 Eylül 2026
**Koşan:** Akif, elle. **Ajan tarayıcıyı çalıştırmadı**; aşağıdaki değerler Akif'in
ekran görüntülerinden okundu.
**Ortam:** macOS, Chrome, Vite dev sunucusu (`npx vite`), DevTools Ağ sekmesi
`wasm` filtresiyle ve **Önbelleği devre dışı bırak** işaretli.
**Amaç:** ÖK-2'nin son açık parçası — `vite build`in geçmesi sayfanın çalıştığını
göstermiyordu.

## SONUÇ

**İki teknik iddia da ayrı ayrı kanıtlandı** (`.wasm` örneklendi · 3688 baytlık
imza üretildi). "Sayfa açıldı, konsol temiz" ifadesi kanıt olarak
**kullanılmadı** ve kullanılamazdı.

> **ÖK-2'nin tarayıcı maddesi HENÜZ KAPANMADI.** Konsol sayımı eksik: sayfa
> açılışındaki 3 hata enumerе edilmedi ve filtrenin gizlediği 3 kayıt
> incelenmedi; ayrıca `/favicon.ico` isteği Ağ sekmesinde aranmadı. Madde,
> bunlar ölçülünce kapanır. Eksik listesi aşağıda **"Tamamlanacak ölçümler"**
> başlığında.

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

**Şu an söylenebilecek en güçlü cümle:** *imzadan sonraki konsol listesinde
GÖRÜNEN kayıtların hepsi eklenti kaynaklıydı.* "Proje kodundan 0 hata" bundan
daha geniş bir iddiadır ve henüz karşılanmadı.

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

### `favicon.ico` — GÖRÜNMEMESİ ÖLÇÜM DEĞİL

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

## Ölçüm ortamı — EKSİK, tamamlanacak

Sapma yorumlanmayacak (yukarıda öyle yazıldı), ama sebep ileride aranırsa girdi
olsun diye ortam kayda girer. **Şu an elde olmayanlar:** Chrome sürümü,
macOS sürümü, o an açık sekme sayısı ve makine yükü. Bunlar yazılmadan
"tarayıcı WASM yürütme farkı" ile "o andaki makine yükü" açıklamaları
arasında ileride bile seçim yapılamaz. İkisi de şu an ayakta, **ölçülmedi**.

## İki boyut — hangi sütun olduğu NETLEŞMEDİ

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

## Tamamlanacak ölçümler — madde kapanmadan önce

1. Sayfa açılışındaki **3 hatanın** her biri: ilk satır + kaynak dosya + etiket.
2. Konsol filtresinin gizlediği **3 kaydın** açılması ve etiketlenmesi.
3. Ağ sekmesinde filtre temizlenip **`/favicon.ico`** aranması: istek var mı,
   varsa durum kodu.
4. Ortam: Chrome sürümü · macOS sürümü · açık sekme sayısı.
5. `sphincs_c13_signer.js` satırının **transfer/kaynak** boyut ayrımı.

## ÖK-2 için anlamı

Teknik çekirdek **kanıtlandı**: derlenmiş imzalayıcı, depodan gelen çıktıyla,
gerçek bir tarayıcıda örneklendi ve doğru uzunlukta imza üretti.

**Madde yine de KAPANMADI.** Kapanış kuralı: konsol sayımı iki ana ayrılmadan
ve sayfa açılışındaki üç hatanın kaynağı yazılmadan işaretlenmez. Şu an kapatan
gözlem eksik — "0 hata" iddiası var, onu doğrulayan satır yok.

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
