# Sprint 4 — Ekran tutarlılığı: bayat imza bloğu

**Tarih:** 15 Eylül 2026
**Yazan:** Akif
**Ağ:** Sepolia (chainId `11155111`) — kalkan 1 ve 2 canlı zincire soruldu
**Araçlar:** Node.js v22.21.0, Vite 8.2.2, Playwright (`playwright-core` 1.62.1,
önbellekteki headless chromium-1234)
**İlgili:** `docs/superpowers/plans/2026-09-14-sprint4-demo-measurement-report.md` (Task 1),
`docs/superpowers/specs/2026-09-14-sprint4-scope-design.md` § K1

> **ZİNCİRE TX ATILMADI.** Owner mnemonic'i kullanılmadı;
> `.env.pqwallet-owner-key` açılmadı, hiçbir komuta verilmedi. Üç senaryonun
> üçü de `btn-keygen`'in ürettiği **rastgele** anahtarla koşturuldu. Gönderim
> senaryolarında `eth_sendTransaction` hiç yayınlanmadı (sahte signer — § 4).

---

## 1. Bu belge ne kanıtlıyor

`main.js`'te **ölçülmüş** bir ekran çelişkisi vardı: `#tx-out` bölgesi imza
bloğunu (DOMAIN_SEPARATOR, digest, 3688 baytlık imza) tutuyor ve imza
düştüğünde ya da tüketildiğinde **hiç güncellenmiyordu**. Sonuç, aynı karede
iki çelişen cümle:

| `#tx-out` (bayat) | `#send-out` (güncel) |
|---|---|
| "İmza (3688 bayt) … ✓ imzalama tamamlandı" | "Değerler değişti — imza geçersiz kılındı" |
| "İmza (3688 bayt) … ✓ imzalama tamamlandı" | "İşlem zincire gönderildi ve onaylandı" |

Bu kare demo kaydına giriyor. Belge üç şeyi kayda geçiriyor:

1. Kusurun **ölçüldüğü** (kod sayımı + kırmızı test),
2. Düzeltmenin kusuru gerçekten kapattığı (aynı testin yeşile dönmesi),
3. Düzeltmenin **fazla geniş olmadığı** — revert dalında imza korunuyor ve
   blok da korunuyor (Senaryo C).

---

## 2. Ölçülen kusur (düzeltmeden önceki kaynak)

`frontend/src/main.js`, commit `3c3368d` hâli, md5 `2843d19f7f7fe63f2f0737b19728ee6d`:

```
$ grep -n "innerHTML = ''" src/main.js
147:  chainWarn.innerHTML = '';
601:  chainWarn.innerHTML = '';
824:  chainWarn.innerHTML = '';
```

`innerHTML = ''` dosyada **yalnızca 3 kez** geçiyor ve **üçü de** `chainWarn`.
Diğer yedi çıktı bölgesi (`sendOut`, `txOut`, `signOut`, `keygenOut`,
`walletOut`, `connectionOut` ve göstergeler) hiç temizlenmiyor — yalnızca kendi
handler'ları yazınca değişiyorlar.

```
$ grep -n "txOut" src/main.js
184:const txOut = document.getElementById('tx-out');
272,281,315,338,351,376  ← hepsi btn-build-sign handler'ının İÇİNDE
```

`txOut`'a yazan **her satır 272–376 arasında**, yani imzalama handler'ının
içinde. İki yer ona hiç dokunmuyordu:

- `invalidateSignature()` (`main.js:124-129`) — `signed = null` yapıyor,
  `sendOut`'a yazıyor, `txOut`'a **dokunmuyor**.
- Gönderim başarı yolu (`main.js:691-695`) — `sendOut`'a tx kanıtını yazıyor,
  `signed = null` yapıyor, `txOut`'a **dokunmuyor**.

Bu, bu kod tabanında üçüncü kez görülen aile: Task 3'ün "ekranda yeni `to`,
calldata'da eski `to`" ve Task 6'nın "bayat yeşil sonuç" hataları da durum ile
ekranın ayrışmasıydı.

### `sendOut` neden temizlenmiyor (kapsamın sınırı)

Başarılı gönderimden sonra `sendOut`'ta tx hash'i, Etherscan linki ve ölçülen
gas duruyor — **kanıtın kendisi**. Onu temizlemek SAPMA 3'ün (sessiz tazeleme
kanıtı ezmesin) ve A3'ün (teşhis `insertAdjacentHTML` ile EKLENİR, ezmez)
korumaya çalıştığı şeyi yok ederdi. Düzeltilen, kanıt taşımayan bayat bölge.

---

## 3. Test: önce KIRMIZI

Test betiği geçici (repoda tutulmuyor); üç senaryoyu tarayıcıda koşturuyor.
Her senaryoda **önce pozitif kontrol** var: imza geçerliyken `txOut` imza
bloğunu **gösteriyor** mu? Göstermiyorsa asıl assertion "`txOut` hep boş olduğu
için" geçerdi.

Aranan desen: `/İmza \(\d+ bayt\)/`.

### Düzeltmeden ÖNCE

```
Zincirdeki nonce: 2

SENARYO A — imza düşürme (girdi değişimi)
  ✓ POZİTİF KONTROL: imza geçerliyken txOut imza bloğunu gösteriyor
  ✓ sendOut "imza geçersiz kılındı" diyor
  ✗ txOut artık bayat imza bloğunu GÖSTERMİYOR
      txOut ilk 120 karakter: "DOMAIN_SEPARATOR (chainId + cüzdan adresine bağlı)\n0xa6238098…\ndi"

SENARYO B — başarılı gönderim (sahte signer, zincire tx YOK)
  ✓ POZİTİF KONTROL: imza geçerliyken txOut imza bloğunu gösteriyor
  (sahte signer çağrıları: call, estimateGas, sendTransaction)
  ✓ sendOut "zincire gönderildi ve onaylandı" diyor
  ✓ sendOut tx kanıtını (hash) KORUYOR
  ✗ txOut artık bayat imza bloğunu GÖSTERMİYOR
      txOut ilk 120 karakter: "DOMAIN_SEPARATOR (chainId + cüzdan adresine bağlı)\n0xa6238098…\ndi"
  ✓ console: favicon 404 dışında hata yok

6 geçti, 2 kaldı
```

**Kırmızı olan tam olarak iki assertion**, ikisi de planın önceden yazdığı
ikisi. Ekran görüntüleri:
`docs/evidence/screenshots/sprint4-stale-signature-invalidate-red.png`,
`docs/evidence/screenshots/sprint4-stale-signature-after-send-red.png`.

> Dosya boyutları da aynı şeyi söylüyor: kırmızı kareler ~700 KB, yeşil kareler
> ~170–190 KB. Fark, ekranda duran 3688 baytlık imza hex'inin kendisi.

---

## 4. Senaryo B ve C'nin oracle'ı — geçici test kancası

`connected` modül-özel bir `let`. Gönderim yolunu tarayıcıda koşturmanın başka
yolu yok, bu yüzden Sprint 3'teki desenle (Task 5/6) **geçici** bir kanca
kondu:

```javascript
window.__s4t1 = {
  installFakeConn(fake) { connected = fake; syncSendButtons(); },
};
```

Sahte `signer` yalnızca üç şey yapıyor: `call()` → `'0x'` (ön-uçuş revert
etmez), `estimateGas()` → `219104n`, `sendTransaction()` → **hiçbir şey
yayınlamadan** sahte hash ve `wait()`. Senaryo C'de `wait()`, ethers v6'nın
gerçek davranışını taklit ederek `CALL_EXCEPTION` + `e.receipt` fırlatıyor
(`sendTransaction.js:229`'un kurtarma yolu da böylece koşuyor).

**Kalkan 1 ve 2 taklit EDİLMEDİ** — gerçek Sepolia'ya gitti: `readNonce()`
zincirden 2 döndürdü, `readDigest()` canlı `PQWallet._computeDigest()`'ten
geldi ve JS digest'iyle uyuştu. Taklit edilen tek katman, MetaMask signer'ının
kendisi.

### Kanca kaldırıldı, artık 0

| | md5 |
|---|---|
| `main.js` — kanca ÖNCESİ (commit `3c3368d`) | `2843d19f7f7fe63f2f0737b19728ee6d` |
| `main.js` — kanca SONRASI + düzeltme | `152181b20ff4e0abb1fa9ee0aa067c68` |

```
$ grep -n "__s4t1\|installFakeConn" frontend/src/main.js
(çıktı yok)

$ git diff --stat
 frontend/src/main.js | 15 +++++++++++++++
 1 file changed, 15 insertions(+)
```

Diff **yalnızca düzeltme**: 15 ekleme, 0 silme. Kanca izi yok.

---

## 5. Düzeltme

`invalidateSignature()` (`main.js:124`) — `txOut` da güncelleniyor:

```javascript
txOut.innerHTML = '<p class="warn">İmza geçersiz kılındı — yeniden imzalayın.</p>';
```

Gönderim başarı yolu (`receipt.status === 1`, `signed = null`'ın hemen yanı):

```javascript
txOut.innerHTML = '<p>İmza bu işlemde kullanıldı — yeni işlem için yeniden imzalayın.</p>';
```

**DEĞİŞMEYENLER:** `syncSendButtons`, kalkan sırası, `sig` fotoğrafı,
`sendExecute` yolu, `sendOut`'un mevcut metinleri, revert dalı. Mantık
değişmedi; yalnızca `txOut` iki yerde güncelleniyor.

---

## 6. Test: sonra YEŞİL

```
SENARYO A — imza düşürme (girdi değişimi)
  ✓ POZİTİF KONTROL: imza geçerliyken txOut imza bloğunu gösteriyor
  ✓ sendOut "imza geçersiz kılındı" diyor
  ✓ txOut artık bayat imza bloğunu GÖSTERMİYOR

SENARYO B — başarılı gönderim (sahte signer, zincire tx YOK)
  ✓ POZİTİF KONTROL: imza geçerliyken txOut imza bloğunu gösteriyor
  (sahte signer çağrıları: call, estimateGas, sendTransaction)
  ✓ sendOut "zincire gönderildi ve onaylandı" diyor
  ✓ sendOut tx kanıtını (hash) KORUYOR
  ✓ txOut artık bayat imza bloğunu GÖSTERMİYOR

SENARYO C — revert (status 0): imza KORUNUYOR, blok KALMALI
  ✓ sendOut "REVERT ETTİ" diyor ve hash korunuyor
  ✓ REVERT dalında txOut imza bloğunu KORUYOR (düzeltme fazla geniş değil)
  ✓ REVERT dalında "Zincire gönder" hâlâ açık (imza korundu)
  ✓ console: favicon 404 dışında hata yok

11 geçti, 0 kaldı
```

Ekran görüntüleri:
`sprint4-stale-signature-invalidate-green.png` (`txOut`: "İmza geçersiz
kılındı — yeniden imzalayın.", `sendOut`: "Değerler değişti — …", iki gönderim
butonu da kapalı) ve `sprint4-stale-signature-after-send-green.png`.

### Senaryo C planda yoktu — neden eklendi

Düzeltmeyi yazarken koda şu yorumu düştüm: *"REVERT dalında bu satır BİLEREK
yok: orada `signed` KORUNUYOR."* Bu bir **iddiaydı**, ölçüm değil. Bu kod
tabanında "kod yorumu niyeti gösterir, davranışı değil" dersi bir kez alındı
(`GAS_FALLBACK` dalı, `e.txHash`). Senaryo C o iddiayı assertion'a çevirdi ve
aynı zamanda bir regresyon bekçisi: bir sonraki okuyan revert dalını da
"düzeltmeye" kalkarsa test kırmızı yanar.

**Kapsam sınırı (açıkça):** Senaryo B ve C'nin `receipt`'i sahtedir. Gerçek bir
başarılı gönderimde `txOut`'un güncellendiği **Task 6'nın (K2 faz 2) gerçek
tx'inde** görülecek; bu belge o ana kadar sahte signer'a dayanıyor. Kalkan 1 ve
2 canlı zincirdendir, kalkan 3 ve gönderim değildir.

### Kanca kaldırıldıktan sonra tekrar

Kanca `main.js`'ten çıkarıldıktan sonra test yeniden koşturuldu: Senaryo A
(kanca istemiyor) **3/3 yeşil**, B ve C açıkça `ATLANDI` yazdı — sessizce
"geçti" görünmediler.

---

## 7. Mevcut testler ve build

```
node src/tx/build-transaction-test.mjs                        → TÜM TESTLER GEÇTİ (21 ✓)
CAST_EXPECTED="$EXPECTED" node src/contracts/pqwallet-test.mjs → 9 assertion geçti (cast oracle dahil)
npx vite build                                                 → ✓ built in 138ms
node src/tx/send-transaction-test.mjs                          → 45 ✓, SONRA ASILDI (§ 7.1)
```

Console (tarayıcı): yalnızca `favicon.ico` 404 (önceden de vardı).

> Planın Adım 5'indeki komut listesi `pqwallet-test.mjs` için eksikti: test
> `CAST_EXPECTED` olmadan **bilerek** başarısız oluyor (cast, ethers'tan
> bağımsız tek oracle; koşullu atlanan kontrol yapılmamış kontroldür). Doğru
> komut `docs/superpowers/plans/2026-09-04-onchain-transaction-flow.md`
> Step 4'te.

### 7.1 BULGU — `send-transaction-test.mjs` asılıyor (Task 1 ile İLGİSİZ)

Test 45 assertion'dan sonra **"GERÇEK ETHERS — canlı Sepolia oracle"**
bölümünde asılıyor: `%0 CPU`, 18 dakika, hiç ilerleme yok. Kırmızı yanmıyor —
**asılıyor**.

**Task 1 ile ilgisi yok, olamaz:** bu test `main.js`'i import etmiyor, ettiği
tek modül `sendTransaction.js` ve o dosya bu görevde hiç değişmedi
(`git diff --stat` → yalnızca `main.js`).

**Kök sebep ölçüldü (ham JSON-RPC, ethers'a hiç güvenilmeden):**

| Metot | `0xe6bc4e2c…` (blok 11690650) | `0x3eb20c48…` (blok 11690651) |
|---|---|---|
| `eth_getTransactionByHash` | tx döndü | tx döndü |
| `eth_getTransactionReceipt` | **`null`** | **`null`** |

`.env`'deki RPC sağlayıcı **receipt geçmişini buduyor**. Taze bir tx ile
kontrol edildi: en son bloktaki bir tx'in receipt'i sorunsuz geliyor, yani
budama eskilik kaynaklı. Sınır 2 günden kısa — **bizim kendi Sprint 3 tx'imizin
(`0x320e03d9…`, blok 11696552, güncel blok 11709552, ~13.000 blok fark)
receipt'i de `null` döndü.**

`revertedTx.wait()` null receipt görünce ethers'ın yoklama döngüsüne giriyor ve
varsayılan timeout olmadığı için **süresiz bekliyor**.

**Tasarım niyeti tutmadı.** Testin kendi yorumu şöyle diyor (Sprint 3, A1):
*"Kırılganlık bilerek: hash budanırsa test KIRMIZI yanar, sessizce atlamaz."*
Koruma `getTransaction`'ın null olup olmadığına bakıyor (satır 280-281) — ama
budanan **receipt**, tx değil. Koruma yanlış şeyi ölçüyor, bu yüzden kırmızı
yerine asılma çıkıyor.

**Bu belge bunu DÜZELTMİYOR** — Task 1'in kapsamı dışı, ayrı karar
(bkz. § 8).

---

## 8. Sınırlar ve devredenler

- Senaryo B/C'nin `receipt`'i sahte — § 6'daki kapsam sınırı.
- Kusurun kalan tarafı **Task 2**: yukarıdaki yeşil ekran görüntüsünde
  mnemonic hâlâ 1. bölümde açıkça yazılı ("Mnemonic (12 kelime)"). Bu Task
  1'in kapsamı değil; Task 2'de kanarya testiyle kapatılacak.
- `render.js` tesisat refactor'ü ve yazma noktası envanteri **Sprint 5'e
  ertelendi** (plan Task 3–4, dört gerekçesiyle). Bu belge sekiz bölgeyi
  birleştirmiyor; yalnızca ikisinin çeliştiği yeri kapatıyor.
- **§ 7.1'in açtığı iki madde karara bağlanmadı:**
  1. `send-transaction-test.mjs`'in canlı oracle'ı sabitlenmiş iki eski hash'e
     dayanıyor ve sağlayıcı receipt'leri budadığı için artık koşamıyor.
     Asılma yerine kırmızı yanması için korumanın `getTransaction`'a değil
     **receipt'e** bakması gerekiyor.
  2. **Sağlayıcının receipt budaması Task 5/6'yı da ilgilendiriyor.** Δ₂ ölçümü
     gönderim ANINDA receipt'ten alındığı için çalışır (taze receipt geliyor,
     ölçüldü); ama sonradan yapılacak her yeniden doğrulama — raporun
     `0x320e03d9…` tx'i dahil — bu RPC'den **yapılamaz**. Etherscan ve ikinci
     bir endpoint gerekir. Plan Task 5'teki "ikinci RPC endpoint'inde tekrar"
     maddesi bu yüzden artık sadece Δ kalibrasyonu için değil, **kanıtın
     erişilebilirliği** için de gerekli.
