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

---

## 17 Ağustos 2026 — Consigny'nin SPHINCS- referans implementasyonu eklendi
**Karar:** Nico Consigny'nin (Ethereum Foundation) SPHINCS- referans deposu
(`https://github.com/nconsigny/SPHINCS-`) `contracts/lib/sphincs-minus` altına git
submodule olarak eklendi, tam commit hash'ine sabitlendi:
`eef1f889a46c77d45dca013d321e9648fd3eaa7e` (bu commit orijinal ethresear.ch
makalesinde referans verilen commit'tir; makale kaynağı:
<https://ethresear.ch/t/sphincs-minus-efficient-stateless-post-quantum-signature-verification-on-the-evm/25165>).
Hedeflenen dosya `src/SLH-DSA-SHA2-128-24verifier.sol`. Ekleme adımı: `forge install
sphincs-minus=nconsigny/SPHINCS-@eef1f889a46c77d45dca013d321e9648fd3eaa7e`.
Eklemeden sonra `forge clean && forge build` ile proje hâlâ (`solc 0.8.20` altında)
temiz derlendiği doğrulandı — "Compiler run successful!".

**Neden:** 142K gas rakamının ve SPHINCS- doğrulama davranışının kaynağı bu koddur;
kriptografi kodu uydurulmayacağı için (bkz. CLAUDE.md kural 6) doğrulayıcımızı
yazarken bu implementasyonu birebir referans alacağız/karşılaştıracağız. Repoya
gömülü kopya yerine submodule tercih edildi ki orijinal kaynak, provenance ve
lisans bilgisi bozulmadan kalsın; commit hash'i sabitlendiği için kaynağın
sonradan değişmesi bizim ölçümlerimizi etkilemez.

**Etki:** `contracts/lib/sphincs-minus` git submodule olarak repoya girdi (kendi
içinde `account-abstraction`, `openzeppelin-contracts`, `forge-std` nested
submodule'leri var — bunlar henüz `init` edilmedi, gerektiğinde
`git submodule update --init --recursive` ile çekilir). `contracts/foundry.lock`
bu ekleme sırasında oluşan hatalı `lib/SPHINCS-` (yanlış path) girdisi elle
temizlendi; doğru girdi `lib/sphincs-minus`'tur. Henüz hiçbir dosyamız bu
submodule'den import yapmıyor — sadece referans kaynak olarak eklendi.
— Akif

---

## 17 Ağustos 2026 — foundry.toml sahipliği ve Sepolia deploy zamanlaması
**Karar:** `contracts/foundry.toml` sahipliği 🟢 ORTAK olarak belirlendi (Hakan
kendi ihtiyacı olan satırları — RPC endpoint, script ayarları vb. — ekleyebilir,
ama `solc`/`optimizer` ayarlarını tek taraflı değiştiremez, bu ikisi zaten
"Solidity sürüm aralığı" kaydıyla dondurulmuş). Ayrıca Sepolia deploy'un Sprint 3'e
(7-13 Eylül) alınması kararlaştırıldı — `docs/ROADMAP.md`'nin ilk taslağında
Sprint 4'teydi (14-20 Eylül), bir hafta öne çekildi.

**Neden:** `foundry.toml`'u Akif oluşturdu ve `docs/DECISIONS.md`'deki
"Solidity sürüm aralığı" kararına göre `solc 0.8.20` sabitledi — bu dosyayı
tamamen Hakan'a devretmek, o kararın tek taraflı bozulma riskini taşırdı; ortak
işaretlemek her iki tarafın da bu dosyaya bağımlı olduğunu netleştirir. Sepolia
deploy'un erken alınması, gerçek ağda çıkabilecek sürprizlere (gas tahmini sapması,
RPC gecikmesi, testnet ETH bulma) daha fazla tampon süre bırakır.

**Etki:** `docs/GOREV_SINIRLARI.md` (Bölüm 2 dosya sahipliği tablosu, Bölüm 9
sprint listesi) bu kararla güncellendi ve artık ayrıntılı görev/sahiplik takibi
için tek referans dosyadır. `docs/ROADMAP.md` kısa bir genel bakışa indirgendi.
— Akif

---

## 17 Ağustos 2026 — Referans SPHINCS- verifier gas rakamı doğrulandı
**Karar:** "Solidity sürüm aralığı" kaydındaki `~142K gas — henüz doğrulanmadı"
notu artık geçersiz. Kendi Foundry ortamımızda, `sphincs-minus` submodule'ünün
FFI gerektirmeyen JSON-KAT testiyle (`test/SLH-DSA-SHA2-128-24-JsonKAT.t.sol`,
gerçek/deterministik bir imza vektörü) ölçüm yapıldı: **143,057 – 146,192 gas**
(min–max, 2 çağrı). Kaynağın iddia ettiği ~142K rakamı bu aralıkla uyumlu
(~%1-3 sapma) — **doğrulandı** kabul ediyoruz.

**Neden:** CLAUDE.md kural 6 ("kriptografi kodunu uydurma") ve kural 3 ("test
olmadan bitti deme") gereği, rapor/sunumda kullanacağımız gas rakamının kaynağın
iddiasına körü körüne güvenmek yerine kendi ortamımızda tekrarlanabilir şekilde
ölçülmesi gerekiyordu. FFI gerektiren (gerçek zamanlı imza üreten, C binary
derlemesi ve `ffi = true` isteyen) test yerine repoya zaten gömülü, deterministik
KAT vektörünü kullanan test tercih edildi — daha güvenli (rastgele shell komutu
çalıştırmıyor) ve daha hızlı tekrarlanabilir.

**Etki:** Kanıt `docs/evidence/gas-reports/sprint0-reference-verifier-gas.md`
altında (komut, tam çıktı, ortam bilgisi, kaynağın "denetlenmemiş araştırma
prototipi" uyarısı dahil). Bu, Sprint 0'ın son açık kalemiydi (bkz.
`docs/GOREV_SINIRLARI.md` Bölüm 9, Akif Sprint 0 tablosu) — işaretlendi.
Sıradaki adım: bu referansı sararak `contracts/src/verifier/SPHINCSVerifier.sol`
yazmak (Sprint 1).
— Akif

---

## 17 Ağustos 2026 — MockVerifier stub eklendi
**Karar:** `contracts/test/MockVerifier.sol` eklendi — `IPQVerifier`'ı implemente
eden, `verify()` çağrısında girdiden bağımsız her zaman `true` dönen bir stub.
Yanında `contracts/test/MockVerifier.t.sol` (1 birim test + 256 run'lık fuzz
test, ikisi de geçiyor) var.

**Neden:** `GOREV_SINIRLARI.md` Bölüm 6 stub kuralı ve Sprint 0 görev listesi
gereği — Akif'in gerçek `SPHINCSVerifier.sol`'ü henüz hazır değilken Hakan'ın
`PQWallet.sol`/`Migration.sol` testlerini `IPQVerifier` bağımlılığı olmadan
bekletmemesi için. Dosya kendi test klasöründe (🔴 HAKAN sahipliği) ve `Mock`
ön ekiyle, kuralda tarif edildiği gibi.

**Etki:** `contracts/test/MockVerifier.sol` ve `contracts/test/MockVerifier.t.sol`
eklendi. Bu stub, Akif'in gerçek verifier'ı Sprint 1/2'de hazır olduğunda
`PQWallet.sol` entegrasyon testlerinde onunla değiştirilecek (bkz.
`GOREV_SINIRLARI.md` Sprint 2, "MockVerifier'ı gerçek verifier ile değiştir").
— Hakan
## 19 Ağustos 2026 — forge build doğrulaması (Hakan'ın makinesi)
**Karar/Bulgu:** Foundry projesinin kökü `contracts/` klasörüdür (`foundry.toml`
orada). `forge build`/`forge test` komutları repo kökünden (`pq-safe/`) değil,
**`contracts/` klasörünün içinden** çalıştırılmalı — aksi halde Foundry proje
sınırını bulamıyor ve `contracts/lib/sphincs-minus` submodule'ünün nested
bağımlılıklarını (openzeppelin-contracts, account-abstraction, halmos-cheatcodes)
da derlemeye çalışıp hatalı "not found" hatalarıyla patlıyor.

**Neden:** Hakan repo kökünden `forge build` çalıştırınca yukarıdaki hataları aldı;
Akif `contracts/` içinden çalıştırınca temiz geçtiğini doğruladı. Sorun remapping
veya kod değil, çalıştırma dizinidir.

**Doğrulama:** Hakan'ın makinesinde `contracts/` içinden `forge clean && forge build`
→ "Compiler run successful!" (22 dosya, solc 0.8.20). `forge test` →
MockVerifier testleri 2/2 geçti (`testFuzz_AlwaysReturnsTrue`, `test_AlwaysReturnsTrue`).

**Etki:** Sprint 0 görev listesindeki "forge build kendi makinende çalışıyor mu
doğrula" görevi tamamlandı. İleride kafa karışıklığı olmasın diye bu dizin notu
`README.md`'ye de (Hakan'ın sahipliği) eklenmeli.
— Hakan