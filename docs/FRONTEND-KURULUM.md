# Frontend kurulumu

`README.md` § Kurulum yalnızca `contracts/` tarafını (Foundry) anlatıyor.
Frontend kurulumu hiçbir yerde belgelenmemişti; bu belge o boşluğu kapatıyor.
Sahiplik: Akif (`docs/`). README'ye buraya **tek satır referans** eklenmesi
Hakan'a iletilecek.

**Bütün süreler ölçüldü** — ÖK-2 temiz klon testi, 17-18 Eylül 2026, ağdan
taze klon, macOS. Kaynak: `docs/evidence/sprint4-ok2-clean-clone.md`.

> **DURUM:** C kararı **UYGULANDI** (17 Eylül 2026). Derlenmiş imzalayıcı
> depoda geliyor; **geçerli yol A**'dır ve Rust gerekmiyor. **18 Eylül 2026'da
> ağdan taze klonla doğrulandı**: Rust `PATH`'ten tamamen çıkarılmış bir ortamda
> `git clone` + `npm i` + `cp .env.example .env` + `npx vite build` geçti
> (141 ms), `build-wasm.sh` **koşulmadan**; testler yeşil.

---

## Yol A — yalnızca npm (C uygulandıktan sonra; jürinin yolu)

**Rust GEREKMİYOR.** Derlenmiş imzalayıcı (`src/crypto/wasm-pkg`,
`src/crypto/wasm-pkg-web`) depoda hazır gelir.

| Adım | Komut | Ölçülen süre |
|---|---|---|
| 1 | `git clone <repo-url>` — **`--recursive` YOK** | 2,7 sn |
| 2 | `cd pq-safe/frontend && npm i` | 2,4 sn (boş npm önbelleğiyle) |
| 3 | `cp .env.example .env` | — (**el düzenlemesi yok**) |
| 4 | `npx vite build` | 141 ms |
| 5 | `npx vite` — sayfayı aç | — |

> **Süreler beklenti değil, ölçümdür.** Ölçüm ortamı: ODTÜ ağı, macOS,
> node v22.21.0, npm 10.9.4, 18 Eylül 2026. **Klon ve `npm i` süreleri ağa
> bağlıdır** — aynı repo 17 Eylül'de 176 sn'de klonlandı. Birkaç dakika
> sürmesi kurulumun takıldığı anlamına gelmez.

Yol A'da submodule **çekilmez**: `--recursive` klonu 2,7 sn'den 20,4 sn'ye ve
83 MB'ı 115 MB'a çıkarır, karşılığında Yol A'ya hiçbir şey katmaz.
`verify-wasm.sh` de bu yolda gerekmez (aşağıda).

Ön koşul: **Node 22** ve npm. Ölçüm ortamı node v22.21.0, npm 10.9.4.

`npm run dev` **YOK** — `package.json`'da `scripts` alanı hiç tanımlı değil.
Geliştirme sunucusu `npx vite` ile açılır.

## Yol B — kaynaktan derleme (bugün zorunlu; C sonrası isteğe bağlı)

C uygulandıktan sonra bu yol yalnızca **çıktıyı doğrulamak isteyenler** için
gerekir: kendi toolchain'inizle derleyip depodaki `.wasm`'ın sha256'sıyla
karşılaştırırsınız.

Ek ön koşullar:

| Araç | Ölçüm ortamındaki sürüm | Kurulum |
|---|---|---|
| Rust (`rustc`, `cargo`) | 1.93.1 | <https://rustup.rs> |
| `wasm-pack` | 0.15.0 | `cargo install wasm-pack` |
| `wasm32-unknown-unknown` hedefi | — | `rustup target add wasm32-unknown-unknown` |

Adım 2'den sonra, adım 3'ten önce:

```bash
bash scripts/build-wasm.sh    # cwd: frontend/
```

| Ölçüm | Değer |
|---|---|
| Soğuk tam derleme (iki hedef, `target/` yok) | **25 sn** |
| Sıcak yeniden derleme | 1 sn |
| Ürettiği `cargo target/` dizini | **118 MB** |
| Ürettiği çıktı | 477.763 bayt (466,6 KiB), **10 dosya** |

Betik iki hedefi de derler — `--target nodejs` → `wasm-pkg` (Node testleri
kullanır), `--target web` → `wasm-pkg-web` (`src/crypto/signer.js`, yani
uygulamanın kendisi kullanır). Biri eksik çıkarsa betik **çıkış 1** verir.

Toolchain eksikse betik açık hata verir, sessizce geçmez:

```
ERROR: wasm-pack bulunamadı. Kurulum: cargo install wasm-pack
```

**Sürüm sabitleme:** aynı çıktıyı üretmek için toolchain sürümlerinin eşleşmesi
gerekir. `rustc` sürümü `rust-toolchain.toml` ile sabitlenir (1.93.1),
`wasm-pack` sürümü betikte kontrol edilir (0.15.0).

### Çıktıyı doğrulama

```bash
bash scripts/verify-wasm.sh    # cwd: frontend/
```

| Sonuç | Çıkış |
|---|---|
| `OK: 4 dosya, sha256 eş, toolchain eş` | 0 |
| `UYARI: toolchain farklı — HASH KARŞILAŞTIRMASI ATLANDI` | **0** — hata değil |
| `HATA: submodule commit'i manifest'le uyuşmuyor` | 1 |
| `HATA: build-wasm.sh manifest'te kayıtlı olandan farklı` | 1 |
| `HATA: aynı toolchain, çıktı farklı` | 1 |
| `KONTROL KOŞMADI: submodule çekilmemiş` | 2 |
| manifest ya da çıktı eksik | 2 |

**Bu betik Yol A'da koşturulmaz** — submodule çekilmemişken kontrol koşamaz ve
çıkış 2 verir. Yol A'da çıktının doğruluğunu commit'in kendisi taşır.

Hash'ler ve **onları üreten toolchain sürümleri** `scripts/wasm-manifest.json`
içinde. Kaynak kimliği kontrolleri (submodule commit'i ve `build-wasm.sh`'in
sha256'sı) **toolchain'den bağımsızdır ve her zaman koşar** — sürümünüz farklı
olsa bile bayatlamış bir çıktı yakalanır.

**Cross-machine determinizm ÖLÇÜLMEDİ.** `OK` çıktısı, çıktının *bu*
toolchain'de yeniden üretilebilir olduğunu gösterir; başka bir makinede aynı
baytların çıkacağını göstermez. Ölçüm Hakan'ın teyidiyle gelecek.

## Testler

npm script'i yoktur, doğrudan çalıştırılır. `cwd: frontend/`:

```bash
node src/tx/send-transaction-test.mjs      # 83 assertion
node src/tx/build-transaction-test.mjs     # 21 assertion
node src/crypto/wasm-signer-test.mjs       # keygen + sign

# pqwallet-test.mjs CAST_EXPECTED olmadan BİLEREK patlar: cast, bu paketin
# ethers'tan bağımsız tek oracle'ı. Koşullu atlanan kontrol yapılmamış kontroldür.
cd ../contracts
EXPECTED=$(cast calldata "execute(address,uint256,bytes,bytes)" \
  0x7268a7c3d52baa50486930e6ed25d29804d075b6 1000000000000000 0x 0xdeadbeef)
cd ../frontend
CAST_EXPECTED="$EXPECTED" node src/contracts/pqwallet-test.mjs   # 9 assertion
```

Beklenen: **83 · 21 · 9**. `cast` için Foundry gerekir (README § Kurulum).

## `.env`

`.env.example` iki değişken taşır ve **ikisi de anahtarsızdır** — API anahtarı,
kayıt ya da ücretli plan gerekmiyor:

- `VITE_SEPOLIA_RPC_URL` — salt-okunur çağrılar (nonce, digest, bakiye)
- `VITE_SEPOLIA_ARCHIVE_RPC_URL` — **arşiv**; eski receipt'leri okumak için

İkincisi zorunlu: varsayılan public endpoint receipt'leri ~8.000–10.000 blok
(≈30 saat) sonra buduyor, `docs/evidence/`'daki tx'lerin çoğu orada `null`
döner. `send-transaction-test.mjs` bu değişken olmadan kırmızı yanar.

Receipt sorgularında `cast receipt` **kullanılmaz** — budanmış receipt'te
madenlenmeyi bekleyip süresiz asılıyor (ÖK-2'de 10 dakika sonra elle kesildi).
Kullanılacak komut:

```bash
cast rpc eth_getTransactionReceipt <hash> --rpc-url <arşiv-url>
```

## Bilinen tuzaklar

| Belirti | Sebep |
|---|---|
| `Missing script: dev` | `npm run dev` yok, `npx vite` kullan |
| `UNRESOLVED_IMPORT … wasm-pkg-web/sphincs_c13_signer.js` | Yol B'de adım `build-wasm.sh` atlanmış |
| `cast` komutu asılı kaldı | `cast receipt` kullanılmış, `cast rpc eth_getTransactionReceipt` olmalı |
| Receipt `null` | Arşiv olmayan endpoint kullanılmış |
| `verify-wasm.sh` → `KONTROL KOŞMADI: submodule çekilmemiş` | Yol A klonunda koşuldu; bu betik Yol B içindir |

## Kapsanmayan

- **İkinci makinede** hiç koşulmadı. ÖK-2 izole dizinde, aynı makinede koştu;
  rustc/wasm-pack/Foundry kurulumları ve npm kayıt defteri erişimi paylaşıldı.
- **Tarayıcı adımı** (`npx vite` ile sayfada elle imza üretimi) ÖK-2'de
  koşulmadı; `vite build`in geçmesi güçlü gösterge ama sayfanın kendisi değil.
