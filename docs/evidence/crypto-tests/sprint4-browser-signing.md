# Tarayıcı adımı — WASM imzalayıcı tarayıcıda koştu

**Tarih:** 20 Eylül 2026
**Koşan:** Akif, elle. **Ajan tarayıcıyı çalıştırmadı**; aşağıdaki değerler Akif'in
ekran görüntülerinden okundu.
**Ortam:** macOS, Chrome, Vite dev sunucusu (`npx vite`), DevTools Ağ sekmesi
`wasm` filtresiyle ve **Önbelleği devre dışı bırak** işaretli.
**Amaç:** ÖK-2'nin son açık parçası — `vite build`in geçmesi sayfanın çalıştığını
göstermiyordu.

## SONUÇ

**İki iddia da ayrı ayrı kanıtlandı.** Aşağıda ayrı başlıklar altında; "sayfa
açıldı, konsol temiz" ifadesi kanıt olarak **kullanılmadı** ve kullanılamazdı.

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

## Konsol — projenin kendi kodundan SIFIR hata

Sayaç imzadan sonra **12 hata · 6 uyarı** gösteriyordu. **On ikisinin de kaynağı
eklenti**, üçü de dosyadan doğrulandı:

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

**`favicon.ico` 404 konsolda GÖRÜNMEDİ.** Hakan 18 Eylül'de Windows'ta görmüştü.
Chrome favicon hatasını konsola yazmayabiliyor; ayrıca konsol filtresinde
"3 gizli" kaydı vardı. **Yok demiyoruz — bu koşuda konsolda görünmedi.**

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

## ÖK-2 için anlamı

ÖK-2'nin tarayıcı maddesi **KAPANDI**: derlenmiş imzalayıcı, depodan gelen
çıktıyla, gerçek bir tarayıcıda örneklendi ve doğru uzunlukta imza üretti.

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
