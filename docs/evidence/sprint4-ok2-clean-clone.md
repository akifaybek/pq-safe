# ÖK-2 — Temiz klon testi

**Tarih:** 17 Eylül 2026
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

| Dizin | Boyut | Dosya | `.wasm` |
|---|---|---|---|
| `wasm-pkg` (nodejs) | 248 KB | 6 | 224 KB |
| `wasm-pkg-web` (web) | 252 KB | 6 | 224 KB |
| **Toplam** | **500 KB** | **12** | — |

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

**Karar Akif'in.** C seçilirse gereken işler: iki `.gitignore`'un ele alınması,
çıktıların commit'lenmesi, sha256 karşılaştıran kontrol betiği, ve README'nin
frontend bölümü (Hakan).

## Kapsanmayan — hâlâ açık

1. **Tarayıcı adımı.** `npx vite` ile sayfayı açıp elle imza üretmek
   koşulmadı; ajan tarayıcı çalıştırmadı. `vite build`in geçmesi güçlü bir
   gösterge ama sayfanın kendisi değil.
2. **İkinci makine.** Spec "tercihen ikinci makinede" diyor. Bu test izole
   dizinde, aynı makinede koştu. Paylaşılan şeyler: rustc/wasm-pack/forge
   kurulumları ve npm kayıt defterine erişim. Bunların eksik olduğu bir makinede
   sonuç farklı olabilir.
