# Son 5 gün — plan ve görev dağılımı

**Yazıldı:** 25 Eylül 2026 akşamı
**TEKNOFEST:** 30 Eylül Çarşamba – 4 Ekim

> Bu dosya **ileriye dönük plandır.** Bugünkü **durum** ayrı dosyada:
> `docs/handoff/2026-09-25-devir.md`. Sayılar ve ölçümler orada, burada
> tekrarlanmıyor.

---

## Takvim — 4 tam gün

| gün | iş | kim |
|---|---|---|
| **26 Cmt** | Frontend: tasarım yönü kararı + **kapsamı sınırlı** cila | Akif |
| **27 Paz** | Frontend bitir · **demoyu yeniden çek** (nonce 7) · akşam **kod DONDURULUR** | Akif |
| **28 Pzt** | Sunum (slaytlar) + rapor iskeleti | Akif |
| **29 Sal** | Rapor bölümleri · **3 prova** · farklı makinede demo testi · yedek video | ikisi |
| **30 Çar** | TEKNOFEST | — |

**Hakan'ın dördü en geç 27 Pazar akşamı** elde olmalı — 28'de rapora ve
README'ye girecek.

### Neden demo yeniden çekilecek

Spec kuralı (`specs/2026-09-14-sprint4-scope-design.md:330-334`): kayıt
anındaki `index.html` + CSS + `main.js` + `sendTransaction.js` md5'leri
sonradan değişirse **video yeniden çekilir.** Frontend cilası bu dosyalara
dokunacağı için bugünkü video (SHA-256 `c5471c98…`) geçersizleşir.

Yeni çekim **nonce 7** ile yapılacak ve **aynı protokol** uygulanacak:
ön kayıt → push → `pushed_at` ile sıra kanıtı → tx. Şablon:
`docs/evidence/c-nonce6-prerecord.md` ve `docs/evidence/c-run-sheet.md`.

Ödeyen EOA'da 0,046 ETH var, bir tx ~0,0006 ETH — bütçe sorun değil.

### 🛑 KARAR NOKTASI — 27 Pazar akşamı

O akşam frontend bitmemişse **dondur ve geç.** Gerekçe: sunum ve prova
sıfırdan yapılacak ve jüri karşısına provasız çıkmak, cilasız arayüzden
pahalıdır. Yarım kalan cila geri alınır (`git checkout`), bugünkü video
geçerli kalır.

### 🛑 KESME KURALI — 28 Pazartesi akşamı

Rapor gecikiyorsa **iskelet + bölüm→kanıt haritasında durdur**, 29'u
tamamen provaya ayır. Kanıt dosyaları zaten jüriye gösterilebilir durumda;
eksik olan derlenmiş metin, kanıt değil.

---

# § 1 — HAKAN'A

Selam. Kod ve kontrat tarafı bitti, ölçtüm:

- `forge test` → **35 test, hepsi geçiyor**
- Dört kontrat da Sepolia'da **doğrulanmış**
- Zincirdeki `PQWallet.verifier()` gerçek verifier'ı gösteriyor, mock değil
- `contracts/src/` altında tek bir `TODO` ya da stub yok

**Senin tarafında yapılacak kod işi kalmadı.** Kalan dört şey belge ve teyit.

### Bir düzeltme — sana yazdığım bir madde yanlıştı

Önceki notta *"execute revert edince nonce artmıyor iddiası test edilmedi,
Foundry testi senin alanın"* demiştim. **Yanlışmış — test zaten var ve
geçiyor:** `contracts/test/PQWallet.t.sol:100-110`,
`test_Execute_RevertsWhenTargetCallFails`, içinde
`assertEq(wallet.nonce(), nonceBefore)` assertion'ı duruyor. Verifier reddi
için de ayrı test var. **Bu madde için senden bir şey istemiyoruz.**

### Senden istenenler — en geç 27 Pazar akşamı

**1. README gas tablosu** (`README.md:133-134`)
Eski sayılar duruyor: `233.429` (senin ilk tx'in, tek seferlik ek maliyet
taşıyor) ve `258.429` (tahmin, "henüz zincirde ölçülmedi" yazıyor).
Artık üçü de ölçüldü:

| alıcı | gasUsed |
|---|---|
| sıcak (kendine iade, test düzeneği) | 216.269 |
| **soğuk + var olan — tipik işlem** | **218.721** |
| soğuk + boş (yeni adres) | 243.817 |

Kaynak olarak `docs/evidence/crypto-tests/sprint4-c-row-measurement.md`
göster. **Senin dosyan, ben dokunmadım.**

**2. EIP referanslarını teyit et**
Farkları kaynaklara bağladım ama **spec metnine bakmadan, hafızadan**.
Sayılar zincirde ölçüldü; **eşleştirmeler teyide muhtaç.** Kontrol et:

| sayı | bağladığım kaynak | doğru mu |
|---|---|---|
| 2.500 | EIP-2929 (`COLD_ACCOUNT_ACCESS_COST` 2600, `WARM_STORAGE_READ_COST` 100) | ☐ |
| 25.000 | Yellow Paper Appendix G `G_newaccount`; "boş" tanımı EIP-161 | ☐ |
| 12 gas/bayt | sıfır-dışı 16 → EIP-2028; sıfır 4 → YP `G_txdatazero` | ☐ |
| EIP-7623 taban `21000 + 10·(z + 4·nz)` | EIP-7623, `TOTAL_COST_FLOOR_PER_TOKEN` = 10 | ☐ |

Bu rapora giriyor; kaynaksız sayı koyamayız.

**3. Foundry ↔ Sepolia farkı — bu en önemlisi**
`RAPOR_HAM_ICERIK.md` Böl. 5'te `PQWallet.execute` için **88.247** yazıyor,
canlı Sepolia ölçümü **216.269**. **2,5 kat** fark var.

Bir hata olduğunu düşünmüyoruz — iki farklı ölçüm ortamının farkı. Ama
raporda iki tablo yan yana durursa **jüri sorar ve cevabımız yok.**

Sorumuz net: **`RAPOR_HAM_ICERIK.md` Böl. 5'teki tablo tam olarak neyi
ölçüyor?** Foundry intrinsic maliyeti sayıyor mu? `MockVerifier` mi
kullanılmış, gerçek verifier mı? Sebebi **tahmin etmiyoruz**, senden
duymadan rapora tek kelime yazmıyoruz.

**4. WASM'ı kendi makinende derleyebilir misin? (~15 dk, opsiyonel)**
22 Eylül'de dosyaların sha256'sını aldın, aynı çıktı — ama **derlemedin**,
depodaki hazır dosyayı hash'ledin. Yani ölçülen şey git'in dosyayı bozmadan
taşıdığıydı; iki makinede aynı kaynaktan aynı çıktı üretilip üretilmediği
**hâlâ ölçülmedi**.

```
1) rustup kur (https://rustup.rs), sonra:  cargo install wasm-pack
2) cd pq-safe/frontend && bash scripts/build-wasm.sh
3) bash scripts/verify-wasm.sh
```

3. adım **OK** derse iki makine aynı çıktıyı veriyor. *"toolchain farklı,
karşılaştırma atlandı"* derse sürümler tutmamış — çıktıyı yolla.
Kuramıyorsan sorun değil, "ölçülmedi" diye yazarız.

### 29 Salı — provalar

En az 3 tam prova yapılacak. **Soru-cevap listesinin teknik yarısı senden**:
jürinin kontrat tarafına sorabileceği sorular ve cevapları. Konumlandırma
(neden post-kuantum, neden şimdi) Akif'te.

### Bilgi

Demo işleminde cüzdandan senin hesabına **0,0001 test ETH** gitti.
Tx: `0x6b8bbecd0bc7fefc36ed5120d09410af7aff970950599652510828c28cd312ff`

---

# § 2 — COWORK CLAUDE'A

## Durum

Kod ve ölçüm tarafı kapandı. Üç gas satırı zincirde ölçüldü, iki ön kayıt
sıfır farkla tuttu, demo çekildi. Ayrıntı: `2026-09-25-devir.md`.

**Kalan 4 gün kod işi değil:** frontend cilası, sunum, prova, rapor.

## Bu oturumda senden gelen düzeltmeler

Üçü depoda karşılığı olmayan varsayımlardı ve ölçümle düzeltildi
(`2026-09-25-devir.md` § C.1): `render.js` yok · §12 bozulmaz, kapandı ·
negatif kanıt MetaMask'e gitmiyor.

**Biri doğruydu ve önemliydi:** *"commit bloktan 73 dk önde"* hesabının
commit tarihine dayandığını yakaladın. Commit tarihi istemci üretimidir;
push zamanına çevrildi ve GitHub `pushed_at` ile sunucu tarafı damga alındı.
**Bu düzeltme olmasaydı manşetin dayanağı zayıf kalırdı.**

## Bugün kendi işimde bulduğum bir hata — kayda geçiyorum

Devir notuna *"`receipt.status === 0` iddiası kaynak okumasına dayanıyor,
Foundry testi yok, Hakan'ın alanı"* yazmıştım. **Yanlıştı.** Test var ve
geçiyor (`contracts/test/PQWallet.t.sol:100-110`). Planın Task 12 Adım 2
tablosu da aynı hatayı taşıyor. İkisi de güncellenecek.

**Ayrım şu:** kontrat davranışı Foundry ile kanıtlı. Gözlenmemiş olan
*frontend'in* revert ekranı — arayüz gözlemi, kontrat açığı değil. İkisini
karıştırmışım.

## Rapor aşamasında incelemeni istediklerim

1. **EIP eşleştirmeleri.** Hafızadan yazıldı, spec'e karşı doğrulanmadı.
   Hakan'a soruldu; ondan cevap gelmezse raporda nasıl ifade edilecek?
2. **"Üç fark da tam oturdu" hükmünün gücü.** Her satır **tek** koşu,
   tekrarlanabilirlik ölçülmedi, `nonce++` maliyeti üç koşuda aynı
   **varsayıldı**. "Ölçüldü ve tam tuttu" ile "üç örnekte tam tuttu"
   arasındaki farkın raporda nasıl korunacağı.
3. **Foundry ↔ Sepolia 2,5 kat.** Hakan cevap vermezse jüri sorduğunda ne
   diyeceğiz? Plan "köprü yazılmaz" diyor — sessiz kalmak da bir cevap mı?
4. **Sınanmamış yollar tablosu.** `ZİNCİRDE REVERT` ve `SONUÇ ALINAMADI`
   etiketleri hiç gözlenmedi. Kontrat tarafı testli, arayüz tarafı değil —
   bu ayrım raporda nasıl yazılsın ki ne fazla ne az iddia edilsin?
5. **Frontend cilası kapsamı.** Kapsam sınırlı tutuluyor (tipografi, boşluk,
   renk, başlık; yapı ve akış sabit). Bu sınır doğru çizilmiş mi, yoksa
   jüri gözünde fark yaratacak şey başka bir yerde mi?
6. **Yeniden çekim riski.** Video yenilenecek, yani bugünkü kanıt zinciri
   (SHA-256 + md5 kapısı) bir kez daha kurulacak. Atlanma ihtimali olan bir
   adım var mı?

## Bir istek

Frontend tasarımı 26–27'de yapılacak. **Tasarım kararlarına bakman
faydalı olur** — ama kapsam genişletme baskısı yapma; 4 gün var ve sunum
sıfırdan yazılacak. Kapsamı daraltan öneriler, genişletenlerden değerli.

---

# § 3 — SONRAKİ TERMİNAL CLAUDE OTURUMUNA

## Nasıl başla

```
1) Önce durumu ÖLÇ, varsayma:
   git status -sb | head -1
   git log --oneline -3
   cast call 0x2EafA294C14b6752128bfd4f5873D1EA39f000BB "nonce()(uint256)" \
     --rpc-url https://ethereum-sepolia-rpc.publicnode.com

2) İki dosyayı oku:
   docs/handoff/2026-09-25-devir.md          ← durum, açık kalemler, kurallar
   docs/handoff/2026-09-25-son-5-gun-plani.md ← bu dosya, plan
```

**Nonce şu an 7** ve **ayrılmamış** — yeniden çekim onu kullanacak.

## İlk iş: frontend tasarımı (26 Cmt)

**Koda dokunmadan önce tasarım yönünü Akif'e sor.** Bu bir tercih meselesi,
teknik bir karar değil; varsayımla başlama. Sorulacaklar: nasıl bir görünüm
(ciddi/kurumsal mı, modern/sade mi), referans aldığı bir arayüz var mı,
renk tercihi.

### Kapsam — Akif'le kararlaştırıldı, genişletme

| dahil | hariç |
|---|---|
| Tipografi, boşluk, hizalama | Yapı ve akış değişikliği |
| Renk düzeni, başlıklar | Bölümlerin yeniden düzenlenmesi |
| Buton ve alan görünümü | `render.js` refactor'ü (Sprint 5'ti, orada kalsın) |
| Sayfa başlığı ve açıklama metinleri | Yeni özellik |

**Dokunulmayacak mantık — bu kod tabanında pahalıya patlamış yerler:**
`syncSendButtons()` tek kaynak kuralı · üç kalkanın sırası (nonce → canlı
digest → eth_call ön-uçuş) · `stage` değişkeni ve DURUM etiketleri ·
koşulsuz `disabled = false` yasağı. Değişiklik sonrası **diff ile göster**
ki bunlara dokunulmadığı görülsün.

### Değişiklikten sonra zorunlu

```
node src/format-test.mjs                    #  8
node src/tx/build-transaction-test.mjs      # 21
node src/tx/send-transaction-test.mjs       # 99
npx vite build
```
Ekran metni değiştiyse **oracle taraması** (`/İmza \(\d+ bayt\)/` gibi
arayan desenler kırılmasın).

## İkinci iş: demoyu yeniden çek (27 Paz)

Frontend dondurulduktan **sonra**. Protokol aynı, şablonları kopyala:

1. **Ön kayıt yaz** — `docs/evidence/c-nonce6-prerecord.md` şablonuyla,
   nonce 7 için. Beklenen digest iki bağımsız kaynakla doğrulanacak
   (elle `cast` + kontratın `_computeDigest`'i).
2. **Commit + PUSH**, `pushed_at` oku ve kaydet.
3. **Akış kâğıdı** — `docs/evidence/demo-run-sheet.md` şablonuyla.
4. Akif çeker, tx atar.
5. Ölçümler, karşılaştırma, yeni SHA-256 ve md5'ler.

> `pushed_at` **son** push'u gösterir; **tx'ten önce** oku, ham çıktıyı
> kanıta yaz. Sonraki push'ta kaybolur.

## Üçüncü iş: sunum (28 Pzt)

Depoda **hiç sunum dosyası yok** (arandı, yok). Sıfırdan.
Akif'e sor: hangi araç (Canva, Keynote, PowerPoint, Google Slides),
kaç dakika, kimin hangi bölümü anlatacağı.

## Dördüncü iş: rapor (28–29)

`docs/RAPOR.md` **hiç oluşturulmadı** — git geçmişinde bile yok.
Task 11 (iskelet + bölüm→kanıt haritası) ve Task 12 (Akif bölümleri),
tarifi `plans/2026-09-14-sprint4-demo-measurement-report.md:1469` ve `:1517`.

**Bloke kalem:** Foundry ↔ Sepolia 2,5 kat. Hakan cevap vermeden köprü
yazılmaz; rapora `> ⚠️ UZLAŞTIRMA NOTU BEKLİYOR` bloğu konur.

## Düzeltilecek iki yer — bugün fark edildi

Devir notu § A.3 #6 ve plan Task 12 Adım 2 tablosu,
*"`receipt.status === 0` iddiası test edilmedi"* diyor. **Yanlış** —
`contracts/test/PQWallet.t.sol:100-110` bunu test ediyor ve geçiyor.
İkisine de **tarihli ek** düşülsün, yukarısı silinmesin.

## Çalışma kuralları

`2026-09-25-devir.md` § A.5'te on madde hâlinde. Özeti:
Akif commit/push atar · `--amend` önerme · tek satırlık `-m`, en fazla
3 dosya · kabuk değişkeni yok, tam yol · ÖLÇÜM/ÇIKARIM etiketi ·
tarihli ek, yukarısı silinmez · tx öncesi ön kayıt + push · test eklerken
kırmızı/yeşil kontrolü · `.env.pqwallet-owner-key` asla okunmaz ·
dokümantasyon commit'inde gizli tarama, desen desen.

## Son olarak

Kod bitti, kontratlar bitti, ölçümler bitti. **Kalan dört gün sunum işi.**
Kapsamı genişleten her öneri provadan çalar; daraltan öneriler değerlidir.
