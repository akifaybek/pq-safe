# PQ-SAFE — Karar Kaydı (Decision Log)

Bu dosya projede alınan teknik ve organizasyonel kararların kalıcı kaydıdır.

Her kayıt tarih ve imza (— Akif / — Hakan) içerir. Sadece dosyanın sonuna eklenir,
mevcut kayıtlar değiştirilmez.

Bir karar geçersiz kalırsa eski kayıt silinmez; sonuna yeni bir kayıt eklenir ve
hangi kaydı geçersiz kıldığı belirtilir.

Kayıt formatı:

```
## YYYY-MM-DD — Kararın kısa başlığı
**Karar:** Ne yapılacağı, tek cümleyle.
**Neden:** Gerekçe, değerlendirilen alternatifler.
**Etki:** Hangi dosyalar/roller etkilenir.
— Akif
```

---

## 17 Ağustos 2026 — Solidity sürüm aralığı
**Karar:** Tüm kontratlarda `pragma solidity ^0.8.20` kullanılacak, Foundry
optimizer açık. Bu karar tek taraflı değiştirilemez — değişiklik gerekirse ikisi de
onaylayıp bu dosyaya yeni bir kayıt ekler.

**Neden:** Akif'in verifier kontratı ile Hakan'ın PQWallet/Migration kontratları
aynı repoda derlenip birlikte test edilecek. Farklı Solidity sürümleri kullanılırsa
(örn. biri 0.8.19 diğeri 0.8.24) derleme uyumsuzluğu veya davranış farkı riski
oluşur. `^0.8.20`, Foundry'nin güncel varsayılanlarıyla uyumlu, yeterince modern
(custom error, immutable gibi özellikleri destekliyor) ve hem verifier'ın hem cüzdan
kontratlarının ihtiyacı için yeterli kararlı bir sürüm.

**Etki:** `contracts/` altındaki her `.sol` dosyası bu aralığı kullanacak. Hakan
`foundry.toml`'unu kurarken aynı sürümü seçmeli.
— Akif

---

## 17 Ağustos 2026 — Foundry kurulumu ve forge-std bağımlılığı
**Karar:** `contracts/` Foundry projesi olarak kuruldu (`forge init` yerine elle
`foundry.toml` + `forge install`). `forge-std` git submodule olarak eklendi
(`contracts/lib/forge-std`, `v1.16.2` @ `bf647bd6046f2f7da30d0c2bf435e5c76a780c1b`,
`contracts/foundry.lock` içinde ayrıca kilitli). `.gitignore`'daki `lib/` satırı
kaldırıldı ki submodule gitlink'i commit'e girebilsin.

**Neden:** Reproducibility — Hakan veya jüri repoyu klonladığında (submodule
init/update ile) birebir aynı forge-std sürümünü, dolayısıyla birebir aynı test/gas
sonuçlarını almalı. `solc 0.8.20` binary'si de GitHub'ın (`raw.githubusercontent.com`)
geçici 503 hatası nedeniyle `svm` üzerinden değil, resmi `binaries.soliditylang.org`
kaynağından indirilip SHA256 checksum'ı doğrulanarak yerel `svm` önbelleğine
(`~/.svm/0.8.20/`) elle yerleştirildi. Bu adım tek seferlik bir ortam kurulumudur,
repoya dahil değildir; her geliştirici kendi makinesinde `forge build` ile aynı
sürümü indirmeli (GitHub erişimi normalse `svm` bunu otomatik yapar).

**Etki:** Repoyu klonlayan herkes `git submodule update --init --recursive`
çalıştırmalı (veya `git clone --recursive`). `contracts/lib/` artık git'e dahildir.
— Akif
