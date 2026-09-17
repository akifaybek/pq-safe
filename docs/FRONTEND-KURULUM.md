# Frontend kurulumu

`README.md` § Kurulum yalnızca `contracts/` tarafını (Foundry) anlatıyor.
Frontend kurulumu hiçbir yerde belgelenmemişti; bu belge o boşluğu kapatıyor.
Sahiplik: Akif (`docs/`). README'ye buraya **tek satır referans** eklenmesi
Hakan'a iletilecek.

**Bütün süreler ölçüldü** — ÖK-2 temiz klon testi, 17 Eylül 2026, ağdan taze
klon, macOS. Kaynak: `docs/evidence/sprint4-ok2-clean-clone.md`.

> **DURUM:** Derlenmiş WASM çıktısının depoya konması (C kararı, 17 Eylül)
> **alındı ama HENÜZ UYGULANMADI.** Bugün geçerli olan **Yol B**'dir. C
> uygulandığında Yol A açılır ve bu satır güncellenir.

---

## Yol A — yalnızca npm (C uygulandıktan sonra; jürinin yolu)

**Rust GEREKMİYOR.** Derlenmiş imzalayıcı (`src/crypto/wasm-pkg`,
`src/crypto/wasm-pkg-web`) depoda hazır gelir.

| Adım | Komut | Ölçülen süre |
|---|---|---|
| 1 | `git clone --recursive <repo-url>` | 176 sn |
| 2 | `cd pq-safe/frontend && npm i` | 16 sn (boş npm önbelleğiyle) |
| 3 | `cp .env.example .env` | — (**el düzenlemesi yok**) |
| 4 | `npx vite build` | 0,2 sn |
| 5 | `npx vite` — sayfayı aç | — |

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
| Ürettiği çıktı | 500 KB, 12 dosya |

Betik iki hedefi de derler — `--target nodejs` → `wasm-pkg` (Node testleri
kullanır), `--target web` → `wasm-pkg-web` (`src/crypto/signer.js`, yani
uygulamanın kendisi kullanır). Biri eksik çıkarsa betik **çıkış 1** verir.

Toolchain eksikse betik açık hata verir, sessizce geçmez:

```
ERROR: wasm-pack bulunamadı. Kurulum: cargo install wasm-pack
```

**Sürüm sabitleme:** aynı çıktıyı üretmek için toolchain sürümlerinin eşleşmesi
gerekir. `rustc` sürümü `rust-toolchain.toml` ile sabitlenir, `wasm-pack` sürümü
betikte kontrol edilir. Sürümler tutmazsa karşılaştırma **anlamsızdır, hata
değildir** — kontrol bunu ayrı bir mesajla söyler.

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

## Kapsanmayan

- **İkinci makinede** hiç koşulmadı. ÖK-2 izole dizinde, aynı makinede koştu;
  rustc/wasm-pack/Foundry kurulumları ve npm kayıt defteri erişimi paylaşıldı.
- **Tarayıcı adımı** (`npx vite` ile sayfada elle imza üretimi) ÖK-2'de
  koşulmadı; `vite build`in geçmesi güçlü gösterge ama sayfanın kendisi değil.
