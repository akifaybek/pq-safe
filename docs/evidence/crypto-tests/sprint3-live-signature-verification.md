# Sprint 3 — Canlı Sepolia kontratlarına karşı imza doğrulaması

**Tarih:** 4 Eylül 2026
**Yazan:** Akif
**Ağ:** Sepolia (chainId `11155111`)
**Araçlar:** `cast` 1.7.1-Homebrew, Node.js v22.21.0
**İlgili:** `docs/tx-hashes.md` (Hakan), `docs/evidence/crypto-tests/sprint3-owner-key-rotation.md`

## Bu belge ne kanıtlıyor

Hakan deploy'u tamamladıktan sonra gerçek migration + transfer demosu için iki
imza istedi ve her ikisinin hash'ini **kendisi hesaplayıp** gönderdi. Bu belge
iki şeyi kayda geçiriyor:

1. **Zincire deploy edilen cüzdanın doğru anahtarla kurulduğu** — bağımsız
   olarak zincirden okunarak doğrulandı.
2. **İmzalanan hash'lerin körlemesine kabul edilmediği** — ikisi de bağımsız
   olarak yeniden hesaplandı, sonra üretilen imzalar canlı kontratlara karşı
   sınandı.

> **Neden bu önemli:** başkasının hesapladığı bir hash'i doğrulamadan imzalamak,
> imza sistemlerindeki en klasik hata sınıfıdır — imzalayan, ne imzaladığını
> bilmiyor demektir. İkinci hash bir para transferi yetkisi taşıyor. Bu adım
> güvensizlikten değil, disiplinden yapıldı; jüri "imzayı nasıl güvence altına
> aldınız" diye sorarsa cevabı budur.

## 0. Deploy edilen adresler (Hakan, `docs/tx-hashes.md`)

| Kontrat | Adres |
|---|---|
| `SPHINCSVerifier` | `0x143Db127BE77FdE689629b18F9F415014C514a2E` |
| `Migration` | `0x93e2938A04AE4FbC59a5FDe59D7683667eDD5536` |
| `PQWallet` | `0x2EafA294C14b6752128bfd4f5873D1EA39f000BB` |

## 1. Cüzdan doğru anahtarla mı deploy edildi?

Rotasyon sonrası (bkz. `sprint3-owner-key-rotation.md`) üç anahtar vardı ve
sadece sonuncusu geçerliydi. Zincirden okunarak doğrulandı:

```bash
cast call 0x2EafA294C14b6752128bfd4f5873D1EA39f000BB 'ownerPublicKey()(bytes)' --rpc-url <sepolia>
```

| Kontrol | Sonuç |
|---|---|
| `chainId` | `11155111` (Sepolia) ✅ |
| `ownerPublicKey()` | 2. rotasyon anahtarıyla **birebir aynı** ✅ |
| `verifier()` | `0x143Db127…` — deploy edilen `SPHINCSVerifier` ✅ |
| `nonce()` | `0` (henüz işlem yok) ✅ |

**Sonuç:** yeniden deploy gerekmiyor.

## 2. Migration hash'inin bağımsız yeniden hesabı

`Migration.sol` formatı (Hakan'ın kontratı, okundu):

```solidity
MIGRATION_DOMAIN_SEPARATOR = keccak256(abi.encode(keccak256("PQSAFE_MIGRATION_V1"), block.chainid, address(this)));
messageHash = keccak256(abi.encode(MIGRATION_DOMAIN_SEPARATOR, oldAddress, newAddress));
```

Önce domain ayracı, zincirden okunan değerle yerelde hesaplanan karşılaştırıldı:

```
zincirden : 0x8b5b9bccb94a7236dc146838282ed1047a6060d12359c0e4bee29735f9d1a069
yerelde   : 0x8b5b9bccb94a7236dc146838282ed1047a6060d12359c0e4bee29735f9d1a069   → eşleşti
```

Sonra `messageHash`:

```
oldAddress  = 0x8f548C77997A9F5DBFF8F45e14EBfA1118233a0d   (owner mnemonic'inden m/44'/60'/0'/0/0)
newAddress  = 0x2EafA294C14b6752128bfd4f5873D1EA39f000BB   (deploy edilen PQWallet)

yeniden hesaplanan : 0x3a346b12cc1347700dfeff32e04fa5b5025536533842367e5585fc7e4f118171
Hakan'ın verdiği   : 0x3a346b12cc1347700dfeff32e04fa5b5025536533842367e5585fc7e4f118171   → eşleşti
```

## 3. Transfer digest'inin bağımsız yeniden hesabı

**Önemli metodolojik nokta:** digest, `PQWallet._computeDigest()` çağrılarak
**doğrulanmadı**. O fonksiyon Hakan'ın kendi kodu; aynı kod yolundan iki kez
geçmek bağımsız doğrulama değildir. Bunun yerine Akif'in kendi JS uygulaması
(`frontend/src/tx/buildTransaction.js` → `frontend/src/crypto/digest.js`,
dondurulmuş formattan yazıldı ve Sprint 2'de Foundry `cast` ile bağımsız
doğrulandı) kullanıldı.

Girdiler:

```
walletAddress = 0x2EafA294C14b6752128bfd4f5873D1EA39f000BB
nonce         = 0
to            = 0x7268a7c3d52baa50486930e6ed25d29804d075b6
value         = 1000000000000000 (0.001 ETH)
data          = 0x
```

`to` adresini Hakan mesajında yazmamıştı ("benim test adresim"); PQWallet
deploy tx'inin göndereni zincirden okunarak bulundu
(`cast tx 0xaaf4f218…1680a --json | jq -r .from`) ve digest'in tutması bu
adresi teyit etti. Yine de Hakan'dan açık onay istendi — 0.001 ETH oraya
gidiyor.

```
domainSeparator (Akif JS) : 0xa6238098b5d49d6e94eb134fa1e5ce7f888c5a9f870626079776fb42874c228b

digest (Akif JS)   : 0x38ebc0579b396eb0dbfc014043971c5f5f7cbb586e4cca0e7e1507a781b91db9
Hakan'ın verdiği   : 0x38ebc0579b396eb0dbfc014043971c5f5f7cbb586e4cca0e7e1507a781b91db9   → eşleşti
```

Bu, Sprint 2'deki digest uyum testinin (`GOREV_SINIRLARI.md` Bölüm 4) **canlı
deploy üzerinde tekrarı** — artık sabit bir test adresiyle değil, Sepolia'daki
gerçek `PQWallet` adresiyle.

## 4. Üretilen imzalar ve yerel kontroller

### 4.1 ECDSA (migration)

`personal_sign` (EIP-191, `"\x19Ethereum Signed Message:\n32"` öneki), hash ham
32 bayt olarak imzalandı — string olarak değil.

```
signature = 0x76d29c784f8271c3d15f125644056565fa4a4e75df678d04cf8cff78dd3c2539
            2c0dc5c3e6deeeb5c6ca1441c147ded4290bb3d6904f81ad9dae5603a3db4f771b
```

`Migration.sol._recover()`'ın üç kontrolü yerelde önceden sınandı:

| Kontrol | Gereken | Ölçülen |
|---|---|---|
| Uzunluk | 65 bayt | 65 ✅ |
| `v` | 27 veya 28 | 27 ✅ |
| `s` | `<= secp256k1n/2` (low-s) | low-s ✅ |
| `ecrecover` sonucu | `oldAddress` | eşleşti ✅ |

### 4.2 C13 / SPHINCS- (transfer)

WASM signer (`frontend/src/crypto/wasm-pkg`) ile owner mnemonic'inden imzalandı.

```
uzunluk : 3688 bayt (C13 için beklenen)
süre    : 7824 ms
başı    : 0x7c69b9572d1a22546866f5f12ed26fc3...
sonu    : ...60d71b68204906bb900ed90d6819c9c3
```

## 5. Canlı kontratlara karşı doğrulama (asıl kanıt)

İmzalar Hakan'a gönderilmeden **önce**, Sepolia'daki gerçek kontratlara karşı
sınandı. İkisi de `cast call` — yani state değiştirmeyen simülasyon, gas
harcanmadı.

### 5.1 `Migration.proveOwnership()`

```bash
cast call 0x93e2938A04AE4FbC59a5FDe59D7683667eDD5536 \
  'proveOwnership(address,address,bytes)' \
  0x8f548C77997A9F5DBFF8F45e14EBfA1118233a0d \
  0x2EafA294C14b6752128bfd4f5873D1EA39f000BB \
  0x76d29c78... --rpc-url <sepolia>
```

**Sonuç: revert etmedi ✅** — imza zincirde geçerli. `migrated[oldAddress]`
çağrı anında `false` (henüz gerçek tx atılmadı, beklenen).

### 5.2 `SPHINCSVerifier.verify()`

```bash
cast call 0x143Db127BE77FdE689629b18F9F415014C514a2E \
  'verify(bytes32,bytes,bytes)(bool)' \
  0x38ebc057...1db9 <3688 baytlık imza> <64 baytlık publicKey> --rpc-url <sepolia>
```

**Sonuç: `true` ✅**

Bu, projenin en kritik zincirinin canlı ağda kapandığı andır: gerçek BIP-39
mnemonic → WASM C13 signer → dondurulmuş digest formatı → Sepolia'ya deploy
edilmiş gerçek `SPHINCSVerifier` → `true`.

## Bilinen sınırlar

- Bu belge **imza doğrulamasını** kanıtlıyor, tamamlanmış işlemleri değil.
  Gerçek migration + transfer tx'lerini Hakan atacak ve `docs/tx-hashes.md`'ye
  ekleyecek.
- Transfer digest'i `nonce = 0`'a bağlı. Transfer tx'inden önce cüzdandan başka
  bir `execute()` geçerse nonce artar ve bu imza geçersiz olur; o durumda yeni
  digest için yeni imza gerekir.
- Uçtan uca akışın ekran kaydı (Sprint 3'ün kalan Akif maddesi) henüz alınmadı;
  Hakan'ın tx'leri gelince yapılacak.
- `GOREV_SINIRLARI.md` Sprint 3 tablosundaki **Akif satırı hâlâ açık** ve öyle
  kalmalı — bu belge ağ katmanı + imza doğrulamasını kapsıyor, uçtan uca akışı
  değil.

## Sonuç

**PASS.** Deploy edilen cüzdan doğru anahtarı taşıyor; Hakan'ın verdiği iki
hash de bağımsız olarak yeniden üretildi; her iki imza da Sepolia'daki canlı
kontratlara karşı doğrulandı (`proveOwnership` revert etmedi, `verify` `true`
döndü).
