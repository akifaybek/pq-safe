# Kanıt — Uçtan uca zincir işlemi (Task 7)

**Tarih:** 13 Eylül 2026
**Yazan:** Akif
**Kapsam:** Frontend'den, owner C13 imzasıyla, MetaMask üzerinden Sepolia'ya
gerçek `PQWallet.execute()` işlemi; ölçülen gas; negatif kanıt; kalkan 3'ün
`"PQWallet: call failed"` dalı.

**Bu görevde zincire GERÇEK İŞLEM ATILDI** — Sprint 3'te ilk ve tek.

**Anahtar:** owner mnemonic'i (`.env.pqwallet-owner-key`) tarayıcıya **elle**
girildi. Dosya hiçbir komuta verilmedi, hiçbir ajan tarafından açılmadı.

---

## 1. İşlem

| | |
|---|---|
| **Tx hash** | [`0x320e03d98cec857bbae8ecb49bcb0736c960287d76a19f2fad39b471b09e50da`](https://sepolia.etherscan.io/tx/0x320e03d98cec857bbae8ecb49bcb0736c960287d76a19f2fad39b471b09e50da) |
| **Status** | `1` (success) |
| **Blok** | 11696552 |
| **From** (gas'ı ödeyen) | `0xe0BF2D190f8e2F2fc97cF19244845F8FeBDB7351` |
| **To** | `0x2EafA294C14b6752128bfd4f5873D1EA39f000BB` (PQWallet) |
| **Tx value** | `0` — ETH `execute()`'un İÇİNDEN transfer edilir, tx zarfından değil |
| **`execute()` value** | `100000000000000` wei = 0.0001 ETH |
| **`execute()` to** | `0xe0BF2D190f8e2F2fc97cF19244845F8FeBDB7351` (kendine iade) |
| **`execute()` data** | `0x` |
| **İmza** | 3688 bayt (C13), üretim süresi 6626,5 ms |
| **gasUsed** | **216.221** |
| **gasLimit** | 262.924 |
| **effectiveGasPrice** | 2.604640829 gwei |
| **Ücret** | 0,000563178044687209 ETH |

Ekrandaki çıktı:

```
İşlem zincire gönderildi ve onaylandı.
Tx hash     0x320e03d98cec857bbae8ecb49bcb0736c960287d76a19f2fad39b471b09e50da
Etherscan   https://sepolia.etherscan.io/tx/0x320e03d9…50da
Gas         216221 kullanıldı (limit: 262924)
Blok        11696552
```

## 2. Zincirden BAĞIMSIZ doğrulama

UI'ın söylediğiyle yetinilmedi; her sayı `cast` ile (ethers'tan bağımsız araç)
zincirden okundu.

```
cast receipt → status 1 · gasUsed 216221 · blockNumber 11696552
               from 0xe0BF2D19… · to 0x2EafA294…
```

| Değer | İşlem ÖNCESİ | İşlem SONRASI | Beklenen |
|---|---|---|---|
| `PQWallet.nonce()` | **1** | **2** | +1 ✓ |
| PQWallet bakiyesi | 1000000000000000 wei (0,001 ETH) | 900000000000000 wei (0,0009 ETH) | −0,0001 ✓ |
| MetaMask hesabı nonce | 0 | 1 | +1 ✓ |
| MetaMask bakiyesi | 50000000000000000 wei | 49536821955312791 wei | ✓ (aşağıda) |

Gönderen hesabın bakiyesi tam olarak tutuyor:

```
0,05 − 0,000563178044687209 (ücret) + 0,0001 (iade edilen transfer)
      = 0,049536821955312791 ETH        ← zincirden okunan değerin birebiri
```

> **NOT — plan bayattı.** Plan Step 4 *"nonce'un 0→1 arttığının doğrulaması"*
> diyordu. Gerçek başlangıç nonce'u **1**'di (Hakan'ın 7 Eylül'deki tx'i
> zaten 0→1 yapmıştı), bizimki **1→2**. Bu fark aşağıdaki gas analizinin de
> merkezinde.

### 2b. İmza zincirine karşı bağımsız doğrulama

Ekrana hiç bakmadan, uçtan uca yeniden kuruldu:

1. `DOMAIN_SEPARATOR` dondurulmuş formülden **yeniden hesaplandı**
   (`cast keccak` + `abi-encode`), ekrandakiyle birebir:
   `0xa6238098b5d49d6e94eb134fa1e5ce7f888c5a9f870626079776fb42874c228b`
2. `digest` dondurulmuş formülden yeniden hesaplandı (nonce **1** ile —
   kontrata soramazdık, zincirdeki nonce artık 2):
   `0xf780be02e942b21eb365d0e97b3f338d12da0ab3b76e7813322b3d89d55061e6`
3. İmza **tx'in calldata'sından çıkarıldı** (UI'dan değil): `execute()`
   argümanları decode edildi → `to`, `value = 100000000000000`, `data = 0x`,
   `signature = 3688 bayt`. Yani calldata gerçekten `fields`'tan kurulmuş.
4. Zincirdeki `SPHINCSVerifier` doğrudan çağrıldı:

```
cast call 0x143Db127…14a2E "verify(bytes32,bytes,bytes)(bool)" <digest> <sig> <pk>
→ true
```

Formül → digest → imza → verifier zincirinin tamamı, frontend'e hiç
güvenilmeden doğrulandı.

## 3. Ölçülen gas — 216.221 ve 233.429 neden farklı

Beklenti 233.429 civarıydı (Hakan'ın 7 Eylül tx'i). Ölçülen **216.221**, yani
**17.208 daha az**. Sapma "olabilir" denip geçilmedi, ayrıştırıldı:

```
Hakan  233.429 = intrinsic+calldata 81.116 + EVM içi 152.313
BİZİM  216.221 = intrinsic+calldata 81.008 + EVM içi 135.213
                                             EVM farkı: 17.100
```

Calldata ikisinde de 3.908 bayt; bizimkinde 210 sıfır / 3.698 sıfır-dışı bayt.
Intrinsic farkı yalnızca **108** (9 sıfır baytlık kodlama farkı) — sapmanın
kaynağı calldata DEĞİL.

### Ana sebep: `nonce++`'ın depolama yazma maliyeti

`execute()` içinde `nonce++` var (`PQWallet.sol:48`). EVM'de sıfırdan çıkan bir
yazma ile sıfır-dışından sıfır-dışına yazma aynı fiyatta değil:

| | Hakan'ın tx'i | Bizim tx |
|---|---|---|
| nonce değişimi | **0 → 1** | **1 → 2** |
| soğuk slot erişimi (EIP-2929) | 2.100 | 2.100 |
| `SSTORE` | **20.000** (`SSTORE_SET`) | **2.900** (`SSTORE_RESET`) |
| **toplam** | **22.100** | **5.000** |

**22.100 − 5.000 = 17.100** — ölçülen EVM farkının birebiri.

Yani Hakan'ın 233.429'u **PQWallet'ın İLK `execute()`'uydu** ve tek seferlik bir
"sıfırdan çıkış" bedeli taşıyordu. **216.221 kalıcı rejim maliyetidir**;
bundan sonraki her `execute()` bu civarda olacak.

### İkincil iki terim (birbirini büyük ölçüde götürüyor)

- **`verify()` imzaya göre değişiyor.** Bizim imzamızla ölçüldü: zincirdeki
  `SPHINCSVerifier.verify()` **113.771** (intrinsic+calldata çıkarılmış).
  Spec'teki 108.574 bir Foundry trace'inden ve **farklı bir fixture
  imzasından** geliyor, birebir karşılaştırılabilir bir taban değil. WOTS+
  zincir uzunlukları digest'e bağlı olduğu için bu varyans **beklenen**
  davranıştır. → bizim aleyhimize ~**+5.200**
- **Alıcı sıcak.** `execute()`'un `to`'su tx'i gönderen hesabın kendisi;
  EIP-2929 `tx.origin`'i baştan sıcak sayıyor, `CALL` 2.600 yerine 100.
  → lehimize **−2.500**

Bu ikisi net ~+2.700 bırakıyor ve 17.100'lük ana terimin yanında ikinci
derecede kalıyor. **17.100'ün bu kadar temiz çıkması kısmen bu dengelenmenin
sonucudur** — aritmetiği fazla sıkı yorumlamamak gerekir; sabit olan, SSTORE
teriminin baskın ve tam hesaplanabilir olması.

### `estimateGas` çalıştı, fallback devreye GİRMEDİ

Gönderilen limit **262.924** = tahmin × 1,2 (tahmin 219.104). Ekranda
*"tahmin başarısız oldu, sabit limite düşüldü"* notu **çıkmadı**.

Bu, `GAS_FALLBACK = 350.000` dalının hâlâ canlı görülmediği anlamına da gelir
(bkz. bölüm 7). Public RPC'nin 3,9 KB calldata'da zorlanma riski bu tx'te
gerçekleşmedi.

## 4. Negatif kanıt (aynı oturumda, gerçek tx'ten HEMEN ÖNCE)

`Bozuk imzayla dene (negatif kanıt)` → tek tık, hiçbir alan değiştirilmeden:

```
✓ Kontrat bozuk imzayı reddetti — imza gerçekten doğrulanıyor.
Kontratın döndürdüğü sebep:  PQWallet: invalid signature
```

Gaz harcanmadı (`eth_call`). **Ardından aynı imzayla gerçek gönderim başarılı
oldu** — bu sıra, negatif kanıtın saklanan imzayı bozmadığının canlı kanıtıdır
(Task 6'da calldata karşılaştırmasıyla ölçülmüştü: aynı uzunluk, tam 1 bayt
fark).

Kanıt değeri: "transfer geçti" tek başına imzanın doğrulandığını göstermez —
`verify()`'ı hiç çağırmayan bir `execute()` de aynı yeşil ekranı üretirdi. Bir
baytı bozuk imzanın reddedilmesi, doğrulamanın gerçekten çalıştığını gösteriyor.

## 5. Kalkan 3'ün `"PQWallet: call failed"` dalı (Step 0 — gerçek tx'ten ÖNCE)

Task 5'te kalkan 3 yalnızca `"PQWallet: invalid signature"` dalında
görülmüştü; diğer dal geçerli owner imzası gerektiriyordu. Sıfır maliyetle
kapatıldı.

Kurulum: `value` = **bakiye + 1 wei** = `1000000000000001` (bakiye o an
`1000000000000000` wei).

```
value geri okuma  1000000000000001 wei = 0.001000000000000001 ETH
✓ imza uzunluğu 3688 bayt (C13 beklenen)
imzalama tamamlandı (6828.6 ms)
Gönderilemedi: PQWallet: call failed
```

- **MetaMask AÇILMADI**, gaz harcanmadı. Mesaj `preflight`'tan geliyor ve
  `sendExecute` ondan sonra çağrılıyor; MetaMask açılıp reddedilseydi akış
  `ACTION_REJECTED` dalına düşerdi.
- İmza kabul edildi (owner anahtarı devrede), `execute()` imzayı geçti ve
  **para transferinde** patladı — hedeflenen dal tam olarak bu.
- digest bağımsız doğrulandı: `cast _computeDigest(to, 1000000000000001, 0x)`
  → `0x05d7f0b4e1a4e573c1df6183622d2f41ca8a5b456cdcefb95a86ff4c10cec551`,
  ekrandakiyle birebir.

**Bu adım spec'teki bakiye göstergesinin varlık gerekçesini kanıtlıyor.**
`"PQWallet: call failed"` generic bir mesajdır: hem yetersiz bakiyeyi hem de
hedef çağrının kendi revert'ini kapsar. **İkisini ayıran tek şey ekrandaki
bakiye göstergesidir.** Mesaj bugüne kadar hiç görülmediği için gösterge de
işlevini yaparken görülmemişti; artık görüldü.

Ekran görüntüsü: `../screenshots/sprint3-shield3-call-failed.png`

> **Ekran görüntüsünün sınırı:** 3688 baytlık imza bloğu tek ekrana sığmadığı
> için `Cüzdan bakiyesi` göstergesi bu karede yok; karede `value geri okuma =
> 1000000000000001 wei` ile hata satırı yan yana duruyor. Bakiyenin o an tam
> `1000000000000000` wei olduğu `cast` ile bağımsız okundu ve bağlantı
> karesinde de görünüyor.

## 6. Ağın gerçekten Sepolia olduğu

Ekran kaydında MetaMask onay penceresi para birimini `SepoliaETH` değil düz
`ETH` gösterdi (sürüm/ayar meselesi). Ağın kanıtı MetaMask'in görüntüsü değil,
şu üçü:

| Kanıt | Nerede |
|---|---|
| `MetaMask bağlandı, ağ Sepolia (11155111)` | Sayfada, kayda girdi. `connectWallet()` chainId'i zincirden okuyup karşılaştırıyor — Sepolia olmasaydı gönderim hiç başlamazdı (`sendTransaction.js:18`) |
| `[ This is a Sepolia Testnet transaction only ]` | `sepolia.etherscan.io` |
| digest chainId'e bağlı | Yanlış ağda üretilen imza `PQWallet: invalid signature` verirdi. Tx **başarılı** oldu → chainId 11155111 |

Üçüncüsü en sağlamı: yanlış ağda bu işlem zaten geçemezdi.

## 7. Ön-bilgi raporundaki (f) listesinin sonucu

Task 7 öncesinde "owner imzası devredeyken ilk kez çalışacak, hiç sınanmamış"
diye dokuz yol listelenmişti. Bu tx'te hangileri gerçekten koştu:

| # | Yol | Durum |
|---|---|---|
| 1 | Ön-uçuşun **geçmesi** (`preflight` throw etmiyor) | ✅ **KOŞTU** — gerçek imzayla |
| 2 | `sendExecute` → gerçek `estimateGas` + %20 pay | ✅ **KOŞTU** — tahmin 219.104, limit 262.924 |
| 3 | `GAS_FALLBACK = 350.000` dalı | ❌ **HÂLÂ SINANMADI** — tahmin başarılı olduğu için devreye girmedi |
| 4 | Gerçek `eth_sendTransaction` + MetaMask onay penceresi | ✅ **KOŞTU** — elle onaylandı, kayda girdi |
| 5 | `receipt.status === 1` render'ı, **kendi tx'imizin** receipt'iyle | ✅ **KOŞTU** — Task 5'te ilgisiz bir tx'in hash'i kullanılmıştı |
| 6 | Başarı sonrası `signed = null` + `refreshChainState({quiet:true})` | ✅ **KOŞTU** — göstergeler nonce 2 / 0,0009 ETH'e tazelendi |
| 7 | `ACTION_REJECTED` dalı (MetaMask'te iptal) | ❌ **HÂLÂ SINANMADI** — gerçek MetaMask ile hiç tetiklenmedi |
| 8 | `"PQWallet: call failed"` (kalkan 3'ün ikinci dalı) | ✅ **KOŞTU** — bölüm 5 |
| 9 | Bakiye göstergesinin işlevi | ✅ **KOŞTU** — bölüm 5, generic mesajı ayırt eden tek şey oydu |

**Hâlâ sınanmamış olanlar açıkça duruyor: 3 ve 7.** İkisi de zararsız dallar
(biri tahmin patlarsa devreye giren yedek, diğeri kullanıcının iptali) ama
"koştu" diye yazılmadı.

### `receipt.status === 0` dalı — sınanmadı ve bu görevde sınanmayacaktı

Task 5'te bu dal **PQWallet'ın kendi revert'iyle değil**, Sepolia'da revert
etmiş **ilgisiz** bir tx'in receipt'iyle sınanmıştı. Task 7 de bunu
kapatmadı — çünkü Task 7 başarılı bir transfer atıyor, kasten revert eden bir
tx atmıyor; o gaz yakardı ve cüzdanda 0,001 ETH vardı.

Dolayısıyla **"`execute()` revert ederse nonce artmaz" iddiası hâlâ kaynak
okumasına dayanıyor** (`PQWallet.sol:48` — `nonce++` fonksiyonun içinde, EVM
revert'i tüm state değişikliklerini geri alır), ampirik bir gözleme değil.

Foundry'de sınanmak istenirse doğru yer `contracts/test/` — **Hakan'ın alanı**,
bu görevin kapsamı dışında.

## 8. Ekran kaydı

| | |
|---|---|
| Dosya | `kanıt video 2.mp4` |
| Boyut | 93.087.866 bayt (~93 MB) |
| SHA-256 | `f7be0790747634e8e2fc38ac68d28843462b932d2136d84d1722089cc22abe1b` |
| Konum | Repo **dışında** tutuluyor — 93 MB'lık ikili dosya depoyu kalıcı şişirirdi |

Kaydın gösterdikleri, sırayla: owner anahtarının zincirdeki `ownerPublicKey`
ile eşleştiği (`✓ AYNI`) → nonce ve bakiyenin zincirden canlı okunması →
`to`/`value` alanları → C13 imzanın üretilmesi (3688 bayt) → **negatif kanıtın
reddedilmesi** → gerçek gönderim → MetaMask onayı → tx hash, Etherscan linki,
ölçülen gas, blok → nonce'un 2'ye, bakiyenin 0,0009 ETH'e düşmesi.

### Mnemonic taraması — kayıt öncesi

Kayıt başlamadan doğrulandı:

- Sayfa **bir kez** yüklendi ve kayıt boyunca yenilenmedi.
- `Yeni anahtar çifti üret` butonuna **hiç basılmadı** → rastgele mnemonic DOM'a
  hiç yazılmadı. (`main.js:195` — mnemonic'in DOM'a yazıldığı **tek** yer o
  butonun yolu; içe aktarma yolu mnemonic'i hiçbir yere yazmıyor.)
- `import-mnemonic` alanı boş (kod başarı yolunda hemen temizliyor,
  `main.js:415`) — noktalar bile görünmüyor, kelime sayısı bile sızmıyor.
- Sayfada `Cmd+F` ile mnemonic'ten bir kelime arandı → **0 sonuç**.
- DevTools kapalı, başka pencere/bildirim yok.

Ekranda gösterilen tek anahtar malzemesi **açık** anahtardır
(`0x5c0adf08…`, zincirde zaten herkese açık).

## 9. Ekran görüntüleri

| Dosya | Ne gösteriyor |
|---|---|
| `../screenshots/sprint3-shield3-call-failed.png` | Step 0 — `PQWallet: call failed`, MetaMask açılmadan |

Etherscan sayfası ve son ekran kaydın içinde; ayrıca tüm sayılar bölüm 2'de
`cast` ile bağımsız doğrulandı.

## 10. Devreden

- **`GAS_FALLBACK` ve `ACTION_REJECTED` dalları** hâlâ canlı görülmedi
  (bölüm 7, satır 3 ve 7).
- **`receipt.status === 0` dalı** PQWallet'ın kendi revert'iyle sınanmadı;
  Foundry'de `contracts/test/` — Hakan'ın alanı.
- **Tx hash Hakan'a iletilecek**, `docs/evidence/tx-hashes.md`'ye bu taraftan
  dokunulmadı (`GOREV_SINIRLARI.md`: 🔴 HAKAN ekler, append-only).
