# Task 4 — MetaMask bağlantısı ve bağlantı sonrası ağ/hesap değişimi

**Tarih:** 8 Eylül 2026
**Dosyalar:** `frontend/src/tx/sendTransaction.js` (yeni),
`frontend/src/tx/send-transaction-test.mjs` (yeni), `frontend/src/main.js`,
`frontend/index.html`
**Plan:** `docs/superpowers/plans/2026-09-04-onchain-transaction-flow.md`, Task 4

## Ne yapıldı

Brief'e ek olarak iki sapma uygulandı (ikisi de Akif tarafından onaylandı):

**SAPMA A — bağlantı sonrası ağ/hesap değişimi yakalanıyor.**
`connectWallet()` chainId'i bir kez okuyup döndürüyor; o değer bağlantı anının
fotoğrafıdır. MetaMask'te ağ ve hesap bağlantıdan SONRA değiştirilebilir, yani
Task 4'ün var olma sebebi olan chainId kontrolü bağlantıdan sonraki her an için
kördü — bayat bir `connected` ile Task 5 yanlış ağa gönderirdi ve yanlış ağda
digest geçersizdir. `chainChanged` ve `accountsChanged` dinleniyor, ikisinde de
`connected = null` oluyor ve ekranda bağlantının düştüğü yazıyor.

Bu, kod tabanındaki mevcut desenin aynısı: girdi değişince `signed` temizleniyor
(`invalidateSignature`). Aynı gerekçe, farklı state.

**SAPMA B — bağlantı durumu kendi çıktı alanında (`#wallet-out`).**
Brief bağlantı mesajlarını `#send-out`'a yazıyordu; orası imza akışının alanı
(`invalidateSignature` "değerler değişti" yazıyor). İki state bağımsız
değiştiği için aynı div'i paylaşmaları rastgele bir ezme sırası yaratıyordu:
"bağlantı düştü" mesajı bir sonraki girdi değişikliğinde silinir, kullanıcı
gönderemediğinin sebebini göremezdi. İki state, iki alan.

> Tüm çıktı desenini tek bir `render()`'da toplamak daha doğru olurdu. Sprint 3
> ortasında main.js'in çıktı desenini değiştirmek Task 5-7'nin diff'ini büyütür
> ve o görevlerin asıl riski (üç kalkan, negatif kanıt saflığı) başka yerde —
> **Sprint 4 "demo cilası" kalemine bırakıldı.**

**Üç ayrı düşme mesajı.** `chainChanged` ve `accountsChanged` ikisi de bağlantıyı
düşürür ama sebepleri ve düzeltmeleri farklıdır; aynı metni basmak provada
yanlış yere baktırır. `accountsChanged` da kendi içinde ikiye ayrılıyor:

| Durum | Ne söylüyor | Düzeltme |
|---|---|---|
| `chainChanged` | ağ değişti (+ yeni chainId) | MetaMask'i Sepolia'ya (11155111) al, yeniden bağlan |
| `accountsChanged`, `accounts = []` | site erişimi kesildi | MetaMask'ten siteye tekrar izin ver |
| `accountsChanged`, hesap var | aktif hesap değişti | önceki hesabı geri seç ya da yeniden bağlan |

## Doğrulama 1 — node testi (otomatik)

Mesaj seçimi `disconnectMessage()` adlı **saf** bir fonksiyona ayrıldı; HTML
üretmiyor, yalnızca metin döndürüyor (kaçış çağıranın `esc()`inde kalıyor).
Sebep: bu yol MetaMask'le elle doğrulanması en zor olan yol — `accountsChanged`'in
boş diziyle gelmesini tarayıcıda tetiklemek kolay değil, ama hesap değişimiyle
karıştırılması sessizce yanlış teşhise yol açar.

```
cd frontend && node src/tx/send-transaction-test.mjs
```

**16/16 assertion geçti.** Kapsanan iddialar:

- üç başlığın da, üç düzeltme metninin de birbirinden **farklı** olduğu
  (asıl iddia — aynı metni basmama garantisi)
- `chainChanged` metninin Sepolia'yı ve doğru chainId'i (11155111) söylediği,
  ayrıca yeni ağın chainId'ini gösterdiği
- olay argümansız gelirse metnin bozulmadığı ve `"undefined"` sızmadığı
- `accounts` hiç gelmezse "erişim kesildi" dalına düştüğü (sessizce "hesap
  değişti" dememesi)

## Doğrulama 2 — tarayıcı (otomatik kısım)

`npx vite`, sayfa Chrome'da açıldı (MetaMask kurulu, `window.ethereum` var):

| Kontrol | Sonuç |
|---|---|
| Sayfa yükleniyor, **konsolda hata yok** | ✅ |
| `#wallet-out` DOM'da, başlangıçta boş | ✅ |
| Çıktı sırası `wallet-out` → `tx-out` → `send-out` | ✅ |
| Zincir okuması bozulmadı | ✅ nonce **1**, bakiye **0.001 ETH** (zincirdeki gerçek durumla aynı) |
| `chainChanged` dinleyici sayısı | **1** (mükerrer kayıt yok) |
| `accountsChanged` dinleyici sayısı | **1** |
| **Guard:** bağlanmamışken `emit('chainChanged')` + `emit('accountsChanged', [])` | ✅ `#wallet-out` boş kaldı — hiç bağlanmadan ağ değiştirmek "bağlantı düştü" demek değildir |

`vite build` de temiz geçti (modül çözümlemesi + sözdizimi).

## Doğrulama 3 — MetaMask ile elle (Akif, BEKLİYOR)

Aşağıdakiler MetaMask onay penceresi gerektirdiği için otomatikleştirilmedi.
`npx vite` sonrası:

- [ ] "Cüzdanı bağla" → MetaMask açılır, onayla → `#wallet-out`'ta hesap adresi
      ve "MetaMask bağlandı, ağ Sepolia (11155111)" görünür
- [ ] MetaMask'i Ethereum Mainnet'e al, **sayfaya dokunmadan** → bağlantının
      düştüğü ve "Sepolia'ya alıp yeniden bağlanın" mesajı görünür (SAPMA A'nın
      asıl testi)
- [ ] Sepolia'ya dön, yeniden bağlan → bağlı duruma geri dönülür
- [ ] MetaMask'te başka bir hesaba geç → "aktif hesap değişti" mesajı görünür
      (ağ mesajından farklı olduğu ekranda teyit edilir)
- [ ] Bağlıyken `tx-to` alanına dokun → `#send-out`'a "değerler değişti" yazar
      ama `#wallet-out`'taki bağlantı satırı **silinmez** (SAPMA B'nin testi)
- [ ] Ekran görüntüleri `docs/evidence/screenshots/` altına

MetaMask'siz bir tarayıcıda "MetaMask bulunamadı" yolu da elle görülebilir;
bu oturumda test edilen Chrome'da eklenti kurulu olduğu için o dal
çalıştırılmadı.

## Bilinmesi gereken

- **Bağlanan hesap PQWallet'ın sahibi değildir.** Sahiplik C13 imzasıyla
  kanıtlanır; bu hesap yalnızca tx'i taşır ve gas'ı öder.
- **Ağ Sepolia'dan çıkıp geri dönse bile bağlantı düşürülür.** "Yeni ağ yine
  doğru mu" diye bakmak yerine tek kural uygulanıyor; yeniden bağlamak tek tık.
  Sessizce geçerli kalan bir bağlantı bu kontrolün kör noktası olurdu.
- **`btn-send` bağlantı düştüğünde devre dışı bırakılMIYOR.** Onun kilidi imza
  state'ine ait (`invalidateSignature`) ve imza hâlâ geçerli. **Task 5'teki
  gönderim handler'ı `connected === null` durumunu ayrıca kontrol etmelidir** —
  bu, Task 5'e devredilen bir yükümlülüktür, kodda da yorum olarak yazılı.
