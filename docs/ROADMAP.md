# PQ-SAFE — Yol Haritası

**Hedef:** TEKNOFEST 2026 Blokzincir Yarışması finali, **30 Eylül – 4 Ekim 2026**.
**Bugün:** 17 Ağustos 2026. Finale kadar **~6 hafta** var.
**Ekip:** Akif (frontend + kripto + doğrulayıcı kontrat + dokümantasyon),
Hakan (cüzdan kontratı + migration + deployment).

Bu dosya `docs/` altında, yani Akif'in sahipliğinde ama **ortak referans**tır.
Güncellemeler herkes tarafından yapılabilir; büyük yeniden planlamalar
`docs/DECISIONS.md`'ye kayıt olarak da düşülmeli.

Sprint aralıkları tahminidir, gerçek ilerlemeye göre kayabilir — önemli olan
**bağımlılık sırası** (bir sprint bitmeden başlayamayacak işler işaretli).

---

## Durum özeti (17 Ağustos itibarıyla)

**Bitti:**
- Repo iskeleti, `CLAUDE.md` (klasör sahipliği + çalışma kuralları)
- `docs/DECISIONS.md`, `docs/INTERFACE.md` (dondurulmuş `IPQVerifier` arayüzü + digest formatı)
- `contracts/src/interfaces/IPQVerifier.sol`
- Foundry kurulumu (`solc 0.8.20` sabit, optimizer açık), `forge-std` submodule
- Consigny'nin SPHINCS- referans implementasyonu submodule olarak eklendi
  (`contracts/lib/sphincs-minus`, commit `eef1f889a46c77d45dca013d321e9648fd3eaa7e`)
- GitHub'a push edildi: https://github.com/akifaybek/pq-safe

**Sırada (Sprint 0'ın geri kalanı):**
- [ ] Akif: referans implementasyondan `forge test --gas-report` ile ~142K gas rakamının
      doğrulanması, çıktının `docs/evidence/gas-reports/` altına konması
- [ ] Hakan: Foundry kurulumu kendi makinesinde, `forge build` doğrulaması
- [ ] Hakan: `PQWallet.sol` ve `Migration.sol` için ilk taslak/iskelet

---

## Sprint 1 — Çekirdek kontratlar (24–30 Ağustos)

**Akif:**
- `contracts/src/verifier/SPHINCSVerifier.sol`: `IPQVerifier`'ı implemente eden,
  Consigny'nin referans kodunu saran/kullanan kontrat
- `contracts/test/SPHINCSVerifier.t.sol`: geçerli imza / geçersiz imza / yanlış
  uzunluk / yanlış public key senaryoları — hepsi `false` dönmeli, hiçbiri revert
  etmemeli (bkz. arayüz sözleşmesi kural 1)
- Gas rakamının kendi ortamımızda kesinleşmiş hâli `docs/evidence/gas-reports/`'a

**Hakan:**
- `contracts/src/PQWallet.sol`: nonce state, `IPQVerifier` çağrısı, `execute()`
  fonksiyonu, digest hesaplama (`docs/INTERFACE.md`'deki formülle birebir)
- `contracts/src/Migration.sol`: ECDSA `ecrecover` ile eski adres doğrulama,
  migrate edilen adresin kalıcı işaretlenmesi
- Kendi test dosyaları (`contracts/test/PQWallet.t.sol`,
  `contracts/test/Migration.t.sol` gibi — isimlendirme sana ait)

**Bağımlılık:** Yok — ikisi paralel gidebilir, `IPQVerifier` arayüzü zaten
dondurulmuş olduğu için Hakan benim somut implementasyonumu beklemeden
arayüze karşı yazabilir (mock/stub verifier ile test edip sonra gerçeğine geçirir).

**Sprint sonu hedefi:** Her iki taraf da kendi kontratlarında **yeşil (geçen)
Foundry testleri** olsun.

---

## Sprint 2 — Entegrasyon ve uçtan uca test (31 Ağustos – 6 Eylül)

**Ortak:**
- `PQWallet` içine gerçek `SPHINCSVerifier`'ın bağlanması (deploy + constructor/setter)
- Uçtan uca Foundry testi: gerçek bir SPHINCS- key-pair ile imzalanmış işlemin
  `PQWallet.execute()` üzerinden geçmesi
- Migration akışının `PQWallet` ile birlikte test edilmesi (eski ECDSA cüzdandan
  yeni PQ cüzdana geçiş senaryosu)
- Gas optimizasyonu turu (varsa) — bu noktada rakamlar netleşmiş olmalı

**Bu sprint, Sprint 1'in her iki tarafı da bitmeden tam anlamıyla başlayamaz** —
ama birbirini beklerken herkes kendi tarafında ilerlemeye devam edebilir.

---

## Sprint 3 — Frontend (7–13 Eylül)

**Akif (bu sprint neredeyse tamamen Akif'in):**
- `frontend/src/crypto/`: `@noble/post-quantum` (`slh_dsa`) ile anahtar üretimi,
  imzalama
- `frontend/src/crypto/`: digest hesaplama — Solidity tarafıyla **birebir aynı**
  `abi.encode` sırası (`docs/INTERFACE.md` Bölüm 2'deki kodlama detayına göre)
- `frontend/src/contracts/`: kontrat ABI'leri, ethers v6 entegrasyonu
- `frontend/src/components/`: cüzdan oluşturma, işlem gönderme, imza akışı UI'ı
- Digest eşleşmesi testi: aynı girdi için Solidity ve JS aynı digest'i üretmeli
  — kanıt `docs/evidence/crypto-tests/` altına

**Hakan (bu sprintte destek/paralel iş):**
- `contracts/script/`: Sepolia deploy script'leri (`forge script`)
- Deploy edilecek kontratların son hâlini sabitleme (Sprint 2'nin çıktısı)
- Zaman kalırsa: `README.md`'nin ilk taslağı

---

## Sprint 4 — Sepolia deploy + uçtan uca test (14–20 Eylül)

**Ortak:**
- Hakan: Kontratları Sepolia'ya deploy et (script + doğrulama)
- Akif: Frontend'i deploy edilen adreslere bağla
- Ortak: Gerçek testnet üzerinden tam akış — cüzdan oluştur, imzala, işlem gönder,
  migration dene
- Tx hash'leri, ekran görüntüleri `docs/evidence/` altına (gas-reports/,
  screenshots/, crypto-tests/)

**Bu sprint, Sprint 2 ve 3'ün ikisi de bitmeden anlamlı şekilde başlayamaz.**
6 haftalık planda en riskli nokta burası — erken başlamak için Sprint 3'ü
mümkün olduğunca öne çekmeye çalışalım.

---

## Sprint 5 — Kanıt toplama, dokümantasyon, demo hazırlığı (21–27 Eylül)

**Ortak:**
- `docs/evidence/` klasörünün eksiksiz olması (gas raporları, test çıktıları, tx hash'ler)
- `README.md` son hâli (Hakan sahibi, ama içerik ikimizden de gelir)
- Demo senaryosu/akışı yazılması, jüri sunumu için hazırlık
- Bug fixing / son rötuşlar

---

## Buffer (28–29 Eylül)

Prova, son kontrol, beklenmedik sorunlar için pay. Bu iki günü plana bilerek boş
bıraktık — bir önceki sprint'ler gecikirse buraya taşar.

---

## Final (30 Eylül – 4 Ekim)

TEKNOFEST sunumu/yarışma. Bu noktada kod dondurulmuş, sadece kritik bug fix
yapılır (varsa).

---

## Riskler / dikkat noktaları

- **SPHINCS- imza/anahtar boyutu büyük** → calldata maliyeti gas rakamını
  etkiler, frontend tarafında da imza üretim süresi (WASM/JS performansı) test
  edilmeli. Erken ölçüm (Sprint 0-1) bu riski azaltır.
- **Digest formatı eşleşmesi** (Solidity ↔ JS) — tek bir encode sırası hatası
  tüm imzaları geçersiz kılar. Sprint 3'te ilk iş bu eşleşmeyi doğrulamak olmalı,
  UI'a geçmeden önce.
- **Ortam/kurulum sorunları** — GitHub API rate limit (solc indirirken bu bende
  gerçekleşti, `binaries.soliditylang.org`'dan elle indirip çözdüm). Hakan aynı
  soruna düşerse aynı çözüm uygulanabilir.
- **Koordinasyon** — `IPQVerifier` arayüzü veya digest formatı değiştirilmesi
  gerekirse, tek taraflı yapılmaz; `docs/DECISIONS.md`'ye kayıt + diğer tarafın
  onayı şart (bkz. `CLAUDE.md` kural 1 ve dondurulmuş arayüz notu).

## Commit ve iletişim kuralları (hatırlatma)

- Her mantıksal iş parçası bitince dur, `git status`/`git diff --stat` göster,
  commit mesajı öner, onay bekle (`CLAUDE.md` kural 2)
- 3'ten fazla dosyayı commit'siz biriktirme
- Test olmadan "bitti" deme
- Karşı tarafın klasörüne dokunmadan önce sor
- Belirsizlik/tasarım kararı varsa `docs/DECISIONS.md`'ye kayıt düş
