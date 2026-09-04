# Oturum devir notu — 5 Eylül 2026 (Akif tarafı)

Bir sonraki Claude Code oturumu buradan devam etsin. Önceki not
(`session-handoff-2026-09-01.md`) hâlâ geçerli ama **bu belge onu günceller**.

> **Değişmeyen kritik bilgi:** owner public key hâlâ 2. rotasyon anahtarı
> (`0x5c0adf08…`). 26 Ağustos ve 28 Ağustos notlarındaki `0x49ba289e…`
> **geçersizdir**. Ayrıntı: `sprint3-owner-key-rotation.md`.

## Bu oturumda ne oldu

### 1. Hakan deploy'u tamamladı, doğru anahtarla

4/4 kontrat Sepolia'da, Etherscan'de doğrulanmış (`docs/tx-hashes.md`, Hakan):

| Kontrat | Adres |
|---|---|
| `SPHINCSVerifier` | `0x143Db127BE77FdE689629b18F9F415014C514a2E` |
| `Migration` | `0x93e2938A04AE4FbC59a5FDe59D7683667eDD5536` |
| `PQWallet` | `0x2EafA294C14b6752128bfd4f5873D1EA39f000BB` |

Zincirden okunarak doğrulandı: `PQWallet.ownerPublicKey()` = 2. rotasyon
anahtarı, `verifier()` = deploy edilen `SPHINCSVerifier`. **Yeniden deploy
gerekmiyor.**

### 2. İki imza üretildi ve canlı kontratlara karşı doğrulandı

Hakan gerçek migration + transfer demosu için iki imza istedi ve **hash'leri
kendisi hesaplayıp** gönderdi. İkisi de bağımsız olarak yeniden hesaplandı
(körlemesine imzalanmadı), sonra canlı kontratlara karşı sınandı:

- `Migration.proveOwnership()` simülasyonu → **revert etmedi**
- `SPHINCSVerifier.verify()` → **`true`**

Kanıt: `docs/evidence/crypto-tests/sprint3-live-signature-verification.md`.

**Hakan bu tx'leri HENÜZ ATMADI** — `PQWallet` nonce'u hâlâ `0`, bakiye hâlâ
0.002 ETH. Ondan beklenen: `to` adresi teyidi + tx'leri atıp hash'leri
`tx-hashes.md`'ye eklemesi.

### 3. Zincir üzerinde işlem akışı: spec + plan yazıldı, 8 görevin 2'si bitti

- Spec: `docs/superpowers/specs/2026-09-04-onchain-transaction-flow-design.md`
- Plan: `docs/superpowers/plans/2026-09-04-onchain-transaction-flow.md`

**Task 1 ✅** — `src/config/contracts.js`, `assertSepoliaNetwork()`,
`src/contracts/pqwallet.js` (`readNonce`/`readBalance`/`readDigest`). İnceleme
temiz. Commit `b8dcbf2`.

**Task 2 ✅** — `encodeExecute()`, `tamperSignature()`,
`buildNegativeProofCalldata()`. İnceleme Important 1 buldu, düzeltildi.
**Commit edilmedi, çalışma ağacında.**

**Task 3, 3B, 4, 5, 6, 7 duruyor.** Brief'ler hazır:
`.superpowers/sdd/task-3-only-brief.md`, `task-3b-brief.md`.

## Bilinmesi gereken kararlar

- **`buildNegativeProofCalldata(signed)` neden var.** Negatif kanıt mantığı
  `main.js` handler'ında kalsaydı, oradaki bir
  `signed.signature = tamperSignature(...)` ataması saklanan gerçek imzayı
  bozardı ve sonraki "Gönder" bozuk imzayı zincire yollardı — hiçbir otomatik
  test bunu yakalayamazdı. Fonksiyona çekilince `signed` bir **nesne** olarak
  geçiyor (mutable), böylece "state değişmedi" assertion'ı gerçekten bir şey
  ispatlıyor. **Bu mantığı handler'a geri taşımayın.**
- **Koruma sırası bir teşhis sırasıdır**, performans için yeniden sıralanmaz:
  nonce kontrolü → canlı digest karşılaştırması → `eth_call` ön-uçuşu. Nonce
  önce elendiği için, digest uyuşmazlığının tek açıklaması `fields` sapması
  kalır. Gerekçe spec'te yazılı.
- **Gas fallback 2.000.000.** `execute()`'un izole gerçek maliyeti hâlâ
  ölçülmedi (ölçümler 106.672 ile 1.130.002 arasında tutarsız). İlk gerçek tx
  atıldığında ölçülen değer spec'e ve kanıt notuna yazılacak.
- **`tx-hashes.md`'ye Hakan ekler** (`GOREV_SINIRLARI.md:83`, append-only).
  Transfer hash'i ona gönderilecek, biz dosyaya dokunmayacağız.

## ⛔ Task 3B'ye başlamadan önce oku

Task 3B gerçek owner mnemonic'ini tarayıcıya sokuyor ve aynı akışta ekran
kaydı alınacak. **Bedel artık rotasyon değil:** `PQWallet.ownerPublicKey`
yalnızca constructor'da yazılıyor (`contracts/src/PQWallet.sol:23`), setter
yok. Üçüncü sızıntının çaresi `PQWallet`'ı yeniden deploy etmek — yeni adres,
Hakan'ın yeniden deploy + verify'ı, `tx-hashes.md`'nin baştan yazılması,
canlı doğrulama kanıtının geçersizleşmesi.

İçe aktarılan mnemonic hiçbir koşulda: DOM'a yazılmaz, `type="password"`
alandan gelir ve alan temizlenir, hata mesajına ham girdi olarak sarılmaz
(bu kod tabanının "hatayı değeriyle söyle" deseni burada tersine çalışır),
`console`'a düşmez. Ekran kaydından önce dört kontrol: sayfa, DOM, console,
Network.

## Sırada ne var

**Yarının ilk işleri:**

1. **Task 2'yi commit et** (komut aşağıda) — çalışma ağacında duruyor
2. **Task 3** implementer'ı (`task-3-only-brief.md`) → sonra **Task 3B**
3. **MetaMask'e Sepolia ETH** — hâlâ çözülmedi, **Task 7 buna bağlı**.
   Alchemy faucet'i mainnet bakiyesi + işlem geçmişi istiyor, yeni açılan
   hesabı reddeder. İki yol: (a) mainnet geçmişi olan asıl hesapla faucet'ten
   al, Sepolia ETH'i demo hesabına aktar; (b) Hakan'dan iste — cüzdanında
   0.0966 ETH var, bir tx ~0.00022 ETH.
4. **Hakan'ın cevabı** — `to` teyidi + tx'leri atması

**Not:** Task 3 ve 3B'nin doğrulama adımları **tarayıcıda elle** yapılıyor
(Vite açıp tıklamak). Alt-ajan bunu yapamaz — o adımlar Akif'e kalıyor.

## Bu oturumda öğrenilen dersler

Önceki notlardaki dersler geçerli. Bu oturumdan dördü:

- **Karşı taraftan gelen hata raporu doğrulanmadan kabul edilmez.** Hakan
  "public key kesilmiş" dedi, makul görünüyordu; kabul edilseydi anahtar
  gereksiz "düzeltilecek" ve deploy kırılacaktı. Kaynak koda inmek 15 dakika
  sürdü. (1 Eylül dersinin tekrarı — işe yaradı.)
- **Başkasının hesapladığı hash körlemesine imzalanmaz.** Hakan'ın iki hash'i
  de doğruydu, ama doğrulamak ucuzdu ve ikincisi bir para transferi yetkisiydi.
  Digest'i `PQWallet._computeDigest()`'e sormak yeterli değil — o Hakan'ın
  kendi kodu; bağımsızlık için kendi JS uygulamamızla yeniden hesaplandı.
- **Yeni yazılmış bir assertion'ın boş olmadığının tek kanıtı, onu bir kez
  başarısız görmektir.** Bu oturumda bir saflık assertion'ı tamamen boştu (JS
  string'leri immutable olduğu için hep geçiyordu) ve incelemeden döndü.
- **Assertion iki şey iddia ediyorsa iki kasten bozma gerekir.** Anlık
  görüntüyü `fields`'ı da kapsayacak şekilde genişletmek için yazılan
  BigInt-güvenli `snap()` replacer'ının kendisi test edilmemiş koddu —
  bozuk olsaydı (BigInt'e `undefined` dönseydi) `fields` farkları çıktıdan
  düşer ve assertion sessizce yine boşalırdı. İkinci bozma (`fields.value + 1n`)
  bunu da sınadı.

## Çalışma kuralları (değişmedi)

- **Claude `git commit`/`git push` çalıştırmıyor.** Alt-ajanlara da yasaklandı,
  uydular.
- Akış: brainstorming → spec → plan → subagent-driven-development →
  görev incelemeleri → final whole-branch review.
- İlerleme defteri: `.superpowers/sdd/progress.md` (git-ignored). Compaction
  sonrası buna ve `git log`'a güvenin, hafızaya değil.
