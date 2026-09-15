import { generateNewMnemonic, keygen, signDigest, C13_SIG_BYTES } from './crypto/signer.js';
import { checkSepoliaConnection } from './network/sepolia.js';
import { formatEther } from 'ethers';
import { buildAndSign, buildDigest } from './tx/buildTransaction.js';
import { CONTRACTS } from './config/contracts.js';
import {
  readNonce,
  readBalance,
  readOwnerPublicKey,
  readDigest,
  encodeExecute,
  buildNegativeProofCalldata,
} from './contracts/pqwallet.js';
import {
  connectWallet,
  watchWalletChanges,
  disconnectMessage,
  preflight,
  sendExecute,
  classifyNegativeProofError,
  INVALID_SIGNATURE_REASON,
} from './tx/sendTransaction.js';

// Hata mesajları kullanıcının girdiği ham değeri içeriyor (hangi alanın
// hatalı olduğunu söylemek için) ve innerHTML ile basılıyor. Sayfa aynı
// zamanda mnemonic'i DOM'a yazdığı için kaçış şart.
const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

let currentMnemonic = null;
let currentKeys = null;

// Owner mnemonic'i içe aktarıldığında true olur. Sahnede yanlışlıkla "Yeni
// anahtar çifti üret"e basmak currentMnemonic'i sessizce rastgele bir
// anahtarla değiştirir; imza sonra verify()'dan false döner ve ekranda bunu
// haber veren hiçbir şey olmaz. Bu yüzden içe aktarmadan sonra keygen kalıcı
// olarak kapanır — kilit açma butonu bilerek YOK, geri dönüş yolu sayfayı
// yenilemektir.
let ownerKeyLoaded = false;

// İmzalama sonucu burada saklanır. execute() calldata'sı BUNUN fields'ından
// kurulur, DOM'dan değil.
let signed = null;
// Son okunan on-chain nonce. Gönderim öncesi karşılaştırma için.
let chainNonce = null;
// MetaMask bağlantısı: { signer, address, chainId } ya da null. Bağlantı
// anının fotoğrafıdır — MetaMask'te ağ/hesap değişirse null'a düşürülür
// (dosyanın sonundaki watchWalletChanges).
let connected = null;

const walletDisplay = document.getElementById('tx-wallet-display');
const nonceDisplay = document.getElementById('tx-nonce-display');
const balanceDisplay = document.getElementById('tx-balance-display');
// Zincir okuma hatalarının GÖNDERİM SONRASI yeri. Kendi alanı var çünkü
// sendOut o anda tx kanıtını (hash, Etherscan linki, ölçülen gas) taşıyor.
const chainWarn = document.getElementById('chain-warn');
const sendOut = document.getElementById('send-out');
// Bağlantı durumu send-out'u DEĞİL kendi alanını kullanır: iki state bağımsız,
// dolayısıyla iki alan. Bağlantı durumu ile imza durumu birbirinden habersiz
// değişiyor; aynı div'i paylaşsalardı hangisinin yazdığı rastgele bir ezme
// sırasına bağlı olurdu — "bağlantı düştü" mesajı bir sonraki girdi
// değişikliğinde silinir ve kullanıcı gönderemediğinin sebebini göremezdi.
// (Tüm çıktı desenini tek bir render()'da toplamak daha doğru olurdu; Sprint
// 4 "demo cilası" kalemine bırakıldı — gerekçe için plan dosyasına bakın.)
const walletOut = document.getElementById('wallet-out');
const btnSend = document.getElementById('btn-send');
const btnNegativeProof = document.getElementById('btn-negative-proof');
const btnRefreshChain = document.getElementById('btn-refresh-chain');
// Modül seviyesinde: hem imzalama penceresinde geçici olarak, hem owner
// anahtarı içe aktarıldığında kalıcı olarak kilitleniyor. İki sahip var,
// bu yüzden handler'a yerel olamaz.
const btnKeygen = document.getElementById('btn-keygen');

// İmzaya giren üç alan. Tek listede tutuluyor çünkü iki ayrı yerde geziliyor:
// imza düşürme dinleyicileri ve imzalama penceresindeki kilit.
const TX_INPUT_IDS = ['tx-to', 'tx-value', 'tx-data'];

walletDisplay.textContent = CONTRACTS.pqWallet;

// Gönder ve negatif kanıt butonlarının kilidi TEK KAYNAKTAN türer: state.
//
// Hiçbir yerde koşulsuz `btnSend.disabled = false` YAZILMAZ. Gerekçe bu kod
// tabanında bir kez yaşandı: Task 3B'de build-sign'ın finally'si
// `btnKeygen.disabled = false` yazıyordu ve owner anahtarıyla bir imza atmak
// keygen kilidini sessizce kaldırıyordu — kilidin sahibi state'ti (ownerKeyLoaded),
// finally değil. Aynı hata burada daha pahalıya patlardı: başarılı gönderimden
// sonra imza TÜKETİLMİŞKEN (signed = null, kontratın nonce'u arttı) açık kalan
// bir gönder butonu ya "Önce imzalayın" der ya da bir sonraki imzayla İKİNCİ
// bir tx gönderir.
//
// İKİ BUTON DA imza VE bağlantı ister, çünkü ikisi de MetaMask signer'ını
// kullanır: gönderim `eth_sendTransaction` için, negatif kanıt `eth_call` için.
//
// Kilit ile handler'ın koşulu AYNI ŞEYİ söylemeli. Önceki hali
// (`btnNegativeProof.disabled = !signed`) söylemiyordu: cüzdan bağlı değilken
// buton AÇIK kalıyor, basınca handler'ın başındaki `if (!conn)` kırmızı "Önce
// cüzdanı bağlayın" basıyordu. Açık ama iş yapmayan bir buton, kilidin ikinci
// ve çelişen bir kopyasıdır.
//
// Negatif kanıt TEKNİK OLARAK bağlantı istemiyor — saf bir eth_call, salt-okunur
// getSepoliaProvider() ile de yapılabilirdi (~24 satır ve bir demo adımı eksilirdi).
// Ölçüldü, raporlandı, REDDEDİLDİ (Task 6, 13 Eylül — karar Akif'in):
//
//   Negatif kanıtın ikna ediciliği, gerçek gönderimle AYNI YOLDAN geçmesinden
//   geliyor. İkisi de MetaMask signer'ı üzerindeyse "bozuk imza reddedildi,
//   doğru imza geçti" tek bir yolun iki sonucudur. Negatif kanıt uygulamanın
//   kendi RPC'sinden gitseydi şüpheci jüri üyesinin elinde meşru bir itiraz
//   doğardı: "reddedilmeyi bir yolda gösterdin, göndermeyi başka yolda
//   yapıyorsun." Kazanılan satırlar o itirazın bedelini karşılamıyor.
//
// Bu yüzden iki buton da signer'a bağlı ve kilitleri aynı. Ayrıntılı
// kazanç/bedel dökümü: docs/evidence/crypto-tests/sprint3-negative-proof.md § 7.
function syncSendButtons() {
  const ready = Boolean(signed && connected);
  btnSend.disabled = !ready;
  btnNegativeProof.disabled = !ready;
}

// İmzadan sonra girdileri değiştirmek, üç kalkanın da GÖREMEDİĞİ bir hata
// modu: calldata fields'tan kurulduğu için tx eski değerlere gider, ama
// ekranda yeni değerler yazar. Nonce doğru, digest karşılaştırması uyuşur
// (ikisi de eski fields'tan), ön-uçuş geçer — her şey yeşil, kullanıcı
// yanlış bilgiye bakıyor. Bu yüzden herhangi bir değişiklik imzayı düşürür.
function invalidateSignature() {
  if (!signed) return;
  signed = null;
  syncSendButtons();
  // txOut de güncellenir. Güncellenmezse orada imza bloğu ("İmza (3688 bayt)",
  // digest, DOMAIN_SEPARATOR) DURMAYA DEVAM EDER ve ekran kendi kendisiyle
  // çelişir: aynı karede txOut "imza üretildi", sendOut "imza geçersiz kılındı"
  // der. Bu kare demo kaydına giriyor.
  //
  // sendOut'a KIYASLA fark: sendOut'ta tx hash'i, Etherscan linki ve ölçülen
  // gas — yani KANITIN KENDİSİ — durabilir; onu ezmek SAPMA 3 ve A3'ün
  // koruduğu şeyi yok ederdi. txOut kanıt taşımıyor, yalnızca bayatlıyor.
  txOut.innerHTML = '<p class="warn">İmza geçersiz kılındı — yeniden imzalayın.</p>';
  sendOut.innerHTML = '<p class="warn">Değerler değişti — imza geçersiz kılındı, yeniden imzalayın.</p>';
}

for (const id of TX_INPUT_IDS) {
  document.getElementById(id).addEventListener('input', invalidateSignature);
}

// `quiet`: hata sendOut'a DEĞİL, göstergelerin yanındaki kendi uyarı alanına
// yazılır. Gönderimden sonraki yenileme için: o anda sendOut'ta tx hash'i,
// Etherscan linki ve ölçülen gas duruyor. Buraya düşen bir RPC hıçkırığı normal
// modda o kanıtı EZERDİ — gerçek tx atılmış, ekranda "Zincir okunamadı" yazar.
// Zincir göstergesinin yenilenememesi, tx'in kendisi hakkında hiçbir şey
// söylemez ve onu şüpheye düşürmemelidir.
//
// DÖNÜŞ: okunan `{ nonce, balance }`, okuma patlarsa `null`. Çağıranın ikinci
// bir RPC gidiş-dönüşü yapmadan teşhis basabilmesi için — revert sonrası
// "zincirdeki nonce kaç, bakiye ne" sorusunun cevabı zaten burada okunuyor.
async function refreshChainState({ quiet = false } = {}) {
  btnRefreshChain.disabled = true;
  chainWarn.innerHTML = '';
  nonceDisplay.textContent = 'okunuyor…';
  balanceDisplay.textContent = 'okunuyor…';
  try {
    const [n, b] = await Promise.all([readNonce(), readBalance()]);
    chainNonce = n;
    nonceDisplay.textContent = String(n);
    balanceDisplay.textContent = `${b} wei = ${formatEther(b)} ETH`;
    return { nonce: n, balance: b };
  } catch (e) {
    nonceDisplay.textContent = '—';
    balanceDisplay.textContent = '—';
    // chainNonce de düşürülür. Göstergede '—' yazarken modülde bayat bir sayı
    // tutmak, bu kod tabanının kaçındığı sessiz sapmanın ta kendisi: o bayat
    // nonce ile imzalanan bir işlem ekranda doğru görünür, kalkan 1'e kadar da
    // fark edilmez. null olunca build-sign kendi net mesajını basıyor.
    chainNonce = null;
    if (quiet) {
      chainWarn.innerHTML =
        '<p class="warn">Zincir göstergesi yenilenemedi (nonce/bakiye). Yukarıdaki işlem sonucu geçerlidir — göstergeyi tazelemek için "Zincirden yenile"ye basın.</p>';
    } else {
      sendOut.innerHTML = `<p class="err">Zincir okunamadı: ${esc(e.message)}</p>`;
    }
    return null;
  } finally {
    btnRefreshChain.disabled = false;
  }
}

// Ok fonksiyonu: doğrudan bağlansaydı tıklama olayı 1. argüman olarak geçer ve
// `{ quiet }` bir MouseEvent'ten destructure edilirdi.
btnRefreshChain.addEventListener('click', () => refreshChainState());
refreshChainState();

const keygenOut = document.getElementById('keygen-out');
const signOut = document.getElementById('sign-out');
const connectionOut = document.getElementById('connection-out');
const txOut = document.getElementById('tx-out');

document.getElementById('btn-keygen').addEventListener('click', async () => {
  keygenOut.innerHTML = '<p>Üretiliyor…</p>';
  try {
    const t0 = performance.now();
    currentMnemonic = generateNewMnemonic();
    currentKeys = await keygen(currentMnemonic);
    const ms = (performance.now() - t0).toFixed(1);
    keygenOut.innerHTML = `
      <label>Mnemonic (12 kelime)</label>
      <div class="field">${esc(currentMnemonic)}</div>
      <label>pkSeed</label>
      <div class="field">${currentKeys.pkSeed}</div>
      <label>pkRoot</label>
      <div class="field">${currentKeys.pkRoot}</div>
      <label>publicKey (pkSeed‖pkRoot, SPHINCSVerifier.sol formatı — 64 bayt)</label>
      <div class="field">${currentKeys.publicKey}</div>
      <label>ECDSA adresi (migration için)</label>
      <div class="field">${currentKeys.ecdsaAddress}</div>
      <p class="ok">keygen tamamlandı (${ms} ms)</p>
    `;
  } catch (e) {
    keygenOut.innerHTML = `<p class="err">Hata: ${esc(e.message)}</p>`;
  }
});

document.getElementById('btn-sign').addEventListener('click', async () => {
  if (!currentMnemonic) {
    signOut.innerHTML = '<p class="err">Önce anahtar üret.</p>';
    return;
  }
  const digest = document.getElementById('digest').value.trim();
  signOut.innerHTML = '<p>İmzalanıyor…</p>';
  try {
    const t0 = performance.now();
    const { signature, sigBytes } = await signDigest(currentMnemonic, digest);
    const ms = (performance.now() - t0).toFixed(1);
    const lengthOk = sigBytes === C13_SIG_BYTES;
    signOut.innerHTML = `
      <label>İmza (${sigBytes} bayt)</label>
      <div class="field">${signature}</div>
      <p class="${lengthOk ? 'ok' : 'err'}">${lengthOk ? '✓ imza uzunluğu 3688 bayt (C13 beklenen)' : '✗ beklenmeyen uzunluk'}</p>
      <p class="ok">sign tamamlandı (${ms} ms)</p>
    `;
  } catch {
    // SABİT mesaj, `e` bilerek YAKALANMIYOR (opsiyonel catch binding):
    // yukarıdaki signDigest çağrısı currentMnemonic'i WASM'ın
    // sign_from_mnemonic'ine 0. argüman olarak veriyor ve owner anahtarı içe
    // aktarıldıysa o argüman owner mnemonic'idir. Rust tarafı hatayı
    // `format!("invalid mnemonic: {e}")` ile sarıyor (keygen.rs:32) — bugün
    // bip39'un hata tipi kelimenin İNDEKSİNİ taşıyor, kelimeyi değil, ama bu
    // bizim değil üçüncü parti bir Display impl'inin garantisi ve bir panic
    // ayrı bir yol. esc() HTML kaçırır, sızıntıyı değil.
    // Teşhis okunabilirliği Task 5'te ön-uçuş revert metinleriyle birlikte
    // ele alınacak; burada e.message'ı geri getirmeyin.
    signOut.innerHTML =
      '<p class="err">İmzalama başarısız. (Ayrıntı güvenlik gereği gösterilmiyor — girdi owner mnemonic\'i olabilir.)</p>';
  }
});

const btnCheckConnection = document.getElementById('btn-check-connection');

btnCheckConnection.addEventListener('click', async () => {
  // Uçuştaki istek varken buton kapalı: üst üste tıklama eşzamanlı provider
  // kurulumu ve RPC isteği açıyordu.
  btnCheckConnection.disabled = true;
  connectionOut.innerHTML = '<p>Bağlanılıyor…</p>';
  try {
    const { chainId, blockNumber } = await checkSepoliaConnection();
    connectionOut.innerHTML = `
      <label>Chain ID</label>
      <div class="field">${chainId}</div>
      <label>Son blok numarası</label>
      <div class="field">${blockNumber}</div>
      <p class="ok">Sepolia'ya bağlantı doğrulandı</p>
    `;
  } catch (e) {
    connectionOut.innerHTML = `<p class="err">Hata: ${esc(e.message)}</p>`;
  } finally {
    btnCheckConnection.disabled = false;
  }
});

const btnBuildSign = document.getElementById('btn-build-sign');

btnBuildSign.addEventListener('click', async () => {
  if (!currentMnemonic) {
    txOut.innerHTML = '<p class="err">Önce anahtar üret.</p>';
    return;
  }
  // Bu kontrol aşağıdaki try'ın İÇİNDEYDİ ve oradaki sabit mesaja yutuluyordu.
  // Buraya alındı çünkü mnemonic'le hiçbir ilgisi yok — kendi net mesajını
  // basabilir. Demo sırasında en olası hata "Zincirden yenile"ye basmayı
  // unutmaktır; onu "işlem oluşturulamadı"nın altında kaybetmek pahalıya
  // patlar. Kilitler henüz alınmadığı için erken return güvenli.
  if (chainNonce === null) {
    txOut.innerHTML = '<p class="err">nonce henüz okunmadı — önce "Zincirden yenile"ye basın.</p>';
    return;
  }

  // Alanlar TEK KEZ okunur ve hem ön-doğrulamaya hem imzalamaya aynı değerler
  // gider. İki ayrı okuma, iki ayrı normalizasyon yoluna açılan kapıdır.
  const to = document.getElementById('tx-to').value.trim();
  const value = document.getElementById('tx-value').value.trim();
  const data = document.getElementById('tx-data').value.trim();

  // ── Alan doğrulama teşhisi (Task 3B'nin devrettiği borç) ─────────────────
  //
  // İKİ KATMAN, bilerek ayrı:
  //
  //   1. buildDigest — SAF. Mnemonic ALMAZ, WASM'a dokunmaz, yalnızca to/value/
  //      data'yı doğrulayıp keccak hesaplar. Hatası ("to alanı geçerli bir adres
  //      değil: 0x123") kullanıcının kendi girdisinden başka hiçbir şey
  //      içeremez, bu yüzden HAM gösterilir. Teşhis buradan geri geldi.
  //   2. buildAndSign — mnemonic TUTAR. Hatası sabit metinle basılır (aşağıdaki
  //      catch), çünkü bip39/WASM istisnası girdiyi içerebilir ve buradaki
  //      girdi owner mnemonic'i olabilir.
  //
  // Ayrım şu soruya dayanıyor: "bu hata mnemonic'e erişmiş olabilecek bir
  // çağrıdan mı geliyor?" Katman 1 için cevap kanıtlanabilir biçimde HAYIR.
  // Katman 1 geçtikten sonra katman 2'ye düşen hata gerçekten kripto/WASM
  // kaynaklıdır — yani sabit mesaj artık DOĞRU mesajdır, körleştirme değil.
  //
  // Bedel: keccak iki kez hesaplanıyor. Mikrosaniyeler; imzalama 7,5 saniye.
  //
  // Kilitler ALINMADAN önce, çünkü erken return'ün butonları askıda bırakmaması
  // gerekiyor (chainNonce kontrolüyle aynı desen — Task 3B düzeltmesi).
  try {
    buildDigest({ walletAddress: CONTRACTS.pqWallet, nonce: chainNonce, to, value, data });
  } catch (e) {
    txOut.innerHTML = `<p class="err">${esc(e.message)}</p>`;
    return;
  }
  // İmzalama ~7.5 sn sürüyor; butonlar açık kalırsa kullanıcı rahatlıkla
  // tekrar tıklar (eşzamanlı WASM çağrısı) ya da keygen'i yeniden çalıştırıp
  // (bölüm 1'de mnemonic B'yi gösterirken bölüm 4 hâlâ mnemonic A ile
  // imzalanmış sonucu render eder — ekranda ikisini ayırt edecek hiçbir şey
  // yoktur) bu yüzden ikisi de kilitlenir.
  btnBuildSign.disabled = true;
  btnKeygen.disabled = true;
  // Girdiler de kilitlenir. Kilitlenmezse: kullanıcı ~7.5 sn'lik imzalama
  // penceresinde `to`'yu değiştirir, invalidateSignature() çalışır ama o an
  // `signed` hâlâ null olduğu için hiçbir şey yapmaz; imzalama bitince ESKİ
  // alanlarla `signed` kurulur. Ekranda yeni `to`, calldata'da eski `to` —
  // yani invalidateSignature'ın önlemek için var olduğu hata modu, tam da
  // onun kör olduğu pencereden geri girer.
  //
  // Bu kilit "gereksiz UI kısıtı" DEĞİLDİR, kaldırmayın: kapattığı delik
  // sessizdir — nonce doğru, canlı digest karşılaştırması uyuşur (ikisi de
  // aynı eski fields'tan gelir), eth_call ön-uçuşu geçer. Üç kalkanın da
  // yeşil yandığı, tx'in ekranda yazandan BAŞKA bir adrese gittiği durumdur.
  const txInputs = TX_INPUT_IDS.map((id) => document.getElementById(id));
  for (const el of txInputs) el.disabled = true;
  txOut.innerHTML = '<p>Digest hesaplanıyor ve imzalanıyor… (~7-8 sn)</p>';
  try {
    const { domainSeparator, digest, fields, signature, sigBytes, signMs } = await buildAndSign({
      walletAddress: CONTRACTS.pqWallet,
      to,
      value,
      nonce: chainNonce,
      data,
      mnemonic: currentMnemonic,
    });
    signed = { digest, signature, fields, nonce: chainNonce };
    syncSendButtons();
    const lengthOk = sigBytes === C13_SIG_BYTES;
    txOut.innerHTML = `
      <label>DOMAIN_SEPARATOR (chainId + cüzdan adresine bağlı)</label>
      <div class="field">${domainSeparator}</div>
      <label>digest</label>
      <div class="field">${digest}</div>
      <label>value geri okuma</label>
      <div class="field">${fields.value} wei = ${formatEther(fields.value)} ETH</div>
      <label>İmza (${sigBytes} bayt)</label>
      <div class="field">${signature}</div>
      <p class="${lengthOk ? 'ok' : 'err'}">${lengthOk ? '✓ imza uzunluğu 3688 bayt (C13 beklenen)' : '✗ beklenmeyen uzunluk'}</p>
      <p class="ok">imzalama tamamlandı (${signMs.toFixed(1)} ms)</p>
    `;
  } catch {
    signed = null;
    syncSendButtons();
    // SABİT mesaj — gerekçe yukarıdaki btn-sign catch'iyle aynı: buildAndSign
    // currentMnemonic'i signDigest'e, o da WASM'a veriyor.
    //
    // TASK 5'TE KAPANDI: bu catch eskiden alan doğrulama hatalarını da
    // yutuyordu ("to alanı geçerli bir adres değil: …") ve teşhis kaybolmuştu.
    // Artık aynı alanlar yukarıda, kilitlerden önce, SAF buildDigest ile
    // doğrulanıyor ve o hata HAM gösteriliyor. Sabit mesaj KALDIRILMADI,
    // kapsamı daraldı: buraya düşen hata artık yalnızca kripto/WASM
    // kaynaklıdır, yani sabit mesaj bu noktada doğru mesajdır.
    // Gevşetmeyin — girdi owner mnemonic'i olabilir.
    txOut.innerHTML =
      '<p class="err">İmzalama başarısız — anahtar/WASM katmanında hata. (Ayrıntı güvenlik gereği gösterilmiyor; alan hataları bu mesajdan ÖNCE, kendi metinleriyle gösterilir.)</p>';
  } finally {
    btnBuildSign.disabled = false;
    // `= false` DEĞİL: owner anahtarı yüklüyse keygen kilidi kalıcıdır ve
    // burada koşulsuz açılırsa owner anahtarıyla bir imza atmak kilidi
    // sessizce kaldırır. Kilidin tek sahibi ownerKeyLoaded'dır.
    btnKeygen.disabled = ownerKeyLoaded;
    for (const el of txInputs) el.disabled = false;
  }
});

// ── Owner mnemonic'ini içe aktarma ──────────────────────────────────────────
//
// Buraya girilen değer zincirdeki PQWallet'ın owner anahtarıdır ve
// PQWallet.ownerPublicKey YALNIZCA constructor'da yazılıyor
// (contracts/src/PQWallet.sol:11,23) — setter yok. Sızarsa çaresi anahtar
// rotasyonu değil, kontratın yeniden deploy'udur: yeni adres, yeniden verify,
// tx-hashes.md'nin baştan yazılması, canlı doğrulama kanıtının geçersizleşmesi.
//
// Bu yüzden mnemonic HİÇBİR yere yazdırılmaz: ne DOM'a, ne console'a, ne hata
// mesajına. Yalnızca ondan türeyen AÇIK anahtar gösterilir. Task 7'de bu
// sayfanın ekran kaydı alınacak.
const btnImportMnemonic = document.getElementById('btn-import-mnemonic');

btnImportMnemonic.addEventListener('click', async () => {
  const input = document.getElementById('import-mnemonic');
  const phrase = input.value.trim();
  if (!phrase) {
    keygenOut.innerHTML = '<p class="err">Mnemonic girin.</p>';
    return;
  }
  btnImportMnemonic.disabled = true;
  keygenOut.innerHTML = '<p>Anahtar türetiliyor…</p>';
  try {
    const keys = await keygen(phrase);
    // Alan HEMEN temizlenir: ekran kaydında noktaların sayısı bile kelime
    // sayısını ele verir, ayrıca sayfada açık kalan bir password alanı
    // tarayıcı eklentilerinin okuyabileceği bir yüzeydir.
    input.value = '';
    currentMnemonic = phrase;
    currentKeys = keys;
    // İmzalayan anahtar değişti — önceki anahtarla üretilmiş imza artık
    // geçersiz, düşürülmeli.
    invalidateSignature();

    // Zincirdeki ownerPublicKey ile makine karşılaştırması. Gözle yapılan
    // 64 baytlık hex karşılaştırması güvenilir değil ve yanlış mnemonic'in
    // bedeli, hatanın Task 7'de "PQWallet: invalid signature" olarak
    // görünmesi — o mesaj insanı fields sapmasına baktırır, oysa sorun
    // anahtardadır.
    let verdictHtml;
    let keyUsable = true;
    try {
      const onChain = await readOwnerPublicKey();
      if (onChain.toLowerCase() === keys.publicKey.toLowerCase()) {
        verdictHtml =
          '<p class="ok">✓ Zincirdeki ownerPublicKey ile AYNI — bu anahtarla atılan imzalar PQWallet tarafından kabul edilir.</p>';
      } else {
        keyUsable = false;
        verdictHtml =
          '<p class="err">✗ Zincirdeki ownerPublicKey ile UYUŞMUYOR — yanlış mnemonic. Anahtar temizlendi, bu anahtarla imzalanan hiçbir işlem kabul edilmezdi.</p>';
      }
    } catch {
      // Zincir okunamadı ≠ mnemonic yanlış. Anahtarı düşürmüyoruz, ama
      // "doğrulandı" da demiyoruz — ikisini karıştırmak, doğrulanmamış bir
      // anahtarla Task 7'ye girmek demektir.
      verdictHtml =
        '<p class="warn">Zincirdeki ownerPublicKey okunamadı — eşleşme DOĞRULANAMADI. Anahtar yüklendi ama teyit edilmedi; "Zincirden yenile" çalıştıktan sonra yeniden içe aktarın.</p>';
    }

    if (!keyUsable) {
      currentMnemonic = null;
      currentKeys = null;
      invalidateSignature();
      keygenOut.innerHTML = verdictHtml;
      return;
    }

    ownerKeyLoaded = true;
    btnKeygen.disabled = true;
    keygenOut.innerHTML = `
      <p class="ok">Mnemonic içe aktarıldı (ekranda gösterilmiyor).</p>
      <label>publicKey (pkSeed‖pkRoot, 64 bayt)</label>
      <div class="field">${esc(keys.publicKey)}</div>
      <label>ECDSA adresi (migration için)</label>
      <div class="field">${esc(keys.ecdsaAddress)}</div>
      ${verdictHtml}
      <p class="warn">Owner anahtarı yüklü — "Yeni anahtar çifti üret" kapatıldı. Değiştirmek için sayfayı yenileyin.</p>
    `;
  } catch {
    // SABİT mesaj. `e` bilerek YAKALANMIYOR: bip39/WASM hatası girdiyi
    // içerebilir ve bu alandaki girdi owner mnemonic'idir. Bu kod tabanının
    // "hangi alan hatalı, değeriyle söyle" deseni (buildTransaction.js
    // requireAddress/requireUint) burada TERSİNE çalışır.
    currentMnemonic = null;
    currentKeys = null;
    input.value = '';
    invalidateSignature();
    keygenOut.innerHTML =
      '<p class="err">Mnemonic içe aktarılamadı — 12 kelimelik geçerli bir BIP-39 ifadesi girin. (Ayrıntı güvenlik gereği gösterilmiyor.)</p>';
  } finally {
    btnImportMnemonic.disabled = false;
  }
});

// ── MetaMask bağlantısı ─────────────────────────────────────────────────────
//
// Bağlanan hesap PQWallet'ın SAHİBİ DEĞİLDİR — sahiplik C13 imzasıyla
// kanıtlanır. Bu hesap yalnızca tx'i zincire taşır ve gas'ı öder.
const btnConnectWallet = document.getElementById('btn-connect-wallet');

btnConnectWallet.addEventListener('click', async () => {
  btnConnectWallet.disabled = true;
  walletOut.innerHTML = '<p>Cüzdan bağlanıyor…</p>';
  try {
    connected = await connectWallet();
    // Bağlantı btnSend'in iki şartından biri — state değişti, kilit tazelenir.
    syncSendButtons();
    walletOut.innerHTML = `
      <label>Bağlı hesap (gas'ı bu öder)</label>
      <div class="field">${esc(connected.address)}</div>
      <p class="ok">MetaMask bağlandı, ağ Sepolia (${esc(connected.chainId)})</p>
    `;
  } catch (e) {
    connected = null;
    syncSendButtons();
    walletOut.innerHTML = `<p class="err">Hata: ${esc(e.message)}</p>`;
  } finally {
    btnConnectWallet.disabled = false;
  }
});

// Bağlantı kurulduktan SONRAKİ ağ/hesap değişimleri. Gerekçe
// sendTransaction.js'teki watchWalletChanges yorumunda.
//
// İki olay da bağlantıyı düşürür ama mesajları AYRI: sebepleri farklı,
// düzeltmeleri de farklı. Aynı metni basmak provada yanlış yere baktırır.
watchWalletChanges((change) => {
  // Hiç bağlanmadan ağ değiştirmek "bağlantı düştü" demek değildir.
  if (!connected) return;
  // Düşürmeden ÖNCE alınır: accountsChanged'de "aktif hesap gerçekten değişti mi"
  // sorusunu ancak eski adresle karşılaştırarak cevaplayabiliyoruz.
  const previousAddress = connected.address;
  connected = null;
  // İMZA DÜŞÜRÜLMEZ — bağlantının kopması imzayı geçersiz kılmaz, o hâlâ
  // geçerlidir. Yalnızca butonların kilidi tazelenir: ikisi de kapanır, çünkü
  // ikisi de MetaMask signer'ını kullanıyor. Yeniden bağlanınca imza hâlâ
  // yerinde olduğu için ikisi de geri açılır. Tek kaynak syncSendButtons —
  // burada elle `disabled` atanmaz.
  syncSendButtons();
  // Task 5 NOTU: gönderim handler'ı ayrıca `connected`ı akışın İÇİNDE de
  // kontrol ediyor (snapshot karşılaştırması). Buradaki kilit yeterli değil:
  // kullanıcı butona bastıktan sonra, üç kalkanın ağ çağrıları sürerken de ağ
  // değiştirebilir — o pencere bu dinleyiciyle kapanmaz.
  const { title, fix } = disconnectMessage(change, previousAddress);
  walletOut.innerHTML = `
    <p class="err">${esc(title)}</p>
    <p class="warn">${esc(fix)}</p>
  `;
});

// ── Üç kalkanlı gönderim ────────────────────────────────────────────────────
//
// KORUMA SIRASI DONDURULMUŞ: nonce → canlı digest → eth_call ön-uçuşu.
// Bu bir "hızlı başarısız ol" optimizasyonu DEĞİL, bir TEŞHİS sırasıdır ve
// performans gerekçesiyle yeniden sıralanmaz (spec: "Koruma sırası ve
// gerekçesi"). Sıra bozulursa kalkan 2'nin teşhis değeri yok olur: nonce sebebi
// elenmeden bakıldığında digest uyuşmazlığının sebebi "ya nonce ya fields"
// olarak belirsizleşir.
btnSend.addEventListener('click', async () => {
  if (!signed) {
    sendOut.innerHTML = '<p class="err">Önce imzalayın.</p>';
    return;
  }

  // Bağlantının FOTOĞRAFI. Akışın tamamı bunu kullanır, `connected`ı değil.
  //
  // Neden: aşağıda üç ağ çağrısı var (readNonce + readDigest + preflight),
  // yani 2-4 saniyelik bir pencere. Kullanıcı o pencerede MetaMask'i Mainnet'e
  // alırsa `connected` null'a düşer (watchWalletChanges) ama handler elindeki
  // referansla devam eder ve tx YANLIŞ AĞA gider — digest chainId'e bağlı
  // olduğu için zaten geçersiz bir tx, üstelik gas yakarak. Snapshot tek bir
  // tutarlı signer garanti eder; değişimi de `connected !== conn` ile
  // yakalanabilir hale getirir (referans karşılaştırması hesap değişimini de
  // görür, chainId karşılaştırması görmezdi).
  const conn = connected;
  if (!conn) {
    sendOut.innerHTML = '<p class="err">Önce cüzdanı bağlayın.</p>';
    return;
  }

  // İŞ-SÜRERKEN kilidi. syncSendButtons()'ın yerine geçmez, ONUN İFADE
  // EDEMEDİĞİ bir durumu kapatır: state (imza + bağlantı) bu akış boyunca
  // GEÇERLİ kalıyor, yani tek kaynağa sorulsa iki buton da "açık" cevabını
  // verirdi. Kapatılmasının sebebi state değil, akışın kendisi:
  //   - btnSend: çift tıklama aynı nonce'a İKİ tx demektir.
  //   - btnNegativeProof: negatif kanıt da sendOut'a yazıyor. Ön-uçuş ile
  //     MetaMask onayı arasındaki 2-4 saniyede basılırsa "MetaMask onayı
  //     bekleniyor…" ezilir ve iki akışın render'ları yarışır.
  // SAPMA 2 kuralıyla çelişmiyor: kural KOŞULSUZ AÇMAYI yasaklar
  // (`disabled = false`), kapatmayı değil. Açma tek kaynaktan yapılır —
  // aşağıdaki syncSendButtons() çağrıları ve catch'teki.
  btnSend.disabled = true;
  btnNegativeProof.disabled = true;
  // ÖNLEME — girdiler gönderim penceresi boyunca kilitlenir.
  //
  // Task 3'ün imzalama penceresindeki kilidiyle AYNI gerekçe, aynı hata sınıfı.
  // Gönderim penceresi de uzun: üç kalkanın ağ çağrıları (2-4 sn) + MetaMask
  // onayı (kullanıcı kadar). O pencerede `to`/`value`/`data` değişirse
  // invalidateSignature() `signed`ı düşürür ve ekrana "imza geçersiz kılındı"
  // yazar — ama handler elindeki `sig` fotoğrafıyla devam eder ve tx ESKİ
  // fields ile zincire gider. Ekranda "imza geçersiz" yazarken zincire geçerli
  // bir tx gitmesi, bu projenin savunduğu her şeyin canlı çürütülmesidir;
  // Task 7'de bunun ekran kaydı alınacak.
  //
  // Kilitlenince invalidateSignature bu pencerede HİÇ çalışamaz, yani
  // "gönderimi iptal mi edelim, devam mı" ikilemi ortadan kalkar.
  //
  // btnBuildSign de kilitlenir: girdiler kilitli olsa da yeniden imzalamak
  // `signed`ı değiştirir ve aynı pencereyi başka kapıdan açar. İmzalama
  // keygen'i kilitliyor, gönderim imzalamayı — aynı zincir.
  const txInputs = TX_INPUT_IDS.map((id) => document.getElementById(id));
  for (const el of txInputs) el.disabled = true;
  btnBuildSign.disabled = true;
  chainWarn.innerHTML = '';
  sendOut.innerHTML = '<p>Kontroller yapılıyor…</p>';

  try {
    // İMZANIN FOTOĞRAFI — `conn`un imza karşılığı. Akışın tamamı bunu kullanır,
    // `signed`ı değil.
    //
    // Yukarıdaki kilit önlemeye yeter mi? Yetmemeli: kilidi aşan yollar var
    // (tarayıcı konsolu, bir sonraki artımda eklenecek bir buton, kilidi
    // gevşeten bir düzenleme). Önleme ile YAKALAMA ayrı katmanlardır ve bu
    // dosyada `conn` için zaten ikisi birden var.
    const sig = signed;
    const { fields, signature, digest } = sig;

    // KALKAN 1 — nonce. En spesifik mesajı veren kalkan, bu yüzden önde.
    // Hakan da aynı cüzdana tx atıyor; nonce'un imza ile gönderim arasında
    // artması gerçekten olabilecek bir durumdur.
    const freshNonce = await readNonce();
    if (freshNonce !== sig.nonce) {
      throw new Error(
        `nonce değişti (imzalanan: ${sig.nonce}, zincirdeki: ${freshNonce}) — yeniden imzalayın`,
      );
    }

    // KALKAN 2 — canlı digest karşılaştırması. Kontrat MEVCUT on-chain nonce'u
    // kullanır (PQWallet.sol:34), yani bu karşılaştırma ancak kalkan 1
    // geçtikten sonra anlamlıdır. Nonce sebebi elendiğine göre buradaki
    // uyuşmazlığın tek olası açıklaması `fields` sapmasıdır.
    const onChainDigest = await readDigest({ to: fields.to, value: fields.value, data: fields.data });
    if (onChainDigest.toLowerCase() !== digest.toLowerCase()) {
      throw new Error(
        `digest uyuşmuyor — JS: ${digest}, kontrat: ${onChainDigest}. ` +
          'Nonce güncel olduğuna göre sebep `fields` sapmasıdır.',
      );
    }

    // KALKAN 3 — eth_call ön-uçuşu. En genel kalkan, gaz harcamaz.
    // calldata YALNIZCA `fields`'tan kurulur, DOM'dan yeniden okunmaz.
    const calldata = encodeExecute({ ...fields, signature });
    sendOut.innerHTML = '<p>Ön-uçuş (eth_call) yapılıyor… (gaz harcanmaz)</p>';
    await preflight({ signer: conn.signer, calldata });

    // Üç kalkanın ağ çağrıları bitti; gönderimden HEMEN ÖNCE bağlantı yeniden
    // kontrol edilir. Handler'ın başındaki kontrol bu noktada bayattır.
    if (connected !== conn) {
      throw new Error(
        'bağlantı ya da ağ işlem sırasında değişti — cüzdanı yeniden bağlayıp tekrar deneyin. ' +
          'İmzanız hâlâ geçerli, yeniden imzalamanız gerekmiyor.',
      );
    }

    // YAKALAMA — imza da gönderimden HEMEN ÖNCE kontrol edilir, aynı yerde ve
    // aynı gerekçeyle. Kontrolün YAYINDAN ÖNCE durmasının sebebi basit: tx
    // yayınlandıktan sonra iptal diye bir şey yok. Buradan sonrası geri
    // alınamaz, dolayısıyla son söz burada söylenir.
    //
    // "Devam et" bilerek bir seçenek DEĞİL: `signed` düştüyse kullanıcı artık
    // o işlemi istemiyor ya da başka bir şey istiyor demektir; ekranda "imza
    // geçersiz kılındı" yazarken zincire tx göndermek onun görmediği bir karar
    // olur.
    if (signed !== sig) {
      throw new Error(
        'imza işlem sırasında değişti ya da geçersiz kılındı — gönderim iptal edildi, ' +
          'zincire hiçbir şey gitmedi. Alanları kontrol edip yeniden imzalayın.',
      );
    }

    sendOut.innerHTML = '<p>MetaMask onayı bekleniyor…</p>';
    const { hash, receipt, gasLimit, gasEstimated } = await sendExecute({
      signer: conn.signer,
      calldata,
    });

    // Tx zincire yazıldı. BAŞARILI OLDUĞU ANLAMINA GELMEZ — ayırt edici alan
    // receipt.status (1 = başarılı, 0 = revert).
    const url = CONTRACTS.explorerTxBase + hash;
    const gasNote = gasEstimated ? '' : ' — tahmin başarısız oldu, sabit limite düşüldü';
    // Hash ve Etherscan linki HER İKİ YOLDA da gösterilir: revert eden bir tx
    // de zincire yazılmıştır ve kanıttır (jüri Etherscan'den doğrulayabilmeli).
    const receiptHtml = `
      <label>Tx hash</label>
      <div class="field">${esc(hash)}</div>
      <label>Etherscan</label>
      <div class="field"><a href="${esc(url)}" target="_blank" rel="noopener">${esc(url)}</a></div>
      <label>Gas</label>
      <div class="field">${esc(receipt.gasUsed)} kullanıldı (limit: ${esc(gasLimit)}${gasNote})</div>
      <label>Blok</label>
      <div class="field">${esc(receipt.blockNumber)}</div>
    `;

    if (receipt.status === 1) {
      sendOut.innerHTML = `<p class="ok">İşlem zincire gönderildi ve onaylandı.</p>${receiptHtml}`;
      // İmza TÜKETİLDİ: execute() geçtiğine göre kontratın nonce'u arttı
      // (PQWallet.sol:48) ve aynı imza artık hiçbir digest'e uymaz.
      signed = null;
      // …ve txOut bunu SÖYLER. Söylemezse imza bloğu ekranda kalır ve aynı
      // karede "imza üretildi, 3688 bayt" ile "gönderildi ve onaylandı"
      // birlikte görünür — tüketilmiş bir imza hâlâ kullanılabilirmiş gibi.
      // REVERT dalında bu satır BİLEREK yok: orada `signed` KORUNUYOR, imza
      // gerçekten hâlâ geçerli ve blok yeniden kullanılacak.
      txOut.innerHTML = '<p>İmza bu işlemde kullanıldı — yeni işlem için yeniden imzalayın.</p>';
    } else {
      // Ön-uçuş geçtiği hâlde gönderim arasında state değişirse (Hakan aynı
      // cüzdana tx atar, nonce artar, imza geçersizleşir) tx zincirde revert
      // eder. Buraya YEŞİL yazmak, jüriye başarılı gösterilen ama Etherscan'de
      // kırmızı çıkan bir tx demektir — sahnede olabilecek en kötü hata.
      sendOut.innerHTML = `
        <p class="err">İşlem zincire alındı ama REVERT ETTİ (receipt.status = ${esc(receipt.status)}). Harcanan gas iade EDİLMEZ.</p>
        ${receiptHtml}
        <p class="warn">İmzanız hâlâ geçerli, yeniden imzalamanız gerekmiyor: execute() revert ettiyse
        kontratın nonce'u ARTMAMIŞTIR (PQWallet.sol:48 — nonce++ execute()'un içindedir, revert
        tüm state değişikliklerini geri alır).</p>
      `;
      // `signed` KORUNUR — yukarıdaki gerekçe.
    }
    syncSendButtons();

    // Başarı/revert render'ından SONRA ve kendi try/catch'inde. try'ın içinde
    // olsaydı buradaki bir RPC hatası az önce basılan tx kanıtını "Gönderilemedi"
    // ile EZERDİ: gerçek tx atılmış, hash'i ekrandan kaybolmuş olurdu.
    let chainState = null;
    try {
      chainState = await refreshChainState({ quiet: true });
    } catch {
      // refreshChainState kendi hatasını zaten yutuyor; bu catch onun
      // beklenmedik bir şekilde fırlatmasına karşı son settir. Gönderim
      // sonucuna DOKUNMAZ.
      chainWarn.innerHTML =
        '<p class="warn">Zincir göstergesi yenilenemedi. Yukarıdaki işlem sonucu geçerlidir — "Zincirden yenile"ye basın.</p>';
    }

    // REVERT sonrası ZORUNLU teşhis. Kullanıcının ilk refleksi tekrar basmak
    // olacak; sebep nonce'sa kalkan 1 ikinci denemede ucuza yakalar, ama sebep
    // hedef çağrı ya da bakiyeyse ikinci tx de revert eder ve bir gas daha
    // yanar. Cüzdanda 0.002 ETH var — körlemesine ikinci deneme pahalı.
    //
    // Teşhis EKLENİR (innerHTML EZİLMEZ): yukarıdaki tx kanıtı ekranda kalmalı.
    if (receipt.status !== 1) {
      let diagnosis;
      if (chainState) {
        const nonceChanged = chainState.nonce !== sig.nonce;
        diagnosis = `
          <label>Revert sonrası zincir durumu</label>
          <div class="field">zincirdeki nonce: ${esc(chainState.nonce)} · imzalanan nonce: ${esc(sig.nonce)} · bakiye: ${esc(chainState.balance)} wei = ${esc(formatEther(chainState.balance))} ETH</div>
          <p class="warn">${
            nonceChanged
              ? 'Nonce DEĞİŞMİŞ — imzanız bu nonce\'a bağlı olduğu için artık geçmez. Yeniden imzalayın; tekrar göndermeyi denerseniz kalkan 1 zaten durduracak.'
              : 'Nonce AYNI — yani sebep imza değil. Geriye hedef çağrının kendi revert\'i ya da yetersiz bakiye kalıyor (ikisi de "PQWallet: call failed" verir). value değerini bakiyeyle karşılaştırın; körlemesine tekrar göndermeyin, ikinci tx de revert eder ve gas yanar.'
          }</p>
        `;
      } else {
        diagnosis = `
          <p class="warn">Revert sonrası zincir durumu OKUNAMADI — sebebi teşhis edemiyoruz.
          "Zincirden yenile"ye basıp nonce ile bakiyeyi görmeden tekrar göndermeyin: ikinci tx de
          revert ederse bir gas daha yanar.</p>
        `;
      }
      sendOut.insertAdjacentHTML('beforeend', diagnosis);
    }
  } catch (e) {
    // Kullanıcının MetaMask'te iptal etmesi bir HATA değil — kırmızı hata
    // metni göstermek demoda gereksiz panik yaratır.
    if (e.code === 'ACTION_REJECTED') {
      sendOut.innerHTML =
        '<p class="warn">İşlem MetaMask\'te iptal edildi. İmza hâlâ geçerli, tekrar gönderebilirsiniz.</p>';
    } else {
      // ethers revert sebebini `reason` alanında verir (kontrattaki require
      // string'i: "PQWallet: invalid signature"); yoksa message'a düşülür.
      const reason = e.reason ?? e.shortMessage ?? e.message;
      // sendExecute, tx gönderildikten SONRA oluşan hatalara hash'i iliştirir
      // (onay beklerken ağ hatası/timeout). O tx zincirde OLABİLİR; hash'ini
      // yutmak, akıbeti bilinmeyen gerçek bir tx'i kaybetmek demektir.
      const sentHtml = e.txHash
        ? `
      <p class="warn">İşlem gönderildi ama sonucu doğrulanamadı — zincirde gerçekleşmiş OLABİLİR.
      Tekrar göndermeden önce Etherscan'den durumunu kontrol edin.</p>
      <label>Tx hash</label>
      <div class="field">${esc(e.txHash)}</div>
      <label>Etherscan</label>
      <div class="field"><a href="${esc(CONTRACTS.explorerTxBase + e.txHash)}" target="_blank" rel="noopener">${esc(CONTRACTS.explorerTxBase + e.txHash)}</a></div>
    `
        : '';
      // Başlık, hash'in varlığına göre değişir: hash varsa tx GÖNDERİLDİ ve
      // "Gönderilemedi" demek yanlış olur — kullanıcı tx'in hiç çıkmadığını
      // sanıp tekrar gönderir, aynı nonce'a ikinci bir tx daha yollar.
      const headline = e.txHash ? 'Gönderim sonrası hata' : 'Gönderilemedi';
      sendOut.innerHTML = `<p class="err">${headline}: ${esc(reason)}</p>${sentHtml}`;
    }
    // Kilit tek kaynaktan: imza hâlâ duruyorsa buton açılır, tüketildiyse
    // açılmaz. BUTONLAR için koşulsuz `= false` YOK.
    syncSendButtons();
  } finally {
    // Girdi kilidi burada açılır ve burada açılması DOĞRUDUR: butonlardan
    // farklı olarak girdilerin state'e bağlı bir sahibi yok. Kilidin tek
    // sebebi "bir gönderim akışı sürüyor"du; akış bitti, sebep kalktı.
    // Task 3'ün imzalama finally'si de tam olarak bunu yapıyor.
    //
    // Butonlar BURAYA KONMAZ — onların sahibi state (syncSendButtons).
    for (const el of txInputs) el.disabled = false;
    btnBuildSign.disabled = false;
  }
});

// ── NEGATİF KANIT ───────────────────────────────────────────────────────────
//
// "Transfer geçti" tek başına imzanın DOĞRULANDIĞINI kanıtlamaz. Şüpheci bir
// jüri üyesi "imza gerçekten kontrol ediliyor mu, yoksa kod onu yok mu
// sayıyor?" diye sorabilir ve haklıdır: doğrulamayı hiç çağırmayan bir
// execute() de aynı yeşil ekranı üretirdi. Bir baytı bozulmuş imzayla eth_call
// yapıp kontratın REDDETTİĞİNİ gösteriyoruz. Gaz harcanmaz.
btnNegativeProof.addEventListener('click', async () => {
  if (!signed) {
    sendOut.innerHTML = '<p class="err">Önce imzalayın.</p>';
    return;
  }
  // Bağlantının fotoğrafı — gerekçe btnSend'dekiyle aynı (bkz. yukarısı).
  // Burada ayrıca bir kanıt bütünlüğü işi görür: çağrının PQWallet'a mı
  // gittiğini akış SONUNDA `connected !== conn` ile sorgulayabiliyoruz.
  const conn = connected;
  if (!conn) {
    sendOut.innerHTML = '<p class="err">Önce cüzdanı bağlayın.</p>';
    return;
  }

  // İŞ-SÜRERKEN kilidi; gerekçe gönderim handler'ındaki blokla aynı. Buradaki
  // asıl risk btnSend: negatif kanıtın eth_call'ı sürerken gönderime basılırsa
  // iki akış aynı sendOut'a yazar ve hangisinin kazandığı zamanlamaya kalır.
  btnSend.disabled = true;
  btnNegativeProof.disabled = true;
  chainWarn.innerHTML = '';
  sendOut.innerHTML = '<p>Bozuk imzayla ön-uçuş yapılıyor… (gaz harcanmaz)</p>';

  // İmzanın da fotoğrafı. Sonuç yazılmadan önce hâlâ AYNI imzayı mı
  // gösteriyoruz diye sorulacak.
  //
  // Neden gerekli — ÖLÇÜLDÜ: eth_call sürerken kullanıcı tx-to/value/data
  // alanlarını değiştirirse invalidateSignature() imzayı düşürüyor ve
  // sendOut'a "Değerler değişti — imza geçersiz kılındı" yazıyor. Bu kontrol
  // yokken çağrı bitince handler O UYARIYI EZİP yerine yeşil "✓ Kontrat bozuk
  // imzayı reddetti … 'Zincire gönder' hâlâ kullanılabilir" basıyordu — oysa
  // imza artık YOK ve gönder butonu kapalı. Kullanıcı ekranda yeşil görür,
  // butonun neden kapalı olduğunu anlayamaz, uyarıyı hiç görmez.
  //
  // Kilit doğruydu (syncSendButtons kapatmıştı); yanlış olan EKRANDI. Task
  // 3'teki "ekranda yeni değerler, calldata'da eski fields" hatasının kardeşi:
  // gösterilen sonuç, artık var olmayan bir state'e ait.
  const sigSnapshot = signed;
  const showResult = (html) => {
    if (signed !== sigSnapshot) {
      sendOut.innerHTML =
        '<p class="warn">Değerler çağrı sırasında değişti — imza geçersiz kılındı. Az önceki negatif kanıt artık BAYAT (silinmiş imzaya ait), bu yüzden gösterilmiyor. Yeniden imzalayıp tekrar deneyin.</p>';
      return;
    }
    sendOut.innerHTML = html;
  };

  try {
    // DİKKAT: bozma ve calldata kurma buraya AÇILMAZ. buildNegativeProofCalldata
    // `signed`'ı yalnızca OKUR; burada `signed.signature = tamperSignature(...)`
    // gibi bir atama yapılırsa saklanan gerçek imza bozulur ve ardından
    // "Zincire gönder"e basan kullanıcı bozuk imzayı zincire yollar. O
    // fonksiyonun state'i bozmadığı otomatik testle sabitlenmiş durumda
    // (pqwallet-test.mjs — anlık görüntü signature'ı VE fields'ı kapsıyor).
    const badCalldata = buildNegativeProofCalldata(signed);
    await preflight({ signer: conn.signer, calldata: badCalldata });

    // Buraya düşmek "kontrat bozuk imzayı KABUL ETTİ" demek — ama yalnızca
    // çağrı gerçekten PQWallet'a gittiyse. Kullanıcı akışın ortasında MetaMask'i
    // başka bir ağa alırsa eth_call, o ağda PQWallet'ın BULUNMADIĞI bir adrese
    // gider: kod yok, revert yok, dönen değer boş (0x). Sessizlik buraya
    // düşürür. O sessizliği "güvenlik bulgusu" diye basmak, sahnede alınabilecek
    // en kötü yanlış alarmdır — bu yüzden önce bağlantı sorgulanır.
    if (connected !== conn) {
      showResult(`
        <p class="neutral">Kanıt ALINAMADI — bağlantı ya da ağ çağrı sırasında değişti.</p>
        <p class="warn">eth_call başka bir ağa gitmiş olabilir; orada PQWallet bulunmadığı için
        çağrı revert etmeden boş döner. Bu, kontratın bozuk imzayı kabul ettiği anlamına GELMEZ.
        Cüzdanı Sepolia'ya alıp yeniden bağlayın ve tekrar deneyin.</p>
        <p class="warn">Gaz harcanmadı (eth_call). Saklanan gerçek imza değişmedi.</p>
      `);
    } else {
      showResult(`
        <p class="err">BEKLENMEYEN: bozuk imza reddedilmedi — eth_call revert etmeden döndü.</p>
        <p class="warn">Bu bir GÜVENLİK BULGUSUDUR, araştırın: bağlantı ve ağ çağrı boyunca
        değişmedi, yani çağrı Sepolia'daki PQWallet'a gitti ve kontrat bir baytı bozulmuş
        imzayı kabul etti. Zincire işlem GÖNDERMEYİN.</p>
      `);
    }
  } catch (e) {
    // ÜÇ YOL: kontrat reddetti / kontrat başka bir şey dedi / kontrata
    // ulaşılamadı. Ayrımın gerekçesi ve kuralı sendTransaction.js'te
    // (classifyNegativeProofError) — saf olduğu için node'dan test edilebiliyor.
    const { outcome, reason, why } = classifyNegativeProofError(e);

    // Her üç yolda da doğru: eth_call gaz harcamaz ve calldata `signed`ın
    // KOPYASINDAN kuruldu.
    const footer =
      '<p class="warn">Gaz harcanmadı (eth_call). Saklanan gerçek imza değişmedi — "Zincire gönder" hâlâ kullanılabilir.</p>';
    const reasonHtml = `
      <label>${outcome === 'unavailable' ? 'Hata' : 'Kontratın döndürdüğü sebep'}</label>
      <div class="field">${esc(reason)}</div>
    `;

    if (outcome === 'rejected') {
      showResult(`
        <p class="ok">✓ Kontrat bozuk imzayı reddetti — imza gerçekten doğrulanıyor.</p>
        ${reasonHtml}
        <p class="warn">Metin kontrattan geldi (PQWallet.sol:44'teki require string'i), UI'dan değil.</p>
        ${footer}
      `);
    } else if (outcome === 'unexpected-revert') {
      showResult(`
        <p class="finding">Kontrat reddetti, ama BEKLENEN mesaj değil — bulgu adayı.</p>
        ${reasonHtml}
        <p class="warn">Kontrat cevap verdi (revert verisi çözüldü), yani ağ sorunu değil.
        Beklenen: "${esc(INVALID_SIGNATURE_REASON)}". Başka bir require daha önce devreye girmiş
        olabilir; negatif kanıt bu haliyle imza doğrulamasını kanıtlamaz. İnceleyin.</p>
        ${footer}
      `);
    } else {
      // GRİ — ne yeşil ne kırmızı. Kontrat cevap vermedi; kanıt YOK, olumsuz
      // kanıt da yok. İki alt sebep ayrı metin istiyor: "ulaşılamadı" ile
      // "ulaşıldı ama sebep verisi gelmedi" farklı şeyleri düzelttirir.
      const detail =
        why === 'no-revert-data'
          ? 'Çağrıdan sebep verisi gelmedi, yani kontratın NE dediğini okuyamıyoruz. MetaMask üzerinden gelen AĞ ve RPC hataları da buraya düşüyor (ölçüldü — ethers hepsini "missing revert data" diye sarıyor), bu yüzden en olası sebep bağlantıdır. Cüzdanın ağını ve internet bağlantısını kontrol edip tekrar deneyin.'
          : 'Çağrı kontrata hiç ulaşmadı (ağ ya da RPC hatası). Kontratın bozuk imza karşısında ne yaptığı hakkında bu sonuç hiçbir şey söylemez.';
      showResult(`
        <p class="neutral">Kanıt ALINAMADI — kontrat cevap vermedi.</p>
        ${reasonHtml}
        <p class="warn">${esc(detail)}</p>
        ${footer}
      `);
    }
  } finally {
    // İş-sürerken kilidi kalkar, kilit TEK KAYNAĞA geri döner. Brief burada
    // koşulsuz `btnNegativeProof.disabled = false` yazıyordu; o satır Task 5
    // SAPMA 2 ile doğrudan çelişir ve kapatılan deliği geri açardı: eth_call
    // sürerken kullanıcı tx-to/value/data alanlarını değiştirirse
    // invalidateSignature() imzayı düşürür, ama koşulsuz açma butonu imzasız
    // durumda tıklanabilir bırakırdı. Aynı hata bu kod tabanında iki kez
    // yaşandı (btnKeygen — Task 3B, btnSend — Task 5); üçüncüsü olmasın.
    syncSendButtons();
  }
});


