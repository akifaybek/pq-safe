// Node testi. Çalıştırma: cd frontend && node src/contracts/pqwallet-test.mjs
// Canlı Sepolia'ya bağlanır — ağ gerekir.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JsonRpcProvider } from 'ethers';
import { CONTRACTS } from '../config/contracts.js';
import { readNonce, readBalance, readDigest } from './pqwallet.js';

// frontend/.env'den RPC URL'i oku (Vite'ın import.meta.env'i Node'da yok).
const envText = readFileSync(new URL('../../.env', import.meta.url), 'utf8');
const rpcUrl = envText.match(/^VITE_SEPOLIA_RPC_URL=(.*)$/m)?.[1]?.trim();
assert.ok(rpcUrl, 'frontend/.env içinde VITE_SEPOLIA_RPC_URL olmalı');
const provider = new JsonRpcProvider(rpcUrl);

let passed = 0;
const ok = (msg) => { console.log(`✓ ${msg}`); passed++; };

console.log('=== pqwallet.js — canlı zincir okuma ===');

const nonce = await readNonce(provider);
assert.equal(typeof nonce, 'bigint', 'readNonce bigint döndürmeli');
ok(`readNonce() = ${nonce}`);

const balance = await readBalance(provider);
assert.equal(typeof balance, 'bigint', 'readBalance bigint döndürmeli');
ok(`readBalance() = ${balance} wei`);

// Kontratın kendi _computeDigest'i, mevcut on-chain nonce'u kullanır.
const digest = await readDigest(
  { to: '0x7268a7c3d52baa50486930e6ed25d29804d075b6', value: 1000000000000000n, data: '0x' },
  provider,
);
assert.match(digest, /^0x[0-9a-f]{64}$/, 'readDigest 32 baytlık hex döndürmeli');
ok(`readDigest() = ${digest}`);

console.log(`\n=== ${passed} assertion geçti ===`);
