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



## Gerçek işlemler

| İşlem | Tx Hash | Durum |
|---|---|---|
| `Migration.proveOwnership()` | [`0x1ccc11f14c8eaaad4fd0cb8e346234dc6256576c9e9c900c3632d4c32c75a609`](https://sepolia.etherscan.io/tx/0x1ccc11f14c8eaaad4fd0cb8e346234dc6256576c9e9c900c3632d4c32c75a609) | ✅ Başarılı (gas: 73753) |
| `PQWallet.execute()` (transfer, 0.001 ETH) | [`0xd62b812e6a0e0c31d79d4a85c1bd61c738e02368fe51490c57a19ea6ca631ad9`](https://sepolia.etherscan.io/tx/0xd62b812e6a0e0c31d79d4a85c1bd61c738e02368fe51490c57a19ea6ca631ad9) | ✅ Başarılı (gas: 233429) |
| `PQWallet.execute()` (0.0001 ETH, kendine iade) | [`0x320e03d98cec857bbae8ecb49bcb0736c960287d76a19f2fad39b471b09e50da`](https://sepolia.etherscan.io/tx/0x320e03d98cec857bbae8ecb49bcb0736c960287d76a19f2fad39b471b09e50da) | ✅ Başarılı (gas: 216.221) |
| `PQWallet.execute()` (0.0001 ETH, **kayıtlı demo**, nonce 5, soğuk+dolu alıcı) | [`0x6b8bbecd0bc7fefc36ed5120d09410af7aff970950599652510828c28cd312ff`](https://sepolia.etherscan.io/tx/0x6b8bbecd0bc7fefc36ed5120d09410af7aff970950599652510828c28cd312ff) | ✅ Başarılı (gas: 218.721) |
| `PQWallet.execute()` (0.0001 ETH, **C ölçümü**, nonce 6, soğuk+**boş** alıcı) | [`0x222556c3e0f9d2f5ff8661a1affcd8aa03d2b4120a539c65ea98a64044b11475`](https://sepolia.etherscan.io/tx/0x222556c3e0f9d2f5ff8661a1affcd8aa03d2b4120a539c65ea98a64044b11475) | ✅ Başarılı (gas: 243.817) |

> **24 Eylül 2026 eki.** Son satır Sprint 4'ün **kayıtlı demo koşusudur** ve
> Task 7 gas tablosunun **B satırının ölçümüdür** (soğuk + var olan alıcı,
> `data = 0x`). Ön kayıtlı `gasUsed` beklentisi sıfır farkla tuttu; ayrıntı,
> karşılaştırma tablosu ve ekran görüntüleri:
> `crypto-tests/sprint4-recorded-demo-run.md`. Sayılar burada tekrarlanmaz.
>
> **25 Eylül eki — ve yukarıdaki notun sınırı.** 24 Eylül notundaki
> *"son satır"* o gün için doğruydu; bugün tablonun son satırı **C
> ölçümüdür**. Hangi satırın hangisi olduğu hash'ten okunur:
> `0x6b8bbecd…` = B (soğuk + **dolu**), `0x222556c3…` = C (soğuk + **boş**).
>
> `0x222556c3…` Task 7 tablosunun **C satırının** ölçümüdür. Ön kayıtlı beklenti ikinci kez sıfır
> farkla tuttu; `z` uzlaştırması sonrası üç satırın farkları EVM'in kesin
> sayılarına tam oturdu. Ayrıntı: `crypto-tests/sprint4-c-row-measurement.md`
> ve gas tablosunun 25 Eylül tarihli eki. **Alıcı artık boş değil** — C bu
> adresle bir daha ölçülemez.
>
> Üstteki `216.221` satırı §13'te **216.269** olarak yeniden ölçülen koşudan
> ayrıdır ve **o günkü haliyle bırakılmıştır** — defter kuralı.
