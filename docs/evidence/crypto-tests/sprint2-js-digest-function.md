# Sprint 2 — JS digest fonksiyonu

**Tarih:** 23 Ağustos 2026
**Yazan:** Akif
**Dosya:** `frontend/src/crypto/digest.js`

## Amaç

`docs/GOREV_SINIRLARI.md` Bölüm 4'te dondurulmuş digest formatını
(`keccak256(abi.encode(DOMAIN_SEPARATOR, nonce, to, value, keccak256(data)))`)
JS tarafında üreten fonksiyonu yazmak ve formatın doğru uygulandığını
kanıtlamak — bu, Hakan'ın `PQWallet.sol._computeDigest()`'i ile "digest
uyum testi"nden (Sprint 2'nin bitirici görevi) **önce** yapılması gereken
bağımsız bir doğrulama adımı.

## Yöntem

`PQWallet.sol` henüz yazılmadığı için (Hakan'ın Sprint 1 görevi, bu proje
takviminde Sprint 1 24-30 Ağustos), Hakan'ın kontratıyla gerçek bir yan
yana karşılaştırma henüz mümkün değil. Bunun yerine **Foundry'nin `cast`
CLI'ı** (`abi-encode` + `keccak`) ile bağımsız bir doğrulama yapıldı —
`cast`, Solidity'nin ABI kodlamasını (`abi.encode`) ve `keccak256`'ını
ayrı bir implementasyon olarak uyguluyor, bu yüzden "kendi kodum kendi
kendine katılıyor" değil, gerçek bir çapraz kontrol.

**Not:** Bu, Sprint 2'nin resmi "digest uyum testi" görevinin yerine
geçmez — o görev Hakan'ın gerçek `PQWallet.sol`'üyle yapılacak (bkz.
Kapsam Dışı). Bu belge sadece JS fonksiyonunun kendi başına doğru
olduğunu kanıtlıyor.

## Test 1 — boş `data`

```
chainId=11155111, walletAddress=0x1234567890123456789012345678901234567890
nonce=0, to=0xabcdefabcdefabcdefabcdefabcdefabcdefabcd, value=1000000000000000000, data=0x
```

| | cast (bağımsız) | JS (`digest.js`) |
|---|---|---|
| VERSION_TAG (`keccak256("PQSAFE_V1")`) | `0x2b5183369e211b22c659fbb16b053826a633cf1ec619ff23c7c67552f9998548` | (aynı, dahili sabit) |
| DOMAIN_SEPARATOR | `0x8110c08d40ffb855149f3c041e89e6071a71c5f337ca317b9c24aea9da98e6a5` | `0x8110c08d40ffb855149f3c041e89e6071a71c5f337ca317b9c24aea9da98e6a5` |
| DIGEST | `0x417663f38b52fec7f71d3fb178fed03ac2559af424c9a01b72f65f23553a4746` | `0x417663f38b52fec7f71d3fb178fed03ac2559af424c9a01b72f65f23553a4746` |

**Eşleşti.**

## Test 2 — dolu `data`, farklı nonce/value

```
nonce=5, to=0xabcdefabcdefabcdefabcdefabcdefabcdefabcd, value=42, data=0xdeadbeef
```

| | cast (bağımsız) | JS (`digest.js`) |
|---|---|---|
| DIGEST | `0xc9463c6053d8c0e0573012df0e7f5ab40fd74ffdbc840a65b3be0bd7b332ec29` | `0xc9463c6053d8c0e0573012df0e7f5ab40fd74ffdbc840a65b3be0bd7b332ec29` |

**Eşleşti.** (`keccak256(data)` dalı da doğrulandı — boş olmayan calldata
hash'i test 1'den farklı, beklenen dalı doğru kullanıyor.)

## Komutlar (tekrarlanabilir)

```bash
cast keccak "PQSAFE_V1"
cast abi-encode "f(bytes32,uint256,address)" <VERSION_TAG> <chainId> <walletAddress>
cast keccak <yukarıdaki encode çıktısı>   # DOMAIN_SEPARATOR
cast keccak 0xdeadbeef                     # örnek dataHash
cast abi-encode "f(bytes32,uint256,address,uint256,bytes32)" <DOMAIN_SEPARATOR> <nonce> <to> <value> <dataHash>
cast keccak <yukarıdaki encode çıktısı>   # DIGEST
```

```js
import { computeDigest } from './frontend/src/crypto/digest.js';
computeDigest({ chainId, walletAddress, nonce, to, value, data });
```

## Kapsam dışı / henüz yapılmadı

- **Asıl Sprint 2 "digest uyum testi" görevi** (`GOREV_SINIRLARI.md`):
  Hakan `PQWallet.sol._computeDigest()`'i yazdıktan sonra, aynı girdilerle
  onun Foundry testinin yazdırdığı digest ile bu JS fonksiyonunun ürettiği
  digest yan yana karşılaştırılacak. Bu belge o karşılaştırmanın yerine
  geçmiyor, ön koşulu karşılıyor.
- `computeDigest` henüz hiçbir UI akışına bağlanmadı (imzalama akışıyla
  birleştirme ayrı görev).

## Sonuç

JS digest fonksiyonu, dondurulmuş formatı bağımsız bir araçla (Foundry
`cast`) doğrulanmış şekilde doğru uyguluyor. Hakan'ın kontratı hazır
olduğunda gerçek uyum testine hazır.
