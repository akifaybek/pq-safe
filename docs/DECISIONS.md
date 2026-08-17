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
Tüm kontratlarda pragma solidity ^0.8.20 kullanılacak (contracts/ altındaki
her .sol dosyası, hem Akif'in verifier'ı hem Hakan'ın PQWallet/Migration
kontratları dahil). Foundry optimizer açık. Bu karar tek taraflı değiştirilemez —
değişiklik gerekirse ikisi de onaylayıp bu dosyaya yeni bir kayıt ekler.
— Akif
