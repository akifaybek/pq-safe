# Oturum devir notu — 13 Eylül 2026 (Akif tarafı)

Bir sonraki Claude Code oturumu buradan devam etsin. Önceki not
(`session-handoff-2026-09-08.md`) **eskidi** — bu belge onu değiştirir.
Compaction sonrası buna, `.superpowers/sdd/progress.md`'ye ve `git log`'a
güvenin; hafızaya değil.

> **Değişmeyen kritik bilgi:** owner public key 2. rotasyon anahtarı
> (`0x5c0adf08…`). 26/28 Ağustos notlarındaki `0x49ba289e…` **geçersizdir**.

> **DEĞİŞEN KRİTİK BİLGİ:** gas'ı ödeyen MetaMask hesabı artık
> **`0xe0BF2D190f8e2F2fc97cF19244845F8FeBDB7351`**. 8 Eylül notundaki
> `0x80a98eb2…ACF4` **bu işte kullanılmadı** (bakiyesi duruyor ama tx atmadı).

## İLK İŞ: pull

```bash
git pull --ff-only origin main
```
Son commit **`dc3b163`** (Hakan'ın işiyle merge edilmiş durumda). Bu
yapılmadan hiçbir şeye başlamayın.

## Plan durumu — 8 görevin 8'i BİTTİ ✅

Plan: `docs/superpowers/plans/2026-09-04-onchain-transaction-flow.md`
Spec: `docs/superpowers/specs/2026-09-04-onchain-transaction-flow-design.md`

| Görev | Durum |
|---|---|
| Task 1 — config + zincir okuma | ✅ `891ed30` |
| Task 2 — execute() calldata, imza bozma | ✅ `08dfb44` |
| Task 3 — UI yeniden kablolama, imza düşürme | ✅ `891ed30` |
| Task 3B — owner mnemonic içe aktarma + sızıntı denetimi | ✅ `0f9885b` + `684c59e` |
| Task 4 — MetaMask bağlantısı | ✅ `8ed9cf6` + `fd80c4c` |
| Task 5 — üç kalkanlı gönderim | ✅ `3795b70` + A1-A5 (`bbcccbf`, `f0007b1`) |
| Task 6 — negatif kanıt | ✅ `3fc4a1e` + `979fd4b` + `cd35df3` |
| Task 7 — gerçek işlem + ekran kaydı | ✅ `17538ea` + `3a25d91` + `88dc8cd` |

**Bu plan kapandı. `docs/GOREV_SINIRLARI.md`'deki Sprint 3 Akif satırlarının
üçü de kanıtla ✅.**

Sıradaki: **Sprint 4 — demo cilası, demo videosu, rapor bölümleri.**
Yazılı bir Sprint 4 planı **henüz yok**; ilk iş onu yazmak olabilir
(`superpowers:writing-plans`).

## Zincir durumu (13 Eylül, `cast` ile ölçüldü)

| | |
|---|---|
| `PQWallet.nonce()` | **2** (bizim tx 1→2 yaptı) |
| `PQWallet` bakiyesi | **900000000000000 wei = 0,0009 ETH** |
| MetaMask `0xe0BF2D19…B7351` | **0,049536821955312791 ETH** — gas için bol |
| Eski hesap `0x80a98eb2…ACF4` | 0,05 ETH, kullanılmadı |
| `ownerPublicKey` | `0x5c0adf08…` (64 bayt, sabit — setter yok) |

**Sepolia ETH blokajı yok.** Cüzdanda demo için yeterli bakiye var; bir tx daha
atılacaksa PQWallet'a ETH göndermek gerekebilir (0,0009 kaldı).

## Bu oturumda ne oldu

### Task 6 — negatif kanıt
Brief + kullanıcının üç sapması uygulandı: `finally`'de koşulsuz açma yok
(`syncSendButtons`), "kontrat reddetti" ile "ağ patladı" dört yola ayrıldı
(yeşil / sarı `.finding` / gri `.neutral` / kırmızı), buton kilidi btnSend ile
hizalandı. Brief'te olmayan **iki hata** bulundu ve düzeltildi:
bayat yeşil sonuç basılması (`sigSnapshot` + `showResult`) ve gönderim
penceresinde imza sapması (aşağıda).

### Task 7 — gerçek tx
`0x320e03d98cec857bbae8ecb49bcb0736c960287d76a19f2fad39b471b09e50da`
status 1 · blok 11696552 · **gasUsed 216.221** · limit 262.924.
Owner mnemonic'i Akif elle girdi; `.env.pqwallet-owner-key` hiçbir komuta
verilmedi. Ekran kaydı alındı.

Kanıt: `docs/evidence/crypto-tests/sprint3-end-to-end-transaction.md`

## Bu oturumun üç ölçülmüş bulgusu (rapora girebilir)

1. **`CALL_EXCEPTION` tek başına "kontrat cevap verdi" demek değil.** MetaMask
   signer'ı üzerinden ethers ağ hatalarını da `CALL_EXCEPTION` + `"missing
   revert data"` diye sarıyor (iki senaryoyla ölçüldü). Sadece koda bakan bir
   sınıflandırma her RPC hıçkırığını "güvenlik bulgusu" diye gösterirdi.
   Çözüm: revert **verisi** var mı diye de bakılıyor.
2. **233.429 tek seferlik bir sayıymış.** Farkın tamamı `nonce++`'ın SSTORE
   fiyatı: 0→1 `SSTORE_SET` 20.000 vs 1→2 `SSTORE_RESET` 2.900. Kalıcı rejim
   **216.221**. Defter kalansız kapandı:
   `−17.208 = calldata −108 + SSTORE −17.100 + verify 0 + sıcak/soğuk 0`.
3. **`verify()` imzaya göre DEĞİŞMİYOR** — iki gerçek imza da tam **113.771**.
   C13 = WOTS+C/FORS+C; **C sayacı checksum'ı sabitliyor**, zincir adımları
   deterministik. Spec'teki 108.574 bir Foundry trace'inden ve başka bir
   fixture imzasından; karşılaştırma tabanı olarak kullanılmamalı.

> ⚠️ 2 ve 3, ilk yazımda **yanlış** raporlanmıştı (+5.197 verify varyansı,
> −2.500 sıcak alıcı — ikisi de uydurma terimdi, −5.305 açıklanamayan
> bırakıyordu). Akif "defter kapanmıyor" diye itiraz etti, ölçünce ikisi de
> çürüdü. Kanıt notunda bu düzeltme **açıkça** duruyor, sessizce yapılmadı.

## Hakan'a iletildi, top onda

README gas tablosundaki iki satır bugünkü ölçümle eskidi:
- var olan alıcıya: 233.429 → **216.221** (233.429 "ilk tx" notu olarak kalabilir)
- yeni adrese: 258.429 → **~241.221** (216.221 + 25.000)

Not 13 Eylül akşamı Hakan'a gönderildi. `README.md` **onun dosyası,
dokunulmaz** — güncellemeyi o yapacak.

Tx hash de iletildi; `docs/evidence/tx-hashes.md`'ye (🔴 HAKAN, append-only)
bu taraftan dokunulmadı.

## HÂLÂ SINANMAMIŞ yollar (gizlenmedi, listelendi)

Task 7 kanıt notu § 7'de tablo hâlinde. Özet:

- **`GAS_FALLBACK = 350.000` dalı** — `estimateGas` başarılı olduğu için
  devreye girmedi (tahmin 219.104). Canlı hiç görülmedi.
- **`ACTION_REJECTED` dalı** — MetaMask'te iptal gerçek cüzdanla hiç
  denenmedi.
- **`receipt.status === 0` dalı** — PQWallet'ın *kendi* revert'iyle
  sınanmadı; Task 5'te ilgisiz bir Sepolia tx'inin receipt'i kullanılmıştı.
  *"`execute()` revert ederse nonce artmaz"* iddiası **kaynak okumasına**
  dayanıyor (`PQWallet.sol:48`), ampirik gözleme değil. Foundry'de sınanacaksa
  yer `contracts/test/` — **Hakan'ın alanı.**

## Ertelenen işler (kabul edilmiş borç, gizli değil)

- **`render()` refactor'ü** — main.js'in "her handler kendi div'ine yazar"
  deseni yerine tek render. Sprint 4 "demo cilası".
- **SAPMA 3 — negatif kanıtı salt-okunur provider'a taşıma.** Ölçüldü
  (+3/−1 satır `preflight`'ta, handler'da net ~+5/−24; mevcut testleri
  bozmuyor) ve **reddedildi**: negatif kanıtın ikna ediciliği gerçek
  gönderimle **aynı yoldan** geçmesinden geliyor. Sprint 4'te yeniden
  tartışılırsa *tek yol ilkesiyle birlikte* tartışılmalı. Gerekçe
  `main.js`'te `syncSendButtons`'ın üstünde de yazılı.
- ~~Açıklanmamış 5.000 gas~~ → **bugün kapandı** (yukarıdaki bulgu 2 ve 3).

## Çalışma kuralları (değişmedi)

- **Claude `git commit`/`git push` çalıştırmaz.** Komutu Akif'e verir.
- Yalnızca `frontend/**`, `docs/evidence/**`, `docs/superpowers/**`,
  `.superpowers/**` değiştirilir. `contracts/src/PQWallet.sol`,
  `contracts/src/Migration.sol`, `docs/evidence/tx-hashes.md`, `README.md`
  Hakan'ın — **dokunulmaz.** `docs/GOREV_SINIRLARI.md` ortak.
- `digest.js` ve `buildTransaction.js` dondurulmuş — dokunulmaz.
- **`.env.pqwallet-owner-key` AÇILMAZ, okunmaz, hiçbir komuta verilmez.**
  Mnemonic'i tarayıcıya Akif elle girer. Okuması gerekirse **ayrı bir
  terminalde** yapar, bu oturuma `!` ile yapıştırmaz.
- 3'ten fazla dosya commit'siz biriktirilmez.
- Test olmadan "bitti" denmez; kanıt `docs/evidence/` altına.
- `.superpowers/sdd/progress.md` **git-ignored** — commit listesine konmaz.

## Sprint 4 için elde ne var

- **Demo videosunun ham çekimi hazır:** `sprint3-end-to-end-recording.mp4`,
  93.087.866 bayt, SHA-256
  `f7be0790747634e8e2fc38ac68d28843462b932d2136d84d1722089cc22abe1b`.
  **Repo dışında** (Akif'in masaüstü) — 93 MB git'e konmadı, kimliği hash.
  Kayıt sırası: `✓ AYNI` → zincirden okuma → imzalama → negatif kanıt reddi →
  gerçek tx → MetaMask onayı → hash/gas/blok → bakiye düşüşü.
- **Rapor ham içeriği** Hakan'dan: `docs/RAPOR_HAM_ICERIK.md`.
- **Kanıt notları** (Sprint 3 Akif): `sprint3-sepolia-readonly-connection.md`,
  `sprint3-ui-chain-rewiring.md`, `sprint3-owner-mnemonic-import-leak-audit.md`,
  `sprint3-metamask-connection.md`, `sprint3-three-shields.md`,
  `sprint3-negative-proof.md`, `sprint3-end-to-end-transaction.md`.

## Takvim ve teknik olmayan riskler

Sprint 3 penceresi **13 Eylül**'de kapandı ve **Akif tarafı tamamlandı.**
Sprint 4: **14–20 Eylül** — demo cilası, demo videosu, rapor bölümleri.

Teknik bilinmeyen yok; kalan riskler lojistik ve **hâlâ açık**:

1. **Temiz klonda hiç denenmedi.** `git clone --recursive` + `npm i` + WASM
   build + `.env` kurulumu sıfırdan test edilmedi. Sprint 5'te "farklı makinede
   demo" maddesi var ama beklemeye değmez — 20 dakikalık iş.
2. **Owner mnemonic tek noktada** (`.env.pqwallet-owner-key`, sadece Akif'in
   makinesi). Kaybı = yeniden deploy = tüm canlı kanıt zincirinin
   geçersizleşmesi. Çevrimdışı yedek **hâlâ teyit edilmedi.**
3. **Rapor ve demo videosu hâlâ sıfır durumda** — ham malzeme var, kurgu yok.

## Bu oturumun dersleri

- **Defterin kapanmaması, açıklamanın yanlış olduğunun işaretidir.** Gas
  farkını iki uydurma terimle "açıklamıştım" (+5.197, −2.500) ve kendi içinde
  −5.305 açık bırakıyordu. Akif itiraz etti; ölçünce iki terim de yoktu ve
  defter sıfırda kapandı. Kalanı yuvarlamak yerine ölçmek doğru refleks.
- **Karşılaştırma tabanı aynı bağlamdan olmalı.** 108.574 bir Foundry
  trace'inden, benim 113.771 `eth_estimateGas`'tan geliyordu; ikisini çıkarıp
  "varyans" demek ölçüm değil artefakt üretti. Aynı yöntemle ikisini de
  ölçünce fark sıfır çıktı.
- **Kendi taklidin oracle değildir.** Girdi kilidini `dispatchEvent` ile
  sınamıştım; o `disabled`'ı umursamıyor, yani hiçbir şey kanıtlamıyordu.
  Playwright'ın `fill()`'i tarayıcının kendi actionability kontrolünden
  geçiyor — bağımsız oracle. (Ve `fill()` reddetmiyor, **bekliyor**: test
  penceresi denemelerin toplamından uzun tutulmalı.)
- **Kilit ile handler'ın koşulu aynı şeyi söylemeli.** Açık ama iş yapmayan
  bir buton, kilidin ikinci ve çelişen bir kopyasıdır.
- **Önlemek ile yakalamak ayrı katmanlardır.** Gönderim penceresinde girdiler
  kilitlenir (önle) **ve** `sendExecute`'tan önce `signed !== sig` sorulur
  (yakala). "İptal mi devam mı" yanlış ikilemdi; üçüncü şık önlemekti.
