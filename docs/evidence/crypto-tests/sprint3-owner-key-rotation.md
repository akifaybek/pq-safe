# Sprint 3 — Public key "kesilmiş" bulgusunun çürütülmesi + owner anahtarı rotasyonu

**Tarih:** 1 Eylül 2026
**Yazan:** Akif
**İlgili dosyalar:** `contracts/test/SPHINCSVerifier.t.sol`,
`contracts/lib/sphincs-minus/signer-wasm/src/params.rs`,
`contracts/lib/sphincs-minus/signer-wasm/src/hash.rs`,
`contracts/src/verifier/SPHINCSVerifier.sol`

## Bağlam

Hakan, Sepolia deploy'u için kendisine gönderilen owner public key'ini
inceledi ve şunu bildirdi:

> "formatı doğru (128 hex/64 byte) ama içerik tuhaf: hem pkSeed'in hem
> pkRoot'un sonunda ~17 byte'lık sıfır dizisi var. Gerçek bir SPHINCS
> anahtarında bu neredeyse imkansız — muhtemelen kopyalarken bir yerde
> kesilip sıfırlanmış."

Bu belge iki şeyi kayda geçiriyor:

1. **Bulgu yanlıştı** — anahtar kesilmemişti, sıfırlar şemanın gereği.
2. **Anahtar yine de döndürüldü** — ilgisiz bir sebeple (aşağıda Bölüm 4).

---

## 1. Kök neden: sıfırlar C13'ün `N = 16` parametresinden geliyor

C13'te hash çıktısı 16 bayttır (128 bit), ama değerler 32 baytlık kelimelerde
(`U256`) taşınır. Aradaki farkı `mask_n()` kapatır:

`contracts/lib/sphincs-minus/signer-wasm/src/params.rs:3`
```rust
pub const N: usize = 16; // hash output bytes (128 bits)
```

`contracts/lib/sphincs-minus/signer-wasm/src/hash.rs:9,21-25`
```rust
pub type U256 = [u64; 4]; // big-endian word order: [0] = MSW

/// Apply N_MASK: keep top 128 bits, zero bottom 128 bits.
#[inline(always)]
pub fn mask_n(val: U256) -> U256 {
    [val[0] & N_MASK_HI, val[1] & N_MASK_LO, 0, 0]
}
```

Limb sırası big-endian (`[0] = MSW`) ve `mask_n` alt iki limb'i sıfırlıyor.
Sonuç: **her yarım = 16 anlamlı bayt + tam 16 sıfır bayt**, 32 baytlık
konteynere sola hizalanmış.

Hakan "~17 bayt" demişti; gözle sayım. Ölçülen değer **tam 16 bayt**.

`pkSeed`/`pkRoot`'un keygen'de `mask_n`'den geçtiği yer:
`signer-wasm/src/keygen.rs:44` ve `:97`.

> Not: bu davranış yeni bir keşif değil — `sprint1-wasm-signer-test.md`'nin
> "Notlar" bölümünde 19 Ağustos'ta zaten belgelenmişti. Bu belge o notu
> kaynak satırlarıyla ve çalıştırılabilir testlerle güçlendiriyor.

## 2. Kesilme olmadığının kanıtı: mnemonic'ten yeniden türetme

Anahtar, saklanan mnemonic'ten sıfırdan yeniden türetildi ve Hakan'a
gönderilen kayıtla karşılaştırıldı. Kopyalama sırasında kesilme olsaydı
yeniden türetilen değer farklı çıkardı.

```
=== Hakan'a gonderilen kayitla karsilastirma ===
pkSeed  ayni mi : true
pkRoot  ayni mi : true
concat  ayni mi : true
ecdsa   ayni mi : true
```

Ölçülen yapı:

| Alan | Uzunluk | Sondaki sıfır |
|---|---|---|
| `pkSeed` | 32 bayt | 16 bayt |
| `pkRoot` | 32 bayt | 16 bayt |
| `pkSeed‖pkRoot` | 64 bayt | — |

**Sonuç: anahtar eksiksiz ve doğru.**

## 3. Yanlış "düzeltme"nin sonucu — kalıcı testlerle sabitlendi

Sıfırların bir hata sanılıp temizlenmesi deploy'u kırardı. Bu senaryo artık
`contracts/test/SPHINCSVerifier.t.sol` içinde çalıştırılabilir üç testle
korunuyor (mevcut C13 KAT fixture'ı kullanılıyor — üretim anahtarına bağlı
değiller, çünkü sorun formatla ilgili, anahtarla değil):

| Test | Neyi sabitliyor |
|---|---|
| `test_PublicKeyHalvesAreNMasked` | Alt 16 baytın sıfır, üst 16 baytın dolu olması — `N=16` değişmezi |
| `test_ZeroStrippedPublicKeyReturnsFalseNotRevert` | Sıfırlar atılırsa 32 baytlık pubkey → `SPHINCSVerifier.sol:19` uzunluk kontrolü → `false` |
| `test_RightAlignedPublicKeyReturnsFalseNotRevert` | Anlamlı baytlar sağa hizalanırsa → referans kontrat non-canonical diye reddeder → `false` |

Üçüncü test, mevcut `test_NonCanonicalPublicKeyReturnsFalseNotRevert`'ten
farklı: o sentetik değerler (`1`, `2`) kullanıyor, bu ise **gerçek anahtarın
baytlarını** sağa hizalayarak gerçekçi yanlış-düzeltme senaryosunu kapsıyor.

Test çıktısı (`forge test --match-path test/SPHINCSVerifier.t.sol`):

```
Ran 11 tests for test/SPHINCSVerifier.t.sol:SPHINCSVerifierTest
[PASS] testFuzz_NeverReverts(bytes32,bytes,bytes) (runs: 256, μ: 6734, ~: 6705)
[PASS] test_EmptySignatureReturnsFalseNotRevert() (gas: 18539)
[PASS] test_NonCanonicalPublicKeyReturnsFalseNotRevert() (gas: 269501)
[PASS] test_PublicKeyHalvesAreNMasked() (gas: 5481)
[PASS] test_RejectsTamperedSignature() (gas: 324831)
[PASS] test_RejectsWrongMessage() (gas: 276156)
[PASS] test_RightAlignedPublicKeyReturnsFalseNotRevert() (gas: 273796)
[PASS] test_ValidSignatureVerifies() (gas: 383221)
[PASS] test_WrongPublicKeyLengthReturnsFalseNotRevert() (gas: 265766)
[PASS] test_WrongSigLengthReturnsFalseNotRevert() (gas: 18669)
[PASS] test_ZeroStrippedPublicKeyReturnsFalseNotRevert() (gas: 270000)
```

`SPHINCSVerifierTest` 8 → 11 test. Tüm repo: **28 → 31 test, hepsi geçiyor.**

## 4. Anahtar rotasyonu — iki kez (Hakan'ın bulgusuyla ilgisiz)

**Sebep:** bu araştırma sırasında `.env.pqwallet-owner-key`'in mnemonic'i **iki
kez** oturum çıktısına düştü. Repoya hiçbir aşamada bir şey yazılmadı, dosya
git-ignored kaldı. Her iki ifşa da aynı kök nedenden: *dosyanın tamamını okuyup
maskelemeye çalışmak.*

| # | Hata | Neden tutmadı |
|---|---|---|
| 1 | `sed -E 's/=.*/=<gizli>/'` ile maskeleme | Dosya `KEY=VALUE` değil **JSON** — desen hiçbir satıra uymadı, içerik olduğu gibi basıldı |
| 2 | `require()` ile okuyup alanları seçme | Dosyanın uzantısı yok; Node onu **JS sanıp** ayrıştırdı, `SyntaxError` mesajı sorunlu satırı (mnemonic'i) bastı |

**Ders (yöntem düzeltmesi):** gizli alan içeren bir dosya, maskelemek amacıyla
bile olsa, çıktısı görüntülenen bir komuta verilmez. Doğru yöntem, alanları
**adıyla seçmek**:

```bash
jq '{pkSeed, pkRoot, publicKeyConcat, ecdsaAddress, rotatedAt}' .env.pqwallet-owner-key
```

`jq` JSON'ı düzgün ayrıştırır ve yalnızca istenen alanları basar; hata
durumunda da dosya içeriğini dökmez.

**Neden yine de döndürüldü:** anahtar sadece Sepolia testnet demo cüzdanına
ait, değer taşımıyor. Ancak Hakan henüz deploy etmemişti — bu yüzden rotasyon
her iki seferde de **bedelsizdi**. Deploy'dan sonra dönmek yeniden deploy
anlamına gelirdi.

**Yapılanlar:**

- Kullanımdan kaldırılan iki anahtar yedeklendi (ikisi de git-ignored,
  `.gitignore`'daki `.env.*` kuralına takılıyor):
  - `.env.pqwallet-owner-key.retired-2026-09-01` — özgün anahtar
  - `.env.pqwallet-owner-key.retired-2026-09-01-b` — 1. rotasyonun anahtarı
- Her seferinde yeni 12 kelimelik BIP-39 mnemonic üretildi (128-bit entropi,
  `signer.js` ile aynı üretim yolu); mnemonic'i üreten script hiçbir aşamada
  onu yazdırmadı — ifşalar script'ten değil, dosyayı sonradan okuma
  girişimlerinden kaynaklandı
- `.env.pqwallet-owner-key` geçerli anahtarla güncellendi (`rotatedAt`,
  `rotationReason` alanları eklendi)

> **Temizlik notu (Akif'e):** iki `retired-*` dosyası ifşa olmuş mnemonic'leri
> içeriyor ve hiçbir yerde kullanılmıyor. Deploy tamamlandıktan ve yeni anahtarın
> zincirde çalıştığı doğrulandıktan sonra silinebilirler.

**Doğrulama (geçerli anahtar, 2. rotasyon çıktısı):**

```
   pkSeed bayt        : 32 (beklenen 32)
   pkRoot bayt        : 32 (beklenen 32)
   concat bayt        : 64 (beklenen 64)
   pkSeed sondaki 00  : 16 bayt (beklenen 16 — N=16 maskesi)
   pkRoot sondaki 00  : 16 bayt (beklenen 16 — N=16 maskesi)
   keygen deterministik: true
   eski anahtardan farkli: true
   imza suresi : 7912 ms
   imza uzunlugu: 3688 bayt (beklenen 3688)
```

Ayrıca yeni anahtarla üretilen imza, **gerçek `SPHINCSVerifier.sol`'e karşı
doğrulandı** (geçici bir Foundry testi ve geçici fixture ile; `foundry.toml`'a
geçici bir `fs_permissions` satırı eklenip test sonrası geri alındı — üretim
anahtarının imzası repoya kalıcı olarak konmadı). Sonuç: `true`. Yani Hakan'ın
eline geçen anahtarın deploy'da çalışmama ihtimali ölçülerek elendi.

Dikkat: **yeni anahtarda da her yarımda aynı 16 bayt sıfır var.** Bu, sıfırların
kopyalama kazası değil şemanın özelliği olduğunun ek kanıtı.

## 5. Geçerli public key (Hakan'a gönderildi)

```
pkSeed = 0x5c0adf0827fbca84b1ce745d683a6a3800000000000000000000000000000000
pkRoot = 0xa9c19bc9937bfaf35f4effe9b6faf21e00000000000000000000000000000000
```

`OWNER_PUBLIC_KEY` (birleşik, 64 bayt):

```
0x5c0adf0827fbca84b1ce745d683a6a3800000000000000000000000000000000a9c19bc9937bfaf35f4effe9b6faf21e00000000000000000000000000000000
```

Türetilen ECDSA adresi de her rotasyonda değişti:

| Anahtar | `publicKeyConcat` | `ecdsaAddress` |
|---|---|---|
| Özgün (kullanımdan kaldırıldı) | `0x49ba289e...f900000000000000000000000000000000` | `0xca5734ff56d9b23de8e85b36ccc75b75e994d199` |
| 1. rotasyon (kullanımdan kaldırıldı) | `0x2ae7aa3e...c300000000000000000000000000000000` | `0x8536dff65495d757ade8d1ae294f658bf3299ec9` |
| **2. rotasyon (geçerli)** | `0x5c0adf08...1e00000000000000000000000000000000` | `0x8f548c77997a9f5dbff8f45e14ebfa1118233a0d` |

**Yalnızca son satır kullanılmalı.** İlk iki anahtar geçersizdir; Hakan'a önce
1. rotasyonun anahtarı iletilmiş olabilir — deploy'dan önce bu tablodaki
geçerli değerle değiştirilmesi gerekir.

**Açık soru (Hakan'a soruldu):** Migration demosunda "eski ECDSA cüzdanı"
kimliği olarak bu `ecdsaAddress` kullanılacak mı? Bu, 26 Ağustos devir notunda
da netleştirilmemiş bir noktaydı.

## Sonuç

**Hakan'ın bulgusu geçersiz** — anahtar kesilmemişti, sondaki 16 bayt sıfır
C13'ün `N=16` parametresinin doğal sonucu. Bu değişmez artık üç kalıcı testle
korunuyor, yani aynı soru tekrar sorulduğunda cevap çalıştırılabilir.

**Anahtar ayrıca iki kez döndürüldü** — Hakan'ın bulgusuyla ilgisiz, iki ayrı
mnemonic ifşası nedeniyle; her ikisinde de deploy öncesi olduğu için bedelsizdi.
Geçerli anahtar gerçek verifier'a karşı doğrulandı. İfşaların ortak kök nedeni
ve yöntem düzeltmesi Bölüm 4'te kayıtlı.

**Devam eden blokaj değişmedi:** `docs/tx-hashes.md` hâlâ yok, Hakan'ın deploy
çıktıları hâlâ bekleniyor.
