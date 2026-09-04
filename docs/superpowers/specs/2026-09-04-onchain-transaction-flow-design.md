# Tasarım — Zincir üzerinde işlem akışı (nonce okuma, gönderme, negatif kanıt)

**Tarih:** 4 Eylül 2026
**Yazan:** Akif
**Durum:** onaylandı, plana geçilecek
**Önceki:** `2026-08-28-transaction-builder-design.md`

## Bağlam

Hakan deploy'u tamamladı (`docs/tx-hashes.md`, 4/4 kontrat Etherscan'de
doğrulandı) ve zincirdeki `PQWallet`'ın doğru owner anahtarını taşıdığı
bağımsız olarak doğrulandı (`sprint3-live-signature-verification.md`).
Böylece frontend'in üç maddesi açıldı:

1. Kontrat adreslerini yapılandırmaya taşı — `walletAddress` ve `nonce` artık
   girdi alanı olmasın
2. `nonce`'u `PQWallet`'ın on-chain state'inden oku
3. `execute()` calldata'sını `fields`'tan kur, tx gönder

Bu tasarım üçünü tek bir akışta birleştirir ve üstüne demo için gereken kanıt
araçlarını ekler.

## Kapsam

**Kapsam içi:** transfer akışı — nonce okuma, digest kurma, C13 ile imzalama,
zincire gönderme, canlı digest karşılaştırması, negatif kanıt, bakiye
göstergesi.

**Kapsam dışı:**

- **Migration akışı.** `Migration.proveOwnership()` tek kullanımlıktır:
  `migrated[oldAddress]` kalıcı olarak `true` olur ve asla geri dönmez. Sahnede
  geri dönüşü olmayan tek atışlık işlem yapılmaz. Migration, kaydedilmiş tx
  hash + Etherscan linki olarak gösterilecek, canlı denenmeyecek.
- Demo cilası ve görsel tasarım — Sprint 4.

## Mimari

Mevcut `compute*` (saf, ağdan habersiz) ↔ `build*` (zincir bağlamı enjekte
eder) ayrımı korunuyor. Üç yeni modül:

| Modül | Sorumluluk |
|---|---|
| `src/config/contracts.js` | Deploy adresleri + Etherscan taban URL'i |
| `src/contracts/pqwallet.js` | Zincir okuma: `readNonce()`, `readBalance()`, `readDigest()` (kontratın `_computeDigest`'ini çağırır). Saf yardımcılar: `encodeExecute()`, `tamperSignature()` |
| `src/tx/sendTransaction.js` | `connectWallet()`, `preflight()`, `sendExecute()` |

**Adresler `.env`'e değil commit'lenen config'e giriyor.** Gizli değiller —
zincirde zaten herkese açık — ve `.env`'de tutulursa demo başka bir makinede
çalışmaz. `.env` yalnızca RPC URL'i için kalır.

**Neden `buildTransaction.js`'e eklenmiyor:** o modül saf kalmalı; zincir
okuma ve MetaMask yan etkileri onu test edilemez hale getirir.

## Veri akışı

```
sayfa yüklenir / [Yenile]  → readNonce() + readBalance() → ekranda göster
[Digest hesapla ve imzala] → buildAndSign({ walletAddress: config, nonce: okunan,
                                            to, value, data, mnemonic })
                             → { digest, signature, fields } modül state'ine SAKLANIR
[Cüzdanı bağla]            → MetaMask; chainId === 11155111 doğrula
[Zincire gönder]           → 1. nonce kontrolü
                             2. canlı digest karşılaştırması
                             3. eth_call ön-uçuşu
                             4. gönder → hash + Etherscan linki → receipt → durum
[Bozuk imzayla dene]       → tamperSignature(kopya) → eth_call → revert mesajını göster

herhangi bir girdi değişti   → { digest, signature, fields } TEMİZLENİR,
  (to / value / data)          gönder devre dışı, "yeniden imzala" uyarısı
```

## Kritik kural — calldata `fields`'tan kurulur

`execute()` argümanları, imzalama anında dönen `fields`'tan kurulur; DOM'dan
**yeniden okunmaz**. Ham girdiden tekrar normalize edilirse ikinci bir
normalizasyon yolu doğar ve digest'e giren baytlardan sessizce sapabilir.

Bu kuralın ihlalinin hata modu özellikle sinsidir: digest kayar, verifier
`false` döner ve ekranda **"PQWallet: invalid signature"** yazar — imza aslında
sağlamken. Yani hata mesajı seni yanlış yere bakmaya gönderir. Aşağıdaki
digest karşılaştırması tam olarak bu iki durumu ayırt etmek için var.

## İmzadan sonra form düzenleme — üç kalkanın da göremediği durum

**Senaryo:** kullanıcı imzalar, sonra `tx-to` alanını değiştirir, "Zincire
gönder"e basar. Calldata `fields`'tan kurulduğu için tx **eski adrese** gider —
kriptografik olarak doğru, ama ekranda **yeni adres** yazıyor.

Aşağıdaki üç kalkanın hiçbiri bunu yakalamaz:

- Nonce doğru
- Digest karşılaştırması uyuşur (ikisi de eski `fields`'tan türüyor)
- Ön-uçuş geçer

Her şey yeşil, kullanıcı yanlış bilgiye bakıyor. Sahnede bir değeri düzeltip
yeniden imzalamayı unutmak tam olarak olacak şeydir.

**Çözüm:** herhangi bir girdi alanı (`tx-to`, `tx-value`, `tx-data`)
değiştiğinde saklanan `{ digest, signature, fields }` state'i **temizlenir** ve
ekranda "değerler değişti, yeniden imzala" yazar. Gönder butonu imza yeniden
üretilene kadar devre dışı kalır.

Alanları imzadan sonra kilitlemek de bir seçenekti; state temizleme tercih
edildi çünkü kullanıcıyı sürprizle karşılaştırmıyor — düzeltme yapmak serbest,
sadece yeniden imza gerekiyor.

## Koruma sırası ve gerekçesi

Sıra: **nonce kontrolü → digest karşılaştırması → `eth_call` ön-uçuşu**

Bu sıra yalnızca "hızlı başarısız ol" değil, bir **teşhis sırasıdır**. Sonraki
oturumların performans gerekçesiyle değiştirmemesi için gerekçe burada yazılı:

1. **Nonce kontrolü** en spesifik mesajı verir ("nonce değişti, yeniden
   imzala"). Hakan aynı cüzdana tx atıyor; bu gerçekten olabilecek bir durum.
2. **Digest karşılaştırması** ikinci sırada, çünkü nonce sebebi bir önceki
   adımda zaten elenmiştir. Nonce güncelken digest'ler yine de uyuşmuyorsa
   geriye tek olası açıklama kalır: **`fields` sapması.** Sıra bozulursa bu
   teşhis değeri kaybolur — digest uyuşmazlığının sebebi "ya nonce ya fields"
   olarak belirsizleşir.
3. **`eth_call` ön-uçuşu** en genel kalkan: bozuk imza, yetersiz bakiye, hedef
   çağrının patlaması — hepsini yakalar. Kontrattaki `require` string'leri
   okunabilir metin olarak geri döner, gaz harcanmaz.

Ön-uçuş tek başına da yeterli olurdu; ilk iki adım daha iyi mesaj verdikleri
için önlerinde duruyor.

## Canlı digest karşılaştırması

`PQWallet._computeDigest(address,uint256,bytes)` `public view` (bkz.
`contracts/src/PQWallet.sol:32`) ve mevcut on-chain `nonce`'u kullanır
(`:34`). Tarayıcıdan `eth_call` ile sorulup JS'in ürettiği digest'le ekranda
yan yana gösterilir. Sıfır maliyet, saniyeler.

Bu, Sprint 2'deki digest uyum testinin (`GOREV_SINIRLARI.md` Bölüm 4) canlı,
deploy edilmiş kontrat üzerindeki tekrarıdır — artık offline `cast` ile değil,
tarayıcıda gerçek kontrata karşı.

Kontrat mevcut on-chain nonce'u kullandığı için karşılaştırma yalnızca
imzalanan nonce güncelken anlamlıdır — bu zaten nonce kontrolüyle aynı koşul,
yani ek maliyet getirmiyor.

## Negatif kanıt

"Transfer geçti" tek başına imzanın doğrulandığını **kanıtlamaz**. Şüpheci bir
jüri üyesi "imza gerçekten kontrol ediliyor mu, yoksa kod onu yok mu sayıyor?"
diye sorabilir ve haklıdır. Bu yüzden ayrı bir buton:

- Saklanan imzanın **bir baytı bozulur**, `eth_call` yapılır
- Dönen `"PQWallet: invalid signature"` (bkz. `PQWallet.sol:44`) ekranda
  gösterilir
- Sıfır gaz, saniyeler

**Bozma işlemi saf olmak zorundadır.** `tamperSignature()` girdiyi yerinde
mutasyona uğratmaz; bozulmuş bir **kopya** döndürür ve modül state'indeki
gerçek imzaya dokunmaz.

Aksi halde: kullanıcı "bozuk imzayla dene"ye basar, sonra "gönder"e basar ve
bozuk imzayı zincire yollar; gerçek akış anlaşılmaz şekilde başarısız olur.
Bu, provada fark edilmeyip demoda çıkacak hata sınıfının ta kendisidir. Teste
açık bir assertion olarak girecek: **bozma çağrısından sonra saklanan imza
değişmemiş olmalı.**

## Owner mnemonic'i nereden geliyor

Bu bölüm plan yazılırken fark edilen bir boşluğu kapatıyor: tasarımın ilk hali
imzanın hangi anahtarla atılacağını hiç ele almamıştı.

**Sorun:** kanıt UI'ının 1. bölümü ("Anahtar Üret") **rastgele yeni** bir
mnemonic üretir. Zincirdeki `PQWallet`'ın `ownerPublicKey`'i ise 2. rotasyon
anahtarıdır (`sprint3-owner-key-rotation.md`). Rastgele anahtarla üretilen imza
`verify()`'dan `false` döner — uçtan uca akış, mevcut owner mnemonic'i
olmadan çalışmaz.

**Çözüm:** 1. bölüme "mevcut mnemonic'i içe aktar" alanı eklenir.

### Bağlayıcı kısıt: içe aktarılan mnemonic ekrana yazılmaz

Sayfa, ürettiği rastgele mnemonic'i DOM'a yazıyor (aşağıda "Bilinen sınırlar").
Aynı oturumda ekran kaydı alınacak. Bu ikisi gerçek owner mnemonic'iyle yan
yana gelirse kayıt, anahtarı jüriye/rapora taşır.

**Bedel artık rotasyon değil.** 1 Eylül'deki iki ifşa bedelsizdi çünkü kontrat
deploy edilmemişti. `PQWallet.ownerPublicKey` yalnızca constructor'da yazılıyor
(`contracts/src/PQWallet.sol:23`) ve onu değiştirecek fonksiyon yok — ABI'nın
tamamı `constructor`, `receive`, `_computeDigest`, `execute`, `nonce`,
`ownerPublicKey`, `verifier`. Üçüncü sızıntının çaresi **`PQWallet`'ı yeniden
deploy etmek**: yeni adres, Hakan'ın yeniden deploy + Etherscan verify'ı,
`docs/tx-hashes.md`'nin baştan yazılması,
`sprint3-live-signature-verification.md`'deki canlı doğrulama kanıtının
geçersizleşmesi.

İçe aktarılan owner mnemonic'i hiçbir koşulda:

1. **DOM'a yazılmaz** — 1. bölümün rastgele mnemonic'inden farklı olarak
   gösterilmez; yalnızca ondan türeyen açık anahtar gösterilir
2. Girdi alanı **`type="password"`** olur ve içe aktarma sonrası temizlenir
3. **Hata mesajlarına ham girdi olarak sarılmaz.** Bu kod tabanının "hangi alan
   hatalı, değeriyle söyle" deseni (`buildTransaction.js`) burada **tersine
   çalışır**: mnemonic'i ekrana basar. Bu alanda hata mesajı sabittir ve
   yakalanan istisnanın `message`'ı da basılmaz — bip39/WASM hatası girdiyi
   içerebilir
4. **`console`'a düşmez**

Ekran kaydından önce zorunlu kontrol: sayfa, DOM, console ve Network sekmesinde
mnemonic'in hiçbir parçası bulunmamalı. Hata yolu da denenmeli — sızıntı en çok
orada olur.

## Bakiye göstergesi

`PQWallet` bakiyesi ekranda gösterilir. İki işlevi var:

1. `value > bakiye` durumunu göndermeden yakalar
2. Transfer sonrası sayının düşmesi, işlemin gerçekleştiğinin görsel kanıtıdır

Kozmetik değil: kontratta ayrı bir bakiye kontrolü **yok**, yetersiz bakiye
dış `call`'da patlar ve mesaj generic `"PQWallet: call failed"` olur
(`PQWallet.sol:51`). Aynı mesaj hedef çağrının kendi revert'ini de kapsar.
Bakiye göstergesi bu ikisini ayıran tek şeydir.

## Gas

### Elimizdeki ölçümler tutarlı bir tahmin vermiyor

| Ölçüm | Gas | Kaynak |
|---|---|---|
| Saf `verify()`, `--gas-report` (kanonik) | 106.672 | `sprint0-c13-verifier-gas.md` |
| Saf `verify()`, test içi `gasleft()` | 110.194 | aynı belge — dış çağrı zarfını da sayıyor |
| Verifier testi, test seviyesinde | 235.165 / 383.119 | `SPHINCSVerifier.t.sol` |
| `PQWallet.execute()` gerçek verifier üzerinden | **1.130.002** | `sprint2-pqwallet-real-verifier-integration.md` |

Kaba tahmin ~200K çıkıyor (106.672 doğrulama + ~59.000 calldata + taban), ama
**`execute()`'un izole edilmiş gerçek on-chain maliyeti elimizde yok.** 1.13M
rakamı büyük olasılıkla Foundry'nin fixture okuma/JSON parse maliyetiyle şişmiş
ve gerçek maliyet bunun çok altında olmalı — ama "büyük olasılıkla" ile demo
gününe gidilmez.

### Fallback: 2.000.000

Tahmin başarısız olursa manuel gas limit **2.000.000**.

Önceki taslaktaki 500.000, doğrulanmamış bir tahminin katıydı — belirsizliği
çözmüyor, sadece öteliyordu. Fallback'in tek amacı "out of gas ile ölen demo
tx'i" ihtimalini sıfırlamak:

- Kullanılmayan gas **iade edilir**; yüksek tutmanın tek maliyeti peşin bloke
  edilen bakiyedir: 2.000.000 × ~1,1 gwei ≈ **0,0022 ETH**
- Sepolia blok gas limiti ~36M, yani 2M sorun değil
- Düşük tutmanın maliyeti ölü bir demo tx'i

Tek koşul: MetaMask hesabında bu limiti karşılayacak bakiyenin durması.

### Bugün ölçülecek

Gerçek tx atıldığı anda kullanılan gas ölçülecek, yukarıdaki tahmin tablosu o
gerçek sayıyla değiştirilecek ve kanıt notuna yazılacak. Tahminle yaşamayı
sürdürmeyeceğiz.

**Risk:** public RPC uç noktası bu calldata boyutunda `eth_estimateGas`'ta
zorlanabilir; MetaMask'in tahmini tutmayabilir. Fallback tam olarak bunun için
var.

## Hata durumları

| Durum | Davranış |
|---|---|
| MetaMask yok | Net mesaj, kurulum yönlendirmesi |
| Yanlış ağ | chainId söylenerek reddet — digest chainId'e bağlı |
| İmza yokken gönder | Engelle |
| **İmzadan sonra girdi değişti** | State temizlenir, "değerler değişti, yeniden imzala", gönder devre dışı |
| Nonce değişmiş | Engelle, yeniden imza iste |
| Digest uyuşmazlığı | Her iki digest'i göster, `fields` sapmasına işaret et |
| Ön-uçuş revert etti | Kontrattan dönen mesajı göster |
| Kullanıcı MetaMask'te reddetti | Sakin mesaj, hata değil |
| Gas tahmini başarısız | Manuel limite düş, kullanıcıya bildir |

Tüm hata metinleri `esc()` ile kaçırılır — mevcut alışkanlık, sayfa mnemonic'i
DOM'a yazıyor.

## Girdi alanları

- **Kalkan:** `tx-wallet`, `tx-nonce`
- **Kalan:** `tx-to`, `tx-value`, `tx-data`
- **Eklenen:** cüzdan adresi (salt okunur), nonce (salt okunur + Yenile),
  bakiye, bağlantı durumu, digest karşılaştırması, tx sonucu, negatif kanıt

## Test

| Ne | Nasıl |
|---|---|
| `encodeExecute()` | Üretilen calldata `cast calldata` çıktısıyla karşılaştırılır — bağımsız oracle, Sprint 2 digest deseninin aynısı |
| `tamperSignature()` saflığı | Çağrı sonrası girdinin değişmediği assert edilir |
| `readNonce()` / `readBalance()` | Gerçek Sepolia'ya karşı çalıştırılabilir kontrol |
| Uçtan uca | Tarayıcıda gerçek tx |

## Kanıt

- **Transfer tx hash'i Hakan'a gönderilir, `docs/tx-hashes.md`'ye o ekler.**
  Karar gerekçesi: `GOREV_SINIRLARI.md:83` bu dosyayı 🔴 HAKAN'a veriyor
  (append-only) ve `CLAUDE.md` kural 1 karşı tarafın dosyasına dokunmayı
  yasaklıyor. `:93`'teki append-only kuralı teknik çakışmayı zaten
  engelliyordu, yani engel teknik değil rol kararıydı — burada karara
  bağlanıyor. "Ya A ya B" olarak bırakılan adım, planda kimsenin üstlenmediği
  adım olur ve kanıt zinciri orada kopar.
  Bu ekleme, o dosyadaki *"Kapsam dışı: gerçek migration + transfer denemesi"*
  satırını kapatır.
- Akif'in kendi kanıt notu (`docs/evidence/crypto-tests/`) Hakan'ı beklemez —
  hash, ölçülen gas ve ekran görüntüleri oraya doğrudan yazılır.
- **Ekran kaydı çalıştığı anda alınır, sonraya bırakılmaz.** Cüzdanda 0.002 ETH
  var ve her prova onu eritiyor.
- Kanıt notu: `docs/evidence/crypto-tests/` altına.

## Operasyonel notlar

- **MetaMask hesabına Sepolia ETH bugün alınmalı** — faucet'ler sınırlı ve
  yarışma sabahı boş çıkabilir. En hızlı yol Hakan'ın test cüzdanından transfer
  (0.0466 ETH var; bir tx ~0.00022 ETH).
- **Gerçek tx bugün bir kez atılmalı** — gas tahmini/RPC riski demo gününe
  bırakılmaz.
- **`to` adresi kendi MetaMask hesabın olsun.** Böylece transfer edilen ETH
  sana geri gelir ve `PQWallet.receive()` (`PQWallet.sol:27`, mevcut) üzerinden
  cüzdana geri yollanabilir. Provalar bakiye yakmayı bırakır, geriye yalnızca
  gas maliyeti kalır — "0.002 ETH eriyor" endişesi tamamen ortadan kalkar.
  Prova döngüsü: gönder → ETH sende → cüzdana geri yolla → tekrarla.

## Bilinen sınırlar

- Nonce, imzalama ile gönderme arasında değişebilir. Kontrol ediliyor ama
  yarış penceresi teorik olarak kapanmıyor — ön-uçuş ikinci kalkan.
- Mnemonic tarayıcıda DOM'a yazılıyor (mevcut kanıt UI'ının bilinen özelliği).
  Üretim UI'ı değil; Sprint 4'te ele alınacak.
- `GOREV_SINIRLARI.md` Sprint 3 Akif satırı, ekran kaydı alınana kadar açık
  kalır.
