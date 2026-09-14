# Oturum devir notu — 14 Eylül 2026 (Akif tarafı)

Bir sonraki Claude Code oturumu buradan devam etsin. Önceki not
(`session-handoff-2026-09-13.md`) **eskidi** — bu belge onu değiştirir.
Compaction sonrası buna, `.superpowers/sdd/progress.md`'ye ve `git log`'a
güvenin; hafızaya değil.

> **Değişmeyen kritik bilgi:** owner public key 2. rotasyon anahtarı
> (`0x5c0adf08…`). Gas'ı ödeyen MetaMask hesabı
> `0xe0BF2D190f8e2F2fc97cF19244845F8FeBDB7351`.

## İLK İŞ: pull

```bash
git pull --ff-only origin main
```

## Bugün ne yapıldı — TEK CÜMLE

**Sıfır satır kod yazıldı.** Sprint 4'ün kapsam belgesi ve uygulama planı
yazıldı, altı tur itirazla sertleştirildi, beş commit'te kaydedildi.
`git diff HEAD -- frontend/ contracts/` **boş**.

## Süreç neresinde

```
[1] brainstorming    ✅ bitti
[2] spec             ✅ bitti — docs/superpowers/specs/2026-09-14-sprint4-scope-design.md (583 satır)
[3] writing-plans    ✅ bitti — docs/superpowers/plans/2026-09-14-sprint4-demo-measurement-report.md (999 satır, 12 görev)
[4] uygulama         ⬜ BAŞLAMADI  ← yarın buradan
```

## Bugünün commit'leri

| Commit | Ne |
|---|---|
| `b62430b` | Sprint 4 kapsam belgesi (ilk) |
| `649e900` | kapsam revizyonu — sıra anahtarı, imza bayt ölçümü, faz arası tx yasağı |
| `ee31f3e` | kapsam revizyonu — sıra anahtarı varsayılanı A, K4 `cast` ölçütü |
| `c4c01cd` | uygulama planı (ilk, 12 görev) |
| `f508296` | plan revizyonu — render refactor Sprint 5'e, bayat imza bloğu, `from` sabitliği |

> Belgelerin satır sayıları oturum içinde değişti: spec 561 → **583**
> (son düzenlemelerle büyüdü), plan 1107 → **999** (render refactor
> ertelenince küçüldü). Devir brief'indeki 561/1107 rakamları ara sürümlerden.

---

# Taşınan kararlar ve GEREKÇELERİ

Başlıklar değil, neden öyle olduğu. Bunlar yeniden tartışılacaksa gerekçeleriyle
birlikte tartışılmalı.

## 1. Senaryodan bağımsız içerik + sıra anahtarı

TEKNOFEST'in 30 Eylül öncesi rapor teslim tarihi olup olmadığı **belirsiz**.
İlk yaklaşım "iki senaryonun ortak ön ekini planla" idi ve **yanlıştı**: K2'nin
içeriği senaryoya göre değişiyor (A'da kayıtlı, B'de kayıtsız), yani ön ek
değil.

**Doğrusu: içerik senaryodan bağımsız, sıra bağımlı.** Görevler bir kez yazılır,
başa bir **sıra anahtarı** konur, tarih gelince değişen şey anahtardır —
görevler değil.

| Kalem | Senaryoya bağlı mı |
|---|---|
| ÖK-2, K1, K3, K5, K6 | ❌ İçerik aynı, yalnızca konum değişir |
| **K2 faz 1** | ❌ **Birebir aynı** — ölçüm zinciri ölçüyor, UI'ı değil |
| **K2 faz 2** | ✅ Tek bayrak: `kayıt = evet/hayır` |
| K4 | ✅ Kısmen — diff kapısı yalnızca Senaryo A'da anlamlı |

**Varsayılan anahtar: SENARYO A.** Senaryo B **silinmedi** — tutmanın maliyeti
bir tablo satırı ve bir bayrak; yanlış çıkarsa silmenin maliyeti final
haftasında yeniden planlama.

**Bunun yan kazancı:** plan tarihten kurtuldu. Teslim tarihi bilinmeden de
uygulanabilir.

## 2. İki fazlı ölçüm oturumu ve TEK YÖNLÜ KAPI

Kıt kaynak tx sayısı ya da ETH **değil** (cüzdanda 9 gönderimlik, gas'ta ~88
tx'lik pay var). Kıt kaynak **elle mnemonic oturumu** ve **kayıt disiplini**.
Owner anahtarı gerektiren her şey bu yüzden tek oturumda.

**Faz 1 (kayıtsız):** mnemonic içe aktar → `✓ AYNI` · A, B, C için imza (üçü de
nonce 2) · üçü **iç içe** tekrar testi (n ≥ 5) · B ve C `estimateGas` ·
C adresinin boşluğu `cast` ile.

**Faz 2 (kayıtlı):** sayfa yenile → mnemonic'i **kayıt başlamadan** tekrar içe
aktar → mnemonic taraması → kayıt başlat → imzala → negatif kanıt → gerçek A
tx'i (nonce 2→3).

### TEK YÖNLÜ KAPI — en kırılgan varsayım

**Faz 1 mutlaka faz 2'den önce.** Gerçek tx nonce'u 3'e çıkarınca nonce 2'ye
atılmış **üç imza da ölür** ve ikinci bir elle mnemonic oturumu gerekir.
Performans tercihi değil.

**Ve faz 1 ile faz 2 arasında HİÇBİR tx gönderilmez** — test amaçlı, kazara ya
da "bir şeyi denemek için" bile. Tek satırla bozulabilir.

**A'nın imzası neden faz 1'de de üretiliyor:** üçünün **iç içe** koşulabilmesi
için üçünün imzasının aynı fazda olması gerekiyor. A faz 2'ye bırakılsaydı
"iç içe" kuralı A için hiç uygulanamazdı. A'nın tekrar testi **zorunlu**, çünkü
Δ₂ ile Δ₁ karşılaştırılacak ve **Δ₁ bir A ölçümü**.

**Neden kullanılmayan imzaları atmak bedava:** C13 stateless, leaf tüketimi yok
(`GOREV_SINIRLARI.md` Bölüm 5). XMSS'te üç imzadan ikisini atmak güvenlik olayı
olurdu. **Ölçüm özgürlüğümüz doğrudan şemanın stateless olmasından geliyor** —
rapora girebilecek bir yan gözlem.

## 3. Gas tablosu — B manşet, A değil

Üç alıcı durumu ayrı fiyatta:

| Satır | Alıcı | Değer | Durum |
|---|---|---|---|
| **B** | soğuk + var olan | ≈ 218.700 | **HİPOTEZ** — MANŞET SAYI |
| A | sıcak + var olan | **216.221** | Ölçüldü (tx `0x320e03d9…e50da`) — **test düzeneği** |
| C | soğuk + boş | ≈ 243.700 | **HİPOTEZ** |
| — | İLK tx, nonce 0→1 | 233.429 | Hakan, 7 Eylül — tek seferlik `SSTORE_SET` |

**A manşet OLAMAZ.** `to == from` olduğu için ölçüm zorunlu olarak en elverişli
koşula düştü; kendine para göndermek gerçek bir cüzdan işlemi değil, test
düzeneğidir. En elverişli koşulu norm gibi sunmak, gas defterinde bir kez
düşülen hatanın aynısı olur. Gerçek kullanıcı işlemi neredeyse her zaman **B**.

**Her satırın etiketi: ALICI EOA, `data = 0x`.** Bu etiket yalnızca maliyet
büyüklüğünün değil, "gerçek tüketim ≤ tahmin" cümlesinin **geçerliliğinin de**
koşulu (alıcı kontrat olsaydı 63/64 kuralıyla tüketim limite bağlı hale
gelebilirdi). İkisi aynı dipnota bağlı.

**Karşılaştırma yürütme sütunundan:** ham `estimateGas` farkı ±240 gas calldata
bulaşması taşıyor. `intrinsic = 21000 + 4×sıfır + 16×sıfır-dışı`,
`yürütme = estimateGas − intrinsic`. 113.771'i bu yöntemle çıkarmıştık.

**Beklenen değerler ÖLÇÜMDEN ÖNCE yazılı:** yürütme sütununda `B − A = +2.500`,
`C − A = +27.500`. **Tutmazsa hipotez çürümüştür ve öyle yazılır.** Tahmini
ölçümden sonra yazmak, bu projede üç kez yakalanan boş-assertion biçimidir.

## 4. estimateGas kalibrasyonu — karar ağacı kovalardan ÖNCE

Δ₁ = 219.104 − 216.221 = **2.883** (%1,3334). Tek çiftten ofset modeli çıkmaz.

**Aday mekanizma (HİPOTEZ, ölçülmedi):** `eth_estimateGas` ikili aramadır ve
aralık daralınca erken durur; geth toleransı tarihsel olarak ~%1,5. Ölçülen
%1,3334 bu bandın içinde. Doğruysa Δ bir ofset **değil**, üstten sınırdır.

**Sebebini bulmak KAPSAM DIŞI.** Kalibre ediyoruz, açıklamıyoruz. Δ'yı çıkarıp
"düzeltilmiş ölçüm" yazmak, mekanizması doğrulanmamış bir terimi sayıya
çevirmek olur — defterdeki +5.197 ve −2.500'ün üçüncü tekrarı.

```
tekrarlar birebir aynı mı?
├─ HAYIR → ofset modeli YOK. B ve C "≤ üst sınır". Kovalara BAKILMAZ.
└─ EVET  → Δ₂ ölçülür (faz 2'nin kendi receipt'inden), kovalar uygulanır.
```

Kovalar: `≲100 gas` → sistematik, B "ölçüm" · `100–500` → bant (±) ·
`>500 / işaret değişimi` → kalibrasyon yok, C'ye gerçek tx **gerekli** (Sprint 5).
Eşikler başlangıç değeri; deneyin sonucu eşikleri değiştirebilir.

**İkinci RPC endpoint'inde tekrar:** iki sağlayıcı farklı Δ veriyorsa "ofset"
EVM'in değil **node'un** özelliğidir ve tabloya hiç giremez.

**Δ₂ ek iş istemiyor** — her gerçek gönderim kendi (tahmin, gerçek) çiftini
üretiyor: `limit ÷ 1,2` ve receipt.

## 5. Video — diff kapısı, karar değil kontrol

Kayıt K2 faz 2'de alınır, ayrı çekim oturumu yok. K3 (sınanmamış dallar)
bittikten sonra mekanik kapı:

```
kayıt anındaki md5 == dal testlerinden sonraki md5  →  çekim FİNAL
eşit değil                                          →  YENİDEN ÇEKİLİR
```

**Kapsanan:** `index.html` + CSS + `main.js` + `sendTransaction.js`
(+ dondurulmuş `digest.js`, `buildTransaction.js` — eşit çıkmaları dondurmanın
tuttuğunun yan kanıtı). `index.html` şart, çünkü **kamera DOM'u görüyor,
mantığı değil**.

**Neden kapı gerekli:** bu kod tabanında sınanmamış her dal açıldığında
brief'te olmayan bir hata çıktı (Task 3B keygen kilidi, Task 5 ethers revert'te
receipt döndürmüyor, Task 6 bayat yeşil sonuç) ve **üçünde de düzeltme gönderim
yolunun dosyalarına indi**.

**"Bitti" ölçütü: tek çekim, kesme yok, SHA-256** — ve taze çekim yapıldıysa
`cast` ile bağımsız doğrulama. Kesme, "kesilen yerde ne oldu" itirazını davet
eder; bu videonun değeri sürekliliğinden geliyor.

`cast` ölçütü **senaryodan bağımsız**: Senaryo A'da K1'in canlı regresyon
kanıtını K2'nin tx'i taşır, ama diff kapısı yeniden çekim tetiklerse o taze tx
kanıtı **taşımaya başlar** ve aynı boşluk A'da da açılır.

Sprint 3 kaydı (`sprint3-end-to-end-recording.mp4`, SHA-256
`f7be0790…abe1b`) **yedek olarak kalır, silinmez.**

## 6. K1 yeniden tanımlandı — tesisat değil, ölçülmüş kusur

**Ölçüm:** `main.js`'te `innerHTML = ''` yalnızca **3 kez** geçiyor, üçü de
`chainWarn` (147, 601, 824). Diğer yedi bölge **hiç temizlenmiyor**.

**Sonucu ekranda çelişki:** `invalidateSignature()` (`main.js:124-129`)
`signed = null` yapıp `sendOut`'a "imza geçersiz kılındı" yazıyor ama
**`txOut`'a dokunmuyor** — `txOut` imza bloğunu tutuyor (`:351`, `:376`).
Aynısı başarılı gönderimde: `txOut`'a yazan her şey 272–376 arasında, gönderim
handler'ı (813+) `txOut`'a **hiç** dokunmuyor. Aynı karede "imza hazır" ve
"gönderildi" birlikte görünüyor — ve bu kare kayda giriyor.

Task 6'nın "bayat yeşil sonuç" ve Task 3'ün "ekranda yeni `to`, calldata'da
eski `to`" hatalarıyla aynı aile.

**`sendOut` bilerek temizlenmiyor:** orada tx hash'i, Etherscan linki ve
ölçülen gas duruyor — **kanıtın kendisi**. SAPMA 3 ile A3'ün koruduğu şey o.

---

# ════════ AÇIK MADDELER — Cowork itirazları, bugün CEVAPLANMADI ════════

> **Bu bölüm Cowork'ün yazdığı hâliyle, AYNEN korunuyor.** Her maddenin altına
> repo'daki karşılığı eklendi — çünkü üçü de bugün cevaplandı ve `f508296`'da
> plana işlendi. Maddeler "açık" sanılıp yeniden yapılırsa commit'lenmiş iş
> tekrar edilir.

Bunlar sohbette kaldı, karara bağlanmadı. Yarın planın uygulamasına geçmeden önce üçü de
cevaplanacak. "Sohbette konuşuldu" kayıt değildir.

A1 — estimateGas çağrılarında `from` ZORUNLU
  Plandaki kanca `estimateGas({ to: CONTRACTS.pqWallet, data: calldata })` şeklinde; `from`
  yok. `from` verilmezse sağlayıcı sıfır adresi varsayar.
  Sorun: A satırının tanımı `from`'a bağlı — iç `to` sıcak, çünkü tx göndericisiyle aynı
  adres (EIP-2929 tx.origin'i baştan sıcak listeye koyuyor). Farklı/boş bir `from` ile
  koşulursa iç alıcı soğuk olur, A'nın tahminine +2.500 girer ve B − A ≈ 0 çıkar. O zaman
  "hipotez çürüdü" yazılır — oysa çürüyen hipotez değil, ölçümün ön koşuludur.
  Kural: üç estimateGas çağrısının üçü de `from` = gerçek MetaMask gönderici adresi (gerçek
  tx'i atacak adresin birebir aynısı). Satırlar arasındaki TEK değişken execute()'un iç
  `to`'sudur. "Bitti" ölçütü: kanıt notunda üç çağrının `from`'u yazılı ve aynı.

A2 — K1'in gerekçesi yeniden tanımlanacak
  "Tek render()" talimatı yanlıştı (Cowork yazmıştı, geri aldı): bölge ayrımı kazara değil,
  chainWarn'ın ayrılığı SAPMA 3, 752'deki insertAdjacentHTML A3'ün tx kanıtını ezmeme kuralı.
  Ama bölgeler değişmiyorsa K1 ekranda hiçbir şeyi değiştirmiyor — bu tesisat refactor'ü,
  demo cilası değil. K1 şu an üç farklı işi tek başlıkta taşıyor:
    (i)   mnemonic'in bölüm 1'de DOM'a yazılması kalkıyor — gerçek, küçük, koşulsuz yapılır
    (ii)  ekranda gözle görülür kusur — Sprint 3 devir notundaki şikâyet bir KOD şikâyeti.
          Ekranda somut olarak ne bozuk? İsmi konulamıyorsa düzeltilecek cila yok
    (iii) render.js tesisatı — kazancı test edilebilirlik, demo değil. Dikkat: envanter
          doğrulaması (Task 3) tam da bu refactor'ü doğrulamak için var, yani kısmen kendi
          kendini gerekçelendiriyor
  Karar sorusu: kayıttan ÖNCE main.js'te 56 yazma noktasına dokunmanın karşılığı ne?
  (ii)'ye somut cevap varsa K1 durur; yoksa K1 (i)'e indirilir ve (iii) Sprint 5'e bırakılır.
  Her hâlükârda K1 yeniden adlandırılacak — "demo cilası" başlığı içeriğiyle uyuşmuyor.

A3 — getWriteLog'un kapsamı yazılacak
  Log, yazma ÇAĞRISININ yapıldığını kanıtlıyor; metnin DOM'a doğru düştüğünü değil. Tek
  oracle olarak bırakılırsa "kendi kaydınla kendini sınamak" olur.
  Kural: envanter kapsaması %100 log'dan, nadir dalların metni EN AZ ÖRNEKLEM düzeyinde
  DOM'dan (Playwright). İkisi kanıt notunda ayrı satır.

## Bu üç maddenin repo'daki durumu — HEPSİ CEVAPLANDI (`f508296`)

**A1 → CEVAPLANDI, kural plana girdi ama ÖNCÜLÜ ÇÜRÜDÜ.**
`node_modules/ethers/lib.commonjs/providers/abstract-signer.js` okundu:
`estimateGas` (`:187-188`) çağrıyı `populateCall` → `populate`'tan geçiriyor ve
`from` boşsa **`signer.getAddress()` ile dolduruyor** (`:36-38`). Yani "sağlayıcı
sıfır adresi varsayar" bu kod yolunda **gerçekleşmiyor**; Δ₁ de aynı yoldan
geldiği için tabanı sağlam.

**Kural yine de "bitti" ölçütü olarak plana kondu**, çünkü gerçek bir tehlike
var ve Cowork'ün tarif ettiği sonucu birebir üretir: `getAddress()` MetaMask'in
**o an aktif** hesabını döndürüyor. Ölçümler arasında hesap değişirse `from`
sessizce değişir, A soğur, B−A ≈ 0 çıkar ve ön koşul çürümüş olur.
Yer: plan Task 5, "`from` SABİT KALMALI" bloğu.

**A2 → CEVAPLANDI. (ii)'ye somut cevap BULUNDU, K1 durdu ama küçüldü.**
Ölçüm yukarıda § 6'da. K1 artık **"Ekran tutarlılığı — bayat imza bloğu"**;
Task 1 (bayat `txOut`, ~4 satır) ve Task 2 (mnemonic DOM'dan kalkıyor).
**(iii) `render.js` tesisatı Sprint 5'e ertelendi** — plan Task 3–4 bir
"ERTELENDİ" maddesi olarak duruyor, dört gerekçesiyle (bölgeler birleşemez →
ekranda hiçbir şey değişmiyor · tek kazanç gelecekteki test edilebilirlik,
16 gün kaldı · envanter kendi kendini gerekçelendiriyordu · diff kapısı yeniden
çekim istetirdi). Sprint 4'ün kod yüzeyi böylece **~10 satıra** indi.

**A3 → CEVAPLANDI, kural yazıldı.** `render.js` ertelendiği için şimdilik
konusuz, ama kural plan Task 3–4 erteleme maddesine **şimdiden** yazıldı:
envanter kapsaması %100 log'dan, metin doğruluğu DOM'dan örneklem, ikisi ayrı
satır; ayrıca her render noktası `DOĞAL` / `KANCA` diye etiketlenecek.

---

# ════════ BEKLEYEN İNSAN İŞLERİ (Akif, ajan yok) ════════

İK-1 — owner mnemonic yedeği: KISMEN TAMAM
  Yedek alındı (14 Eylül, elle, çevrimdışı). .env.pqwallet-owner-key hiçbir komuta
  verilmedi, ajan açmadı.
  DOĞRULAMA YAPILMADI: kağıttaki kopyadan içe aktarıp "✓ Zincirdeki ownerPublicKey ile AYNI"
  görülmesi gerekiyor. Dosyadan kopyalanarak değil, KAĞITTAN okunarak — yoksa dosya test
  edilmiş olur, yedek değil. Doğrulanmamış yedek yedek sayılmaz.
  Bu, K2'nin faz 1 ilk adımında bedavaya yapılabilir.

İK-2 — temiz klon testi: YAPILMADI, hâlâ BLOKÖR
  git clone --recursive + npm i + WASM build + .env, tercihen ikinci makinede; sıfırdan
  imza üretilebiliyor mu. Takılan her adım not edilir.
  Demo hakkında Akif'in makinesi dışında ölçülmüş hiçbir şey yok.

## İK-2'ye eklenen ölçülmüş risk

Plan yazılırken bulundu: `contracts/lib/sphincs-minus` üçüncü taraf bir
deponun **yan dalındaki** commit'e sabitli (`eef1f889…`,
`origin/split-jardin-out-200-geef1f88`). Gitlink SHA ile çalıştığı için bugün
sorunsuz; o dal silinir veya force-push yerse **temiz klon kırılır ve kıran şey
bizim makinemizde hiç görünmez.** Jüri tekrar üretmeye kalkarsa aynı risk.
Temiz klon testi **ağdan taze çekerek** yapılmalı, yerel önbellekten değil —
`git submodule status` çıktısında SHA'nın başında `-`/`+` olmadığı görülmeli.
Azaltma seçenekleri (fork / vendor) Sprint 5 kararı.

---

# Ayrıca

- **TEKNOFEST teslim tarihi:** Akif baktı, 30 Eylül öncesi teslim
  **gerekmeyebilir** — teyit edilmedi. Plan **Senaryo A** varsayımıyla
  ilerliyor; Senaryo B ve sıra anahtarı **silinmiyor**. Şartname takvimi ve
  duyurular kontrol edilecek ("rapor", "teslim", "değerlendirme").
- **Hakan'a gidecek maddeler hâlâ iletilmedi:**
  1. tx hash `0x320e03d9…e50da` → `tx-hashes.md`
  2. `execute()` kendi revert'inde nonce artmıyor — Foundry testi. İddia
     `PQWallet.sol:48` **kaynak okumasına** dayanıyor ve **rapora giriyor**
  3. README gas tablosu — dört satırlık koşullu tablo hazır olana kadar bekliyor
  4. `RAPOR_HAM_ICERIK.md` Böl. 5'teki Foundry tablosu neyi ölçüyor
     (`MockVerifier` mı, intrinsic dahil mi)? **Rapor uzlaştırma notu bu cevap
     olmadan yazılmayacak**
  5. `RAPOR_HAM_ICERIK.md` Böl. 4'te 233.429 koşulsuz geçiyor; artık "İLK
     `execute()`, nonce 0→1" koşuluyla
- **Cowork kapsam belgesini ve planı HENÜZ OKUMADI** (bağlantı koptu). Okuyunca
  ek itiraz gelebilir; gelirse ayrı commit'e girer.
- **Cevapsız kalan soru — yarın tekrar sorulacak:** uygulama biçimi.
  **subagent-driven** (her görev taze bağlam, aralarda inceleme) mi, **inline**
  (`executing-plans`, checkpoint'li) mı? Öneri: subagent-driven, çünkü görevler
  tür olarak çok farklı (kod / elle oturum / analiz / belge). Task 1–2 için fark
  küçük (~10 satır), istenirse önce Task 1 inline yapılıp karar verilebilir.

# Raporla ilgili iki bulgu (plan yazarken çıktı)

1. **Kanıt envanteri devir notlarında eksik sayılmıştı.** 13 Eylül notu 7 kanıt
   notu diyor; `docs/evidence/crypto-tests/` altında **16** var, **10'u
   Sprint 3**. Listede olmayanlar: `sprint3-live-signature-verification.md`,
   `sprint3-owner-key-rotation.md`, `sprint3-transaction-builder.md`.
2. **Raporda birbiriyle çelişen iki gas tablosu olacak.** Hakan'ın ham içeriği
   Böl. 5 (Foundry, `sprint2.txt`): `PQWallet.execute` max **88.247**. Bizim
   canlı ölçüm: **216.221**. **2,5 kat fark.** Köprü kurulmazsa jürinin ilk
   sorusu bu olur. **Sebep ölçülmedi, iddia edilmeyecek** — aday açıklamalar
   (Foundry'nin intrinsic'i saymaması, `MockVerifier`) Hakan'ın 4. maddesi
   cevaplanmadan yazılmayacak.

# Yarın ilk iş

1. `git pull --ff-only origin main`
2. Bu notu, `.superpowers/sdd/progress.md`'yi ve planı oku
3. Uygulama biçimi sorusunu cevapla (subagent-driven / inline)
4. **Task 1** başlayabilir — Task 0'a bağlı değil, ~4 satır, TDD sırası planda
   (önce Playwright'la KIRMIZI göster, sonra düzelt)
5. Task 5 (ölçüm oturumu) **İK-1 ve İK-2 kapanmadan başlamaz**

# Çalışma kuralları (değişmedi)

- **Claude `git commit` / `git push` çalıştırmaz.** Komutu Akif'e verir.
- **`.env.pqwallet-owner-key` açılmaz, okunmaz, hiçbir komuta verilmez.**
  Mnemonic'i tarayıcıya Akif elle girer.
- Yalnızca `frontend/**`, `docs/evidence/**`, `docs/superpowers/**`,
  `docs/*.md` (Akif'in), `.superpowers/**` değiştirilir.
- `contracts/src/PQWallet.sol`, `contracts/src/Migration.sol`,
  `contracts/test/`, `contracts/script/`, `docs/evidence/tx-hashes.md`,
  `README.md` → **Hakan'ın, dokunulmaz.**
- `digest.js` ve `buildTransaction.js` **dondurulmuş.**
- SAPMA 3 kapsam dışı; yeniden açılırsa **tek yol ilkesiyle birlikte** açılır.
- 3'ten fazla dosya commit'siz biriktirilmez.
- Test olmadan "bitti" denmez; kanıt `docs/evidence/` altına.
- `.superpowers/sdd/progress.md` **git-ignored** — commit listesine konmaz.

# Bu oturumun dersleri

- **"Ortak ön ek" diye kesmek, değişkeni yanlış yerde aramaktı.** Doğru ayrım
  içerik/sıra ekseninde çıktı ve planı tarihten kurtardı. Bir belirsizlik
  planı bloke ediyorsa, önce belirsizliğin **neyi** değiştirdiği ayrıştırılmalı.
- **En elverişli koşulda ölçüp genellemek, gas defterinde bir kez düşülen
  hatanın aynısı.** A satırı ölçülebildiği için manşet olmaya aday görünüyordu;
  oysa `to == from` bir test düzeneğidir. Manşet B.
- **Ölçülebilir olanı gözleme bırakma.** "Fark varsa kaynağı imzanın sıfır bayt
  sayısıdır" bir çıkarımdı; bayt sayımı + intrinsic hesabı onu üç sonuçlu bir
  ölçüme çevirdi ve üçüncüsü ("açıklanamayan kalan") baştan dışlanmadı.
- **Kod yorumu niyeti gösterir, davranışı değil.** `GAS_FALLBACK` dalının kendi
  yorumu amacını yazıyor ama erişilebilirliğini kanıtlamıyor. Emsali bu kod
  tabanında var: `e.txHash` ölü kod sanılmıştı, A2'de çalıştırılabilir çıktı.
- **Bir refactor'ün gerekçesi "kod şikâyeti" ise, ekrandaki karşılığı
  aranmalı.** Arandı ve bulundu — ama bulunan şey 56 noktaya dokunmayı değil,
  4 satırı gerektiriyordu. Doğru soru "nasıl refactor edelim" değil, "neyin
  bozuk olduğunun adı ne" idi.
