# İşlem oluşturma ve imzalama akışı — tasarım

**Tarih:** 28 Ağustos 2026
**Yazan:** Akif
**Sprint:** 3 (Hakan'ın deploy'undan bağımsız ilerleyen parça)

## Amaç

Frontend şu an iki ayrı şeyi kanıtlıyor ama birbirine bağlamıyor:
`signer.js` rastgele bir digest'i imzalayabiliyor (2. bölüm), `digest.js`
dondurulmuş formata göre digest üretebiliyor (`cast`'e karşı doğrulanmış,
`sprint2-js-digest-function.md`) — fakat hiçbir UI akışı ikisini
birleştirmiyor. Bu adım o boşluğu kapatıyor: kullanıcı bir işlemin
alanlarını girer, gerçek digest hesaplanır, o digest gerçekten imzalanır.

Bu, uçtan uca akışın Hakan'a bağlı olmayan kısmının tamamı. Deploy
çıktıları (`docs/tx-hashes.md`) geldiğinde geriye sadece imzayı zincire
göndermek kalacak.

## Kapsam

**Dahil:**
- `to` / `value` / `data` / `nonce` / PQWallet adresi girdilerinden digest üretme
- Üretilen digest'i sayfadaki mevcut anahtarla imzalama
- DOMAIN_SEPARATOR, digest ve imzanın ekranda gösterilmesi
- Alan adıyla anlaşılır girdi doğrulama
- `buildDigest()` için otomatik doğrulama script'i

**Kapsam dışı:**
- `execute()` calldata'sı üretme, tx gönderme, gas tahmini
- Kontrat state okuma (nonce dahil) — deploy adresi gerekiyor
- Üretilen imzanın on-chain doğrulanması
- Gerçek owner anahtarıyla imzalama
- Üretim kalitesinde cüzdan UI'ı — bu sayfa hâlâ kanıt arayüzü

## Mimari

Mantık yeni bir modülde toplanıyor; `main.js` DOM tutkalı olarak kalıyor.
Gerekçe: bu, işin ilk **deterministik** parçası (ağ yok, rastgelelik yok),
yani mevcut `.mjs` desenine uygun gerçek bir otomatik doğrulama yazılabilir.
Ayrıca Sprint 4'te üretim UI'ına geçilirken tekrar kullanılacak parça tam
olarak bu — `main.js` içine gömülürse sökülmesi gerekir.

### `frontend/src/tx/buildTransaction.js` (yeni)

```js
export function buildDigest({ walletAddress, nonce, to, value, data })
  → { domainSeparator, digest }

export async function buildAndSign({ walletAddress, nonce, to, value, data, mnemonic })
  → { domainSeparator, digest, signature, sigBytes, signMs }
```

- `chainId` parametre değil: modül `sepolia.js`'ten `SEPOLIA_CHAIN_ID`
  sabitini alır. Zincir kimliği kullanıcı girdisi olsaydı yanlış değer
  sessizce geçersiz imza üretirdi.
- İki fonksiyon bilerek ayrı. `buildDigest` saf ve milisaniye altı;
  `buildAndSign` WASM üzerinden ~7.5 saniye sürer. Ayrık olunca doğrulama
  script'i digest'i WASM'ı hiç başlatmadan sınayabiliyor.
- `signMs` **yalnızca `signDigest()` süresini** ölçer. Digest hesaplama
  ayrıca ölçülmüyor: milisaniye altı olduğu için kanıt değeri yok ve tek
  bir birleşik süre "bu rakam neyi ölçüyor" belirsizliği yaratırdı.

### `frontend/src/network/sepolia.js` (değişiklik)

`SEPOLIA_CHAIN_ID` export edilir. Şu an modüle özel; ikinci bir `11155111`
sabiti doğmasın diye tek doğruluk kaynağı olarak açılıyor. Başka değişiklik
yok.

### UI (`index.html` + `main.js`)

Mevcut desende 4. bölüm: beş etiketli input, bir buton, bir çıktı `div`'i.

| Alan | id | Ön-doldurma |
|---|---|---|
| PQWallet adresi | `tx-wallet` | `0x1234567890123456789012345678901234567890` |
| to (alıcı) | `tx-to` | `0xabcdefabcdefabcdefabcdefabcdefabcdefabcd` |
| value (wei) | `tx-value` | `1000000000000000000` |
| nonce | `tx-nonce` | `0` |
| data (hex) | `tx-data` | `0x` |

Ön-doldurma değerleri rastgele değil: `sprint2-js-digest-function.md`'deki
Test 1 vektörünün ta kendisi. Böylece ekranda çıkan digest, kanıt
dosyasındaki bağımsız `cast` çıktısıyla elle karşılaştırılabiliyor.

`value` alanı **wei** alır ve etiketi bunu açıkça söyler; birim çevrimi
yapılmaz, çünkü sessiz bir hata sınıfı açardı. Buna karşılık sonuçların
yanında `formatEther` ile ETH karşılığı geri okutulur — yanlış basamak
sayısı göze çarpsın diye.

Çıktı: DOMAIN_SEPARATOR, digest, imza (uzunluğuyla), `signMs`, ETH geri
okuması. DOMAIN_SEPARATOR ayrı gösteriliyor çünkü digest'in cüzdan adresine
ve zincire bağlı olduğunu görünür kılan tek şey o.

## İsimlendirme: `compute*` ve `build*`

İki ayrı fiil kasıtlı:

- `compute*` (`digest.js`): dondurulmuş formatı uygular. Saf, ağdan
  habersiz, kendisine verilen her şeyi olduğu gibi kullanır.
- `build*` (`buildTransaction.js`): zincir bağlamını (chainId) enjekte
  eder, girdileri doğrular, imzalamayla kompoze eder.

Kısaca: `compute` formatı, `build` işlemi kurar. `digest.js` dondurulmuş
formatı taşıdığı için mümkün olduğunca az dokunulan dosya olarak kalır.

## Hata yönetimi

Beş girdi olunca asıl risk, ethers'ın `invalid address` deyip **hangi alanı**
kastettiğini söylememesi. Bu yüzden her alan kendi adıyla doğrulanır ve
hata o adla sarılır:

| Alan | Doğrulama | Örnek hata |
|---|---|---|
| `walletAddress`, `to` | `getAddress()` | `to alanı geçersiz adres: …` |
| `nonce`, `value` | `BigInt()`, negatif reddedilir | `value alanı negatif olamaz` |
| `data` | `isHexString()`, boşsa `0x` | `data alanı geçerli hex değil: …` |

`getAddress()` ayrıca checksum'u düzeltir, yani küçük harfle yapıştırılan
adres kabul edilir.

Diğer kurallar mevcut desenden gelir: anahtar üretilmemişse "Önce anahtar
üret", tüm akış `try/catch` içinde ve hata `.err` sınıfıyla gösterilir.
Buton uçuştaki istek boyunca kapatılır — imzalama ~7.5 saniye sürdüğü için
burada 3. bölümdekinden daha gerekli.

## Test / doğrulama

**Otomatik** — `frontend/src/tx/build-transaction-test.mjs`, mevcut `.mjs`
desenine uygun (`wasm-signer-test.mjs`, `noble-risk-test.mjs`), node ile
çalıştırılır. `buildDigest()` çıktısı, `sprint2-js-digest-function.md`'de
kayıtlı Foundry `cast` değerlerine karşı sınanır:

| | Girdi | Beklenen |
|---|---|---|
| Test 1 | wallet `0x1234…7890`, nonce 0, to `0xabcd…abcd`, value `1000000000000000000`, data `0x` | DOMAIN_SEPARATOR `0x8110c08d40ffb855149f3c041e89e6071a71c5f337ca317b9c24aea9da98e6a5`<br>DIGEST `0x417663f38b52fec7f71d3fb178fed03ac2559af424c9a01b72f65f23553a4746` |
| Test 2 | wallet `0x1234…7890`, nonce 5, to `0xabcd…abcd`, value `42`, data `0xdeadbeef` | DIGEST `0xc9463c6053d8c0e0573012df0e7f5ab40fd74ffdbc840a65b3be0bd7b332ec29` |

Bu gerçek bir çapraz kontrol: beklenen değerler Foundry'nin bağımsız
implementasyonundan geliyor, kendi kodumuzdan değil. Her iki vektörün
de `chainId` değeri `11155111`'dir ve üçü de 28 Ağustos 2026'da `digest.js`'e
karşı yeniden çalıştırılıp doğrulanmıştır — kanıt dosyasındaki Test 2 satırı
cüzdan adresini tekrar etmediği için burada açıkça yazıldı. WASM çalışmadığı için
milisaniyeler sürer. Script ayrıca hatalı adres, negatif value ve bozuk hex
için alan-adlı hata mesajlarını sınar.

**Tarayıcı** (manuel, kanıt için): form ön-doldurulmuş haliyle imzalanır,
DOMAIN_SEPARATOR ve digest'in yukarıdaki `cast` değerleriyle aynı olduğu
ekranda görülür. Ekran görüntüsü `docs/evidence/`'a, kanıt notu
`docs/evidence/crypto-tests/` altına.

## Bilinen sınırlar

Bunlar "yapılmadı" değil, **şu an böyle** — sonraki adımda değişecekler:

- **Nonce serbest metin.** Bu haliyle replay koruması gösterilmiyor; nonce
  sadece digest'e giren bir sayı. Gerçek koruma, nonce'un `PQWallet`'ın
  on-chain state'inden okunmasıyla test edilir ve bu Hakan'ın deploy
  adresine bağlı. Üretim UI'ında bu alan serbest metin olmayacak.
- **PQWallet adresi de girdi alanı.** Aynı gerekçe: adres gelince
  yapılandırmaya taşınacak, kullanıcı elle girmeyecek.
- Üretilen imza on-chain doğrulanmıyor; imzalayan anahtar sayfanın rastgele
  anahtarı, gerçek owner anahtarı değil.

## Açık soru

Yok. Gerekli her girdi ya kullanıcıdan alınıyor ya da `sepolia.js`'ten
geliyor; bu adım hiçbir dış çıktıyı beklemiyor.
