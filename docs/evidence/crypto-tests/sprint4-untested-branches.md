# Kanıt — Sınanmamış iki dal (Sprint 4, K3)

**Tarih:** 16 Eylül 2026
**Yazan:** Akif (ajan)
**Kapsam:** `frontend/src/tx/sendTransaction.js` (`preflight`, `sendExecute`'un
`GAS_FALLBACK` dalı), `frontend/src/main.js` (gönderim handler'ı)

**Bu görevde zincire İŞLEM ATILMADI.** Task 8 saf kaynak okumasıdır: owner
anahtarı kullanılmadı, MetaMask açılmadı, RPC çağrısı yapılmadı. Tek ölçüm
`encodeExecute`'un saf fonksiyon çıktısı (calldata boyutu).

---

## 1. `GAS_FALLBACK` erişilebilirlik analizi

**Sonuç: `FALLBACK_SONUC = DENETİMLİ_AĞ`**

Gereği: Task 9'da proxy yolu denenir, doğal tetikleme beklenmez.
**Maliyet 60–90 dakika** ve **Task 9 Task 10'dan SONRA koşuyor** — ikisinin de
gerekçesi § 1.6 ve § 1.8'de.

### 1.1 Yöntem — neyin delil sayıldığı

Dalın gövdesindeki yorum (`sendTransaction.js:204`) *"Public RPC bu calldata
boyutunda (3,9 KB) `eth_estimateGas`'ta zorlanabilir"* diyor. **Bu cümle bu
analizde DELİL SAYILMADI.** Yorum yazarın **niyetini** gösterir, dalın
**koşabilirliğini** değil; bağlam olarak okundu, hüküm ona dayandırılmadı.

Emsal bu kod tabanından: `e.txHash` ölü kod sanılmıştı, sonradan
çalıştırılabilir çıktı (A2). "Kod öyle diyor" ile "kod öyle çalışıyor" ayrı
şeyler.

Hüküm yalnızca aşağıdaki **ölçülmüş yapısal olguların** üstüne kuruldu.

### 1.2 Olgular (hepsi kaynaktan okundu ya da ölçüldü)

| # | Olgu | Kaynak |
|---|---|---|
| F1 | `preflight` = `signer.call({to, data})` → **`eth_call`** | `sendTransaction.js:124-126` |
| F2 | Fallback dalı = `signer.estimateGas({to, data})` → **`eth_estimateGas`** | `sendTransaction.js:200-207` |
| F3 | `catch` **KOŞULSUZ** (`catch {`) — hata sınıfı süzülmüyor | `sendTransaction.js:203` |
| F4 | `sendExecute`'un **tek** çağrı yeri var, `preflight`'tan **sonra** | `main.js:658` → `main.js:686` |
| F5 | `preflight` yerel `try/catch` içinde **değil** — fırlatırsa handler'ın dış catch'ine gider, `sendExecute`'a **hiç gelinmez** | `main.js:658` |
| F6 | İki çağrı arasında **ağ işlemi yok** — yalnızca iki yerel kimlik kontrolü (`connected !== conn`, `signed !== sig`) | `main.js:661-682` |
| F7 | İkisi de **aynı** `conn.signer` üzerinden gidiyor → aynı taşıma katmanı | `main.js:658`, `:686` |
| F8 | `execute()` calldata'sı **3908 bayt (3,82 KB)** — imza 3688 + ABI çerçevesi 220 | `encodeExecute` ile ölçüldü, zincirsiz |
| F9 | `gasEstimated` bayrağı ekrana kadar tüketiliyor (*"tahmin başarısız oldu, sabit limite düşüldü"*) | `sendTransaction.js:237` → `main.js:694` |

### 1.3 Dalın koşma koşulu — F3+F4+F5'ten türüyor

```
eth_call BAŞARILI  ve  eth_estimateGas BAŞARISIZ
```

F5 sol tarafı zorunlu kılıyor: ön-uçuş patlarsa `sendExecute` çağrılmıyor bile.
F3 sağ tarafı genişletiyor: `catch` koşulsuz olduğu için **her** fırlatma dalı
tetikliyor — yalnızca ağ hatası değil.

### 1.4 `ÖLÜ_KOD` ELENDİ

İki bağımsız gerekçe:

1. **F3 — koşulsuz `catch`.** Dalın önünde hiçbir filtre yok; `estimateGas`'ın
   herhangi bir sebeple fırlatması yeterli. Yapısal bir erişilemezlik yok.
2. **F9 — dalın gözlenebilir bir etkisi var.** `gasEstimated = false` ekranda
   ayrı bir not üretiyor. Ölü kod olsaydı bu bayrağın tüketilmesi anlamsız
   olurdu.

### 1.5 Kapatılması gereken soru ve cevabı

> Taşıma katmanı ortak (F7) diye `eth_call` pratikte **her zaman**
> `eth_estimateGas` ile birlikte mi düşüyor?

**Cevap: HAYIR — ama "hayır"ın iki farklı sebebi var ve ayrılmaları gerekiyor.**

**(a) Taşıma seviyesi arızalar — pratikte BİRLİKTE düşüyorlar.** Ağ kopması,
MetaMask'in bağlantıyı kesmesi, endpoint'in 5xx dönmesi: bunlar `eth_call`'u da
vururdu. Ama `eth_call` F6 gereği **mikrosaniyeler önce** başarıyla dönmüş
durumda — arada ağ işlemi yok. Böyle bir arızanın tam o pencereye düşmesi
mümkün ama **planlanamaz**. Bu bir yarış durumudur, sınama yöntemi değil.

**(b) Metoda özgü arızalar — BİRLİKTE DÜŞMEZLER, ve asimetri yapısaldır.**
`eth_call` çağrıyı **bir kez** yürütür. `eth_estimateGas` düğümde **ikili
aramadır**: aynı yürütmeyi gas limitini daraltarak defalarca koşturur. F8'deki
3908 baytlık calldata ve ~216k gas'lık bir yürütmeyle, `eth_estimateGas`'ın
sunucu tarafı maliyeti `eth_call`'un **katlarıdır**. Public sağlayıcılarda
metod başına ayrı hız sınırı, hesaplama bütçesi ve zaman aşımı **kuraldır**.

Yani bir sağlayıcı `eth_call`'u sorunsuz servis edip `eth_estimateGas`'ı
reddedebilir. **Bu bir taşıma arızası değildir**, metodun maliyetinden doğan
bir asimetridir — ve F7'nin "ortak taşıma" olgusu bunu engellemez.

> Bu sprint'te aynı asimetrinin **başka bir örneği ölçüldü**: sağlayıcı
> `eth_getTransactionByHash`'i servis ederken `eth_getTransactionReceipt`'e
> `null` dönüyordu (§ 7.1). Ortak taşıma, metotların birlikte davrandığını
> **göstermiyor**. Bu, (b) şıkkının bu kod tabanındaki ampirik emsalidir.

### 1.6 `DOĞAL` neden ELENDİ, `DENETİMLİ_AĞ` neden seçildi

1.5(b) dalın **erişilebilir** olduğunu söylüyor. Ama Task 9'un sorduğu şey
erişilebilirlik değil, **sınanabilirlik**: dalı isteyerek koşturabilir miyiz?

- Tetikleyici, sağlayıcının **o andaki yükü / metod limiti**. Bizim
  denetimimizde değil, **programlanamaz**. Beklemek sınama değil, şanstır.
- Girdiyle deterministik tetikleme yolu **bulunamadı**: calldata'yı büyütmek
  imza boyutunu değiştirmek demek (C13 sabit, dondurulmuş `buildTransaction.js`);
  bakiyeyi tüketmek hem yıkıcı hem de gönderimin kendisini de öldürür.
- Proxy ise **tam olarak (b)'deki koşulu** üretiyor: her metodu geçirip
  yalnızca `eth_estimateGas`'a hata dönmek. Ön-uçuş sağlıklı geçer, tahmin
  patlar, dal koşar.

**Bu enjeksiyon değildir:** kodumuzun tek satırı değişmiyor, ethers'ın kendi
yolu, gerçek handler, gerçek MetaMask koşuyor. Üretilen şey gerçek bir
RPC-katmanı hatasıdır — dalın savunmak için var olduğu durumun ta kendisi,
yalnızca kaynağı denetimli. *"Kendi taklidinle sınama"* kuralı **kendi kodunun**
taklidini yasaklar, denetimli bir ağ koşulunu değil.

**Maliyet: 60–90 dakika.** (İlk tahmin 30–45'ti; proxy'nin `.env`'e
konacağı varsayımına dayanıyordu. § 1.8 o varsayımı çürüttü.)

### 1.7 Task 9 için not — oracle ekran notu DEĞİL

Dal koşturulduğunda doğrulanacak şey **MetaMask onay ekranındaki gas
limitinin 350.000 olması** (`sendTransaction.js:116`). Ekran notu (F9)
**iptal senaryosunda hiç render edilmiyor** — sebebi ve sonucu § 2.2'de.

### 1.8 PROXY HEDEFİ — `.env` DEĞİL, MetaMask'in ağ tanımı (ölçüldü)

Proxy'nin nereye konacağı **ölçülmeden varsayılamaz**; ölçüm iki ayrı sağlayıcı
yolu gösterdi:

| Yol | Sağlayıcı | Çağrılar |
|---|---|---|
| **MetaMask** — `BrowserProvider(window.ethereum).getSigner()` (`sendTransaction.js:15,24`) | MetaMask'in kendi ağ tanımı | `signer.call` `:125` (ön-uçuş) · **`signer.estimateGas` `:201` (HEDEF)** · `signer.sendTransaction` `:211` · negatif kanıt (`main.js:882`) |
| Uygulamanın RPC'si — `JsonRpcProvider(VITE_SEPOLIA_RPC_URL)` (`sepolia.js:18-24`) | `.env` | `readNonce`, `readDigest`, `readBalance`, `readOwnerPublicKey` (`pqwallet.js:26`) |

**`VITE_SEPOLIA_RPC_URL`'e proxy koymak hedef dal için HİÇBİR ŞEY YAPMAZ** —
`signer.estimateGas` o yoldan geçmiyor. Bu, SAPMA 3'ün kararının doğrudan
sonucu: negatif kanıt ve gönderim bilerek MetaMask signer'ında tutuldu.

Süre farkının sebebi proxy'nin kendisi değil, MetaMask tarafı: proxy **tam
geçirgen** olmak zorunda (MetaMask arka planda `eth_chainId`, `eth_blockNumber`,
`eth_getBalance`, `net_version` yokluyor), `chainId` 11155111 **korunmalı**
(yeni ağ eklenirse `chainChanged` yayılır, `watchWalletChanges`
(`sendTransaction.js:43`) bağlantıyı düşürür ve dala hiç gelinmez), ve geri
alma + geri alındığının doğrulanması işin parçası.

---

## 2. `ACTION_REJECTED`

**Task 9'da kapatılacak.** Analiz gerekmiyor: MetaMask'te "Reddet" doğrudan
tetiklenebilir bir kullanıcı eylemi. Beklenen: ekranda iptal mesajı, `signed`
korunuyor, buton durumu tutarlı, zincire hiçbir şey gitmiyor.

### 2.1 İki dal TEK KOŞUDA kapanıyor — ve bunun bir bedeli var

Akış ikisini arka arkaya diziyor:

```
estimateGas PATLAR (proxy)  →  gasLimit = GAS_FALLBACK = 350.000n
                            →  signer.sendTransaction  →  MetaMask açılır
                            →  İPTAL  →  ACTION_REJECTED (main.js:780)
```

İptal hem `ACTION_REJECTED`'ı kapatıyor, hem de 350.000 limitli **gerçek bir
tx'i önlüyor** — nonce yanmıyor, sıfır gaz.

### 2.2 🔴 AÇIK KALEM — iptal dalın HESABINI kapatır, GÖSTERİMİNİ değil

**Bu, raporun fazla iddia etmemesi için yazılıyor.**

`main.js:694`'teki *"tahmin başarısız oldu, sabit limite düşüldü"* notu
`sendExecute` **başarıyla döndükten sonra** üretiliyor. İptal edilirse
`sendExecute` fırlatır, `:694`'e **hiç gelinmez**, ve `catch` `sendOut`'u
*"İşlem MetaMask'te iptal edildi"* ile ezer (`main.js:780-782`). `gasEstimated`
değişkeni de o kapsamda tanımlı değildir.

| Task 9'da koşan | Task 9'da KOŞMAYAN |
|---|---|
| `catch` dalı, `gasLimit = GAS_FALLBACK` ataması (`sendTransaction.js:207`) | Not render'ı (`main.js:694`) |
| `gasEstimated = false` ataması (`:208`) | `gasNote`'un `sendOut`'a yazılması |

**Bu yüzden `GAS_FALLBACK`'in oracle'ı ekran notu DEĞİL, MetaMask onay
ekranındaki gas limitidir** — cüzdana giden gerçek parametre. Ayırt edici sayı:

| Dal koştuysa | Koşmadıysa |
|---|---|
| `350.000` (sabit) | `estimated × 1,2 ≈ 259.000` |

**Kapanmamış kalan:** not render'ının gerçekten o metni ürettiği **sınanmadı**.
Kapatmak için 350.000 limitli **gerçek bir tx** göndermek gerekir; bu Sprint 4
kapsamında değil (nonce yakar, Task 5/6'nın varsayımını bozar) — **Sprint 5
kararı.** Rapor bu satırı sınanmış gibi sunmaz.

> **İki oracle birlikte gerekiyor, biri tek başına yetmiyor:**
>
> | Oracle | Kanıtladığı | Tek başına neden yetmez |
> |---|---|---|
> | Proxy log'u: `eth_estimateGas`'a hata döndü | Dala **girildi** | İptal edilince `eth_sendTransaction` proxy'ye **hiç ulaşmaz** — proxy `gasLimit`'i göremez |
> | MetaMask onay ekranı: limit `350.000` | **Hangi değer** kullanıldı | Tek başına "tahmin mi patladı, kullanıcı mı elle girdi" ayrımını yapmaz |

---

## 3. Sınırlar

- Bu belge **analiz**, sınama değil. `GAS_FALLBACK` dalı bu görevde
  **koşturulmadı**; koşturulması Task 9.
- 1.5(b)'nin mekanizması (metod başına sunucu limiti) **bu projede
  ölçülmedi** — sağlayıcı tarafı bizim gözlem alanımızın dışında. Ölçülen şey
  asimetrinin **mümkün** olduğu (§ 7.1'deki receipt budaması emsali) ve dalın
  koşma koşulunun kaynaktan türetilmesi. Task 9'un proxy'si zaten bu mekanizmayı
  **varsaymıyor**, koşulu doğrudan üretiyor.
- `receipt.status === 0` dalının PQWallet'ın **kendi** revert'iyle sınanması bu
  belgenin kapsamı dışında — Foundry, `contracts/test/`, **Hakan'ın alanı**.
- **MetaMask onay ekranında gas limitinin NEREDE göründüğü ÖLÇÜLMEDİ.** Ana
  ekranda kendi ücret tahmini gösteriliyor olabilir ve tx'in `gasLimit`'i
  "Gelişmiş/Düzenle" görünümüne düşebilir. Bu ölçüm MetaMask'in açılmasını
  gerektiriyor (Akif'in ortamı, cüzdan kilidi onda) ve **bu görevde
  yapılamadı**. Plan Task 9 Adım 4 bunu varsaymıyor, **ölçtürüyor**: önce ana
  ekrana bakılır, yoksa gelişmiş görünüm açılır, ve **hangisinde bulunduğu
  kanıt notuna yazılır**. Ayırt edici alan **gas limit**, "estimated fee"
  DEĞİL — yanlış alandan okunan sayı dalı kanıtlamaz.
- K3'ün kendisi **Task 10'dan sonraya alındı** (spec § 1 K3 revizyon kutusu,
  plan Task 9 başlığı): proxy MetaMask'in ağ tanımına giriyor, bu repo dosyası
  olmadığı için diff kapısı göremiyor, ve kayıt kesinleşmeden koşarsa kaydı
  kirletme riski var.
