import { generateNewMnemonic, keygen, signDigest, C13_SIG_BYTES } from './crypto/signer.js';
import { checkSepoliaConnection } from './network/sepolia.js';
import { formatEther } from 'ethers';
import { buildAndSign } from './tx/buildTransaction.js';

// Hata mesajları kullanıcının girdiği ham değeri içeriyor (hangi alanın
// hatalı olduğunu söylemek için) ve innerHTML ile basılıyor. Sayfa aynı
// zamanda mnemonic'i DOM'a yazdığı için kaçış şart.
const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

let currentMnemonic = null;
let currentKeys = null;

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
  txOut.innerHTML = '<p>Digest hesaplanıyor ve imzalanıyor… (~7-8 sn)</p>';
  try {
    const weiValue = document.getElementById('tx-value').value.trim();
    const { domainSeparator, digest, fields, signature, sigBytes, signMs } = await buildAndSign({
      walletAddress: document.getElementById('tx-wallet').value.trim(),
      to: document.getElementById('tx-to').value.trim(),
      value: weiValue,
      nonce: document.getElementById('tx-nonce').value.trim(),
      data: document.getElementById('tx-data').value.trim(),
      mnemonic: currentMnemonic,
    });
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
    txOut.innerHTML = `<p class="err">Hata: ${esc(e.message)}</p>`;
  } finally {
    btnBuildSign.disabled = false;
    btnKeygen.disabled = false;
  }
});
