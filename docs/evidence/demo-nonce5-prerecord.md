# ÖN KAYIT — nonce 5, kayıtlı demo koşusu

**Yazıldı:** 24 Eylül 2026 · **Yazan:** Akif
**Durum:** TAMAM — alıcı belirlendi, digest hesaplandı ve iki bağımsız
kaynakla doğrulandı. **Commit + push edilmeyi bekliyor.**

> **Bu dosya ölçümden ÖNCE yazıldı ve kayıttan ÖNCE commit + push edilecek.**
> Değeri tam olarak bundan geliyor: beklentinin geriye dönük ayarlanmadığı
> ancak commit zamanı ile blok zamanı karşılaştırılarak gösterilebilir
> (§13'ün 46 saniyelik marj deseni — `crypto-tests/sprint4-gas-table-and-second-tx.md:1249-1265`).
>
> **Ön kayıt push edilmeden kayda başlanmaz.**

---

## 0. Neden bu dosya var

**ÖLÇÜM.** §12 (`crypto-tests/sprint4-gas-table-and-second-tx.md:1175`)
**nonce 4'ün** ön kaydıydı; §13'te tüketildi ve kapandı, beklentisi birebir
tuttu (`:1424-1425`). **Nonce 5 için depoda hiçbir ön kayıt yoktu** — tek
geçen şey bir atamaydı: *"Kayıtlı demo koşusu yapılmadı… nonce 5 ile
çekilecek"* (`:1339`, `.superpowers/sdd/progress.md:2211-2212`).

Bu dosya o boşluğu kapatıyor.

---

## 1. PARAMETRELER

`docs/evidence/demo-run-sheet.md` § 1 ile **birebir aynı olmalı.** İkisi
ayrışırsa kayıt durdurulur.

| alan | değer |
|---|---|
| PQWallet | `0x2EafA294C14b6752128bfd4f5873D1EA39f000BB` |
| `execute()` `to` | **`0x7268a7c3d52baa50486930e6ed25d29804d075b6`** |
| `execute()` `value` | `100000000000000` (0,0001 ETH) |
| `execute()` `data` | `0x` |
| `nonce` | **5** |
| chainId | `11155111` |

**KARAR (24 Eylül, Akif):** alıcı = Hakan'ın EOA'sı
`0x7268a7c3d52baa50486930e6ed25d29804d075b6`. Bu adres **Task 7'nin B
satırının tahminlerini üreten adresin ta kendisidir** (§ 3), dolayısıyla
tahmin ile ölçüm aynı calldata üzerinde karşılaştırılabilir. Başka bir adres
§ 3'teki sapma hükmünü tetiklerdi.

### Alıcının dört şartı — ÖLÇÜLDÜ (24 Eylül 19:00 UTC, blok 11773986)

| kontrol | beklenen | **ölçülen** | |
|---|---|---|---|
| `cast balance` | > 0 | **`47135340130807312`** wei · 0,047135340130807312 ETH | ✓ "var olan / dolu" |
| `cast code` | `0x` | **`0x`** | ✓ EOA, kontrat değil |
| `cast nonce` | (bilgi) | **8** | ✓ hesabın varlığının ikinci bağımsız işareti |
| ödeyen hesaptan farklı | ✓ | `0xe0BF2D19…B7351` ≠ `0x7268a7c3…` | ✓ soğuk |
| PQWallet'tan farklı | ✓ | `0x2EafA294…f000BB` ≠ `0x7268a7c3…` | ✓ soğuk |

### Kayıt günü tekrar koşulacak komutlar

Bakiye ve nonce kayıt gününe kadar değişebilir; **`code` = `0x` değişmemeli.**

```bash
RPC=https://ethereum-sepolia-rpc.publicnode.com
ALICI=0x7268a7c3d52baa50486930e6ed25d29804d075b6

cast balance $ALICI --rpc-url $RPC    # > 0 olmalı
cast code    $ALICI --rpc-url $RPC    # tam olarak 0x olmalı
cast nonce   $ALICI --rpc-url $RPC    # bilgi
```

| kontrol | kayıt günü ölçülen |
|---|---|
| `cast balance` | ............................ |
| `cast code` | ............................ |
| `cast nonce` | ............................ |

> **Hakan'ın hesabına 0,0001 ETH gidecek.** İki kişilik ekipte sorun değil,
> ama koşudan önce haberdar edilmesi Akif'in kararı.

---

## 2. B'NİN TANIMI — ÖLÇÜM

| kaynak | satır | tanım |
|---|---|---|
| `specs/2026-09-14-sprint4-scope-design.md` | **425** | `B \| soğuk + var olan \| ≈ 218.700 \| HİPOTEZ — ölçülecek (+2.500, EIP-2929)` |
| `plans/2026-09-14-sprint4-demo-measurement-report.md` | **1091** | `B \| soğuk + var olan \| (ölçülen) \| MANŞET SAYI — tipik kullanıcı işlemi` |
| `crypto-tests/sprint4-gas-table-and-second-tx.md` | **193** | `B \| var olan başka adres \| 0x7268a7c3… \| soğuk, dolu (Hakan EOA)` |
| `plans/2026-09-14-sprint4-demo-measurement-report.md` | **1096** | *"Her satırın etiketi: **ALICI EOA, `data = 0x`**"* |

**ÇIKARIM — demo tx'i bu tanımı karşılıyor.** § 1'in dört ölçümü sağlandı:

- *"soğuk"* = işlem başında erişim listesinde olmayan adres. Erişim listesi her
  tx'te sıfırlanır; ödeyen hesap ve çağrılan kontrat dışındaki her adres
  soğuktur. Alıcı ikisinden de farklı.
- *"var olan / dolu"* = EIP-161 anlamında boş olmayan hesap (nonce, bakiye ya
  da kodun en az biri sıfırdan farklı). Bakiye 0,0471 ETH, nonce 8 — iki
  bağımsız işaret.
- *"alıcı EOA, `data = 0x`"* = `cast code` = `0x` ve `data` alanı `0x`.

**Bu bir ÇIKARIMdır, ölçüm değil:** "soğukluk" tx anında zincirde ölçülmedi;
erişim listesi semantiğinden türetildi. Doğrudan ölçüm, tx'in trace'inden
erişim listesini okumak olurdu — bu projede trace hiç alınmadı
(`sprint4-gas-table-and-second-tx.md:1335`).

---

## 3. GAS TAHMİNİ — TAHMİN, EŞİK YOK, SAPMA RAPORLANACAK

> ### ⚠ Bu bölüm bir BEKLENTİDİR, ölçüm değildir.
> **Eşik yok, "yaklaşık tuttu" denmeyecek.** Ölçülen `gasUsed` ne çıkarsa
> yazılır ve tahminden farkı **olduğu gibi raporlanır**. Tutmazsa hipotez
> çürümüştür ve öyle yazılır — sayı yuvarlanmaz, terim uydurulmaz
> (`plans/2026-09-14-sprint4-demo-measurement-report.md:1099-1103`).

### Tahminin kaynağı — ÖLÇÜM

| değer | ne | kaynak |
|---|---|---|
| **221.685** | `eth_estimateGas`'ın B satırı için döndürdüğü **ham tahmin** | `crypto-tests/sprint4-gas-table-and-second-tx.md:279` |
| **218.781** | 221.685'in `est()` üzerinden **tek ters çözümü** | aynı dosya `:721-722` |

`218.781` **zincirde ölçülmüş bir `gasUsed` değildir** — tahmin fonksiyonunun
tersidir. Zincirde `gasUsed` olarak ölçülmüş tek satır A'dır: **216.269**
(`:1296`).

### Tahminin üretildiği koşul ↔ demo koşusu — ÖLÇÜM

| | tahmin koşusu (20 Eylül) | demo koşusu | |
|---|---|---|---|
| `to` | `0x7268a7c3d52baa…d075b6` | `0x7268a7c3d52baa…d075b6` | **AYNI** ✓ |
| `value` | `100000000000000` | `100000000000000` | aynı ✓ |
| `data` | `0x` | `0x` | aynı ✓ |
| **`nonce`** | **2** | **5** | **FARKLI** |
| `n` (calldata bayt) | 3908 | beklenen 3908 | — |
| `z` (sıfır bayt) | **205** | **ölçülecek** | — |

Kaynak: `:282-284` — *"Üç satırın da `value` = 100000000000000, `data` = `0x`,
nonce = 2"*.

### TEK PARAMETRE FARKLI — `nonce` 2 → 5

Alıcı adresi aynı seçildiği için **adres kaynaklı sapma yok.** Geriye tek
fark kalıyor:

Digest nonce'a bağlı → imza gövdesi değişiyor → calldata'nın sıfır bayt
sayısı `z` değişiyor. Düzeltme katsayısı zincirde iki gerçek tx ile ölçüldü:
her ek sıfır bayt **−12 gas**. Nonce 4 koşusunda `z` = 206 çıkmıştı, A'nın
tabanı 203'tü; üç baytlık fark −36 gas etti (`:1295-1296`).

**Yön ve büyüklük bilinmiyor, yalnız mekanizma biliniyor.** `z` kayıttan
sonra zincirden sayılacak.

> **Adres seçimi bu sapmayı kapattı.** Eğer alıcı `0x7268a7c3…` dışında bir
> adres olsaydı, `z` farkı hem adresten hem nonce'tan gelirdi ve iki kaynak
> birbirine karışırdı; o durumda karşılaştırma yapılmayacaktı. **ÖLÇÜM:**
> A/B/C satırlarında `value` ve `data` özdeşken `z` sırasıyla 203 / 205 / 206
> çıktı (`:278-280`) — fark tamamen adres baytlarındandı.

### Beklenen (koşullu)

| | değer | koşul |
|---|---|---|
| `gasUsed` — ham tahmin yolu | **221.685** | `z` = 205 çıkarsa |
| `gasUsed` — ters çözüm yolu | **218.781** | aynı |
| düzeltme | `± 12 · (z_ölçülen − 205)` | `z` zincirden sayılacak |

---

## 4. BEKLENEN — ZİNCİR DURUMU

Bunlar tahmin değil, **kesin beklentilerdir**; tutmazlarsa bir şey yanlış
gitmiştir.

| kalem | ön kayıt |
|---|---|
| `nonce()` | **5 → 6** |
| PQWallet bakiyesi | `50600000000000000` → **`50500000000000000`** wei · 17 hane · 0,0505 ETH |
| Alıcı bakiyesi | `47135340130807312` → **+`100000000000000`** *(araya başka işlem girmezse `47235340130807312`)* |
| `receipt.status` | **1** |
| tx tipi | **`0x2`** |
| tx `to` | **PQWallet** `0x2EafA294…f000BB` (`execute()`'un alıcısı değil) |
| `authorizationList` | **YOK** |
| `n` | **3908** |
| `cast code <ödeyen EOA>` (tx sonrası) | **`0x`** — delegasyon kurulmadı |

Gas **EOA'dan** ödenir, PQWallet'tan değil — cüzdanın bakiye düşüşü tam
olarak `value` kadar olmalı.

> **Alıcının bakiyesi üçüncü taraf etkisine açık.** Hakan'ın hesabına bu arada
> başka bir işlem gelirse beklenen mutlak değer tutmaz; tutması gereken şey
> **farktır** (`+100000000000000`). Mutlak değer tutmazsa fark üzerinden
> doğrulanır ve durum yazılır.

### §12'den devralınan ön koşullar (aynen geçerli)

1. Onay ekranında **"Added protection" İŞARETSİZ**
2. `Interacting with` satırı **PQWallet adresini** gösteriyor
3. "Account update" / "Smart account" / "Upgrade" ibaresi görülürse **Cancel**
4. *Account details → Smart account → Sepolia* şalteri **kapalı**

---

## 5. BEKLENEN DIGEST — HESAPLANDI VE DOĞRULANDI

Formül **dondurulmuş** (`CLAUDE.md`):

```
DOMAIN_SEPARATOR = keccak256(abi.encode(keccak256("PQSAFE_V1"), block.chainid, address(this)))
digest           = keccak256(abi.encode(DOMAIN_SEPARATOR, nonce, to, value, keccak256(data)))
```

### Sabitler — ÖLÇÜM (24 Eylül, `cast`)

| | |
|---|---|
| `keccak256("PQSAFE_V1")` | `0x2b5183369e211b22c659fbb16b053826a633cf1ec619ff23c7c67552f9998548` |
| **DOMAIN_SEPARATOR** | **`0xa6238098b5d49d6e94eb134fa1e5ce7f888c5a9f870626079776fb42874c228b`** |
| `keccak256(0x)` | `0xc5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470` |

DOMAIN_SEPARATOR, 24 Eylül'de tarayıcı ekranında görülen değerle **birebir
aynı** — bağımsız ikinci kaynak.

### Tarif DOĞRULANDI — uydurulmadı

Aşağıdaki komut dizisi, **nonce 4 koşusunun zincirdeki digest'ini birebir
yeniden üretti** (`:1247`; nonce 4, `to` = `0xe0BF2D19…B7351`,
`value` = `100000000000000`, `data` = `0x`):

```
hesaplanan     : 0x8aa46c4218015c05323e2c09cd82ab191fc664d7563c7573e5c76dbacd67c76f
§13'te kayıtlı : 0x8aa46c4218015c05323e2c09cd82ab191fc664d7563c7573e5c76dbacd67c76f   ✓
```

### Hesaplama komutu

```bash
PQW=0x2EafA294C14b6752128bfd4f5873D1EA39f000BB
ALICI=0x7268a7c3d52baa50486930e6ed25d29804d075b6

K=$(cast keccak "PQSAFE_V1")
DS=$(cast keccak $(cast abi-encode "f(bytes32,uint256,address)" $K 11155111 $PQW))
DATAHASH=$(cast keccak 0x)
DIGEST=$(cast keccak $(cast abi-encode "f(bytes32,uint256,address,uint256,bytes32)" \
  $DS 5 $ALICI 100000000000000 $DATAHASH))

echo "DOMAIN_SEPARATOR : $DS"
echo "BEKLENEN DIGEST  : $DIGEST"
```

### İkinci, bağımsız kaynak — kontratın kendisi

```bash
RPC=https://ethereum-sepolia-rpc.publicnode.com
cast call 0x2EafA294C14b6752128bfd4f5873D1EA39f000BB \
  "_computeDigest(address,uint256,bytes)(bytes32)" \
  0x7268a7c3d52baa50486930e6ed25d29804d075b6 100000000000000 0x --rpc-url $RPC
```

**İmza DOĞRULANDI (ÖLÇÜM):** `PQWallet.json` ABI'sinde
`_computeDigest(address,uint256,bytes) -> (bytes32) [view]`; `readDigest()` de
bunu çağırıyor (`frontend/src/contracts/pqwallet.js:59-61`). Alt çizgi adın
parçası.

Kontrat MEVCUT on-chain nonce'u kendi okur — yani bu çağrı **nonce 5
geçerliyken** doğru cevabı verir. Nonce değişmişse iki kaynak ayrışır, ki bu
da başlı başına bir uyarıdır.

### BEKLENEN DIGEST

```
0xed8dbe64719ce54ca447fcc2e92a60934ca3110a4e9a6a2a42c55b01c6bdf066
```

| | |
|---|---|
| elle `cast` ile hesaplanan | `0xed8dbe64719ce54ca447fcc2e92a60934ca3110a4e9a6a2a42c55b01c6bdf066` |
| kontratın `_computeDigest`'i | `0xed8dbe64719ce54ca447fcc2e92a60934ca3110a4e9a6a2a42c55b01c6bdf066` |
| **iki kaynak eşleşti mi** | **EVET** ✓ |
| hesaplandığı an | blok **11773986** · **2026-09-24 19:00:39 UTC** |

**Kayıt sırasında ekranda `digest` alanında bu değer görünmeli.** Farklıysa
**DUR** — ya nonce değişmiştir ya alanlar yanlış girilmiştir.

---

## 6. ÖN KAYIT ANI — ÖLÇÜM

`cast` ile okundu. İki okuma var; ilki dosya ilk yazılırken, ikincisi alıcı ve
digest eklenirken. **Defter kuralı: ilki silinmedi.**

### 1. okuma — dosya ilk yazılırken

| | |
|---|---|
| okuma anı | blok **11773759** · **2026-09-24 18:15:24 UTC** |
| PQWallet `nonce()` | **5** |
| PQWallet bakiyesi | **50600000000000000** wei |
| Ödeyen EOA bakiyesi | **47456582931955569** wei |
| `cast code <ödeyen EOA>` | **`0x`** |

### 2. okuma — alıcı ve digest eklenirken

| | |
|---|---|
| okuma anı | blok **11773986** · **2026-09-24 19:00:39 UTC** |
| PQWallet `nonce()` | **5** |
| PQWallet bakiyesi | **50600000000000000** wei · 0,0506 ETH |
| Alıcı bakiyesi | **47135340130807312** wei · 0,047135340130807312 ETH |
| Ödeyen EOA bakiyesi | **47456582931955569** wei · 0,047456582931955569 ETH |
| `cast code <ödeyen EOA>` | **`0x`** — delegasyon yok |
| uç | `ethereum-sepolia-rpc.publicnode.com` |

227 blok geçti, PQWallet'ın iki değeri de **değişmedi**.

> Kayıt günü ile bu okuma arasında blok geçmişse, § 4'ün beklentileri **kayıt
> anındaki** okumaya göre doğrulanır — akış kâğıdı § 2.3 o okumayı zaten
> istiyor.

---

## 7. KAYITTAN SONRA

Ölçülen değerler `docs/evidence/demo-run-sheet.md` § 5'in şablonuna yazılır,
karşılaştırma tablosu (§ 5.3) bu dosyaya karşı doldurulur.

**Commit sırası (kural):**

1. Bu dosya **commit + PUSH** edilir
2. Commit saati not edilir
3. Kayıt alınır
4. Ölçüm sonuçları ayrı commit'le yazılır
5. Commit saati ile blok saati karşılaştırılır — commit **önde** olmalı

---

## DURUM — kayıttan önce kapatılacak

- [x] Alıcı belirlendi: `0x7268a7c3d52baa50486930e6ed25d29804d075b6`
- [x] Alıcı dört kontrolden geçti (§ 1)
- [x] Beklenen digest hesaplandı ve kontratın `_computeDigest`'iyle eşleşti (§ 5)
- [x] `demo-run-sheet.md` § 1 ile bu dosyanın § 1'i birebir aynı
- [ ] **Bu dosya commit + PUSH edildi** ← tek kalan
