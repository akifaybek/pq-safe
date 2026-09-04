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
```

## Kritik kural — calldata `fields`'tan kurulur

`execute()` argümanları, imzalama anında dönen `fields`'tan kurulur; DOM'dan
**yeniden okunmaz**. Ham girdiden tekrar normalize edilirse ikinci bir
normalizasyon yolu doğar ve digest'e giren baytlardan sessizce sapabilir.

Bu kuralın ihlalinin hata modu özellikle sinsidir: digest kayar, verifier
`false` döner ve ekranda **"PQWallet: invalid signature"** yazar — imza aslında
sağlamken. Yani hata mesajı seni yanlış yere bakmaya gönderir. Aşağıdaki
digest karşılaştırması tam olarak bu iki durumu ayırt etmek için var.

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

## Bakiye göstergesi

`PQWallet` bakiyesi ekranda gösterilir. İki işlevi var:

1. `value > bakiye` durumunu göndermeden yakalar
2. Transfer sonrası sayının düşmesi, işlemin gerçekleştiğinin görsel kanıtıdır

Kozmetik değil: kontratta ayrı bir bakiye kontrolü **yok**, yetersiz bakiye
dış `call`'da patlar ve mesaj generic `"PQWallet: call failed"` olur
(`PQWallet.sol:51`). Aynı mesaj hedef çağrının kendi revert'ini de kapsar.
Bakiye göstergesi bu ikisini ayıran tek şeydir.

## Gas

Beklenen maliyet ~200K:

| Kalem | Gas |
|---|---|
| Calldata (3688 baytlık imza, ~16 gas/bayt) | ~59.000 |
| C13 doğrulama (ölçülmüş) | ~107.000 |
| Taban + transfer | ~30.000 |

**Risk:** public RPC uç noktası bu calldata boyutunda `eth_estimateGas`'ta
zorlanabilir; MetaMask'in tahmini tutmayabilir.

**Karşılık:** tahmin başarısız olursa manuel gas limit fallback'i —
**500.000** (beklenenin ~2.5 katı). Kullanılmayan gas iade edildiği için
yüksek tutmanın maliyeti yok;
düşük tutmanın maliyeti "out of gas" ile ölen bir demo tx'idir. Tek koşul,
MetaMask hesabında o limiti karşılayacak bakiyenin durması.

## Hata durumları

| Durum | Davranış |
|---|---|
| MetaMask yok | Net mesaj, kurulum yönlendirmesi |
| Yanlış ağ | chainId söylenerek reddet — digest chainId'e bağlı |
| İmza yokken gönder | Engelle |
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

- Gerçek transfer tx'i geçtiğinde hash `docs/tx-hashes.md`'ye eklenir — o
  dosyadaki *"Kapsam dışı: gerçek migration + transfer denemesi"* satırı tam
  orada kapanır. (Dosya Hakan'ın; append-only kuralına uyularak eklenecek ya
  da ondan istenecek.)
- **Ekran kaydı çalıştığı anda alınır, sonraya bırakılmaz.** Cüzdanda 0.002 ETH
  var ve her prova onu eritiyor.
- Kanıt notu: `docs/evidence/crypto-tests/` altına.

## Operasyonel notlar

- **MetaMask hesabına Sepolia ETH bugün alınmalı** — faucet'ler sınırlı ve
  yarışma sabahı boş çıkabilir. En hızlı yol Hakan'ın test cüzdanından transfer
  (0.0466 ETH var; bir tx ~0.00022 ETH).
- **Gerçek tx bugün bir kez atılmalı** — gas tahmini/RPC riski demo gününe
  bırakılmaz.
- Provalarda küçük `value` kullan (ör. 0.0001 ETH); cüzdanda 0.002 ETH var ve
  Hakan'ın 0.001'lik transferi de oradan çıkacak.

## Bilinen sınırlar

- Nonce, imzalama ile gönderme arasında değişebilir. Kontrol ediliyor ama
  yarış penceresi teorik olarak kapanmıyor — ön-uçuş ikinci kalkan.
- Mnemonic tarayıcıda DOM'a yazılıyor (mevcut kanıt UI'ının bilinen özelliği).
  Üretim UI'ı değil; Sprint 4'te ele alınacak.
- `GOREV_SINIRLARI.md` Sprint 3 Akif satırı, ekran kaydı alınana kadar açık
  kalır.
