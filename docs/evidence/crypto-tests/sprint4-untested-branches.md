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

Gereği: Task 9'da proxy yolu denenir (30–45 dakika), doğal tetikleme beklenmez.

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

**Maliyet: 30–45 dakika**, beş dakika değil.

### 1.7 Task 9 için not

Dal koşturulduğunda doğrulanacaklar: ekranda *"tahmin başarısız oldu, sabit
limite düşüldü"* notu çıkıyor (F9) ve kullanılan limit **350.000**
(`sendTransaction.js:116`).

---

## 2. `ACTION_REJECTED`

**Task 9'da kapatılacak.** Analiz gerekmiyor: MetaMask'te "Reddet" doğrudan
tetiklenebilir bir kullanıcı eylemi. Beklenen: ekranda iptal mesajı, `signed`
korunuyor, buton durumu tutarlı, zincire hiçbir şey gitmiyor.

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
