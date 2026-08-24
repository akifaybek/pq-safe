# PQ-SAFE — Görev Sınırları ve Arayüz Sözleşmesi (FINAL)

**Amaç:** Akif ve Hakan'ın hiçbir noktada birbirinin işini tahmin etmek zorunda kalmaması. Her sınır, tek bir dosyada ve tek bir fonksiyon imzasında netleşir.

**Bu dosya bağlayıcıdır.** Buradaki bir kuralı değiştirmek gerekirse, önce ikiniz konuşup `docs/DECISIONS.md`'ye yazacaksınız — tek taraflı değişiklik yok.

Bu dosya, haftalık görev takibi ve dosya sahipliği için **tek kaynaktır**.
`docs/ROADMAP.md` sadece kısa bir genel bakıştır, ayrıntı için buraya bakılır.

---

# 0. Mevcut durum (17 Ağustos 2026 itibarıyla — bu bölüm güncel tutulur)

Bu dosya yazıldığında repoda zaten şunlar vardı, aşağıdaki bölümlerle çelişmiyor,
tamamlıyor:

- `CLAUDE.md`, `docs/DECISIONS.md` (5 kayıt), `docs/INTERFACE.md`, `docs/ROADMAP.md`
- `contracts/src/interfaces/IPQVerifier.sol` — aşağıdaki Bölüm 3 ile birebir aynı
- `contracts/foundry.toml` — **Akif tarafından kuruldu**, `solc 0.8.20` sabit
  (`docs/DECISIONS.md`'de dondurulmuş karar). Bu dosyanın sahipliği aşağıda
  Bölüm 2'de düzeltildi: 🔴 HAKAN değil, 🟢 ORTAK.
- `contracts/lib/forge-std` — submodule, `v1.16.2`
- `contracts/lib/sphincs-minus` — Consigny'nin referans SPHINCS- implementasyonu,
  submodule, commit `eef1f889a46c77d45dca013d321e9648fd3eaa7e`'a sabit. Akif'in
  `SPHINCSVerifier.sol`'ü yazarken referans aldığı kaynak; Hakan'ın buna doğrudan
  ihtiyacı yok.

Yani Hakan'ın Sprint 0'da **Foundry'yi sıfırdan kurmasına gerek yok** — proje zaten
kurulu. Hakan'ın yapması gereken: kendi makinesinde `git clone --recursive` ile
repoyu alıp `forge build`'in çalıştığını doğrulamak (bkz. Bölüm 9, Sprint 0).

---

# 1. ROL TANIMLARI (tek cümlelik)

> **Akif:** "İmzanın doğru olup olmadığını" belirleyen her şeyi yazar — hem JavaScript tarafında imzayı üreten kod, hem Solidity tarafında o imzayı doğrulayan kod, hem de ikisinin ortak dili olan mesaj formatı.

> **Hakan:** "İmza doğruysa ne olacağını" belirleyen her şeyi yazar — cüzdanın durumu, para transferi, migration mantığı, erişim kontrolü, testler, deploy ve gas ölçümü.

**Neden bu sınır:** İmza yolu (JS imzalama ↔ Solidity doğrulama) tek bir tutarlı kriptografi problemidir. İki kişiye bölünürse, "benim imzam neden reddediliyor" hatası ortaya çıkar ve sebebi günlerce bulunamaz. Tek kişide olursa bu hata sınıfı tamamen ortadan kalkar.

---

# 2. DOSYA SAHİPLİĞİ (dosya seviyesinde, tartışmasız)

```
pq-safe/
├── CLAUDE.md                          🟢 ORTAK — değişiklik için karşılıklı onay
├── README.md                          🔴 HAKAN
├── .gitignore                         🟢 ORTAK
│
├── contracts/
│   ├── foundry.toml                   🟢 ORTAK — solc/optimizer DECISIONS.md'de
│   │                                      dondurulmuş, Hakan kendi ihtiyacı olan
│   │                                      satırları (RPC vb.) ekleyebilir ama
│   │                                      solc/optimizer'ı tek taraflı değiştirmez
│   ├── foundry.lock                   🟢 ORTAK — forge install otomatik üretir
│   ├── src/
│   │   ├── PQWallet.sol               🔴 HAKAN
│   │   ├── Migration.sol              🔴 HAKAN
│   │   ├── interfaces/
│   │   │   └── IPQVerifier.sol        🟢 ORTAK — bkz. Bölüm 3 (dondurulmuş)
│   │   └── verifier/                  🔵 AKİF — Hakan bu klasöre ASLA yazmaz
│   │       ├── SPHINCSVerifier.sol
│   │       └── (yardımcı dosyalar)
│   ├── lib/                           🟢 ORTAK (submodule'ler — forge-std,
│   │                                      sphincs-minus). Elle düzenlenmez.
│   ├── test/
│   │   ├── PQWallet.t.sol             🔴 HAKAN
│   │   ├── Migration.t.sol            🔴 HAKAN
│   │   └── SPHINCSVerifier.t.sol      🔵 AKİF
│   └── script/                        🔴 HAKAN
│
├── frontend/                          🔵 AKİF — Hakan bu klasöre ASLA yazmaz
│   ├── src/crypto/                    🔵 AKİF (imzalama, anahtar yönetimi)
│   ├── src/components/                🔵 AKİF
│   └── src/contracts/                 🔵 AKİF (ABI kopyaları burada durur)
│
└── docs/
    ├── evidence/                      🟢 ORTAK — SADECE EKLEME (kimse başkasının dosyasını silmez/düzenlemez)
    │   ├── gas-reports/               🔴 HAKAN ekler
    │   ├── screenshots/               🔵 AKİF ekler
    │   ├── tx-hashes.md               🔴 HAKAN ekler (append-only)
    │   └── crypto-tests/              🔵 AKİF ekler
    ├── ARCHITECTURE.md                🔵 AKİF (Sprint 0 çıktısı — yazıldı)
    ├── ROADMAP.md                     🟢 ORTAK (kısa genel bakış, ayrıntı burada)
    ├── DECISIONS.md                   🟢 ORTAK (append-only, her kayıt imzalı: "— Akif" / "— Hakan")
    └── INTERFACE.md                   🟢 ORTAK — Bölüm 3-4'ün kopyası, referans
```

**Mutlak kural:** Kendi renginin dışındaki bir dosyayı açıp değiştirmek yasak. İhtiyaç varsa sahibinden iste — kendin düzeltme.

**Append-only dosyalarda çakışma nasıl önlenir:** `tx-hashes.md`, `DECISIONS.md` gibi ortak dosyalara **sadece dosyanın sonuna** ekleme yapılır, mevcut satırlara dokunulmaz. Git bunu sorunsuz birleştirir.

---

# 3. ARAYÜZ SÖZLEŞMESİ (en kritik bölüm — DONDURULMUŞ)

Akif'in ve Hakan'ın kodları **sadece ve sadece** şu tek fonksiyon üzerinden konuşur:

```solidity
// contracts/src/interfaces/IPQVerifier.sol
// Bu dosya zaten yazıldı ve commit edildi. BİR DAHA DEĞİŞTİRİLMEZ.
// Değişmesi gerekirse ikiniz birlikte karar verir ve DECISIONS.md'ye yazarsınız.

interface IPQVerifier {
    /// @notice Bir SPHINCS- imzasının geçerli olup olmadığını doğrular.
    /// @param digest İmzalanan 32 byte'lık mesaj özeti (bkz. Bölüm 4)
    /// @param signature SPHINCS- imzası (ham bytes)
    /// @param publicKey SPHINCS- açık anahtarı (ham bytes)
    /// @return valid İmza geçerliyse true, değilse false. ASLA revert etmez.
    function verify(
        bytes32 digest,
        bytes calldata signature,
        bytes calldata publicKey
    ) external view returns (bool valid);
}
```

## Sözleşmenin garantileri

**Akif'in garanti ettikleri (verifier tarafı):**
- `verify()` fonksiyonu **asla revert etmez**. Geçersiz imza, bozuk veri, yanlış uzunluk — hepsinde `false` döner. (Hakan'ın revert yakalamakla uğraşmasına gerek kalmaz.)
- `view` fonksiyondur, hiçbir state değiştirmez.
- Girdi doğrulaması (uzunluk kontrolleri vb.) verifier'ın kendi içindedir.

**Hakan'ın garanti ettikleri (cüzdan tarafı):**
- `digest`i Bölüm 4'teki formata **birebir** uyarak üretir.
- `verify()` `false` dönerse işlemi revert eder, `true` dönerse devam eder.
- Verifier'ın iç işleyişine dair hiçbir varsayımda bulunmaz — sadece bool sonucunu kullanır.

**Hakan bu fonksiyonu şöyle kullanır (örnek):**
```solidity
require(
    verifier.verify(digest, signature, publicKey),
    "PQWallet: invalid signature"
);
```

Bu kadar. Hakan SPHINCS-'in nasıl çalıştığını bilmek zorunda değil. Akif de cüzdanın para transferini nasıl yaptığını bilmek zorunda değil.

---

# 4. MESAJ ÖZETİ (DIGEST) FORMATI — DONDURULMUŞ

Bu, ikinizin ortak dilidir. Frontend'in imzaladığı şey ile kontratın doğruladığı şey **byte byte aynı** olmak zorunda.

## Formül

```
digest = keccak256(
    abi.encode(
        DOMAIN_SEPARATOR,   // bytes32 — aşağıda tanımlı
        nonce,              // uint256 — cüzdanın mevcut nonce'u
        to,                 // address — alıcı adres
        value,              // uint256 — gönderilecek wei miktarı
        keccak256(data)     // bytes32 — çağrı verisi hash'i (boş ise keccak256(""))
    )
)
```

```
DOMAIN_SEPARATOR = keccak256(
    abi.encode(
        keccak256("PQSAFE_V1"),   // sürüm etiketi
        block.chainid,            // Sepolia = 11155111
        address(this)             // PQWallet kontratının kendi adresi
    )
)
```

## Neden bu alanlar var

| Alan | Neyi önler |
|---|---|
| `DOMAIN_SEPARATOR` içindeki sürüm | Gelecekteki format değişikliklerinde eski imzaların geçerli sayılmasını |
| `block.chainid` | Sepolia'da atılan imzanın mainnet'te tekrar kullanılmasını (cross-chain replay) |
| `address(this)` | Bir kullanıcının A cüzdanı için attığı imzanın B cüzdanında kullanılmasını |
| `nonce` | Aynı işlemin ikinci kez oynatılmasını (replay) |
| `to`, `value`, `data` | İşlem içeriğinin değiştirilmesini |

## Uygulama sorumluluğu

- **Hakan:** `PQWallet.sol` içinde bu digest'i üreten `_computeDigest()` fonksiyonunu yazar.
- **Akif:** `frontend/src/crypto/` içinde aynı digest'i üreten JS fonksiyonunu yazar (ethers.js `AbiCoder` + `keccak256`).
- **Doğrulama testi (Sprint 2'de zorunlu):** Aynı girdilerle iki taraf da aynı 32 byte'ı üretmeli. Hakan bir Foundry testinde digest'i yazdırır, Akif JS'te aynı girdilerle çalıştırır, **birebir karşılaştırılır**. Eşleşene kadar Sprint 2 bitmiş sayılmaz.

---

# 5. ÖNEMLİ TEKNİK DÜZELTME — LEAF SAYACI YOK

- **XMSS (Nebula'nın kullandığı):** *Stateful*. Her imza bir leaf tüketir, aynı leaf iki kez kullanılırsa güvenlik çöker. Sayaç tutmak **zorunludur**.
- **SPHINCS- / SLH-DSA (bizim kullandığımız):** *Stateless*. Kullanılacak leaf, mesajın kendisinden türetilir. Kontratın sayaç tutmasına **gerek yoktur**.

**Sonuç:**
- `PQWallet.sol` **nonce** tutar (replay koruması için — bu standart ve gerekli).
- `PQWallet.sol` **leaf sayacı TUTMAZ**. Böyle bir alan eklemeyin.
- İmza bütçesi (2^14–2^20) sert bir sınır değil, **istatistiksel bir güvenlik parametresidir** — çok fazla imza atıldıkça güvenlik seviyesi kademeli düşer.
- Frontend'de bir "kaç imza atıldı" sayacı **sadece kullanıcıyı bilgilendirmek için** tutulabilir (Akif'in tercihi, güvenlik açısından zorunlu değil).

Bu düzeltme rapora da yansıtılacak — jüri "stateless mi stateful mı" diye sorabilir, doğru cevap: **stateless**.

---

# 6. TAHMİN YASAĞI — belirsizlikte ne yapılır

**Kural: Emin değilsen kod yazma, sor.**

| Durum | Yapılacak |
|---|---|
| Karşı tarafın fonksiyonunun ne döndürdüğünden emin değilsin | `INTERFACE.md`'ye bak. Yoksa **sor**. Tahmini bir imza yazıp "sonra düzeltiriz" deme. |
| Digest formatında bir alan eklemek/çıkarmak gerekiyor | Tek taraflı yapma. İkiniz konuşun, `DECISIONS.md`'ye yazın, ikiniz de kodunuzu güncelleyin. |
| Karşı tarafın klasöründe bir bug gördün | Düzeltme. Sahibine söyle. |
| Claude sana karşı tarafın dosyasını değiştirmeyi öneriyor | **Reddet.** `CLAUDE.md`'de bu kural var, hatırlat. |
| Bir kütüphane/yaklaşım işe yaramıyor | Sprint bitmeden haber ver — B planı için vakit kalsın. Son güne saklama. |

**Geçici çözüm (stub) kuralı:** Karşı tarafın işi bitmeden ilerlemen gerekiyorsa, sahte/basit bir versiyon (stub) yazabilirsin — ama:
1. Sadece **kendi klasöründe** olur.
2. Dosyanın başına `// STUB — Sprint X'te gerçeğiyle değiştirilecek` yazılır.
3. `DECISIONS.md`'ye "şu an şurada stub var" diye not düşülür.

Örnek: Hakan, Akif'in verifier'ı hazır olmadan `PQWallet`'ı test etmek isterse, `verify()` her zaman `true` dönen bir `MockVerifier.sol` yazar — kendi `test/` klasöründe, `Mock` ön ekiyle.

---

# 7. "BİTTİ" TANIMI (Definition of Done)

Bir görev şu üçü tamam olmadan bitmiş sayılmaz:

1. **Çalışıyor** — Solidity için geçen Foundry testi, frontend için çalıştırılabilir doğrulama.
2. **Kanıtı var** — çıktı `docs/evidence/` altına kaydedildi.
3. **Commit'lendi ve push'landı** — `git status` temiz.

| Görev tipi | Kabul edilen kanıt |
|---|---|
| Solidity fonksiyonu | `forge test` çıktısı (geçen test), dosyaya kaydedilmiş |
| Gas ölçümü | `forge test --gas-report` çıktısı |
| Sepolia deploy | Etherscan linki + tx hash (`tx-hashes.md`) |
| JS kripto fonksiyonu | Çalışan script + konsol çıktısı |
| Frontend ekranı | Ekran görüntüsü veya kısa video |
| Digest uyum testi | İki taraftan da aynı 32 byte'ın çıktığını gösteren yan yana çıktı |

---

# 8. GİT PROTOKOLÜ

**Her seans başında:** `git pull`

**Her mantıksal iş bitiminde:**
```bash
git add <sadece kendi klasörün>
git commit -m "<tip>(<alan>): <ne yapıldı>"
git push
```

- Tipler: `feat`, `fix`, `test`, `docs`, `chore`
- Alanlar: `contracts`, `verifier`, `frontend`, `docs`
- Örnek: `feat(verifier): SPHINCS- verify fonksiyonu + KAT testi`

**Kurallar:**
- Günde en az 1 push. Biriktirme yok.
- 3 dosyadan fazlasını commit'siz biriktirme.
- `git push --force` **yasak**.
- Commit mesajında "wip", "asdf", "deneme" gibi şeyler yok — bu repo jüriye gösterilecek.
- Commit'i Claude/asistan otomatik atmaz — commit mesajı önerilir, gerçek `git commit` komutunu siz kendiniz çalıştırırsınız (GitHub'da commit'in size ait görünmesi için).

---

# 9. SPRINT BAZLI GÖREV LİSTESİ (kim, ne, hangi kanıt)

## Sprint 0 (17–23 Ağustos) — Kurulum ve risk ölçümü

**Akif**
| Görev | Kanıt | Durum |
|---|---|---|
| Repo + klasör iskeleti + `CLAUDE.md` + `.gitignore` | İlk commit | ✅ Bitti |
| Foundry kurulumu, `IPQVerifier.sol`, `sphincs-minus` submodule | Commit'ler | ✅ Bitti |
| `forge test --gas-report` ile referans verifier gas rakamının doğrulanması | `evidence/gas-reports/` | ✅ Bitti — şema C13'e değişti (bkz. DECISIONS.md), C13 106,672 gas ölçüldü |
| ~~`@noble/post-quantum` ile keygen/sign/verify çalıştır~~ | — | ❌ İptal — C13'ü desteklemiyor, bkz. `DECISIONS.md` (19 Ağustos, JS kütüphanesi düzeltmesi) |
| ~~**Seed testi:** kütüphane dışarıdan seed alıyor mu?~~ | `evidence/crypto-tests/sprint0-noble-post-quantum-risk-test.md` (128f ile, referans amaçlı kaldı) | ❌ İptal — hedef `signer-wasm`'a taşındı, BIP-39/44 türetme zaten deterministik |
| `signer-wasm` (Rust/WASM C13 signer) ile keygen/sign/verify çalıştır | `evidence/crypto-tests/sprint1-wasm-signer-test.md` | ✅ Bitti (Sprint 1'de) |
| **Performans testi:** node.js'te keygen + imzalama süresi (WASM) | `evidence/crypto-tests/sprint1-wasm-signer-test.md` | ✅ Bitti (Sprint 1'de, Node.js ortamında — tarayıcı ölçümü ayrı bir görev) |
| `nconsigny/SPHINCS-` verifier kodunu incele | Anlaşılanların özeti → `ARCHITECTURE.md` taslağı | ✅ Bitti (23 Ağustos) |

**Hakan**
| Görev | Kanıt | Durum |
|---|---|---|
| Repoyu `git clone --recursive` ile al, Foundry'yi kur (Homebrew) | — | ✅ Bitti |
| `forge build` kendi makinende çalışıyor mu doğrula | Terminal çıktısı | ✅ Bitti (bkz. DECISIONS.md, "19 Ağustos 2026 — forge build doğrulaması") |
| `MockVerifier.sol` yaz (her zaman true döner) | Geçen test | ✅ Bitti (bkz. DECISIONS.md, "17 Ağustos 2026 — MockVerifier stub eklendi") |
| ERC-4337 / akıllı kontrat cüzdan desenlerini incele | Notlar → `DECISIONS.md` | ✅ Bitti (bkz. DECISIONS.md, "19 Ağustos 2026 — ERC-4337 incelemesi") |

**Sprint 0 çıktısı:** İki taraf da kendi ortamında bir şey çalıştırabiliyor. Riskler ölçülmüş.

---

## Sprint 1 (24–30 Ağustos) — Migration'ı kur

**Arayüz zaten donduruldu** (Bölüm 3-4, `IPQVerifier.sol` ve `INTERFACE.md` commit'li).

**Akif**
| Görev | Kanıt | Durum |
|---|---|---|
| `SPHINCSVerifier.sol` iskeleti — `IPQVerifier` implementasyonu | Derleniyor | ✅ Bitti (erken başlandı, 19 Ağustos) |
| SPHINCS- doğrulama mantığını entegre et | KAT (bilinen test vektörü) ile geçen test | ✅ Bitti — 8/8 test geçti, fuzz dahil |
| JS tarafında imzalama + anahtar üretimi/yedekleme | Çalışan script + ekran görüntüsü | ✅ Bitti (23 Ağustos) — `docs/evidence/crypto-tests/sprint1-frontend-keygen-sign-ui.md` |

**Hakan**
| Görev | Kanıt |
|---|---|
| `Migration.sol`: `proveOwnership()` — ECDSA `ecrecover` | Geçen test |
| Migration sonrası eski adresi kalıcı işaretleme | Geçen test |
| Aynı adresle ikinci deneme → revert | Geçen test |
| Yanlış imza → revert | Geçen test |

---

## Sprint 2 (31 Ağustos – 6 Eylül) — Cüzdan + digest uyumu

> 🔑 **Bu sprintin en kritik işi digest uyum testi. Bu geçmeden sprint bitmez.**

**Akif**
| Görev | Kanıt | Durum |
|---|---|---|
| Verifier'ı tamamla, gerçek imzayı doğruluyor | Geçen test (gerçek imza) | ✅ Bitti (Sprint 1'de zaten yapıldı — `SPHINCSVerifier.t.sol`'de `test_ValidSignatureVerifies`) |
| JS digest fonksiyonu (Bölüm 4 formatı) | Konsol çıktısı | ✅ Bitti (23 Ağustos) — `docs/evidence/crypto-tests/sprint2-js-digest-function.md`, bağımsız olarak Foundry `cast` ile doğrulandı |
| **Digest uyum testi** (Hakan'la birlikte) | İki taraftan aynı 32 byte — yan yana çıktı | ⬜ Hakan'ın `PQWallet.sol._computeDigest()`'i bekliyor |

**Hakan**
| Görev | Kanıt |
|---|---|
| `PQWallet.sol`: state, nonce, `_computeDigest()` | Geçen test |
| `PQWallet.sol`: `execute()` — verifier çağrısı + transfer | Geçen test |
| Nonce replay koruması | Geçen test |
| `MockVerifier`'ı gerçek verifier ile değiştir | Geçen entegrasyon testi |
| Gas raporu | `evidence/gas-reports/sprint2.txt` |

---

## Sprint 3 (7–13 Eylül) — Sepolia ve gerçek ölçüm

**Hakan**
| Görev | Kanıt |
|---|---|
| Deploy scriptleri | Commit |
| `Migration.sol` + `PQWallet.sol` + verifier Sepolia'ya deploy | Adresler → `tx-hashes.md` |
| Etherscan verify (kod görünür olsun) | Etherscan linkleri |
| Canlı ağda gerçek migration + gerçek transfer | Tx hash'ler + gerçek gas maliyeti |

**Akif**
| Görev | Kanıt |
|---|---|
| Frontend'i Sepolia'ya bağla | Ekran görüntüsü |
| ABI'ları `frontend/src/contracts/` altına kopyala | Commit |
| Uçtan uca akış çalışıyor | Ekran kaydı |

---

## Sprint 4 (14–20 Eylül) — Demo + rapor

**Akif:** demo cilası, demo videosu, rapor bölümleri
**Hakan:** README (mimari, kurulum, adresler, gas tablosu), uç durum testleri, rapor için ham teknik içerik

---

## Sprint 5 (21–27 Eylül) — Sunum ve prova

**İkisi birlikte:** soru-cevap listesi (Hakan teknik, Akif konumlandırma), sunum güncelleme, en az 3 tam prova, farklı makinede demo testi, yedek video.

---

## Buffer (28–29 Eylül)

Prova ve son kontrol için ayrılmış boş gün. Önceki sprint'ler gecikirse buraya taşar.

---

## Final (30 Eylül – 4 Ekim)

TEKNOFEST sunumu/yarışma. Kod dondurulmuş, sadece kritik bug fix yapılır.

---

# 10. HATA MODLARI VE HANGİ KURALIN ÖNLEDİĞİ

| Olası hata | Önleyen kural |
|---|---|
| "İmzam neden hep reddediliyor?" | Bölüm 4 digest formatı + Sprint 2 uyum testi |
| Merge conflict | Bölüm 2 dosya sahipliği |
| "Ben senin fonksiyonun şöyle döner sanmıştım" | Bölüm 3 dondurulmuş arayüz |
| Verifier revert edince cüzdan testleri patlıyor | Akif'in "asla revert etmez" garantisi |
| Karşı taraf yetişmediği için ilerleyemiyorum | Bölüm 6 stub kuralı (`MockVerifier`) |
| Son hafta "bu çalışmıyormuş" sürprizi | Bölüm 7 "bitti" tanımı + haftalık kanıt zorunluluğu |
| Kod var ama jüriye gösterecek kanıt yok | `docs/evidence/` zorunluluğu |
| Kimin ne yaptığı belli değil | Commit disiplini + `DECISIONS.md` imzalı kayıtlar |

---

# 11. HAFTALIK SENKRON (her Pazar akşamı, 30 dk)

1. Bu haftanın görevleri bitti mi? **Kanıtları yerinde mi?**
2. `git status` ikisinde de temiz mi?
3. Arayüz sözleşmesinde (Bölüm 3-4) değişiklik gerekti mi? Gerektiyse ikisi de güncelledi mi?
4. Stub kalan yer var mı? Ne zaman gerçeğiyle değişecek?
5. Gelecek haftanın görevleri net mi?
6. B planına geçmemiz gereken bir risk belirdi mi?
7. Rapor/sunum için bu haftadan çıkan yeni malzeme var mı?
