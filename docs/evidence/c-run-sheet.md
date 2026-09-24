# Akış kâğıdı — C ölçümü (nonce 6)

**Hazırlandı:** 24 Eylül 2026 · **Uygulayacak:** Akif
**Ön kayıt:** `docs/evidence/c-nonce6-prerecord.md` — commit + push edilmiş olmalı
**Türetildi:** `demo-run-sheet.md` (B koşusu), kısaltılmış

> **VİDEO YOK.** Bu bir ölçüm koşusu, demo değil. Kesintisiz çekim şartı
> geçerli değil. Ekran görüntüsü olarak yalnız **iki kare** alınacak:
> digest ve ONAYLANDI.
>
> **Negatif kanıt sahnesi YOK.** B koşusunda kayda girdi, burada gerekmiyor.

---

## 🛑 DURDURMA KURALLARI — önce bunu oku

> ### TEK SEFERLİK
> C bu adresle **yalnız bir kez** ölçülebilir. Tx gidince adres boş olmaktan
> çıkar, ikinci deneme C değil B olur.
>
> ### GÖNDERMEDEN ÖNCE ÜÇ ŞEY
>
> 1. **Alıcı hâlâ boş mu** — bakiye `0` VE nonce `0` VE kod `0x`.
>    Biri bile tutmuyorsa **GÖNDERME, DUR.**
> 2. **Ekrandaki `digest`** `0xb6b379a3657239ee30aa88d9f3af230b71e3bbdb9e7d9ead055e7b9365d8673e`
>    olmalı. Farklıysa **GÖNDERME, DUR.**
> 3. **Zincirdeki nonce 6** olmalı. Başka bir şeyse **DUR.**
>
> ### METAMASK ONAY EKRANINDA
>
> - "Added protection" kutusu **İŞARETSİZ**
> - `Interacting with` = **PQWallet** `0x2EafA…000BB`
> - "Account update" / "Smart account" / "Upgrade" **görünmemeli**
>
> Biri ters ise → **Cancel**. Reddetmenin maliyeti sıfır.
>
> ### ONAY DÜĞMESİ
> Yalnız **bir kez**, yazısını **okuyarak**. Emin değilsen `Esc`.
>
> ### ONAYDAN SONRA TERS GİDERSE
> **Hiçbir şeye dokunma.** Tx hash'ini not al. Tekrar gönderme.

---

## 1. Kayıt öncesi kontrol

### 1.1 Depo

```bash
cd /Users/akif/pq-safe
git status --short          # BOŞ olmalı
git status -sb | head -1    # "## main...origin/main" — ahead/behind YOK
```

Ön kayıt **push edilmiş** olmalı; doğrulama:

```bash
curl -s "https://api.github.com/repos/akifaybek/pq-safe/commits/main" | grep '"sha"' | head -1
```

Çıkan sha, yereldeki `git rev-parse HEAD` ile aynı olmalı.

### 1.2 Testler

```bash
cd /Users/akif/pq-safe/frontend
node src/format-test.mjs | tail -1                    # TÜM TESTLER GEÇTİ
node src/tx/build-transaction-test.mjs | tail -1      # TÜM TESTLER GEÇTİ
node src/tx/send-transaction-test.mjs | grep -c "^✓"  # 99
npx vite build 2>&1 | grep "built in"
```

### 1.3 Zincir — gönderimden hemen önce

```bash
RPC=https://ethereum-sepolia-rpc.publicnode.com
PQW=0x2EafA294C14b6752128bfd4f5873D1EA39f000BB
A=0xD999e3B2e4bE3D3ECb7523b8Cb4F4Dc99e2734Fc

date -u '+%Y-%m-%d %H:%M:%S UTC'
cast block-number --rpc-url $RPC
cast call $PQW "nonce()(uint256)" --rpc-url $RPC
cast balance $PQW --rpc-url $RPC
cast balance $A --rpc-url $RPC
cast nonce   $A --rpc-url $RPC
cast code    $A --rpc-url $RPC
cast balance 0xe0BF2D190f8e2F2fc97cF19244845F8FeBDB7351 --rpc-url $RPC
```

| | beklenen | ölçülen |
|---|---|---|
| blok · UTC | — | ............ |
| PQWallet `nonce()` | **6** — başka bir şeyse DUR | ............ |
| PQWallet bakiye | `50500000000000000` | ............ |
| **alıcı bakiye** | **`0`** — değilse DUR | ............ |
| **alıcı nonce** | **`0`** — değilse DUR | ............ |
| **alıcı kod** | **`0x`** — değilse DUR | ............ |
| ödeyen EOA bakiye | ≥ 0,005 ETH | ............ |

### 1.4 MetaMask

- [ ] Ağ **Sepolia** (11155111)
- [ ] Hesap **`0xe0BF2D190f8e2F2fc97cF19244845F8FeBDB7351`**
- [ ] *Account details → Smart account → Sepolia* şalteri **KAPALI**

### 1.5 Sunucu

```bash
cd /Users/akif/pq-safe/frontend && npx vite --port 5173
```

---

## 2. Sahneler

| # | ne | düğme | ekranda beklenen |
|---|---|---|---|
| 1 | Sayfayı aç | `localhost:5173` | `Zincirdeki nonce: 6` · `50.500.000.000.000.000 wei = 0,0505 ETH` |
| 2 | Cüzdanı bağla | **Cüzdanı bağla** → MetaMask **Connect** | `MetaMask bağlandı, ağ Sepolia (11155111)` |
| 3 | Owner anahtarını içe aktar | mnemonic gir → **İçe aktar** | `✓ Zincirdeki ownerPublicKey ile AYNI` · keygen düğmesi grileşir |
| 4 | `to` alanını doldur | yapıştır (aşağıda) | — |
| 5 | **İmzala** | **Digest hesapla ve imzala** (~10 sn) | **`digest` = `0xb6b379a3…65d8673e`** — 🛑 farklıysa DUR |
| 6 | **Ekran görüntüsü 1** | `Cmd+Shift+4` | DOMAIN_SEPARATOR + digest + value geri okuma |
| 7 | Alıcıyı son kez ölç | terminal (§ 1.3) | bakiye 0 · nonce 0 · kod `0x` — 🛑 değilse DUR |
| 8 | **Gönder** | **Zincire gönder** | `DURUM: KONTROL` → `DURUM: MetaMask ONAYI BEKLENİYOR` |
| 9 | **MetaMask** | durdurma kurallarını oku → **Confirm** | — |
| 10 | Yayın | — | `DURUM: ZİNCİRDE BEKLENİYOR` + Tx hash (~12 sn) |
| 11 | Onay | — | `DURUM: ONAYLANDI` · hash · Etherscan · gas · blok |
| 12 | **Ekran görüntüsü 2** | `Cmd+Shift+4` | ONAYLANDI + receipt bloğu |
| 13 | Gösterge tazelenir | otomatik | nonce **7** · `50.400.000.000.000.000 wei = 0,0504 ETH` |

`to` alanına yapıştırılacak:

```
0xD999e3B2e4bE3D3ECb7523b8Cb4F4Dc99e2734Fc
```

`value` (`100000000000000`) ve `data` (`0x`) alanlarına **dokunma** —
varsayılanları zaten doğru.

---

## 3. Ekran görüntüleri

`Cmd+Shift+4` → sürükle → Masaüstü'ne kaydedilir.
**`Ctrl` tuşuna basma** — panoya kopyalar, dosya oluşmaz.

| kare | hedef ad |
|---|---|
| digest | `docs/evidence/screenshots/sprint4-c-digest.png` |
| ONAYLANDI | `docs/evidence/screenshots/sprint4-c-onaylandi.png` |

---

## 4. Tx sonrası kanıt — boş şablon

### 4.1 Tx

```bash
RPC=https://ethereum-sepolia-rpc.publicnode.com
HASH=<HASH>
cast tx      $HASH --rpc-url $RPC
cast receipt $HASH --rpc-url $RPC
```

| | ölçülen |
|---|---|
| tx hash | ............ |
| blok | ............ |
| blok zamanı (UTC) | ............ |
| `status` | ............ **beklenen 1** |
| **`gasUsed`** | ............ |
| zincirdeki gaz limiti | ............ |
| UI'da görünen limit | ............ |
| tx tipi | ............ **beklenen 2** |
| `authorizationList` | ............ **beklenen yok** |
| `effectiveGasPrice` | ............ |

Blok zamanı:

```bash
TS=$(cast block <BLOK> --field timestamp --rpc-url $RPC)
python3 -c "import datetime;print(datetime.datetime.fromtimestamp($TS,datetime.timezone.utc))"
```

### 4.2 `z`'nin zincirden sayılması — B'de kullanılan komut

```bash
RPC=https://ethereum-sepolia-rpc.publicnode.com
HASH=<HASH>
IN=$(cast tx $HASH input --rpc-url $RPC)
python3 - "$IN" <<'PY'
import sys
h=sys.argv[1]
if h.startswith('0x'): h=h[2:]
b=bytes.fromhex(h)
z=sum(1 for x in b if x==0)
print(f"n (calldata bayt) : {len(b)}")
print(f"z (sifir bayt)    : {z}")
print(f"sifir-disi        : {len(b)-z}")
print(f"intrinsic         : {21000 + 4*z + 16*(len(b)-z)}")
print(f"selector          : 0x{h[:8]}")
PY
```

| | ölçülen |
|---|---|
| `n` | ............ **beklenen 3908** |
| **`z`** | ............ |
| intrinsic | ............ |
| yürütme (`gasUsed − intrinsic`) | ............ |

### 4.3 Gas — TAHMİN karşılaştırması, eşik YOK

```
beklenti = 243.769 − 12 · (z_ölçülen − 206) = ............
ölçülen  = ............
FARK     = ............
```

| yol | tahmin | ölçülen | fark |
|---|---|---|---|
| ters çözüm (`inv`) | **243.769** (z=206 ile) | ............ | ............ |
| ham `eth_estimateGas` | **246.871** (z=206 ile) | ............ | ............ |

**Ne çıkarsa yazılır.** "Yaklaşık tuttu" denmez.

### 4.4 Tx sonrası zincir — *etiket: tx'ten SONRA okundu*

```bash
date -u '+%Y-%m-%d %H:%M:%S UTC'
cast block-number --rpc-url $RPC
cast call 0x2EafA294C14b6752128bfd4f5873D1EA39f000BB "nonce()(uint256)" --rpc-url $RPC
cast balance 0x2EafA294C14b6752128bfd4f5873D1EA39f000BB --rpc-url $RPC
cast balance 0xD999e3B2e4bE3D3ECb7523b8Cb4F4Dc99e2734Fc --rpc-url $RPC
cast code    0xe0BF2D190f8e2F2fc97cF19244845F8FeBDB7351 --rpc-url $RPC
```

| | ön kayıt | ölçülen |
|---|---|---|
| blok · UTC | — | ............ |
| `nonce()` | 6 → **7** | ............ |
| PQWallet bakiye | → `50400000000000000` | ............ |
| **alıcı bakiye** | `0` → **`100000000000000`** | ............ |
| `cast code <ödeyen EOA>` | `0x` | ............ |

Kaç blok sonra okunduğu yazılır; araya işlem girmediği **ÇIKARIM** olarak
etiketlenir.

### 4.5 Sıra doğrulaması — push, commit değil

```bash
curl -s "https://api.github.com/repos/akifaybek/pq-safe" | grep pushed_at
git reflog show origin/main --date=iso | head -1
```

| | zaman |
|---|---|
| GitHub `pushed_at` (sunucu) | ............ |
| yerel reflog | ............ |
| tx bloğu | ............ |
| **marj** | ............ **push önde olmalı** |

> `pushed_at` **son** push'u gösterir — ön kayıttan sonra başka bir şey
> push edilirse bu ölçüm kaybolur. **Tx'ten önce oku ve buraya yaz.**

### 4.6 C − B karşılaştırması

B: `gasUsed` **218.721**, `z` **210** (`crypto-tests/sprint4-recorded-demo-run.md`).

```
ham fark = gasUsed_C − 218.721 = ............
z farkı  = z_C − 210 = ............
z uzlaştırması sonrası fark = ............
beklenen (boş hesap oluşturma) = +25.000
```

> **`z` uzlaştırması yapılmadan "boş hesap maliyeti ölçüldü" YAZILMAZ.**
> Ön kayıt § 3'ün şerhine bakın.

### 4.7 Sonuç nereye yazılacak

**Yeni dosya:** `docs/evidence/crypto-tests/sprint4-c-row-measurement.md`

Tarihli ekler: `sprint4-gas-table-and-second-tx.md` (C artık ÖLÇÜM) ·
`tx-hashes.md` (yeni satır) · `.superpowers/sdd/progress.md` ·
ve **dört satırlık tablo artık yazılabilir**.
