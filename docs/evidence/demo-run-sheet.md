# Kayıt günü akış kâğıdı — PQ-SAFE demo (nonce 5)

**Hazırlandı:** 24 Eylül 2026 · **Uygulayacak:** Akif
**Şart:** kesintisiz tek çekim, kesme yok (`specs/2026-09-14-sprint4-scope-design.md:348,355-357`)
**Hazırlık koşusunda zincire tx atılmadı**, MetaMask onayı verilmedi,
`.env.pqwallet-owner-key` açılmadı.

> Bu kâğıt yukarıdan aşağıya uygulanır. **KARAR: Akif** etiketli her madde
> kayıttan ÖNCE kapatılmalı — kayıt sırasında karar verilmez.

---

## 0. ÖNCE OKU — nonce 5'in ön kaydı YOK

**ÖLÇÜM.** §12 (`crypto-tests/sprint4-gas-table-and-second-tx.md:1175`)
**nonce 4'ün** ön kaydıdır, nonce 5'in değil. §13'te tüketildi ve kapandı;
beklentisi (`nonce() 4 → 5`, bakiye `50700…` → `50600…`) birebir tuttu
(`:1424-1425`). Commit `3acb421`, 2026-09-23 23:18:02 +03:00, `origin/main`'de.

**ÖLÇÜM.** `docs/` ve `.superpowers/` altında **nonce 5 için hiçbir ön kayıt
yok.** Tek geçen şey bir atama: *"Kayıtlı demo koşusu yapılmadı… nonce 5 ile
çekilecek"* (`:1339`, `progress.md:2211-2212`).

**ÇIKARIM.** Nonce 5'i harcamak §12'yi **bozmaz** — o kapandı. Bozulan şey,
nonce 5'in kayıtlı demoya ayrılmış olmasıdır. Ve bu projenin kendi kuralı
gereği kayıttan önce bir **nonce 5 ön kaydı yazılıp commit'lenmelidir**;
yoksa ölçüm, beklentisi olmayan bir ölçüm olur.

### ADIM 0 — kayıttan ÖNCE yapılacak (kayıt değil, hazırlık)

- [ ] Nonce 5 ön kaydını yaz: beklenen `gasUsed` formülü, `nonce() 5 → 6`,
      beklenen bakiye, tx tipi, `to`, `authorizationList`, `n`.
- [ ] Commit'le ve **blok zamanından önce olduğunu** kanıtlayabilmek için
      commit saatini not al (§13'ün 46 saniyelik marj deseni, `:1249-1265`).

**KARAR: Akif — ön kaydın içeriği.** Hazır şablon § 5.3'te.

---

## 1. DEMO TX PARAMETRELERİ — kopyala-yapıştır

**KARAR: Akif.** Aşağısı **nonce 4 koşusunun** zincirden çözülmüş
parametreleridir (`cast tx 0x0fd4b9b3…c3e71c input` → `cast decode-calldata`),
aday varsayılan olarak konuldu. Başka bir alıcı seçilecekse kayıttan önce
değiştir ve ön kayda da aynısını yaz.

```
to    = 0xe0BF2D190f8e2F2fc97cF19244845F8FeBDB7351
value = 100000000000000
data  = 0x
```

| alan | değer | not |
|---|---|---|
| `to` | `0xe0BF2D190f8e2F2fc97cF19244845F8FeBDB7351` | **ÖLÇÜM**: nonce 4 koşusunun alıcısı. Bu adres aynı zamanda **gas'ı ödeyen MetaMask hesabı** — yani cüzdan gas'ı ödeyen hesaba para yolluyor |
| `value` | `100000000000000` | 0,0001 ETH. Ekranda `100.000.000.000.000 wei = 0,0001 ETH` görünecek |
| `data` | `0x` | Alıcı EOA + boş data → gas tablosunun "alıcı EOA, `data = 0x`" etiketiyle uyumlu |
| PQWallet | `0x2EafA294C14b6752128bfd4f5873D1EA39f000BB` | yapılandırmadan gelir, girilmez |

> **KARAR: Akif — alıcı seçimi videoda nasıl anlatılacak?** `to` = gas'ı ödeyen
> hesap olduğu için jüri "kendi kendine mi gönderiyor" diye sorabilir. Cüzdan
> (`0x2EafA…`) ile alıcı (`0xe0BF2…`) **farklı** adresler; istenirse üçüncü bir
> adres seçilebilir ama o zaman gas tablosunun satır etiketi değişir (soğuk/
> boş alıcı → farklı maliyet).

---

## 2. KAYIT ÖNCESİ KONTROL LİSTESİ

Her satır tek komut ya da tek bakış. Hepsi ✓ olmadan kayda başlanmaz.

### 2.1 Depo

```bash
cd /Users/akif/pq-safe
git status --short          # BOŞ olmalı
git status -sb | head -1    # "## main...origin/main" — ahead/behind YOK
```

- [ ] `git status --short` boş
- [ ] HEAD = `origin/main` (ileri/geri yok)

### 2.2 Testler

```bash
cd /Users/akif/pq-safe/frontend
node src/format-test.mjs                    # 8
node src/tx/build-transaction-test.mjs      # 21
node src/tx/send-transaction-test.mjs       # 99
npx vite build
cd ../contracts
EXPECTED=$(cast calldata "execute(address,uint256,bytes,bytes)" 0x7268a7c3d52baa50486930e6ed25d29804d075b6 1000000000000000 0x 0xdeadbeef)
cd ../frontend && CAST_EXPECTED="$EXPECTED" node src/contracts/pqwallet-test.mjs   # 9
```

- [ ] format **8** ✓
- [ ] build-transaction **21** ✓
- [ ] send-transaction **99** ✓
- [ ] pqwallet **9** ✓ (cast oracle)
- [ ] `vite build` ✓

### 2.3 Zincir — kayıttan hemen önce oku

```bash
RPC=https://ethereum-sepolia-rpc.publicnode.com
cast block-number --rpc-url $RPC
cast call 0x2EafA294C14b6752128bfd4f5873D1EA39f000BB "nonce()(uint256)" --rpc-url $RPC
cast balance 0x2EafA294C14b6752128bfd4f5873D1EA39f000BB --rpc-url $RPC
cast balance 0xe0BF2D190f8e2F2fc97cF19244845F8FeBDB7351 --rpc-url $RPC
cast code    0xe0BF2D190f8e2F2fc97cF19244845F8FeBDB7351 --rpc-url $RPC
```

| | beklenen | ölçülen (doldur) |
|---|---|---|
| blok | — | ............................ |
| UTC saat | — | ............................ |
| PQWallet `nonce()` | **5** — başka bir şeyse **DUR** | ............................ |
| PQWallet bakiye | `50600000000000000` | ............................ |
| EOA bakiye (gas) | ≥ 0,005 ETH | ............................ |
| `cast code <EOA>` | **`0x`** — delegasyon yok | ............................ |

> **Referans (24 Eylül, blok 11773715):** PQWallet `nonce()` = 5, bakiye
> `50600000000000000`; EOA bakiyesi `0,047456582931955569` ETH,
> `cast code` = `0x`.

### 2.4 MetaMask

- [ ] Ağ **Sepolia** (chainId 11155111)
- [ ] Aktif hesap **`0xe0BF2D190f8e2F2fc97cF19244845F8FeBDB7351`**
- [ ] Gas için bakiye yeterli — **gereken ~0,0005–0,0009 ETH**
      *(ÖLÇÜM: MetaMask onay ekranında `Network fee` 0,0005 SepoliaETH
      korumasız, 0,0009 korumalı yolda — `§12:1200-1203` ve 24 Eylül
      REDDET koşusu. Zincire giden limit nonce 4'te 219.153 gas'tı.)*
- [ ] *Account details → Smart account → Sepolia* şalteri **KAPALI**
      (§12 ön koşul 4)

### 2.5 Ekran ve kadraj

- [ ] macOS **Rahatsız Etme** açık (bildirim yok)
- [ ] Tarayıcı yer imleri çubuğu **gizli** (`Cmd+Shift+B`)
- [ ] Terminalde `.env`, mnemonic ya da anahtar **görünmüyor** — gerekirse
      terminali kapat, `clear` yetmez (kaydırma geçmişi kalır)
- [ ] Mnemonic'in kaynağı (kâğıt/dosya/parola yöneticisi) **kadraj dışında**
- [ ] Tarayıcı zoom'u okunur seviyede — `wei` satırı ve DURUM etiketi
      kayıtta okunabiliyor
- [ ] Sekmede yalnız `localhost:5173` — başka sekme başlığı görünmüyor
- [ ] Dev sunucu ayakta: `cd frontend && npx vite --port 5173`

---

## 3. ÇEKİM SIRASI

> **Spec şartı (ÖLÇÜM, `scope-design.md:355-357`):** videonun değeri
> sürekliliğinden geliyor — *"imza → negatif kanıt reddi → **aynı** imzayla
> gönderim → receipt, aralıksız"*. Negatif kanıt ile gerçek gönderim **aynı
> imzayı** kullanmalı; araya yeni bir imzalama girerse bu bağ kopar.

### Negatif kanıt güvenli mi? — ÖLÇÜM

| soru | cevap | dayanak |
|---|---|---|
| MetaMask onayı açılır mı? | **HAYIR** | `main.js` negatif kanıt handler'ı `preflight()` çağırıyor, o da `signer.call(...)` = `eth_call` (`sendTransaction.js:124-126`). **Gözlendi:** 24 Eylül Test 1'de ön-uçuş koştu, pencere açılmadı |
| Zincire tx gider mi? | **HAYIR** | `eth_call` yayın yapmaz |
| Gas harcar mı? | **HAYIR** | aynı |
| PQWallet nonce'u değişir mi? | **HAYIR** | state değişmez |
| Saklanan gerçek imza bozulur mu? | **HAYIR** | `buildNegativeProofCalldata` yalnız okur; `pqwallet-test.mjs`'te assert'li |

**"MetaMask'te onaylanırsa" diye bir yol yok** — buton MetaMask'e hiç
ulaşmıyor. **Demoya girip girmeyeceği: KARAR: Akif** (spec girmesini istiyor).

### Sahne listesi

| # | sahne | düğme | ekranda beklenen | süre | zincir |
|---|---|---|---|---|---|
| 1 | Sayfa açılışı, zincir göstergeleri | — (otomatik) | `Zincirdeki nonce: 5` · `50.600.000.000.000.000 wei = 0,0506 ETH` | ~2 sn | okuma |
| 2 | Sepolia bağlantı testi | **Bağlantıyı test et** | `Chain ID 11155111` · son blok · `Sepolia'ya bağlantı doğrulandı` | ~2 sn | okuma |
| 3 | Owner anahtarını içe aktar | mnemonic gir → **İçe aktar** | `Mnemonic içe aktarıldı (ekranda gösterilmiyor)` · `✓ Zincirdeki ownerPublicKey ile AYNI` · *"Yeni anahtar çifti üret" kapatıldı* | ~1 sn | okuma |
| 4 | Zincirden yenile (nonce'u kadrajda göster) | **Zincirden yenile** | nonce **5**, bakiye | ~2 sn | okuma |
| 5 | Alanları doldur | `to` / `value` / `data` yapıştır | — | ~10 sn | — |
| 6 | Cüzdanı bağla | **Cüzdanı bağla** → MetaMask **Connect** | `MetaMask bağlandı, ağ Sepolia (11155111)` · bağlı hesap | ~5 sn | — |
| 7 | **İmzala** | **Digest hesapla ve imzala** | `Digest hesaplanıyor ve imzalanıyor… (~10 sn)` → DOMAIN_SEPARATOR, digest, `value geri okuma`, `✓ imza uzunluğu 3688 bayt`, `imzalama tamamlandı (…ms)` | **~10 sn** (ÖLÇÜM: 9.303,4 ms) | — |
| 8 | **Negatif kanıt** | **Bozuk imzayla dene** | `✓ Kontrat bozuk imzayı reddetti — imza gerçekten doğrulanıyor.` + `PQWallet: invalid signature` + *"Gaz harcanmadı… Saklanan gerçek imza değişmedi"* | ~2 sn | **eth_call, tx YOK** |
| 9 | **GERÇEK TX** | **Zincire gönder** | `DURUM: KONTROL` → `DURUM: KONTROL` (ön-uçuş) → `DURUM: MetaMask ONAYI BEKLENİYOR` | ~3 sn | kalkan 1-2-3 okuma |
| 10 | MetaMask onayı | **§4'ü oku, sonra Confirm** | — | okuma süresi kadar | — |
| 11 | Yayın | — | `DURUM: ZİNCİRDE BEKLENİYOR` + Tx hash | ~12 sn (MetaMask "~12 sec") | **tx yayınlandı** |
| 12 | Onay | — | `DURUM: ONAYLANDI` · `İşlem zincire gönderildi ve onaylandı.` · hash, Etherscan, `… gas kullanıldı (limit: …)`, blok · `txOut`: *"İmza bu işlemde kullanıldı"* | — | kazıldı |
| 13 | Zincir göstergesi tazelenir | — (otomatik) | nonce **6**, yeni bakiye | ~2 sn | okuma |
| 14 | Etherscan | ekrandaki linke tıkla | `Success` · `To 0x2EafA…` | ~5 sn | okuma |

**Toplam tahmini: ~1,5–2 dakika** (10. adım okuma süresi hariç).

> **KARAR: Akif — MetaMask REDDET sahnesi demoda olsun mu?**
> *Lehte:* reddedilebilirliği ve buton kilidinin geri açılmasını gösterir;
> `DURUM: REDDEDİLDİ (MetaMask)` etiketi kadraja girer.
> *Aleyhte:* MetaMask penceresini **iki kez** açmak gerekir (önce Reddet,
> sonra Confirm) ve yanlış düğmeye basma riski ikiye katlanır. Ayrıca
> reddediş imzayı tüketmediği için sürekliliğe zarar vermez.
> Eklenecekse yeri **9 ile 10 arasıdır** (aynı imza korunur).
>
> **KARAR: Akif — rastgele anahtarla ön-uçuş reddi sahnesi demoda olsun mu?**
> Bu sahne sayfayı yenilemeyi ve owner anahtarını **yeniden** içe aktarmayı
> gerektirir; tek çekim şartını bozmaz ama akışı ~30 sn uzatır. 24 Eylül'de
> zaten ölçüldü ve kanıt dosyasında duruyor
> (`crypto-tests/sprint4-number-format-and-status-labels.md` § 4.1).

---

## 4. DURDURMA KURALLARI

> ### 🛑 ONAY DÜĞMESİNE BASMADAN ÖNCE
>
> **Ekranda şunlardan biri varsa: MetaMask'te REDDET, kaydı durdur, tekrar deneme.**
>
> - Beklenmeyen bir DURUM etiketi
> - Herhangi bir kırmızı hata satırı
> - `Zincirdeki nonce` **5'ten farklı**
> - MetaMask'te **"Added protection" kutusu İŞARETLİ** (§12 ön koşul 1)
> - MetaMask'te `Interacting with` **PQWallet değil** (§12 ön koşul 2)
> - MetaMask'te **"Account update" / "Smart account" / "Upgrade"** ibaresi
>   (§12 ön koşul 3 — *"Reddetmenin maliyeti sıfırdır"*)
> - Ağ Sepolia değil, ya da hesap beklenen EOA değil
>
> ### 🛑 ONAY DÜĞMESİ
>
> - **Yalnız BİR kez basılır.**
> - **Yazısını okumadan basılmaz.** Cancel solda, Confirm sağda.
> - Emin değilsen `Esc` — reddetme sayılır, maliyeti sıfırdır.
>
> ### 🛑 ONAYDAN SONRA TERS GİDERSE
>
> - **HİÇBİR ŞEYE DOKUNMA.** Tekrar gönderme, sayfayı yenileme, butona basma.
> - **Tx hash'i not al** (ekranda `DURUM: ZİNCİRDE BEKLENİYOR` altında duruyor;
>   hata durumunda `SONUÇ ALINAMADI (tx gönderildi)` altında).
> - Kaydı durdurma — ekranda ne olduğu kanıttır.
> - Sonra § 5'in şablonunu doldur; hash varsa akıbet Etherscan'den okunur.

---

## 5. TX SONRASI KANIT — boş şablon

### 5.1 Tx

| | ölçülen |
|---|---|
| tx hash | ............................ |
| blok | ............................ |
| `status` | ............................ |
| `gasUsed` | ............................ |
| zincirdeki tx gaz limiti | ............................ |
| UI'da görünen limit | ............................ |
| tx tipi | ............................ |
| `authorizationList` | ............................ |
| `n` (calldata bayt) | ............................ |
| `z` (sıfır bayt) | ............................ |

```bash
RPC=https://ethereum-sepolia-rpc.publicnode.com
cast tx      <HASH> --rpc-url $RPC
cast receipt <HASH> --rpc-url $RPC
cast code 0xe0BF2D190f8e2F2fc97cF19244845F8FeBDB7351 --rpc-url $RPC   # beklenen: 0x
```

### 5.2 Tx sonrası zincir okuması

**Etiket: tx'ten SONRA okundu.**

| | ölçülen |
|---|---|
| okuma anı — blok | ............................ |
| okuma anı — UTC | ............................ |
| `nonce()` | ............ **beklenen: 6** |
| PQWallet bakiye | ............................ |
| uç | `ethereum-sepolia-rpc.publicnode.com` |

> Okuma tx anında alınmadıysa **kaç blok sonra** alındığı yazılır ve araya
> işlem girmediği **ÇIKARIM** olarak etiketlenir (§13 ekinin şerhi, `:1427-1433`).

### 5.3 Ön kayıt ↔ ölçüm karşılaştırması

Ön kayıt ADIM 0'da yazılıp commit'lenecek. Kayıttan sonra satır satır doldur:

| kalem | ön kayıt | ölçülen | eşit mi |
|---|---|---|---|
| tx tipi | `0x2` | ............ | ☐ |
| tx `to` | PQWallet `0x2EafA…f000BB` | ............ | ☐ |
| `authorizationList` | YOK | ............ | ☐ |
| `n` | 3908 | ............ | ☐ |
| `gasUsed` | `216.305 − 12·(z − 203)` → ............ | ............ | ☐ |
| `nonce()` | 5 → **6** | ............ | ☐ |
| PQWallet bakiye | `50600000000000000` → ............ | ............ | ☐ |
| `cast code <EOA>` | `0x` | ............ | ☐ |
| ön kayıt commit saati | ............ | blok saati: ............ | commit önde mi ☐ |

> **KARAR: Akif — `gasUsed` formülü nonce 5 için aynen mi geçerli?**
> Formül nonce 3 ve 4'ten türedi, iki koşuda doğrulandı (`:1295-1300`).
> Farklı bir `to` seçilirse (soğuk/boş alıcı) **taban değişir** ve formül
> olduğu gibi uygulanamaz — § 1'deki alıcı kararına bağlı.

### 5.4 Ekran görüntüleri

| kare | dosya |
|---|---|
| Etherscan `Success` sayfası | `docs/evidence/screenshots/sprint4-demo-etherscan.png` |
| `DURUM: ONAYLANDI` + receipt bloğu | `docs/evidence/screenshots/sprint4-demo-onaylandi.png` |
| `DURUM: ZİNCİRDE BEKLENİYOR` | `docs/evidence/screenshots/sprint4-demo-zincirde-bekleniyor.png` |
| (görülürse) REVERT / SONUÇ ALINAMADI | `docs/evidence/screenshots/…` |

### 5.5 İlk kez ekranda görülen etiketler

Dördü de bugüne kadar **kodda var ama ekranda hiç görülmedi**
(`crypto-tests/sprint4-number-format-and-status-labels.md` § 5). Bu kayıt
onların ilk gözlemi olacak:

| etiket | kod | gözlendi mi | not |
|---|---|---|---|
| `DURUM: ZİNCİRDE BEKLENİYOR` | `main.js:736` | ☐ | ~12 sn görünür |
| `DURUM: ONAYLANDI` | `main.js:762` | ☐ | `receipt.status === 1` |
| `DURUM: ZİNCİRDE REVERT` | `main.js:778` | ☐ | yalnız tx revert ederse |
| `DURUM: SONUÇ ALINAMADI (tx gönderildi)` | `main.js:880` | ☐ | yalnız yayın sonrası hata olursa |

Son ikisinin **görünmemesi beklenen** — görünürlerse demo durdurulur ve § 4'ün
son kuralı uygulanır.

### 5.6 Video kanıtı

- [ ] Kayıt tek çekim, kesme yok
- [ ] Video dosyasının SHA-256'sı alındı: `shasum -a 256 <dosya>`
- [ ] Kayıt anındaki kaynak md5'leri: `index.html`, CSS, `main.js`,
      `sendTransaction.js`, `digest.js`, `buildTransaction.js`
      (`scope-design.md:330-334` — kayıt sonrası bu dosyalar değişirse
      **video yeniden çekilir**)
- [ ] Sprint 3'ün eski kaydı (`sprint3-end-to-end-recording.mp4`,
      SHA-256 `f7be0790…abe1b`) **silinmedi**

### 5.7 Bunlar nereye yazılacak

**Yeni dosya:** `docs/evidence/crypto-tests/sprint4-recorded-demo-run.md`

Ayrıca **TARİHLİ EK** olarak (defter kuralı — yukarısı silinmez):

| dosya | ne eklenecek |
|---|---|
| `crypto-tests/sprint4-gas-table-and-second-tx.md` | nonce 5 koşusu: ön kayıt ↔ ölçüm tablosu, `gasUsed`, `z` |
| `crypto-tests/sprint4-number-format-and-status-labels.md` § 5 | dört etiketin artık gözlendiği (ya da gözlenmediği) |
| `evidence/tx-hashes.md` | yeni tx satırı |
| `.superpowers/sdd/progress.md` | koşunun özeti |

---

## KARAR: AKİF — kayıttan önce kapatılacaklar

1. **Nonce 5 ön kaydı** yazılıp commit'lenecek mi, içeriği ne? (§ 0 ADIM 0, § 5.3)
2. **Demo tx parametreleri** — nonce 4'ünkiler mi kullanılacak, yoksa başka bir
   `to` mu? (§ 1)
3. **Alıcının gas'ı ödeyen hesapla aynı olması** videoda nasıl anlatılacak? (§ 1)
4. **Negatif kanıt sahnesi** demoda olsun mu? (spec istiyor; § 3)
5. **MetaMask REDDET sahnesi** eklensin mi? (§ 3, yeri 9-10 arası)
6. **Rastgele anahtarla ön-uçuş reddi sahnesi** eklensin mi? (§ 3)
7. **`gasUsed` formülü** nonce 5 için aynen mi geçerli — alıcı kararına bağlı? (§ 5.3)
