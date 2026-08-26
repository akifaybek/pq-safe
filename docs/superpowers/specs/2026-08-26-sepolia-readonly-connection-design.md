# Sepolia read-only bağlantısı — tasarım

**Tarih:** 26 Ağustos 2026
**Yazan:** Akif
**Sprint:** 3 ("Frontend'i Sepolia'ya bağla" görevinin ilk parçası)

## Amaç

Frontend şu ana kadar tamamen local: `main.js` sadece WASM signer ile
keygen/sign yapıyor, hiçbir ağ bağlantısı (ethers Provider, RPC) yok.
Hakan'ın Sepolia deploy'u (kontrat adresleri) henüz gelmedi, ama ona bağımlı
olmayan bir parça var: **RPC üzerinden Sepolia'ya salt-okunur bağlanabilmek
ve bunu kanıtlamak.** Kontrat adresleri gelince bu bağlantı üzerine
inşa edilecek (state okuma, sonra tx gönderme).

## Kapsam

**Dahil:**
- `ethers.JsonRpcProvider` ile Sepolia'ya bağlanma
- Bağlantının gerçekten çalıştığının kanıtı: `chainId` + son blok numarası
- Yanlış ağa (chainId ≠ 11155111) bağlanma durumunu erkenden yakalama —
  çünkü digest formülündeki `DOMAIN_SEPARATOR` `chainId`'e bağlı, sessizce
  yanlış ağa bağlanmak ileride "imza neden geçersiz" gibi teşhisi zor bir
  hataya yol açar.
- `index.html`'e üçüncü bir demo bölümü, mevcut 1) Anahtar Üret / 2) İmzala
  deseniyle tutarlı.

**Kapsam dışı (bilerek, sonraki adımlar):**
- Transaction gönderme (`execute()` çağrısı) — gaz ödeyen bir signer
  (MetaMask ya da dev anahtarı) gerektirir, ayrı bir tasarım kararı.
- Kontrat adresleri / ABI ile state okuma (`PQWallet.nonce()` vb.) —
  Hakan'ın deploy adresleri gelince yapılacak.
- Public/ücretsiz RPC fallback'i — env var yoksa açıkça hata verilecek,
  sessiz fallback yok.

## Mimari

```
frontend/
  .env.example          (yeni — VITE_SEPOLIA_RPC_URL= şablonu, commit'lenir)
  .env                  (kullanıcının kendi RPC URL'i, git-ignored)
  src/
    network/
      sepolia.js         (yeni modül)
    main.js              (3. bölüm için event listener eklenir)
  index.html             (3. bölüm eklenir)
.gitignore               (değişir — .env.example için istisna)
```

### `frontend/src/network/sepolia.js`

İki fonksiyon:

- `getProvider()` — `import.meta.env.VITE_SEPOLIA_RPC_URL`'i okur, boşsa/tanımsızsa
  açık bir hata fırlatır (`"VITE_SEPOLIA_RPC_URL tanımlı değil — frontend/.env
  dosyasına ekleyin (bkz. .env.example)"`). Tanımlıysa `new
  ethers.JsonRpcProvider(rpcUrl)` döner.
- `checkSepoliaConnection()` (async) — `getProvider()` ile provider alır,
  `provider.getNetwork()` ve `provider.getBlockNumber()` çağırır.
  `network.chainId !== 11155111n` ise hata fırlatır (yanlış ağ). Başarılıysa
  `{ chainId, blockNumber }` döner.

Modül dışa hiçbir state tutmaz (crypto/signer.js'teki `initialized` gibi bir
cache'e gerek yok — her çağrıda yeni bir `JsonRpcProvider` oluşturmak read-only
bir demo için yeterince ucuz).

### `.gitignore`

Mevcut `.env.*` kuralı `.env.example`'ı da yanlışlıkla ignore ediyor (test
edildi: `git check-ignore -v frontend/.env.example` → eşleşiyor). Bir istisna
satırı eklenecek:

```
.env.*
!frontend/.env.example
```

### UI (`index.html` + `main.js`)

Mevcut desenle tutarlı üçüncü bölüm:

```html
<section>
  <h2>3. Sepolia Bağlantısı</h2>
  <button id="btn-check-connection">Bağlantıyı test et</button>
  <div id="connection-out"></div>
</section>
```

`main.js`'e eklenen listener, `checkSepoliaConnection()`'ı çağırıp sonucu
(`chainId`, `blockNumber`) veya hatayı (`err` sınıfıyla, mevcut desendeki
gibi) `connection-out`'a yazar.

## Hata yönetimi

- Env var eksikse: buton tıklanınca net hata mesajı (sayfa yüklenirken
  crash olmaz — provider'ın oluşturulması butona kadar ertelenir).
- Yanlış ağa bağlanmışsa (`chainId ≠ 11155111`): ayrı, açıklayıcı bir hata
  ("Sepolia (11155111) bekleniyordu, RPC ... döndürdü — digest formatı
  chainId'e bağlı, yanlış ağda imzalar geçersiz olur").
- RPC gerçekten erişilemezse (network hatası, yanlış URL): ethers'ın kendi
  hatası olduğu gibi yukarı taşınır, `err` bloğunda gösterilir.

## Test / doğrulama

Otomatik birim testi yok (bu bir ağ I/O modülü, ethers'ın kendi provider
mantığını yeniden test etmiyoruz). Doğrulama CLAUDE.md kural 3'e göre
"çalıştırılabilir doğrulama": Vite dev server açılıp buton gerçekten
tıklanacak, gerçek Sepolia RPC'sinden gerçek bir blok numarası döndüğü
gözle görülecek. Ayrıca env var silinerek hata yolunun da gerçekten
tetiklendiği kontrol edilecek.

## Açık soru

RPC URL için Akif'in kendi Infura/Alchemy anahtarı olması gerekiyor —
henüz sağlanmadıysa bu adımın "çalıştırılabilir doğrulama" kısmı env var
girilene kadar bekler (kod ve hata yolu yine de doğrulanabilir).
