# NOT: bu dosya git'te İZLENİYOR (.gitignore daraltıldı, 16 Eylül).
# Buraya mnemonic, private key, anahtarlı RPC URL'si veya .env
# içeriği YAZILMAZ. Anahtar dosyalarına yalnızca ADIYLA atıf yapılır.
# Commit öncesi tarama zorunlu: BIP-39 ardışık kelime (satır sınırı
# yok sayılarak), 64 hane hex, sağlayıcı anahtarı deseni.
# Gerekçe ve ilk taramanın sonucu: bkz. bu commit'in mesajı.

Task 1: complete (commits f1cb5c1..4ef85a2, review clean)
Task 2: complete (commits 4ef85a2..13ec307, review clean)
Task 3: complete (commits 47a842a..68a885a, review clean)
Final whole-branch review (db215f7..87f6d15): Critical 0, Important 4, Minor 8.
  Important 1 (getProvider doğrulanmamış provider dağıtıyor) → düzeltildi
  Important 2 (yanlış-ağ dalı hiç çalıştırılmamış) → doğrulandı, kanıt alındı
  Important 3 (kanıt notu yok) → sprint3-sepolia-readonly-connection.md yazıldı
  Important 4 (devir notu kodla çelişiyor) → güncelleme bloğu eklendi
  Minor 1 (BigInt) → won't-fix, yanlış-ağ testiyle ampirik olarak kapandı
  Minor 2,3,5,6,7 → uygulandı  |  Minor 4,8 → sonraki artıma not edildi

--- Plan: 2026-08-28-transaction-builder (BASE 2e9808a) ---
Task 1: complete (working tree, review Approved 2. turda — commit kullanıcıda)
  Round 1: Important x2 (requireUint'te boş/eksik sessizce 0, uint256 üst sınırı yok) — ikisi de plan kaynaklı
  Round 2: ikisi de kapandı, canlı fonksiyona karşı doğrulandı, yeni açık yok. 20/20 assertion.
  Devreden Minor: (a) requireHexData Uint8Array'i reddediyor, digest.js kabul ediyor
                  (b) requireUint 0x'li hex kabul ediyor, yorumsuz
                  (c) Test 3/4 kendine referanslı (t1'e karşı), bağımsız oracle değil
                  → final whole-branch review'da triyaj edilecek
Task 2: complete (working tree, review Approved — commit kullanıcıda)
  Critical 0, Important 0, Minor 3:
    (d) main.js imza render bloğu btn-sign listener'ıyla yinelenmiş (kozmetik)
    (e) buildAndSign'ın mnemonic guard'ı UI'dan erişilemez (kasıtlı savunma, kusur değil)
    (f) ~7 sn imzalama penceresinde btn-keygen currentMnemonic'i ezebilir (mevcut global desen, regresyon değil)
  → (d) ve (f) final whole-branch review'da triyaj edilecek

--- Plan: 2026-09-04-onchain-transaction-flow (BASE 7105945) ---
Task 1: complete (working tree, review Spec ✅ / kalite Onaylandı — commit kullanıcıda)
  Critical 0, Important 0, Minor 1:
    (a) pqwallet.js: enjekte provider ile her okuma ayrı assertSepoliaNetwork
        (ekstra getNetwork RPC round-trip'i); getSepoliaProvider'daki gibi cache yok.
        Brief bilerek böyle istedi (güvenlik > performans). → final review'da triyaj
  ⚠️ "canlı test geçti mi" maddesi controller tarafından kapatıldı: test elle
     çalıştırıldı, 3/3 geçti (nonce=0, balance=2000000000000000, digest 0x38ebc057…)
Task 2: complete (working tree, review Important x1 → düzeltildi — commit kullanıcıda)
  Round 1: Important 1 — tamperSignature saflık assertion'ı BOŞ: signature bir JS
    string, string'ler immutable, yani fonksiyon kasten kirli yazılsa bile geçerdi.
    Plan kaynaklı bulgu → kullanıcıya soruldu, güçlendirme onaylandı.
  Düzeltme: negatif kanıt mantığı buildNegativeProofCalldata(signed)'a çekildi.
    `signed` NESNE olduğu için "state değişmedi" assertion'ının dişi var.
    Anlık görüntü TÜM nesneyi kapsıyor (signature + fields), BigInt-güvenli
    replacer ile — fields bozulması digest'i zehirler ve imza kontrolünden kaçar.
  İKİ kasten bozmayla assertion'ın boş olmadığı kanıtlandı:
    Bozma A (ajan): signed.signature = tamperSignature(...) → kırmızı, doğru assertion
    Bozma B (controller): signed.fields.value += 1n → kırmızı, aynı assertion.
      B ayrıca BigInt replacer'ın kendisini sınadı (undefined'a düşmüyor).
      Dosya md5 ile birebir geri alındı, KASTEN kalıntısı 0.
  Final: 9/9 assertion yeşil (cast oracle dahil). Sızıntı taraması temiz.
Task 3: complete (working tree — commit kullanıcıda)
  Brief birebir uygulandı (index.html 4. bölüm + main.js state/refresh/build-sign).
  BRIEF DIŞI 1 sertleştirme: imzalama penceresinde tx-to/value/data kilidi.
    Gerekçe: ~7.5 sn'lik imzalama sırasında `signed` null olduğu için
    invalidateSignature() no-op; imzalama bitince ESKİ alanlarla `signed`
    kurulur → ekranda yeni `to`, calldata'da eski `to`. Üç kalkan da kör.
  Doğrulama (Playwright + canlı Sepolia, elle değil otomatik):
    - açılışta zincir okuma: wallet 0x2EafA294…, nonce 0, bakiye 0.002 ETH
    - keygen + imzala → 3688 bayt, btnSend/btnNeg enabled, girdiler geri açıldı
    - digest 0xf19b46d2… == canlı PQWallet._computeDigest() ✓
      negatif kontrol x2 (yanlış cüzdan adresi, nonce+1) → ikisi de farklı digest,
      yani eşitlik assertion'ı BOŞ DEĞİL
    - `to` değişince: enabled → disabled geçişi gözlendi + uyarı metni
    - console: yalnızca favicon 404 (önceden de vardı)
  vite build: geçti. build-transaction-test.mjs: TÜM TESTLER GEÇTİ.
  Kanıt: docs/evidence/crypto-tests/sprint3-ui-chain-rewiring.md
  Açık: btn-connect-wallet dinleyicisiz (Task 4), btn-send/btn-negative-proof
        dinleyicisiz ama imzadan sonra enabled (Task 5/6).
Task 3B: complete (working tree — commit kullanıcıda)
  Brief + kullanıcının DÖRT eklemesi + ek assertion uygulandı.
  BULUNAN HATA (brief'te de yoktu): build-sign'ın finally'si
    `btnKeygen.disabled = false` yazıyordu → owner anahtarıyla BİR İMZA ATMAK
    keygen kilidini sessizce kaldırıyordu. Kilidin tek sahibi ownerKeyLoaded.
  Ekleme 1 (hata mesajı): İKİ yol vardı, bir değil — bölüm 2 "İmzala"
    (signDigest) ve bölüm 4 (buildAndSign). İkisi de sabit mesaja çevrildi,
    `e` hiç yakalanmıyor. Kalan 3 e.message grep'le denetlendi, mnemonic'e
    erişmiyor. main.js'teki ham ${currentMnemonic} esc()'lendi.
    DEVREDEN: bölüm 4 catch'i artık alan doğrulama mesajlarını da yutuyor →
    Task 5'te ön-uçuş revert metinleriyle birlikte geri getirilecek.
  Ekleme 2: readOwnerPublicKey() (fragment PQWallet.sol:11'den). Üç dal da
    sınandı: ✗ uyuşmama (gerçek zincir) / ⚠ okunamadı / ✓ aynı (RPC yamalı).
    Canlı: 0x5c0adf08… 64 bayt, 2. rotasyon anahtarı.
  Ekleme 3: btn-keygen import sonrası kalıcı kilit, kilit açma butonu yok.
  Ekleme 4: kanarya sızıntı testi (Playwright). GERÇEK mnemonic KULLANILMADI.
    PERİMETRENİN KENDİSİ İKİ KEZ BOŞTU, ikisi de düzeltildi:
      (a) ethers fetch'i Request nesnesiyle çağırıyor → init.body hep undefined
      (b) ethers body'yi Uint8Array veriyor → String(bytes) = "91,123,34,…",
          kanarya kelimesi gövdede ARANAMAZDI
    Pozitif kontrol eklendi: gövdede eth_call/eth_getBalance + cüzdan adresi
    görülüyor. ANCAK ONDAN SONRA kanarya girildi.
    Sonuç: DOM/console/ağ — tam ifade, 2-gram ve kelime eşleşmesi hepsi boş.
  Kilit assertion'ı KASTEN bozuldu (finally `= false`) → KIRMIZI; geri alındı
    → YEŞİL. md5 477b2a86d6fc4dace834176384f32d65, KASTEN kalıntısı 0.
  vite build geçti. pqwallet-test.mjs 9/9 (cast oracle dahil).
  Kanıt: docs/evidence/crypto-tests/sprint3-owner-mnemonic-import-leak-audit.md
  AKİF'E KALAN: gerçek owner mnemonic'ini elle gir, çıktıda "✓ Zincirdeki
    ownerPublicKey ile AYNI" görülmeli.
Task 3B düzeltmeleri (kullanıcı geri bildirimi, commit 0f9885b SONRASI):
  1. `if (chainNonce === null)` try'ın önüne alındı → kendi net mesajı geri geldi,
     hiçbir eşleme kurulmadan. Kilitler alınmadan önce olduğu için erken return
     güvenli (build-sign ve girdiler askıda kalmıyor — doğrulandı).
     Sınama: VITE_SEPOLIA_RPC_URL geçersiz adrese → chainNonce null kaldı →
     mesaj birebir çıktı. Gerçek RPC ile yanlış-pozitif yok.
     Alan doğrulama mesajları (to/value/data) Task 5'te kalıyor — onlar
     buildAndSign'ın içinden geliyor, taşınamaz.
  2. Parola yöneticisi kontrolü: index.html'de HİÇ <form> yok, submit yok,
     navigasyon yok → Chrome "parolayı kaydet?" balonu tetiklenmiyor.
  Kanıt notu güncellendi (bölüm 6 düzeltildi, yeni bölüm 7 eklendi).
Task 3B: KAPANDI ✅ (commit 0f9885b + düzeltme 684c59e)
  Akif gerçek owner mnemonic'ini tarayıcıda elle içe aktardı.
  Sonuç: türetilen publicKey == zincirdeki PQWallet.ownerPublicKey → ✓ AYNI.
  Yani imzalayan anahtar artık 2. rotasyon anahtarı (0x5c0adf08…) ve bu
  anahtarla üretilecek imzalar PQWallet tarafından kabul edilecek — Task 7'nin
  "PQWallet: invalid signature" ile ölme riski kapandı.
  btn-keygen içe aktarma sonrası kilitli; anahtarı değiştirmenin tek yolu
  sayfayı yenilemek.
Task 4: complete (commit'ler dad9471/e00fed9 — kanıt notu yazıldı)
  Progress defterine o oturumda işlenmemişti; 12 Eylül'de Task 5 sırasında
  kaynaklardan (plan + kanıt notu + git log) geriye dönük eklendi.
  İki sapma: (A) bağlantı sonrası chainChanged/accountsChanged dinleniyor,
  ikisi de connected'ı null yapıyor, ÜÇ AYRI metin. (B) #wallet-out ayrı div.
  Doğrulama: node testi 16/16; tarayıcı otomatik kısmı; MetaMask elle 5/5 (Akif).
  Bulgular: (1) MetaMask'te ağ SİTE-BAŞINA — prosedür tuzağı, kanıt notunda.
    (2) accountsChanged izinli hesapların TAM listesini gönderiyor → "liste
    değişti" ile "aktif hesap değişti" ayırt edildi (fix commit'i 4af874a öncesi).
  Kanıt: docs/evidence/crypto-tests/sprint3-metamask-connection.md
  Task 5'e devir: bağlantı düşünce btn-send kapatılmıyor → gönderim handler'ı
    connected'ı ayrıca kontrol etmeli. (Task 5'te SAPMA 4 ile kapatıldı.)
Task 5: complete (working tree — commit kullanıcıda)
  Brief + kullanıcının ALTI sapması + plan hatası düzeltmesi uygulandı.
  BULUNAN HATA (brief'in varsayımı yanlıştı): ethers 6.17'de tx.wait() revert
    eden tx için receipt DÖNDÜRMEZ — provider.js:1139 checkReceipt,
    status===0 görünce CALL_EXCEPTION fırlatıyor. Brief'in kodu uygulansaydı
    revert generic catch'e düşer ve TX HASH + ETHERSCAN LİNKİ EKRANDAN
    KAYBOLURDU. İki katman kondu: sendExecute CALL_EXCEPTION'dan receipt'i
    kurtarıyor, main.js receipt.status'u açıkça kontrol ediyor.
    Belirsiz yollar (TIMEOUT/TRANSACTION_REPLACED) yutulmuyor — hash
    iliştirilerek yeniden fırlatılıyor, akıbeti bilinmeyen tx kaybolmasın.
  SAPMA 1 (receipt.status): revert → 0 yeşil/1 kırmızı, hash+link+gas gösterilir,
    signed KORUNUR. Gerekçe kontrat kaynağından doğrulandı: nonce++ execute()'un
    İÇİNDE (PQWallet.sol:48), require(success) revert ederse geri alınır.
    İKİ YOL DA GERÇEK SEPOLIA RECEIPT'İYLE sınandı (hiçbir şey yayınlanmadı,
    mock var olan tx hash'ini döndürdü): 0x3eb20c48… status 1, 0xe6bc4e2c… status 0.
  SAPMA 2 (buton kilidi): syncSendButtons() tek kaynak. Koşulsuz disabled=false
    ve finally YOK. 6 state kombinasyonu tabloyla doğrulandı.
  SAPMA 3 (quiet refresh): #chain-warn eklendi. Gönderim sonrası RPC kesildi →
    send-out'taki tx kanıtı BOZULMADAN kaldı, uyarı chain-warn'a düştü.
    Assertion boş değil: kesme etkisizken chain-warn BOŞ çıkmıştı.
    Mevcut çağıranlar bozulmadı (refresh butonu hâlâ send-out'a yazıyor).
  SAPMA 4 (akış içi bağlantı kontrolü): conn snapshot + connected !== conn.
    Doğrulandı: eth_call yapıldı, eth_sendTransaction YAPILMADI.
  SAPMA 5 (Task 3B borcu KAPANDI): saf buildDigest ön-doğrulaması kilitlerden
    önce. Üç alan hatası da ham mesajıyla geri geldi. İmzalama katmanının
    SABİT mesajı duruyor, kapsamı daraldı.
  SAPMA 6 (üç kalkan ayrı ayrı kırmızı): hepsi kanıtlandı, her birinde cüzdan
    katmanına giden RPC çağrıları kaydedildi.
    Kalkan 1: 0 çağrı. Kalkan 2: 0 çağrı (kalkan 1 GEÇEREK — gölgede değil).
    Kalkan 3: yalnızca eth_call+eth_chainId, revert metni kontrattan.
  BRIEF SENARYOSUNDAN SAPMA: "value > bakiye → PQWallet: call failed" rastgele
    anahtarla ALINAMAZ — execute() önce imzayı doğruluyor (PQWallet.sol:44),
    bakiye ancak dış çağrıda patlıyor (:50). Her zaman "invalid signature"
    çıkar. "call failed" yolu geçerli owner imzası ister → Task 7.
  BRIEF DIŞI 1 sertleştirme: zincir okuması patlarsa chainNonce da null'a
    çekiliyor. Gerekçe: gösterge '—' iken modülde bayat nonce tutmak, bu kod
    tabanının kaçındığı sessiz sapma. Doğrulandı: bayat nonce'la imzalama
    denemesi "nonce henüz okunmadı" ile reddedildi.
  PLAN HATASI DÜZELTİLDİ: Step 4 commit mesajı "2M fallback" diyordu → 350.000.
  KASTEN bozma/kanca geri alma md5 ile sabitlendi:
    main.js 1324dc5dbb1e9f04b5e3b8d92d6aa5f5 (test kancası öncesi = sonrası)
    sendTransaction.js 08e688c1b0dd057d28bb92a546891096 (revert kurtarması
      kasten kapatıldı → 4 assertion KIRMIZI → geri alındı → YEŞİL)
    Kalıntı: 0. Sayfa yenilendi, window.__t5 === undefined.
  Testler: send-transaction 42 (19'u yeni), build-transaction 21,
    pqwallet 9 (cast oracle dahil), vite build geçti. Console: yalnızca
    favicon 404.
  Kanıt: docs/evidence/crypto-tests/sprint3-three-shields.md + 6 ekran görüntüsü
  ZİNCİRE TX ATILMADI. Owner mnemonic'i kullanılmadı (rastgele anahtar).
  Devreden: "call failed" yolu ve gerçek MetaMask uçtan uca → Task 7.
    btn-negative-proof hâlâ dinleyicisiz → Task 6.
Task 5 — açık maddeler (A1-A5, 13 Eylül):
  A1 BULGU (kendine referanslı test): revert testini sahte signer yürütüyordu,
    CALL_EXCEPTION'ı testin KENDİSİ kuruyordu → ethers'ın değil taklidin
    davranışı doğrulanmıştı. ethers e.receipt yerine e.info.receipt kullansa
    Task 7'de, sahnede öğrenirdik. (Aynı sınıf: Task 2 boş assertion, Minor (c).)
    DÜZELTME: "GERÇEK ETHERS — canlı Sepolia oracle" bölümü. Gerçek
    JsonRpcProvider + zincirde gerçekten revert etmiş tx + ethers'ın kendi
    wait()'i. Sabitlendi: code === CALL_EXCEPTION, receipt `e.receipt`te
    (e.info.receipt DEĞİL), status 0, gasUsed 63730. Sahte signer testleri
    silinmedi, "yalnızca dallanma mantığı" diye yeniden etiketlendi.
    Kırılganlık bilerek: hash budanırsa test KIRMIZI yanar, sessizce atlamaz.
  A2: kurtarma koşulu ZATEN dardı — sendTransaction.js:164
    `if (e?.code === 'CALL_EXCEPTION' && e.receipt)`. Sonradan eklenmedi:
    3795b70'teki hali birebir aynı, dosya A turunda hiç değişmedi (git diff boş).
    Sadece code'a bakılsaydı: receipt undefined → çağıranda receipt.status
    TypeError → generic catch → hash ekrandan kaybolur (SAPMA 1'in önlemek için
    var olduğu şey). Değişiklik gerekmedi, kanıt notuna kod bloğuyla yazıldı.
    e.txHash ölü kod DEĞİLMİŞ ama hiç çalıştırılmamıştı → çalıştırıldı
    (eth_sendTransaction hash döndürür, eth_getTransactionReceipt ağ hatası
    verir): hash + Etherscan linki ekranda, imza korunuyor.
    BU SIRADA BULUNAN HATA: başlık "Gönderilemedi:" diyordu ama tx
    GÖNDERİLMİŞTİ → kullanıcı tekrar gönderir, aynı nonce'a ikinci tx.
    Düzeltildi: hash varsa "Gönderim sonrası hata".
  A3: status !== 1 yolunda refreshChainState({quiet:true}) ZORUNLU + teşhis
    satırı EKLENİYOR (insertAdjacentHTML — tx kanıtı ezilmiyor).
    refreshChainState artık {nonce, balance} / null döndürüyor (ikinci RPC yok).
    Üç dal da çalıştırıldı: nonce AYNI / nonce DEĞİŞMİŞ / zincir OKUNAMADI.
    Başarılı yolda teşhis EKLENMİYOR (doğrulandı).
  A4: kanıt notuna iki açık sınır yazıldı — (1) status-0 dalı PQWallet'ın kendi
    revert'iyle değil ilgisiz bir Sepolia tx'iyle sınandı; nonce-artmaz iddiası
    KAYNAK okumasına dayanıyor ve Task 7 de bunu doğrulamayacak (Task 7 başarılı
    tx atıyor, kasten revert atmıyor) → Foundry'de sınanmak istenirse
    contracts/test/ (Hakan'ın alanı). (2) kalkan 3'ün "call failed" dalı hiç
    çalıştırılmadı ve bakiye göstergesinin varlık gerekçesi tam da o mesajdı.
  A5: plana Task 7 Step 0 eklendi (gerçek tx'ten ÖNCE, sıfır maliyet):
    owner anahtarı + value = bakiye + 1 wei → ön-uçuşta "PQWallet: call failed",
    MetaMask açılmaz, ekran görüntüsü alınır.
  Test sayısı 42 → 57. KASTEN bozma md5 08e688c1… kalıntı 0; test kancası
    çıkarıldıktan sonra main.js A2 düzeltmesi geri alınarak 962aab38… ile
    birebir eşleştirildi (kanca artığı yok).
  Yeni ekran görüntüleri: sprint3-sent-but-unconfirmed.png,
    sprint3-revert-diagnosis.png
Task 6: complete (working tree — commit kullanıcıda)
  Brief + kullanıcının ÜÇ sapması + iki notu uygulandı. ZİNCİRE TX ATILMADI,
  owner mnemonic'i kullanılmadı (rastgele anahtar, .env.pqwallet-owner-key
  açılmadı).
  SAPMA 1 (finally'de koşulsuz açma YOK): finally syncSendButtons() çağırıyor.
    KASTEN bozmayla kanıtlandı: brief'in `disabled = false` hali ile, eth_call
    sürerken girdi değişip imza düştüğünde buton AÇIK kalıyor (KIRMIZI);
    syncSendButtons ile kapalı (YEŞİL). btnKeygen/btnSend'den sonra üçüncü
    tekrar olmadı.
  SAPMA 2 (kontrat reddetti ≠ ağ patladı): classifyNegativeProofError() saf
    fonksiyonu, dört yol da tarayıcıda çalıştırıldı — YEŞİL (1 ok) / SARI
    (1 finding, 0 ok) / GRİ (1 neutral, 0 ok 0 err) / KIRMIZI (1 err).
    index.html'e .finding ve .neutral eklendi.
    ÖLÇÜLEN BULGU: `code === 'CALL_EXCEPTION'` tek başına YETMİYOR. MetaMask
      signer'ı üzerinden ethers AĞ hatalarını da CALL_EXCEPTION + "missing
      revert data" diye sarıyor (iki senaryo: sağlayıcı code:-32603 ve kodsuz
      TypeError — ikisi de aynı kod). Yalnızca koda bakan sınıflandırma her ağ
      hıçkırığını SARI "bulgu adayı" basardı. İkinci koşul (revert verisi/reason
      var mı) bu yüzden şart; ekran metni de bu bulguya göre düzeltildi.
    KIRMIZI yolun yanlış-alarm koruması: eth_call revert etmeden dönerse önce
      `connected !== conn` sorulur (yanlış ağda PQWallet yok → sessizce boş
      döner). AYNI RPC cevabıyla (0x) iki senaryo: bağlantı sabit → KIRMIZI,
      çağrı sırasında düştü → GRİ. Assertion boş değil.
  SAPMA 3: ölçüldü, raporlandı, AKİF REDDETTİ — signer'da kalındı.
    Ölçüm: preflight'ı runner-bağımsız yapmak +3/-1 satır; handler'da net
    ~+5/-24 (yanlış-ağ dalı komple düşer); mevcut testleri BOZMAZ (preflight'ın
    hiç testi yok). Yani teknik olarak ucuzdu.
    RAPORUMDA EKSİK OLAN VE KARARI TEK BAŞINA BELİRLEYEN MADDE (Akif ekledi):
      TEK YOL İLKESİ — negatif kanıtın ikna ediciliği, gerçek gönderimle AYNI
      yoldan geçmesinden geliyor. İkisi de MetaMask signer'ındaysa "bozuk imza
      reddedildi, doğru imza geçti" TEK bir yolun iki sonucudur. Negatif kanıt
      uygulamanın kendi RPC'sinden gitseydi jüriye meşru bir itiraz doğardı:
      "reddedilmeyi bir yolda gösterdin, göndermeyi başka yolda yapıyorsun."
      Bir demo adımı ve 24 satır bunun bedelini karşılamıyor.
    Sprint 4 "demo cilası" kalemine not düşüldü; Sprint 3'te dokunulmadı.
    Gerekçe main.js'te syncSendButtons'ın üstüne de yazıldı (bir sonraki okuyan
    "şu 24 satır fazla" diye aynı yola girmesin).
  NOT 1 (kullanıcı): btnNegativeProof kilidi `!signed` → `!(signed && connected)`,
    btnSend ile aynı. Kilit ile handler'ın koşulu artık aynı şeyi söylüyor.
    Doğrulandı: imza var + bağlantı yok → iki buton da kapalı.
  NOT 2 (kullanıcı): gönderim handler'ındaki btnNegativeProof.disabled = true
    (main.js:572) SİLİNMEDİ, gerekçesi yazıldı — o bir İŞ-SÜRERKEN kilidi,
    state kilidi değil (akış boyunca state geçerli kalıyor). SAPMA 2 kuralı
    koşulsuz AÇMAYI yasaklar, kapatmayı değil. Negatif kanıt handler'ına da
    aynı kilit + aynı yorum kondu.
  BULUNAN VE DÜZELTİLEN HATA (brief'te de yoktu): çağrı sürerken imza düşerse
    handler, invalidateSignature'ın uyarısını EZİP bayat YEŞİL sonucu basıyordu
    ("imza değişmedi, Zincire gönder kullanılabilir" — oysa imza YOK, buton
    kapalı). Kilit doğruydu, EKRAN yanlıştı; Task 3'ün "ekranda yeni değer,
    calldata'da eski fields" hatasının kardeşi. Düzeltme: sigSnapshot +
    showResult() — beş render noktası da oradan geçiyor.
  DİKKAT maddesi (sendOut paylaşımı) DOĞRULANDI: başarılı gönderimden sonra
    signed = null → syncSendButtons (main.js:643/:658) butonu kapatıyor,
    programatik click() dinleyiciye ulaşmıyor, tx hash'i ekranda kalıyor.
  KASTEN bozma/kanca md5 ile sabitlendi:
    main.js kancalıyken 1edf837a901c02c58845e2621071c296 (bozma öncesi = sonrası)
    kanca silindikten sonra d93d9fcb241601633c231aafd03b9b9a
    diff(kancalı, son) = SADECE kanca bloğu. __t6/KASTEN kalıntısı 0.
    Sayfa yenilendi: window.__t6 === undefined.
    İKİNCİ kanca turu (BULGU 2'nin düzeltmesi için, dropSignature):
      kancalıyken 7606c4ce8cbe0f3009a7dbff8bc2b6cc
      kanca silindikten sonra 2843d19f7f7fe63f2f0737b19728ee6d
      diff = SADECE kanca bloğu (13 satır). Kalıntı 0.
    NOT: kanca öncesi md5 (5c4c7212…) ile son md5 birebir DEĞİL — arada gerçek
    düzeltmeler var (showResult, gri metin, BULGU 2'nin iki katmanı). Hepsi bu
    doğrulama sırasında bulundu/uygulandı. Kancaların iz bırakmadığı her turda
    diff ile gösterildi.
  Testler: send-transaction 75 (18'i yeni, classifyNegativeProofError),
    build-transaction 21, pqwallet 9 (cast oracle dahil), vite build geçti.
    İki assertion özellikle "boş değil" kontrolü: ağ hatası metninde beklenen
    string geçse bile yeşil değil + brief'in tek yollu kontrolü aynı girdide
    YANILIYOR.
  Console: favicon 404 (eskiden de vardı) + bir kerelik 500 (regex render
    noktalarını toplarken reasonHtml'in kapanışını bozmuştu, düzeltildi).
  Kanıt: docs/evidence/crypto-tests/sprint3-negative-proof.md + 4 ekran görüntüsü
  BULGU 2 — gönderim handler'ında imza fotoğrafı YOKTU. ŞİMDİ DÜZELTİLDİ
    (Task 7'ye devretmeyi önerdim, Akif reddetti: bu, Task 7'nin gerçek tx'i
    atacağı ve EKRAN KAYDINA gireceği handler'ın ta kendisi; bilinen bir
    hatayla kayıt alınmaz).
    Hata: btnSend akışı başta signed'ı destructure ediyor ama sonra değişip
      değişmediğini hiç sormuyordu (connected !== conn'un imza karşılığı yok).
      Girdi kalkan 1'den önce değişirse signed.nonce null'da okunur →
      TypeError generic catch'e düşer; kalkan 2'den SONRA değişirse tx ESKİ
      fields ile ZİNCİRE GİDER — ekranda "imza geçersiz kılındı" yazarken.
    "İptal mi, devam mı" diye sorduğum ikilem YANLIŞ İKİLEMDİ; Akif üçüncü şıkkı
      gösterdi ve emsali bu kod tabanında zaten var:
      KATMAN 1 — ÖNLE (emsal: Task 3'ün imzalama penceresi kilidi). Girdiler
        gönderim penceresi boyunca kilitli → invalidateSignature o pencerede HİÇ
        çalışamıyor, ikilem ortadan kalkıyor. btnBuildSign de kilitlendi
        (girdiler kilitli olsa da yeniden imzalamak signed'ı değiştirirdi).
        Ölçüldü: akış ortasında inputsDisabled [true,true,true],
        btnBuildSignDisabled true; akıştan sonra hepsi açık (finally).
      KATMAN 2 — YİNE DE YAKALA (emsal: conn snapshot'ı). const sig = signed,
        tüm akış sig üzerinden (sig.nonce, sig.fields, revert teşhisi dahil),
        sendExecute'tan HEMEN ÖNCE if (signed !== sig) → İPTAL. Kontrol yayından
        önce durur çünkü yayınlandıktan sonra iptal diye bir şey yok.
        "Devam" asla bir seçenek değil.
    AYIRT EDİCİ ÖLÇÜM (assertion boş değil): ön-uçuş geçecek şekilde ayarlandı,
      iki senaryo aynı akışla koşuldu, tek fark imzanın düşürülmesi:
        A) imza duruyor  → gönderim katmanında eth_estimateGas + eth_sendTransaction
        B) imza düştü    → gönderim katmanına HİÇBİR çağrı yok, ekranda
           "gönderim iptal edildi, zincire hiçbir şey gitmedi"
      Ekran görüntüsü: sprint3-send-aborted-signature-changed.png
    KATMAN 1 KULLANICI SEVİYESİNDE ÖLÇÜLDÜ (Akif'in düzeltmesi): ilk turda
      dispatchEvent ile sınamıştım, o bir ölçüm değildi — kendi taklidim,
      disabled'ı umursamıyor. Playwright locator.fill() bağımsız oracle:
      tarayıcının kendi actionability kontrolünden geçiyor.
      Pozitif kontrol (kilit yokken): üç alanda da fill GEÇTİ.
      Gönderim penceresi açıkken (ön-uçuş 20 sn'ye yavaşlatıldı, üç deneme
        PARALEL, timeout 3 sn): üçü de "Timeout 3000ms exceeded" ile REDDEDİLDİ,
        değerler birebir aynı kaldı, denemeler biterken akış HÂLÂ sürüyordu
        ("Ön-uçuş yapılıyor…") — yani timeout'lar pencerenin kapanmasını değil
        kilidi ölçtü.
      BULGU (ilk denemede yaşandı, notta duruyor): Playwright'ın fill()'i
        REDDETMİYOR, BEKLİYOR. Denemeler SIRAYLA yapılınca (2,5sn × 3) ve pencere
        6 sn olunca üçüncü deneme kilit açıldıktan SONRA doldu ve "kilit aşıldı"
        gibi göründü. Pencere, denemelerin toplam süresinden uzun tutulmalı.
      HANGİ KATMAN HANGİ ORACLE: katman 1 → Playwright fill(); katman 2 →
        cüzdan katmanına giden RPC metod kaydı. Taklit (dispatchEvent /
        dropSignature) YALNIZCA katman 2'yi sınarken katman 1'i devre dışı
        bırakmak için kullanıldı, katman 1'in kendi kanıtında değil.
  DEVREDEN → Task 7:
    (1) Ön-uçuşun GEÇTİĞİ hali GERÇEK imzayla görülmedi — owner anahtarı
        gerekiyor. Bu görevde kanıt calldata'nın bayt karşılaştırmasına
        dayandırıldı (neg vs gönderim calldata: aynı uzunluk, TAM 1 bayt fark →
        saklanan imza bozulmadı). Yukarıdaki A senaryosunda ön-uçuş DÜZENEKLE
        geçirildi, gerçek imzayla değil.
    (2) SAPMA 3 Sprint 4 "demo cilası" notu — yeniden tartışılırsa tek yol
        ilkesiyle birlikte tartışılmalı.
Task 7: complete (working tree — commit kullanıcıda)
  GERÇEK TX ATILDI — Sprint 3'te ilk ve tek. Owner mnemonic'ini Akif tarayıcıya
  ELLE girdi; .env.pqwallet-owner-key hiçbir komuta verilmedi, ajan açmadı.
  Rol dağılımı: tarayıcıyı/MetaMask'i Akif sürdü, ajan hazırlık + adım verme +
  zincirden bağımsız doğrulama + kanıt yazımı yaptı.
  TX: 0x320e03d98cec857bbae8ecb49bcb0736c960287d76a19f2fad39b471b09e50da
    status 1 · blok 11696552 · gasUsed 216221 · limit 262924 · 2.6046 gwei
    execute(): to=0xe0BF2D19…7351 (kendine iade), value=100000000000000, data=0x
    imza 3688 bayt, üretim 6626.5 ms
  BAĞIMSIZ DOĞRULAMA (cast, UI'a hiç güvenilmeden):
    nonce 1→2 ✓ · PQWallet bakiye 0.001→0.0009 ETH ✓ · MetaMask nonce 0→1 ✓
    MetaMask bakiye: 0.05 − 0.000563178044687209 + 0.0001 = 0.049536821955312791 ✓ birebir
    DOMAIN_SEPARATOR dondurulmuş formülden yeniden hesaplandı → birebir
    digest nonce=1 ile yeniden hesaplandı (kontrata soramayız, zincirde artık 2)
    imza TX CALLDATA'SINDAN çıkarıldı → zincirdeki SPHINCSVerifier.verify() → TRUE
    Yani formül→digest→imza→verifier zinciri frontend'e hiç güvenilmeden doğrulandı.
  GAS SAPMASI ÇÖZÜLDÜ (beklenen ~233.429, ölçülen 216.221, fark 17.208):
    Sebep nonce++'ın SSTORE fiyatı. Hakan'ın tx'i nonce 0→1 (SSTORE_SET 20.000
    + soğuk slot 2.100 = 22.100); bizimki 1→2 (SSTORE_RESET 2.900 + 2.100 =
    5.000). 22.100−5.000 = 17.100 = ölçülen EVM farkının birebiri (kalan 108,
    calldata'da 9 sıfır bayt farkı). 233.429 TEK SEFERLİKTİ; 216.221 kalıcı
    rejim, planlamada kullanılacak sayı bu.
    GAS DEFTERİ İLK YAZIMDA HATALIYDI — Akif yakaladı, düzeltildi:
      "farkın tamamı SSTORE" diyordum ama yanında +5.197 verify varyansı ve
      −2.500 sıcak alıcı da sayıyordum → kendi içinde −5.305 açıklanamayan.
      Akif iki tx'in calldata baytlarını saydırdı; iki terim de ÇÜRÜDÜ:
      (a) verify() İMZAYA GÖRE DEĞİŞMİYOR. Hakan'ın gerçek imzası kendi tx
          calldata'sından çıkarıldı, digest'i nonce=0 ile yeniden hesaplandı,
          AYNI yöntemle ölçüldü → ikisi de TAM 113.771. estimateGas farkı 96,
          tamamen verify calldata'sındaki 8 sıfır bayttan (8×12). Önceki
          +5.197 ölçüm artefaktıydı: 108.574 Foundry trace'inden ve BAŞKA bir
          fixture imzasından geliyor, karşılaştırma tabanı değil.
          SABİT OLMASI BEKLENEN: C13 = WOTS+C/FORS+C, C sayacı checksum'ı
          sabitliyor → zincir adımları deterministik. "WOTS+ varyansı beklenir"
          cümlem şemanın kendi tasarımıyla çelişiyordu.
      (b) SICAK ALICI TERİMİ SIFIR. Hakan'ın tx'i de kendine gönderilmiş
          (from == execute()'un iç to'su == 0x7268a7c3…). İkisi de sıcaktı.
    DEFTER KALANSIZ KAPANDI (hepsi ölçüldü, hiçbiri spec'ten alınmadı):
      gözlenen −17.208 = calldata −108 + SSTORE −17.100 + verify 0 + sıcak 0
      calldata: iki tx de 3908 bayt; Hakan 201 sıfır/3707 sıfır-dışı → 81.116,
        bizim 210/3698 → 81.008. Spec'teki 81.116 böylece zincirden doğrulandı.
      İmzaya bağlı TEK kalem calldata ve etkisi ±240 gas civarı — Akif'in
        "birkaç bin gas salınır" hipotezi de tutmadı, execute() sabit maliyetli.
    Yan kazanım: Hakan'ın digest'i 0x38ebc057… çıktı = Task 1'de canlı
      readDigest() ile okunan değer. Bağımsız çapraz kontrol.
  STEP 0 (A5'te eklenen adım) KAPANDI: value = bakiye+1 wei = 1000000000000001
    → "PQWallet: call failed", MetaMask AÇILMADI, gaz yok. Proje tarihinde ilk
    kez görüldü. digest cast ile birebir doğrulandı (0x05d7f0b4…c551).
    Spec'teki bakiye göstergesinin varlık gerekçesi kanıtlandı: mesaj generic,
    yetersiz bakiye ile hedef çağrının revert'ini ayıran tek şey gösterge.
    Ekran görüntüsü: sprint3-shield3-call-failed.png
    Sınırı notta yazılı: 3688 baytlık imza bloğu yüzünden bakiye satırı aynı
    karede değil; cast ile ve bağlantı karesiyle doğrulandı.
  NEGATİF KANIT gerçek tx'ten HEMEN ÖNCE koştu: yeşil "✓ Kontrat bozuk imzayı
    reddetti" + "PQWallet: invalid signature" (ikisi de Akif tarafından ekrandan
    teyit edildi), gaz yok. Ardından AYNI imzayla
    gönderim başarılı → saklanan imzanın bozulmadığının canlı kanıtı.
  ÖN-BİLGİ RAPORU (f) LİSTESİNİN SONUCU — 9 yoldan 7'si koştu, 2'si KOŞMADI:
    KOŞTU: ön-uçuşun geçmesi · gerçek estimateGas+%20 pay · gerçek
      eth_sendTransaction+MetaMask onayı · receipt.status===1 KENDİ tx'imizle ·
      başarı sonrası signed=null + quiet refresh · "call failed" dalı ·
      bakiye göstergesinin işlevi
    HÂLÂ SINANMADI (açıkça yazıldı): GAS_FALLBACK=350.000 dalı (tahmin başarılı
      oldu, 219.104 → limit 262.924, ekranda "tahmin başarısız" notu ÇIKMADI) ·
      ACTION_REJECTED dalı (MetaMask'te iptal hiç denenmedi)
    receipt.status===0 dalı: Task 5'te İLGİSİZ bir tx'in receipt'iyle sınanmıştı,
      Task 7 de kapatmadı (kasten revert atmak gaz yakardı). "revert ederse nonce
      artmaz" iddiası HÂLÂ kaynak okumasına dayanıyor (PQWallet.sol:48).
      Foundry'de sınanacaksa contracts/test/ — Hakan'ın alanı.
  PLAN İKİ YERDE BAYATTI, DÜZELTİLDİ:
    Step 3 "tutarsız tahmin tablosu" diyordu — o tablo 8 Eylül'de zaten gerçek
      sayıyla değiştirilmişti; Task 7 düzeltme değil İKİNCİ ölçüm ekliyor.
    Step 4 "nonce 0→1" diyordu — 0→1'i Hakan yaptı, bizimki 1→2. Kozmetik değil,
      gas analizinin merkezi.
  AĞ SORUSU (Akif sordu): kayıtta MetaMask "SepoliaETH" değil düz "ETH" gösterdi.
    Sorun değil, notta üç kanıtla yazıldı — en sağlamı: digest chainId'e bağlı,
    yanlış ağda bu tx zaten geçemezdi.
  EKRAN KAYDI: sprint3-end-to-end-recording.mp4, 93.087.866 bayt,
    SHA-256 f7be0790747634e8e2fc38ac68d28843462b932d2136d84d1722089cc22abe1b
    REPO DIŞINDA tutuluyor (93 MB git'i kalıcı şişirirdi); kimliği notta.
    Mnemonic taraması kayıt ÖNCESİ yapıldı: sayfa bir kez yüklendi, btn-keygen'e
    HİÇ basılmadı (mnemonic'in DOM'a yazıldığı tek yol o), import alanı boş,
    Cmd+F ile kelime araması 0 sonuç, DevTools kapalı.
    NOT: ilk denemede sayfa kazara yenilendi → owner anahtarı düştü, mnemonic
    ikinci kez elle girildi. Zincirde hiçbir etki olmadı (cast ile doğrulandı).
  BİTİŞ KONTROLÜ: pqwallet-test 9/9 (cast oracle) · forge test 35/35 (plan 31
    diyordu, Hakan 4 test eklemiş, regresyon yok) · send-transaction 75 ·
    build-transaction 21 · vite build geçti.
  GOREV_SINIRLARI.md Sprint 3 Akif satırları kanıtla kapatıldı (3/3).
  AKİF'E KALAN: tx hash'i Hakan'a ilet (tx-hashes.md 🔴 HAKAN, dokunulmadı).

--- Plan: 2026-09-14-sprint4-demo-measurement-report (BASE a5ae60c) ---
DURUM: plan YAZILDI, uygulama BAŞLAMADI. Sıfır satır kod değişti
  (git diff HEAD -- frontend/ contracts/ boş).
Belgeler: docs/superpowers/specs/2026-09-14-sprint4-scope-design.md (583 satır,
  commit'ler b62430b → 649e900 → ee31f3e)
  docs/superpowers/plans/2026-09-14-sprint4-demo-measurement-report.md
  (999 satır, 12 görev, commit'ler c4c01cd → f508296)
Sıra anahtarı: SENARYO A (teslim tarihi teyit edilmedi). Senaryo B SİLİNMEDİ.
  Görev içerikleri senaryodan bağımsız; senaryoya bağlı TEK bayrak K2 faz 2'nin
  kayıt=evet/hayır satırı. Bu yapı planı tarihten kurtardı.

KAPSAM REVİZYONU (altı itiraz turu sonucunda):
  K1 "demo cilası" → "Ekran tutarlılığı". ÖLÇÜLDÜ: main.js'te innerHTML='' sadece
    3 kez, üçü de chainWarn (147/601/824). invalidateSignature (:124-129) ve
    gönderim başarı yolu txOut'a HİÇ dokunmuyor; txOut imza bloğunu tutuyor
    (:351,:376). Aynı karede "imza hazır" + "gönderildi" görünüyor, kayda giriyor.
    → Task 1 (~4 satır) + Task 2 (mnemonic DOM'dan kalkıyor). Kod yüzeyi ~10 satır.
  render.js tesisatı + 56 yazma noktası + envanter → Task 3-4 "ERTELENDİ → Sprint 5",
    dört gerekçesiyle planda duruyor (silinmedi): bölgeler birleşemez (chainWarn
    ayrılığı SAPMA 3, :752 insertAdjacentHTML A3'ün ezmeme kuralı) → ekranda hiçbir
    şey değişmiyor; tek kazanç gelecekteki test edilebilirlik, 16 gün kaldı;
    envanter kendi kendini gerekçelendiriyordu; diff kapısı yeniden çekim istetirdi.

COWORK İTİRAZLARI A1/A2/A3 — ÜÇÜ DE CEVAPLANDI, f508296'da plana işlendi:
  A1 (estimateGas'ta from) — ÖNCÜL ÇÜRÜDÜ, KURAL KALDI. ethers okundu:
    abstract-signer.js:187-188 estimateGas → populateCall → populate; :36-38
    from boşsa signer.getAddress() ile DOLDURUYOR. Sıfır-adres senaryosu bu yolda
    oluşmuyor, Δ₁'in tabanı sağlam. AMA getAddress() MetaMask'in AKTİF hesabını
    döndürüyor → ölçümler arası hesap değişimi A'yı soğutur, B−A≈0 çıkar, ön koşul
    çürür. Kural "bitti" ölçütü olarak plana kondu (Task 5, "from SABİT KALMALI").
  A2 (K1 gerekçesi) — (ii)'ye somut cevap BULUNDU (yukarıdaki txOut ölçümü).
  A3 (getWriteLog kapsamı) — kural Task 3-4 erteleme maddesine şimdiden yazıldı:
    envanter %100 log'dan, metin doğruluğu DOM'dan ÖRNEKLEM, iki ayrı satır;
    her render noktası DOĞAL/KANCA etiketli.

GAS TABLOSU KURALLARI (dondurulmuş):
  Sıra B → A → C, MANŞET B. A = to==from, test düzeneği; en elverişli koşulu norm
    gibi sunmak defterdeki hatanın aynısı. 4. satır 233.429 "İLK tx, nonce 0→1".
  Her satır etiketi ALICI EOA + data=0x — bu etiket "gerçek tüketim ≤ tahmin"
    cümlesinin de GEÇERLİLİK koşulu (alıcı kontrat olsaydı 63/64 ile limite bağlanırdı).
  Karşılaştırma YÜRÜTME sütunundan: intrinsic=21000+4×sıfır+16×sıfır-dışı çıkarılır
    (ham fark ±240 gas calldata bulaşması taşıyor, 366'lık model riskiyle aynı mertebe).
  BEKLENEN DEĞERLER ÖLÇÜMDEN ÖNCE YAZILI: B−A=+2.500, C−A=+27.500. Tutmazsa
    hipotez çürümüştür ve öyle yazılır.
  Δ₁=2.883 (%1,3334). Aday mekanizma (HİPOTEZ): ikili aramanın erken durması,
    geth toleransı ~%1,5. SEBEBİ ARAMAK KAPSAM DIŞI — kalibre ediliyor, açıklanmıyor.
  KARAR AĞACI kovalardan ÖNCE: tekrarlar birebir aynı değilse ofset modeli YOK,
    B ve C "≤ üst sınır", kovalara BAKILMAZ.

ÖLÇÜM OTURUMU — İKİ FAZ, TEK YÖNLÜ KAPI:
  Faz 1 (kayıtsız): mnemonic (KAĞITTAN) → ✓ AYNI · A,B,C imzası (üçü nonce 2) ·
    üçü İÇ İÇE tekrar testi n≥5 · B,C estimateGas · C boşluğu cast ile
    (balance=0, nonce=0, code=0x) · ikinci RPC endpoint'inde tekrar.
  Faz 2 (kayıtlı): sayfa yenile → mnemonic KAYIT BAŞLAMADAN → tarama → kayıt →
    imzala → negatif kanıt → gerçek A tx (nonce 2→3). Δ₂ = limit/1,2 − gasUsed.
  A'nın imzası faz 1'de DE üretiliyor: "iç içe" kuralı üçünün aynı fazda olmasını
    zorunlu kılıyor. A'nın tekrarı ZORUNLU çünkü Δ₁ bir A ölçümü.
  TEK YÖNLÜ KAPI: faz 1 → faz 2. Gerçek tx nonce'u 3 yapınca nonce 2'ye atılmış
    ÜÇ İMZA DA ÖLÜR. Ve faz 1 ile faz 2 arasında HİÇBİR tx gönderilmez.
  Kullanılmayan imzayı atmak bedava: C13 stateless, leaf tüketimi yok.

VİDEO — DİFF KAPISI (karar değil, kontrol):
  Kayıt K2 faz 2'de. Sonra K3 dalları. Kapı: kayıt anındaki md5 == sonraki md5 →
  FİNAL, değilse YENİDEN ÇEKİM. Kapsam index.html + CSS + main.js +
  sendTransaction.js (+ dondurulmuş ikisi). index.html ŞART — kamera DOM'u görüyor.
  Bitti ölçütü: TEK ÇEKİM, KESME YOK, SHA-256, taze çekimde cast doğrulaması
  (ölçüt senaryodan bağımsız). Sprint 3 kaydı YEDEK, silinmez.

BEKLEYEN İNSAN İŞLERİ (Task 5'i bloke ediyor):
  İK-1 mnemonic yedeği: alındı 14 Eylül, DOĞRULANMADI. Kağıttan içe aktarılıp
    ✓ AYNI görülmeli (dosyadan kopyalanarak DEĞİL). K2 faz 1 adım 1'de bedava.
  İK-2 temiz klon: YAPILMADI, BLOKÖR. Ayrıca bulundu: sphincs-minus üçüncü taraf
    deponun YAN DALINDAKİ commit'e pinli (eef1f889…, split-jardin-out-200-geef1f88).
    Dal silinir/force-push yerse temiz klon kırılır ve bizim makinede GÖRÜNMEZ.
    Test ağdan TAZE çekerek yapılmalı.

RAPOR BULGULARI:
  Kanıt envanteri 16 not, 10'u Sprint 3 (13 Eylül notu 7 diyordu — eksik sayım).
  İKİ GAS TABLOSU ÇELİŞİYOR: Hakan'ın ham içeriği Böl.5 execute max 88.247 (Foundry)
    vs bizim 216.221 (canlı) = 2,5 kat. Köprü Hakan'ın 4. maddesi cevaplanmadan
    YAZILMAYACAK (tahminle köprü = defterdeki hata sınıfının tekrarı).

CEVAPSIZ: uygulama biçimi — subagent-driven mı inline mı. Yarın sorulacak.
YARIN: Task 1 Task 0'a bağlı değil, başlayabilir. Task 5 İK-1+İK-2 kapanmadan başlamaz.
Task 1: complete (working tree — commit kullanıcıda), 15 Eylül
  Plan birebir uygulandı + BİR senaryo eklendi (C). Kod yüzeyi: main.js +15/-0.
  ZİNCİRE TX ATILMADI, owner mnemonic'i kullanılmadı (rastgele anahtar).
  TDD sırası tutuldu: KIRMIZI 6✓/2✗ → düzeltme → YEŞİL 11✓/0✗.
    Kırmızı olan tam olarak planın önceden yazdığı iki assertion.
    Her senaryoda POZİTİF KONTROL var (imza geçerliyken txOut bloğu GÖSTERİYOR)
    → assertion "txOut hep boş" diye geçmiş olamaz.
  Düzeltme: invalidateSignature (:124) ve gönderim başarı yolu (:695, status===1)
    artık txOut'u güncelliyor. sendOut'a DOKUNULMADI (tx hash + Etherscan + gas
    orada duruyor — SAPMA 3 / A3'ün koruduğu kanıt).
  SENARYO C PLANDA YOKTU, eklendi: düzeltmeyi yazarken koda "REVERT dalında bu
    satır bilerek yok" yorumunu düştüm; bu bir İDDİAYDI. Ölçüme çevrildi —
    revert (status 0) yolunda txOut imza bloğunu KORUYOR, btnSend açık kalıyor.
    Hem kapsam kanıtı (düzeltme fazla geniş değil) hem regresyon bekçisi.
    Emsal: "kod yorumu niyeti gösterir, davranışı değil" (GAS_FALLBACK, e.txHash).
  Oracle: Playwright (playwright-core 1.62.1, önbellekteki chromium-1234;
    1.63.0 chromium-1243 istiyor, indirilmemiş). Kalkan 1 ve 2 CANLI Sepolia
    (nonce 2, readDigest kontrattan); taklit edilen tek katman MetaMask signer'ı.
  GEÇİCİ KANCA (connected modül-özel let): window.__s4t1.installFakeConn.
    main.js kanca öncesi md5 2843d19f7f7fe63f2f0737b19728ee6d (= Task 6 sonu)
    kanca+düzeltme sonrası     152181b20ff4e0abb1fa9ee0aa067c68
    git diff = SADECE düzeltme (+15/-0), __s4t1 grep'i BOŞ. Kalıntı 0.
    Kanca kaldırıldıktan sonra tekrar: Senaryo A 3/3 yeşil, B ve C açıkça
    "ATLANDI" yazdı (sessizce geçmiş görünmediler).
  Testler: build-transaction 21 ✓ · pqwallet 9 ✓ (cast oracle) · vite build ✓
  PLAN HATASI: Adım 5'in komut listesi pqwallet-test için eksik — CAST_EXPECTED
    olmadan test BİLEREK patlıyor. Doğru komut 2026-09-04 planı Step 4'te.
  🔴 AÇIK BULGU — send-transaction-test.mjs ASILIYOR (Task 1 ile İLGİSİZ:
    o test main.js'i import etmiyor, sendTransaction.js hiç değişmedi).
    45 ✓ sonra "GERÇEK ETHERS — canlı Sepolia oracle"da %0 CPU, 18 dk, ilerleme yok.
    KÖK SEBEP ÖLÇÜLDÜ (ham JSON-RPC + cast, ethers'a güvenilmeden):
      eth_getTransactionByHash  → tx DÖNÜYOR (her iki sabit hash için)
      eth_getTransactionReceipt → null      (her iki sabit hash için)
      Taze tx'in receipt'i sorunsuz geliyor → sağlayıcı receipt GEÇMİŞİNİ BUDUYOR.
      Sınır 2 GÜNDEN KISA: bizim 0x320e03d9… (blok 11696552, güncel 11709552,
      ~13.000 blok) receipt'i de null.
    revertedTx.wait() null receipt'te ethers'ın yoklamasına giriyor, timeout yok
      → süresiz bekliyor.
    TASARIM NİYETİ TUTMADI: testin A1 yorumu "hash budanırsa KIRMIZI yanar,
      sessizce atlamaz" diyor; koruma getTransaction'a bakıyor (:280-281) ama
      budanan RECEIPT. Yanlış şeyi ölçüyor → kırmızı değil asılma.
    TASK 5/6'YI DA İLGİLENDİRİYOR: Δ₂ gönderim ANINDA receipt'ten alındığı için
      çalışır (taze receipt geliyor, ölçüldü); ama SONRADAN yeniden doğrulama —
      raporun 0x320e03d9… tx'i dahil — bu RPC'den YAPILAMAZ. Etherscan / ikinci
      endpoint şart. Plan Task 5'teki "ikinci RPC endpoint" maddesi artık sadece
      Δ kalibrasyonu için değil, KANITIN ERİŞİLEBİLİRLİĞİ için de gerekli.
    KARARA BAĞLANMADI — kapsam genişletme sorusu kullanıcıya soruldu.
  Kanıt: docs/evidence/crypto-tests/sprint4-screen-consistency.md
    + 4 ekran görüntüsü (invalidate/after-send × red/green)
Task 1'in 🔴 AÇIK BULGUSU KAPANDI, 15 Eylül
  Kaynak: sprint4-screen-consistency.md § 7.1-7.3, frontend/.env.example,
    send-transaction-test.mjs, plan (Task 0/5/5B).
  KÖK SEBEP DOĞRULANDI, eski koruma YANLIŞ ŞEYİ ÖLÇÜYORDU: koruma
    getTransaction'ın null'lığına bakıyordu, ama sağlayıcının budadığı RECEIPT.
    tx dönüyor → koruma "her şey yolunda" diyor → wait() null receipt'te
    süresiz yokluyor → kırmızı değil ASILMA. Koruma artık receipt'e bakıyor:
    receipt yoksa oracle bloğuna HİÇ girilmiyor (sendExecute içindeki wait()
    bizim sınırımızın dışında, o dosya kapsam dışı).
  ÜÇ KATMANLI SÜRE SINIRI, her katman ethers KAYNAĞINDAN teyit edildi:
    1. wait(confirms, timeout) — provider.js:1048 imza, :1051 varsayılan 0
       (=sınırsız, asılmanın sebebi), :1177-1182 timer → cancel() + reject.
       cancel() yoklamayı GERÇEKTEN durduruyor (stopScanning + provider.off).
       Promise.race bunu yapamazdı: assertion kırmızı olur, poll iptal olmaz.
    2. provider.destroy() finally'de — provider-jsonrpc.js:823 → super →
       abstract-provider.js:1218 (removeAllListeners + tüm #timers).
    3. Paket sonunda açık process.exit(kod).
    AMPİRİK TEYİT: wait(1,5000) 5,1 sn'de code=TIMEOUT fırlattı; destroy()
      sonrası süreç process.exit OLMADAN 5,9 sn'de kendi çıktı.
  ÖLÇÜM KENDİ KODUMDAKİ HATAYI YAKALADI: e.shortMessage çıplak metni
    ("wait for transaction timeout"), e.message ise "(code=..., version=...)"
    ekini alıyor. Eşitlik message üzerinden kurulsaydı wait-zaman-aşımı sessizce
    HTTP zaman aşımı diye sınıflanırdı. shortMessage + startsWith'e çevrildi ve
    sınıflandırıcıya 4 öz-test eklendi (kırmızı mesaj kategorisi artık sınanıyor).
  Paket 1,3 sn'de çıkış kodu 1 ile bitiyor (önce: süresiz asılma).
Arşiv RPC endpoint kararı, 15 Eylül
  ALTI ENDPOINT ÖLÇÜLDÜ (0x320e03d9…'un receipt'i için, ham JSON-RPC):
    publicnode null · rpc.sepolia.org cevapsız · drpc ücretli plan ·
    blockpi cevapsız · 1rpc.io RECEIPT VAR ama SUCCESS_TX'te null ·
    sepolia.gateway.tenderly.co ÜÇ HASH'İN DE tx+receipt'i TAM ← seçildi
  ANAHTARSIZ olduğu için seçildi: Alchemy/Infura ücretsiz katman da veriyor ama
    kayıt+API anahtarı istiyor; jüri için ek sürtünme.
  TEK DEĞİŞKEN ÜÇ KALEMİ KAPATIYOR: canlı oracle'ın receipt'leri · kanıt
    tx'lerinin sonradan yeniden doğrulanması · spec § 8 s.4 (ikinci endpoint).
    § 8 s.4'e kategori notu düşüldü: K2'nin tekrarında aranan ARŞİV OLMAK
    DEĞİL FARKLI OLMAK (ölçtüğü şey sağlayıcı bağımlılığı); arşiv ihtiyacı
    kalksa bile değişken KALDIRILMAZ, yoksa tekrar testi tek sağlayıcıya düşer.
  Bağımsız teyit: tenderly'den gelen gasUsed 216221 / blok 11696552 / to =
    PQWallet / from = gas hesabı — hepsi defterdeki değerlerle birebir.
  docs/evidence/chain/0x320e03d9….json yazıldı (tam tx+receipt JSON, başında
    endpoint + tarih). tx-hashes.md'ye DOKUNULMADI (Hakan'ın).
  KAPSAM yazılı: ham JSON TUTANAKTIR, kriptografik kanıt değil, kendi kendini
    doğrulamaz. Rapor cümlesi "herhangi bir ARŞİV düğümüyle yeniden
    doğrulanabilir; JSON kolaylık kopyasıdır" — "zincirden yeniden üretilebilir"
    YAZILMAYACAK (budayan endpoint'te üretilemiyor).
Task 2: complete (commit a64129b), 15 Eylül
  Mnemonic DOM'dan kalktı. Kanıt: § 7b.
  TEKLİK YENİDEN ÖLÇÜLDÜ: devir notundaki :195 artık :204 (Task 1 kaydırdı).
    grep ile doğrulandı; DOM'a giden TEK yer. İki ek sızıntı yolu da kapatıldı:
    keygen() dönüşünde mnemonic YOK (signer.js:38-48 → pkSeed/pkRoot/
    ecdsaAddress/publicKey), içe aktarma yolu alanı hemen temizliyor (:424).
  TDD: KIRMIZI (ilk kelime 1 kez + tam ifade DOM'da + "12 kelime" etiketi) →
    düzeltme → YEŞİL (0 kez). POZİTİF KONTROL İKİ KOŞUDA DA yeşil (açık anahtar
    ekranda) → assertion "sayfa boş" diye geçmiş olamaz.
  GERÇEK OWNER MNEMONIC'İ KULLANILMADI: btn-keygen'in rastgele ürettiği değer
    arandı. .env.pqwallet-owner-key açılmadı.
  Kelime sayısı / nokta maskesi / kısaltma da yazılmıyor (maskenin uzunluğu
    bile bilgi sızdırır).
  REGRESYON ayrıca koşuldu (keygen template'i değişti, asıl risk buydu):
    anahtar BELLEKTE duruyor, imza üretiliyor, 3688 bayt (C13), imzadan sonra
    da mnemonic sayfada yok.
  KANCA (window.__s4t2, currentMnemonic'i yalnızca okuyor) kaldırıldı:
    main.js taban 4c48e426f292cfbf0856cde4c97dfb23 (commit 900a4f3)
            kancalı 8420164ba632094f8cdf7cee2777458d
            düzeltme+kancasız 10e02c8bfa36531d55d581747a9a7ee9
    grep __s4t2 → 0. Diff yalnızca düzeltme (+12/-4).
  KANCASIZ SON DOĞRULAMA (oracle'a bağımlı olmayan): window.__s4t2 undefined +
    ekranda ardışık BIP-39 sözlük kelimesi dizisi YOK (en uzun < 4). İfadeyi
    bilmeyi gerektirmediği için kanca oracle'ından güçlü.
  esc() yorumu güncellendi: "sayfa mnemonic'i de DOM'a yazıyor" gerekçesi artık
    YANLIŞTI; kaçış hâlâ gerekli (kullanıcı girdisi innerHTML'e gidiyor).
Kapı tuzağı düzeltmesi (plan Task 5B), 15 Eylül
  ESKİ AKIŞ YENİDEN ÇEKİMİ GARANTİ EDİYORDU: kanca Task 5'te eklenir →
    KAYIT_MD5 Task 6 Adım 4'te main.js KANCALIYKEN alınır → kayıt → Adım 9'da
    kanca silinir → Task 10 kapısı eşitsizlik görür → "video YENİDEN ÇEKİLİR".
    K3 hiçbir şeye dokunmasa bile. Bedeli: ikinci elle mnemonic oturumu + tx.
  İKİNCİ VE DAHA AĞIR SORUN: kayıt, içinde window.__m4 test kancası duran kodla
    alınıyordu — jüriye gösterilen sürüm gönderilen sürüm değil.
  DÜZELTME: yeni Task 5B — faz 1 ölçümleri dosyaya yazılır ve DOSYADAN OKUNARAK
    doğrulanır → kanca SİLİNİR (kayıttan ÖNCE) → COMMIT → sonra yenileme+
    mnemonic+kayıt. Sıra kritik: kanca silme HMR ile sayfayı yeniletiyor, o
    yüzden mnemonic'ten ÖNCE silinmeli (yoksa anahtar düşer, ikinci kez girilir).
  Task 10 kapısı md5 KARŞILAŞTIRMASI olarak KALIYOR; KAYIT_COMMIT kapıya
    GİRMİYOR (Task 8-9 kanıt notu commit'liyor, HEAD ilerliyor, kapı yanlış
    tetiklenirdi). Bu ayrım Task 10 Adım 1'e açıkça yazıldı.
Canlı oracle dosya SONUNA taşındı (commit 3fa1477), 15 Eylül
  GEREKÇE ÖLÇÜLDÜ VE DARALDI — iddia edildiği gibi değil:
    Koşamayan 30 assertion'ın 18'i classifyNegativeProofError'dı (saf fonksiyon,
    ağla ilgisiz); tek sebep dosyada asılma noktasının ALTINDA olmalarıydı.
    AMA hızlı arızalarda (değişken yok, ECONNREFUSED) ESKİ sıralama da 18'i
    koşturuyordu — D5'in try/catch'i yakalayıp devam ediyor.
    TAŞIMANIN DEĞERİ TEK SENARYODA: gerçek asılma. Orada paket sınırı
    process.exit(1) ile kesiyor, try/catch'e sıra gelmiyor.
      eski sıralama + asılma → 48 ✓ / classify 0  (18 sessizce düştü)
      yeni sıralama + asılma → 66 ✓ / classify 18 (korundu)
    15 Eylül'de yaşanan tam olarak bu biçimdi (45'te asılma).
  Yeni sıra: disconnectMessage → sendExecute → classify(18) → canlı oracle.
    Sıra değişti, SAYI DEĞİŞMEDİ: 83.
  SÜRE SINIRI PAYI ÖLÇÜLDÜ (§ 7.3): paket 180.000 ms (:38) · oracle wait
    20.000 ms (:468) · ethers tek HTTP isteği varsayılanı 300.000 ms
    (fetch.js:402, kaynaktan). Gerçek süre: tam paket 1,16-1,39 sn, oracle'sız
    0,13 sn → oracle bölümü ~1,0-1,26 sn / 7 çağrı. PAY ~143x, rahat, sınır
    büyütülmedi.
  YAPISAL BOŞLUK (bilinerek): 7 canlı çağrının 2'si sendExecute içindeki süre
    parametresiz tx.wait()'e giriyor (sendTransaction.js:227, KAPSAM DIŞI).
    Onları yalnızca paket sınırı keser; sonuç yine KIRMIZI (asılma değil).
    Kalıcı çözüm Sprint 5.
Plan/belge düzeltmeleri, 15 Eylül
  Task 5'e yeni Adım 0 NONCE KAPISI (mnemonic içe aktarmadan ÖNCE):
    cast nonce <PQWALLET> → 2 beklenir, değilse DUR, imza atılmaz.
    Gerekçe: plan C adresine "faz 1'de boş olması haftaya boş olduğunu
    göstermez" deyip kontrolü tekrarlatıyordu; aynı şüphe cüzdanın KENDİ
    nonce'una uygulanmamıştı, oysa üç imza da nonce 2'ye bağlı. Sonradan fark
    edilirse üç imza çöp + ikinci elle oturum.
  Task 0 Adım 2 DENETLENDİ, altı satırın altısı: klon URL'si origin ile birebir ·
    npm i · frontend/scripts/build-wasm.sh VAR (cwd=frontend iken yol doğru) ·
    .env.example VAR · npx vite build · submodule'ler (.gitmodules'te forge-std
    + sphincs-minus). BOZUK OLAN TEK SATIR: npm run dev → package.json'da
    scripts alanı HİÇ YOK (scripts: null), "Missing script: dev" ile patlıyordu.
    npx vite'a çevrildi. Belge kendiyle çelişiyordu: Global Constraints zaten
    "npm script'i yok" diyordu.
  .env.example placeholder'dan BİREBİR URL'ye çevrildi (iki değer de anahtarsız:
    publicnode + tenderly). DOĞRULANDI: cp .env.example .env sonrası HİÇBİR EL
    DÜZENLEMESİ OLMADAN 83·21·9 + vite build yeşil. Task 0 Adım 2'ye "bitti"
    ölçütü olarak yazıldı — JÜRİ SIFIR KAYITLA ÇALIŞTIRABİLİR. Ölçüt korunmalı:
    placeholder geri konursa sessizce kaybolur.
  PLAN-SPEC EŞ GÜNCELLEME kuralı iki belgeye de yazıldı (f508296'nın plan-only
    kalması bu kuralın yokluğundandı). Spec § 1 K1 plana eşitlendi: "ekran
    tutarlılığı", envanter ölçütü düştü, render.js ertelemesi dört gerekçesiyle
    görünür kaldı, kanıt dosyası adı sprint4-screen-consistency.md.
  sprint3-three-shields.md'ye ÇÜRÜME NOTU: oradaki canlı oracle değerleri
    12 Eylül'de DÜRÜSTTÜ, sonradan çürüdü. Ayırt edici iki kanıt belgenin kendi
    içinde: "57 assertion TÜMÜ GEÇTİ" (asılan paket toplam üretmez) ve kasıtlı
    çürütme deneyinde 4 assertion'ın kırmızı→yeşil GÖZLENMESİ (koşmayan
    assertion bunu yapamaz). Değerler tenderly'den yeniden doğrulandı.
15 Eylül durumu — ÖLÇÜLEN vs TEYİT EDİLMEYEN
  ÖLÇÜLDÜ (16 Eylül'de yeniden koşuldu): send-transaction 83 ✓ · build-
    transaction 21 ✓ · pqwallet 9 ✓ (cast oracle) · üçü de exit 0.
    Canlı zincir: readNonce() = 2, readBalance() = 900000000000000 wei
    (0,0009 ETH) — Task 5'in nonce 2 varsayımı 16 Eylül itibarıyla HÂLÂ GEÇERLİ.
  ÖLÇÜLDÜ: 15 Eylül'de 7 commit (6722910 14:35 → 3fa1477 19:37).
  TEYİT EDİLMEDİ — Task 0'ın hiçbir maddesi kapanmadı (Akif'te):
    ÖK-1 kağıttan mnemonic geri yükleme doğrulaması (Task 5 Adım 4'te bedava)
    ÖK-2 temiz klon testi 🔴 BLOKÖR — Task 5/6 buna bağlı
    Teslim tarihi teyidi (sıra anahtarı A varsayılıyor, doğrulanmadı)
    Submodule pin dayanıklılığı TAZE klonda çekilebiliyor mu (yerelde var,
      ağdan taze çekim denenmedi — .gitmodules kaydı görüldü, o kadar)
  TEYİT EDİLMEDİ: Task 5/6/7/8/9/10/11/12 hiç başlamadı. Kayıt alınmadı,
    ikinci gerçek tx atılmadı, gas tablosu doldurulmadı.
  SIRADAKİ AJAN İŞİ: Task 8 (GAS_FALLBACK erişilebilirlik analizi) — blokörsüz,
    saf kaynak okuması, zincir/owner anahtarı/MetaMask gerektirmiyor. K3'ün
    "K1'den sonra" koşulu Task 1-2 ile sağlandı. Sonucu (DOĞAL/DENETİMLİ_AĞ/
    ÖLÜ_KOD) Task 9'un maliyetini belirliyor.
