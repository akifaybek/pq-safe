# Rapor için ham teknik içerik (Hakan'ın tarafı)

Bu belge bir rapor bölümü DEĞİL — Akif'in rapor yazarken kullanacağı ham
malzeme. Her madde, kaynağını (kod / test / DECISIONS.md / tx-hashes.md)
gösteriyor ki rapora geçerken doğrulanabilsin. Akif'in tarafı (C13 iç
mantığı, güvenlik değerlendirmesi) `docs/ARCHITECTURE.md`'de zaten var,
burada tekrar edilmiyor — sadece Hakan'ın tarafına (cüzdan, migration,
deploy, testler) odaklanıyor.

---

## 1. Ne inşa edildi (özet, jüriye 1 paragraf)

PQ-SAFE, klasik ECDSA cüzdanların kuantum bilgisayarlara karşı savunmasız
kalacağı senaryoya karşı bir "göç yolu" sunuyor: (1) `PQWallet.sol` —
yetkilendirmesi tamamen kuantum-dirençli SPHINCS-/C13 imza doğrulamasından
gelen, `msg.sender`'a bakmayan bir akıllı cüzdan; (2) `Migration.sol` —
eski bir ECDSA cüzdanının sahibinin, klasik imzasıyla "bu adres benimdir,
şu yeni PQ cüzdana bağlıyorum" diyebildiği, tek kullanımlık bir sahiplik
kanıtı mekanizması. İkisi birlikte "eski cüzdanını kanıtla → yeni
kuantum-güvenli cüzdana geç" akışını kapatıyor. Sepolia testnet'inde
gerçek para ile gerçek bir migration + transfer işlemi uçtan uca
çalıştırıldı (bkz. Bölüm 4).

## 2. Mimari ve tasarım kararları

- **Yetkilendirme modeli:** `PQWallet` klasik "hesap sahibi = gönderen"
  modelini kullanmıyor; kim gönderirse göndersin, imza geçerliyse işlem
  yürütülüyor (relayer'lar üzerinden gaz sponsorluğuna açık bir tasarım —
  ERC-4337'ye benzer ama o standardı kullanmıyor, EntryPoint/Bundler katmanı
  yok — bkz. DECISIONS.md 19 Ağustos "ERC-4337 incelemesi").
- **Replay koruması:** SPHINCS- stateless bir imza şeması olduğu için
  (klasik "leaf sayacı" yaklaşımı yok), koruma tamamen `PQWallet.nonce`
  ile sağlanıyor — her `execute()` çağrısı önce mevcut nonce'la bir digest
  hesaplıyor, imza doğrulanınca nonce'u dış çağrıdan ÖNCE artırıyor
  (checks-effects-interactions), böylece aynı imza ikinci kez kullanılamıyor.
- **Digest formülü ("dondurulmuş", değişmez):**
  ```
  domainSeparator = keccak256(abi.encode(keccak256("PQSAFE_V1"), block.chainid, address(this)))
  digest = keccak256(abi.encode(domainSeparator, nonce, to, value, keccak256(data)))
  ```
  `block.chainid` ve `address(this)` içermesi cross-chain / cross-contract
  replay saldırılarını kapatıyor.
- **Migration tasarımı:** Para taşımıyor, sadece sahiplik kanıtı
  kaydediyor — kasıtlı olarak minimal tutuldu (para taşıma mantığı ayrı,
  cüzdana `execute()` ile yapılıyor). İmza `personal_sign` (EIP-191)
  standardıyla atılıyor ki kullanıcı MetaMask gibi herhangi bir standart
  cüzdanla imzalayabilsin — özel bir imzalama aracı gerekmiyor.
- **`IPQVerifier` arayüzü şemadan bağımsız:** Bu tasarım kararı sayesinde
  Akif'in imza şemasını (SLH-DSA-SHA2-128-24 → C13) değiştirdiği gün
  Hakan'ın `PQWallet.sol`/`Migration.sol` kodunda HİÇBİR değişiklik
  gerekmedi (bkz. DECISIONS.md 19 Ağustos "C13 şema değişikliği
  onaylandı") — arayüz ayrımının somut faydası.
- **Gnosis Safe benzeri genel-amaçlı call:** `execute()` herhangi bir
  hedefe call atabiliyor, hedef kısıtlaması kasıtlı olarak yok (bkz.
  Bölüm 3'teki precompile bulgusu).

## 3. Testlerle bulunan / doğrulanan uç durumlar (jüri sorularına hazır cevaplar)

Bunlar "olabilir mi" sorularına önceden test yazıp cevap verdiğimiz
noktalar — savunmada doğrudan kullanılabilir:

| Soru (jüri sorabilir) | Cevap | Kanıt |
|---|---|---|
| "Migration'da biri kendi adresini kendine migrate ederse ne olur?" | İzin veriliyor, kasıtlı olarak düzeltilmedi — saldırgan yolu yok (kurbanın kendi imzası gerekir) ama zararsız da değil: kendine migrate eden adres AlreadyMigrated kontrolü yüzünden bir daha asla gerçek bir PQ cüzdanına geçemez. Redeploy bedeli finale göre gereksiz görüldü, kasıtlı olarak belgelendi. | `test_ProveOwnership_SucceedsWhenOldAndNewAddressAreSame`, DECISIONS.md 7 Eylül |
| "ECDSA imza malleability sınırı (`s` değeri) doğru mu uygulanmış?" | Sınırın hem üstü (reddediliyor) hem tam sınıra eşiti (kabul ediliyor) ayrı ayrı test edildi | `test_RevertsOnHighSValue`, `test_ProveOwnership_SucceedsWhenSValueExactlyAtHalfBoundary` |
| "Hedef kontrat çağrıyı reddederse (revert) ne olur, cüzdan tutarsız bir duruma düşer mi?" | Hayır — EVM'in atomik semantiği sayesinde `nonce++` dahil TÜM state geri alınıyor, imza "yanmış" olmuyor | `test_Execute_RevertsWhenTargetCallFails` |
| "Cüzdan kendi kendine çağrı yapabilir mi?" | Evet, sorunsuz (value=0/data=boş → `receive()`'e düşüyor) | `test_Execute_SucceedsWhenTargetIsSelf` |
| "Fuzz testte precompile adreslerine (0x01-0x09) gönderim neden hariç tutuldu, bu bir güvenlik açığını mı gizliyor?" | Hayır — precompile'lar rastgele calldata'yı kendi içinde reddedip zararsızca revert ediyor, bu genel-amaçlı cüzdanlarda (Gnosis Safe tarzı) standart/kasıtlı davranış | DECISIONS.md 2026-08-24 "Fuzz testte precompile adresleri hariç tutuldu" |
| "Nonce replay koruması gerçekten çalışıyor mu, kanıtı var mı?" | Evet — bir imza kullanıldıktan sonra digest değiştiği (nonce arttığı) için eski imza artık hiçbir digest'e karşılık gelmiyor | `test_DigestChangesAfterExecute_OldSignatureNoLongerMatches` |

## 4. Gerçek Sepolia kanıtları (simülasyon değil, gerçek para/gerçek imza)

- **Deploy (1 Eylül 2026):** 4/4 kontrat (`SPHINCSVerifier`, `Migration`,
  `PQWallet`, referans `SphincsC13Asm`) Sepolia'ya deploy edildi ve
  Etherscan'de kaynak kodu doğrulandı ("Verified"). Toplam deploy maliyeti:
  0.001389743953379859 ETH (1.256.479 gas). Adresler ve tx hash'leri:
  `docs/evidence/tx-hashes.md`.
- **Gerçek migration (7 Eylül 2026):** Akif'in ECDSA private key'iyle
  imzaladığı gerçek bir `personal_sign` imzasıyla `Migration.proveOwnership()`
  Sepolia'da çağrıldı — tx `0x1ccc11f1...c75a609`, gas: 73.753, başarılı.
- **Gerçek PQ transfer (7 Eylül 2026):** Akif'in gerçek C13/SPHINCS-
  private key'iyle imzaladığı (WASM signer, gerçek keygen) bir imzayla,
  deploy edilmiş `PQWallet`'tan 0.001 ETH gerçek transferi yapıldı — tx
  `0xd62b812e...631ad9`, gas: 233.429, başarılı. Bu, projenin "uçtan uca
  gerçek kuantum-dirençli imza zincirde doğrulanıyor" iddiasının somut
  kanıtı — simülasyon veya local testnet değil, gerçek Sepolia testnet'i.
- Bu iki işlemin digest/domain-separator hesaplamaları Akif tarafından
  bağımsız olarak (Hakan'ın kontrat çağrısına güvenmeden, ayrı bir JS
  implementasyonuyla) yeniden türetilip doğrulandı — bkz.
  `docs/evidence/crypto-tests/sprint3-live-signature-verification.md`.

## 5. Gas tablosu (test-suite ölçümü, `docs/evidence/gas-reports/sprint2.txt`, 26/26 test geçti)

| Fonksiyon | Min | Ort. | Max | Not |
|---|---|---|---|---|
| `PQWallet.execute` | 31.751 | 85.793 | 88.247 | Cüzdanın ana işlem fonksiyonu |
| `Migration.proveOwnership` | 25.174 | 49.585 | 73.791 | Sahiplik kanıtı |
| `SPHINCSVerifier.verify` | 589 | 1.672 | 111.074 | Sarmalayıcımız — çıplak referansın (106.672) ~%4 üzerinde (bkz. ARCHITECTURE.md §1) |

Deployment maliyetleri: PQWallet 461.947, SPHINCSVerifier 460.466,
Migration 289.095 gas (sadece kontrat kodu, `SphincsC13Asm` referans
kontratı `SPHINCSVerifier`'ın constructor'ı içinde otomatik deploy
edildiği için ayrı maliyeti yok).

Gerçek Sepolia deploy'unda ölçülen toplam: **1.256.479 gas**
(0.001389743953379859 ETH, ort. 1,106 gwei — bir testnet ölçümü,
mainnet gas fiyatları farklı olur).

## 6. Test kapsamı özeti

35/35 test geçiyor (proje geneli, 7 Eylül itibarıyla):
- `PQWalletTest`: nonce artışı, digest hesaplama (JS vektörleriyle çapraz
  doğrulanmış — bkz. Bölüm 7), execute başarı/başarısızlık, + 2 yeni uç
  durum testi (hedef revert, self-transfer)
- `MigrationTest`: sahiplik kanıtı başarı/başarısızlık (yanlış imzalayan,
  tekrar deneme, kurcalanmış mesaj, geçersiz v/s değerleri), + 2 yeni uç
  durum testi (self-migration, s-sınırı)
- `SPHINCSVerifierTest` + entegrasyon testleri (Akif'in tarafı, bkz.
  ARCHITECTURE.md): gerçek WASM imzasıyla uçtan uca `PQWallet.execute()`
  → gerçek `SPHINCSVerifier.sol` zinciri

## 7. Dikkat çekici mühendislik kararları (jüriye "biz bunu düşündük" göstergesi)

- **Digest'in Solidity ↔ JS eşleşmesi bağımsız test edildi** — sadece
  kontratın kendi `_computeDigest()`'ine güvenmek yerine, ayrı bir JS
  implementasyonuyla üretilen digest'in Solidity tarafıyla birebir
  eşleştiği kanıtlandı (`test_DigestMatchesJsVector_*`) — bu, "imzalayan
  ile doğrulayan aynı şeyi mi hesaplıyor" sorusuna somut kanıt.
- **`IPQVerifier`'ın "asla revert etmez" sözleşmesi** — referans C13
  kontratı malformed girdilerde revert atıyor olsa da, `SPHINCSVerifier.sol`
  bunu `try/catch` ile yutup `false` döndürüyor; bu sayede `PQWallet.sol`
  basit bir `require(verifier.verify(...), "...")` yazabiliyor, revert
  yönetimi karmaşıklığı tek bir yerde toplanıyor (bkz. ARCHITECTURE.md §1).
- **Anahtar rotasyonu canlıda test edildi:** Sprint 3'te Akif'in public
  key'i iki kez rotasyona uğradı (mnemonic sızıntısı riski nedeniyle) —
  proje bunu `.env` üzerinden yeniden deploy ile sorunsuz absorbe etti,
  gösteriyor ki anahtar rotasyonu operasyonel olarak yönetilebilir bir
  süreç (bkz. `docs/session-handoff-2026-09-01.md`).
