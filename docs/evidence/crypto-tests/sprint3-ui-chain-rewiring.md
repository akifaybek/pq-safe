# Sprint 3 — UI'ın zincire kablolanması (cüzdan adresi config'ten, nonce zincirden)

**Tarih:** 5 Eylül 2026
**Yazan:** Akif
**Ağ:** Sepolia (chainId `11155111`)
**Araçlar:** Node.js v22.21.0, Vite 8.2.2, Playwright (headless Chromium)
**İlgili:** `docs/superpowers/plans/2026-09-04-onchain-transaction-flow.md` (Task 3),
`docs/evidence/crypto-tests/sprint3-transaction-builder.md`

## Bu belge ne kanıtlıyor

4. bölümdeki `PQWallet adresi` ve `nonce` **girdi alanları kaldırıldı**. Adres
artık `src/config/contracts.js`'ten, nonce canlı `PQWallet.nonce()` çağrısından
geliyor. Bu belge üç şeyi kayda geçiriyor:

1. Sayfa açılışında zincir okumasının gerçekten çalıştığı,
2. Bu kablolamayla üretilen digest'in **canlı kontratın kendi hesabıyla
   birebir aynı** olduğu,
3. İmzadan sonra herhangi bir girdi değişince imzanın düştüğü.

> **Neden 2. madde önemli:** cüzdan adresi ve nonce artık kullanıcıdan
> gelmiyor. Yanlış bağlanmış olsalardı (örn. adres olarak `Migration`'ın
> adresi, ya da nonce olarak sabit `0`) sayfa yine yeşil görünür, digest yine
> hesaplanır, imza yine 3688 bayt çıkardı — hata ancak zincirde
> `PQWallet: invalid signature` olarak ortaya çıkardı. Bu yüzden digest
> deploy edilmiş kontrata sorularak doğrulandı.

## 1. Sayfa açılışında zincir okuması

Vite dev server, `http://localhost:5173`. Sayfa yüklenir yüklenmez
`refreshChainState()` çalışıyor. DOM'dan okunan değerler:

| Alan | Değer |
|---|---|
| PQWallet adresi (config'ten) | `0x2EafA294C14b6752128bfd4f5873D1EA39f000BB` |
| Zincirdeki nonce | `0` |
| Cüzdan bakiyesi | `2000000000000000 wei = 0.002 ETH` |
| `Zincire gönder` butonu | `disabled` |
| `Bozuk imzayla dene` butonu | `disabled` |
| Eski `#tx-wallet` girdisi | yok (kaldırıldı) |
| Eski `#tx-nonce` girdisi | yok (kaldırıldı) |

Console'da tek hata var: `favicon.ico 404` — sayfanın favicon'u yok, önceden
de vardı, işlevsel değil.

## 2. İmzalama ve digest'in canlı kontratla karşılaştırılması

Tarayıcıda: 1. bölümden yeni anahtar üretildi, `to` alanına
`0x000000000000000000000000000000000000dead` yazıldı, `value` varsayılan
(`100000000000000` wei), `data` = `0x`. "Digest hesapla ve imzala" tıklandı.

Tarayıcı çıktısı:

```
DOMAIN_SEPARATOR = 0xa6238098b5d49d6e94eb134fa1e5ce7f888c5a9f870626079776fb42874c228b
digest           = 0xf19b46d24d1dde78573f044d45ea4060b1e142c255b9a0820e61602b3c7f5a73
value geri okuma = 100000000000000 wei = 0.0001 ETH
imza uzunluğu    = 3688 bayt ✓ (C13 beklenen)
```

Aynı alanlar canlı `PQWallet._computeDigest()`'e soruldu (Node, gerçek Sepolia
RPC'si, `src/contracts/pqwallet.js`'in `readDigest`'i):

```
zincir nonce = 0
kontratın _computeDigest'i = 0xf19b46d24d1dde78573f044d45ea4060b1e142c255b9a0820e61602b3c7f5a73
tarayıcının ürettiği digest = 0xf19b46d24d1dde78573f044d45ea4060b1e142c255b9a0820e61602b3c7f5a73
✓ tarayıcı digest'i = canlı kontrat digest'i
```

**Bu assertion boş değil** — iki kasten sapma ayrıca sınandı ve ikisi de farklı
digest üretti, yani eşitlik tesadüf değil:

```
✓ negatif kontrol: yanlış cüzdan adresi (Migration) → 0xbf96d0fe9ecc02d8…
✓ negatif kontrol: nonce+1                          → 0x3e6b1c8481dac88d…
```

Yani hem `walletAddress`'in config'ten doğru geldiği hem de `nonce`'un zincirden
doğru geldiği ayrı ayrı kanıtlanmış oluyor.

## 3. İmzadan sonra girdi değişince imza düşüyor

İmzalama bittikten sonraki durum → `to` alanı değiştirildikten sonraki durum:

| | İmzadan sonra | `to` değiştirilince |
|---|---|---|
| `Zincire gönder` | **enabled** | `disabled` |
| `Bozuk imzayla dene` | **enabled** | `disabled` |
| `#send-out` | boş | "Değerler değişti — imza geçersiz kılındı, yeniden imzalayın." |

Geçişin `enabled → disabled` yönünde gerçekten gözlendiğine dikkat: buton
zaten kapalı olsaydı test hiçbir şey ispatlamazdı.

### Neden bu koruma var

`execute()` calldata'sı `signed.fields`'tan kuruluyor, DOM'dan değil. İmzadan
sonra ekrandaki `to` değiştirilir ve imza düşürülmezse, tx **eski** adrese
gider ama ekranda **yeni** adres yazar. Planın üç kalkanı da bunu göremez:
nonce doğrudur, canlı digest karşılaştırması uyuşur (ikisi de aynı eski
`fields`'tan gelir), `eth_call` ön-uçuşu geçer. Her şey yeşildir ve kullanıcı
yanlış bilgiye bakmaktadır.

### Brief dışı sertleştirme: imzalama penceresinde girdi kilidi

Brief'te olmayan, incelemede eklenen bir kapatma. İmzalama ~7.5 sn sürüyor ve o
pencerede `signed` hâlâ `null`. Kullanıcı o sırada `to`'yu değiştirirse
`invalidateSignature()` çalışır ama `if (!signed) return;` ile hemen çıkar —
hiçbir şey yapmaz. İmzalama bitince `signed` **eski** alanlarla kurulur ve
yukarıdaki hata modu, tam da onu önleyen fonksiyonun kör olduğu pencereden geri
girer.

Çözüm mevcut desenle aynı: `btnBuildSign`/`btnKeygen` zaten kilitleniyordu,
`tx-to`/`tx-value`/`tx-data` de kilitleniyor (`finally`'de açılıyor —
doğrulandı: imzalama sonrası üçü de `disabled === false`).

## 4. Kapsam dışı

- `Cüzdanı bağla` butonu HTML'e eklendi ama dinleyicisi yok — Task 4'e ait.
- `Zincire gönder` ve `Bozuk imzayla dene` butonları da dinleyicisiz; imzadan
  sonra `enabled` oluyorlar ama henüz bir şey yapmıyorlar (Task 5/6).
- `execute()`'un gerçek gas maliyeti hâlâ ölçülmedi; ilk gerçek tx'te ölçülecek.
