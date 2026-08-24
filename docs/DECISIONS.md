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

---

## 19 Ağustos 2026 — İmza şeması SLH-DSA-SHA2-128-24'ten C13'e değiştirildi ⚠️ HAKAN ONAYI BEKLİYOR
**Karar:** Dondurulmuş imza şeması kararı değiştirildi: **SLH-DSA-SHA2-128-24**
yerine **C13** (Consigny'nin WOTS+C/FORS+C ailesi, h=22 d=2 a=19 k=7 w=8)
kullanılacak. `CLAUDE.md` ve `docs/INTERFACE.md`'deki ilgili satırlar bu karara
göre güncellendi.

**Bu karar CLAUDE.md kural 1 gereği ortak bir dosyada — Hakan'ın açık onayı
olmadan tam anlamıyla "dondurulmuş" sayılmaz.** Akif bu kaydı, Hakan'a haber
vermek ve onayını almak amacıyla şimdi düşüyor; Hakan itiraz ederse bu kayıt
geçersiz kılınıp eski karara dönülecek (silinmeyecek, üstüne yeni kayıt
eklenecek — bkz. dosya başındaki kural).

**Neden:** Sprint 0 risk testinde (`docs/evidence/crypto-tests/sprint0-noble-post-quantum-risk-test.md`)
şu bulundu: `@noble/post-quantum` kütüphanesi sadece standart FIPS 205
parametre setlerini (128f/128s/192f/192s/256f/256s) destekliyor, bizim eski
hedefimiz SLH-DSA-SHA2-128-24'ün özel parametreleriyle (h=22 d=1 a=24 k=6 w=4)
eşleşmiyor ve kütüphane özel varyant üretmenin bir yolunu dışa vermiyor.
Referans repodaki tek hazır tarayıcı/JS imzalayıcı (`signer-wasm/`, Rust→WASM,
BIP-39/44 anahtar türetmeli) **C13** için yazılmış, SLH-DSA-SHA2-128-24 için
değil. Yani eski hedefte kalırsak kendi imzalayıcımızı sıfırdan yazmamız
gerekecekti — hem yüksek efor hem "kriptografi kodunu uydurma" riski (kural 6)
6 haftalık takvimde kabul edilemez.

C13'e geçmenin ek faydaları: gas **%25 daha ucuz** (106,672 vs 143,057 —
bkz. `docs/evidence/gas-reports/sprint0-c13-verifier-gas.md`), imza **daha
küçük** (3,688B vs 3,856B, calldata maliyeti daha düşük).

**Dezavantaj/dikkat:** C13, FIPS 205'in kendisi değil, ePrint 2025/2203'teki
bir araştırma parametre ailesi (counter-grinding'li WOTS+C/FORS+C) —
SLH-DSA-SHA2-128-24 "vanilla SPHINCS+" NIST SP 800-230 taslağına daha
yakındı. Jüri sunumunda "NIST'in kendisi mi bu?" sorusuna dürüst cevap:
hayır, FIPS 205 ailesinden ilham alan, aynı güvenlik seviyesini (128-bit)
daha ucuza sağlamayı hedefleyen bir araştırma varyantı.

**Etki:**
- `CLAUDE.md` "Teknik kararlar" bölümü güncellendi
- `docs/INTERFACE.md` Bölüm 0 ve açık uçlar bölümü güncellendi
- Yeni kanıt: `docs/evidence/gas-reports/sprint0-c13-verifier-gas.md`
- Eski kanıt dosyaları (`sprint0-reference-verifier-gas.md`,
  `sprint0-noble-post-quantum-risk-test.md`) **silinmedi** — o zamanki
  ölçümün doğru kaydı olarak kalıyor, artık geçerli hedefi yansıtmıyor
- `contracts/lib/sphincs-minus` submodule'ünde değişiklik YOK — C13 zaten
  aynı sabitlenmiş commit'in (`eef1f889a46c77d45dca013d321e9648fd3eaa7e`)
  içinde, `src/SPHINCs-C13Asm.sol`
- Hakan'ın `PQWallet.sol`/`Migration.sol` kodu etkilenmiyor —
  `IPQVerifier` arayüzü şemadan bağımsız (`bytes signature, bytes publicKey`),
  sadece somut `SPHINCSVerifier.sol` implementasyonu ve frontend imzalayıcı
  değişecek
— Akif

---

## 19 Ağustos 2026 — C13 şema değişikliği onaylandı ✅
**Karar:** Hakan yukarıdaki "İmza şeması SLH-DSA-SHA2-128-24'ten C13'e
değiştirildi" kaydını onayladı. Karar artık tam anlamıyla dondurulmuş —
`CLAUDE.md`'deki "Hakan onayı bekleniyor" notu kaldırıldı.

**Neden:** Gerekçe (kütüphane uyumsuzluğu, gas/imza boyutu avantajı) yeterli
bulundu. `IPQVerifier` arayüzü şemadan bağımsız olduğu için `PQWallet.sol`/
`Migration.sol` tarafında hiçbir değişiklik gerekmiyor.

**Doğrulama:** Hakan'ın makinesinde de yeni solc 0.8.35 + via_ir ile
`forge clean && forge build` temiz geçti, 10/10 test (MockVerifier +
SPHINCSVerifier) geçti.

**Etki:** Yok — Hakan'ın dosyaları etkilenmiyor.
— Hakan

---

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

---

## 19 Ağustos 2026 — ERC-4337 (Account Abstraction) incelemesi — karar değil, değerlendirme notu
**Bulgu:** ERC-4337, UserOperation nesnelerini bir Bundler'ın topladığı,
tekil bir EntryPoint kontratının doğrulayıp (`validateUserOp`) yürüttüğü,
opsiyonel bir Paymaster'ın gazı sponsorlayabildiği bir standart. PQWallet
bu standardı kullanmıyor — EntryPoint/Bundler/mempool katmanı yok, işlem
doğrudan `execute()` üzerinden yürütülüyor. Yine de desen düzeyinde
örtüşme var: (1) nonce ile replay koruması — bizim `PQWallet.nonce`
alanımızla aynı rol, GOREV_SINIRLARI.md Bölüm 5'teki "leaf sayacı değil
nonce" kararıyla tutarlı; (2) imza doğrulamanın hesap mantığından
ayrılması — ERC-4337'de `validateUserOp`, bizde `IPQVerifier.verify()`;
(3) `execute(to, value, data)` imzası neredeyse birebir aynı şekilde
tekrar ediyor. ERC-4337'ye geçmemenin artısı: EntryPoint/Bundler
bağımlılığı olmadan scope küçük kalıyor, SPHINCS- gibi büyük
imza/anahtar boyutlu bir şemayı EntryPoint'in validation-phase storage
kısıtlamalarına (ERC-7562) uydurma riski yok. Eksisi: standart bundler/
paymaster ekosistemiyle (gassız UX, sponsorlu işlem) uyumluluk yok,
kullanıcı gazı kendi ödemek zorunda.

**Kaynak:** https://eips.ethereum.org/EIPS/eip-4337 ,
https://www.alchemy.com/overviews/what-is-account-abstraction

**Sonuç:** Mevcut mimari (kendi `execute()`/`verify()` akışımız)
korunuyor, ERC-4337'ye geçiş gündemde değil — bu bir karar değil, sadece
kayıt altına alınan bir değerlendirme. İleride paymaster/gassız UX
ihtiyacı doğarsa bu not başlangıç noktası olarak kullanılabilir.
— Hakan
## 19 Ağustos 2026 — solc/via_ir güncellemesi (0.8.20 → 0.8.35, via_ir açıldı)
**Karar:** `contracts/foundry.toml`'daki pinlenmiş `solc` sürümü `0.8.20`'den
`0.8.35`'e yükseltildi, `via_ir = true` eklendi. Bizim kendi kontratlarımızın
pragma'sı (`^0.8.20`) **değişmedi** — `^0.8.20` zaten `>=0.8.20 <0.9.0`
anlamına geldiği için 0.8.35 ile tam uyumlu, davranış değişmiyor.

**Neden:** `contracts/src/verifier/SPHINCSVerifier.sol` yazılırken referans
kontrat `SPHINCs-C13Asm.sol`'un `pragma ^0.8.28` istediği ve pinlenmiş
`solc 0.8.20`'nin bunu karşılamadığı ortaya çıktı ("No solc version exists
that matches ^0.8.28" hatası). Ayrıca referans kontratın yoğun inline
assembly'si `via_ir` olmadan "stack too deep" hatası veriyordu (sphincs-minus'un
kendi `foundry.toml`'unda zaten `via_ir=true` vardı, biz eksikmişiz).

**Etki:** `contracts/foundry.toml` güncellendi. Bu, "foundry.toml sahipliği
ortak" kararının (17 Ağustos) kapsamına giriyor — solc/optimizer'ı tek taraflı
değiştirmeme kuralı, ama bu değişiklik bizim `^0.8.20` pragma'mızı bozmuyor,
sadece derleyici sürümünü yukarı çekiyor (geriye dönük uyumlu). Hakan'ın kendi
makinesinde de `git pull` sonrası `forge clean && forge build` çalıştırması
gerekecek (yeni solc sürümü otomatik inecek).
— Akif

---

## 19 Ağustos 2026 — SPHINCSVerifier.sol yazıldı, 8/8 test geçti
**Karar:** `contracts/src/verifier/SPHINCSVerifier.sol` — `IPQVerifier`'ı
implemente eden, C13 referans kontratını (`SphincsC13Asm`) saran kontrat —
yazıldı. `publicKey` (64 bayt) → `pkSeed`(32)‖`pkRoot`(32) olarak decode
ediliyor; referansın revert edebildiği durumlar (yanlış imza uzunluğu,
non-canonical public key) `try/catch` ile yakalanıp `false`'a çevriliyor
(`IPQVerifier`'ın "asla revert etmez" garantisi böylece korunuyor).

`contracts/test/SPHINCSVerifier.t.sol`: 8 test (geçerli imza, yanlış mesaj,
kurcalanmış imza, yanlış imza/publicKey uzunluğu, boş imza, 256 run'lık
"asla revert etmez" fuzz testi) — **hepsi geçti**. Fixture
(`contracts/test/fixtures/c13-kat.json`) Rust CLI imzalayıcıyla üretildi,
FFI kullanılmadan `vm.readFile` ile okunuyor.

**Neden:** Sprint 1 görevi (`docs/GOREV_SINIRLARI.md` Bölüm 9). CLAUDE.md
kural 3 ("test olmadan bitti deme") ve kural 6 ("kriptografi kodunu
uydurma") gereği, sarmalayıcının davranışı gerçek bir imzayla ve arayüz
sözleşmesinin kritik garantisini (revert etmeme) hedefleyen testlerle
doğrulandı.

**Etki:** Sarmalayıcının gerçek gas maliyeti ölçüldü: **111,074 gas**
(geçerli imza yolu) — çıplak referansın (106,672) ~%4 üzerinde, try/catch
sarma maliyeti. Kanıt: `docs/evidence/gas-reports/sprint1-sphincsverifier-wrapper-gas.md`.
Hakan'ın Sprint 2'de `MockVerifier`'ı bu gerçek verifier ile değiştirebileceği
nokta budur (bkz. `GOREV_SINIRLARI.md` Sprint 2).
— Akif

---

## 19 Ağustos 2026 — CLAUDE.md'deki JS kütüphanesi satırı düzeltildi
**Karar:** `CLAUDE.md`'deki "JS kütüphanesi: @noble/post-quantum (slh_dsa)"
satırı C13'e geçişten beri güncel değildi — kaldırıldı, yerine
`contracts/lib/sphincs-minus/signer-wasm` (Rust/WASM, C13-only, BIP-39/44
anahtar türetmeli) yazıldı.

**Neden:** C13 kararı verilirken (bkz. yukarıdaki 19 Ağustos kaydı)
`@noble/post-quantum`'ın C13'ü üretemediği zaten tespit edilmişti
(`docs/evidence/crypto-tests/sprint0-noble-post-quantum-risk-test.md`), ama
`CLAUDE.md`'nin "Teknik kararlar" bölümündeki eski satır o sırada
güncellenmemişti — tutarsızlık fark edildi ve düzeltildi.

**Etki:** `CLAUDE.md` dışında kod değişikliği yok. `docs/GOREV_SINIRLARI.md`
Sprint 0'daki "@noble/post-quantum ile keygen/sign/verify" ve "performans
testi" maddeleri de artık geçersiz — bir sonraki adımda WASM signer
entegrasyonuna göre güncellenecek.
— Akif

---

## 23 Ağustos 2026 — ARCHITECTURE.md yazıldı, Sprint 0 kapandı
**Karar:** `docs/ARCHITECTURE.md` yazıldı — C13 imza yolunun uçtan uca akışı
(frontend WASM signer → PQWallet → IPQVerifier → SPHINCSVerifier sarmalayıcı
→ referans SphincsC13Asm kontratı), C13'ün WOTS+C/FORS+C mekaniği, ve
`sphincs-minus` reposundaki agent-destekli güvenlik incelemesinin
(`SECURITY-REVIEW-C13-SLHDSA.md`) özeti içeriyor.

**Neden:** Sprint 0 görevi (`GOREV_SINIRLARI.md` Bölüm 9). CLAUDE.md kural 6
("kriptografi kodunu uydurma") gereği, özet doğrudan `SPHINCs-C13Asm.sol`
kodu okunarak ve incelemedeki bulgular doğrulanarak yazıldı.

**Etki:** Güvenlik incelemesindeki en önemli iki bulgu (C13-X-f2: mesaj
randomizer'ı `R` kamuya açık/grindable, few-time güvenlik kanıtı bu daha
güçlü modelde ispatlanmamış; C13-X-f3: target-sum WOTS+C'nin çoklu-kullanım
direnci ispatlanmamış) belgeye not düşüldü — ikisi de pratik bir kırılma
değil (en iyi bilinen saldırı ~2^133), ama projenin "resmi FIPS 205 seti
değil, araştırma varyantı" uyarısını teyit ediyor. Sprint 0'ın Akif
tarafındaki tüm maddeleri artık ✅.
— Akif

---

## 19 Ağustos 2026 — Migration.sol yazıldı, 9/9 test geçti
**Karar/Bulgu:** `contracts/src/Migration.sol` — `proveOwnership(oldAddress,
newAddress, signature)` — yazıldı. Eski ECDSA cüzdanın sahipliği EIP-191
(`personal_sign`) formatında imzayla kanıtlanıyor, ecrecover elle
sarmalandı (uzunluk kontrolü, low-s malleability koruması, v ∈ {27,28}),
ayrı domain separator (`PQSAFE_MIGRATION_V1`) kullanıldı. Başarılı
migration sonrası `migrated[oldAddress]` kalıcı olarak true'ya çevriliyor
— ikinci deneme, yanlış imza, sıfır newAddress, kısa imza, high-S, geçersiz
v hepsi revert ediyor.

**Neden:** Sprint 1 görevi (GOREV_SINIRLARI.md Bölüm 9). CLAUDE.md kural 6
gereği hazır bir ECDSA kütüphanesi yerine (tek kaynağı Akif'in submodule'ü
içindeydi) elle, aynı güvenlik kontrolleriyle yazıldı — gereksiz çapraz
bağımlılık kurulmadı.

**Doğrulama:** `contracts/test/Migration.t.sol` — 9 test (256 run'lık fuzz
dahil), hepsi geçti: `forge test --match-path test/Migration.t.sol` →
9 passed, 0 failed.

**Etki:** Sprint 1'deki Migration.sol görevi tamamlandı.
— Hakan

---

## 24 Ağustos 2026 — PQWallet.sol yazıldı, digest uyum testi geçti

**Karar/Bulgu:** `contracts/src/PQWallet.sol` yazıldı — `ownerPublicKey`,
`verifier` (IPQVerifier), `nonce` state'i; `_computeDigest(to, value, data)`
dondurulmuş formülü (GOREV_SINIRLARI.md Bölüm 4) birebir uyguluyor;
`execute()` checks-effects-interactions sırasıyla (nonce dış çağrıdan ÖNCE
artırılıyor) verifier'ı çağırıp transferi yapıyor.

**Doğrulama:** `contracts/test/PQWallet.t.sol` — 6 test, hepsi geçti:
`forge test --match-path test/PQWallet.t.sol` → 6 passed, 0 failed. İki
test (`test_DigestMatchesJsVector_Test1/2`) Akif'in `docs/evidence/crypto-tests/sprint2-js-digest-function.md`
belgesindeki JS/`cast` vektörleriyle birebir aynı digest'i üretiyor —
Sprint 2'nin kritik "digest uyum testi" görevi bu şekilde tamamlandı.
Ayrıca `forge test --gas-report` çıktısı `docs/evidence/gas-reports/sprint2.txt`'e kaydedildi.

**Neden:** Sprint 2 görevi (GOREV_SINIRLARI.md Bölüm 9).

**Etki:** Sprint 2'deki digest uyum testi tamamlandı. Kalan tek Sprint 2
maddesi: MockVerifier'ın gerçek SPHINCSVerifier ile entegrasyon testi —
Akif'in gerçek digest üzerinden bir imza üretmesini bekliyor.
— Hakan
