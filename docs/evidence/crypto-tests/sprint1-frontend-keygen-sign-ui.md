# Sprint 1 — Frontend keygen/sign UI kanıtı (tarayıcı)

**Tarih:** 23 Ağustos 2026
**Yazan:** Akif
**Dosyalar:** `frontend/index.html`, `frontend/src/main.js`, `frontend/src/crypto/signer.js`

## Amaç

`GOREV_SINIRLARI.md` Sprint 1 listesindeki son açık Akif görevi: "JS
tarafında imzalama + anahtar üretimi/yedekleme". `sprint1-wasm-signer-test.md`
WASM signer'ın Node.js'te çalıştığını kanıtlamıştı; bu belge aynı akışın
gerçek bir **tarayıcıda**, Vite ile servis edilen bir sayfa üzerinden,
buton tıklamasıyla çalıştığını kanıtlıyor.

## Ortam

```
vite 8.2.2 (dev server, http://localhost:5184)
Chromium (Playwright ile headless, otomasyon amaçlı — kullanıcı Chrome
uzantısı bu oturumda kuruluyordu, o yüzden headless Chromium kullanıldı)
```

## Bulunan ve düzeltilen hata

İlk çalıştırmada "Anahtar Üret" butonu `Hata: Buffer is not defined`
veriyordu. Sebep: `bip39` paketi (`generateMnemonic` → `randomBytes` →
`Buffer.from`) Node'un global `Buffer`'ını varsayıyor, paketin `browser`
alanı/ESM sürümü yok, Vite bunu otomatik polyfill etmiyor.

**Düzeltme** (`frontend/src/crypto/signer.js`): `buffer` npm paketi eklendi
(`npm install buffer`, `frontend/package.json`'a yazıldı) ve modül
başında `globalThis.Buffer` yoksa dolduruluyor:

```js
import { Buffer } from 'buffer';
if (typeof globalThis.Buffer === 'undefined') {
  globalThis.Buffer = Buffer;
}
```

Bu bir kripto-mantık değişikliği değil, saf tarayıcı/bundler polyfill
sorunu — `keygen_from_mnemonic`/`sign_from_mnemonic` (Rust/WASM) tarafı
dokunulmadı.

## Test akışı ve çıktı

Playwright ile headless Chromium'da `http://localhost:5184/` açıldı,
"Yeni anahtar çifti üret" tıklandı, ardından "İmzala" tıklandı
(digest alanındaki varsayılan `0xdeadbeef...` ile).

```
=== keygen-out ===
Mnemonic (12 kelime): resource subway gallery abstract submit rail physical say rich work satoshi move
pkSeed: 0xc29ed0e6349095fc086b31f9452f10f200000000000000000000000000000000
pkRoot: 0x23eb74c24ab34e59fd9abaf4971622e600000000000000000000000000000000
publicKey: 0xc29ed0e6349095fc086b31f9452f10f20000000000000000000000000000000023eb74c24ab34e59fd9abaf4971622e600000000000000000000000000000000
ECDSA adresi: 0xac03402334e25f91facd1253c2e8c3db7184ad5e
keygen tamamlandı (410.7 ms)

=== sign-out ===
İmza: 0x9a4887d0... (3688 bayt)
✓ imza uzunluğu 3688 bayt (C13 beklenen)
sign tamamlandı (7762.9 ms)
```

Not: bu mnemonic her çalıştırmada rastgele üretiliyor (test için
kaydedilmiş sabit bir vektör değil), gerçek bir varlığa bağlı değil.

Ekran görüntüsü: `docs/evidence/screenshots/sprint1-frontend-keygen-sign-ui.png`

## Performans karşılaştırması

| Ortam | keygen | sign |
|---|---|---|
| Node.js (`sprint1-wasm-signer-test.md`) | ~360 ms | ~7.5 s |
| Tarayıcı (bu test) | ~411 ms | ~7.76 s |

Aynı `wasm-pkg-web` build'i, aynı büyüklük mertebesi — tarayıcıya taşımanın
belirgin bir ek maliyeti yok.

## Kapsam dışı / henüz yapılmadı

- "Yedekleme" şu an sadece mnemonic'in ekranda gösterilmesi (kullanıcı elle
  not alıyor); indirilebilir/şifrelenmiş bir yedekleme akışı yok — Sprint
  1'in "yedekleme" maddesi minimum haliyle karşılanıyor, gelişmiş bir akış
  gerekirse ayrı görev.
- Gerçek `SPHINCSVerifier.sol`'e (on-chain) bu imzanın gönderilip
  doğrulanması yok — bu Sprint 2'nin digest uyum testi kapsamında.
- Bu sayfa (`index.html`) bir kanıt/demo arayüzü, üretim cüzdan UI'ı değil
  (bkz. sayfadaki uyarı metni).

## Sonuç

Sprint 1'in son açık Akif görevi tamamlandı: JS tarafında (WASM üzerinden)
anahtar üretimi ve imzalama, gerçek bir tarayıcı sayfasında, uçtan uca
çalışıyor ve kanıtlandı.
