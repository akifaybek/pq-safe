# ÖN KAYIT — nonce 6, Task 7 C satırının ölçümü

**Yazıldı:** 24 Eylül 2026 · **Yazan:** Akif
**Akış kâğıdı:** `docs/evidence/c-run-sheet.md`
**Yöntem:** `demo-nonce5-prerecord.md` ile birebir aynı (B koşusu)

> **COMMIT + PUSH SONRASI BU DOSYA DEĞİŞTİRİLMEZ.**
> Sonrasında yalnız **TARİHLİ EK** yazılır; yukarısı silinmez, düzeltilmez.
> Değeri tam olarak bundan geliyor: beklentinin geriye dönük ayarlanmadığı,
> push zamanı ile blok zamanı karşılaştırılarak gösterilir.
>
> B koşusunda bu marj **73 dk 29 sn** ölçüldü ve push'un sunucu tarafı damgası
> GitHub `pushed_at` ile alındı — `crypto-tests/sprint4-recorded-demo-run.md`
> tarihli eki.

---

## 0. Neden bu dosya var

Task 7 gas tablosunun **C satırı** (soğuk + **boş** alıcı) bugüne kadar
`est()`'in ters çözümünden geliyordu — **ÇIKARIM**, zincirde ölçülmüş değil
(`crypto-tests/sprint4-gas-table-and-second-tx.md:722`). B satırı 24 Eylül'de
nonce 5 koşusuyla ölçüldü; bu dosya C'yi aynı yöntemle ölçmenin ön kaydıdır.

Ölçüm sonrası dört satırlık tablonun **üç satırı** zincirde ölçülmüş olacak:
A (§13), B (nonce 5), C (bu koşu) ve Hakan'ın ilk tx'i.

---

## 1. PARAMETRELER

| alan | değer |
|---|---|
| PQWallet | `0x2EafA294C14b6752128bfd4f5873D1EA39f000BB` |
| `execute()` `to` | **`0xD999e3B2e4bE3D3ECb7523b8Cb4F4Dc99e2734Fc`** |
| `execute()` `value` | `100000000000000` (0,0001 ETH) |
| `execute()` `data` | `0x` |
| `nonce` | **6** |
| chainId | `11155111` |

**Alıcı neden bu adres:** C'nin iki tahmini **tam olarak bu adresle** üretildi
(`:119`, `:194`, `:280`, `:722`). Başka bir boş adres seçilseydi adres baytları
`z`'yi değiştirir ve tahminler o calldata'ya ait olmaktan çıkardı — B
koşusunda aynı tuzak aynı yöntemle kapatılmıştı. **Kalan tek fark: nonce
2 → 6.**

### Alıcının durumu — ÖLÇÜLDÜ (blok 11774616 · 2026-09-24 21:06:47 UTC)

| kontrol | beklenen | **ölçülen** | |
|---|---|---|---|
| `cast balance` | **0** | **0** | ✓ boş |
| `cast nonce` | **0** | **0** | ✓ boş |
| `cast code` | **`0x`** | **`0x`** | ✓ kod yok |
| ödeyen hesaptan farklı | ✓ | `0xe0BF2D19…B7351` ≠ `0xD999e3B2…` | ✓ soğuk |
| PQWallet'tan farklı | ✓ | `0x2EafA294…f000BB` ≠ `0xD999e3B2…` | ✓ soğuk |

Üç ölçütün üçü de sıfır → EIP-161 anlamında **BOŞ hesap**. C'nin tanımı
(*"soğuk, boş"* — `:194`) karşılanıyor.

### PQWallet ön durumu — ÖLÇÜLDÜ (aynı blok)

| | |
|---|---|
| `nonce()` | **6** |
| bakiye | **50500000000000000** wei · 0,0505 ETH |
| ödeyen EOA bakiyesi | **46903575447105843** wei · 0,046903575447105843 ETH |
| `cast code <ödeyen EOA>` | **`0x`** — delegasyon yok |
| uç | `ethereum-sepolia-rpc.publicnode.com` |

---

## 2. 🛑 TEK SEFERLİK KURALI

> ### C BU ADRESLE YALNIZ **BİR KEZ** ÖLÇÜLEBİLİR
>
> Tx gönderildiği anda `0xD999e3B2…` **boş olmaktan çıkar** (bakiye > 0).
> İkinci bir deneme artık C değil **B** olur ve C'nin tahminleriyle
> karşılaştırılamaz.
>
> **TX'TEN HEMEN ÖNCE ALICI YENİDEN ÖLÇÜLÜR:**
>
> ```bash
> RPC=https://ethereum-sepolia-rpc.publicnode.com
> A=0xD999e3B2e4bE3D3ECb7523b8Cb4F4Dc99e2734Fc
> cast balance $A --rpc-url $RPC    # 0 olmalı
> cast nonce   $A --rpc-url $RPC    # 0 olmalı
> cast code    $A --rpc-url $RPC    # 0x olmalı
> ```
>
> **bakiye 0 DEĞİLSE, ya da nonce 0 DEĞİLSE, ya da kod `0x` DEĞİLSE:
> GÖNDERME, DUR.** Adres artık boş değil; C tahmini geçersiz, bu koşu C
> ölçümü olmaz.
>
> **AYNI KURAL DIGEST İÇİN DE GEÇERLİ.** İmzalamadan sonra ekrandaki `digest`
> § 4'teki değerin **birebir aynısı** olmalı. Farklıysa **GÖNDERME, DUR** —
> ya nonce değişmiştir ya alanlar yanlış girilmiştir.

---

## 3. GAS TAHMİNİ — TAHMİN, EŞİK YOK, SAPMA RAPORLANACAK

> ### ⚠ Bu bölüm bir BEKLENTİDİR, ölçüm değildir.
> **Eşik yok, "yaklaşık tuttu" denmeyecek.** Ölçülen `gasUsed` ne çıkarsa
> yazılır, tahminden farkı **olduğu gibi raporlanır**. Tutmazsa hipotez
> çürümüştür ve öyle yazılır — sayı yuvarlanmaz, terim uydurulmaz
> (`plans/2026-09-14-sprint4-demo-measurement-report.md:1099-1103`).

### Tahminin kaynağı — ÖLÇÜM, dosya:satır

| değer | ne | kaynak |
|---|---|---|
| **246.871** | `eth_estimateGas`'ın C satırı için döndürdüğü **ham tahmin** | `crypto-tests/sprint4-gas-table-and-second-tx.md:280` |
| **243.769** | 246.871'in `est()` üzerinden **tek ters çözümü** | aynı dosya **`:722`** |
| **taban `z` = 206** | C satırının sıfır bayt sayısı | aynı dosya **`:280`** |
| `value`/`data`/nonce | `100000000000000` / `0x` / **nonce 2** | aynı dosya **`:282-284`** |
| düzeltme katsayısı | **−12 gas / ek sıfır bayt**, iki gerçek tx ile ölçüldü | aynı dosya **`:1122`, `:1131`** |

`243.769` **zincirde ölçülmüş bir `gasUsed` değildir.** C'nin ham tahmini üç
ayrı uçta birebir aynı çıkmıştı (`:550` — reth · Tenderly · MetaMask, fark 0).

### Beklenti

```
gasUsed_C  =  243.769  −  12 · (z_ölçülen − 206)
```

| | değer | koşul |
|---|---|---|
| ters çözüm yolu | **243.769** | `z` = 206 çıkarsa |
| ham tahmin yolu | **246.871** | aynı |
| düzeltme | `± 12 · (z_ölçülen − 206)` | `z` zincirden sayılacak |

### Tek parametre farklı — `nonce` 2 → 6

Alıcı adresi aynı seçildiği için **adres kaynaklı sapma yok.** Digest nonce'a
bağlı → imza gövdesi değişiyor → `z` değişiyor. Yön ve büyüklük **bilinmiyor**,
yalnız mekanizma biliniyor; `z` tx'ten sonra zincirden sayılacak.

**B koşusunun verisi (ÖLÇÜM, `crypto-tests/sprint4-recorded-demo-run.md`):**
nonce 2 → 5 geçişinde `z` 205'ten 210'a çıktı (+5, −60 gas) ve formül **sıfır
farkla** tuttu. Bu, formülün nonce farkını taşıdığına dair **bir örnek**tir;
C'de de tutacağı **garanti değildir**.

### C − B beklenen farkı — kaynağıyla

`:294` şunu yazıyor:

```
| C − B (türetilmemişti, kendiliğinden çıktı) | +25.000 | +25.198 | +198 |
```

`+25.000` EVM spesifikasyonunda **boş hesap oluşturma** bedelidir ve
`:298-300`'e göre *"kesin sayıdır, yaklaşık değil"*.

> **ŞERH — bu fark TAHMİNLER arasında ölçüldü, `gasUsed`'lar arasında
> DEĞİL.** `:290-294`'teki tablo `eth_estimateGas` çıktılarının farkıdır ve
> üçü de **nonce 2** ile alınmıştır. Bu koşuda ölçülecek olan C'nin
> `gasUsed`'ı nonce 6 ile; B'nin ölçülen `gasUsed`'ı ise nonce 5 ile alındı.
> **İkisinin farkını +25.000 ile karşılaştırmadan önce `z` uzlaştırması
> gerekir** (B'nin `z`'si 210, C'ninki ölçülecek). Uzlaştırma yapılmadan
> "boş hesap maliyeti ölçüldü" **denmeyecek**.

---

## 4. BEKLENEN DIGEST — hesaplandı ve iki kaynakla doğrulandı

Formül **dondurulmuş** (`CLAUDE.md`):

```
DOMAIN_SEPARATOR = keccak256(abi.encode(keccak256("PQSAFE_V1"), block.chainid, address(this)))
digest           = keccak256(abi.encode(DOMAIN_SEPARATOR, nonce, to, value, keccak256(data)))
```

### Sabitler — ÖLÇÜM

| | |
|---|---|
| `keccak256("PQSAFE_V1")` | `0x2b5183369e211b22c659fbb16b053826a633cf1ec619ff23c7c67552f9998548` |
| **DOMAIN_SEPARATOR** | **`0xa6238098b5d49d6e94eb134fa1e5ce7f888c5a9f870626079776fb42874c228b`** |
| `keccak256(0x)` | `0xc5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470` |

DOMAIN_SEPARATOR nonce'a bağlı değil; B koşusunda ekranda görülen değerle
**aynı** (`screenshots/sprint4-demo-digest.png`).

### Tarif, B koşusunda iki kez doğrulandı

1. Nonce 4 koşusunun zincirdeki digest'ini birebir yeniden üretti.
2. Nonce 5 için hesaplanan değer **ekranda** göründü ve ön kayıtla eşleşti.

### Hesaplama komutu

```bash
PQW=0x2EafA294C14b6752128bfd4f5873D1EA39f000BB
ALICI=0xD999e3B2e4bE3D3ECb7523b8Cb4F4Dc99e2734Fc

K=$(cast keccak "PQSAFE_V1")
DS=$(cast keccak $(cast abi-encode "f(bytes32,uint256,address)" $K 11155111 $PQW))
DATAHASH=$(cast keccak 0x)
DIGEST=$(cast keccak $(cast abi-encode "f(bytes32,uint256,address,uint256,bytes32)" \
  $DS 6 $ALICI 100000000000000 $DATAHASH))
echo "$DS"
echo "$DIGEST"
```

### İkinci, bağımsız kaynak — kontratın kendisi

```bash
RPC=https://ethereum-sepolia-rpc.publicnode.com
cast call 0x2EafA294C14b6752128bfd4f5873D1EA39f000BB \
  "_computeDigest(address,uint256,bytes)(bytes32)" \
  0xD999e3B2e4bE3D3ECb7523b8Cb4F4Dc99e2734Fc 100000000000000 0x --rpc-url $RPC
```

Kontrat MEVCUT on-chain nonce'u kendi okur — bu çağrı **nonce 6 geçerliyken**
doğru cevabı verir. Nonce değişmişse iki kaynak ayrışır, ki bu da başlı başına
bir uyarıdır.

### BEKLENEN DIGEST

```
0xb6b379a3657239ee30aa88d9f3af230b71e3bbdb9e7d9ead055e7b9365d8673e
```

| | |
|---|---|
| elle `cast` ile hesaplanan | `0xb6b379a3657239ee30aa88d9f3af230b71e3bbdb9e7d9ead055e7b9365d8673e` |
| kontratın `_computeDigest`'i | `0xb6b379a3657239ee30aa88d9f3af230b71e3bbdb9e7d9ead055e7b9365d8673e` |
| **iki kaynak eşleşti mi** | **EVET** ✓ |
| hesaplandığı an | blok **11774616** · **2026-09-24 21:06:47 UTC** |

**İmzalamadan sonra ekranda bu değer görünmeli. Farklıysa DUR** (§ 2).

---

## 5. KESİN BEKLENTİLER — tahmin değil

Bunlar tutmazsa bir şey yanlış gitmiştir.

| kalem | ön kayıt |
|---|---|
| `nonce()` | **6 → 7** |
| PQWallet bakiyesi | `50500000000000000` → **`50400000000000000`** wei · 0,0504 ETH |
| **alıcı bakiyesi** | **`0` → `100000000000000`** (mutlak değer) |
| alıcı `nonce` | **0** kalır (alıcı işlem göndermiyor) |
| alıcı `code` | **`0x`** kalır |
| `receipt.status` | **1** |
| tx tipi | **`0x2`** |
| tx `to` | **PQWallet** `0x2EafA294…f000BB` (`execute()`'un alıcısı değil) |
| `authorizationList` | **YOK** |
| `n` | **3908** |
| `cast code <ödeyen EOA>` (tx sonrası) | **`0x`** — delegasyon kurulmadı |

Gas **EOA'dan** ödenir, PQWallet'tan değil — cüzdanın bakiye düşüşü tam olarak
`value` kadar olmalı.

> **Alıcının mutlak değeri neden burada işe yarıyor:** adres şu an **boş**.
> B koşusunda alıcının bakiyesi üçüncü taraf etkisine açıktı; burada 0'dan
> başlıyor, yani `100000000000000` mutlak bir beklentidir. Araya bir işlem
> girerse mutlak değer tutmaz — o durumda doğrulama **fark** üzerinden yapılır
> (`+100000000000000`) ve durum yazılır. **Ama araya işlem girmesi aynı
> zamanda § 2'nin durdurma kuralını tetikler**, çünkü adres artık boş olmaz.

### §12'den devralınan ön koşullar (aynen geçerli)

1. Onay ekranında **"Added protection" İŞARETSİZ**
2. `Interacting with` satırı **PQWallet adresini** gösteriyor
3. "Account update" / "Smart account" / "Upgrade" ibaresi görülürse **Cancel**
4. *Account details → Smart account → Sepolia* şalteri **kapalı**

---

## 6. KAYITTAN SONRA

Ölçülen değerler `c-run-sheet.md` § 4'ün şablonuna yazılır, karşılaştırma bu
dosyaya karşı yapılır. Sonuç notu:
`docs/evidence/crypto-tests/sprint4-c-row-measurement.md`

**Commit sırası (kural):**

1. Bu dosya + `c-run-sheet.md` **commit + PUSH**
2. Push'un GitHub'a ulaştığı doğrulanır (`pushed_at`)
3. Tx atılır
4. Ölçüm sonuçları **ayrı** commit'le yazılır
5. Push saati ile blok saati karşılaştırılır — push **önde** olmalı

---

## DURUM

- [x] Alıcı belirlendi ve **boş** olduğu ölçüldü (§ 1)
- [x] PQWallet ön durumu okundu: `nonce()` 6, bakiye `50500000000000000`
- [x] Beklenen digest hesaplandı, iki kaynak **eşleşti** (§ 4)
- [x] Kesin beklentiler yazıldı (§ 5)
- [x] Gas tahmini kaynağıyla yazıldı, **eşik yok** (§ 3)
- [ ] **Commit + PUSH** ← tek kalan
