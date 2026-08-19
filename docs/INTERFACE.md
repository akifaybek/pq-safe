# PQ-SAFE — Arayüz Sözleşmesi

Bu dosya Akif (verifier + frontend) ile Hakan (cüzdan + migration) arasındaki
**dondurulmuş** sınırı tanımlar. Buradaki iki blok — `IPQVerifier` ve digest formatı —
değiştirilemez. Değişmesi gerekiyorsa önce `docs/DECISIONS.md`'ye yeni bir kayıt
eklenir ve iki taraf da onaylar.

## 0. İmza şeması adlandırması

Şema adı **SPHINCS-** (eksi/minus) olarak yazılır; bu bir yazım hatası veya
"SPHINCS+" bozulması **değildir** — Nico Consigny (Ethereum Foundation) tarafından
yayımlanan araştırmanın kasıtlı adıdır:
<https://ethresear.ch/t/sphincs-minus-efficient-stateless-post-quantum-signature-verification-on-the-evm/25165>

Parametre seti **C13** (Consigny'nin WOTS+C/FORS+C ailesi, counter-grinding'li):
h=22, d=2, a=19, k=7, w=8; resmi FIPS 205 seti değil, ePrint 2025/2203'teki bir
araştırma varyantı. (Önceki hedef SLH-DSA-SHA2-128-24'ten 19 Ağustos 2026'da
değiştirildi — sebep: `@noble/post-quantum` ve referans repodaki hazır WASM
imzalayıcı sadece C13'ü destekliyor, eski hedef için tarayıcıda çalışan hiçbir
hazır imzalayıcı yoktu. Ayrıntı: `docs/DECISIONS.md`.)

Doğrulama maliyeti **~105K gas** (kaynağın iddiası), bizim ortamımızda
**106,672 gas** ölçüldü ve doğrulandı — bkz.
`docs/evidence/gas-reports/sprint0-c13-verifier-gas.md`. İmza boyutu 3,688 bayt.

---

## 1. Doğrulayıcı arayüzü (dondurulmuş)

```solidity
interface IPQVerifier {
    function verify(bytes32 digest, bytes calldata signature, bytes calldata publicKey)
        external view returns (bool valid);
}
```

### Alanlar

| Alan | Tip | Ne işe yarar |
|---|---|---|
| `digest` | `bytes32` | İmzalanan mesajın 32 baytlık özeti. Bölüm 2'deki formülle **cüzdan kontratı** hesaplar. Verifier bu değeri sorgulamaz, olduğu gibi doğrulamada kullanır. |
| `signature` | `bytes` | SPHINCS- imzasının ham baytları. Uzunluğu sabittir (parametre setine bağlı); verifier beklenmeyen uzunlukta `false` döner. |
| `publicKey` | `bytes` | İmzayı doğrulayacak açık anahtarın ham baytları. Cüzdan bu anahtarı kendi state'inde tutar ve her çağrıda geçirir; verifier **stateless**'tır, hiçbir anahtar saklamaz. |
| dönüş `valid` | `bool` | İmza `digest` ve `publicKey` ile tutarlıysa `true`, aksi halde `false`. |

### Davranış kuralları

1. **Verifier ASLA revert etmez.** Geçersiz imza, hatalı uzunluk, bozuk anahtar —
   hepsinde dönüş `false`'tur. Sebep: cüzdan tarafının hata dalını tek bir
   `if (!valid) revert ...` ile yönetebilmesi ve revert sebebinin cüzdana ait olması.
2. **`view` fonksiyondur.** State yazmaz, event yayımlamaz. Böylece `eth_call` ile
   zincir dışından da bedelsiz denenebilir (frontend "imza geçerli mi?" ön kontrolü).
3. **Verifier adres/nonce/replay bilmez.** Replay koruması tamamen cüzdanın
   sorumluluğudur (bkz. `nonce`).
4. Aynı `(digest, signature, publicKey)` üçlüsü için sonuç her zaman aynıdır
   (deterministik, blok durumundan bağımsız).

### Sahiplik
- `contracts/src/interfaces/IPQVerifier.sol` — ortak dosya, iki taraf da değiştirmez.
- Uygulama: `contracts/src/verifier/` (Akif).
- Tüketici: `contracts/src/PQWallet.sol` (Hakan) — yalnızca bu arayüz üzerinden çağırır,
  somut verifier tipine bağımlı olmaz.

---

## 2. Digest formatı (dondurulmuş)

```solidity
digest = keccak256(abi.encode(DOMAIN_SEPARATOR, nonce, to, value, keccak256(data)));

DOMAIN_SEPARATOR = keccak256(abi.encode(keccak256("PQSAFE_V1"), block.chainid, address(this)));
```

### Alanlar

| Alan | Tip | Ne işe yarar |
|---|---|---|
| `DOMAIN_SEPARATOR` | `bytes32` | İmzayı **bu protokole, bu ağa ve bu cüzdana** bağlar. Aşağıda ayrı açıklandı. |
| `nonce` | `uint256` | Cüzdanın artan işlem sayacı. **Tek replay korumasıdır:** aynı imza ikinci kez sunulduğunda nonce artmış olduğu için digest farklı çıkar ve doğrulama başarısız olur. SPHINCS- stateless olduğu için ayrıca bir leaf/OTS sayacı **yoktur**. |
| `to` | `address` | İşlemin hedef adresi. İmzanın başka bir hedefe yönlendirilmesini engeller. |
| `value` | `uint256` | Gönderilecek ETH miktarı (wei). İmzalanan tutarın değiştirilmesini engeller. |
| `keccak256(data)` | `bytes32` | Çağrı verisinin (calldata) özeti. `data` değişken uzunlukta olduğu için doğrudan değil, hash'i kodlanır; böylece encode edilen yapı sabit boyutlu kalır. |

### `DOMAIN_SEPARATOR` bileşenleri

| Bileşen | Neyi engeller |
|---|---|
| `keccak256("PQSAFE_V1")` | Protokol/sürüm etiketi. Başka bir protokolde veya PQ-SAFE'in gelecek bir sürümünde üretilmiş imzanın burada geçerli sayılmasını engeller. |
| `block.chainid` | Zincirler arası replay. Sepolia'da imzalanan işlem mainnet'te (veya bir fork'ta) geçerli olmaz. |
| `address(this)` | Cüzdanlar arası replay. Buradaki `this` **cüzdan kontratının** adresidir; aynı açık anahtarla iki cüzdan dağıtılsa bile imzalar birbirine taşınamaz. |

> Not: `DOMAIN_SEPARATOR` cüzdan kontratında hesaplanır, verifier'da değil. Verifier
> yalnızca hazır `digest`'i alır.

### Kodlama detayı (frontend ile birebir uyuşmalı)

`abi.encode`'a giren beş alanın hepsi sabit boyutludur (`bytes32`, `uint256`,
`address`, `uint256`, `bytes32`), dolayısıyla sonuç dinamik offset içermeyen
**5 × 32 = 160 bayt**tır. Frontend tarafında aynı digest'i üretmek için tipler tam
olarak bu sırayla ve bu tiplerle kodlanmalıdır:

```js
// ethers v6
const digest = keccak256(
  AbiCoder.defaultAbiCoder().encode(
    ["bytes32", "uint256", "address", "uint256", "bytes32"],
    [domainSeparator, nonce, to, value, keccak256(data)]
  )
);
```

`abi.encodePacked` **kullanılmaz** — dondurulmuş format `abi.encode`'dur.

Bu eşleşme varsayım olarak bırakılmaz: `contracts/test/` içindeki bir test ile
zincir üstünde hesaplanan digest, frontend'in ürettiği digest'e karşı karşılaştırılır
ve çıktı `docs/evidence/crypto-tests/` altına kaydedilir.

---

## 3. Açık uçlar

Bu dosyada henüz dondurulmamış, ilk kontrat yazılırken karara bağlanacak ve
`docs/DECISIONS.md`'ye işlenecek noktalar:

- `signature` ve `publicKey` için beklenen tam bayt uzunlukları
  (C13 varyantının parametrelerinden gelecek — imza 3,688 bayt sabit).
- Cüzdan tarafında `verify` başarısız olduğunda dönecek revert sebebinin adı.
- `nonce`'un artırılma anı (doğrulamadan önce mi, çağrıdan sonra mı) ve reentrancy etkisi.
