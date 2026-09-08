# `PQWallet.execute()` gerçek gas maliyeti — 8 Eylül 2026

Devir notlarındaki "ölçümler 106.672 ile 1.130.002 arasında tutarsız" maddesi
bu belgeyle **kapanıyor**. `execute()`'un maliyeti artık tahmin değil, ölçüm.

## Gerçek zincir (Sepolia) — nihai rakam

| | |
|---|---|
| Tx | [`0xd62b812e…631ad9`](https://sepolia.etherscan.io/tx/0xd62b812e6a0e0c31d79d4a85c1bd61c738e02368fe51490c57a19ea6ca631ad9) |
| İşlem | `PQWallet.execute()` — 0,001 ETH transferi |
| **`gasUsed`** | **233.429** |
| Tx gas limiti | 300.000 (Hakan) |
| Blok | 11.653.023 |
| Doğrulama | `eth_getTransactionReceipt` → `status: 0x1`, `gasUsed: 0x38fa5`; `PQWallet.nonce()` 0 → 1, bakiye 0,002 → 0,001 ETH |

Gönderen Hakan (`0x7268a7c3…075b6`), imza Akif'in C13 imzası. Alıcı da
gönderenin kendi adresi — yani **var olan, sıcak (warm) bir hesap**; boş bir
hesaba transferde +25.000 hesap oluşturma bedeli eklenirdi.

## 1.130.002 rakamı neydi? (yanlış anlaşılma düzeltmesi)

`sprint2-pqwallet-real-verifier-integration.md`'deki
`test_RealWasmSignatureExecutesThroughRealVerifier() (gas: 1130002)` satırı
**hiçbir zaman `execute()`'un maliyeti değildi** — Foundry'nin test
fonksiyonunun tamamı için raporladığı sayıdır ve neredeyse tamamı kurulum
sırasındaki üç kontrat deploy'udur.

`forge test --mt test_RealWasmSignatureExecutesThroughRealVerifier -vvvv`
trace'inden, aynı test fonksiyonunun içi:

| Trace satırı | Gas |
|---|---|
| `test_RealWasmSignatureExecutesThroughRealVerifier` (tamamı) | 1.130.002 |
| `new SPHINCSVerifier` | 378.444 |
| `new SphincsC13Asm` | 238.488 |
| `new PQWallet` | 351.294 |
| `VM::readFile`, `VM::parseJson*` (fixture okuma) | **0** |
| **`PQWallet::execute`** | **164.313** |
| ├─ `SPHINCSVerifier::verify` | 108.574 |
| │  └─ `SphincsC13Asm::verify` | 106.672 |

Üç deploy tek başına ~968K. **Fixture okuma/JSON parse maliyeti sıfırdır** —
cheatcode'lar gas harcamaz. Devir notlarında ve spec'te geçen "fixture okuma
maliyetiyle şişmiş" ifadesi bu yüzden yanlıştı; şişiren şey deploy'lardı.

## İki sayı neden farklı: 164.313 → 233.429

Foundry'nin 164.313'ü **EVM içi** çağrının maliyetidir; zincire gönderilen bir
tx bunun üstüne işlem zarfını da öder:

| Kalem | Gas |
|---|---|
| Intrinsic (taban tx maliyeti) | 21.000 |
| Calldata: 3.908 bayt (201 sıfır × 4 + 3.707 sıfır-dışı × 16) | 60.116 |
| **Zarf toplamı** | **81.116** |

164.313 + 81.116 = 245.429 beklenirken **233.429 ölçüldü** — gerçek tx 12.000
daha ucuz. Bu fark tahmin edilmedi, **ölçüldü**: testin iki koşulu gerçek
zincirinkinden farklıydı ve her biri ayrı ayrı izole edildi.

### Ölçüm 1: alıcının var olması −25.000

Testteki alıcı `0x…cAFE` hiç var olmayan bir hesap; ona value göndermek
**yeni hesap oluşturma** bedeli doğuruyor. Gerçek tx'in alıcısı
(`0x7268a7c3…075b6`) zaten var olan bir hesap — üstelik tx'in göndereni, yani
EIP-2929 gereği başlangıç erişim listesinde, önceden sıcak.

Teste geçici olarak `vm.deal(RECIPIENT, 1)` eklenip alıcı var edildi:

| Koşul | `execute()` |
|---|---|
| Alıcı boş (mevcut test) | 164.313 |
| Alıcı var | **139.313** |

Fark tam olarak **25.000** — EVM'in yeni hesap oluşturma sabiti.

### Ölçüm 2: cüzdan storage'ının soğuk olması +8.000

Testte `execute()`'tan önce `ownerPublicKey()`, `nonce()` ve `_computeDigest()`
çağrılıyor (sanity kontrolleri). Aynı tx içinde yapıldıkları için cüzdanın
storage slotlarını **ısıtıyorlar**; gerçek zincirde `execute()` bu slotlara
soğuk erişiyor.

`vm.cool(WALLET_ADDR)` ile slotlar tekrar soğutuldu:

| Koşul (alıcı var, her ikisinde) | `execute()` |
|---|---|
| Storage sıcak | 139.313 |
| Storage soğuk | **147.313** |

Fark **8.000** = 4 soğuk SLOAD × (2.100 − 100). Okunan dört slot:
`nonce` (slot 1) + `ownerPublicKey`'in üç slotu (uzunluk + iki veri slotu).

### AÇIKLANMAMIŞ KALAN: 5.000

Düzeltilmiş tahmin: 147.313 + 81.116 = **228.429**. Gerçek ölçüm **233.429**.
**5.000 gas açıklanmadan kalıyor.**

En olası açıklama, `execute()`'un çağırdığı iki kontratın (`SPHINCSVerifier` ve
onun içindeki `SphincsC13Asm`) gerçek zincirde soğuk adresler olması:
2 × (2.600 − 100) = 5.000, rakamla birebir örtüşüyor. **Ama bu ölçülemedi:**
`vm.cool` bu iki adrese uygulandığında `execute()` 147.313'te kaldı, yani
cheatcode hesap sıcaklığını (yalnızca storage'ı) sıfırlamıyor. Kontrol koşusu:
sadece `vm.cool(WALLET_ADDR)` ile de sonuç aynı 147.313.

Dolayısıyla bu 5.000 **hesaplanmış bir eşleşmedir, doğrulanmış bir teşhis
değildir.** Jüri sorarsa verilecek cevap budur. Kesin çözüm için gereken:
`--fork-url` ile gerçek tx'in bir önceki bloğunda koşan bir test (arşiv RPC'si
gerekir) — yapılmadı, çünkü **bağlayıcı sayı zaten gerçek zincirdeki
233.429'dur**; bu ayrıştırma yalnızca "sayıyı anlıyor muyuz"un kontrolü.

### Özet

| Kalem | Gas | Nasıl |
|---|---|---|
| `execute()` EVM içi, gerçek zincir koşullarına yaklaştırılmış | 147.313 | ölçüldü |
| Intrinsic + calldata | 81.116 | hesaplandı (EIP-2028 tarifesi) |
| Açıklanmamış kalan | 5.000 | **ölçülmedi** — muhtemel: 2 soğuk kontrat erişimi |
| **Gerçek tx** | **233.429** | **ölçüldü (zincir)** |

Calldata'nın 3.908 baytının ~3.750'si C13 imzasıdır — `execute()` maliyetinin
en büyük tek kalemi doğrulama (108.574) değil, doğrulama + imzayı zincire
taşıma bedelidir (108.574 + 60.116 ≈ 169K, toplamın %72'si).

## Sonuç: gas fallback 2.000.000 → 350.000

Spec'teki 2.000.000'luk fallback, `execute()`'un gerçek maliyeti bilinmediği
için seçilmişti (bkz.
`docs/superpowers/specs/2026-09-04-onchain-transaction-flow-design.md`, "Gas").
Gerekçesi ortadan kalktı: ölçülenin ~8,6 katı.

Yeni değer **350.000** — ölçülenin ~1,5 katı. Payın kapsadıkları:

- **Yeni bir alıcıya transfer: +25.000** (yukarıda ölçüldü). 233.429 var olan
  bir alıcıya yapılan transferdi; demoda daha önce hiç kullanılmamış bir adrese
  gönderilirse maliyet 258.429'a çıkar. 350.000 bunu da rahat kapsıyor.
- `data` alanı dolu bir çağrı (birkaç yüz bayt calldata → +birkaç bin gas)
- Hakan'ın gerçek tx'te kullandığı 300.000'in üstünde kalması

Kullanılmayan gas iade edildiği için tek maliyet peşin bloke edilen bakiye:
350.000 × ~1,1 gwei ≈ **0,00039 ETH** (2.000.000'de bu 0,0022 ETH idi —
Sepolia ETH'in kıt olduğu bir demoda anlamlı bir fark).

Bu fallback yalnızca `estimateGas` **başarısız olduğunda** devreye girer;
normal yolda tahmin + %20 pay kullanılır.

## Yeniden üretme

```bash
cd contracts
forge test --mt test_RealWasmSignatureExecutesThroughRealVerifier -vvvv
# trace'te: [164313] …::execute, [108574] SPHINCSVerifier::verify

# Gerçek tx (RPC gerektirir):
cast receipt 0xd62b812e6a0e0c31d79d4a85c1bd61c738e02368fe51490c57a19ea6ca631ad9 \
  --rpc-url "$SEPOLIA_RPC_URL" | grep gasUsed
```

25.000 ve 8.000 ölçümleri, `test_RealWasmSignatureExecutesThroughRealVerifier`
içine `execute()` çağrısından hemen önce **geçici olarak** şu satırlar eklenip
alındı (testin kendisi değiştirilmedi, çalışma ağacı temiz bırakıldı):

```solidity
vm.deal(RECIPIENT, 1);   // alıcıyı var et      -> 164.313'ten 139.313'e
vm.cool(WALLET_ADDR);    // storage'ı soğut     -> 139.313'ten 147.313'e
```
