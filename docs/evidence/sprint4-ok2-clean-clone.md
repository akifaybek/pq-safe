# ÖK-2 — Temiz klon testi

**Tarih:** 17 Eylül 2026
**Ek ölçüm:** 18 Eylül 2026 — Yol A **ağdan taze klonla** doğrulandı ve bu
sırada `verify-wasm.sh`'te bir kusur bulunup düzeltildi. Bkz. "Yol A ağdan
klonla doğrulandı" bölümü. 17 Eylül'ün çıktı boyutu rakamları da orada düzeltildi.
**Klonlanan commit:** `29e2c1d` (`origin/main`, o anki uç)
**Makine:** Akif'in MacBook Air'i, izole dizin. Spec'in tercih ettiği **ikinci
makine DEĞİL** — bu şart hâlâ açık, aşağıda "Kapsanmayan" bölümünde.
**Ortam:** node v22.21.0, npm 10.9.4, rustc 1.93.1, wasm-pack 0.15.0,
forge/cast 1.7.1

## SONUÇ

**Temiz klon, belgelenen adımlarla ÇALIŞMIYORDU.** Bir kök neden bulundu,
düzeltildi, düzeltme aynı temiz klonda sıfırdan doğrulandı.

Düzeltme sonrası kurulumun tamamı yeşil.

## Bulgu — `build-wasm.sh` iki hedeften yalnızca birini üretiyordu

`frontend/scripts/build-wasm.sh` sadece `--target nodejs` derliyordu
(`src/crypto/wasm-pkg`). Oysa `src/crypto/signer.js:5`, yani uygulamanın kendisi,
`./wasm-pkg-web/sphincs_c13_signer.js` import ediyor — **hiçbir belgelenen adımın
üretmediği** bir `--target web` çıktısı.

Temiz klonda kırılanlar:

| Adım | Durum |
|---|---|
| `node src/tx/build-transaction-test.mjs` | ❌ `ERR_MODULE_NOT_FOUND: .../wasm-pkg-web/sphincs_c13_signer.js` |
| `npx vite build` | ❌ aynı modül, rolldown çözümleme hatası |
| `npx vite` ile sayfa | ❌ (aynı import zinciri) |

### Neden bugüne kadar görünmedi

`wasm-pack` her çıktı dizinine, içinde tek bir `*` olan bir `.gitignore` koyuyor:

```
frontend/src/crypto/wasm-pkg-web/.gitignore:1:*
```

Dizin bu yüzden Akif'in makinesinde **`git status`'ta hiç görünmedi** — ne
izlendi, ne commit'lendi, ne de eksikliği fark edildi. `frontend/.gitignore`
yalnızca `src/crypto/wasm-pkg/` satırını içeriyor; `wasm-pkg-web` kendi kendini
gizliyordu.

Spec § ÖK-2'nin uyarısı birebir gerçekleşti: *"kıran şey bizim makinemizde hiç
görünmez."* Uyarı submodule riski için yazılmıştı; kıran şey başka çıktı, mekanizma
aynı.

### Düzeltme

`build-wasm.sh` artık iki hedefi de derliyor ve **çıktıların varlığını sınıyor**;
biri eksikse çıkış kodu 1. Sessiz eksiklik mümkün değil.

## Ölçümler

### Kurulum (temiz klon, sırasıyla)

| Adım | Süre | Sonuç |
|---|---|---|
| `git clone --recursive` (ağdan) | 176 sn | ✅ |
| `npm i` (boş önbellek, gerçek indirme) | 16 sn | ✅ 27 paket, 0 vulnerability |
| `bash scripts/build-wasm.sh` (düzeltilmiş) | ~5 sn | ✅ iki hedef |
| `cp .env.example .env` | — | ✅ **el düzenlemesi YOK** |

`npm i` ilk denemede 1 sn sürdü çünkü yerel npm önbelleğini kullandı. Jürinin
koşulunu taklit etmek için önbellek boş bir dizine zorlanıp tekrar ölçüldü: 16 sn.

### Submodule riski — bugün gerçekleşmedi

`contracts/lib/sphincs-minus` hâlâ yan daldaki `eef1f889…` commit'ine sabitli ve
**ağdan taze klonda çekilebiliyor**. Risk kapanmadı, yalnızca bugün patlamadı;
azaltma (fork/vendor) Sprint 5 kararı olarak duruyor.

### Testler (düzeltme sonrası, temiz klon)

| Paket | Sonuç |
|---|---|
| `send-transaction-test.mjs` | ✅ 83 assertion |
| `build-transaction-test.mjs` | ✅ 21 assertion |
| `pqwallet-test.mjs` (`CAST_EXPECTED` ile) | ✅ 9 assertion |
| `wasm-signer-test.mjs` | ✅ keygen + sign, imza uzunluğu doğrulandı |
| `npx vite build` | ✅ 155 ms |
| `forge test` | ✅ 6 suite, 35 test, 0 fail |

Belgelenen `83 · 21 · 9` hedefi birebir tutuyor.

## ÖK-2'nin 2. yarısı — kanıt yeniden doğrulanabiliyor mu

Temiz klonun kendi `.env`'i (el değmemiş `.env.example` kopyası) ile
`0x320e03d9…` receipt'i sorgulandı:

| Değişken | Sonuç |
|---|---|
| `VITE_SEPOLIA_RPC_URL` | `null` — **receipt budanmış** |
| `VITE_SEPOLIA_ARCHIVE_RPC_URL` | ✅ okundu |

Yani kanıt yeniden doğrulanabiliyor, **ama yalnızca arşiv değişkeni üzerinden**.
Plan [D1]'in öngörüsü doğrulandı: jüri varsayılan endpoint'le denerse duvara
çarpar. `.env.example` her iki değişkeni de anahtarsız taşıdığı için jüri
tarafında ek kurulum gerekmiyor — **bu ölçüt korunmalı**.

### Yan bulgu — `cast receipt` asılıyor

Budanmış receipt'te `cast receipt` hata vermiyor, **madenlenmeyi beklemeye geçip
süresiz asılıyor** (10 dk sonra elle kesildi). Bloke etmeyen çağrı:

```bash
cast rpc eth_getTransactionReceipt <hash> --rpc-url <url>
```

Jüri `cast receipt` kullanırsa "ağ yavaş" sanır. Rapora yazılacak.

## Rust ön koşulu — ölçüm ve seçenekler

Düzeltme `build-wasm.sh`'i çalışır hale getiriyor, ama o betik **Rust
toolchain + wasm-pack + wasm32 hedefi** istiyor. Bu, jürinin kurulum
sürtünmesini etkiliyor; ölçüldü.

### (a) Betik koştu mu, koşmazsa ne olur

Evet, temiz klon testinde koştu.

| Ölçüm | Değer |
|---|---|
| Soğuk tam derleme (iki hedef, `target/` silinmiş) | **25 sn** |
| Sıcak yeniden derleme (tek hedef) | **1 sn** |
| Derlemenin ürettiği `cargo target/` dizini | **118 MB** |
| Toolchain YOK ise | betik **çıkış 1**, mesaj: `ERROR: wasm-pack bulunamadı. Kurulum: cargo install wasm-pack` |

Toolchain kontrolü sessizce geçmiyor, açık hata veriyor. `PATH` kısıtlanarak
sınandı.

Betik **atlanırsa** (jüri yalnızca clone + `npm i` + `cp .env.example .env`
yaparsa):

```
[UNRESOLVED_IMPORT] Could not resolve './wasm-pkg-web/sphincs_c13_signer.js'
in src/crypto/signer.js
```

### README bu kurulumu hiç anlatmıyor — ayrı ve daha büyük bir boşluk

`README.md` § Kurulum **yalnızca `contracts/` tarafını** belgeliyor: Foundry,
`forge install`, `forge build`, `forge test`. Frontend için `npm i`,
`build-wasm.sh`, `.env` ve `vite` **hiç geçmiyor**.

Yani Rust'ı ön koşul yapan şey bu düzeltme değil: frontend README'den zaten
kurulamıyordu. Düzeltmeden önce, **Rust kurulu olsa bile** sayfa derlenmiyordu.
Düzeltme mevcut ön koşulu *yeterli* hale getiriyor, yeni bir ön koşul eklemiyor.
README'nin frontend bölümü eksikliği bu commit'in kapsamı dışında, ama ÖK-2'nin
"jüri elle hiçbir şey ayarlamadan çalıştırsın" amacı **README düzeltilmeden
kapanmaz.** README Hakan'ın dosyası — ona iletilecek.

### (b) Çıktının boyutu

| Dizin | Disk (`du`) | Dosya | `.wasm` |
|---|---|---|---|
| `wasm-pkg` (nodejs) | 248 KiB | 6 | 224 KiB |
| `wasm-pkg-web` (web) | 252 KiB | 6 | 224 KiB |
| **Toplam** | **500 KiB** | **12** | — |

> **DÜZELTME — 18 Eylül 2026.** Yukarıdaki satırlar 17 Eylül'de, çıktı henüz
> commit'lenmeden ölçüldü ve **depoya giren şeyi göstermiyor.** İki fark var:
>
> 1. **12 değil 10 dosya.** Sayıma her dizindeki `wasm-pack` üretimi
>    `.gitignore` de girmişti; `build-wasm.sh` artık ikisini de siliyor.
> 2. **500 KiB `du` çıktısıydı**, yani 4 KiB'lik blok kullanımı — içerik
>    boyutu değil. Silinen iki `.gitignore` birer blok tutuyordu; 500 − 8 = 492.
>
> Ağdan klonda ölçülen gerçek değerler:
>
> | Ölçü | Değer |
> |---|---|
> | Tracked dosya | **10** |
> | İçerik toplamı | **477.763 bayt** (466,6 KiB) |
> | Disk kullanımı (`du`) | 492 KiB |
> | Her iki `.wasm` | 227.416 bayt (birebir aynı dosya) |
>
> Aynı hata `docs/FRONTEND-KURULUM.md`'de de vardı, düzeltildi. **17 Eylül'ün
> commit mesajlarında kalan "12 dosya, 500 KB" ifadesi düzeltilemez** — commit
> mesajı geçmişte sabittir; düzeltme kaydı burasıdır.

### (c) Çıktıyı depoya koymanın maliyeti

**Diff gürültüsü: ÖLÇÜLDÜ, YOK.** Aynı kaynak iki kez derlendi, çıktı **bayt
bayt eş**:

```
sphincs_c13_signer_bg.wasm  sha256 a0f1f0cb…c4d9cd   (iki derlemede de aynı)
sphincs_c13_signer.js       diff -q → eş
```

Derleme deterministik olduğu için, `.rs` değişmedikçe commit'te hiçbir diff
oluşmaz. "Her yeniden derlemede gürültü" endişesi bu ölçümle düşüyor.

**Sınır:** determinizm **tek makinede, tek toolchain sürümünde** ölçüldü
(rustc 1.93.1, wasm-pack 0.15.0). Makineler/sürümler arası tekrar üretilebilirlik
**ölçülmedi** — bir tutarsızlık kontrolü sabitlenmiş toolchain'de koşmalı.

**Git boyutu:** 500 KB, bunun 448 KB'ı sıkışmayan binary.

**Kaynak/çıktı tutarsızlığı:** gerçek risk. Biri `.rs`'i değiştirip çıktıyı
yenilemezse, commit'lenmiş WASM bayatlar ve testler **sessizce** eski imzalayıcıyı
kullanır. Kriptografi kodunda en pahalı sessiz hata sınıfı bu.

**Mekanik engel:** `wasm-pack` her çıktı dizinine içinde tek bir `*` olan
`.gitignore` yazıyor. Çıktıyı commit'lemek için o dosyaların silinmesi ya da
ezilmesi gerekir; aksi halde `git add` sessizce hiçbir şey eklemez.

### Seçenekler

| | Jüri sürtünmesi | Tekrar üretilebilirlik | Bayatlama riski | Maliyet |
|---|---|---|---|---|
| **A** — Rust ön koşul, README/plana yazılır | Yüksek: toolchain kurulumu (~1 GB+), 25 sn derleme, 118 MB `target/` | Tam | Yok | Sadece belge |
| **B** — çıktı depoda, jüri yalnızca npm | **Sıfır** | Jüri doğrulayamaz: depoda kaynağa bağlanmamış binary | Yüksek | 500 KB + `.gitignore` temizliği |
| **C** — ikisi birden + tutarsızlık kontrolü | **Sıfır** | Tam **ve doğrulanabilir** | Kontrolle yakalanır | 500 KB + küçük betik |

### Öneri: C

Gerekçe:

1. Determinizm ölçüldü, dolayısıyla C'nin kontrolü ucuz: yeniden derle,
   sha256'ları karşılaştır, farklıysa çıkış 1. B'nin tek ciddi bedeli
   (bayatlama) mekanik olarak kapanıyor.
2. B tek başına **kriptografi projesi için kötü**: jüriye, kaynağa
   bağlandığı gösterilmemiş bir imzalayıcı binary'si sunmak olur. C'de jüri
   isterse Rust kurup bayt bayt aynı çıktıyı üretebilir — bu, kuantum-güvenli
   bir cüzdan için savunma değil, **gösterilecek bir güç**.
3. A, planın ÖK-2 için "en değerli çıktı" dediği *sıfır kurulum sürtünmesi*
   ölçütünü açıkça bozuyor: 1 GB toolchain indirmesi jüri için sıfır değil.
4. 30 Eylül'e 13 gün var. C'nin ek maliyeti bir betik ve bir belge satırı.

### KARAR: C — 17 Eylül 2026, Akif

Koşullu kabul edildi. Koşul: **toolchain sabitlenecek.**

#### Neden koşul — cross-machine determinizm ÖLÇÜLMEDİ

Yukarıdaki determinizm ölçümü **tek makinede, tek toolchain sürümüyle** yapıldı
(rustc 1.93.1, wasm-pack 0.15.0, macOS/arm64). rustc ve wasm-pack sürümleri
arasında WASM çıktısı pratikte değişir. Sabitleme olmadan sha256 kontrolü
**Hakan'ın makinesinde iyi huylu bir sebeple kırmızı yanar** — ve herkesin
görmezden gelmeyi öğrendiği bir kontrol, hiç olmayandan kötüdür.

**Bu ÖLÇÜLMEMİŞTİR ve rapor ölçülmüş gibi sunmayacak.** Ölçülmesi için Hakan'ın
aynı toolchain sürümleriyle bir kez derleyip hash'i teyit etmesi yeterli; iş
Hakan'a gidecek mesaj listesine eklendi (plan § Hakan'a gidecek).

#### C'nin uygulama koşulları

1. `rust-toolchain.toml` ile `rustc` sürümü sabitlenir; `wasm-pack` sürümü
   betikte kontrol edilir.
2. Kaydedilen sha256'nın **yanına üreten toolchain sürümleri** yazılır.
3. Kontrol **iki ayrı mesaj** verir, tek kırmızıya yıkılmaz:
   - *toolchain farklı → çıktı karşılaştırılamaz* — **uyarı, çıkış 0**, ama sesli
   - *aynı toolchain, çıktı farklı* — **hata, çıkış 1**
4. Kalan işler: iki `.gitignore`'un ele alınması, çıktıların commit'lenmesi,
   README'nin frontend bölümü (Hakan) — yerine `docs/FRONTEND-KURULUM.md`
   yazıldı, README'ye tek satır referans Hakan'a gidecek.

#### C UYGULANDI — 17 Eylül 2026

Brief: `docs/superpowers/plans/2026-09-17-wasm-vendoring-brief.md`. Onaylandı,
iki eklemeyle: `build-wasm.sh`'in kendi sha256'sı manifest'e girdi, ve
toolchain uyuşmazlığı mesajı "**HASH KARŞILAŞTIRMASI ATLANDI**" ifadesini
açıkça taşıyor.

Eklenen/değişen: `rust-toolchain.toml` (rustc 1.93.1 sabit),
`frontend/scripts/wasm-manifest.json`, `frontend/scripts/verify-wasm.sh`,
`frontend/scripts/build-wasm.sh` (manifest üretimi + `wasm-pack` sürüm
kontrolü + `.gitignore` silme), `frontend/.gitignore` (`wasm-pkg` satırı
kaldırıldı), ve iki çıktı dizini depoya girdi.

**Başarı ölçütü karşılandı.** Rust `PATH`'ten tamamen çıkarılmış bir ortamda
(`rustc`/`cargo`/`wasm-pack` üçü de yok), `build-wasm.sh` **koşulmadan**:
`npm i` → `cp .env.example .env` → `npx vite build` **142 ms'de geçti**;
`build-transaction-test.mjs` ve `wasm-signer-test.mjs` yeşil.

> Bu sınama, çıktı henüz commit'li olmadığı için **ağdan klon değil**, çalışma
> ağacının kopyası üzerinde koştu (`.git`, `node_modules`, `target` dışarıda).
> **Ağdan taze klonla tekrarı 18 Eylül 2026'da yapıldı ve geçti** — aşağıdaki
> "Yol A ağdan klonla doğrulandı" bölümü. Açık kalem KAPANDI.

**Altı sınama, üçü negatif — hepsi beklendiği gibi:**

| Sınama | Sonuç |
|---|---|
| Sağlam durum | `OK: 4 dosya, sha256 eş, toolchain eş` · çıkış 0 |
| Çıktıya bir bayt eklendi | `HATA: aynı toolchain, çıktı farklı` · **çıkış 1** |
| Manifest'te `rustc` 1.90.0 yapıldı | `UYARI: … HASH KARŞILAŞTIRMASI ATLANDI` · **çıkış 0** |
| Manifest'te submodule commit'i sıfırlandı | `HATA: submodule commit'i … uyuşmuyor` · **çıkış 1** |
| `build-wasm.sh`'e satır eklendi | `HATA: build-wasm.sh … farklı` · **çıkış 1** |
| Manifest silindi | `HATA: manifest yok` · **çıkış 2** |

Her sınamadan sonra durum geri alındı ve sağlam durum yeniden doğrulandı.

**Yan bulgu:** iki hedefin `.wasm` dosyaları **birebir aynı** (sha256
`a0f1f0cb…c4d9cd`); hedefe göre değişen yalnızca JS tutkalı. `wasm-bindgen`
için beklenen davranış, ama manifest ikisini de ayrı kaydediyor — birinin
bozulması diğerini gizlemesin.

## Yol A ağdan klonla doğrulandı — 18 Eylül 2026

17 Eylül'ün başarı ölçütü **çalışma ağacının kopyasında** koşmuştu; çıktı henüz
commit'li olmadığı için gerçekten depodan gelip gelmediğini kanıtlamıyordu. Bu
ölçüm o boşluğu kapatıyor: **ağdan taze klon**, Rust `PATH`'te YOKKEN,
`build-wasm.sh` **koşulmadan**.

**Klonlanan commit:** `3d36c3b` (`origin/main` uç; 17 Eylül'ün `8643835`'inden
sonra Hakan README'ye frontend kurulum referansını ekledi)

> **SIRA UYARISI — bu klon düzeltmeden ÖNCEKİ hâldir.** `c5d6003`
> (`verify-wasm.sh` düzeltmesi) bu klondan **sonra** doğdu; kusur zaten bu
> ölçümde bulundu. Yani Yol A'nın kendisi — `clone` → `npm i` → `vite build` →
> testler — taze klonda doğrulandı, ama **düzeltilmiş betiğin taze klondaki
> doğal davranışı bu ölçümde sınanmadı.** Aşağıdaki çıkış 2 sınaması klonun
> dizininde koştu, fakat betik oraya **el ile kopyalandı**; klonun kendisi o
> hâli taşımıyordu. Diğer iki sınama yerel ağaçtaydı.
**Makine:** Akif'in MacBook Air'i, izole dizin — **ikinci makine DEĞİL**, o şart
hâlâ açık.
**Ortam:** node v22.21.0, npm 10.9.4

`PATH` benzetimi — Rust `~/.cargo/bin`'de, dışarıda bırakıldı:

```bash
env -i HOME="$HOME" PATH="<node bin>:/usr/bin:/bin" sh -c '...'
```

Doğrulandı: `command -v cargo` · `rustc` · `wasm-pack` → **üçü de YOK.**

| Adım | Komut | Süre |
|---|---|---|
| 1 | `git clone <repo-url>` (**`--recursive` YOK**) | **2,7 sn** |
| 2 | `npm i` | **2,4 sn** (boş önbellek dizini) · 1,3 sn (sıcak) |
| 3 | `cp .env.example .env` | — |
| 4 | `npx vite build` | **141 ms** |

`vite build` çıktısı: 190 modül, `sphincs_c13_signer_bg.wasm` 227,41 kB olarak
bundle'a girdi — yani derlenmiş imzalayıcı gerçekten **depodan** geldi.

Testler, aynı kısıtlı ortamda:

| Test | Sonuç |
|---|---|
| `src/tx/build-transaction-test.mjs` | `TÜM TESTLER GEÇTİ` · çıkış 0 |
| `src/crypto/wasm-signer-test.mjs` | keygen + sign geçti, imza **3688 bayt**, sign 7,5 sn · çıkış 0 |

**`--recursive` Yol A'da GEREKMİYOR — ölçüldü:**

| Klon | Süre | Disk |
|---|---|---|
| `git clone` | 2,7 sn | 83 MB |
| `git clone --recursive` | 20,4 sn | 115 MB |

17 Eylül'de klon 176 sn sürmüştü (`--recursive`), bugün aynı komut 20,4 sn.
**Fark ÖLÇÜLMEDİ.** İki bağımsız ölçümün aynı yönde ve benzer oranda sapması
(klon 8,6× · `npm i` 16 sn → 2,4 sn, 6,7×) ağ değişkenliğiyle **tutarlı**;
başka bir açıklama **dışlanmadı** — disk önbelleği ve npm kayıt defteri CDN'i
de aynı imzayı bırakır.

Yol A için submodule hiç çekilmiyor, o yüzden doğru komut düz `git clone`.

### Bu ölçümde bulunan kusur — `verify-wasm.sh` Yol A klonunda YANLIŞ kırmızı yakıyordu

Klonda `verify-wasm.sh` koşuldu ve şunu verdi:

```
HATA: submodule commit'i manifest'le uyuşmuyor.
      manifest: eef1f889…
      gerçek  : 3d36c3b5…          ← süperprojenin commit'i
```

**Mekanizma:** submodule çekilmemişken `contracts/lib/sphincs-minus` BOŞ bir
dizindir. `git -C <boş dizin> rev-parse HEAD` hata vermez, **üst depoya yürür**
ve süperprojenin commit'ini döndürür. Betiğin boşluk kontrolü bunu yakalamıyordu,
çünkü dönen değer boş değildi.

**Neden önemli:** C kararının tek gerekçesi tutarsızlık kontrolüydü ve o kararın
koşulu açıkça şuydu — *"herkesin görmezden gelmeyi öğrendiği bir kontrol hiç
olmayandan kötüdür."* Kontrol, jürinin izleyeceği yolda **her seferinde** ve
**yanlış** kırmızı yakıyordu. Tam olarak kaçınılmak istenen hata sınıfı.

**Düzeltme:** dizinin kendi deposu olduğu (`rev-parse --show-toplevel` == dizinin
kendisi) önce doğrulanıyor; değilse durum "kontrol koşamadı" (**çıkış 2**) ve
mesaj Yol A kullanıcısına bu betiğin gerekmediğini söylüyor:

```
KONTROL KOŞMADI: submodule çekilmemiş: …/contracts/lib/sphincs-minus
      Çekmek için: git submodule update --init --recursive
      Yol A (yalnızca npm) bu betiği GEREKTİRMEZ; çıktı depoda hazır.
```

Üç sınama, biri negatif:

| Sınama | Sonuç |
|---|---|
| Ana depo, submodule çekili | `OK: 4 dosya, sha256 eş, toolchain eş` · çıkış 0 |
| Yol A klonu, submodule çekilmemiş | `KONTROL KOŞMADI: submodule çekilmemiş` · **çıkış 2** |
| Manifest'te submodule commit'i sıfırlandı (gerçek uyuşmazlık) | `HATA: … uyuşmuyor` · **çıkış 1** |

Üçüncüsü regresyon sınamasıdır: yeni koruma, yakalaması gereken gerçek
uyuşmazlığı **yutmuyor.** Sınamadan sonra manifest geri alındı ve sağlam durum
yeniden doğrulandı.

#### Dağıtım sınandı — düzeltme klonla geliyor, 18 Eylül 2026

Yukarıdaki sıra uyarısının kapattığı boşluk: sınanan şey betiğin **mantığı**
değil, **dağıtımıydı** — `c5d6003` gerçekten push edildi mi, düzeltilmiş betik
klonla geliyor mu, jürinin yolunda hangi çıkışı veriyor.

Repo dizininin **dışında**, `/tmp` altında düz `git clone` (`--recursive` yok,
`git submodule update` **koşulmadı** — çıkış 2'yi üreten koşul zaten submodule'ün
çekilmemiş olması). Klonun HEAD'i `86f259f`; `c5d6003` ve `81b6cd6` de içinde.

**1) Düzeltilmiş sürüm klona ULAŞTI** — betik çalıştırılmadan önce, ayrı kanıt:

```
$ grep -n -- "--show-toplevel" frontend/scripts/verify-wasm.sh
61:SUB_TOP="$(git -C "$SUBMODULE_DIR" rev-parse --show-toplevel 2>/dev/null || echo '')"
```

Bu grep bilerek ayrı: çıkış 2'yi **eski** betik de bambaşka bir sebepten
verebilirdi. "Düzeltilmiş sürüm ulaştı" ile "betik çalıştı" ayrı iddialardır.
Submodule dizini boş doğrulandı (0 giriş).

**2) Çıktı, birebir:**

```
KONTROL KOŞMADI: submodule çekilmemiş: …/klon/contracts/lib/sphincs-minus
      Çekmek için: git submodule update --init --recursive
      Yol A (yalnızca npm) bu betiği GEREKTİRMEZ; çıktı depoda hazır.
```

**Çıkış kodu 2.** Beklenen davranış. Klon silindi.

## İkinci makine + ikinci platform — Hakan'ın raporu, 18 Eylül 2026

> **BU ÖLÇÜMÜ AJAN YAPMADI.** Aşağıdakiler Hakan'ın bildirdiği değerlerdir;
> doğrulanmadı, yeniden üretilmedi. Kaynak: Hakan'ın 18 Eylül mesajı.

**Ortam:** Windows, Node v24.15.0, npm 11.12.1 — yani yalnızca ikinci makine
değil, **ikinci işletim sistemi ve farklı Node/npm ana sürümü.** Spec yalnızca
ikinci makineyi istiyordu.

| Adım | Hakan'ın değeri | Bizim macOS değerimiz |
|---|---|---|
| `npm i` | 7 sn, 31 paket, 0 zafiyet | 2,4 sn, 33 paket |
| `npx vite build` | 1,61 sn | 141 ms |
| `npx vite` (dev) | ready in 192 ms | ölçülmedi |

Build çıktısı iki platformda **aynı**: 190 modül, `index.html` 4,97 kB, wasm
227,41 kB, js 552,62 kB. Tek uyarı 500 kB üstü chunk için code-split önerisi —
bizde de çıkıyor, hata değil.

Konsol: **projenin kendi kodundan sıfır hata.** Görülen ikisi de bizim dışımızda:
`MaxListenersExceededWarning` / `ObjectMultiplex` uyarıları `contentscript.js`'ten,
yani MetaMask eklentisinin kendi kodu; ve `favicon.ico` 404.

**BU RAPORUN KAPATTIĞI:** ikinci makine şartı **ve** hiç istenmemiş bir ikinci
platform. Derlenmiş imzalayıcının Windows'ta da çalıştığı, `vite build`
çıktısının bayt bayt aynı boyutlarda çıktığı gösterildi.

**BU RAPORUN KAPATMADIĞI — üçü de ayrı ayrı:**

1. **Elle imza üretimi.** Rapor "sayfa açıldı, konsol temiz" diyor; **imza
   üretildiğini söylemiyor.** Sayfanın açılması WASM'ın yüklendiğini bile
   kanıtlamaz, ve bu **kontrol edildi:** `signer.js:20-25`'te
   `ensureWasmInit()`, `await init()` çağrısını `initialized` bayrağının
   arkasında tembel tutuyor; init yalnızca `keygen` ya da `sign` yolundan
   tetikleniyor. **İmza üretilmeden `.wasm` hiç örneklenmiyor.**
   Dolayısıyla temiz konsol, imzalayıcı hakkında hiçbir şey söylemiyor.
   **Tarayıcı adımı AÇIK.**
2. **Klonun taze olup olmadığı.** Raporda `git clone` adımı ve süresi yok;
   `npm i`'den başlıyor. Var olan bir çalışma kopyası da aynı çıktıyı verirdi.
3. **Rust'ın yokluğu doğrulanmadı.** Windows'ta kurulu olmaması muhtemel, ama
   "kurulu değil" ayrı bir iddiadır ve rapor etmiyor.

### Yan sonuç — cross-machine determinizm Hakan'ın makinesinde ÖLÇÜLEMEZ

Manifest `hedef_platform` alanını da tutuyor ve bizimki `aarch64-apple-darwin`.
Hakan Windows'ta derlerse host üçlüsü farklı olacağı için `verify-wasm.sh`
**hash karşılaştırmasını ATLAR** (çıkış 0, "HASH KARŞILAŞTIRMASI ATLANDI") —
tasarım gereği, ama beklenen teyidi betikle almanın yolu kapalı demek.

İstenecek şey değişiyor: Hakan derlerse **ham sha256'yı elle bildirmeli.**

**Sonuç şimdiden yorumlanmayacak.** Elimizdeki determinizm kanıtı tek
platformda: aynı makinede iki derleme, aynı sha256. Hakan'ın değeri farklı
çıkarsa **iki açıklama da ayakta kalır** — (a) platform farkı, (b) derlemenin
makineler arası deterministik olmaması — ve bu ölçüm ikisini **ayırt etmez.**
Ayrım için aynı platformda ikinci bir derleme gerekir; yapılmadı.

Teyidin pratik değeri zaten düşük: toolchain farklıysa `verify-wasm.sh` nasılsa
"ATLANDI" diyor. Değeri olan tek şey **sayının kayda girmesi**, ve yorumun açık
kalması ona zarar vermiyor.

## Kapsanmayan — hâlâ açık

1. **Tarayıcı adımı — KAPANDI, 20 Eylül 2026, İKİNCİ KOŞUYLA.** Kanıt:
   `docs/evidence/crypto-tests/sprint4-browser-signing.md`.
   **Koşan Akif, ajan tarayıcıyı çalıştırmadı.**
   - **Koşu 1** teknik çekirdeği kanıtladı ama konsol sayımı eksik kaldığı için
     madde açık bırakılmıştı: sayfa açılışında Ağ sekmesinde **`.wasm` YOKTU**
     (yalnızca 54,1 kB JS tutkalı), `keygen`'den sonra
     **`sphincs_c13_signer_bg.wasm` · 200 · 228 kB** belirdi, imza **3688 bayt**
     çıktı (`keygen` 628,5 ms · `sign` 11.008,8 ms).
   - **Koşu 2** beş eksiği kapattı: konsol filtresi **kaldırıldı** (gizlenen
     kayıt bırakılmadı), açılış listesi **tam enumere edildi**, `/favicon.ico`
     Ağ sekmesinde arandı (**0/31 istek**), ortam yazıldı (Chrome
     **153.0.8010.48** arm64 · macOS **26.6.2**), JS satırının transfer/kaynak
     ayrımı **ve** farkın sebebi ölçüldü. İmzalayıcı bağımsız bir oturumda yine
     **3688 baytlık** imza üretti.
   - **Kapatan gözlem:** açılışta tek hata `Unchecked runtime.lastError`, hata
     seviyesindeki diğer her kayıt `content.js:50`'den — hepsi eklenti.
     Depoda `sentry`/`content.js` bulunmadığı `grep` ile doğrulandı.
   - **HÜKÜM DARALDI:** *"görünen kayıtların hepsi eklenti kaynaklı"* **yanlıştı**.
     Filtre kaldırılınca depodan iki kalem göründü — `index.html:38` için bir
     **bilgi** kaydı ve Sorunlar panelinde `index.html:64, 67, 70` için üç
     erişilebilirlik kalemi. İkisi de **hata seviyesinin altında**, bu yüzden
     *"konsolda proje kodundan 0 hata"* ayakta kalıyor.
   - **Koşu 3 — EKLENTİSİZ (Misafir pencere), aynı gün.** Sorunlar
     panelindeki ``CSP `eval`i engelliyor`` kalemi **üç oturumun üçünde de
     yok** → **kaynağı eklenti**, projeyle ilgisi yok. Kontrol kaydı da
     çalıştı (MetaMask uyarıları ve Sentry hataları kayboldu), deney geçerli.
     Aynı koşu iki şeyi daha verdi: `.wasm` tembelliği **temiz profilde
     yeniden üretildi** — açılışta 25 istek ve `.wasm` yok, `sign` sonrası 26
     istek ve `sphincs_c13_signer_bg.wasm` · 228 kB, başlatan
     `sphincs_c13_signer.js:293`; liste bu kez **tepeden** görüldü. İmza yine
     **3688 bayt** (beş koşunun beşinde de).
   - **KAPANMAYAN GÖZLEM:** eklentisiz bir oturumda hata sayacı bir kez **1**
     gösterdi, kayıt okunamadan sayfa yenilendi, 2-3 yeniden denemede tekrar
     etmedi. Kaynağı **hiç görülmedi** — bizim olduğu da olmadığı da
     gösterilmedi. *"Eklentisiz konsolda 0 hata"* beş-altı açılışın biri hariç
     hepsi için doğru, hepsi için değil.
   - **Kapsanmayan:** owner mnemonic girilmedi, MetaMask bağlanmadı, Bölüm 4'ün
     `build+sign` yolu ve gerçek tx yolu koşulmadı.
2. **İkinci makine — 18 Eylül'de KAPANDI**, Hakan'ın Windows raporuyla
   (yukarıdaki bölüm). Bu maddeyi yazdıran ölçümler (17 ve 18 Eylül) hâlâ
   yalnızca Akif'in makinesinde koştu; kapatan şey Hakan'ın bağımsız koşusudur
   ve **ajan tarafından doğrulanmadı.**
