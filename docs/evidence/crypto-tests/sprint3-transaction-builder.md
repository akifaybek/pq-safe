# Sprint 3 — İşlem oluşturma ve imzalama akışı kanıtı

**Tarih:** 28 Ağustos 2026
**Yazan:** Akif
**Dosyalar:** `frontend/src/tx/buildTransaction.js`,
`frontend/src/tx/build-transaction-test.mjs`, `frontend/index.html`,
`frontend/src/main.js`, `frontend/src/crypto/signer.js`

## Amaç

Frontend iki şeyi ayrı ayrı kanıtlamıştı ama birbirine bağlamamıştı:
`signer.js` rastgele bir digest'i imzalayabiliyordu (`sprint1-frontend-keygen-sign-ui.md`),
`digest.js` dondurulmuş formata göre digest üretebiliyordu (`sprint2-js-digest-function.md`).
Hiçbir akış ikisini birleştirmiyordu. Bu belge, kullanıcının girdiği gerçek
işlem alanlarından gerçek bir digest üretilip o digest'in gerçekten
imzalandığını kanıtlıyor.

Bu, uçtan uca akışın Hakan'ın deploy'una bağlı olmayan kısmının tamamı.

## Ortam

```
node    v22.21.0
vite    8.2.2 (dev server)
ethers  6.17.0
Chrome  (Playwright, channel: chrome) — macOS 15.6
```

## 1. Otomatik doğrulama — `buildDigest()`

`frontend/src/tx/build-transaction-test.mjs`, mevcut `.mjs` desenine uygun
(`wasm-signer-test.mjs`, `noble-risk-test.mjs`).

```
$ cd frontend && node src/tx/build-transaction-test.mjs; echo "exit: $?"
...
TÜM TESTLER GEÇTİ
exit: 0
```

**21 assertion** (10 değer karşılaştırması + 11 hata senaryosu), hepsi geçiyor.

Beklenen digest değerleri Foundry `cast` ile bağımsız olarak üretildi
(`sprint2-js-digest-function.md`), yani kendi kodunu kendine onaylatan bir
test değil:

| Test | Girdi | Beklenen (cast) |
|---|---|---|
| 1 | wallet `0x1234…7890`, nonce 0, to `0xabcd…abcd`, value `10^18`, data `0x` | DS `0x8110c08d…98e6a5`, digest `0x417663f3…3a4746` |
| 2 | aynı wallet, nonce 5, value 42, data `0xdeadbeef` | digest `0xc9463c60…32ec29` |

Kalan testler: checksum'suz adresin aynı digest'i vermesi, boş `data`'nın
`0x` sayılması, alan-adlı hata mesajları, uint256 sınırları ve normalize
edilmiş alanların döndürülmesi.

## 2. Tarayıcı doğrulaması — uçtan uca

Ön-doldurulmuş form (Test 1 vektörü) ile "Digest hesapla ve imzala":

```
DOMAIN_SEPARATOR : 0x8110c08d40ffb855149f3c041e89e6071a71c5f337ca317b9c24aea9da98e6a5
digest           : 0x417663f38b52fec7f71d3fb178fed03ac2559af424c9a01b72f65f23553a4746
value geri okuma : 1000000000000000000 wei = 1.0 ETH
imza             : 3688 bayt (C13 beklenen) ✓
imzalama süresi  : 9500.2 ms
keygen süresi    : 384.7 ms
```

DOMAIN_SEPARATOR ve digest, yukarıdaki `cast` değerleriyle **birebir aynı** —
yani tarayıcıdaki akış, bağımsız olarak doğrulanmış formatı üretiyor.

Ekran görüntüsü: `docs/evidence/screenshots/sprint3-transaction-builder.png`

**Süre notu:** imzalama süresi çalıştırmalar arasında değişiyor; aynı
makinede 6634 ms ve 9500 ms ölçüldü. `sprint1-wasm-signer-test.md`'deki
~7.5 sn ile aynı mertebede. Bu bir kanıt rakamı değil, kabaca bir gösterge.

## 3. Hata yolları

| Senaryo | Gözlenen |
|---|---|
| `to` = `0xzzz` | `Hata: to alanı geçerli bir adres değil: 0xzzz` |
| `nonce` boş / hiç verilmemiş | `nonce alanı boş bırakılamaz` |
| `value` = 2^256 | `value alanı uint256 sınırını aşıyor: …` |
| anahtar üretilmemiş | `Önce anahtar üret.` |

Hepsi **alan adını** taşıyor. Beş girdili bir formda ethers'ın çıplak
`invalid address` mesajı hangi alanı kastettiğini söylemediği için
kullanılamaz.

### Boş `nonce` neden hata veriyor

JavaScript'te `BigInt('') === 0n`. İlk implementasyonda boş, eksik veya
`null` bir `nonce` sessizce `0`'a çöküyordu — yani "nonce girmedim" ile
"nonce=0 girdim" ayırt edilemiyordu. SPHINCS- stateless olduğu ve leaf
sayacı bulunmadığı için **nonce bu projenin tek replay koruması**
(bkz. `CLAUDE.md`). Review bunu yakaladı, boş girdi artık açıkça
reddediliyor.

## 4. XSS doğrulaması

Hata mesajları kullanıcının girdiği ham değeri içeriyor (hangi alanın hatalı
olduğunu söylemek için) ve `innerHTML` ile basılıyor. Sayfa aynı zamanda
mnemonic'i DOM'a yazdığı için bu bir sızıntı yolu olurdu. Review yakaladı,
`esc()` yardımcısı eklendi ve dört hata bloğunun hepsine uygulandı.

Anahtar üretildikten sonra (yani mnemonic DOM'dayken) `to` alanına
`<img src=x onerror="window.__pwned=1">` yapıştırılarak test edildi:

```
window.__pwned      : undefined   ← script çalışmadı
DOM'da gerçek <img> : YOK
HTML kaçışlı mı     : EVET (&lt;img)
görünen metin       : Hata: to alanı geçerli bir adres değil: <img src=x onerror="window.__pwned=1">
```

Payload hata mesajına ulaşıyor (yani test gerçekten kaçışı sınıyor) ama
metin olarak gösteriliyor, çalıştırılmıyor.

## 5. Tasarım kararı: normalize edilmiş alanlar döndürülüyor

`buildDigest()` sadece hash'leri değil, normalize ettiği alanları da
(`fields`) döndürüyor. Gerekçe: sonraki adımda `execute()` calldata'sı bu
alanlardan kurulacak ve **digest'e giren byte'larla birebir aynı olmak
zorunda**, yoksa on-chain verifier `false` döner. Ham girdiden yeniden
normalize edilseydi ikinci bir normalizasyon yolu doğar ve sessizce
sapabilirdi — hata modu yerelde yeşil sayfa, zincirde çıplak revert olurdu.
Test 9 bunun regresyon guard'ı.

## Bilinen sınırlar

Bunlar "yapılmadı" değil, **şu an böyle** — sonraki adımda değişecekler:

- **Nonce serbest metin.** Bu akış replay korumasını *göstermiyor*; nonce
  sadece digest'e giren bir sayı. Gerçek koruma, nonce'un `PQWallet`'ın
  on-chain state'inden okunmasıyla test edilir ve Hakan'ın deploy adresine
  bağlı. Üretim UI'ında bu alan serbest metin olmayacak.
- **PQWallet adresi de girdi alanı.** Aynı gerekçe.
- Üretilen imza **on-chain doğrulanmıyor** (deploy edilmiş kontrat gerekir);
  imzalayan anahtar sayfanın rastgele anahtarı, gerçek owner anahtarı değil.
- `execute()` calldata'sı üretilmiyor, tx gönderilmiyor.
- Bu sayfa hâlâ kanıt arayüzü, üretim cüzdan UI'ı değil.

## Sonuç

İşlem alanlarından dondurulmuş formata uygun digest üretiliyor, üretilen
digest gerçekten imzalanıyor, ve digest bağımsız bir araçla (Foundry `cast`)
doğrulanmış değerle birebir eşleşiyor. Hakan'ın deploy çıktıları geldiğinde
geriye imzayı zincire göndermek kalıyor.
