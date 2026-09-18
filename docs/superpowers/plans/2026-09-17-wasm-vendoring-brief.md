# Brief — Derlenmiş imzalayıcının depoya konması (C kararı)

**Durum: BRIEF. Onay alınmadan hiçbir adım koşulmayacak.**
**Karar:** C, koşullu — 17 Eylül 2026, Akif. Gerekçe ve ölçümler:
`docs/evidence/sprint4-ok2-clean-clone.md` § Rust ön koşulu.
**Tahmini süre:** 45–60 dk. Kritik yolda değil, kimseyi bloke etmiyor.

## Amaç

Jürinin frontend'i **yalnızca Node ile** kurabilmesi (`clone` → `npm i` →
`cp .env.example .env` → `npx vite`), Rust toolchain kurmadan. Aynı zamanda
çıktının kaynaktan **bayt bayt yeniden üretilebilir** olduğunun gösterilebilir
kalması.

## Dokunulacak dosyalar — hepsi Akif'in

| Dosya | İşlem |
|---|---|
| `frontend/.gitignore` | `src/crypto/wasm-pkg/` satırı **kaldırılır** |
| `frontend/src/crypto/wasm-pkg/` | depoya girer (5 dosya, 236.418 bayt) |
| `frontend/src/crypto/wasm-pkg-web/` | depoya girer (5 dosya, 241.345 bayt) |
| `frontend/scripts/build-wasm.sh` | manifest üretimi + wasm-pack sürüm kontrolü eklenir |
| `frontend/scripts/wasm-manifest.json` | **yeni** — hash'ler + üreten toolchain |
| `frontend/scripts/verify-wasm.sh` | **yeni** — tutarsızlık kontrolü |
| `rust-toolchain.toml` (repo kökü) | **yeni** — `rustc` sürümü sabitlenir |
| `docs/FRONTEND-KURULUM.md` | DURUM kutusu ve Yol A/B güncellenir |

> **DÜZELTME — 18 Eylül 2026.** Bu iki satırda "6 dosya" yazıyordu, **gerçek
> 5**. Altıncı dosya `wasm-pack`'in her çıktı dizinine yazdığı `.gitignore`
> idi ve `build-wasm.sh:58` onu **siliyor** — yani depoya hiç girmedi.
> Boyutlar da `du` blok kullanımıydı (248/252 KiB), içerik değil; yerlerine
> ağdan klonda ölçülen gerçek bayt sayıları yazıldı. Toplam **10 dosya,
> 477.763 bayt**. Aynı hata `docs/evidence/sprint4-ok2-clean-clone.md` ve
> `docs/FRONTEND-KURULUM.md`'de de vardı, ikisi de düzeltildi.

Hakan'ın hiçbir dosyasına dokunulmuyor. `contracts/lib/sphincs-minus`
submodule'ü **değişmiyor** — yalnızca commit SHA'sı manifest'e yazılıyor.

## Adım 1 — `rust-toolchain.toml`

Repo köküne:

```toml
[toolchain]
channel = "1.93.1"
targets = ["wasm32-unknown-unknown"]
```

Etkisi: `cargo`/`wasm-pack` bu dizinde otomatik olarak 1.93.1 kullanır; rustup
kuruluysa gerekirse indirir. Hedef de otomatik kurulur, `build-wasm.sh`'in
`rustup target list` kontrolü yedek olarak kalır.

**Not:** `channel` sabitlemek kurulu rustc'yi *değiştirmez*, o dizinde
*seçer*. Farklı sürümü olan biri indirme maliyeti öder — bu yalnızca Yol B'yi
seçenleri etkiler, jüriyi etkilemez.

## Adım 2 — `wasm-manifest.json`

`build-wasm.sh` derleme sonunda üretir. Biçim:

```json
{
  "uretildi": "2026-09-17T19:00:00Z",
  "toolchain": { "rustc": "1.93.1", "wasm_pack": "0.15.0", "hedef_platform": "aarch64-apple-darwin" },
  "kaynak": { "submodule": "contracts/lib/sphincs-minus", "commit": "eef1f889a46c77d45dca013d321e9648fd3eaa7e" },
  "cikti": {
    "src/crypto/wasm-pkg/sphincs_c13_signer_bg.wasm": "<sha256>",
    "src/crypto/wasm-pkg/sphincs_c13_signer.js": "<sha256>",
    "src/crypto/wasm-pkg-web/sphincs_c13_signer_bg.wasm": "a0f1f0cb76a429098325601d49642aa045c7dbae8aad7c3b26fa38ef67c4d9cd",
    "src/crypto/wasm-pkg-web/sphincs_c13_signer.js": "<sha256>"
  }
}
```

`hedef_platform` de kaydedilir: determinizm platformlar arası da ölçülmedi,
ve manifest ölçülmemiş bir şeyi ölçülmüş gibi göstermemeli.

## Adım 3 — `verify-wasm.sh`, ÜÇ ayrı sonuç

Kontrolün tek kırmızıya yıkılmaması şartın kendisi.

| Durum | Mesaj | Çıkış |
|---|---|---|
| Kaynak SHA manifest'ten farklı | `HATA: submodule commit'i manifest'le uyuşmuyor — çıktı kaynağa ait değil, yeniden derle` | **1** |
| Toolchain sürümleri manifest'ten farklı | `UYARI: toolchain farklı (yerel rustc X / manifest 1.93.1) — çıktı KARŞILAŞTIRILAMAZ, bu bir hata değil` | **0**, ama sesli |
| Aynı toolchain, hash farklı | `HATA: aynı toolchain, çıktı farklı — kaynak ya da derleme değişmiş` | **1** |
| Her şey eşleşiyor | `OK: <n> dosya, sha256 eş, toolchain eş` | 0 |
| Manifest ya da çıktı yok | `HATA: manifest/çıktı eksik` | **2** |

**Kaynak SHA kontrolü toolchain'den bağımsızdır ve her zaman koşar.** Şartın
açık bıraktığı deliği bu kapatıyor: toolchain farklıysa hash karşılaştırması
atlanır, ama biri `.rs`'i değiştirip çıktıyı yenilemediyse **o hâlâ yakalanır.**
Submodule gitlink SHA'sı kaynağı tam olarak belirlediği için bu kontrol kesin.

Sınır: submodule SHA'sı aynı ama biri çalışma ağacındaki `.rs`'i **kaydetmeden**
değiştirirse yakalanmaz. Bu durumda `git -C <submodule> status` kirli olur;
kontrol onu da bakar ve kirliyse uyarı verir (çıkış 0, sesli).

## Adım 4 — `.gitignore` mekaniği

`wasm-pack` her çıktı dizinine içinde tek bir `*` olan `.gitignore` yazıyor; o
dosya kalırsa `git add` **sessizce hiçbir şey eklemez** — C'nin en sinsi tuzağı.

Yapılacak:
1. `frontend/.gitignore`'dan `src/crypto/wasm-pkg/` satırı kaldırılır.
2. `build-wasm.sh` derleme sonunda iki çıktı dizinindeki `.gitignore`'u siler.
3. `verify-wasm.sh` bu dosyaların varlığını kontrol eder; varsa uyarır
   (çıkış 0), çünkü varlıkları sessiz `git add` hatasının habercisi.

`git add -f` **kullanılmayacak**: tuzağı gizler, kaldırmaz.

## Adım 5 — Doğrulama (bu brief onaylanırsa)

1. `bash scripts/build-wasm.sh` → manifest üretildi, `.gitignore`'lar silindi.
2. `bash scripts/verify-wasm.sh` → `OK`.
3. Bir dosyanın tek baytı bozulur → `verify-wasm.sh` **çıkış 1**, "aynı
   toolchain, çıktı farklı". Geri alınır.
4. Manifest'teki `rustc` sürümü elle değiştirilir → **çıkış 0 + UYARI**, hata
   değil. Geri alınır.
5. Manifest'teki submodule commit'i elle değiştirilir → **çıkış 1**, kaynak
   uyuşmazlığı. Geri alınır.
6. **Temiz klon, Yol A:** ağdan taze klon, `npm i`, `cp .env.example .env`,
   `npx vite build` — **`build-wasm.sh` KOŞULMADAN** geçmeli. Bu, C'nin tek
   gerçek başarı ölçütü. Rust'ı PATH'ten çıkararak koşulur.
7. Testler: 83 · 21 · 9 + forge.

Adım 3–5 **negatif** sınamalar: kontrolün gerçekten yakaladığını görmeden
"kontrol var" denmez.

## Kapsanmayan / açık

- **Cross-machine determinizm hâlâ ölçülmemiş olacak.** Bu brief onu ölçmüyor,
  yalnızca ölçülmemiş olduğunu mekanikleştiriyor (toolchain farkı → uyarı).
  Ölçüm Hakan'ın teyidiyle gelir (plan § Hakan'a gidecek, madde 7). Teyit
  tutmazsa kontrolün tasarımı yeniden ele alınır.
- **Depoya 500 KB binary giriyor**, 448 KB'ı sıkışmaz. Determinizm ölçüldüğü
  için `.rs` değişmedikçe yeni blob oluşmaz.
- **`rust-toolchain.toml` Hakan'ın Foundry işini etkilemez** — Foundry Rust
  toolchain'ini kullanmıyor, kendi binary'siyle gelir. Yine de ona iletilecek.
- Bu brief **plan/spec'e görev olarak işlenmedi.** Onaylanırsa plan-spec eş
  güncelleme kuralı uyarınca ikisi aynı commit'te güncellenir.
