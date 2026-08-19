import { createRequire } from 'node:module';
import assert from 'node:assert/strict';

const require = createRequire(import.meta.url);
const signer = require('./wasm-pkg/sphincs_c13_signer.js');

const TEST_MNEMONIC =
  'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
const TEST_MESSAGE_HEX =
  '0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef';
const EXPECTED_SIG_BYTES = 3688;

console.log('=== WASM signer testi (C13, signer-wasm) ===');
console.log('Not: aşağıdaki mnemonic bilinen bir BIP-39 test vektörüdür, gizli/gerçek bir anahtar DEĞİLDİR.');
console.log(`Mnemonic: ${TEST_MNEMONIC}`);

console.log('\n--- 1. keygen_from_mnemonic ---');
const t0 = Date.now();
const keygenResultJson = signer.keygen_from_mnemonic(TEST_MNEMONIC, '');
const t1 = Date.now();
const keygenResult = JSON.parse(keygenResultJson);
console.log('pkSeed (seed):', keygenResult.seed);
console.log('pkRoot (root):', keygenResult.root);
console.log('ecdsa_address:', keygenResult.ecdsa_address);
console.log(`keygen süresi: ${t1 - t0} ms`);

const publicKey =
  keygenResult.seed.replace(/^0x/, '') + keygenResult.root.replace(/^0x/, '');
console.log(
  `publicKey (pkSeed‖pkRoot, ${publicKey.length / 2} bayt, SPHINCSVerifier.sol formatı):`,
  `0x${publicKey}`,
);
assert.equal(publicKey.length, 128, 'publicKey 64 bayt (128 hex karakter) olmalı');

console.log('\n--- 2. sign_from_mnemonic ---');
console.log('Mesaj:', TEST_MESSAGE_HEX);
const t2 = Date.now();
const signatureHex = signer.sign_from_mnemonic(TEST_MNEMONIC, '', TEST_MESSAGE_HEX);
const t3 = Date.now();
console.log(`sign süresi: ${t3 - t2} ms`);

const sigBytes = (signatureHex.length - 2) / 2;
console.log(`İmza uzunluğu: ${sigBytes} bayt`);
assert.equal(
  sigBytes,
  EXPECTED_SIG_BYTES,
  `İmza ${EXPECTED_SIG_BYTES} bayt olmalı, ${sigBytes} bulundu`,
);

console.log('\n=== SONUÇ: keygen + sign başarılı, imza uzunluğu doğrulandı ===');
