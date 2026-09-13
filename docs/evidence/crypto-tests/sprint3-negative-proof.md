# Kanıt — Negatif kanıt (Task 6)

**Tarih:** 13 Eylül 2026
**Yazan:** Akif
**Kapsam:** `frontend/src/main.js` (`btn-negative-proof` handler'ı, `syncSendButtons`,
gönderim handler'ının iş-sürerken kilidi + girdi kilidi + imza fotoğrafı),
`frontend/src/tx/sendTransaction.js`
(`classifyNegativeProofError`, `INVALID_SIGNATURE_REASON`), `frontend/index.html`
(`.finding`, `.neutral`), `frontend/src/tx/send-transaction-test.mjs` (18 yeni assertion).

**Bu görevde zincire İŞLEM ATILMADI.** Tüm zincir etkileşimi `eth_call` ve salt
okuma. Düzenek `eth_sendTransaction` ve `eth_estimateGas`'ı yapısal olarak
reddediyor.

**Kullanılan anahtar: RASTGELE üretilmiş.** Owner mnemonic'i bu doğrulamanın
hiçbir adımında girilmedi, okunmadı, hiçbir komuta verilmedi.
`.env.pqwallet-owner-key` açılmadı.

---

## 1. Negatif kanıt ne iddia ediyor

"Transfer geçti" tek başına imzanın DOĞRULANDIĞINI kanıtlamaz. `verify()`'ı hiç
çağırmayan, imzayı yok sayan bir `execute()` de aynı yeşil ekranı üretirdi.
Şüpheci bir jüri üyesinin "imza gerçekten kontrol ediliyor mu?" sorusu haklıdır
ve pozitif akışın içinden cevaplanamaz.

Bir baytı bozulmuş imzayla `eth_call` yapıp kontratın **reddettiğini**
gösteriyoruz. Gaz harcanmaz, zincire hiçbir şey yazılmaz.

## 2. Doğrulama düzeneği

- Vite dev sunucusu, gerçek Sepolia (`PQWallet` `0x2EafA294…f000BB`).
- Cüzdan katmanı için sahte bir EIP-1193 sağlayıcısı; `eth_call` **gerçek
  Sepolia RPC'sine forward ediliyor** — kontratın cevabı taklit EDİLMEDİ.
- Sahte sağlayıcı `eth_sendTransaction` ve `eth_estimateGas`'ı reddediyor.
- Gördüğü her metod kaydediliyor ("cüzdan katmanına giden çağrılar" satırları
  bu kayıttan).
- Modül-yerel `signed`/`connected` state'ine erişmek için main.js'e **geçici**
  bir test kancası eklendi, doğrulama bitince silindi (bölüm 10).

## 3. YEŞİL yol — kontrat bozuk imzayı reddetti

Anahtar üret → imzala → cüzdanı bağla → "Bozuk imzayla dene":

```
✓ Kontrat bozuk imzayı reddetti — imza gerçekten doğrulanıyor.
Kontratın döndürdüğü sebep
  PQWallet: invalid signature
Metin kontrattan geldi (PQWallet.sol:44'teki require string'i), UI'dan değil.
Gaz harcanmadı (eth_call). Saklanan gerçek imza değişmedi — "Zincire gönder" hâlâ kullanılabilir.
```

- Ekranda **1 yeşil, 0 kırmızı, 0 sarı, 0 gri** öğe.
- Cüzdan katmanına giden çağrılar: `eth_call`, `eth_chainId` — **yalnızca
  bunlar.** `eth_sendTransaction` ✗, `eth_estimateGas` ✗ → **gaz harcanmadı.**
- Ekran görüntüsü: `../screenshots/sprint3-negative-proof-green.png`

## 4. Saklanan imza bozulmadı — ve brief'in beklentisinden sapma

Negatif kanıttan HEMEN SONRA "Zincire gönder"e basıldı. Sonuç:

| Kalkan | Sonuç |
|---|---|
| 1 — nonce | GEÇTİ (imzalanan 1 == zincirdeki 1) |
| 2 — canlı digest | GEÇTİ (kontratın `_computeDigest`'i JS digest'iyle aynı) |
| 3 — `eth_call` ön-uçuşu | `PQWallet: invalid signature` ile durdu |

**Brief "ön-uçuş geçmeli" diyordu; RASTGELE anahtarla bu ALINAMAZ.** Sebep Task
5'te zaten ölçülmüştü: `execute()` önce imzayı doğruluyor (`PQWallet.sol:44`),
rastgele anahtarın imzası zincirdeki `ownerPublicKey`'e uymuyor, akış her zaman
`invalid signature`'da duruyor. Ön-uçuşun geçtiği hali görmek **owner
mnemonic'ini gerektirir → Task 7.**

Bu yüzden iddia, rastgele anahtarla ölçülebilen daha keskin bir hale çevrildi:
**gönderim akışının `eth_call`'ına giren calldata, negatif kanıtınkinden TAM 1
BAYT farklı.**

```
negatif kanıt calldata uzunluğu : 7818 hex karakter
gönderim   calldata uzunluğu    : 7818 hex karakter   → aynı
farklı bayt sayısı              : 1
saklanan signed.signature       : negatif kanıttan önce == sonra (birebir)
```

Yani `tamperSignature` bozduğu baytı yalnızca KOPYAYA yazdı; saklanan gerçek
imza ve `fields` dokunulmadan kaldı. Kalkan 2'nin geçmesi bunu ikinci kez
söylüyor: `fields` sapsaydı canlı digest karşılaştırması tutmazdı.

Aynı garanti otomatik testle de sabit: `pqwallet-test.mjs`,
*"buildNegativeProofCalldata saklanan state i bozmuyor (signature + fields)"* —
assertion'ın dişi Task 2'de iki kasten bozmayla kanıtlanmıştı (anlık görüntü
TÜM nesneyi kapsıyor, BigInt-güvenli replacer ile).

## 5. SAPMA 2 — "kontrat reddetti" ile "ağ patladı" ayrıldı

Brief'in tek kontrolü şuydu:

```js
rejected = String(reason).includes('PQWallet: invalid signature')
```

Bu, "kontrat ne dedi" ile "kontrata ulaşılabildi mi" sorularını aynı kefeye
koyuyor. RPC takılırsa ekranda *"Reddedildi, ama beklenen mesaj değil: could
not coalesce error"* yazardı — sahnede jüriye bir GÜVENLİK BULGUSU gibi okunan
bir yanlış alarm. **Kanıt alınamaması, kanıtın olumsuz çıkması değildir.**

Karar `classifyNegativeProofError()`'a çekildi (saf fonksiyon, node'dan test
edilebiliyor). Dört yolun dördü de tarayıcıda çalıştırıldı:

| Yol | Tetikleme | Ekran | Öğe sayımı |
|---|---|---|---|
| **YEŞİL** — kontrat reddetti, mesaj beklenen | gerçek Sepolia | `✓ Kontrat bozuk imzayı reddetti` | 1 ok |
| **SARI** — kontrat reddetti, mesaj farklı | `eth_call` → `Error("PQWallet: call failed")` | `Kontrat reddetti, ama BEKLENEN mesaj değil — bulgu adayı.` | 1 finding, **0 ok** |
| **GRİ** — kontrat cevap vermedi | sağlayıcı `code: -32603` / kodsuz `TypeError` | `Kanıt ALINAMADI — kontrat cevap vermedi.` | 1 neutral, **0 ok, 0 err** |
| **KIRMIZI** — revert etmedi | `eth_call` → `0x` | `BEKLENMEYEN: bozuk imza reddedilmedi` | 1 err |

Ekran görüntüleri: `../screenshots/sprint3-negative-proof-yellow-finding.png`,
`../screenshots/sprint3-negative-proof-gray-unavailable.png`

Üç yolda da imza korundu ve buton state'ten yeniden türetildi.

### 5a. ÖLÇÜLEN BULGU: `code === 'CALL_EXCEPTION'` tek başına yetmiyor

İlk tasarım "CALL_EXCEPTION ise kontrat cevap vermiştir" diyordu. **Tarayıcıda
yanlış çıktı.** MetaMask signer'ı (`BrowserProvider`) üzerinden yapılan bir
`eth_call`'da ethers, AĞ HATALARINI DA `CALL_EXCEPTION` + `"missing revert
data"` olarak sarıyor. İki senaryo da çalıştırıldı:

| Sağlayıcının fırlattığı | ethers'ın verdiği |
|---|---|
| `{ code: -32603, message: 'Failed to fetch' }` | `CALL_EXCEPTION` / `missing revert data` |
| `TypeError('Failed to fetch')` (kodsuz) | `CALL_EXCEPTION` / `missing revert data` |

Yani `NETWORK_ERROR`/`SERVER_ERROR`/`TIMEOUT` bu yolda **pratikte hiç
görülmüyor.** Yalnızca koda bakan bir sınıflandırma, her ağ hıçkırığını SARI
"bulgu adayı" diye basardı — brief'in hatasının biraz daha kılıklı hali.

Bu yüzden ikinci koşul var: **revert VERİSİ (`e.data`) ya da çözülmüş `reason`
geldi mi?** Gelmediyse kontratın ne dediğini bilmiyoruz demektir → sarı değil,
GRİ. Yeşil ile sarı arasındaki farkı okunabilir bir metne dayandırıyoruz; metin
yoksa karar da yoktur.

Bulgu ekran metnine de yansıtıldı: gri yolun "sebep verisi yok" dalı artık
*"MetaMask üzerinden gelen AĞ ve RPC hataları da buraya düşüyor (ölçüldü), bu
yüzden en olası sebep bağlantıdır"* diyor. İlk yazdığım metin yalnızca "RPC
revert verisini budamış olabilir" diyordu ve kullanıcıyı **yanlış yere
baktırırdı** — Task 4'teki `disconnectMessage` dersinin aynısı.

`'network'` dalı ölü kod değil: negatif kanıt salt-okunur provider'a taşınırsa
(bölüm 7) `JsonRpcProvider` o kodları fırlatır. Node testinde beş ayrı hata
şekliyle kapsandı.

### 5b. KIRMIZI yolun yanlış-alarm koruması

`eth_call`'ın revert etmeden dönmesi "kontrat bozuk imzayı kabul etti" demek —
**ama yalnızca çağrı gerçekten PQWallet'a gittiyse.** Kullanıcı akışın ortasında
MetaMask'i başka bir ağa alırsa çağrı, o ağda PQWallet'ın BULUNMADIĞI bir adrese
gider: kod yok, revert yok, dönen değer boş. Aynı sessizlik.

İki senaryo **aynı RPC cevabıyla** (`0x`) çalıştırıldı:

| Senaryo | Ekran |
|---|---|
| Bağlantı çağrı boyunca sabit | `BEKLENMEYEN: bozuk imza reddedilmedi` — 1 err, GÜVENLİK BULGUSU |
| Çağrı sürerken bağlantı düştü | `Kanıt ALINAMADI — bağlantı ya da ağ çağrı sırasında değişti.` — 1 neutral, 0 err |

Assertion boş değil: **aynı girdi, farklı sonuç.** İlk denemede senaryo 2 de
kırmızı çıkmıştı — sebep düzenekti (`eth_call` o kadar hızlı dönüyordu ki
bağlantı düşürülmeden önce akış bitiyordu), `eth_call`'a 600 ms gecikme konunca
koruma penceresi ölçülebilir hale geldi.

## 6. SAPMA 1 — `finally`'de koşulsuz açma YOK

Brief `finally { btnNegativeProof.disabled = false; }` yazıyordu. Bu, Task 5
SAPMA 2 ile doğrudan çelişir ve kapatılan deliği geri açar.

**Kasten bozularak kanıtlandı.** Senaryo: negatif kanıtın `eth_call`'ı sürerken
kullanıcı `tx-to` alanını değiştiriyor → `invalidateSignature()` imzayı
düşürüyor. Çağrı bitince ne oluyor?

| Kod | `signed` | `btnNegativeProof.disabled` | Assertion |
|---|---|---|---|
| Brief'in hali (`= false`) | `null` | **`false` — AÇIK** | **KIRMIZI** |
| `syncSendButtons()` | `null` | `true` — kapalı | YEŞİL |

Brief'in halinde imzasız durumda "Bozuk imzayla dene" tıklanabilir kalıyor.
Aynı hata bu kod tabanında iki kez yaşandı (btnKeygen — Task 3B, btnSend —
Task 5); üçüncüsü olmadı.

Bozma md5 ile geri alındı (bölüm 8).

### 6a. BU SIRADA BULUNAN VE DÜZELTİLEN HATA — bayat kanıt yeşil basılıyordu

Yukarıdaki senaryoda kilit doğruydu ama **EKRAN yanlıştı.** Çağrı bitince
handler, `invalidateSignature()`'ın yazdığı *"Değerler değişti — imza geçersiz
kılındı"* uyarısını EZİP yerine şunu basıyordu:

```
✓ Kontrat bozuk imzayı reddetti — imza gerçekten doğrulanıyor.
… Saklanan gerçek imza değişmedi — "Zincire gönder" hâlâ kullanılabilir.
```

Oysa imza artık YOK ve gönder butonu kapalı. Kullanıcı ekranda yeşil görür,
butonun neden kapalı olduğunu anlayamaz, uyarıyı hiç görmez. Task 3'teki
"ekranda yeni değerler, calldata'da eski `fields`" hatasının kardeşi: gösterilen
sonuç, artık var olmayan bir state'e ait.

**Düzeltme:** handler başında `const sigSnapshot = signed` alınıyor, beş render
noktası da `showResult()`'tan geçiyor; imza değişmişse sonuç basılmıyor:

```
Değerler çağrı sırasında değişti — imza geçersiz kılındı. Az önceki negatif
kanıt artık BAYAT (silinmiş imzaya ait), bu yüzden gösterilmiyor. Yeniden
imzalayıp tekrar deneyin.
```

Doğrulandı: 0 yeşil öğe, buton kapalı, imza yok.
Ekran görüntüsü: `../screenshots/sprint3-negative-proof-stale-signature.png`

Bu, `connected !== conn` kontrolünün imza karşılığıdır — aynı sınıf koruma,
farklı state.

## 7. SAPMA 3 — RAPOR: negatif kanıt cüzdan bağlantısı olmadan yapılabilir mi?

**Uygulanmadı, karar kullanıcıda.** İstenen ölçüm:

### Kaç satır

`preflight` şu an 3 satır ve yalnızca `signer.call()` çağırıyor. ethers'ta
`Provider` de `Signer` de `.call({ to, data })` sunuyor, yani runner-bağımsız
hale getirmek gövde değişikliği değil, imza değişikliği:

```js
export async function preflight({ signer, provider, calldata }) {
  const runner = signer ?? provider;
  if (!runner) throw new Error('preflight: signer ya da provider gerekli');
  await runner.call({ to: CONTRACTS.pqWallet, data: calldata });
}
```

→ **+3 / −1 satır.**

Negatif kanıt handler'ında (`main.js`) ise net **AZALMA** olur:

| Değişiklik | Satır |
|---|---|
| `getSepoliaProvider` import'u | +1 |
| `const conn = connected; if (!conn) {…}` bloğu silinir | −5 |
| `preflight({ signer: conn.signer, … })` → `preflight({ provider: await getSepoliaProvider(), … })` | ±1 |
| `if (connected !== conn)` dalı ve yorumu silinir (provider zaten Sepolia'ya doğrulanmış — yanlış-ağ hata modu ortadan kalkar) | −18 |
| `syncSendButtons` içinde `btnNegativeProof.disabled = !signed` | ±1 |

→ toplam kabaca **+5 / −24**, yani ~19 satır eksilir.

### Mevcut testleri bozar mı

**Hayır.** `preflight`'ın bugün HİÇ testi yok (`grep preflight src/` → yalnızca
tanım ve iki çağrı; `send-transaction-test.mjs`'te geçmiyor). Yeni imza geriye
uyumlu: `{ signer, calldata }` çağrıları aynen çalışır, gönderim handler'ı
dokunulmadan kalır. `classifyNegativeProofError`'ın 31 assertion'ı, `pqwallet`
9'u ve `build-transaction` 21'i bu değişikliğe hiç bakmıyor.

### Bedeli ve kazancı — karar için

**Kazanç:**
- Sahnede bir adım ve bir hata modu eksilir ("önce cüzdanı bağlayın" koşulu
  düşer, negatif kanıt bağlantıdan önce gösterilebilir).
- "Yanlış ağa gitmiş olabilir" riski **yapısal olarak** yok olur:
  `getSepoliaProvider()` her okumada `assertSepoliaNetwork`'ten geçiyor.
  Bölüm 5b'deki koruma gereksizleşir.
- Gri yolun `'network'` dalı gerçekten görülür hale gelir (bölüm 5a) — teşhis
  metni "bağlantı mı, budanmış revert verisi mi" ayrımını doğru yapar.

**Bedel:**
- **TEK YOL İLKESİ — kararı tek başına belirleyen madde.** Negatif kanıtın ikna
  ediciliği, gerçek gönderimle **aynı yoldan** geçmesinden geliyor. İkisi de
  MetaMask signer'ı üzerindeyse *"bozuk imza reddedildi, doğru imza geçti"* tek
  bir yolun iki sonucudur. Negatif kanıt uygulamanın kendi RPC'sinden gitseydi
  şüpheci jüri üyesinin elinde **meşru** bir itiraz doğardı: "reddedilmeyi bir
  yolda gösterdin, göndermeyi başka yolda yapıyorsun." Kanıt değerini
  kaybettiren şey tam olarak bu.

  *(Bu madde ilk raporda YOKTU; kullanıcı ekledi. Rapor "bir demo adımı ve 24
  satır" kazancını sayıyor, karşısına koyması gereken şeyi saymıyordu.)*
- Task 5'in kanıt deseni değişir: "kalkan 3'te cüzdan katmanına giden çağrılar"
  kaydı negatif kanıt için boş olur.
- Task 7'nin akış sırası değişir (plandaki adımlar buna göre güncellenmeli).

### KARAR: HAYIR — signer'da kalındı (Akif, 13 Eylül)

Bir demo adımı ve ~24 satır, o itirazın önünü kapatmaya değmez. Değiştirilmedi.

**Sprint 4 "demo cilası" kalemine not düşüldü**, Sprint 3'te dokunulmuyor.
Gerekçe `main.js`'te `syncSendButtons`'ın üstüne de yazıldı ki bir sonraki
okuyan "şu 24 satır fazla" diye aynı yola girmesin.

**Uygulanan:** kilit `!(signed && connected)` — btnSend ile aynı, handler'ın
koşuluyla birebir. Önceki `!signed` hali cüzdan bağlı değilken butonu AÇIK
bırakıp basınca kırmızı "Önce cüzdanı bağlayın" bastırıyordu — açık ama iş
yapmayan bir buton, kilidin ikinci ve çelişen bir kopyasıdır. Doğrulandı: imza
var + bağlantı yok → iki buton da kapalı.

## 8. İki kilitleme yolu meselesi (Not 2)

Gönderim handler'ındaki `btnNegativeProof.disabled = true` (`main.js:580`)
**silinmedi, gerekçesi yazıldı.** `syncSendButtons()`'ın yerine geçmiyor; onun
İFADE EDEMEDİĞİ bir durumu kapatıyor: akış boyunca state (imza + bağlantı)
geçerli kalıyor, tek kaynağa sorulsa iki buton da "açık" cevabını verirdi.
Kapatılma sebebi state değil, akışın kendisi:

- `btnSend`: çift tıklama aynı nonce'a iki tx demek.
- `btnNegativeProof`: negatif kanıt da `sendOut`'a yazıyor; ön-uçuş ile MetaMask
  onayı arasındaki 2–4 saniyede basılırsa "MetaMask onayı bekleniyor…" ezilir ve
  iki akışın render'ları yarışır.

SAPMA 2 kuralıyla çelişmiyor: kural **koşulsuz AÇMAYI** yasaklar
(`disabled = false`), kapatmayı değil. Açma tek kaynaktan yapılıyor. Negatif
kanıt handler'ına da aynı iş-sürerken kilidi kondu, aynı yorumla.

## 9. sendOut paylaşımı — DİKKAT maddesi doğrulandı

Negatif kanıt `sendOut`'a yazıyor; başarılı bir gönderimden sonra basılırsa tx
hash'ini ve Etherscan linkini ekrandan silerdi. **Silemez, çünkü buton o anda
kapalıdır.**

Ölçüldü: ekrana bir tx kanıtı kondu, ardından başarılı gönderimin state etkisi
uygulandı (`signed = null` → `syncSendButtons()`, `main.js:695` ve `:710`
zincirinin aynısı), sonra butona programatik `click()` atıldı.

```
imza varken            : btnNegativeProof.disabled = false, btnSend.disabled = false
imza tüketildikten sonra: btnNegativeProof.disabled = true,  btnSend.disabled = true
click() sonrası tx kanıtı ekranda: EVET (hash korundu)
```

Kapalı butona yapılan tıklama dinleyiciye hiç ulaşmıyor. Bu, Task 5 SAPMA 2
tablosundaki *"Başarılı gönderim sonrası (imza tüketildi) → kapalı ✓"* satırının
Task 6 butonu için tekrarı; kilit artık `!(signed && connected)` olduğu için
bağlantı düşse de aynı sonuç.

## 10. Test kancası ve KASTEN bozmanın geri alınması

Geçici kanca (`window.__t6`) main.js'e eklendi, doğrulama bitince silindi:

```
md5 (kanca eklenmişken)          : 1edf837a901c02c58845e2621071c296
KASTEN bozma uygulandı (finally'de koşulsuz açma) → assertion KIRMIZI
md5 (bozma geri alındıktan sonra): 1edf837a901c02c58845e2621071c296  → BİREBİR
'KASTEN BOZMA' kalıntısı          : 0
md5 (kanca silindikten sonra)    : d93d9fcb241601633c231aafd03b9b9a
diff (kancalı hâl ↔ son hâl)     : SADECE kanca bloğu (17 satır), başka fark yok
'__t6' / 'KASTEN' kalıntısı       : 0 / 0
Sayfa yenilendi: window.__t6 === undefined ✓
```

Bölüm 13'ün düzeltmesi için ikinci bir kanca turu gerekti (`dropSignature` —
`signed`ı dışarıdan düşürmeden yakalama dalı tetiklenemiyor):

```
md5 (ikinci kanca eklenmişken)   : 7606c4ce8cbe0f3009a7dbff8bc2b6cc
md5 (kanca silindikten sonra)    : 2843d19f7f7fe63f2f0737b19728ee6d
diff (kancalı hâl ↔ son hâl)     : SADECE kanca bloğu (13 satır)
'__t6' / 'KASTEN' kalıntısı       : 0 / 0
```

**Not:** kanca eklenmeden önceki md5 (`5c4c7212…`) ile son md5 birebir DEĞİL —
arada iki gerçek kod değişikliği var (bölüm 6a'daki `showResult` düzeltmesi ve
bölüm 5a'daki gri metin düzeltmesi). İkisi de bu doğrulama sırasında bulundu.
Kancanın kendisinin iz bırakmadığı, yukarıdaki `diff` ile gösterildi.

## 11. Otomatik testler

```
node src/tx/send-transaction-test.mjs        → 75 assertion, TÜMÜ GEÇTİ  (57 → 75)
node src/tx/build-transaction-test.mjs       → 21 assertion, TÜM TESTLER GEÇTİ
CAST_EXPECTED=… node src/contracts/pqwallet-test.mjs → 9 assertion (cast oracle dahil)
npx vite build                               → geçti
```

`send-transaction-test.mjs`'e eklenen 18 assertion `classifyNegativeProofError`
içindir. Girdiler ethers 6.17'nin gerçek hata şekillerine göre kuruldu
(`Error(string)` revert verisi ABI olarak kodlandı), canlı doğrulaması bölüm
3–5'te tarayıcıda yapıldı.

İki assertion özellikle "boş değil" kontrolüdür:

```
✓ (c) ağ hatası metninde beklenen string geçse BİLE yeşil değil
✓ (c) brief'in tek yollu kontrolü aynı girdide YANILIYOR (assertion boş değil)
```

İkincisi, brief'in `String(reason).includes(...)` mantığını aynı girdiye
uygulayıp `true` döndüğünü — yani yanlış cevap verdiğini — sabitliyor. Yeni
mantığın eskisinden farklı davrandığı bir girdi olmasaydı SAPMA 2 kâğıt üstünde
kalırdı.

## 12. Console

`favicon.ico 404` (önceden de vardı). Ayrıca oturum sırasında bir kerelik
`500 (Internal Server Error) /src/main.js` görüldü: render noktalarını toplu
düzenlerken bir regex `reasonHtml`'in kapanışını da bozmuştu, sözdizimi hatası
HMR'a yansıdı. Düzeltildi; sonraki `vite build` ve sayfa yüklemeleri temiz.
Başka hata/uyarı yok.

## 13. BULUNAN VE DÜZELTİLEN — gönderim handler'ında imza fotoğrafı yoktu

Negatif kanıtın 6a'daki hatası aranırken kardeşi gönderim handler'ında
bulundu. `btnSend` akışı başında `const { fields, signature, digest } = signed`
yapıyor ama `signed`ın sonradan değişip değişmediğini **hiç sormuyordu** —
`connected !== conn`'un imza karşılığı yoktu. Zamanlamaya göre iki ayrı kötü
sonuç:

- girdi kalkan 1'den ÖNCE değişirse → `signed.nonce` `null` üzerinde okunur,
  `TypeError` generic catch'e düşer, ekranda *"Gönderilemedi: Cannot read
  properties of null"*;
- girdi kalkan 2'den SONRA değişirse → tx **eski `fields` ile zincire gider**,
  üstelik ekranda *"imza geçersiz kılındı"* yazarken.

İkincisi Task 7'nin ekran kaydına girecek handler'ın ta kendisi. **Bilinen bir
hatayla kayıt alınmaz** → Task 7'ye devredilmedi, şimdi düzeltildi.

İlk raporda bunu "iptal mi, devam mı?" ikilemi diye sunmuştum. **Yanlış ikilem;
üçüncü şık var ve bu kod tabanında emsali var** (kullanıcının düzeltmesi):

### Katman 1 — ÖNLE (emsal: Task 3'ün imzalama penceresi)

Task 3, ~7,5 sn'lik imzalama penceresinde `tx-to`/`tx-value`/`tx-data`'yı
kilitliyor; gerekçesi birebir aynı — pencerede girdi değişimi sessiz sapma
üretiyor. Gönderim penceresi de aynı özelliği taşıyor: üç kalkanın ağ çağrıları
+ MetaMask onayı. Girdiler artık gönderim boyunca kilitli, dolayısıyla
`invalidateSignature()` o pencerede **hiç çalışamıyor** ve ikilem ortadan
kalkıyor.

`btnBuildSign` de kilitlendi: girdiler kilitli olsa bile yeniden imzalamak
`signed`ı değiştirir ve aynı pencereyi başka kapıdan açardı. Zincir tutarlı —
imzalama keygen'i kilitliyor, gönderim imzalamayı.

Ölçüldü (gönderim akışının ortasında):

```
inputsDisabled       : [true, true, true]
btnBuildSignDisabled : true
btnSendDisabled      : true      btnNegDisabled: true
akıştan sonra        : hepsi açık (finally)
```

### Katman 2 — YİNE DE YAKALA (emsal: `conn` snapshot'ı)

`const sig = signed` handler başında alınıyor, akışın tamamı `sig` üzerinden
çalışıyor (`sig.nonce`, `sig.fields` — revert teşhisi dahil), ve
**`sendExecute`'tan hemen ÖNCE** `signed !== sig` sorgulanıyor. Kontrolün
yayından önce durmasının sebebi basit: **tx yayınlandıktan sonra iptal diye bir
şey yok.**

"Devam et" bilerek bir seçenek değil: `signed` düştüyse kullanıcı o işlemi
istemiyor ya da başka bir şey istiyor demektir.

İptal mesajı sakin, imza düştüğü için yeniden imzalamaya yönlendiriyor:

```
Gönderilemedi: imza işlem sırasında değişti ya da geçersiz kılındı — gönderim
iptal edildi, zincire hiçbir şey gitmedi. Alanları kontrol edip yeniden imzalayın.
```

**Ayırt edici ölçüm — assertion boş değil.** Ön-uçuş GEÇECEK şekilde ayarlandı
(rastgele anahtarla kalkan 3 normalde `invalid signature`'da durur ve kontrole
hiç ulaşılmaz), iki senaryo aynı akışla koşuldu; tek fark imzanın düşürülmesi:

| Senaryo | Gönderim katmanına giden çağrılar | Ekran |
|---|---|---|
| A — imza duruyor (negatif kontrol) | `eth_estimateGas`, `eth_sendTransaction` | akış sendExecute'a ULAŞTI (düzenek reddetti) |
| B — akış ortasında imza düştü | **hiçbiri** | `gönderim iptal edildi, zincire hiçbir şey gitmedi` |

Yani kontrol gerçekten yayından önce duruyor: A'da cüzdan katmanı görülüyor,
B'de hiç görülmüyor. Ekran görüntüsü:
`../screenshots/sprint3-send-aborted-signature-changed.png`

### Katman 1 KULLANICI SEVİYESİNDE ölçüldü — Playwright `fill()` oracle'ı

İlk turda önleme katmanını `dispatchEvent(new Event('input'))` ile sınamıştım.
**O bir ölçüm değildi:** `dispatchEvent` benim kendi taklidim ve `disabled`
özniteliğini umursamadan dinleyiciyi tetikliyor. Kilidin gerçek kullanıcıya
karşı tuttuğunu göstermiyordu.

Playwright'ın `locator.fill()`'i **bağımsız oracle**: tarayıcının kendi
actionability kontrolünden geçiyor ve `disabled` bir input "editable"
sayılmadığı için dolduramıyor.

**Pozitif kontrol önce** (kilit yokken `fill()` geçmeli — geçmeseydi aşağıdaki
timeout'lar kilidi değil, selector'ı ya da düzeneği ölçmüş olurdu):

| Alan | Kilit YOKKEN `fill()` | Sonuç |
|---|---|---|
| `tx-to` | GEÇTİ | değer yazıldı |
| `tx-value` | GEÇTİ | değer yazıldı |
| `tx-data` | GEÇTİ | değer yazıldı |

**Gönderim penceresi AÇIKKEN** (ön-uçuş bilerek 20 sn'ye yavaşlatıldı, üç
deneme paralel, her birinin timeout'u 3 sn — yani hepsi pencerenin içinde):

```
click #btn-send sonrası input.disabled : [true, true, true]

locator.fill('#tx-to',    …) → locator.fill: Timeout 3000ms exceeded.   REDDEDİLDİ
locator.fill('#tx-value', …) → locator.fill: Timeout 3000ms exceeded.   REDDEDİLDİ
locator.fill('#tx-data',  …) → locator.fill: Timeout 3000ms exceeded.   REDDEDİLDİ

denemelerden sonra alan değerleri : değişmedi (birebir aynı)
denemeler biterken akış           : HÂLÂ sürüyordu ("Ön-uçuş yapılıyor…")
```

Son satır assertion'ın üçüncü ayağı: akış bitmiş olsaydı `finally` kilitleri
açardı ve timeout'lar kilidi değil, pencerenin kapanmasını ölçerdi.

**İlk denemede bu tam olarak başıma geldi ve bulgu olarak duruyor:** denemeler
SIRAYLA yapılmıştı (2,5 sn × 3) ve pencere 6 sn'ydi; üçüncü deneme
(`tx-data`) GEÇTİ. Sebep kilidin aşılması değil — **Playwright'ın `fill()`'i
reddetmiyor, BEKLİYOR;** kilit açılınca doldurdu. Yani bu testte pencere,
denemelerin toplam süresinden uzun tutulmak zorunda. Paralel + 20 sn'lik
pencereyle tekrarlandı, üçü de reddedildi.

### Hangi katman hangi oracle'la kanıtlandı

| Katman | Oracle | Ne gösterildi |
|---|---|---|
| **1 — ÖNLE** (girdi + btnBuildSign kilidi) | Playwright `locator.fill()` — tarayıcının kendi actionability kontrolü, bağımsız | Gerçek kullanıcı gönderim penceresinde üç alanın hiçbirine yazamıyor; değerler değişmiyor |
| **2 — YAKALA** (`signed !== sig`) | Cüzdan katmanına giden RPC metod kaydı (`eth_estimateGas`/`eth_sendTransaction` var mı) | Önleme AŞILSA bile tx yayınlanmıyor |

İkinci katmanı sınamak için önleme katmanını kasten atlamak gerekiyordu; bunun
için `dispatchEvent`in `disabled`ı umursamaması ve test kancasının
`dropSignature()`'ı kullanıldı. Yani **taklit yalnızca katman 2'yi sınarken,
katman 1'i devre dışı bırakmak amacıyla** kullanıldı — katman 1'in kendi
kanıtında değil. İki katmanın ayrı olmasının ve ayrı oracle'larla
ölçülmesinin sebebi de bu.

## 14. Devreden

- **Ön-uçuşun GEÇTİĞİ hali gerçek imzayla görülmedi** — owner anahtarı
  gerektiriyor → **Task 7.** (Bu görevde kanıt, calldata'nın bayt bayt
  karşılaştırmasına dayandırıldı; bölüm 4. Bölüm 13'teki A senaryosunda ön-uçuş
  düzenekle geçirildi, gerçek imzayla değil.)
- **SAPMA 3'ün Sprint 4 notu:** negatif kanıtı salt-okunur provider'a taşıma
  fikri ölçüldü ve reddedildi (bölüm 7). "Demo cilası" kaleminde yeniden
  tartışılırsa tek yol ilkesiyle birlikte tartışılmalı.
