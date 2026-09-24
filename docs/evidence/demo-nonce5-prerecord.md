# ÖN KAYIT — nonce 5, kayıtlı demo koşusu

**Yazıldı:** 24 Eylül 2026 · **Yazan:** Akif
**Durum:** `<ALICI>` bekleniyor · **digest hesaplanmadı**

> **Bu dosya ölçümden ÖNCE yazıldı ve kayıttan ÖNCE commit + push edilecek.**
> Değeri tam olarak bundan geliyor: beklentinin geriye dönük ayarlanmadığı
> ancak commit zamanı ile blok zamanı karşılaştırılarak gösterilebilir
> (§13'ün 46 saniyelik marj deseni — `crypto-tests/sprint4-gas-table-and-second-tx.md:1249-1265`).
>
> **Ön kayıt tamamlanmadan kayda başlanmaz.** Eksik olan tek şey `<ALICI>`
> ve ondan türeyen digest.

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
| `execute()` `to` | **`<ALICI>`** — KARAR: Akif |
| `execute()` `value` | `100000000000000` (0,0001 ETH) |
| `execute()` `data` | `0x` |
| `nonce` | **5** |
| chainId | `11155111` |

### `<ALICI>` hangi şartları sağlamalı

Demo tx'i **Task 7'nin B satırı** olacak. B'nin tanımı (§ 2) gereği alıcı:

- [ ] **bakiye > 0** — "var olan / dolu" olması için
- [ ] **kod yok** (`cast code` = `0x`) — EOA olmalı, kontrat değil
- [ ] **gas'ı ödeyen hesap DEĞİL** (`0xe0BF2D190f8e2F2fc97cF19244845F8FeBDB7351`)
      — o adres tx boyunca sıcak, "soğuk" şartını bozar
- [ ] **PQWallet DEĞİL** (`0x2EafA294…f000BB`) — çağrılan kontrat da sıcak

### Kayıt günü koşulacak kontrol komutları

```bash
RPC=https://ethereum-sepolia-rpc.publicnode.com
ALICI=<ALICI>

# 1) Bakiye > 0 olmalı  ("var olan / dolu")
cast balance $ALICI --rpc-url $RPC

# 2) Kod YOK olmalı — çıktı tam olarak 0x  (EOA, kontrat değil)
cast code $ALICI --rpc-url $RPC

# 3) Nonce'u da bak: > 0 ise hesabın var olduğunun ikinci bağımsız işareti
cast nonce $ALICI --rpc-url $RPC

# 4) Ödeyen hesap ve PQWallet ile AYNI OLMAMALI — gözle karşılaştır
echo "alici  : $ALICI"
echo "odeyen : 0xe0BF2D190f8e2F2fc97cF19244845F8FeBDB7351"
echo "PQWallet: 0x2EafA294C14b6752128bfd4f5873D1EA39f000BB"
```

| kontrol | beklenen | ölçülen (doldur) |
|---|---|---|
| `cast balance <ALICI>` | **> 0** | ............................ |
| `cast code <ALICI>` | **`0x`** | ............................ |
| `cast nonce <ALICI>` | (bilgi) | ............................ |
| ödeyen hesaptan farklı | ✓ | ☐ |
| PQWallet'tan farklı | ✓ | ☐ |

> **Aday (KARAR: Akif'e bırakıldı, dayatılmıyor):** Hakan'ın EOA'sı
> `0x7268a7c3d52baa50486930e6ed25d29804d075b6`. Task 7'nin B satırının
> tahminleri **tam olarak bu adresle** üretildi (§ 3), dolayısıyla tahmin ile
> ölçümün aynı calldata üzerinde karşılaştırılmasını sağlayan tek seçenek
> budur. Başka bir adres seçilirse § 3'teki sapma uyarısı geçerli olur.

---

## 2. B'NİN TANIMI — ÖLÇÜM

| kaynak | satır | tanım |
|---|---|---|
| `specs/2026-09-14-sprint4-scope-design.md` | **425** | `\| **B** \| soğuk + var olan \| ≈ 218.700 \| **HİPOTEZ** — ölçülecek (+2.500, EIP-2929) \|` |
| `plans/2026-09-14-sprint4-demo-measurement-report.md` | **1091** | `\| **B** \| soğuk + var olan \| *(ölçülen)* \| **MANŞET SAYI** — tipik kullanıcı işlemi \|` |
| `crypto-tests/sprint4-gas-table-and-second-tx.md` | **193** | `\| B \| var olan başka adres \| 0x7268a7c3… \| soğuk, dolu (Hakan EOA) \|` |
| aynı dosya | **1096-1097** *(plan)* | *"Her satırın etiketi: **ALICI EOA, `data = 0x`**"* |

**ÇIKARIM — demo tx'i bu tanımı karşılıyor mu?** § 1'deki dört şart
sağlanırsa **evet**:

- *"soğuk"* = işlem başında erişim listesinde olmayan adres. Erişim listesi her
  tx'te sıfırlanır; ödeyen hesap ve çağrılan kontrat dışındaki her adres
  soğuktur. Alıcı bu ikisinden farklıysa şart sağlanır.
- *"var olan / dolu"* = EIP-161 anlamında boş olmayan hesap (nonce, bakiye ya
  da kodun en az biri sıfırdan farklı). `bakiye > 0` bunu sağlar.
- *"alıcı EOA, `data = 0x`"* = `cast code` = `0x` ve `data` alanı `0x`.

**Bu bir çıkarımdır, ölçüm değil:** "soğukluk" tx anında zincirde ölçülmedi;
erişim listesi semantiğinden türetildi. Doğrudan ölçüm, tx'in trace'inden
erişim listesini okumak olurdu — bu projede trace hiç alınmadı
(`sprint4-gas-table-and-second-tx.md:1335`).

---

## 3. GAS TAHMİNİ — TAHMİN, EŞİK YOK, SAPMA RAPORLANACAK

> ### ⚠ Bu bölüm bir BEKLENTİDİR, ölçüm değildir.
> **Eşik yok, "yaklaşık tuttu" denmeyecek.** Ölçülen `gasUsed` ne çıkarsa
> yazılır ve tahminden farkı **olduğu gibi raporlanır**. Tutmazsa hipotez
> çürümüştür ve öyle yazılır — sayı yuvarlanmaz, terim uydurulmaz
> (`plans/…-demo-measurement-report.md:1099-1103`).

### Tahminin kaynağı — ÖLÇÜM

| değer | ne | kaynak |
|---|---|---|
| **221.685** | `eth_estimateGas`'ın B satırı için döndürdüğü **ham tahmin** | `crypto-tests/sprint4-gas-table-and-second-tx.md:279` |
| **218.781** | 221.685'in `est()` üzerinden **tek ters çözümü** | aynı dosya `:721-722` |

`218.781` **zincirde ölçülmüş bir `gasUsed` değildir** — tahmin fonksiyonunun
tersidir. Zincirde `gasUsed` olarak ölçülmüş tek satır A'dır: **216.269**
(`:1296`).

### Tahminin üretildiği koşul — ÖLÇÜM

| | tahmin koşusu (20 Eylül) | demo koşusu |
|---|---|---|
| `to` | `0x7268a7c3d52baa50486930e6ed25d29804d075b6` | **`<ALICI>`** |
| `value` | `100000000000000` | `100000000000000` ✓ |
| `data` | `0x` | `0x` ✓ |
| **`nonce`** | **2** | **5** |
| `n` (calldata bayt) | 3908 | beklenen 3908 |
| `z` (sıfır bayt) | **205** | **ölçülecek** |

Kaynak: `:282-284` — *"Üç satırın da `value` = 100000000000000, `data` = `0x`,
nonce = 2"*.

### İKİ PARAMETRE FARKLI — tahminin geçerliliğine etkisi

**1. `nonce` 2 → 5.** Digest nonce'a bağlı, dolayısıyla imza gövdesi
değişiyor, dolayısıyla calldata'nın sıfır bayt sayısı `z` değişiyor.
Düzeltme formülü zincirde ölçüldü: her ek sıfır bayt **−12 gas** (`:1249`
öncesi, iki gerçek tx ile). Nonce 4 koşusunda `z` = 206 çıkmıştı, A'nın tabanı
203'tü — üç baytlık fark −36 gas etti (`:1295-1296`).
**Yön ve büyüklük bilinmiyor, yalnız mekanizma biliniyor.**

**2. `<ALICI>` adresi.** Alıcı adresi calldata'nın içinde; farklı adres farklı
sıfır bayt sayısı demek. **ÖLÇÜM:** A/B/C satırlarında `value` ve `data`
özdeşken `z` sırasıyla 203 / 205 / 206 çıktı (`:278-280`) — fark **tamamen
adres baytlarından**. Yani `<ALICI>` ≠ `0x7268a7c3…` ise 221.685 ve 218.781
**o calldata'ya ait olmaktan çıkar**.

> **HÜKÜM.** `<ALICI>` = `0x7268a7c3…` seçilirse tahminler aynı adres üzerinde
> kalır ve yalnız nonce farkı taşınır. Başka bir adres seçilirse **tahminler
> doğrudan karşılaştırılamaz**; ölçülen `gasUsed` yine yazılır, ama fark
> "model sapması" diye okunamaz — iki ayrı kaynaktan gelen fark birbirine
> karışır. Bu durumda karşılaştırma **yapılmaz** ve yapılmadığı yazılır.

### Beklenen (koşullu)

| | değer | koşul |
|---|---|---|
| `gasUsed` — ham tahmin yolu | **221.685** | `<ALICI>` = `0x7268a7c3…` ve `z` = 205 |
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
| `<ALICI>` bakiyesi | **+`100000000000000`** wei |
| `receipt.status` | **1** |
| tx tipi | **`0x2`** |
| tx `to` | **PQWallet** `0x2EafA294…f000BB` (`execute()`'un alıcısı değil) |
| `authorizationList` | **YOK** |
| `n` | **3908** |
| `cast code <ödeyen EOA>` (tx sonrası) | **`0x`** — delegasyon kurulmadı |

Gas **EOA'dan** ödenir, PQWallet'tan değil — bakiye düşüşü tam olarak `value`
kadar olmalı.

### §12'den devralınan ön koşullar (aynen geçerli)

1. Onay ekranında **"Added protection" İŞARETSİZ**
2. `Interacting with` satırı **PQWallet adresini** gösteriyor
3. "Account update" / "Smart account" / "Upgrade" ibaresi görülürse **Cancel**
4. *Account details → Smart account → Sepolia* şalteri **kapalı**

---

## 5. BEKLENEN DIGEST — `<ALICI>` gelince doldurulacak

Formül **dondurulmuş** (`CLAUDE.md`):

```
DOMAIN_SEPARATOR = keccak256(abi.encode(keccak256("PQSAFE_V1"), block.chainid, address(this)))
digest           = keccak256(abi.encode(DOMAIN_SEPARATOR, nonce, to, value, keccak256(data)))
```

### Sabitler — ÖLÇÜM (24 Eylül, `cast` ile hesaplandı)

| | |
|---|---|
| `keccak256("PQSAFE_V1")` | `0x2b5183369e211b22c659fbb16b053826a633cf1ec619ff23c7c67552f9998548` |
| **DOMAIN_SEPARATOR** | **`0xa6238098b5d49d6e94eb134fa1e5ce7f888c5a9f870626079776fb42874c228b`** |
| `keccak256(0x)` | `0xc5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470` |

DOMAIN_SEPARATOR, 24 Eylül'de tarayıcı ekranında görülen değerle **birebir
aynı** — bağımsız ikinci kaynak.

### Tarif DOĞRULANDI — uydurulmadı

Aşağıdaki komut dizisi, **nonce 4 koşusunun zincirdeki digest'ini birebir
yeniden üretti**:

```
hesaplanan : 0x8aa46c4218015c05323e2c09cd82ab191fc664d7563c7573e5c76dbacd67c76f
§13'te kayıtlı: 0x8aa46c4218015c05323e2c09cd82ab191fc664d7563c7573e5c76dbacd67c76f   ✓
```

(`crypto-tests/sprint4-gas-table-and-second-tx.md:1247`, nonce 4, `to` =
`0xe0BF2D19…B7351`, `value` = `100000000000000`, `data` = `0x`.)

### HESAPLAMA KOMUTU — `<ALICI>` yerine adresi koy

```bash
PQW=0x2EafA294C14b6752128bfd4f5873D1EA39f000BB
ALICI=<ALICI>

K=$(cast keccak "PQSAFE_V1")
DS=$(cast keccak $(cast abi-encode "f(bytes32,uint256,address)" $K 11155111 $PQW))
DATAHASH=$(cast keccak 0x)
DIGEST=$(cast keccak $(cast abi-encode "f(bytes32,uint256,address,uint256,bytes32)" \
  $DS 5 $ALICI 100000000000000 $DATAHASH))

echo "DOMAIN_SEPARATOR : $DS"    # beklenen: 0xa6238098…4c228b
echo "BEKLENEN DIGEST  : $DIGEST"
```

### İKİNCİ, BAĞIMSIZ KAYNAK — kontratın kendisine sor

```bash
RPC=https://ethereum-sepolia-rpc.publicnode.com
cast call 0x2EafA294C14b6752128bfd4f5873D1EA39f000BB \
  "_computeDigest(address,uint256,bytes)(bytes32)" \
  $ALICI 100000000000000 0x --rpc-url $RPC
```

**İmza DOĞRULANDI (ÖLÇÜM):** `PQWallet.json` ABI'sinde
`_computeDigest(address,uint256,bytes) -> (bytes32) [view]`; `readDigest()`
de bunu çağırıyor (`frontend/src/contracts/pqwallet.js:59-61`). Alt çizgi
adın parçası.

> Kontrat MEVCUT on-chain nonce'u kendi okur — yani bu çağrı **nonce 5
> geçerliyken** doğru cevabı verir. Nonce değişmişse iki kaynak ayrışır, ki
> bu da başlı başına bir uyarıdır. İki kaynak **aynı** değeri vermeli;
> vermezse **DUR**.

### BEKLENEN DIGEST

```
<ALICI> gelmeden hesaplanmadı — BOŞ BIRAKILDI.

BEKLENEN DIGEST : ................................................................

hesaplandığı an : blok ............  ·  UTC ............
ikinci kaynakla eşleşti mi: ☐
```

**Bu satır doldurulup commit + push edilmeden kayda başlanmaz.**

---

## 6. ÖN KAYIT ANI — ÖLÇÜM

`cast` ile okundu, **bu dosya yazılırken**:

| | |
|---|---|
| okuma anı | blok **11773759** · **2026-09-24 18:15:24 UTC** |
| PQWallet `nonce()` | **5** |
| PQWallet bakiyesi | **50600000000000000** wei · 0,0506 ETH |
| Ödeyen EOA bakiyesi | **47456582931955569** wei · 0,047456582931955569 ETH |
| `cast code <ödeyen EOA>` | **`0x`** — delegasyon yok |
| uç | `ethereum-sepolia-rpc.publicnode.com` |

> `<ALICI>` ve digest eklendiğinde bu bölüm **yeniden okunur** ve ikinci bir
> satır olarak eklenir — silinmez. Kayıt günü ile bu okuma arasında blok
> geçmişse, § 4'ün beklentileri kayıt anındaki okumaya göre doğrulanır.

---

## 7. KAYITTAN SONRA

Ölçülen değerler `docs/evidence/demo-run-sheet.md` § 5'in şablonuna yazılır,
karşılaştırma tablosu (§ 5.3) bu dosyaya karşı doldurulur.

**Commit sırası (kural):**

1. Bu dosya `<ALICI>` + digest ile tamamlanır → **commit + push**
2. Commit saati not edilir
3. Kayıt alınır
4. Ölçüm sonuçları ayrı commit'le yazılır
5. Commit saati ile blok saati karşılaştırılır — commit **önde** olmalı

---

## AÇIK — kayıttan önce kapatılacak

- [ ] `<ALICI>` belirlendi (KARAR: Akif)
- [ ] `<ALICI>` § 1'deki dört kontrolden geçti
- [ ] Beklenen digest hesaplandı ve ikinci kaynakla eşleşti (§ 5)
- [ ] `demo-run-sheet.md` § 1 ile bu dosyanın § 1'i birebir aynı
- [ ] Bu dosya commit + **push** edildi
