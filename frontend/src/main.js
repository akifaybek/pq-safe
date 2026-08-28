import { generateNewMnemonic, keygen, signDigest } from './crypto/signer.js';
import { checkSepoliaConnection } from './network/sepolia.js';

let currentMnemonic = null;
let currentKeys = null;

const keygenOut = document.getElementById('keygen-out');
const signOut = document.getElementById('sign-out');

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
    keygenOut.innerHTML = `<p class="err">Hata: ${e.message}</p>`;
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
    const lengthOk = sigBytes === 3688;
    signOut.innerHTML = `
      <label>İmza (${sigBytes} bayt)</label>
      <div class="field">${signature}</div>
      <p class="${lengthOk ? 'ok' : 'err'}">${lengthOk ? '✓ imza uzunluğu 3688 bayt (C13 beklenen)' : '✗ beklenmeyen uzunluk'}</p>
      <p class="ok">sign tamamlandı (${ms} ms)</p>
    `;
  } catch (e) {
    signOut.innerHTML = `<p class="err">Hata: ${e.message}</p>`;
  }
});

const connectionOut = document.getElementById('connection-out');

document.getElementById('btn-check-connection').addEventListener('click', async () => {
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
    connectionOut.innerHTML = `<p class="err">Hata: ${e.message}</p>`;
  }
});
