# İzin deny listesi — sınama kaydı

**Tarih:** 18 Eylül 2026
**Konu:** `.claude/settings.json` (commit `81b6cd6`), 17 deny kuralı.
**Sahiplik:** Akif.

Deny listesi yazıldığında yalnızca Bash ailesinden tek kural gözlenmişti. Bu not
Read ailesinin sınamasını ve sınamanın **ne kanıtlamadığını** kaydediyor.

## Bash ailesi — `cast send`, 18 Eylül

```
$ cast send --help
Permission to use Bash with command cast send --help has been denied.
```

Gerçek bir yayınla sınanmadı ve sınanmayacak: kural tutmasaydı komut Sepolia'ya
işlem gönderirdi ve 19-22 Eylül ölçüm penceresi kırılırdı. `--help` aynı öneki
taşıdığı için kuralı aynı kesinlikte sınıyor, tutmasa bile zararsızdı.

## Read ailesi — 18 Eylül

Hedef iki yol da **mevcut** (kök dizinde `.env*` biçiminde 5 dosya var; adları
okundu, **içerikleri okunmadı**):

| Deneme | Sonuç |
|---|---|
| `Read(/Users/akif/pq-safe/frontend/.env)` | **Reddedildi**, içerik dönmedi |
| `Read(/Users/akif/pq-safe/.env.pqwallet-owner-key)` | **Reddedildi**, içerik dönmedi |

Red mesajı, ikisinde de birebir:

```
File is in a directory that is denied by your permission settings.
```

**Kontrol ölçümü — engel yola özel, dizin geneli değil:** aynı dizindeki
`frontend/.env.example` **okundu** (3 satır). Yani kural `frontend/` dizinini
topluca kapatmıyor, `.env.example`'ı da yanlışlıkla kapsamıyor.

### Bu sınamanın KANITLAMADIĞI — açık kalem duruyor

Red **gözlendi**, ama **bizim kuralımızın** ürettiği ayırt edilemedi:

1. Harness'ın kendi `.env` koruması var. Kanıt: `ls -la frontend/.env` **Bash
   çağrısı da reddedildi**, oysa deny listemizde hiçbir `ls` kuralı yok.
2. Korunan iki yol da `.env` biçiminde. Dolayısıyla yalnızca yerleşik koruma
   çalışıyor olsaydı **aynı iki reddi** görürdük.
3. Kuralları tek başına yalıtacak bir deneme yok: listedeki Read kurallarının
   ikisi de `.env`-biçimli yollara bakıyor.

Bu yüzden kalem **kapanmadı**. Doğru ifade: *"Read yolunda dosya okunamadığı
gözlendi; reddi üretenin bizim kuralımız mı yerleşik koruma mı olduğu
ölçülmedi."*

Yalıtım isteniyorsa yol: listeye `.env` biçiminde **olmayan** bir yol için
geçici bir Read kuralı eklenip o dosyanın reddedilip reddedilmediğine bakılır.
Yapılmadı.

### Yan kayıt — kalıba giren dosyalar

Kuraldaki `Read(./.env.pqwallet-owner-key*)` yıldızı, kök dizinde duran iki
emekli anahtar dosyasını (`…retired-2026-09-01` ve `…-b`) da kapsıyor. İçerikleri
okunmadı; yalnızca adları sayıldı.
