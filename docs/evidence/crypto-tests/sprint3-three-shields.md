# Kanıt — Üç kalkanlı gönderim (Task 5)

**Tarih:** 12 Eylül 2026
**Yazan:** Akif
**Kapsam:** `frontend/src/tx/sendTransaction.js` (`preflight`, `sendExecute`,
`GAS_FALLBACK`), `frontend/src/main.js` (gönderim handler'ı, `syncSendButtons`,
`refreshChainState({ quiet })`, alan doğrulama teşhisi), `frontend/index.html`
(`#chain-warn`).

**Bu görevde zincire İŞLEM ATILMADI.** Tüm zincir etkileşimi `eth_call` ve salt
okuma. Gerçek transfer Task 7'de.

**Kullanılan anahtar: RASTGELE üretilmiş.** Owner mnemonic'i bu doğrulamanın
hiçbir adımında girilmedi, okunmadı, hiçbir komuta verilmedi.

---

## 1. Neden bu kanıt notu var

"Gönderim çalışıyor" demek yetmez. Üç kalkanın her biri sessizce hiç
çalışmıyor olabilir ve akış yine de doğru görünür: imza geçerliyse tx zaten
geçer, kalkanlar hiç devreye girmez. Task 3'te yanlış-ağ dalının hiç
çalıştırılmamış olması tam olarak bu sınıftandı.

Bu yüzden **her kalkan ayrı ayrı kırmızıya boyandı** ve her seferinde MetaMask
katmanına hangi RPC çağrılarının gittiği kaydedildi.

## 2. Doğrulama düzeneği

- Vite dev sunucusu, gerçek Sepolia (`PQWallet` `0x2EafA294…f000BB`).
- Zincir okumaları (nonce, bakiye, `_computeDigest`) uygulamanın kendi
  provider'ıyla, **gerçek zincire** yapıldı. Bunlar mocklanmadı.
- Cüzdan katmanı için sahte bir EIP-1193 sağlayıcısı (`window.ethereum`)
  kuruldu. Gerekçesi: MetaMask onayı gerektiren adımlar otomatikleştirilemez
  (Task 4'te elle doğrulandı, 5/5), ama kalkanların MetaMask'e HİÇ ulaşmadığını
  kanıtlamak için cüzdan katmanına giden çağrıların kaydı gerekiyordu.
- Sahte sağlayıcı `eth_sendTransaction` ve `eth_estimateGas`'ı **varsayılan
  olarak reddediyor** — düzenek yapısal olarak tx gönderemez.
- Gördüğü her metodu kaydediyor; aşağıdaki "gönderim katmanına giden çağrılar"
  satırları bu kayıttan.
- Modül-yerel `signed` / `connected` state'ine erişmek için main.js'e **geçici**
  bir test kancası eklendi, doğrulama bitince silindi (bölüm 8).

## 3. KALKAN 1 — nonce

Bozma: imzalandıktan sonra `signed.nonce` 1 → 2 yapıldı (zincirdeki 1).

```
Gönderilemedi: nonce değişti (imzalanan: 2, zincirdeki: 1) — yeniden imzalayın
```

- Gönderim katmanına giden çağrılar: **0 (hiç)**
- `eth_sendTransaction`: ✗  `eth_estimateGas`: ✗ — MetaMask'e ulaşılmadı, gaz yok
- İmza korundu, buton yeniden açıldı
- Ekran görüntüsü: `../screenshots/sprint3-shield1-nonce.png`

## 4. KALKAN 2 — canlı digest karşılaştırması

Bozma: nonce DOĞRUYKEN `signed.fields.value` 100000000000 → 100000000001
(Task 2'deki "bozma B" tekniği).

```
Gönderilemedi: digest uyuşmuyor —
  JS:      0xb6af916cb455c1e897cef930dfcab31114a257bb37f6358a89a4ee32ca256665
  kontrat: 0xd905015120acc8871672346cbc36e4db8b0506d94098bbac1f38c5470bb101f4
  Nonce güncel olduğuna göre sebep `fields` sapmasıdır.
```

- Kalkan 1 bu senaryoda GEÇTİ (nonce doğruydu) → **kalkan 2, kalkan 1'in
  gölgesinde kalmıyor.** İkisi bağımsız olarak çalışıyor.
- Kontrat digest'i canlı `_computeDigest()` çağrısından geldi, gerçek zincirden.
- Gönderim katmanına giden çağrılar: **0**
- Ekran görüntüsü: `../screenshots/sprint3-shield2-digest.png`

## 5. KALKAN 3 — `eth_call` ön-uçuşu

State sağlam (nonce doğru, digest uyuşuyor); imza RASTGELE anahtardan.

```
Gönderilemedi: PQWallet: invalid signature
```

- Bu metin kontrattan geldi: `PQWallet.sol:44`'teki require string'i.
- Gönderim katmanına giden çağrılar: `eth_call`, `eth_chainId` — **yalnızca
  bunlar.** `eth_sendTransaction` ✗, `eth_estimateGas` ✗. Gaz harcanmadı.
- Ekran görüntüsü: `../screenshots/sprint3-shield3-preflight.png`

### Brief'teki senaryodan sapma ve gerekçesi

Plan Step 3 "value > bakiye → `PQWallet: call failed`" diyordu. Rastgele
anahtarla bu mesaj **alınamaz**: `execute()` önce imzayı doğruluyor
(`PQWallet.sol:44`), bakiye ise ancak dış çağrıda patlıyor (`:50-51`). Yani
geçersiz imzayla akış her zaman `invalid signature`'da durur.

Kanıt değeri açısından bu daha zayıf değil, farklı: ön-uçuşun kontrat
revert'ini yakalayıp okunabilir metne çevirdiğini gösteriyor — üstelik
verifier'ın gerçekten çağrıldığını da (negatif kanıtın iddiası).
`"PQWallet: call failed"` yolu **geçerli owner imzası gerektirir → Task 7'de
görülecek.**

## 6. SAPMA 1 — `receipt.status` (revert YEŞİL gösterilmiyor)

`tx.wait()`'in dönüşü "başarılı" demek değil. Her iki yol da **gerçek Sepolia
receipt'leriyle** sınandı: sahte sağlayıcı `eth_sendTransaction`'a zincirde
zaten var olan bir tx'in hash'ini döndürdü (hiçbir şey yayınlanmadı), ethers
receipt'i gerçek zincirden okudu.

| Yol | Kullanılan gerçek tx | status | Ekran |
|---|---|---|---|
| Başarılı | `0x3eb20c48…659843` (blok 11690651) | 1 | 1 yeşil, 0 kırmızı |
| Revert | `0xe6bc4e2c…a388a0` (blok 11690650) | 0 | **0 yeşil, 1 kırmızı** |

Revert yolunda ekranda görülenler:

```
İşlem zincire alındı ama REVERT ETTİ (receipt.status = 0). Harcanan gas iade EDİLMEZ.
Tx hash    0xe6bc4e2c67593cfea5a372af7e4af3b64391ad192bd336b10abca10897a388a0
Etherscan  https://sepolia.etherscan.io/tx/0xe6bc4e2c…a388a0
Gas        63730 kullanıldı (limit: 350000 — tahmin başarısız oldu, sabit limite düşüldü)
Blok       11690650
```

- **Hash ve Etherscan linki revert yolunda da gösteriliyor** — revert eden tx de
  zincire yazılmıştır ve kanıttır.
- **İmza KORUNDU, buton yeniden açıldı.** Gerekçe kontrat kaynağından
  doğrulandı: `nonce++` `execute()`'un içinde (`PQWallet.sol:48`), `verify`
  require'ından sonra ve dış çağrıdan önce. `require(success)` (`:51`) revert
  ederse tüm state değişiklikleri — `nonce++` dahil — geri alınır, dolayısıyla
  eldeki imza hâlâ geçerlidir.
- Başarılı yolda: `signed = null`, iki buton da kapandı.
- Ekran görüntüleri: `../screenshots/sprint3-receipt-status0-revert.png`,
  `../screenshots/sprint3-receipt-status1-success.png`

### ⚠️ BU DALIN AÇIK SINIRI — ne kanıtlar, ne kanıtlamaz

Status-0 dalı **PQWallet'ın KENDİ revert'iyle sınanmadı.** Kullanılan
`0xe6bc4e2c…a388a0`, Sepolia'da revert etmiş **ilgisiz** bir işlem; PQWallet ile
hiçbir bağı yok.

Bu düzenek şunu kanıtlar: *UI'ın status-0 dalı doğru render ediliyor, yeşil
yazmıyor, hash/link/gas'ı koruyor, imzayı düşürmüyor.* Ve (bölüm 9'daki oracle
testiyle birlikte) ethers'ın revert sözleşmesini sabitliyor.

Şunu kanıtlamaz: **PQWallet'ın gerçekten nasıl revert ettiğini.** `execute()`
revert ettiğinde zincirdeki nonce'un artmadığı iddiası **kaynak okumasına**
dayanıyor (`PQWallet.sol:48` — `nonce++` fonksiyonun içinde, EVM revert'i tüm
state değişikliklerini geri alır), ampirik bir gözleme değil.

**Ve Task 7 de bunu doğrulamayacak:** Task 7 başarılı bir transfer atıyor,
kasten revert eden bir tx atmıyor — o gaz yakardı ve cüzdanda 0.002 ETH var.
Bu iddia bilerek kaynak seviyesinde bırakılıyor; Foundry tarafında sınanmak
istenirse doğru yer `contracts/test/` (Hakan'ın alanı, bu görevin kapsamı
dışında).

### Kalkan 3'ün `"PQWallet: call failed"` dalı HİÇ ÇALIŞTIRILMADI

Kalkan 3 yalnızca `"PQWallet: invalid signature"` dalında görüldü. Diğer dal
geçerli owner imzası gerektiriyor: `execute()` önce imzayı doğruluyor
(`PQWallet.sol:44`), bakiye/hedef çağrı ancak ondan sonra patlıyor (`:50-51`).

Bu, kapatılması gereken bir boşluk — çünkü spec'te **bakiye göstergesinin tek
varlık gerekçesi** tam olarak bu mesajı ayırt etmekti: `"PQWallet: call failed"`
hem yetersiz bakiyeyi hem hedef çağrının kendi revert'ini kapsıyor ve ikisini
ayıran tek şey ekrandaki bakiye. O mesaj hiç görülmediği için gösterge de
işlevini yaparken görülmedi.

→ Plan Task 7'ye **adlandırılmış bir adım** olarak eklendi (Step 0). Nota gömülü
bırakılmadı: Task 1'deki "yanlış-ağ dalı hiç çalıştırılmamış" bulgusu tam olarak
öyle kaçmıştı.

### Brief'in varsayımı düzeltildi

Brief "ethers v6'da `wait()` revert eden bir tx için de dolu bir receipt
döndürebilir" diyordu. Kaynak okundu: **döndürmez.** `provider.js`'teki
`checkReceipt` (ethers 6.17, satır 1139) `receipt.status === 0` görünce
`CALL_EXCEPTION` fırlatır. Brief'in kodu uygulansaydı revert, generic hata
dalına düşer ve **tx hash'i ile Etherscan linki ekrandan kaybolurdu.**

Bu yüzden iki katman birden var: `sendExecute` CALL_EXCEPTION'dan receipt'i
kurtarıyor, çağıran da `status`'u açıkça kontrol ediyor.

## 7. SAPMA 2, 3, 4 ve 5

**SAPMA 2 — buton kilidi tek kaynaktan (`syncSendButtons`)**

| Durum | btnSend | btnNegativeProof |
|---|---|---|
| İmza var, bağlantı YOK | kapalı ✓ | açık ✓ |
| İmza var, bağlantı var | açık ✓ | açık ✓ |
| Başarılı gönderim sonrası (imza tüketildi) | kapalı ✓ | kapalı ✓ |
| Revert sonrası (imza duruyor) | açık ✓ | açık ✓ |
| Akış ortasında bağlantı düştü | kapalı ✓ | açık ✓ |
| Bağlantı geri geldi | açık ✓ | açık ✓ |

Kodda koşulsuz `btnSend.disabled = false` yok, `finally` yok.

**SAPMA 3 — `refreshChainState({ quiet })`**

Gönderim sonrası zincir okuması kasten kesildi (uygulamanın `fetch`'i,
`eth_sendTransaction` anında devreye giren bir anahtarla — yani üç kalkan
geçtikten SONRA). Sonuç:

- `send-out` **bozulmadan kaldı**: yeşil satır + hash + Etherscan linki + gas
  (1 yeşil, 0 kırmızı öğe)
- Uyarı `#chain-warn`'a düştü: *"Zincir göstergesi yenilenemedi (nonce/bakiye).
  Yukarıdaki işlem sonucu geçerlidir — göstergeyi tazelemek için 'Zincirden
  yenile'ye basın."*
- Göstergeler `—` oldu
- Ekran görüntüsü: `../screenshots/sprint3-quiet-refresh-preserves-tx.png`

Assertion boş değil: kesme uygulanmadığı ilk denemede `#chain-warn` BOŞ çıktı,
uygulandığında doldu. (İlk denemede kesme etkisizdi çünkü uygulamanın RPC'si de
`publicnode` — mock için seçilen uç noktayla aynı host. Muafiyet kaldırıldı.)

**Mevcut çağıranlar bozulmadı:** RPC kesikken "Zincirden yenile"ye basıldığında
hata eskisi gibi `send-out`'a yazılıyor (`Zincir okunamadı: …`), `#chain-warn`
boş kalıyor. Tıklama olayı `quiet`'i tetiklemiyor (dinleyici ok fonksiyonuna
alındı).

**SAPMA 4 — gönderim anında ikinci bağlantı kontrolü**

Ön-uçuş GEÇECEK şekilde ayarlandı, tıklamadan hemen sonra `connected` null'a
düşürüldü (MetaMask'te ağ değişmiş gibi):

```
Gönderilemedi: bağlantı ya da ağ işlem sırasında değişti — cüzdanı yeniden
bağlayıp tekrar deneyin. İmzanız hâlâ geçerli, yeniden imzalamanız gerekmiyor.
```

- `eth_call` yapıldı (ön-uçuş geçti) ama `eth_sendTransaction` ✗ — kontrol
  gerçekten ön-uçuş ile gönderim ARASINDA duruyor.
- İmza korundu.

**SAPMA 5 — alan doğrulama teşhisi geri geldi (Task 3B borcu kapandı)**

| Girdi | Ekrandaki mesaj |
|---|---|
| `to = 0xBOZUKADRES` | `to alanı geçerli bir adres değil: 0xBOZUKADRES` |
| `value = abc` | `value alanı geçerli bir tamsayı değil: abc` |
| `data = ZZZZ` | `data alanı geçerli hex değil (0x ile başlamalı, çift sayıda karakter): ZZZZ` |

- Üçü de **anında** çıktı (imzalama başlamadan — saf `buildDigest`, mnemonic
  almıyor).
- Erken return kilitleri askıda bırakmadı: `btn-build-sign`, `btn-keygen` ve üç
  girdi açık kaldı.
- İmzalama katmanının SABİT mesajı yerinde duruyor ve kaldırılmadı; kapsamı
  daraldı.

## 8. Test kancası ve KASTEN bozmaların geri alınması

Geçici kanca (`window.__t5`) main.js'e eklendi, doğrulama bitince silindi:

```
md5 (kanca eklenmeden önce): 1324dc5dbb1e9f04b5e3b8d92d6aa5f5
md5 (kanca silindikten sonra): 1324dc5dbb1e9f04b5e3b8d92d6aa5f5  → BİREBİR
KASTEN/__t5 kalıntısı: 0
Sayfa yenilendi: window.__t5 === undefined ✓
```

`sendTransaction.js`'te revert kurtarması KASTEN devre dışı bırakıldı
(`if (false && …)`) → ilgili 4 assertion KIRMIZI; geri alındı → YEŞİL.

```
md5 (bozmadan önce ve geri aldıktan sonra): 08e688c1b0dd057d28bb92a546891096
'false &&' kalıntısı: 0
```

## 8b. Sonradan kapatılan dört madde (13 Eylül)

### A1 — status-0 testinin oracle'ı KENDİNE REFERANSLIYDI (bulgu, düzeltildi)

İlk sürümde revert testini sahte bir signer yürütüyordu ve `CALL_EXCEPTION`'ı
**testin kendisi** kuruyordu. Yani kanıtlanan şey "ethers böyle davranır" değil,
"benim taklidim böyle davranır"dı. ethers `e.receipt` yerine `e.info.receipt`
kullansaydı bunu Task 7'de, sahnede öğrenirdik. (Aynı bulgu sınıfı progress.md'de
iki kez geçiyor: Task 2'nin boş assertion'ı, devreden Minor (c).)

**Düzeltme:** `send-transaction-test.mjs`'e "GERÇEK ETHERS — canlı Sepolia
oracle" bölümü eklendi. Taklit yok:

- gerçek `JsonRpcProvider` (`frontend/.env`'deki RPC)
- zincirde gerçekten revert etmiş, var olan bir tx
- ethers'ın **kendi** `TransactionResponse.wait()`'i

Sabitlenen sözleşme (canlı doğrulandı):

```
✓ GERÇEK ethers: revert eden tx için wait() FIRLATIYOR (receipt döndürmüyor)
✓ GERÇEK ethers: code === CALL_EXCEPTION
✓ GERÇEK ethers: receipt `e.receipt` alanında (e.info.receipt DEĞİL)
✓ GERÇEK ethers: e.receipt.status === 0
✓ GERÇEK ethers: e.receipt.gasUsed zincirdeki değer (63730)
✓ sendExecute GERÇEK ethers hatasından receipt kurtarıyor
✓ sendExecute → gerçek status 1 ve status 0 AYIRT EDİLİYOR
```

Sahte signer'lı testler silinmedi ama **yeniden etiketlendi**: onlar yalnızca
`sendExecute`'un dallanma mantığını sınar, ethers'ın davranışını değil.

Assertion'ların dişi: revert kurtarması KASTEN kapatıldı → gerçek oracle
bölümündeki 4 assertion KIRMIZI; geri alındı → YEŞİL. md5
`08e688c1b0dd057d28bb92a546891096`, kalıntı 0.

### A2 — kurtarma koşulu ve `e.txHash`'in ölü olup olmadığı

**Koşul zaten dardı:** `e?.code === 'CALL_EXCEPTION' && e.receipt`
(`sendTransaction.js:164`). Yani receipt taşımayan bir CALL_EXCEPTION kurtarma
dalına girmiyor, `receipt.status` üzerinde TypeError üretemiyor; else dalına
düşüp hash'i iliştirerek yeniden fırlatılıyor. Değişiklik gerekmedi.

**`e.txHash` ölü kod DEĞİLMİŞ — ama hiç çalıştırılmamıştı.** Çalıştırıldı:
`eth_sendTransaction` gerçek bir hash döndürürken `eth_getTransactionReceipt`
ağ hatası verecek şekilde ayarlandı (tx gönderildi, onay beklerken ağ koptu).
Sonuç ekranda:

```
Gönderim sonrası hata: could not coalesce error
İşlem gönderildi ama sonucu doğrulanamadı — zincirde gerçekleşmiş OLABİLİR.
Tekrar göndermeden önce Etherscan'den durumunu kontrol edin.
Tx hash    0x3eb20c48…659843
Etherscan  https://sepolia.etherscan.io/tx/0x3eb20c48…659843
```

İmza korundu, buton yeniden açıldı.
Ekran görüntüsü: `../screenshots/sprint3-sent-but-unconfirmed.png`

**Bu sırada bulunan ve düzeltilen hata:** başlık `"Gönderilemedi:"` yazıyordu —
oysa tx GÖNDERİLMİŞTİ. Kullanıcının tx'in hiç çıkmadığını sanıp tekrar
göndermesi, aynı nonce'a ikinci bir tx demekti. Başlık artık hash'in varlığına
göre değişiyor: `"Gönderim sonrası hata"`.

### A3 — revert sonrası ZORUNLU teşhis

`status !== 1` yolunda `refreshChainState({ quiet: true })` artık zorunlu ve
okuduğu değerler ekrana teşhis olarak **ekleniyor** (tx kanıtı EZİLMİYOR —
`insertAdjacentHTML`). Üç dalın üçü de çalıştırıldı:

| Dal | Ekranda |
|---|---|
| Nonce AYNI | `zincirdeki nonce: 1 · imzalanan nonce: 1 · bakiye: 1000000000000000 wei = 0.001 ETH` + *"Nonce AYNI — sebep imza değil. Geriye hedef çağrının kendi revert'i ya da yetersiz bakiye kalıyor… körlemesine tekrar göndermeyin."* |
| Nonce DEĞİŞMİŞ | `zincirdeki nonce: 1 · imzalanan nonce: 0 · …` + *"Nonce DEĞİŞMİŞ — imzanız bu nonce'a bağlı… kalkan 1 zaten durduracak."* |
| Zincir OKUNAMADI | *"Revert sonrası zincir durumu OKUNAMADI — sebebi teşhis edemiyoruz… nonce ile bakiyeyi görmeden tekrar göndermeyin."* + `#chain-warn` uyarısı |

Üçünde de tx hash'i ve Etherscan linki ekranda kaldı, `.ok` sayısı 0.
Başarılı yolda teşhis **eklenmiyor** (doğrulandı: `teshisVarMi: false`).
Ekran görüntüsü: `../screenshots/sprint3-revert-diagnosis.png`

`refreshChainState` artık `{ nonce, balance }` (ya da hata halinde `null`)
döndürüyor — teşhis ikinci bir RPC gidiş-dönüşü yapmıyor.

## 9. Otomatik testler

```
node src/tx/send-transaction-test.mjs        → 57 assertion, TÜMÜ GEÇTİ
node src/tx/build-transaction-test.mjs       → 21 assertion, TÜM TESTLER GEÇTİ
CAST_EXPECTED=… node src/contracts/pqwallet-test.mjs → 9 assertion (cast oracle dahil)
npx vite build                               → geçti
```

`send-transaction-test.mjs`'e eklenen 34 assertion iki katman:

- **Dallanma mantığı (sahte signer):** gas tahmini (+%20 pay), tahmin patlayınca
  `GAS_FALLBACK = 350000n`, hangi hatanın yutulup hangisinin fırlatıldığı.
  Bunlar ethers'ın davranışı hakkında hiçbir şey kanıtlamaz.
- **Gerçek oracle (canlı Sepolia, taklit yok):** ethers 6.17'nin revert
  sözleşmesi — bkz. bölüm 8b/A1.

Neden node'da: revert yolunu tarayıcıda tetiklemek zincirde gerçekten revert
eden bir tx atmayı gerektirir — gaz yakar, Sepolia ETH kıt.

**Testin kırılganlığı, bilerek:** oracle bölümü iki sabit Sepolia tx hash'ine
bağlı. RPC bunları budarsa test SESSİZCE ATLAMAZ, kırmızı yanar ("revert eden tx
zincirden okunabildi ✗") ve yeni bir hash seçilir. Atlanan kontrol, yapılmamış
kontroldür.

## 10. Console

Tek konsol hatası: `favicon.ico 404` (önceden de vardı). Başka hata/uyarı yok.

## 11. Devreden

- `"PQWallet: call failed"` (yetersiz bakiye) yolu geçerli owner imzası
  gerektiriyor → **Task 7**.
- Gerçek MetaMask penceresiyle uçtan uca gönderim → **Task 7** (Task 4'ün elle
  doğrulaması 5/5 geçmişti; bu görevdeki düzenek cüzdan katmanını taklit ediyor).
- `btn-negative-proof` hâlâ dinleyicisiz → **Task 6**.
