# Sprint 3 — Frontend Sepolia salt-okunur bağlantı kanıtı (tarayıcı)

**Tarih:** 28 Ağustos 2026
**Yazan:** Akif
**Dosyalar:** `frontend/src/network/sepolia.js`, `frontend/index.html`,
`frontend/src/main.js`, `frontend/.env.example`

## Amaç

`GOREV_SINIRLARI.md` Sprint 3 listesindeki Akif görevi "Frontend'i Sepolia'ya
bağla"nın ilk parçası: frontend'in Sepolia'ya `ethers.JsonRpcProvider` ile
salt-okunur bağlanabildiğini gerçek bir RPC çağrısıyla kanıtlamak.

Bu adım **bilerek** kontrat adresi, tx gönderme ve signer içermiyor —
Hakan'ın deploy çıktıları (`docs/tx-hashes.md`) henüz gelmedi. Kanıtlanan
şey ağ katmanının çalıştığı ve **yanlış ağa bağlanmanın yakalandığı**.

Yanlış ağ kontrolü kozmetik değil: `CLAUDE.md`'deki dondurulmuş digest
formatı `DOMAIN_SEPARATOR`'ü `block.chainid` üzerinden türetiyor. Yanlış
zincire bağlanmak yerelde hiçbir belirti vermeden on-chain reddedilen
imzalar üretir. Bu yüzden üç yolun da doğrulanması gerekiyordu.

## Ortam

```
node    v22.21.0
vite    8.2.2 (dev server)
ethers  6.17.0
Chrome  (Playwright, channel: chrome) — macOS 15.6
RPC     https://ethereum-sepolia-rpc.publicnode.com  (anahtarsız public uç nokta)
        https://ethereum-rpc.publicnode.com          (yanlış-ağ testi için, mainnet)
```

Not: Infura/Alchemy anahtarı gerekmedi. Salt-okunur bağlantı testi için
anahtarsız public uç nokta yeterli; tx gönderme adımında rate limit
nedeniyle kendi anahtarımıza geçmek gerekebilir.

## Test akışı ve çıktı

Her senaryoda `frontend/.env` ayarlandı, dev server yeniden başlatıldı,
sayfa açıldı ve "3. Sepolia Bağlantısı" bölümündeki "Bağlantıyı test et"
butonuna tıklandı. Metinler DOM'dan birebir alındı.

### A) Mutlu yol — Sepolia RPC

```
Chain ID          : 11155111
Son blok numarası : 11586383
Mesaj             : Sepolia'ya bağlantı doğrulandı
```

Gösterilen `Chain ID` sabit değil, RPC'nin gerçekten döndürdüğü değer —
`checkSepoliaConnection()` bunu bilerek `network.chainId`'den taşıyor ki
ekrandaki sayı bağlantının kanıtı olsun.

Ekran görüntüsü: `docs/evidence/screenshots/sprint3-sepolia-connection.png`

### B) Yanlış ağ — mainnet RPC (chainId 1)

```
Hata: Sepolia (11155111) bekleniyordu, RPC chainId 1 döndürdü — digest
formatı chainId'e bağlı, yanlış ağda üretilen imzalar geçersiz olur.
```

Ekran görüntüsü: `docs/evidence/screenshots/sprint3-sepolia-wrong-network.png`

### C) Env var tanımsız — `.env` yok

```
Hata: VITE_SEPOLIA_RPC_URL tanımlı değil — frontend/.env dosyasına ekleyin
(bkz. .env.example)
```

Sessiz fallback yok: RPC URL yoksa açık hata veriliyor, varsayılan bir
uç noktaya düşülmüyor. Kontrol `!rpcUrl.trim()` olduğu için boş string de
(yani `cp .env.example .env` deyip doldurmayı unutmak) bu mesaja düşüyor,
ethers'ın anlaşılmaz URL hatasına değil.

Ekran görüntüsü: `docs/evidence/screenshots/sprint3-sepolia-error-state.png`

## Tasarım kararı: doğrulanmamış provider dışa açılmıyor

`sepolia.js` yalnızca `getSepoliaProvider()` ve `checkSepoliaConnection()`
export ediyor. Provider'ı kuran `createUncheckedProvider()` modüle özel
bırakıldı, çünkü dışa açık olsaydı sıradaki adımda
`new Contract(addr, abi, getProvider())` yazmak en doğal şey olurdu ve
chainId kontrolünü sessizce atlardı. `getSepoliaProvider()` ağı bir kez
doğrulayıp sonucu önbelleğe alıyor; önbellek sadece başarıda doldurulduğu
için geçici bir RPC hatası bağlantıyı kalıcı olarak bozmuyor.

`getNetwork()` çağrısının üstünde bir uyarı yorumu var: provider'a
`staticNetwork: true` eklenirse ethers ağı RPC'ye sormadan yapılandırılmış
değeri döndürür ve chainId kontrolü hiç başarısız olamayan bir totolojiye
dönüşür.

## Otomatik test neden yok

Spec'te bilinçli karar (`docs/superpowers/specs/2026-08-26-sepolia-readonly-connection-design.md`,
"Test / doğrulama"): bu adımın tek işi gerçek bir ağ çağrısının çalıştığını
göstermek, mock'lanmış bir provider bunu kanıtlamaz. Doğrulama dev server
üzerinden çalıştırılabilir ve yukarıda üç yolun da çıktısı kayıtlı.
Kontrat okuma katmanı geldiğinde digest/nonce mantığı için otomatik test
gerekecek — o ayrı bir görev.

## Kapsam dışı / henüz yapılmadı

- Kontrat adresleri, ABI bağlama, kontrat state okuma — Hakan'ın deploy'u bekleniyor.
- Tx gönderme, signer/MetaMask entegrasyonu.
- Uçtan uca akış ve ekran kaydı (Sprint 3'ün kalan Akif maddesi).
- Bu sayfa hâlâ bir kanıt/demo arayüzü, üretim cüzdan UI'ı değil.

## Sonuç

Frontend Sepolia'ya salt-okunur bağlanıyor, doğru chainId ve güncel blok
numarasını okuyor; yanlış ağ ve eksik yapılandırma senaryolarının ikisi de
açık, açıklayıcı hatayla yakalanıyor. Sprint 3'ün "Frontend'i Sepolia'ya
bağla" maddesinin ağ katmanı parçası tamamlandı.
