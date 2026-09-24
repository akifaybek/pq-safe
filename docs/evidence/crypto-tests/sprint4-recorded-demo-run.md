# Kayıtlı demo koşusu — nonce 5, ön kayıtlı beklenti BİREBİR tuttu

**Tarih:** 24 Eylül 2026
**Yazan:** Akif
**Ağ:** Sepolia (chainId `11155111`)
**Ön kayıt:** `docs/evidence/demo-nonce5-prerecord.md`, commit `aca6578`
**Akış kâğıdı:** `docs/evidence/demo-run-sheet.md`, uygulandı

> **Kayıt alındı:** kesintisiz tek çekim, kesme yok
> (`specs/2026-09-14-sprint4-scope-design.md:348,355-357`).
> Sprint 4'ün K2 kalemi — *"kayıtlı demo koşusu yapılmadı, nonce 5 ile
> çekilecek"* (`sprint4-gas-table-and-second-tx.md:1339`) — **KAPANDI.**

---

## 1. Bu belge ne kanıtlıyor

| | |
|---|---|
| **Kanıtlıyor** | PQWallet'ın üçüncü uçtan uca koşusu; **ön kayıtlı `gasUsed` beklentisinin sıfır farkla tutması**; Task 7'nin **B satırının artık ÖLÇÜM olması**; dört DURUM etiketinden ikisinin ekranda ilk kez görülmesi |
| **Kanıtlamıyor** | `DURUM: ZİNCİRDE REVERT` ve `DURUM: SONUÇ ALINAMADI` (§ 6); ham tahmin yolundaki 1 gas'lık sapmanın sebebi (§ 4.1); trace hâlâ alınmadı |

---

## 2. TX — ÖLÇÜM

| | |
|---|---|
| hash | `0x6b8bbecd0bc7fefc36ed5120d09410af7aff970950599652510828c28cd312ff` |
| blok | **11774374** · **2026-09-24 20:18:12 UTC** |
| `status` | **1 (success)** |
| **`gasUsed`** | **218.721** |
| zincirdeki tx gaz limiti | **221.624** |
| UI'da görünen limit | **265.948** |
| tx tipi | **2** (`0x2`) |
| tx `to` | `0x2EafA294C14b6752128bfd4f5873D1EA39f000BB` = PQWallet |
| `from` | `0xe0BF2D190f8e2F2fc97cF19244845F8FeBDB7351` |
| `authorizationList` | **YOK** |
| `effectiveGasPrice` | `2528369406` wei |
| EOA tx nonce | 10 |
| selector | `0xda0980c7` = `execute(address,uint256,bytes,bytes)` |

### `execute()` parametreleri

| | |
|---|---|
| `to` | `0x7268a7c3d52baa50486930e6ed25d29804d075b6` (Hakan EOA) |
| `value` | `100000000000000` (0,0001 ETH) |
| `data` | `0x` |
| PQWallet `nonce` | **5** |

### Calldata — zincirden sayıldı

| | |
|---|---|
| `n` (bayt) | **3908** |
| `z` (sıfır bayt) | **210** |
| sıfır-dışı | **3698** |
| `intrinsic = 21000 + 4z + 16·nz` | **81.008** |
| **yürütme = gasUsed − intrinsic** | **137.713** |

---

## 3. ÖN KAYITLI BEKLENTİ — BİREBİR TUTTU

### Sıra: beklenti ölçümden ÖNCE yazıldı, marjıyla

```
ön kayıt commit'i (aca6578) : 2026-09-24 19:04:26 UTC
tx'in kazıldığı blok        : 2026-09-24 20:18:12 UTC
                              commit 4.426 saniye (≈73 dakika) ÖNDE
```

§13'ün aynı ölçümünde marj 46 saniyeydi (`sprint4-gas-table-and-second-tx.md:1249-1265`);
bu koşuda marj çok daha geniş. **Aynı şerh geçerli:** blok zamanı tx'in
*kazıldığı* andır, Confirm'e *basıldığı* an değil; o an hiçbir yerde kayıtlı
değil. Kanıtlanabilir olan tek şey commit'in bloktan 73 dakika önce olduğudur.

### Karşılaştırma — hepsi ÖLÇÜM

| kalem | ön kayıt | ölçülen | |
|---|---|---|---|
| **beklenen digest** | `0xed8dbe64…c6bdf066` | § 5 | ✓ |
| `nonce()` | 5 → **6** | **6** | ✓ |
| PQWallet bakiyesi | `50600000000000000` → `50500000000000000` | **`50500000000000000`** | ✓ |
| alıcı bakiyesi | `47135340130807312` → `47235340130807312` | **`47235340130807312`** | ✓ |
| `receipt.status` | 1 | **1** | ✓ |
| tx tipi | `0x2` | **2** | ✓ |
| tx `to` | PQWallet | **PQWallet** | ✓ |
| `authorizationList` | YOK | **yok** | ✓ |
| `n` | 3908 | **3908** | ✓ |
| `cast code <ödeyen EOA>` | `0x` | **`0x`** | ✓ |
| **`gasUsed`** | **218.721** (z=210 ile) | **218.721** | **✓ fark 0** |

**Alıcının MUTLAK bakiyesi de tuttu.** Ön kayıt § 4'te *"alıcının bakiyesi
üçüncü taraf etkisine açık… tutması gereken şey farktır"* diye şerh
düşülmüştü; o risk gerçekleşmedi, araya işlem girmedi.

### Gas ödemesi EOA'dan — ÖLÇÜM

```
ücret = gasUsed × effectiveGasPrice = 218.721 × 2.528.369.406
      = 553.007.484.849.726 wei = 0,000553007 ETH

EOA: 47456582931955569 − 553007484849726 = 46903575447105843
ölçülen EOA bakiyesi                     = 46903575447105843   ✓
```

PQWallet'ın bakiye düşüşü **tam olarak `value` kadar**; gas'a tek wei gitmedi.
MetaMask onay ekranında §12'de 0,0005 SepoliaETH görülmüştü (korumasız yol) —
gerçekleşen 0,000553 ETH, o gözlemle tutarlı.

---

## 4. GAS MODELİ — ön kayıtlı formül sıfır farkla tuttu

Ön kayıt (§ 3) şunu yazmıştı: taban `218.781` (B satırının ters çözümü,
`z` = 205), düzeltme `± 12·(z_ölçülen − 205)`.

```
z (zincirden sayıldı)  = 210
düzeltme               = 12 × (210 − 205) = 60 gas
beklenti               = 218.781 − 60 = 218.721
ÖLÇÜLEN gasUsed        = 218.721
FARK                   = 0
```

**Adres seçiminin kazandırdığı.** Alıcı, B satırının tahminlerini üreten
adresin ta kendisi seçildi (`0x7268a7c3…`), böylece adres kaynaklı `z` farkı
ortadan kalktı ve geriye tek değişken olarak nonce (2 → 5) kaldı. Ön kayıt
§ 3'te bu açıkça yazılıydı; başka bir adres seçilseydi karşılaştırma
yapılmayacaktı.

### 4.1 AÇIK KALEM — ham tahmin yolunda 1 gas

Ters çözüm yolu tam tuttu. **Ham tahmin yolu 1 gas şaştı:**

```
ham tahmin (B, z=205) = 221.685
z düzeltmesi          = −60
beklenti              = 221.625
zincirdeki gaz limiti = 221.624
FARK                  = −1
```

**Sebep ÖLÇÜLMEDİ, atanmıyor.** Tamsayı bölmesi yuvarlaması olabilir ama bu
bir hipotezdir; ayırt edecek deney yapılmadı. **Kalem açık yazılır.**

### 4.2 Afin model de tuttu

`sprint4-gas-table-and-second-tx.md:733`'teki `Δ ≈ U/126 + 1168`:

```
U = 218.721  →  formül: 218721/126 + 1168 = 2.903,88
gerçek Δ = 221.624 − 218.721 = 2.903
kalan = −0,88
```

Kalan negatif ve 1'den küçük — tamsayı bölmesinin aşağı yuvarlamasıyla
uyumlu, dosyadaki dört satırın deseniyle aynı.

---

## 5. DIGEST — zincir üzerinden doğrulandı

Ön kayıt, imzalamadan önce iki bağımsız kaynakla şunu sabitlemişti:

```
0xed8dbe64719ce54ca447fcc2e92a60934ca3110a4e9a6a2a42c55b01c6bdf066
  elle cast (dondurulmuş formül)  = kontratın _computeDigest'i
```

### EKRANDA GÖZLENDİ — ÖLÇÜM

Kayıttan alınan kare (`screenshots/sprint4-demo-digest.png`), imzalama ile
gönderim arasındaki an:

| ekranda | değer |
|---|---|
| `DOMAIN_SEPARATOR` | `0xa6238098b5d49d6e94eb134fa1e5ce7f888c5a9f870626079776fb42874c228b` |
| **`digest`** | **`0xed8dbe64719ce54ca447fcc2e92a60934ca3110a4e9a6a2a42c55b01c6bdf066`** |
| `value geri okuma` | `100.000.000.000.000 wei = 0,0001 ETH` |
| `İmza` | 3688 bayt |

**Üçü de ön kayıtla birebir aynı.** Digest artık çıkarım değil, doğrudan
gözlem: kayıttaki karede ön kayıtlı değerin kendisi duruyor.

> Bu kare son ekran görüntüsünde **yok**, çünkü gönderim başarılı olunca
> `#tx-out` bloğu *"İmza bu işlemde kullanıldı"* ile değiştirildi
> (`main.js:771` — Sprint 4'ün ekran tutarlılığı düzeltmesi). Kareyi videodan
> almak gerekti; bu, düzeltmenin sahnede çalıştığının da yan kanıtı.

**Zincir üzerinden ikinci, bağımsız doğrulama:**

1. **ÖLÇÜM:** tx'ten önce `_computeDigest(to, value, data)` nonce 5
   geçerliyken `0xed8dbe64…c6bdf066` döndürdü.
2. **ÖLÇÜM:** tx `status = 1` ile geçti; yani `execute()` içindeki
   `verify()` true döndü ve kontrat digest'i **kendi** hesaplayıp kullandı
   (MEVCUT on-chain nonce'la).

Yani aynı sayı **üç bağımsız yoldan** geldi: elle `cast` (dondurulmuş formül),
kontratın `_computeDigest`'i, ve tarayıcının kendi hesabı — üçü de ölçümden
önce ya da ölçüm anında.

---

## 6. DURUM ETİKETLERİ — ilk kez ekranda

Dördü de bugüne kadar kodda vardı ama **ekranda hiç görülmemişti**
(`sprint4-number-format-and-status-labels.md` § 5).

| etiket | kod | bu koşuda | dayanak |
|---|---|---|---|
| `DURUM: KONTROL` | `main.js:645,683` | **GÖZLENMEDİ** | bir saniyeden kısa, yakalanmadı |
| `DURUM: MetaMask ONAYI BEKLENİYOR` | `:719` | **GÖZLENDİ (operatör raporu)** | bu koşuda ekran görüntüsü alınmadı; aynı etiket 24 Eylül REDDET koşusunda **ekran görüntüsüyle** doğrulanmıştı |
| `DURUM: ZİNCİRDE BEKLENİYOR` | `:736` | **GÖZLENDİ (operatör raporu)** | akış sırasında görüldüğü bildirildi; kare saklanmadı. Üzerine ONAYLANDI yazıldığı için son ekranda yok — videodan alınabilir |
| **`DURUM: ONAYLANDI`** | `:762` | **GÖZLENDİ — ekran görüntüsü var** | `İşlem zincire gönderildi ve onaylandı.` + hash + Etherscan + `218.721 gas kullanıldı (limit: 265.948 gas)` + blok 11774374 |
| `DURUM: ZİNCİRDE REVERT` | `:778` | **GÖRÜLMEDİ** | beklenen — tx revert etmedi |
| `DURUM: SONUÇ ALINAMADI (tx gönderildi)` | `:880` | **GÖRÜLMEDİ** | beklenen — yayın sonrası hata olmadı |

Son ikisinin görünmemesi **doğru sonuçtur**, eksiklik değil. İkisi de hâlâ
yalnız kodda; davranışları ölçülmedi.

> **Kanıt gücü ayrımı.** Bu koşuda **ekran görüntüsüyle** belgelenen tek
> DURUM etiketi `ONAYLANDI`'dır. `MetaMask ONAYI BEKLENİYOR` ve
> `ZİNCİRDE BEKLENİYOR` **operatör raporudur** — akış sırasında görüldüğü
> bildirildi, kare saklanmadı. İkisi de videoda olmalı; video izlenip
> teyit edilirse bu satırlar tarihli ekle güçlendirilir.

### Yan gözlemler — ekran görüntülerinden

- **Sayı biçimi sahnede okundu:** `50.500.000.000.000.000 wei = 0,0505 ETH`,
  `218.721 gas kullanıldı (limit: 265.948 gas)`.
- **Keygen kilidi çalıştı:** owner anahtarı içe aktarıldıktan sonra
  `Yeni anahtar çifti üret` düğmesi gri.
- **Mnemonic ekranda yok:** yalnız `publicKey` ve ECDSA adresi; parola alanı
  temizlenmiş, yer tutucu metni görünüyor. *(Görsel kontrol — betikli kanarya
  bu koşuda koşulmadı.)*
- **Bölüm 2 dokunulmadı:** Sprint 1 artefaktı, `0xdeadbeef…` yer tutucusuyla
  kaldı. Demo akışının parçası değil.
- **`txOut` tüketimi söyledi:** *"İmza bu işlemde kullanıldı — yeni işlem için
  yeniden imzalayın."* Sprint 4'ün ekran tutarlılığı düzeltmesi sahnede
  çalıştı.

---

## 7. YAN BULGU DÖRDÜNCÜ KEZ — ve bu sefer daha keskin

*"Bizim `gasLimit`'imiz zincire ulaşmıyor"* hükmü
(`sprint4-gas-table-and-second-tx.md:1396-1399`) dördüncü koşuda da geçerli:

| koşu | gönderdiğimiz | zincirdeki |
|---|---|---|
| nonce 2 | 263.026 | 355.384 |
| nonce 3 | 263.026 | 355.372 |
| nonce 4 | 262.983 | 219.153 |
| **nonce 5** | **265.948** | **221.624** |

**Bu koşu bir adım ileri gidiyor — ÖLÇÜM:**

```
UI limit 265.948 = floor(estimated × 12 / 10)
ters çözüm TEK   → estimated = 221.624
zincirdeki limit = 221.624        AYNI SAYI
```

§13'te *"219.153 MetaMask'in ham tahminidir"* bir **ÇIKARIM** olarak
etiketlenmişti, çünkü MetaMask'e ne sorulduğu kaydedilmemişti. Burada
**bizim kendi kodumuzun** aldığı ham tahmin, UI'nın gösterdiği paylı limitten
tekil olarak geri çözülüyor ve zincirdeki limitle **eşit** çıkıyor.

> **Sınırı yazılıyor.** Bu, "MetaMask bizim limitimizi atıp kendi ham
> tahminini yazdı" cümlesini destekler ama **tek başına kanıtlamaz**: aynı
> sayıyı üreten başka bir yol (MetaMask'in kendi bağımsız tahmininin bizimkiyle
> çakışması) bu koşuda **elenmedi**. Elenmesi için MetaMask'e giden isteğin
> kaydedilmesi gerekir; yapılmadı.
>
> Yine de §13'ten güçlü: orada karşılaştırılan iki sayıdan biri türetilmişti,
> burada ikisi de bizim tarafımızdan ölçülüyor.

`sendTransaction.js:202`'deki %20 payı MetaMask imzalayıcıyken **pratikte ölü**
kalmaya devam ediyor. Bu koşuda sorun çıkarmadı: `218.721 < 221.624`.

---

## 8. ZİNCİR OKUMALARI

### Tx öncesi — ön kayıttan

| | |
|---|---|
| blok **11773986** · 2026-09-24 19:00:39 UTC | `nonce()` **5** · PQWallet `50600000000000000` · alıcı `47135340130807312` · EOA `47456582931955569` |

### Tx sonrası — **etiket: tx'ten SONRA okundu**

| | ölçülen |
|---|---|
| okuma anı | blok **11774386** · **2026-09-24 20:20:37 UTC** |
| PQWallet `nonce()` | **6** |
| PQWallet bakiyesi | **50500000000000000** wei · 0,0505 ETH |
| alıcı bakiyesi | **47235340130807312** wei |
| ödeyen EOA bakiyesi | **46903575447105843** wei |
| `cast code <ödeyen EOA>` | **`0x`** — delegasyon kurulmadı |
| uç | `ethereum-sepolia-rpc.publicnode.com` |

> **ŞERH.** Okuma tx'in bloğundan (11774374) **12 blok sonra** alındı. Bu
> aralıkta PQWallet'a başka bir işlem gitmediği **doğrudan ölçülmedi** — blok
> aralığı taranmadı, bu bir **ÇIKARIM**dır. Çıkarımı güçlü kılan, üç değerin
> (nonce, cüzdan bakiyesi, alıcı bakiyesi) **birlikte** beklenen noktada
> olması: araya giren bir işlem üçünü birden beklenen değerde bırakmak
> zorunda kalırdı. §13'ün 175 bloğuna kıyasla aralık çok dar.

---

## 9. VİDEO KANITI

| | |
|---|---|
| dosya | `24 eylül kayıt.mov` (Masaüstü) |
| boyut | **92.607.899** bayt |
| **SHA-256** | **`c5471c980811ea27b017cc9247e99459c669098fb2e408e00b337f6c031a2f90`** |
| tek çekim, kesme yok | **evet** (operatör raporu) |

> **Dosya adı depoya girmiyor**, kaydın kimliği yukarıdaki SHA-256'dır —
> `sprint3-end-to-end-transaction.md:318`'deki desenle aynı (93 MB'lık ikili
> depoyu kalıcı şişirirdi).

**Kayıt anındaki kaynak md5'leri** (`scope-design.md:330-334` — kayıttan sonra
bu dosyalar değişirse **video yeniden çekilir**):

| dosya | md5 |
|---|---|
| `index.html` | `3b701338fe6107e0a241501ab261da73` |
| `src/main.js` | `2115125f1e366b3ca8cb224e883242b3` |
| `src/tx/sendTransaction.js` | `250014298ea216e667344eca24c16984` |
| `src/crypto/digest.js` | `fd93a71edd1f27b664414195c0cbaf3f` |
| `src/tx/buildTransaction.js` | `c4a061dedc27b7339738d2bc42eb3038` |

**KAYITTAKİ UI = COMMIT'LENMİŞ UI — ÖLÇÜM.** Kayıt sırasında ve bu hash'ler
alınırken `git status --short frontend/` **boştu**, yani beş dosyanın beşi de
`HEAD`'in (`aca6578`, 2026-09-24 22:04:26 +03:00) hâliydi. Kamera ile depo
arasında fark yok.

Sprint 3'ün eski kaydı (`sprint3-end-to-end-recording.mp4`, SHA-256
`f7be0790…abe1b`) **silinmedi**, yedek olarak duruyor.

### Ekran görüntüleri

Üçü de `docs/evidence/screenshots/` altında:

| kare | dosya | içerik |
|---|---|---|
| Bölüm 1-3 | `sprint4-demo-sections-1-3.png` | `✓ Zincirdeki ownerPublicKey ile AYNI` · `Yeni anahtar çifti üret` **gri** (keygen kilidi) · mnemonic alanı **boş**, yalnız yer tutucu · Chain ID 11155111, blok 11774366 |
| `DURUM: ONAYLANDI` | `sprint4-demo-onaylandi.png` | Bölüm 4'ün tamamı: nonce **6** · `50.500.000.000.000.000 wei = 0,0505 ETH` · `to`/`value`/`data` · `DURUM: ONAYLANDI` · hash · Etherscan · `218.721 gas kullanıldı (limit: 265.948 gas)` · blok 11774374 |
| **digest karesi** (videodan) | `sprint4-demo-digest.png` | `DOMAIN_SEPARATOR 0xa6238098…4c228b` · **`digest 0xed8dbe64…c6bdf066`** · `value geri okuma 100.000.000.000.000 wei = 0,0001 ETH` |
| Etherscan `Success` | — | alınmadı (§ 10) |

**`ONAYLANDI` karesinin ek gösterdiği:** `Zincire gönder` ve `Bozuk imzayla
dene` düğmeleri **gri**. İmza tüketildiği için (`signed = null`,
`main.js:765`) `syncSendButtons()` ikisini de kapattı — tüketilmiş bir imzayla
ikinci tx gönderilemeyeceğinin sahnedeki kanıtı.

---

## 10. AÇIK KALEMLER

1. **Ham tahmin yolundaki −1 gas** (§ 4.1). Sebep ölçülmedi.
2. ~~Kayıttaki digest karesi teyit edilmedi~~ — **KAPANDI**, videodan kare
   alındı ve ön kayıtla birebir çıktı (§ 5).
3. **`DURUM: ZİNCİRDE BEKLENİYOR` karesi teyit edilmedi** (§ 6). Akış sırasında
   görüldüğü raporlandı, kare saklanmadı. Videoda olmalı; istenirse
   digest karesi gibi çıkarılabilir.
4. **Etherscan ekran görüntüsü** bu belge yazılırken elde yok.
5. **Betikli mnemonic kanaryası** bu koşuda koşulmadı; § 6'daki kontrol
   görseldir.
6. **Trace hâlâ alınmadı.** `gasUsed`'ın tamamı PQWallet'ın kendi çağrısıdır
   (temiz tx) ama `138.097` ile karşılaştırma **yine yapılmadı** — o sayı
   A satırının yürütme bileşeniydi; bu koşunun yürütmesi **137.713**.
   İkisi farklı satırlara ait, doğrudan karşılaştırılamaz.
7. **"Added protection" ile Smart account şalteri** hâlâ ayrılmadı (§12'den
   devreden kalem).

---

## 11. BU KOŞUNUN AÇTIĞI KALEM — Task 7 tablosu

**B satırı artık ÖLÇÜM.** Bugüne kadar B ve C, `est()`'in ters çözümünden
geliyordu (`sprint4-gas-table-and-second-tx.md:721-722`) ve zincirde ölçülmüş
tek satır A'ydı (216.269).

| satır | alıcı durumu | değer | kaynak |
|---|---|---|---|
| **B** | soğuk + var olan | **218.721** | **ÖLÇÜM** — bu koşu |
| A | sıcak + var olan | 216.269 | ÖLÇÜM — §13 |
| C | soğuk + boş | 243.769 | **ÇIKARIM** — ters çözüm |
| — | İLK tx, nonce 0→1 | 233.429 | ÖLÇÜM — Hakan, 7 Eylül |

Manşet satır B'ydi ve artık ölçülmüş durumda; **"manşet bir ÇIKARIM olur"
sorusu kapandı.** Dört satırlık tablonun yazılması ayrı bir kalem
(`plans/2026-09-14-sprint4-demo-measurement-report.md:1085`, Adım 3 hâlâ
`- [ ]`). C hâlâ ters çözümden geliyor ve öyle etiketlenmeli.

> **B ile A doğrudan karşılaştırılabilir mi — dikkat.** İkisinin `z`'si farklı
> (210 ve 206) ve nonce'ları farklı. Ham fark `218.721 − 216.269 = 2.452`;
> `z` düzeltmesi uygulanmadan EIP-2929'un +2.500'üyle karşılaştırılamaz. Bu
> uzlaştırma **bu belgede yapılmadı**, dört satırlık tablo yazılırken
> yapılacak.

---

## TARİHLİ EK — 24 Eylül 2026, manşetin sırası doğrulandı

Defter kuralı gereği yukarısı **silinmedi**; bu ek, § 3'teki *"ön kayıtlı
beklenti birebir tuttu"* manşetinin dayandığı **sıra iddiasını** bağımsız
kaynaklarla sabitliyor.

### Neden gerekti

Manşet, düzeltme formülünün (`218.781 − 12·(z − 205)`) tx'ten **önce**
yazılmış olmasına dayanıyor. Yukarıda bu, **commit tarihiyle** (19:04:26 UTC)
gösterilmişti. Commit tarihi **istemci tarafından üretilir** ve geriye
alınabilir; tek başına sıra kanıtı değildir. Bu ek iki eksiği kapatıyor:
formülün gerçekten o commit'te olduğu, ve **push**'un tx'ten önce olduğu.

### 1. Formülün üç bileşeni de `aca6578`'de — ÖLÇÜM

`git show aca6578:docs/evidence/demo-nonce5-prerecord.md`, birebir alıntı:

```
136: | `z` (sıfır bayt) | **205** | **ölçülecek** | — |

146: Digest nonce'a bağlı → imza gövdesi değişiyor → calldata'nın sıfır bayt
147: sayısı `z` değişiyor. Düzeltme katsayısı zincirde iki gerçek tx ile ölçüldü:
148: her ek sıfır bayt **−12 gas**. Nonce 4 koşusunda `z` = 206 çıkmıştı, A'nın
149: tabanı 203'tü; üç baytlık fark −36 gas etti (`:1295-1296`).

164: | `gasUsed` — ham tahmin yolu | **221.685** | `z` = 205 çıkarsa |
165: | `gasUsed` — ters çözüm yolu | **218.781** | aynı |
166: | düzeltme | `± 12 · (z_ölçülen − 205)` | `z` zincirden sayılacak |
```

Üçü de mevcut: taban değer **218.781** (satır 165), taban **`z` = 205**
(136 · 164 · 166), **−12 gas/sıfır bayt** katsayısı (148 · 166).

Commit: `aca6578` ·
<https://github.com/akifaybek/pq-safe/commit/aca6578>

### 2. PUSH zamanı — sunucu tarafı damga, ÖLÇÜM

`gh` bu makinede kurulu değil; GitHub'ın **genel** REST API'si kullanıldı
(salt-okuma, kimlik doğrulamasız).

**Olay akışı YETMEDİ — yazılıyor:** `GET /repos/akifaybek/pq-safe/events`
en yeni `PushEvent` olarak `2026-09-23T21:29:26Z` (`78effa6`) döndürdü;
24 Eylül push'ları akışta **yok**. Bu uç bu koşuda kullanılamadı.

**Depo nesnesi verdi:**

```
GET https://api.github.com/repos/akifaybek/pq-safe
  private   : false
  pushed_at : 2026-09-24T19:04:43Z
  updated_at: 2026-09-24T19:04:47Z

GET https://api.github.com/repos/akifaybek/pq-safe/commits/main
  sha : aca6578
```

`pushed_at`, GitHub'ın **kendi sunucusunda** tuttuğu son push zamanıdır ve
o an `main`'in ucu `aca6578`'di — yani bu değer ön kaydın push'unu gösteriyor.

| kaynak | zaman | niteliği |
|---|---|---|
| **GitHub `pushed_at`** | **2026-09-24 19:04:43 UTC** | **sunucu tarafı, istemciden bağımsız** |
| yerel `git reflog origin/main` | 2026-09-24 19:04:44 UTC | yerel saat, push anında yazıldı |
| commit tarihi | 2026-09-24 19:04:26 UTC | istemci tarafı, en zayıf |
| **tx bloğu 11774374** | **2026-09-24 20:18:12 UTC** | zincir |

```
MARJ = 20:18:12 − 19:04:43 = 4.409 saniye = 73 dakika 29 saniye
       push, tx'ten ÖNCE
```

İki bağımsız saat — bu makine ve GitHub sunucusu — **1 saniye** içinde
uyuşuyor.

### 3. HÜKÜM: manşet KALIR

Üç bileşen de ön kayıtta, push tx'ten 73 dakika önce. *"Ön kayıtlı `gasUsed`
beklentisi sıfır farkla tuttu"* ifadesi ayakta; § 3 ve § 4 değişmiyor.

### 4. ŞERH — bu ölçüm YENİDEN ÜRETİLEMEZ

`pushed_at` **son** push'u gösteren bir alandır. Bir sonraki push'la bu değer
kayacak ve `aca6578`'in push zamanı bu uçtan **bir daha okunamayacak**.
Yukarıdaki ham cevap bu yüzden buraya yazıldı — kanıt kalıcı olsun diye.

Kalıcı ve daha güçlü bir kayıt isteniyorsa `gh` kurulup
`GET /repos/{owner}/{repo}/activity` (kimlik doğrulamalı, push başına ayrı
kayıt tutar) okunabilir. **Yapılmadı.**

### 5. Ayrıca sabitlenen — formülün bileşenleri daha da eskide

**ÖLÇÜM** — `git show 78effa6:docs/evidence/crypto-tests/sprint4-gas-table-and-second-tx.md`:

| bileşen | `78effa6`'daki satır |
|---|---|
| `218.781` | `721`: `\| B \| 221.685 \| **218.781** \| 1 \|` |
| B'nin `z` = 205 | `279`: `\| B (soğuk, dolu) \| 221.685 \| 3908 \| 205 \| 3703 \| 81.068 \| **140.617** \|` |
| −12 gas/sıfır bayt | `1122`: *"ÖLÇÜM — 12 gas/sıfır bayt, iki gerçek tx ile"* · `1131`: *"Bir fazla sıfır bayt → tam **12 gas** daha az"* |

Üçü de `78effa6`'da yazılıydı ve o commit **`2026-09-23T21:29:26Z`**'de push
edildi — bu kez GitHub olay akışında **`PushEvent` olarak kayıtlı**, yani
`pushed_at` alanına bağlı olmadan, kalıcı biçimde doğrulanabilir.

Yani formülün hammaddesi tx'ten **~23 saat** önce herkese açıktı. `aca6578`
onları nonce 5 için bir beklentiye dönüştürdü; o adım da 73 dakika önde.
