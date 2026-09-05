# Sprint 3 — Owner mnemonic'ini içe aktarma ve kanarya ile sızıntı denetimi

**Tarih:** 5 Eylül 2026
**Yazan:** Akif
**Ağ:** Sepolia (chainId `11155111`)
**Araçlar:** Node.js v22.21.0, Vite 8.2.2, Playwright (headless Chromium), `cast` 1.7.1
**İlgili:** `docs/evidence/crypto-tests/sprint3-owner-key-rotation.md`,
`docs/evidence/crypto-tests/sprint3-ui-chain-rewiring.md`

## Bu belge ne kanıtlıyor

Sayfaya, zincirdeki `PQWallet`'ın owner mnemonic'ini **ekrana yazdırmadan** içe
aktaran bir alan eklendi. Bu belge dört şeyi kayda geçiriyor:

1. Mnemonic'in üç yüzeyin hiçbirinde görünmediği — **kanarya ile, otomatik**,
2. Sızıntı perimetresinin **boş bir test olmadığı** (pozitif kontrol),
3. İçe aktarılan anahtarın zincirdeki `ownerPublicKey` ile makine tarafından
   karşılaştırıldığı,
4. `btn-keygen` kilidinin **test edilebilir bir garanti** olduğu — kasten
   bozulduğunda test kırmızıya döndü.

> **Neden bu kadar sıkı:** `PQWallet.ownerPublicKey` yalnızca constructor'da
> yazılıyor (`contracts/src/PQWallet.sol:11,23`), setter yok. Bir sızıntının
> çaresi anahtar rotasyonu değil, kontratın **yeniden deploy'u**: yeni adres,
> Hakan'ın yeniden deploy + Etherscan verify'ı, `docs/tx-hashes.md`'nin baştan
> yazılması ve `sprint3-live-signature-verification.md`'deki canlı doğrulama
> kanıtının geçersizleşmesi. Task 7'de bu sayfanın ekran kaydı alınacak.

## 0. Gerçek owner mnemonic'i bu denetimde KULLANILMADI

`.env.pqwallet-owner-key` okunmadı, `cat`lenmedi, hiçbir komuta verilmedi.
Denetimin tamamı **atılabilir bir kanarya mnemonic'iyle** yapıldı
(`bip39.generateMnemonic(128)` ile üretildi, hiçbir varlığı kontrol etmiyor).
Sızıntı yolları hangi mnemonic olduğunu umursamaz — perimetreyi kanaryayla
sınamak, gerçek anahtarı ortaya koymadan aynı garantiyi verir.

Gerçek mnemonic'i **Akif elle girecek**, bu betik yeşile döndükten sonra.

## 1. Perimetre kanaryadan ÖNCE kuruldu

Sıra kasıtlı: sızdıracak değer ortaya konmadan önce üç yüzey kancalandı.

| Yüzey | Nasıl toplandı |
|---|---|
| DOM | `document.documentElement.outerHTML` |
| Console | `console.log/error/warn/info/debug/trace` sarmalandı |
| Ağ | `window.fetch` sarmalandı — giden istek URL'i + **gövdesi** |

### Perimetrenin kendisinde bulunan iki kusur (ikisi de düzeltildi)

Bu, denetimin en önemli kısmı: **ilk iki perimetre sürümü boş testti.**

1. **Gövdeler hiç yakalanmıyordu.** `fetch(url, init)` varsayıldı, oysa
   ethers bazı çağrıları tek bir `Request` nesnesiyle yapıyor → `init.body`
   her zaman `undefined`.
2. **Yakalanan gövde okunabilir metin değildi.** ethers `init.body`'yi
   `Uint8Array` olarak veriyor; `String(bytes)` `91,123,34,…` gibi ondalık
   bayt dizisi üretiyordu. Kanarya kelimesi orada **asla** görünmezdi —
   yani ağ kontrolü hep yeşil kalırdı. `TextDecoder` ile çözüldü.

### Pozitif kontrol (perimetrenin boş olmadığının kanıtı)

Düzeltmeden sonra, kanarya girilmeden önce zincir okuması tetiklendi:

```
POSITIVE_seesEthCallOrBalance : true
POSITIVE_seesWalletAddress    : true
methodsSeen : "method":"eth_getBalance", "method":"eth_chainId", "method":"eth_call"
```

Perimetre gerçek RPC gövdelerini okuyor. **Ancak o zaman** kanarya girildi.

## 2. Hata yolu (önce bu denendi — sızıntı en çok orada olur)

Alana geçersiz bir ifade yazıldı (`zzqqx gecersiz mnemonic denemesi wwvvu …`):

| Kontrol | Sonuç |
|---|---|
| Girdi alanı tipi | `password` |
| İçe aktarma sonrası alan | **boşaldı** |
| Hata metni | `Mnemonic içe aktarılamadı — 12 kelimelik geçerli bir BIP-39 ifadesi girin. (Ayrıntı güvenlik gereği gösterilmiyor.)` |
| Girilen ayırt edici kelimeler DOM'da | **yok** |
| Console'da | **yok** |
| Ağ gövdelerinde | **yok** |

## 3. Başarı yolu — kanarya

| Kontrol | Sonuç |
|---|---|
| Tam ifade DOM'da | **false** |
| Ardışık kelime çiftleri (2-gram) DOM'da | **[] (boş)** |
| Kelimeler (kelime sınırlı regex) DOM'da | **[] (boş)** |
| Console — 2-gram / kelime | **[] / []** |
| Ağ gövdeleri — 2-gram / kelime | **[] / []** |
| Alan içe aktarma sonrası | **boşaldı** |
| Ekranda gösterilenler | yalnızca `publicKey` ve ECDSA adresi |

Tek kelime yerine **2-gram**'a da bakıldı: BIP-39 kelimeleri (`large`, `tail`,
`usual`) sayfada tesadüfen geçebilir, ama ardışık iki kelimenin birlikte
geçmesi tesadüf değildir.

## 4. Zincirdeki `ownerPublicKey` ile otomatik karşılaştırma

`readOwnerPublicKey()` eklendi (`src/contracts/pqwallet.js`). Fragment
`PQWallet.sol:11`'deki `bytes public ownerPublicKey` için Solidity'nin ürettiği
getter'dan okundu, uydurulmadı. Canlı zincire karşı doğrulandı:

```
zincirdeki ownerPublicKey = 0x5c0adf0827fbca84b1ce745d683a6a3800000000000000000000000000000000
                            a9c19bc9937bfaf35f4effe9b6faf21e00000000000000000000000000000000
bayt uzunluğu = 64
2. rotasyon anahtarıyla (0x5c0adf08…) başlıyor: true
```

Üç dal da sınandı:

| Dal | Nasıl üretildi | Davranış |
|---|---|---|
| ✗ **Uyuşmuyor** | kanarya, **gerçek zincire** karşı | Anahtar temizlendi (`currentMnemonic`/`currentKeys` = null), keygen kilidi **açılmadı** |
| ⚠ **Doğrulanamadı** | zincir okuması başarısız | Anahtar korundu ama "teyit edilmedi" denildi, kilit **engellendi** |
| ✓ **Aynı** | `ownerPublicKey()` cevabı kanaryanın anahtarıyla yamalandı | ✓ mesajı, kilit **engellendi** |

✓ dalı için RPC cevabı yamalandı çünkü gerçek ✓ yalnızca gerçek owner
mnemonic'iyle üretilebilir — o da bu denetimde bilerek kullanılmadı. İlk
yamalama denemesi başarısız oldu (ethers `eth_chainId` ile `eth_call`'ı tek
batch'te yolluyor; batch'in yanlış girdisine cevap yazılıyordu), gerçek cevabı
alıp yalnızca ilgili `id`'nin `result`'ını değiştirerek düzeltildi.

## 5. `btn-keygen` kilidi — ve kilidi delen bulunmuş bir hata

İçe aktarma sonrası `btn-keygen` kalıcı olarak kapanıyor. Kilit açma butonu
bilerek yok; geri dönüş yolu sayfa yenilemek.

**Uygulama sırasında bulunan hata:** `btn-build-sign`'ın `finally` bloğu
Task 3'ten beri `btnKeygen.disabled = false` yazıyordu. Yani owner anahtarıyla
**bir imza atmak kilidi sessizce kaldırıyordu**. Düzeltme: kilidin tek sahibi
`ownerKeyLoaded`, `finally` de `btnKeygen.disabled = ownerKeyLoaded` yazıyor.

**Assertion'ın boş olmadığı kanıtlandı.** `finally` kasten `= false`'a
çevrildi, akış baştan koşuldu:

```
KASTEN BOZUK : ASSERT_afterSign_keygenStillDisabled = false  → KIRMIZI
GERİ ALINDI  : ASSERT_afterSign_keygenStillDisabled = true   → YEŞİL
```

Dosya `md5` ile birebir geri alındı (`477b2a86d6fc4dace834176384f32d65`),
`KASTEN` kalıntısı **0**.

## 6. Ham hata mesajı sızıntısı kapatıldı

`currentMnemonic`'i WASM'a veren **iki** yol var; ikisi de `e.message` basıyordu:

| Yer | Çağrı |
|---|---|
| `main.js` bölüm 2 "İmzala" | `signDigest(currentMnemonic, digest)` |
| `main.js` bölüm 4 "Digest hesapla ve imzala" | `buildAndSign({ mnemonic: currentMnemonic })` |

İkisi de `sign_from_mnemonic(mnemonic, …)`'e iniyor. Rust tarafı hatayı
`format!("invalid mnemonic: {e}")` ile sarıyor (`signer-wasm/src/keygen.rs:32`)
— bugün `bip39` v2'nin hata tipi kelimenin **indeksini** taşıyor, kelimeyi
değil, ama bu bizim değil üçüncü parti bir `Display` impl'inin garantisi ve bir
Rust `panic!`'i ayrı bir yol. `esc()` HTML kaçırır, **sızıntıyı değil**.

İkisi de sabit mesaja çevrildi ve `e` bilerek yakalanmıyor (opsiyonel catch
binding) — basılacak bir değişken ortada yok.

**Bedeli bilerek ödendi:** bölüm 4'ün catch'i `buildTransaction.js`'in alan
doğrulama mesajlarını (`to alanı geçerli bir adres değil: …`) da yutuyor. Onlar
`buildAndSign`'ın İÇİNDEN, yani mnemonic'i tutan çağrıdan geliyor; ucuz bir
taşımayla kurtarılamıyorlar. Teşhis okunabilirliği **Task 5'te**, ön-uçuş
revert metinleriyle birlikte ele alınacak.

**Bedelsiz kurtarılan bir mesaj:** `if (chainNonce === null)` kontrolü
başlangıçta `try`'ın içindeydi ve aynı sabit mesaja yutuluyordu. Mnemonic'le
hiçbir ilgisi olmadığı için `try`'ın önüne, kilitler alınmadan önce taşındı ve
kendi net mesajını basıyor — hiçbir eşleme kurulmadan. Demo sırasında en olası
hata "Zincirden yenile"ye basmayı unutmaktır; onu genel bir hata metninin
altında kaybetmek pahalıya patlardı.

RPC ulaşılamaz yapılarak (`VITE_SEPOLIA_RPC_URL` geçersiz bir adrese
yönlendirildi) `chainNonce` hiç set edilmeden sınandı:

```
tx-nonce-display : "—"   (zincir okunamadı, chainNonce null kaldı)
tx-out           : nonce henüz okunmadı — önce "Zincirden yenile"ye basın.
btn-build-sign   : yeniden etkin (erken return kilit bırakmıyor)
tx girdileri     : [false, false, false] (askıda kalmadı)
```

Gerçek RPC ile yanlış-pozitif vermediği de doğrulandı: nonce `0` okunduğunda
anahtarsız tıklamada çıkan mesaj `Önce anahtar üret.` — nonce guard'ı sessiz.

Kalan üç `e.message` (`refreshChainState`, keygen handler, bağlantı testi)
`grep` ile denetlendi: hiçbiri owner mnemonic'ine erişmiyor. Keygen handler'ı
kendi ürettiği rastgele mnemonic'i zaten kasten ekranda gösteriyor ve içe
aktarmadan sonra butonu kilitli.

Ayrıca `main.js`'te mnemonic'i DOM'a basan tek satır (`${currentMnemonic}`)
`esc()`'lendi — kilit bir gün gevşetilirse arkada ham interpolasyon kalmasın.

## 7. Tarayıcı parola yöneticisi

Ekran kaydı için ayrı bir risk: `type="password"` bir alan bir `<form>`
içindeyse Chrome "parolayı kaydet?" balonu çıkarabilir. Balon değeri
göstermez ama kayıtta açıklanması gereken bir şey olur ve kanarya testi bu
yüzeyi kapsamıyor.

`index.html`'de **hiç `<form>` etiketi yok**; alan çıplak bir `<section>`
içinde, `autocomplete="off"`, submit yok ve akış sayfa navigasyonu yapmıyor.
Chrome'un kaydetme balonu submit/navigasyon sinyaliyle tetiklendiği için
tetikleyici yüzey mevcut değil.

## 8. Yan doğrulamalar

- `vite build` — geçti
- `pqwallet-test.mjs` (`cast` oracle ile) — **9/9 assertion geçti**; yeni
  `ownerPublicKey` fragment'i calldata kodlamasını bozmadı
- Console — kanarya akışı boyunca **0 mesaj** (favicon 404 hariç)

## 9. Akif'e kalan tek adım

Bu denetim yeşil. **Gerçek owner mnemonic'ini elle girmek** kaldı:
`.env.pqwallet-owner-key`'deki ifadeyi alana yapıştır → "İçe aktar" → çıktıda
**`✓ Zincirdeki ownerPublicKey ile AYNI`** görünmeli. `✗` görürsen yanlış
mnemonic girilmiştir; anahtar zaten otomatik temizlenir.
