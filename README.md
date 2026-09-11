# PQ-SAFE

Kuantum-güvenli (post-quantum) akıllı kontrat cüzdanı. Klasik ECDSA cüzdanların
yerini alacak, imza doğrulamasını SPHINCS- (C13 parametre seti) ile yapan bir
`PQWallet` kontratı ve eski ECDSA adreslerin sahipliğini kanıtlayıp yeni PQ
cüzdana bağlayan bir `Migration` kontratından oluşur.

## Mimari

Üç ana kontrat, `contracts/src/` altında:

- **`PQWallet.sol`** — Yetkilendirmesi tamamen SPHINCS- imza doğrulamasından
  gelen cüzdan kontratı. `msg.sender`'a bakılmaz; imzalı payload'ı kim
  gönderirse göndersin (relayer dahil) işlem yürütülür. Replay koruması
  `nonce` ile sağlanır (SPHINCS- stateless olduğu için leaf sayacı yok).
  `execute(to, value, data, signature)` çağrısı önce digest'i hesaplar
  (`_computeDigest`), imzayı doğrular, nonce'u artırır (checks-effects-interactions —
  dış çağrıdan ÖNCE), sonra hedefe çağrıyı yapar.

  Digest formülü (sabit, "dondurulmuş"):
  ```
  domainSeparator = keccak256(abi.encode(keccak256("PQSAFE_V1"), block.chainid, address(this)))
  digest = keccak256(abi.encode(domainSeparator, nonce, to, value, keccak256(data)))
  ```

- **`Migration.sol`** — Eski ECDSA cüzdanının sahibinin, o adresin private
  key'iyle imzalayarak "bu eski adres benimdir, şu yeni PQ cüzdana bağlıyorum"
  demesini sağlar. Para taşımıyor, sadece tek kullanımlık (bir daha asla
  tekrar edilemez) bir sahiplik kanıtı kaydediyor. İmza `personal_sign`
  (EIP-191, `"\x19Ethereum Signed Message:\n32"` öneki) ile atılır:
  ```
  MIGRATION_DOMAIN_SEPARATOR = keccak256(abi.encode(keccak256("PQSAFE_MIGRATION_V1"), block.chainid, address(this)))
  messageHash = keccak256(abi.encode(MIGRATION_DOMAIN_SEPARATOR, oldAddress, newAddress))
  ```

- **`verifier/SPHINCSVerifier.sol`** — `IPQVerifier` arayüzünü uygulayan,
  gerçek SPHINCS-/C13 doğrulamasını yapan sarmalayıcı kontrat. Asıl kriptografik
  doğrulama `lib/sphincs-minus` submodule'ündeki `SPHINCs-C13Asm.sol`
  (referans C13 verifier, inline assembly ağırlıklı) üzerinden yapılır;
  `SPHINCSVerifier` bunu `SPHINCSVerifier` constructor'ında otomatik deploy
  edip sarmalar.

Akış özeti: kullanıcı SPHINCS- private key'iyle bir işlemi (veya migration
kanıtını) imzalar → imza + payload zincire gönderilir (kim gönderirse
gönderilsin) → ilgili kontrat digest'i kendisi yeniden hesaplar ve imzayı
doğrular → doğrulama geçerse işlem yürütülür.

## Kurulum

Gereksinimler: [Foundry](https://book.getfoundry.sh/getting-started/installation) (`forge`, `cast`).

```bash
git clone --recurse-submodules <repo-url>
cd pq-safe/contracts
forge install   # submodule'ler eksikse
forge build
forge test
```

**Önemli:** Foundry projesinin kökü `contracts/` klasörüdür (`foundry.toml`
orada). `forge build` / `forge test` / `forge script` komutları repo kökünden
(`pq-safe/`) DEĞİL, **`contracts/` klasörünün içinden** çalıştırılmalı —
aksi halde Foundry proje sınırını bulamıyor ve `lib/sphincs-minus`
submodule'ünün nested bağımlılıklarını da derlemeye çalışıp "not found"
hatalarıyla patlıyor.

Derleyici ayarları (`contracts/foundry.toml`): solc `0.8.35`, `evm_version =
"shanghai"`, `optimizer = true` (`runs = 200`), `via_ir = true` (C13 referans
verifier'ın yoğun inline assembly kodu via_ir olmadan "stack too deep"
hatası veriyor).

### Sepolia'ya deploy

```bash
# contracts/ içinde, .env repo kökünde (gitignore'lu):
# SEPOLIA_RPC_URL=...  ETHERSCAN_API_KEY=...  PRIVATE_KEY=...  OWNER_PUBLIC_KEY=...
forge script script/Deploy.s.sol --rpc-url $env:SEPOLIA_RPC_URL --private-key $env:PRIVATE_KEY --broadcast --verify
```

## Deploy edilmiş adresler (Sepolia)

**Tarih:** 1 Eylül 2026 · **Deployer:** `0x7268A...075b6`

| Kontrat | Adres | Etherscan |
|---|---|---|
| SPHINCSVerifier | `0x143Db127BE77FdE689629b18F9F415014C514a2E` | [✅ Verified](https://sepolia.etherscan.io/address/0x143db127be77fde689629b18f9f415014c514a2e) |
| Migration | `0x93e2938A04AE4FbC59a5FDe59D7683667eDD5536` | [✅ Verified](https://sepolia.etherscan.io/address/0x93e2938a04ae4fbc59a5fde59d7683667edd5536) |
| PQWallet | `0x2EafA294C14b6752128bfd4f5873D1EA39f000BB` | [✅ Verified](https://sepolia.etherscan.io/address/0x2eafa294c14b6752128bfd4f5873d1ea39f000bb) |
| SphincsC13Asm (referans verifier, otomatik deploy) | `0x9565aFbbD79bCc685a1AEe598385f892cD32Fe68` | [✅ Verified](https://sepolia.etherscan.io/address/0x9565afbbd79bcc685a1aee598385f892cd32fe68) |

Toplam deploy gas maliyeti: 0.001389743953379859 ETH (1.256.479 gas, ort. 1,106 gwei).
Gerçek migration + transfer işlem hash'leri: `docs/evidence/tx-hashes.md`.

## Gas tablosu

Sprint 2 test-suite gas raporundan (`docs/evidence/gas-reports/sprint2.txt`,
26/26 test geçti):

| Kontrat.Fonksiyon | Min | Ort. | Medyan | Max | Çağrı sayısı |
|---|---|---|---|---|---|
| `PQWallet.execute` | 31.751 | 85.793 | 86.774 | 88.247 | 260 |
| `PQWallet._computeDigest` | 3.416 | 3.416 | 3.416 | 3.416 | 2 |
| `PQWallet.nonce` | 2.278 | 2.278 | 2.278 | 2.278 | 517 |
| `Migration.proveOwnership` | 25.174 | 49.585 | 26.385 | 73.791 | 523 |
| `Migration.MIGRATION_DOMAIN_SEPARATOR` | 148 | 148 | 148 | 148 | 265 |
| `SPHINCSVerifier.verify` | 589 | 1.672 | 589 | 111.074 | 265 |
| `SphincsC13Asm.verify` (referans) | 370 | 28.505 | 440 | 106.672 | 9 |

Deployment gas maliyetleri (aynı rapor):

| Kontrat | Deployment Cost | Deployment Size |
|---|---|---|
| PQWallet | 461.947 | 2.485 |
| SPHINCSVerifier | 460.466 | 1.865 |
| Migration | 289.095 | 1.227 |
| SphincsC13Asm | 0 (SPHINCSVerifier constructor'ı içinde deploy edilir) | 1.217 |

Gerçek Sepolia deploy'unda toplam gas: **1.256.479** (bkz. yukarıdaki "Deploy
edilmiş adresler" bölümü).

### Gerçek zincir ölçümü (Sepolia)

Yukarıdaki tablo Sprint 2 test suite'inden (mock verifier'lı testler dahil)
geliyor ve execute() ortalamasını olduğundan düşük gösteriyor. Gerçek Sepolia
işlemlerinde ölçülen rakamlar:

| İşlem | Gas | Not |
|---|---|---|
| `Migration.proveOwnership` | 73.753 | Gerçek migration tx, `0x1ccc11f1...c75a609` |
| `PQWallet.execute` (var olan alıcıya) | 233.429 | Gerçek transfer tx, `0xd62b812e...631ad9` |
| `PQWallet.execute` (hiç kullanılmamış/yeni adrese) | 258.429 | 233.429 + ~25.000 hesap oluşturma maliyeti (tahmini, henüz zincirde ölçülmedi) |

Detaylı analiz: `docs/evidence/gas-reports/sprint3-execute-real-gas.md`.
