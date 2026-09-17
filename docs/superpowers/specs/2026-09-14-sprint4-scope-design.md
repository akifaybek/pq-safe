# Sprint 4 Kapsam Belgesi — demo cilası, ölçüm, rapor

**Tarih:** 14 Eylül 2026
**TESLİM: 30 Eylül 2026. Teyit edildi 17 Eylül 2026.** Tek terminal tarih;
sonrasında ayrı final ya da demo aşaması yok. **Sıra anahtarı: SENARYO A,
kesin** (§ 5). Takvim: plan § Takvim.
**Pencere:** 14–30 Eylül. (14 Eylül'de "14–20 Eylül, altı gün" yazılmıştı;
teslim tarihi belirsizken kurulan varsayımdı, teyitle güncellendi.)
**Taban commit:** `a5ae60c` (origin/main ile senkron)
**Zincir durumu (enstantane, 17 Eylül 2026 · blok 11725303):**
`PQWallet.nonce()` = 2 · bakiye **0,0509 ETH** · gas hesabı `0xe0BF2D19…B7351`
(0,0495 ETH) · `ownerPublicKey` `0x5c0adf08…` (2. rotasyon)
Bakiye 14 Eylül'de 0,0009 ETH'ydi; Hakan 0,05 ETH düz transfer yatırdı
(`0x5b36f902…`), `execute()` çağrılmadığı için nonce değişmedi.
**Bakiyeden türetilen değerler bu satırdan SABİT alınmaz, ölçüm anında okunur.**

Bu belge **kapsam** belirler: ne yapılacak, ne yapılmayacak, her kalemin "bitti"
ölçütü ne. Uygulama planı **değildir** — o ayrı bir belge
(`superpowers:writing-plans`) ve bu belge onaylandıktan sonra yazılır.

---

## 0. Ön koşullar

| | İş | Durum | Neyi bloke ediyor |
|---|---|---|---|
| ÖK-1 | Owner mnemonic'inin çevrimdışı yedeği | ✅ **Alındı** 14 Eylül (kağıt, elle). Geri yükleme doğrulaması K2 faz 1 adım 1'in içinde | — |
| ÖK-2 | **Temiz klon testi** — `git clone --recursive` + `npm i` + WASM build + `.env`, tercihen ikinci makinede | 🔴 **AÇIK — BLOKÖR** | K6'nın kurulum bölümü; Sprint 5 "farklı makinede demo" |

**ÖK-1 kapandı, ama doğrulaması kapanmadı.** Yedeğin gerçekten geri
yüklenebilir olduğu, K2 faz 1 adım 1'de kağıttaki mnemonic içe aktarılıp
`✓ AYNI` görüldüğünde kanıtlanır. Kağıt çalışmazsa `.env.pqwallet-owner-key`
hâlâ duruyor — oturum durmaz, ama **sonuç kanıt notuna yazılır** (yedek
doğrulandı / doğrulanmadı). Doğrulanmamış bir yedek, yedek sayılmaz.

**ÖK-2 için ölçülmüş bir risk var, temiz klon testi bunu da sınamalı:**
`contracts/lib/sphincs-minus` üçüncü taraf bir deponun **yan dalındaki**
commit'e sabitlenmiş (`eef1f889…`, `origin/split-jardin-out-200-geef1f88`).
Gitlink SHA ile çalıştığı için bugün sorunsuz; o dal silinir veya force-push
yerse temiz klon kırılır ve **kıran şey bizim makinemizde hiç görünmez**. Jüri
tekrar üretmeye kalkarsa aynı risk. Test ağdan taze çekerek yapılmalı, yerel
önbellekten değil. Azaltma seçenekleri (fork / vendor) Sprint 5 kararı.

**ÖK-2 İKİ TARAFI birden kapsar, biri değil:**

1. **Kurulum çalışıyor mu** — klon, `npm i`, WASM build, `.env`, `vite build`.
2. **Kanıt yeniden doğrulanabiliyor mu** — `docs/evidence/`'daki tx hash'leri
   temiz klonun `.env`'iyle gerçekten okunabiliyor mu.

**İkincisi ARŞİV ERİŞİMİ OLAN bir endpoint gerektiriyor** ve **bu şart nota
yazılır.** Ölçüldü: mevcut public sağlayıcı receipt geçmişini ~8.000–10.000 blok
sonra buduyor, `0x320e03d9…`'un receipt'i orada `null` dönüyor. Jüri tekrar
üretmeye kalkarsa tam olarak bu duvara çarpar. Nota hangi endpoint kullanıldığı,
arşiv olup olmadığı ve hangi kanıtların okunabildiği yazılır. (K2'nin repoya
yazdığı ham JSON tutanakları bu duvarı **azaltır, kaldırmaz.**)

---

## 1. NE VAR

### K1 — Ekran tutarlılığı — bayat imza bloğu

> **REVİZYON (plan `f508296` ile eşitlendi).** K1 başlangıçta "çıktı render'ının
> birleştirilmesi — tek `render()`" idi ve "bitti" ölçütü beş maddelik bir
> envanterdi. Plan revizyonu K1'i **ekran tutarlılığına indirdi** ve render
> refactor'ünü Sprint 5'e erteledi; bu bölüm o revizyonun spec karşılığıdır.
> Gerekçeler aşağıda, silinmedi.

**Kapsam:** ekranın kendi kendisiyle çeliştiği tek yerin kapatılması — **bayat
imza bloğu**. `main.js`'te `innerHTML = ''` yalnızca **3 kez** geçiyor, üçü de
`chainWarn` (satır **147**, **601**, **824**); diğer yedi çıktı bölgesi hiç
temizlenmiyor. Sonucu görünür bir çelişki: `invalidateSignature` ve gönderim
başarı yolu `txOut`'a **dokunmuyor**, `txOut` imza bloğunu tutuyor
(`main.js:351`, `:376`) ve orada duruyor. Aynı karede `txOut` *"imza üretildi"*
derken `sendOut` *"gönderildi"* ya da *"imza geçersiz kılındı"* diyor.

**Toplam ~10 satır.** Aynı kalemde bölüm 1'deki mnemonic'in DOM'a yazılmasının
kaldırılması (plan Task 1 + Task 2).

**AÇILMAZ:** kalkan sırası · `syncSendButtons` · `sig` fotoğrafı ·
`sendExecute` yolu · SAPMA 3 · `sendOut`'un mevcut metinleri (tx hash, Etherscan
linki, ölçülen gas — **kanıtın kendisi**).

**"Bitti" ölçütü:**

1. Kusur **önce KIRMIZI** Playwright assertion'ıyla gösterilir → düzeltme →
   **YEŞİL**, ve **pozitif kontrol**: imza geçerliyken `txOut`'un imza bloğunu
   **gösterdiği** doğrulanır (yoksa test "`txOut` hep boş olduğu için" geçer).
2. **Kanarya testi** (mnemonic): üretilen mnemonic'in ilk kelimesi sayfanın tüm
   metninde **0 kez** — kendi pozitif kontrolüyle (açık anahtar ekranda görülüyor).
3. Üç test paketi yeşil · `vite build` geçer · console **yalnızca** favicon 404.

**Kanıt:** `docs/evidence/crypto-tests/sprint4-screen-consistency.md`

#### `render.js` tesisat refactor'ü — **ERTELENDİ → Sprint 5**

Silinmedi; gerekçesi görünür kalıyor ki sonraki okuyan aynı yola baştan
girmesin. Ne olacaktı: `src/ui/render.js` modülü (`render` / `append` /
`setText` + `getWriteLog`), `main.js`'teki **56** DOM yazma noktasının bu
modüle yönlendirilmesi, ve refactor öncesi/sonrası envanter doğrulaması.
Ayrıntı ve `getWriteLog` kapsam kuralı: **plan Task 3–4**.

Dört gerekçe:

1. **Bölgeler birleşmiyor, birleşemez.** `chainWarn`'ın `sendOut`'tan ayrı
   olması SAPMA 3'ün kararı (sessiz tazeleme tx kanıtını ezmesin);
   `main.js:752`'deki `insertAdjacentHTML` A3'ün teşhis satırını **ekleyerek**
   yazıyor. İkisi de kanıt davranışı. Refactor **ekranda hiçbir şeyi
   değiştirmezdi** — tesisat işi, demo cilası değil.
2. **Tek dışsal kazanç "bundan sonraki değişiklikler test edilebilir olur."**
   Finale 16 gün var ve bundan sonraki değişiklik sayısı az.
3. **Envanter doğrulaması kendi kendini gerekçelendiriyordu:** refactor
   yapılmazsa doğrulanacak refactor da yok.
4. **Kayıt penceresi hemen önde.** 56 yazma noktasına dokunmanın regresyon
   riski (2)'deki kazancın karşılığı değil — üstelik K4'ün diff kapısını
   tetikleyip yeniden çekim istetirdi.

---

### K2 — Ölçüm + kayıt oturumu (tek oturum, iki faz)

Kıt kaynak tx sayısı veya ETH değil — cüzdanda 0,0001'lik **9 gönderimlik**,
gas hesabında **~88 tx'lik** pay var. Kıt kaynak **elle mnemonic oturumu** ve
**kayıt disiplini**. Owner anahtarı gerektiren her şey bu tek oturumda.

#### Faz 1 — KAYITSIZ, zincire hiçbir şey gitmez

1. Mnemonic **kağıttaki yedekten** içe aktarılır → `✓ AYNI` (ÖK-1'in
   doğrulaması, sonucu notta)
2. **A, B ve C için imza** — üçü de nonce 2'de. A'nın imzası **gönderim için
   değil**, tekrar testi için: A'nın gerçek gönderimi faz 2'de, sayfa
   yenilendikten sonra kendi imzasıyla yapılacak
3. **Tekrar testi** — A, B, C için ayrı ayrı, her biri n ≥ 5, **üçü iç içe**
   koşulur (art arda beş çağrı tek arka uca düşüp o düğümün önbelleğini
   ölçebilir; sıra karıştırılınca gerçek dağılım yakalanır). Mümkünse ikinci bir
   RPC endpoint'inde tekrarlanır
4. B ve C için `estimateGas`, intrinsic ayrıştırmasıyla birlikte (bkz. § 2)
5. C adresinin boşluğu `cast` ile kanıtlanır: `balance == 0` · `nonce == 0` ·
   `code == 0x`

> **A neden faz 1'de de imzalanıyor?** Üçünün **iç içe** koşulabilmesi için
> üçünün imzasının aynı fazda bulunması gerekiyor; A faz 2'ye bırakılsaydı
> tekrarları ayrı bir fazda, ayrı bir zaman diliminde kalır ve "iç içe"
> kuralı A için hiç uygulanamazdı.
>
> A'nın tekrar testi **zorunlu**, çünkü **Δ₂ ile Δ₁ karşılaştırılacak ve Δ₁ bir
> A ölçümü.** A'nın tahmini tekrarlanabilir değilse kovaların dayandığı
> karşılaştırma baştan anlamsızdır.
>
> **Bedava ölçüm (gözlem değil):** faz 1'in A tahmini ile faz 2'nin A tahmini
> karşılaştırılır. Fark varsa **kaynağı çıkarımla atanmaz, hesaplanır** — iki
> imzanın sıfır / sıfır-dışı baytları sayılır ve intrinsic ikisi için de § 2'nin
> formülüyle hesaplanır. Üç sonuç mümkün:
>
> | Bulgu | Anlamı |
> |---|---|
> | Baytlar aynı | İmzalayıcı deterministik. Nokta |
> | Baytlar farklı, tahmin farkı **hesaplanan intrinsic farkına eşit** | İmzalayıcı hedged; açıklama kapandı |
> | Baytlar farklı, fark intrinsic farkına **eşit değil** | **Açıklanamayan kalan var.** Defterin kapanmadığı durum — sayı yuvarlanmaz, kalan yazılır ve araştırılır |
>
> Üçüncü ihtimal baştan dışlanmaz. B ve C satırlarına uygulanan normalizasyon
> kuralının aynısı burada da geçerli: fark **ölçülür**, mekanizma atanmaz.
>
> Bu bir **"bitti" ölçütü değildir** — üçüncü dal çıkarsa kalem bloke olmaz,
> ama kalan kanıt notuna açıkça yazılır.

#### Faz 2 — KAYITLI

6. Sayfa yenilenir (faz 1'in çıktısı ekranda birikti, temiz kayıt üstüne
   çekilemez) → mnemonic **kayıt başlamadan** tekrar içe aktarılır
7. Mnemonic taraması (Sprint 3 prosedürü: `btn-keygen`'e basılmaz, import alanı
   boş, `Cmd+F` ile kelime araması 0 sonuç, DevTools kapalı)
8. **Kayıt başlatılır**
9. A imzalanır → negatif kanıt → **gerçek A tx'i** (nonce 2→3). Δ₂ bu adımın
   kendi limitinden ve kendi receipt'inden çıkar; ek ölçüm yapılmaz
10. Kayıt anındaki `index.html` + CSS + `main.js` + `sendTransaction.js`
    (+ dondurulmuş `digest.js`, `buildTransaction.js`) md5/commit'i not edilir
11. Kayıt sonrası `cast` ile bağımsız doğrulama: nonce 3, bakiye, receipt

#### SERT SIRA KURALI

**Faz 1 mutlaka faz 2'den önce.** Gerçek tx nonce'u 3'e çıkarınca nonce 2'ye
atılmış bütün imzalar ölür ve **ikinci bir elle oturum** gerekir. Performans
tercihi değil, tek yönlü kapı.

> **SERT HATIRLATMA — faz 1 ile faz 2 arasında HİÇBİR tx gönderilmez.**
> Üç imza da nonce 2'ye bağlı ve nonce 2'de kaldığı sürece yaşıyor. Araya
> **herhangi** bir `execute()` girerse — test amaçlı, kazara, ya da "bir şeyi
> denemek için" — üçü birden ölür ve ölçüm zinciri baştan, ikinci bir elle
> mnemonic oturumuyla kurulur. Bu, oturumun en kırılgan varsayımı ve tek satırla
> bozulabilir.

Kullanılmayan imzaları çöpe atmanın bedeli yok: C13 stateless, leaf tüketimi
yok (`GOREV_SINIRLARI.md` Bölüm 5). XMSS'te üç imzadan ikisini atmak güvenlik
olayı olurdu. **Ölçüm özgürlüğümüz doğrudan şemanın stateless olmasından
geliyor** — rapora girebilecek bir yan gözlem.

**"Bitti" ölçütü:** tx status 1 · `cast` ile bağımsız doğrulama tamam · tekrar
testi sonucu karar ağacındaki bir dala yerleşti · dört satırlık tablo (§ 2)
dolduruldu · kayıt alındı ve md5'ler not edildi ·
**`eth_getTransactionByHash` ve `eth_getTransactionReceipt` çıktılarının TAM
JSON'ı repoya yazıldı** (aşağıda).

#### Ham tx/receipt JSON'ı repoya alınır

**Ölçülmüş sebep:** `.env`'deki public RPC sağlayıcı **receipt geçmişini
buduyor** — sınır ~8.000–10.000 blok (≈ 30 saat). Bu Sprint 3'ün kanıt
zincirini de vuruyor: `0x320e03d9…`'un *"`cast receipt` → status 1 ·
gasUsed 216221"* satırı **artık o endpoint'ten tekrar üretilemiyor olabilir.**
Sprint 4'ün kendi tx'i de günler içinde aynı duruma düşer.

- **Yer:** `docs/evidence/chain/<txhash>.json`. **Dosya sahipliği: Akif'in
  alanı** (yeni dizin). `docs/evidence/tx-hashes.md`'ye **DOKUNULMAZ** —
  Hakan'ın dosyası, append-only.
- **Geriye dönük:** aynısı Sprint 3'ün `0x320e03d9…`'u için de yapılır. Mevcut
  public endpoint vermiyorsa **arşiv erişimi olan bir endpoint** kullanılır
  (§ 8, açık soru 4).
- **Her JSON dosyasının başına:** hangi endpoint'ten, hangi tarihte çekildiği.

> **KAPSAM — raporda fazla iddia edilmez.** Ham JSON **kriptografik kanıt
> değil, tutanaktır**; kendi kendini doğrulamaz. Rapor cümlesi **tam olarak**
> şudur:
>
> > tx hash ve blok numarası **herhangi bir ARŞİV düğümüyle yeniden
> > doğrulanabilir**; aşağıdaki JSON kolaylık kopyasıdır.
>
> **"Zincirden yeniden üretilebilir" yazılmaz** — budayan bir endpoint'te
> üretilemiyor, cümle olduğu gibi yanlış olur.

**Kanıt:** `docs/evidence/crypto-tests/sprint4-gas-table-and-second-tx.md`
+ `docs/evidence/chain/*.json` + kayıt dosyası (repo dışı, kimliği SHA-256).

**Sert kural:** C adresine aradan ETH girmez. Kalibrasyon çöker ve C'ye gerçek
tx gerekirse (Sprint 5), gönderimden hemen önce üçlü boşluk kontrolü
**tekrarlanır** — faz 1'de boş olması haftaya boş olduğunu göstermez.

---

### K3 — Sınanmamış iki dal (**K1'den SONRA, ve artık K4'TEN DE SONRA**)

K1 bu dalları yeniden kırabileceği için K1'den sonra.

> **REVİZYON (16 Eylül) — K3, K4'ün ARKASINA alındı.** Gerekçe, K3'ün
> `GAS_FALLBACK` analizinden çıktı (`FALLBACK_SONUC = DENETİMLİ_AĞ`, plan
> Task 8): hedef çağrı `signer.estimateGas` ve signer **MetaMask'in**
> sağlayıcısı, uygulamanın `VITE_SEPOLIA_RPC_URL`'i değil. Yani proxy
> **MetaMask'in ağ tanımına** girmek zorunda — repo dosyası olmayan bir
> **ortam** değişikliği.
>
> **K4'ün diff kapısı bunu göremez:** kapı beş repo dosyasının md5'ine bakıyor,
> MetaMask ayarı hiçbirine dokunmuyor. RPC geri alınmazsa ya da kapı yeniden
> çekim tetiklerse, taze kayıtta MetaMask arayüzünde `localhost` RPC görünür ve
> proxy **gerçek bir tx'in** yolunda olur.
>
> K3 kayıt kesinleştikten sonra koşarsa bu risk **sıfırlanıyor**; K3 kritik
> yolda değil (60–90 dk, kimseyi bloke etmiyor) ve sonucu yalnızca rapora
> giriyor. Ayrıntı ve adımlar: plan Task 9.

#### `ACTION_REJECTED`
MetaMask'te "Reddet". Gerçekten beş dakikalık iş, ek analiz gerekmiyor.

#### `GAS_FALLBACK = 350.000` — önce analiz, sonra sınama

**K3'ün ilk adımı kod okuyarak erişilebilirlik analizidir**, sınama değil.
Soru: ön-uçuş (`preflight` → `eth_call`) ile `estimateGas` arasında, tahmini
patlatıp ön-uçuşu patlatmayan bir hata sınıfı var mı?

İki metod aynı yolda olsalar da **aynı maliyette değiller**: `estimateGas`
düğümde ikili aramadır, yürütmeyi defalarca koşar; 3,9 KB calldata + ~216k
gas'lık bir yürütmede sunucu tarafı maliyeti `eth_call`'un katları. Public
sağlayıcılarda metod başına ayrı limit/zaman aşımı kuraldır. Üstüne ön-uçuş ile
tahmin arasında zaman aralığı var.

Analiz **üç sonuçlu**:

| Sonuç | Yapılacak |
|---|---|
| **Doğal yoldan erişilebilir** | Doğrudan sınanır, proxy'ye gerek yok |
| **Yalnızca denetimli ağ koşuluyla** | Proxy yolu denenir (aşağıda) |
| **Yapısal olarak ölü kod** | Sınama yok. Kanıt notuna dalın neden var olduğu ve neden erişilemediği yazılır. **Bu bir bulgudur, başarısızlık değil** |

**Proxy yolu:** **MetaMask'in ağ tanımındaki** Sepolia RPC ucu yerel küçük bir
proxy'ye çevrilir; proxy her metodu geçirir, **yalnızca `eth_estimateGas`'a
hata döner**. Ön-uçuş sağlıklı geçer, tahmin patlar, hedef dal koşar.

> **Hedef `.env` DEĞİL — ölçüldü (plan Task 8).** `signer.estimateGas`
> MetaMask'in sağlayıcısından gidiyor (`BrowserProvider(window.ethereum)`,
> `sendTransaction.js:15,24`); uygulamanın `VITE_SEPOLIA_RPC_URL`'i yalnızca
> salt-okunur çağrıları taşıyor (`readNonce`, `readDigest`, …). `.env`'e
> konan bir proxy hedef dal için hiçbir şey yapmaz.

Bu **enjeksiyon değildir**: bizim kodumuzun tek satırı değişmiyor, ethers'ın
kendi yolu, gerçek handler, gerçek MetaMask. Üretilen şey gerçek bir RPC-katmanı
hatası — dalın savunmak için var olduğu durumun ta kendisi, sadece kaynağı
denetimli. "Kendi taklidinle sınama" kuralı **kendi kodunun** taklidini
yasaklıyor, denetimli bir ağ koşulunu değil.

**Maliyet:** **60–90 dakika**. (İlk tahmin 30–45'ti ve proxy'nin `.env`'e
konacağı varsayımına dayanıyordu; ölçüm o varsayımı çürüttü. Fark MetaMask
tarafından geliyor: proxy tam geçirgen olmalı, `chainId` 11155111 korunmalı —
yeni ağ eklenirse `chainChanged` bağlantıyı düşürür ve dala hiç gelinmez — ve
ayarın geri alınması + doğrulanması işin parçası.)

**"Bitti" ölçütü:** `ACTION_REJECTED` ekranda görüldü + ekran görüntüsü ·
`GAS_FALLBACK` için analiz sonucu üç daldan birine yazıldı ve gereği yapıldı ·
**MetaMask onay ekranında gas limitinin 350.000 olduğu görüldü** (yeri
belirtilerek) **ve not render'ının SINANMADIĞI açıkça yazıldı.**

> **Ölçüt neden "ekranda not" değil:** iki dal tek koşuda, sıfır gazla
> kapanıyor (tahmin patlar → 350.000 → MetaMask → İPTAL). Ama iptal
> `sendExecute`'u fırlatıyor ve `main.js:694`'teki *"tahmin başarısız oldu,
> sabit limite düşüldü"* notu **hiç render edilmiyor** — `catch` `sendOut`'u
> iptal mesajıyla eziyor. Dalın **hesabı** koşuyor, **gösterimi** koşmuyor.
> Oracle bu yüzden cüzdana giden gerçek parametre: `350.000` (sabit) ile
> `estimated × 1,2 ≈ 259.000` karışmaz. Not render'ı **açık kalem** kalır;
> kapatmak 350.000 limitli gerçek bir tx gerektirir → **Sprint 5**.

**Kanıt:** `docs/evidence/crypto-tests/sprint4-untested-branches.md`

---

### K4 — Diff kapısı → video finali

Video ayrı bir çekim oturumu değil; kayıt K2 faz 2'de alındı.

K3 bittikten sonra **mekanik kapı, karar değil**:

```
kayıt anındaki md5  ==  dal testlerinden sonraki md5  →  çekim FİNAL
kayıt anındaki md5  !=  dal testlerinden sonraki md5  →  video YENİDEN ÇEKİLİR
```

**Kapsanan dosyalar:** `index.html` + CSS + `main.js` + `sendTransaction.js`.
Dondurulmuş `digest.js` ve `buildTransaction.js` de sıfır maliyetle hash
setine girer — dondurmanın tuttuğunun yan kanıtı olur.

`index.html` ve CSS'in dahil olması şart: **kamera DOM'u görüyor, mantığı
değil.** K3'te `GAS_FALLBACK` için bir uyarı satırı veya yeni bir `.class`
eklenirse mantık dosyaları hiç değişmeden kayıt ile gönderilen UI ayrışır.

Bu, kanca artıklarını md5 ile sabitleme refleksinin aynısı.

**Neden kapı gerekli:** bu kod tabanında sınanmamış her dal açıldığında
brief'te olmayan bir hata çıktı — Task 3B (keygen kilidi), Task 5 (ethers
revert'te receipt döndürmüyor), Task 6 (bayat yeşil sonuç + imza fotoğrafı
yokluğu) — ve **üçünde de düzeltme gönderim yolunun dosyalarına indi.**

**"Bitti" ölçütü:** **tek çekim, kesme yok**, SHA-256 kanıt notunda **ve — taze
çekim yapıldıysa — `cast` ile bağımsız doğrulama** (nonce, bakiye, receipt).

> **`cast` ölçütü A'da da gerekli.** İlk bakışta gereksiz görünür, çünkü K1'in
> canlı regresyon kanıtını K2'nin tx'i taşır. Ama diff kapısı yeniden çekim
> tetiklerse o taze tx K1'in canlı kanıtını **taşımaya başlar** ve aynı boşluk
> A'da da açılır. Ölçüt bu yüzden duruyor. (Silinen Senaryo B'de de duruyordu.)

Kesme,
"kesilen yerde ne oldu" itirazını davet eder ve bu videonun değeri tam olarak
sürekliliğinden geliyor (imza → negatif kanıt reddi → *aynı* imzayla gönderim →
receipt, aralıksız).

Sprint 3'ün mevcut kaydı (`sprint3-end-to-end-recording.mp4`, SHA-256
`f7be0790…abe1b`) **yedek olarak kalır, silinmez.**

---

### K5 — Gas tablosu

Tekrar testinin sonucuna göre formatlanır (§ 2 ve § 3).

**"Bitti" ölçütü:** dört satır dolu · her satırın koşul etiketi yazılı ·
beklenen değerler ölçümden **önce** yazılmış ve tutup tutmadığı raporlanmış ·
Foundry tablosuyla uzlaştırma notu yazılmış (Hakan'ın 4. maddesi cevaplandıktan
sonra).

**Kanıt:** K2'nin kanıt notu içinde + raporun gas bölümü.

---

### K6 — Rapor (ÖK-2'den itibaren paralel)

Koda bağımlı değil. Yalnızca gas tablosu K2'yi bekler.

**Sprint 4'ün hedef olgunluğu:** iskelet + Akif bölümleri tam. Birleştirme,
redaksiyon ve görsel düzen Sprint 5.

Kapsam:
- Bölüm başlıkları + **bölüm → kanıt notu haritası**. Envanter **16 not**,
  **10'u Sprint 3** — devir notundaki "7 not" eksik sayım
  (`sprint3-live-signature-verification.md`, `sprint3-owner-key-rotation.md`,
  `sprint3-transaction-builder.md` listede yoktu)
- Akif bölümleri yazılı hale: C13, verifier, imza yolu, üç kalkan, negatif
  kanıt, gas defteri, sınanmamış yolların dürüst listesi
- **İki gas tablosunun uzlaştırma notu** (aşağıda)
- Hakan'ın ham içeriği yerleştirilir, **redakte edilmez**

#### Rapordaki çelişki — uzlaştırma notu

Raporda birbiriyle çelişen iki gas tablosu olacak:

| Kaynak | `PQWallet.execute` | `SPHINCSVerifier.verify` |
|---|---|---|
| `RAPOR_HAM_ICERIK.md` Böl. 5 (Foundry, `sprint2.txt`) | 31.751 / 85.793 / **88.247** | 589 / 1.672 / **111.074** |
| Canlı Sepolia ölçümü | **216.221** | **113.771** |

`execute` satırında **2,5 kat** fark var. Rapor köprü kurmazsa jüri iki sayfada
88 bin ile 216 bin görür ve ilk soracağı şey bu olur.

**Sebep ölçülmedi, iddia edilmiyor.** Aday açıklamalar (Foundry raporunun
intrinsic'i saymaması, `PQWalletTest`'in `MockVerifier` kullanıyor olması)
Hakan'ın 4. mesaj maddesi cevaplanmadan **yazılmayacak**. Tahminle köprü
kurmak, gas defterinde üç kez yakalanan hata sınıfının tekrarı olur.

**"Bitti" ölçütü:** iskelet + harita yazılı · Akif bölümleri okunabilir halde ·
gas bölümü K5'i bekliyor olarak işaretli · uzlaştırma notu ya yazılmış ya da
"Hakan'ın cevabı bekleniyor" diye açıkça bloke.

---

## 2. Gas tablosu — kurallar

### Dört satır, sıralama B → A → C

| Satır | Alıcı durumu | Değer | Kaynak |
|---|---|---|---|
| **B** | soğuk + var olan | ≈ 218.700 | **HİPOTEZ** — ölçülecek (+2.500, EIP-2929) |
| **A** | sıcak + var olan | **216.221** | Ölçüldü, tx `0x320e03d9…e50da` |
| **C** | soğuk + boş | ≈ 243.700 | **HİPOTEZ** — ölçülecek (+2.500 +25.000) |
| — | İLK tx, nonce 0→1 | **233.429** | Hakan, 7 Eylül. Tek seferlik `SSTORE_SET` |

**MANŞET SAYI B.** A kendine iade, yani test düzeneği — `to == from` olduğu
için ölçüm zorunlu olarak en elverişli koşula düştü. En elverişli koşulu norm
gibi sunmak, gas defterinde bir kez düşülen hatanın aynısıdır. Gerçek bir
kullanıcı işlemi neredeyse her zaman B'dir.

### Her satırın etiketi: ALICI EOA, `data = 0x`

Alıcı kontrat olursa maliyet sınırsız; calldata dolu olursa intrinsic değişir.
Bu etiket yalnızca maliyet büyüklüğünün değil, § 3'teki "≤ üst sınır"
cümlesinin **geçerliliğinin de** koşulu — ikisi aynı dipnota bağlanır.

### Sütunlar: intrinsic normalizasyonu

B ve C farklı imzalarla ölçülecek ve ham `estimateGas` farkı ±240 gas'lık
calldata bulaşması taşıyor — aradığımız +2.500'ün yanında ihmal edilemez,
model riski olarak hesaplanan ~366 gas ile aynı mertebede.

Karşılaştırma **yürütme** sütunundan yapılır:

```
intrinsic = 21000 + 4×(sıfır bayt) + 16×(sıfır-dışı bayt)
yürütme   = estimateGas − intrinsic
```

Tablo dört sütunlu: **ham tahmin · sıfır/sıfır-dışı bayt · intrinsic ·
yürütme**. Bu, 113.771'i çıkardığımız yöntemin aynısı.

### BEKLENEN DEĞERLER — ölçümden ÖNCE yazılır

Yürütme sütununda:

```
B − A = +2.500      (EIP-2929 soğuk hesap erişimi: 2.600 − 100)
C − A = +27.500     (+2.500 soğuk erişim, +25.000 boş hesap oluşturma)
```

**Tutmazsa hipotez çürümüştür ve öyle yazılır.** Tahmini ölçümden sonra yazmak,
bu projede üç kez yakalanan boş-assertion biçimidir (Task 2'nin string
assertion'ı, defterin +5.197'si, −2.500'ü).

---

## 3. `estimateGas`'ın güvenilirliği

B ve C `estimateGas` ile ölçülecek. Ama tahmin ile gerçek eşit değil:

```
Δ₁ = 219.104 − 216.221 = 2.883  (%1,3334)
```

Elimizde **tek bir** (tahmin, gerçek) çifti var; bir noktadan ofset modeli
çıkmaz.

**Aday mekanizma (HİPOTEZ, ölçülmedi):** `eth_estimateGas` düğümde ikili
aramadır ve aralık daralınca erken durur; geth tarafında tolerans tarihsel
olarak ~%1,5 mertebesinde. Ölçülen %1,3334 bu bandın içinde. Doğruysa Δ bir
ofset **değil**, üstten sınırdır ve aynı çağrıda bile değişebilir.

**Sebebini bulmak kapsam dışı.** Kalibre ediyoruz, açıklamıyoruz. Rapora bu
sayı için mekanizma iddiası girmeyecek. Δ'yı çıkarıp "düzeltilmiş ölçüm"
yazmak, mekanizması doğrulanmamış bir terimi sayıya çevirmek olur — defterdeki
+5.197 ve −2.500'ün üçüncü tekrarı.

### Ayırt edici deney: tekrar testi (bedava)

Aynı girdiyle `eth_estimateGas`, aynı blok state'ine karşı, **n ≥ 5**, **A, B
ve C'nin üçü için**, **iç içe** koşulur. Mümkünse ikinci bir RPC endpoint'inde
tekrarlanır.

| Neden | |
|---|---|
| **A** | **Zorunlu.** Δ₂ ile Δ₁ karşılaştırılacak ve Δ₁ A'nın sayısı. A'nın tahmini tekrarlanabilir değilse kovaların dayandığı karşılaştırma baştan anlamsız |
| **B** | Maliyet sıfır (imzası zaten var). **Üç mertebede** varyans verisi çıkarır: varyans oransalsa saçılım C'de B'den, B'de A'dan geniş olmalı |
| **C** | En büyük mertebe |
| **İkinci endpoint** | İki sağlayıcı farklı Δ veriyorsa "ofset" EVM'in değil **node'un** özelliğidir ve tabloya hiç giremez |

> **Ayrım kanıt notunda açıkça yazılacak:** B ve C'nin tekrarları
> **determinizmi** ölçüyor, Δ'yı değil. Δ ancak gerçek receipt'in olduğu yerde
> hesaplanır, o da **yalnızca A**. Bu ayrım yazılmazsa "C'nin Δ'sını ölçtük"
> diye okunur.

### Karar ağacı

```
tekrarlar birebir aynı mı?
├─ HAYIR → ofset modeli YOK. B ve C "≤ üst sınır" yazılır. Kovalara bakılmaz.
└─ EVET  → Δ₂ ölçülür (faz 2'nin receipt'inden), kovalar uygulanır.
```

### Kovalar (eşikler gerekçeli ama kesin değil; deney eşikleri de değiştirebilir)

| `\|Δ₂ − Δ₁\|` | Sonuç |
|---|---|
| ≲ 100 gas | Ofset sistematik. B **"ölçüm"**, C **"tahmin − ölçülmüş ofset"**, model riski ≤ ~366 gas dipnotuyla. İkinci gerçek tx **YOK** |
| ~100–500 gas | Ofset gevşek. B ve C bant (±) ile yazılır |
| > 500 gas, işaret değişimi, veya tekrarlar oynuyor | Kalibrasyon yok. B ve C **"≤ üst sınır"**. C'ye gerçek tx **GEREKLİ** (Sprint 5) |

### Rapora girecek tek definisyonel cümle

> `eth_estimateGas`, işlemin başarıyla yürütülmesine yeten bir gas limiti
> döndürür. Bu limitle gönderilen işlemin gerçek tüketimi ona eşit ya da ondan
> küçüktür.

**Geçerlilik koşulu doğrulandı, artık varsayım değil:** `contracts/src/`
altında `gasleft` hiç geçmiyor ve `execute()`'un dış çağrısı düz
`to.call{value: value}(data)`. **Ama koşul kapsamlıdır:** alıcı EOA ve
`data = 0x` olduğu sürece hedefte kod koşmaz, tüketim verilen limitten
bağımsızdır. Alıcı kontrat olsaydı çağrıya kalan gas'ın 63/64'ü iletileceği
için tüketim limite bağlı hale gelebilirdi. Bu cümle ve tablodaki
"alıcı EOA, `data = 0x`" etiketi **aynı dipnota** bağlanır.

Δ₁ > 0 olması, tahminin **tam minimum olmadığını** söyler — bu bir gözlem,
sebebi değil.

---

## 4. NE YOK

- **SAPMA 3** (negatif kanıtın salt-okunur provider'a taşınması). Yeniden
  açılırsa **tek yol ilkesiyle birlikte** açılır
- `digest.js`, `buildTransaction.js` — dondurulmuş
- Kalkan mantığı, `syncSendButtons`, `sig` fotoğrafı, `sendExecute` yolu
- `receipt.status === 0` dalının PQWallet'ın **kendi** revert'iyle sınanması —
  Foundry, `contracts/test/`, **Hakan'ın alanı**
- `README.md` gas tablosunun güncellenmesi — **Hakan'ın dosyası**
- `docs/evidence/tx-hashes.md` — **Hakan'ın dosyası**, append-only
- **Δ₁ = 2.883'ün sebebini bulmak** — kalibre ediliyor, açıklanmıyor
- Yeni özellik

---

## 5. Sıralama — sıra anahtarı, "ortak ön ek" değil

> **KAPANDI — 17 Eylül 2026.** Teslim tarihi teyit edildi: **30 Eylül 2026,
> tek terminal tarih**; sonrasında ayrı final ya da demo aşaması yok.
>
> Ölçüt tarihin kendisi değildi: *"30 Eylül öncesi ayrı bir rapor teslimi var
> mı?"* Cevap **yok** → **SENARYO A KESİN.**
>
> **SENARYO B 17 EYLÜL 2026'DA SİLİNDİ.** Tarih bilinmezken B'yi taşımanın
> maliyeti bir tablo satırı ve bir bayraktı, asimetri onu haklı kılıyordu.
> Tarih bilindiği için asimetri tersine döndü: ölü senaryoyu bırakmak, sonraki
> okuyanın hangisinin geçerli olduğunu yeniden çözmesi demek. Aşağıda B'nin
> sırası, `kayıt = HAYIR` gerekçesi ve yalnızca B'de geçerli olan Sonuç 1
> kaldırıldı. A'da da geçerli olan gerekçeler **duruyor**.

Plan tarihten bağımsız kurulmuştu — belirsizlik varken doğruydu. Görev
içerikleri senaryodan bağımsızdı; değişen yalnızca sıraydı, o yüzden görevler
bir kez yazıldı ve başa bir **sıra anahtarı** konuldu. Anahtar artık sabit.

### Kesinleşen bayrak

| Kalem | Durum |
|---|---|
| ÖK-2, K1, K2 faz 1, K3, K5, K6 | Senaryodan bağımsızdı, değişmedi |
| **K2 faz 2** | **`kayıt = EVET` — SABİT.** Senaryoya bağlı tek bayrak buydu; senaryo kesinleştiği için bayrak da kesinleşti |
| **K4** | **Diff kapısı AKTİF.** B'de devre dışı kalacaktı |

### Sıra anahtarı — SABİT

```
ÖK-2  →  K1  →  K2 [kayıt=EVET]  →  K4  →  K3  →  K5  →  K6 (ÖK-2'den paralel)
```

Risk sırasına göre: koda dokunan iş önce, video UI donduktan sonra kapıdan
geçer. **K3 kapının ARKASINDA** — MetaMask'in ağ tanımına dokunduğu ve kapı
bunu göremediği için (yukarıdaki K3 revizyon kutusu).

Gerçek tarihli takvim ve sıkışma hâlinde düşecek kalemlerin sırası: plan
§ Takvim.

### `kayıt = EVET`in sonucu

Kayıt cila **sonrası** alınıyor, dolayısıyla kayıt alındıktan sonra UI'ın
değişme riski gerçek — **K4'ün diff kapısı bu yüzden gerekli.** Kayıt aynı
zamanda 13 günde tek geri dönüşü olmayan adım; kesilmiyor.

> **K3 artık kapıdan sonra olduğu için kapının koruduğu pencere daraldı** —
> ama kapı yine gerekli: K2 ile K4 arasında kanıt notu commit'leri var ve
> `index.html`'e dokunulmuş olabilir. Kapının **hiç göremediği** risk ise
> K3'ün MetaMask ortam değişikliğidir; o elle geri alınır (plan Task 9
> Adım 7), kapıya bırakılmaz.

### K1'in canlı regresyon kanıtını K2 taşıyor

K2'nin gerçek tx'i cila **sonrası** atıldığı için aynı zamanda *"refactor
gönderim yolunu bozmadı"* kanıtıdır. (Silinen Senaryo B'de bu rol K4'ün taze
çekimine kayıyordu; A'da kaymıyor.)

K4'ün "bitti" ölçütü yine de taze çekimde `cast` doğrulaması istiyor: **diff
kapısı yeniden çekim tetiklerse** aynı devir gerçekleşir, kanıt rolü K4'e
geçer. Ölçütü senaryoya bağlamak boşluğu yalnızca daha nadir hale getirirdi —
bu yüzden ölçüt A'da da duruyor. Takvimdeki 2 günlük yeniden çekim payı tam
bu ihtimal için ayrıldı.

Bedeli açık: K4'te **taze çekim zorunlu**, yani bir elle mnemonic oturumu ve
bir tx daha. Bütçe yeterli (9 gönderim / ~88 tx payı).

---

## 6. Hakan'a gidecek — mesaj listesi

Plan bu dosyalara **iş yazmaz**, mesaj yazar.

1. **Tx hash `0x320e03d98cec857bbae8ecb49bcb0736c960287d76a19f2fad39b471b09e50da`**
   → `docs/evidence/tx-hashes.md` (🔴 HAKAN, append-only)
2. **`execute()` kendi revert'inde nonce artmıyor — Foundry testi.** İddia şu an
   `PQWallet.sol:48` **kaynak okumasına** dayanıyor, ampirik gözleme değil, ve
   **rapora giriyor.** Ampirik dayanağı olmayan tek iddia bu
3. **README gas tablosu** — üç satırlık koşullu tablo hazır olana kadar
   bekliyor (K5)
4. **`RAPOR_HAM_ICERIK.md` Böl. 5'teki Foundry tablosu neyi ölçüyor?**
   `MockVerifier` mı kullanılıyor, intrinsic dahil mi? Uzlaştırma notu bu cevap
   olmadan **tahminle yazılmayacak** — K6'nın içinde bağımlılık
5. **`RAPOR_HAM_ICERIK.md` Böl. 4'te 233.429** "gerçek PQ transfer gas'ı" olarak
   koşulsuz geçiyor. Doğru, ama artık **"İLK `execute()`, nonce 0→1"** koşuluyla

---

## 7. Sprint 5'e bilerek bırakılanlar

- Raporun birleştirilmesi, redaksiyonu, görsel düzeni
- Sunum güncellemesi + soru-cevap listesi + **en az 3 tam prova**
- Farklı makinede demo (ÖK-2 kısmen karşılar)
- **Sunum için kurgulu kısa video sürümü** — kanıt olarak gösterilen ham ve
  kesintisiz olan, bu ondan ayrı bir kalem
- **C'ye gerçek tx — yalnızca kalibrasyon çökerse** (§ 3, üçüncü kova)
- `sphincs-minus` pin'inin dayanıklılığı (fork / vendor kararı)

---

## 8. Açık sorular

1. **TEKNOFEST teslim tarihi** — senaryoyu kilitler. Akif kontrol edecek
2. **Hakan'ın 4. maddesi** — cevaplanmadan K6'nın uzlaştırma notu yazılamaz
3. **`GAS_FALLBACK` analizinin sonucu** — K3'ün maliyetini ve kanıt notunun
   içeriğini belirler; analiz yapılmadan bilinmiyor
4. ~~**Tekrar testinin ikinci endpoint'i hangisi olacak**~~ — **KAPANDI
   (15 Eylül 2026).** Cevap: **`VITE_SEPOLIA_ARCHIVE_RPC_URL`**. Birinci
   endpoint `VITE_SEPOLIA_RPC_URL` (publicnode), ikincisi bu. Tek değişken üç
   kalemi birden kapatıyor: tekrar testinin ikinci endpoint'i · canlı
   oracle'ın receipt'leri · `docs/evidence/chain/` tutanaklarının çekildiği yer.
   Anahtarsız çalıştığı ölçüldü: `https://sepolia.gateway.tenderly.co`
   (üç sabit hash'in de tx + receipt'i tam dönüyor; `1rpc.io/sepolia` birinde
   null verdi, publicnode üçünde de receipt budamış)

   > **İKİ AYRI GEREKSİNİM, karıştırılmasın.** K2'nin ikinci endpoint
   > tekrarında aranan şey **ARŞİV OLMASI DEĞİL, FARKLI OLMASI** — ölçtüğü şey
   > sağlayıcı bağımlılığı (§ 3: *"iki sağlayıcı farklı Δ veriyorsa ofset
   > EVM'in değil node'un özelliğidir"*). Arşiv gereksinimi ayrı bir kalemdir:
   > canlı oracle ve kanıt tutanakları için. Tenderly ikisini birden
   > karşıladığı için tek değişken yetiyor.
   >
   > **Sonuç:** arşiv ihtiyacı bir gün ortadan kalksa bile (ör. hash'ler
   > tazelenirse) `VITE_SEPOLIA_ARCHIVE_RPC_URL` **kaldırılmaz** — tekrar testi
   > o zaman sessizce tek sağlayıcıya düşer ve § 3'ün ayırt edici deneyi
   > ölçtüğünü ölçmeyi bırakır.
5. **Kovaların eşikleri** (≲100 / 100–500 / >500) başlangıç değeri; deneyin
   sonucu eşikleri değiştirebilir

---

## 9. Çalışma kuralları (değişmedi)

- Claude `git commit` / `git push` **çalıştırmaz**, komutu Akif'e verir
- `.env.pqwallet-owner-key` **açılmaz, okunmaz, hiçbir komuta verilmez**.
  Mnemonic'i tarayıcıya Akif elle girer
- Yalnızca `frontend/**`, `docs/evidence/**`, `docs/superpowers/**`,
  `docs/*.md`, `.superpowers/**` değiştirilir. (`docs/*.md` **eklendi**: K6
  `docs/RAPOR.md`'yi oluşturuyor — plan Task 11 — ve spec bu yazma iznini
  göstermiyordu. Devir notunun listesinde vardı, spec'ten düşmüştü.)
- **PLAN–SPEC EŞ GÜNCELLEME:** bir plan revizyonu bir spec kalemini
  değiştiriyorsa **AYNI commit spec'i de günceller.** Güncellemiyorsa commit
  mesajı **nedenini yazar.** Gerekçe: `f508296` (K1'in "ekran tutarlılığı"na
  indirilmesi + render refactor'ün Sprint 5'e ertelenmesi) plan-only kaldı ve
  spec'in son revizyonu `ee31f3e`'de donup planla çelişti — tam olarak bu
  kuralın yokluğundan
- `contracts/src/PQWallet.sol`, `contracts/src/Migration.sol`,
  `contracts/test/`, `contracts/script/`, `docs/evidence/tx-hashes.md`,
  `README.md` → **Hakan'ın, dokunulmaz**
- 3'ten fazla dosya commit'siz biriktirilmez
- Test olmadan "bitti" denmez; kanıt `docs/evidence/` altına
