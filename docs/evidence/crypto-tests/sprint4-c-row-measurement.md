# C satırının ölçümü — nonce 6, ön kayıtlı beklenti ikinci kez SIFIR farkla tuttu

**Tarih:** 24 Eylül 2026
**Yazan:** Akif
**Ağ:** Sepolia (chainId `11155111`)
**Ön kayıt:** `docs/evidence/c-nonce6-prerecord.md` · commit `95f93e1`
**Akış kâğıdı:** `docs/evidence/c-run-sheet.md`, uygulandı
**Yöntem:** B koşusuyla birebir aynı (`sprint4-recorded-demo-run.md`)

> **Video YOK** — bu bir ölçüm koşusudur, demo değil. İki ekran görüntüsü
> alındı. Negatif kanıt sahnesi yok.
>
> **Task 7 gas tablosunun C satırı artık ÖLÇÜM.** Üç satırın üçü de zincirde
> ölçülmüş oldu.

---

## 1. Bu belge ne kanıtlıyor

| | |
|---|---|
| **Kanıtlıyor** | C satırının zincirde ölçülmesi; ön kayıtlı `gasUsed` beklentisinin **ikinci kez sıfır farkla** tutması; `z` uzlaştırması sonrası üç satırın farklarının EVM sayılarına **tam** oturması |
| **Kanıtlamıyor** | Tekrarlanabilirlik (her satır **tek** koşu); `nonce++` maliyetinin üç koşuda aynı olduğu (**varsayıldı**, ölçülmedi); ham tahmin yolundaki ±1 gas'ın sebebi (§ 6) |

---

## 2. TX — ÖLÇÜM

| | |
|---|---|
| hash | `0x222556c3e0f9d2f5ff8661a1affcd8aa03d2b4120a539c65ea98a64044b11475` |
| blok | **11774980** · **2026-09-24 22:19:36 UTC** |
| `status` | **1 (success)** |
| **`gasUsed`** | **243.817** |
| zincirdeki tx gaz limiti | **246.919** |
| UI'da görünen limit | **296.302** |
| tx tipi | **2** (`0x2`) |
| tx `to` | `0x2EafA294…f000BB` = PQWallet |
| `from` | `0xe0BF2D19…B7351` |
| `authorizationList` | **YOK** |
| `effectiveGasPrice` | `2534136308` wei |
| EOA tx nonce | 11 |
| selector | `0xda0980c7` = `execute(address,uint256,bytes,bytes)` |

### `execute()` parametreleri

| | |
|---|---|
| `to` | `0xD999e3B2e4bE3D3ECb7523b8Cb4F4Dc99e2734Fc` — gönderimden önce **boş** |
| `value` | `100000000000000` (0,0001 ETH) |
| `data` | `0x` |
| PQWallet `nonce` | **6** |

### Calldata — zincirden sayıldı

| | |
|---|---|
| `n` (bayt) | **3908** |
| **`z`** (sıfır bayt) | **202** |
| sıfır-dışı | **3706** |
| intrinsic | **81.104** |
| **yürütme = gasUsed − intrinsic** | **162.713** |

---

## 3. ÖN KAYITLI BEKLENTİ — SIFIR FARK

```
z (zincirden sayıldı)  = 202
taban z                = 206
düzeltme               = 12 × (202 − 206) = −48
beklenti               = 243.769 − (−48) = 243.817
ÖLÇÜLEN gasUsed        = 243.817
FARK                   = 0
```

Taban `243.769` ve `z` = 206, ön kayıt § 3'te dosya:satır kaynağıyla
yazılıydı (`sprint4-gas-table-and-second-tx.md:722` ve `:280`).

### Kesin beklentiler — hepsi tuttu

| kalem | ön kayıt | ölçülen | |
|---|---|---|---|
| **digest** | `0xb6b379a3…65d8673e` | **ekranda aynısı** (`screenshots/sprint4-c-digest.png`) | ✓ |
| `nonce()` | 6 → **7** | **7** | ✓ |
| PQWallet bakiyesi | `50500000000000000` → `50400000000000000` | **`50400000000000000`** | ✓ |
| **alıcı bakiyesi** | `0` → **`100000000000000`** | **`100000000000000`** | ✓ mutlak değer |
| alıcı `nonce` | 0 kalır | **0** | ✓ |
| alıcı `code` | `0x` kalır | **`0x`** | ✓ |
| `receipt.status` | 1 | **1** | ✓ |
| tx tipi | `0x2` | **2** | ✓ |
| tx `to` | PQWallet | **PQWallet** | ✓ |
| `authorizationList` | YOK | **yok** | ✓ |
| `n` | 3908 | **3908** | ✓ |
| `cast code <ödeyen EOA>` | `0x` | **`0x`** | ✓ |

### Gas ödemesi EOA'dan — ÖLÇÜM

```
ücret = 243.817 × 2.534.136.308 = 617.865.512.207.636 wei = 0,000617866 ETH
EOA: 46903575447105843 − 617865512207636 = 46285709934898207
ölçülen EOA bakiyesi                     = 46285709934898207   ✓
```

PQWallet'ın bakiye düşüşü tam olarak `value` kadar; gas'a tek wei gitmedi.

### Tek seferlik kuralı uygulandı

Gönderimden hemen önce alıcı yeniden ölçüldü ve **boş** çıktı
(bakiye `0`, nonce `0`, kod `0x`). Tx sonrası bakiyesi `100000000000000`,
yani adres **artık boş değil** — C bu adresle bir daha ölçülemez.

---

## 4. SIRA — push, commit değil

```
ön kayıt commit'i : 95f93e1
GitHub pushed_at  : 2026-09-24T21:49:10Z      (sunucu tarafı)
tx bloğu          : 2026-09-24T22:19:36Z
MARJ              : 1.826 saniye = 30 dakika 26 saniye — push tx'ten ÖNCE
```

Ham çıktı, **tx sonrası okundu**:

```
$ curl -s "https://api.github.com/repos/akifaybek/pq-safe" | grep pushed_at
  "pushed_at": "2026-09-24T21:49:10Z",

$ git rev-parse --short HEAD      →  95f93e1
$ GET /repos/akifaybek/pq-safe/commits/main → sha 95f93e1
```

> **ŞERH — bu ölçüm YENİDEN ÜRETİLEMEZ.** `pushed_at` **son** push'u gösteren
> bir alandır; bir sonraki push'la kayar ve `95f93e1`'in push zamanı bu uçtan
> bir daha okunamaz. Ham çıktı bu yüzden buraya yazıldı. Aynı şerh B koşusunda
> da düşülmüştü (`sprint4-recorded-demo-run.md` tarihli eki).
>
> Blok zamanı tx'in **kazıldığı** andır, Confirm'e **basıldığı** an değil; o an
> hiçbir yerde kayıtlı değil. Kanıtlanabilir olan tek şey push'un bloktan
> 30 dakika önce olduğudur.

---

## 5. `z` UZLAŞTIRMASI — üç satırın farkları EVM sayılarına TAM oturdu

Ön kayıt § 3 şunu şart koşmuştu: *"`z` uzlaştırması yapılmadan 'boş hesap
maliyeti ölçüldü' **denmeyecek**."* Uzlaştırma burada yapılıyor.

**Yöntem:** `gasUsed`'dan intrinsic'i çıkar. Intrinsic zaten `z`'nin
fonksiyonudur (`21000 + 4z + 16·(n − z)`), dolayısıyla çıkarılınca `z` farkı
kendiliğinden düşer ve geriye **yürütme** bileşeni kalır.

| satır | alıcı durumu | `gasUsed` | `z` | intrinsic | **yürütme** | koşu |
|---|---|---|---|---|---|---|
| **A** | sıcak + var olan | 216.269 | 206 | 81.056 | **135.213** | nonce 4, §13 |
| **B** | soğuk + var olan | 218.721 | 210 | 81.008 | **137.713** | nonce 5, kayıtlı demo |
| **C** | soğuk + **boş** | **243.817** | **202** | **81.104** | **162.713** | nonce 6, bu koşu |

### Yürütme farkları

```
B − A =  2.500
C − B = 25.000
C − A = 27.500
```

**Üçü de sapmasız.** Karşılıkları ve kaynakları Task 7 tablosunda
(`sprint4-gas-table-and-second-tx.md` tarihli eki).

### Ham `gasUsed` farkları karşılaştırılamaz — uyarı

```
B − A =  2.452      (yürütme 2.500, intrinsic −48)
C − B = 25.096      (yürütme 25.000, intrinsic +96)
C − A = 27.548      (yürütme 27.500, intrinsic +48)
```

`z` farkı taşındığı için ham farklar EVM sayılarına oturmaz. **Uzlaştırma
yapılmadan bu satırlar karşılaştırılmamalıdır.**

---

## 6. AÇIK KALEM — ham tahmin yolu: iki koşu, iki sonuç

B koşusunda ham tahmin yolu **1 gas** şaşmıştı
(`sprint4-recorded-demo-run.md` § 4.1). Bu koşuda:

```
ham tahmin (C, z=206) = 246.871
z düzeltmesi          = +48
beklenti              = 246.919
zincirdeki gaz limiti = 246.919
FARK                  = 0
```

| koşu | ham tahmin yolu | ters çözüm yolu |
|---|---|---|
| B (nonce 5) | **−1 gas** | 0 |
| C (nonce 6) | **0** | 0 |

**Kalem KAPANMADI.** İki veri noktası var, biri şaşıyor biri tutuyor; sebep
**ölçülmedi, atanmadı**. Tamsayı bölmesi yuvarlaması bir hipotezdir, ayırt
edecek deney yapılmadı. Ters çözüm yolu iki koşuda da tam tuttu.

---

## 7. YAN BULGU — beşinci koşu

*"Bizim `gasLimit`'imiz zincire ulaşmıyor"* (`sprint4-gas-table-and-second-tx.md:1396-1399`):

| koşu | gönderdiğimiz (UI) | zincirdeki |
|---|---|---|
| nonce 2 | 263.026 | 355.384 |
| nonce 3 | 263.026 | 355.372 |
| nonce 4 | 262.983 | 219.153 |
| nonce 5 | 265.948 | 221.624 |
| **nonce 6** | **296.302** | **246.919** |

```
UI limit 296.302 = floor(estimated × 12 / 10)
ters çözüm TEK   → estimated = 246.919
zincirdeki limit = 246.919        AYNI SAYI
```

B koşusundaki keskinleşme burada da tekrarlandı: karşılaştırılan iki sayı da
bizim tarafımızdan ölçülüyor. **Elenmemiş alternatif aynen duruyor:**
MetaMask'in kendi bağımsız tahmininin bizimkiyle çakışması. Elenmesi için
MetaMask'e giden isteğin kaydedilmesi gerekir; **yapılmadı.**

`sendTransaction.js:202`'deki %20 payı MetaMask imzalayıcıyken **pratikte ölü**
kalmaya devam ediyor. Bu koşuda sorun çıkarmadı: `243.817 < 246.919`.

---

## 8. AFİN MODEL — altıncı uyumlu nokta

`sprint4-gas-table-and-second-tx.md:733`'teki `Δ ≈ U/126 + 1168`:

```
U = 243.817  →  formül: 243817/126 + 1168 = 3.103,06
gerçek Δ = 246.919 − 243.817 = 3.102
kalan = −1,06
```

Kalan negatif; büyüklüğü dosyadaki beş kalanın en büyüğüyle (`:737`'deki
**−1,04**) aynı mertebede. **Desen bozulmadı**, ama "hepsi 1'den küçük"
ifadesi bu nokta için de, `:737` için de geçerli değil — ikisinin de
büyüklüğü 1'i biraz aşıyor.

---

## 9. ZİNCİR OKUMALARI

### Tx öncesi — ön kayıttan (blok 11774616 · 21:06:47 UTC)

`nonce()` **6** · PQWallet `50500000000000000` · alıcı `0`/`0`/`0x` ·
ödeyen EOA `46903575447105843`

Gönderimden hemen önce alıcı **yeniden** ölçüldü, yine `0`/`0`/`0x`.

### Tx sonrası — **etiket: tx'ten SONRA okundu**

| | ölçülen |
|---|---|
| okuma anı | blok **11774996** · **2026-09-24 22:22:50 UTC** |
| PQWallet `nonce()` | **7** |
| PQWallet bakiyesi | **50400000000000000** wei · 0,0504 ETH |
| alıcı bakiyesi | **100000000000000** wei |
| alıcı `nonce` / `code` | **0** / **`0x`** |
| ödeyen EOA bakiyesi | **46285709934898207** wei |
| `cast code <ödeyen EOA>` | **`0x`** |
| uç | `ethereum-sepolia-rpc.publicnode.com` |

> **ŞERH.** Okuma tx'in bloğundan (11774980) **16 blok sonra** alındı. Bu
> aralıkta PQWallet'a ya da alıcıya başka bir işlem gitmediği **doğrudan
> ölçülmedi** — blok aralığı taranmadı, bu bir **ÇIKARIM**dır. Çıkarımı güçlü
> kılan, dört değerin (PQWallet nonce ve bakiyesi, alıcı bakiyesi, EOA
> bakiyesi) **birlikte** beklenen noktada olması.

---

## 10. EKRAN GÖRÜNTÜLERİ

| kare | dosya | içerik |
|---|---|---|
| digest | `screenshots/sprint4-c-digest.png` | `digest` = `0xb6b379a3…65d8673e`, ön kayıtla birebir |
| ONAYLANDI | `screenshots/sprint4-c-onaylandi.png` | `DURUM: ONAYLANDI` · hash · gas · blok |

---

## 11. AÇIK KALEMLER

1. **Ham tahmin yolundaki ±1 gas** (§ 6). İki veri noktası, sebep ölçülmedi.
2. **Tekrarlanabilirlik ölçülmedi.** A, B ve C'nin her biri **tek** koşu.
3. **`nonce++` maliyeti** üç koşuda aynı **varsayıldı** (üçü de sıfırdan
   farklıya güncelleme), **ölçülmedi**.
4. **Trace hâlâ alınmadı.**
5. **"Added protection" ile Smart account şalteri** hâlâ ayrılmadı.
6. **Etherscan ekran görüntüsü** alınmadı.
