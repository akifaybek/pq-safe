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

Mesajlar **dört** durumu ayırıyor (biri elle doğrulama sırasında eklendi, bkz.
aşağıda "olay dökümünden çıkan bulgu").

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

**Dört ayrı düşme mesajı.** `chainChanged` ve `accountsChanged` ikisi de
bağlantıyı düşürür ama sebepleri ve düzeltmeleri farklıdır; aynı metni basmak
provada yanlış yere baktırır. `accountsChanged` da kendi içinde üçe ayrılıyor:

| Durum | Ne söylüyor | Düzeltme |
|---|---|---|
| `chainChanged` | ağ değişti (+ yeni chainId) | MetaMask'i Sepolia'ya (11155111) al, yeniden bağlan |
| `accountsChanged`, `accounts = []` | site erişimi kesildi | MetaMask'ten siteye tekrar izin ver |
| `accountsChanged`, `accounts[0]` aynı | hesap izinleri değişti, aktif hesap aynı | yeniden bağlan |
| `accountsChanged`, `accounts[0]` farklı | aktif hesap değişti | önceki hesabı geri seç ya da yeniden bağlan |

## Doğrulama 1 — node testi (otomatik)

Mesaj seçimi `disconnectMessage()` adlı **saf** bir fonksiyona ayrıldı; HTML
üretmiyor, yalnızca metin döndürüyor (kaçış çağıranın `esc()`inde kalıyor).
Sebep: bu yol MetaMask'le elle doğrulanması en zor olan yol — `accountsChanged`'in
boş diziyle gelmesini tarayıcıda tetiklemek kolay değil, ama hesap değişimiyle
karıştırılması sessizce yanlış teşhise yol açar.

```
cd frontend && node src/tx/send-transaction-test.mjs
```

**22/22 assertion geçti.** Kapsanan iddialar:

- dört başlığın da, dört düzeltme metninin de birbirinden **farklı** olduğu
  (asıl iddia — aynı metni basmama garantisi)
- aktif hesap aynı kalıp liste büyüdüğünde "aktif hesap değişti" **denmediği**,
  gerçekten değiştiğinde ise dendiği
- **checksum tuzağı, iki yönde de:** kayıtlı adres checksum'lı/gelen küçük
  harfli ve tersi — ikisinde de "hesap değişti" denmemesi
- `previousAddress` bilinmiyorsa savunmacı şekilde "aktif hesap değişti" dalına
  düşüldüğü ("izinler değişti" demek, hesap gerçekten değişmişken yanlış olur)
- `chainChanged` metninin Sepolia'yı ve doğru chainId'i (11155111) söylediği,
  ayrıca yeni ağın chainId'ini gösterdiği
- olay argümansız gelirse metnin bozulmadığı ve `"undefined"` sızmadığı
- `accounts` hiç gelmezse "erişim kesildi" dalına düştüğü (sessizce "hesap
  değişti" dememesi)

### Testin kendisi test edildi (mutasyon)

Yeşil bir testin gerçekten bir şey tuttuğunu göstermek için eşlemeler kasten
bozulup kırmızı görüldü, sonra geri alındı:

| Mutasyon | Sonuç |
|---|---|
| `toLowerCase()` kaldırıldı (ham string karşılaştırma) | ✗ 2 assertion — tam da checksum tuzağını tutanlar |
| `if (sameActive)` → `if (!sameActive)` (eşleme ters çevrildi) | ✗ 3 assertion |
| Geri alındı | ✅ 22/22 |

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

## Doğrulama 3 — MetaMask ile elle ✅ (Akif, 8 Eylül)

Beş adımın beşi de geçti. Her adım iki bağımsız kaynaktan doğrulandı: Akif'in
ekranda gördüğü metin **ve** sayfaya kurulan bir probe'un kaydettiği ham
MetaMask olayları (probe, bizim handler'dan bağımsız olarak `window.ethereum`u
dinliyordu — "olay gelmedi mi, yoksa handler mı çalışmadı" ayrımını yapabilmek
için).

| # | Adım | Sonuç |
|---|---|---|
| 1 | Bağlan | ✅ hesap adresi + "MetaMask bağlandı, ağ Sepolia (11155111)" |
| 2 | Sitenin ağını Mainnet yap | ✅ probe: `chainChanged → 0x1`; sağlayıcının gerçek zinciri `0x1`; doğru kırmızı mesaj, doğru chainId |
| 3 | Sepolia'ya dön | ✅ probe: `chainChanged → 0xaa36a7`; mesaj **kasıtlı olarak** ekranda kaldı (ağ düzeldi, bağlantı hâlâ düşük); yeniden bağlanınca yeşil satır döndü |
| 4 | Hesabı değiştir | ✅ probe: `accountsChanged`; "aktif hesap değişti" — 2. adımın metninden **farklı** |
| 5 | İmzala, bağlantıyı düşür, sonra `tx-to`'ya dokun | ✅ "değerler değişti" `#send-out`'ta belirdi, `#wallet-out`'taki kırmızı mesaj **silinmedi**; ikisi aynı anda ekranda |

Ekran görüntüleri:
`docs/evidence/screenshots/sprint3-metamask-chain-dropped.png`,
`sprint3-metamask-account-changed.png`,
`sprint3-wallet-out-survives-input.png`,
`sprint3-metamask-site-network-gotcha.png`.

MetaMask'siz bir tarayıcıda "MetaMask bulunamadı" yolu çalıştırılmadı; test
edilen Chrome'da eklenti kuruluydu.

### ⚠️ Prosedür tuzağı: MetaMask'te ağ site-başınadır

İlk denemede 2. adım **başarısız göründü** — ağ değiştirildi, sayfada hiçbir şey
olmadı. Probe boş çıktı ve `eth_chainId` hâlâ `0xaa36a7` döndürdü: **site
gerçekten Sepolia'da kalmıştı**, yani yayınlanacak bir olay yoktu. Kodda sorun
yoktu, testin kendisi yanlıştı.

MetaMask 12'den beri açılır menüdeki ağ **global bir anahtar değil**, aktif dapp
sitesine ait bir seçim. Cüzdanın genel görünümünü ("Network: Ethereum" filtresi)
değiştirmek bağlı sitenin ağını değiştirmiyor.

**Sitenin ağını değiştiren kontrol**, MetaMask panelinin en altındaki
`127.0.0.1:5178 · Account N` satırının sağındaki küçük ağ rozeti (`S ⌄`).
Ekran görüntüsü: `sprint3-metamask-site-network-gotcha.png` — cüzdan
"Ethereum" gösterirken sayfa hâlâ "ağ Sepolia (11155111)" diyor.

**Provada bu tuzağa düşülür.** Ağ hatası senaryosu gösterilecekse ağ, o rozetten
değiştirilmeli.

### Olay dökümünden çıkan bulgu: `accountsChanged` tam listeyi gönderiyor

Probe kaydı, MetaMask'in `accountsChanged` ile yalnızca yeni hesabı değil
**izinli hesapların tam listesini** (ilk eleman aktif olan) gönderdiğini
gösterdi:

```
accountsChanged ["0xe0bf…7351", "0x80a9…acf4"]
accountsChanged ["0x7755…cc70", "0xe0bf…7351", "0x80a9…acf4"]
```

İlk hâlde kod yalnızca "liste boş mu" diye bakıyordu. Sonucu: kullanıcı aktif
hesabı **değiştirmeden** listeye yeni bir hesap eklerse (MetaMask "connect more
accounts") bağlantı yine düşüyor ve ekranda "aktif hesap değişti" yazıyordu —
oysa değişmemişti. Düşürmenin kendisi doğru (izin yüzeyi değişti, signer
tazelenmeli); yanlış olan metindi, ve üç ayrı mesaj yazmamızın sebebi tam olarak
"yanlış metin insanı yanlış yere baktırır"dı.

**Düzeltildi:** `disconnectMessage(change, previousAddress)` artık `accounts[0]`
ile bağlıyken kaydedilen adresi karşılaştırıyor, **iki tarafı da
`toLowerCase()` ile normalleştirerek.** Normalleştirme şart: MetaMask
`accounts[0]`'ı bazen checksum'lı (`0xAbC…`), bazen küçük harfli (`0xabc…`)
döndürüyor; ham string karşılaştırması her `accountsChanged` olayını "hesap
değişti" gösterir, yani düzeltmenin tam tersini üretirdi.

Mesaj artık dört durumu ayırıyor: ağ değişti / site erişimi kesildi / **hesap
izinleri değişti (aktif hesap aynı)** / aktif hesap değişti.

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
