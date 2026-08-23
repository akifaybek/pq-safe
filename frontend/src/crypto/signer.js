// C13 WASM signer'ı (contracts/lib/sphincs-minus/signer-wasm) tarayıcıya bağlayan
// ince katman. Kriptografik mantığın kendisi WASM tarafında (Rust) — burada
// sadece init + mnemonic üretimi var.

import init, { keygen_from_mnemonic, sign_from_mnemonic } from './wasm-pkg-web/sphincs_c13_signer.js';
import { generateMnemonic, validateMnemonic } from 'bip39';
import { Buffer } from 'buffer';

// bip39 Node'un global Buffer'ını varsayıyor (browser field/ESM yok), tarayıcıda
// polyfill etmezsek "Buffer is not defined" ile patlıyor.
if (typeof globalThis.Buffer === 'undefined') {
  globalThis.Buffer = Buffer;
}

let initialized = false;

export async function ensureWasmInit() {
  if (!initialized) {
    await init();
    initialized = true;
  }
}

// 12 kelimelik (128-bit entropi) BIP-39 mnemonic üretir. Sadece anahtar
// türetmenin girdisi — WASM tarafındaki keygen_from_mnemonic aynı BIP-39
// standardını kullanarak sk_seed'i türetir (bkz. signer-wasm/src/keygen.rs).
export function generateNewMnemonic() {
  const mnemonic = generateMnemonic(128);
  if (!validateMnemonic(mnemonic)) {
    throw new Error('mnemonic üretimi başarısız (validateMnemonic false döndü)');
  }
  return mnemonic;
}

export async function keygen(mnemonic, passphrase = '') {
  await ensureWasmInit();
  const json = keygen_from_mnemonic(mnemonic, passphrase);
  const { seed, root, ecdsa_address } = JSON.parse(json);
  return {
    pkSeed: seed,
    pkRoot: root,
    ecdsaAddress: ecdsa_address,
    publicKey: '0x' + seed.replace(/^0x/, '') + root.replace(/^0x/, ''),
  };
}

export async function signDigest(mnemonic, digestHex, passphrase = '') {
  await ensureWasmInit();
  const signature = sign_from_mnemonic(mnemonic, passphrase, digestHex);
  const sigBytes = (signature.length - 2) / 2;
  return { signature, sigBytes };
}
