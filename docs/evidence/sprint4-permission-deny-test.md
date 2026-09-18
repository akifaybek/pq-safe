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

### KAPANDI — tek değişkenli deney, 19 Eylül 2026

Aşağıdaki belirsizlik **iki dakikalık bir deneyle** çözüldü. Yöntem: `.env`
biçiminde **olmayan**, yerleşik koruması bulunmayan bir dosyaya geçici bir
kural koyup tek değişkeni oynatmak.

| Adım | Durum | Sonuç |
|---|---|---|
| 1 | `Read(./docs/FRONTEND-KURULUM.md)` deny listesine **eklendi** | Read **REDDEDİLDİ** |
| 2 | Kural **kaldırıldı** | Aynı dosya **OKUNDU** (3 satır) |

Red mesajı birebir aynı çıktı:

```
File is in a directory that is denied by your permission settings.
```

**HÜKÜM: reddi üreten bizim listemizdir.** `docs/FRONTEND-KURULUM.md` düz bir
markdown dosyası; harness'ın `.env` koruması buraya uğramıyor. Tek değişen şey
listedeki satırdı ve davranış onunla birlikte değişti, onsuz geri döndü.

Yan sonuç: **ayar dosyası canlı okunuyor** — kural eklendiği anda etkili oldu,
kaldırıldığı anda etkisi kalktı; oturum yeniden başlatmak gerekmedi.

İkinci yan sonuç: red **mesajı** ayırt edici değil. `.env` dosyalarında görülen
metnin aynısı burada da çıktı, yani mesaja bakarak "bu bizim kuralımız" denemez;
ayrımı yapan şey deneyin kendisidir.

`settings.json` deney sonrası **baytı baytına** eski hâline döndü (`git diff`
boş). Kalıcı bir değişiklik yapılmadı.

### Deney ÖNCESİNDE belirsiz kalan — kayıt olarak duruyor

Red **gözlendi**, ama **bizim kuralımızın** ürettiği ayırt edilemedi:

1. Harness'ın kendi `.env` koruması var. Kanıt: `ls -la frontend/.env` **Bash
   çağrısı da reddedildi**, oysa deny listemizde hiçbir `ls` kuralı yok.
2. Korunan iki yol da `.env` biçiminde. Dolayısıyla yalnızca yerleşik koruma
   çalışıyor olsaydı **aynı iki reddi** görürdük.
3. Kuralları tek başına yalıtacak bir deneme yok: listedeki Read kurallarının
   ikisi de `.env`-biçimli yollara bakıyor.

O aşamada doğru ifade şuydu: *"Read yolunda dosya okunamadığı gözlendi; reddi
üretenin bizim kuralımız mı yerleşik koruma mı olduğu ölçülmedi."*

Önerilen yalıtım yolu — `.env` biçiminde **olmayan** bir yola geçici kural
koymak — **19 Eylül'de koşuldu ve kalemi kapattı** (yukarıdaki bölüm). Bu
bölüm neyin neden bilinmediğinin kaydı olarak duruyor.

### Yan kayıt — kalıba giren dosyalar

Kuraldaki `Read(./.env.pqwallet-owner-key*)` yıldızı, kök dizinde duran iki
emekli anahtar dosyasını (`…retired-2026-09-01` ve `…-b`) da kapsıyor. İçerikleri
okunmadı; yalnızca adları sayıldı.
