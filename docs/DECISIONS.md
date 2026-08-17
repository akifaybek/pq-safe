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
