import { generateNewMnemonic, keygen, signDigest, C13_SIG_BYTES } from './crypto/signer.js';
import { checkSepoliaConnection } from './network/sepolia.js';
import { formatEther } from 'ethers';
import { buildAndSign } from './tx/buildTransaction.js';
import { CONTRACTS } from './config/contracts.js';
import { readNonce, readBalance, readOwnerPublicKey } from './contracts/pqwallet.js';

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

const walletDisplay = document.getElementById('tx-wallet-display');
const nonceDisplay = document.getElementById('tx-nonce-display');
const balanceDisplay = document.getElementById('tx-balance-display');
const sendOut = document.getElementById('send-out');
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

// İmzadan sonra girdileri değiştirmek, üç kalkanın da GÖREMEDİĞİ bir hata
// modu: calldata fields'tan kurulduğu için tx eski değerlere gider, ama
// ekranda yeni değerler yazar. Nonce doğru, digest karşılaştırması uyuşur
// (ikisi de eski fields'tan), ön-uçuş geçer — her şey yeşil, kullanıcı
// yanlış bilgiye bakıyor. Bu yüzden herhangi bir değişiklik imzayı düşürür.
function invalidateSignature() {
  if (!signed) return;
  signed = null;
  btnSend.disabled = true;
  btnNegativeProof.disabled = true;
  sendOut.innerHTML = '<p class="warn">Değerler değişti — imza geçersiz kılındı, yeniden imzalayın.</p>';
}

for (const id of TX_INPUT_IDS) {
  document.getElementById(id).addEventListener('input', invalidateSignature);
}

async function refreshChainState() {
  btnRefreshChain.disabled = true;
  nonceDisplay.textContent = 'okunuyor…';
  balanceDisplay.textContent = 'okunuyor…';
  try {
    const [n, b] = await Promise.all([readNonce(), readBalance()]);
    chainNonce = n;
    nonceDisplay.textContent = String(n);
    balanceDisplay.textContent = `${b} wei = ${formatEther(b)} ETH`;
  } catch (e) {
    nonceDisplay.textContent = '—';
    balanceDisplay.textContent = '—';
    sendOut.innerHTML = `<p class="err">Zincir okunamadı: ${esc(e.message)}</p>`;
  } finally {
    btnRefreshChain.disabled = false;
  }
}

btnRefreshChain.addEventListener('click', refreshChainState);
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
    if (chainNonce === null) {
      throw new Error('nonce henüz okunmadı — "Zincirden yenile"ye basın');
    }
    const { domainSeparator, digest, fields, signature, sigBytes, signMs } = await buildAndSign({
      walletAddress: CONTRACTS.pqWallet,
      to: document.getElementById('tx-to').value.trim(),
      value: document.getElementById('tx-value').value.trim(),
      nonce: chainNonce,
      data: document.getElementById('tx-data').value.trim(),
      mnemonic: currentMnemonic,
    });
    signed = { digest, signature, fields, nonce: chainNonce };
    btnSend.disabled = false;
    btnNegativeProof.disabled = false;
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
    btnSend.disabled = true;
    btnNegativeProof.disabled = true;
    // SABİT mesaj — gerekçe yukarıdaki btn-sign catch'iyle aynı: buildAndSign
    // currentMnemonic'i signDigest'e, o da WASM'a veriyor.
    // BEDELİ BİLEREK ÖDENİYOR: bu catch buildTransaction.js'in alan
    // doğrulama hatalarını da (`to alanı geçerli bir adres değil: …`) ve
    // "nonce henüz okunmadı" uyarısını da yutuyor. Task 5, ön-uçuş revert
    // metinleriyle birlikte teşhisi geri getirecek — o iş yapılana kadar
    // hata ayıklarken tarayıcı debugger'ı kullanın, burayı gevşetmeyin.
    txOut.innerHTML =
      '<p class="err">İşlem oluşturulamadı veya imzalanamadı. Alanları kontrol edin ve "Zincirden yenile"ye bastığınızdan emin olun. (Ayrıntı güvenlik gereği gösterilmiyor.)</p>';
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
