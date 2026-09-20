# Sprint 4 — Gas tablosu ve ikinci tx (Task 5 faz 1 / Task 6 faz 2)

Plan: `docs/superpowers/plans/2026-09-14-sprint4-demo-measurement-report.md`
Başlangıç commit'i: `ae02020`

---

## 0. Kapı ve ön koşullar

### Adım 0 — NONCE KAPISI

`cast nonce <PQWALLET>` **kullanılmadı.** Kontrat hesabında EIP-161 gereği her
zaman `1` döner; replay korumasını sağlayan sayı kontratın storage'ındaki
`nonce()` değişkeni ve ona ancak `cast call` ile bakılır. Planın 585. satırı bu
yüzden düzeltilerek koşuldu (plan dondurulmuş, düzeltme kaydı
`.superpowers/sdd/progress.md`).

| zaman (UTC) | blok | `nonce()` | bakiye (wei) | ne |
|---|---|---|---|---|
| 2026-09-19 08:46 | 11736605 | 2 | 50900000000000000 | ön-kontrol |
| 2026-09-20 11:56 | 11744141 | 2 | 50900000000000000 | ön-kontrol |
| _(Adım 4'ten hemen önce doldurulacak)_ | | | | **KAPI** |

**Üç okuma da birbirinin yerine geçmez.** Kapının koruduğu şey oturum anıdır:
araya giren bir `execute()` herhangi bir okumadan sonra da girebilir. Tabloya
kapı olarak yalnızca son satır girer; ilk ikisi ön-kontroldür.

`B0` (Task 6 Adım 8'in `B0 - value` formülünün girdisi) son satırdan okunur.

### Adım 3 — C adresinin boşluğu

`C = 0xD999e3B2e4bE3D3ECb7523b8Cb4F4Dc99e2734Fc`

2026-09-20 12:11 UTC, blok 11744214, publicnode:

```
cast balance  → 0
cast nonce    → 0
cast code     → 0x
```

Üçlü tuttu, C satırı ölçülebilir. `cast nonce` burada **doğru** komuttur:
C bir EOA adresi ve ölçülen şey zaten hesap nonce'u.

> Bu da tarihli bir okumadır. 19 Eylül 11:18 UTC'de aynı üçlü alınmıştı ve o
> okuma bugünün boşluğunu göstermiyordu; bugünkü okuma da gönderim anının
> boşluğunu göstermez. Planın kendi cümlesi: *"faz 1'de boş olması haftaya boş
> olduğunu göstermez."* C'ye fon girerse `+25.000` boş-hesap-oluşturma kalemi
> düşer ve C satırının beklenen değeri çürür — beklenti değil, ön koşul.

### Adım 1–2 — ölçüm kancası

`window.__m4` `frontend/src/main.js` sonuna eklendi. Kanca **yeni mantık
yazmıyor**: dondurulmuş `buildAndSign`'ı, `main.js:656`'daki `encodeExecute`
çağrısını ve `sendTransaction.js:201`'deki tahmin satırının birebir aynısını
çağırıyor.

```
KANCALI_MD5 = 714049c4373ac16f5534597c364560ab   (frontend/src/main.js, 988 satır)
```

`npx vite build` yeşil (190 modül, 174 ms). Kanca Task 5B Adım 2'de silinecek;
kayıt **kancasız ve commit'li** ağaçtan alınacak.

---

## 1. BEKLENEN DEĞERLER — ölçümden ÖNCE yazıldı

**Bu bölüm Adım 6 koşulmadan önce yazılmıştır** (plan Adım 9). Yazılma anı:
2026-09-20, `nonce()` kapısı açılmadan ve mnemonic girilmeden önce.

Yürütme sütununda beklenen:

```
B − A = +2.500      (EIP-2929 soğuk hesap erişimi: 2.600 − 100)
C − A = +27.500     (+2.500 soğuk erişim, +25.000 boş hesap oluşturma)
```

**Tutmazsa hipotez çürümüştür ve öyle yazılır.**

### Hipotezin ön koşulu: `from` üç çağrıda da AYNI

A satırı "sıcak alıcı"dır ve sıcak olmasının **tek** sebebi `execute()`'un iç
`to`'sunun tx göndericisiyle aynı adres olmasıdır (EIP-2929 `tx.origin`'i baştan
sıcak listeye koyar). MetaMask'te hesap değişirse `from` sessizce kayar, A'nın
iç alıcısı soğur, tahminine `+2.500` girer, `B − A ≈ 0` çıkar ve yanlışlıkla
"hipotez çürüdü" yazılır. Çürüyen hipotez değil, **ölçümün ön koşulu** olur.

Bu yüzden `from` örtük davranışa bırakılmıyor, **ölçülüyor**: kanca
`signer.getAddress()` sonucunu döndürüyor. `"bitti"` ölçütü: on beş çağrının
on beşinde de `from` aynı ve `A` adresine eşit.

> **Örtük dolduruluş kaynaktan teyit edildi:** `signer.estimateGas()` çağrıyı
> sağlayıcıya vermeden önce `populateCall`'dan geçiriyor ve `from` boşsa
> `pop.from = signer.getAddress()` yapıyor
> (`ethers@6.17.0`, `lib.commonjs/providers/abstract-signer.js`, else dalı).
> Yani sıfır adresi varsayımı bu yolda oluşmuyor — Δ₁ de aynı yoldan geldiği
> için tabanı sağlam. Kanca yine de ayrıca ölçüyor: teyit edilmiş davranış,
> ölçülmüş değerin yerine geçmez.

### Adresler

| satır | iç `to` | adres | neden |
|---|---|---|---|
| A | `from`'un kendisi | `0xe0bf2d190f8e2f2fc97cf19244845f8febdb7351` | sıcak alıcı |
| B | var olan başka adres | `0x7268a7c3d52baa50486930e6ed25d29804d075b6` | soğuk, dolu (Hakan EOA) |
| C | boş adres | `0xD999e3B2e4bE3D3ECb7523b8Cb4F4Dc99e2734Fc` | soğuk, boş |

Satırlar arasındaki **tek değişken** `execute()`'un iç `to`'sudur. `value` üçünde
de `100000000000000n` (0,0001 ETH), `data` üçünde de `0x`.

---

## 2. Tekrar testi — Adım 6

_(ölçümden sonra doldurulacak)_

## 3. İkinci endpoint — Adım 7

_(ölçümden sonra doldurulacak)_

## 4. Intrinsic ayrıştırması — Adım 8

_(ölçümden sonra doldurulacak)_

> **Ayrım, tablo yazılmadan önce:** B ve C'nin tekrarları **determinizmi**
> ölçüyor, Δ'yı değil. Δ ancak gerçek receipt'in olduğu yerde hesaplanır, o da
> **yalnızca A**. Bu cümle yazılmazsa tablo "C'nin Δ'sını ölçtük" diye okunur.
