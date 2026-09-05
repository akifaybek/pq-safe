import { generateNewMnemonic, keygen, signDigest, C13_SIG_BYTES } from './crypto/signer.js';
import { checkSepoliaConnection } from './network/sepolia.js';
import { formatEther } from 'ethers';
import { buildAndSign } from './tx/buildTransaction.js';
import { CONTRACTS } from './config/contracts.js';
import { readNonce, readBalance } from './contracts/pqwallet.js';

// Hata mesajları kullanıcının girdiği ham değeri içeriyor (hangi alanın
// hatalı olduğunu söylemek için) ve innerHTML ile basılıyor. Sayfa aynı
// zamanda mnemonic'i DOM'a yazdığı için kaçış şart.
const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

let currentMnemonic = null;
let currentKeys = null;

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
      <div class="field">${currentMnemonic}</div>
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
  } catch (e) {
    signOut.innerHTML = `<p class="err">Hata: ${esc(e.message)}</p>`;
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
  const btnKeygen = document.getElementById('btn-keygen');
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
  } catch (e) {
    signed = null;
    btnSend.disabled = true;
    btnNegativeProof.disabled = true;
    txOut.innerHTML = `<p class="err">Hata: ${esc(e.message)}</p>`;
  } finally {
    btnBuildSign.disabled = false;
    btnKeygen.disabled = false;
    for (const el of txInputs) el.disabled = false;
  }
});
