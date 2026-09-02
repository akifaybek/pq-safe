# Sepolia Deploy — Tx Hash'leri

**Tarih:** 1 Eylül 2026
**Deployer:** 0x7268A...075b6 (test cüzdanı)
**Deploy scripti:** `contracts/script/Deploy.s.sol`

## Kontratlar

| Kontrat | Adres | Tx Hash | Etherscan |
|---|---|---|---|
| SPHINCSVerifier | `0x143Db127BE77FdE689629b18F9F415014C514a2E` | `0x65ef52d56600b345ec4283c952893b972b2f16d5376613e85e3f475fa6e6e84d` | [✅ Verified](https://sepolia.etherscan.io/address/0x143db127be77fde689629b18f9f415014c514a2e) |
| Migration | `0x93e2938A04AE4FbC59a5FDe59D7683667eDD5536` | `0xde3080fe110bdad2e475bc25f975b0f2451651d5c20bc21d1bdad92ebfd7e8a2` | [✅ Verified](https://sepolia.etherscan.io/address/0x93e2938a04ae4fbc59a5fde59d7683667edd5536) |
| PQWallet | `0x2EafA294C14b6752128bfd4f5873D1EA39f000BB` | `0xaaf4f2188457be383aea9d6c60ad13f2461bbb772b512d93567239992e41680a` | [✅ Verified](https://sepolia.etherscan.io/address/0x2eafa294c14b6752128bfd4f5873d1ea39f000bb) |
| SphincsC13Asm (referans, SPHINCSVerifier constructor'ında otomatik deploy edilir) | `0x9565aFbbD79bCc685a1AEe598385f892cD32Fe68` | (aynı tx: SPHINCSVerifier) | [✅ Verified](https://sepolia.etherscan.io/address/0x9565afbbd79bcc685a1aee598385f892cd32fe68) |

**PQWallet constructor argümanları:** `verifier=SPHINCSVerifier adresi`,
`ownerPublicKey=pkSeed‖pkRoot` (Akif'in 2. rotasyon anahtarı, bkz. DECISIONS.md).

**Toplam gas maliyeti:** 0.001389743953379859 ETH (1256479 gas, ort. 1.106 gwei)

## Kapsam dışı / henüz yapılmadı

- Gerçek migration + transfer denemesi (bu belgeye ayrı satır olarak eklenecek)