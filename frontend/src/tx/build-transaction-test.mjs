// buildDigest() doğrulaması. Beklenen değerler Foundry `cast` ile bağımsız
// olarak üretildi (bkz. docs/evidence/crypto-tests/sprint2-js-digest-function.md),
// yani bu, kendi kodunu kendine onaylatan bir test değil.
//
// buildAndSign() burada test EDİLMİYOR: signer.js web WASM build'ini
// (wasm-pkg-web) kullanıyor, node'da init() "fetch failed" ile patlıyor.
// Onun doğrulaması tarayıcıda yapılır (bkz. plan Task 2).

import { buildDigest } from './buildTransaction.js';

const WALLET = '0x1234567890123456789012345678901234567890';
const TO = '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd';

let failures = 0;

function check(name, actual, expected) {
  if (actual === expected) {
    console.log(`✓ ${name}`);
  } else {
    failures++;
    console.error(`✗ ${name}\n    beklenen: ${expected}\n    gelen   : ${actual}`);
  }
}

function checkThrows(name, fn, expectedFragment) {
  try {
    fn();
    failures++;
    console.error(`✗ ${name}: hata bekleniyordu, fırlatılmadı`);
  } catch (e) {
    if (e.message.includes(expectedFragment)) {
      console.log(`✓ ${name} → "${e.message}"`);
    } else {
      failures++;
      console.error(`✗ ${name}\n    mesaj "${expectedFragment}" içermeliydi\n    gelen: ${e.message}`);
    }
  }
}

console.log('=== buildDigest testi (beklenen değerler: Foundry cast) ===\n');

console.log('--- Test 1: boş data ---');
const t1 = buildDigest({ walletAddress: WALLET, nonce: 0, to: TO, value: '1000000000000000000', data: '0x' });
check('DOMAIN_SEPARATOR', t1.domainSeparator, '0x8110c08d40ffb855149f3c041e89e6071a71c5f337ca317b9c24aea9da98e6a5');
check('digest', t1.digest, '0x417663f38b52fec7f71d3fb178fed03ac2559af424c9a01b72f65f23553a4746');

console.log('\n--- Test 2: dolu data, farklı nonce/value ---');
const t2 = buildDigest({ walletAddress: WALLET, nonce: 5, to: TO, value: 42, data: '0xdeadbeef' });
check('digest', t2.digest, '0xc9463c6053d8c0e0573012df0e7f5ab40fd74ffdbc840a65b3be0bd7b332ec29');

console.log('\n--- Test 3: küçük harfli adres, checksum ile aynı digest ---');
const t3 = buildDigest({ walletAddress: WALLET.toLowerCase(), nonce: 0, to: TO.toLowerCase(), value: '1000000000000000000', data: '0x' });
check('digest', t3.digest, t1.digest);

console.log('\n--- Test 4: boş data alanı 0x sayılmalı ---');
const t4 = buildDigest({ walletAddress: WALLET, nonce: 0, to: TO, value: '1000000000000000000', data: '' });
check('digest', t4.digest, t1.digest);

console.log('\n--- Test 5: alan adıyla hata mesajları ---');
checkThrows('geçersiz to adresi', () => buildDigest({ walletAddress: WALLET, nonce: 0, to: '0xzzz', value: 0, data: '0x' }), 'to alanı');
checkThrows('geçersiz cüzdan adresi', () => buildDigest({ walletAddress: 'abc', nonce: 0, to: TO, value: 0, data: '0x' }), 'PQWallet adresi alanı');
checkThrows('negatif value', () => buildDigest({ walletAddress: WALLET, nonce: 0, to: TO, value: -1, data: '0x' }), 'value alanı negatif olamaz');
checkThrows('geçersiz nonce', () => buildDigest({ walletAddress: WALLET, nonce: 'x', to: TO, value: 0, data: '0x' }), 'nonce alanı');
checkThrows('bozuk hex data', () => buildDigest({ walletAddress: WALLET, nonce: 0, to: TO, value: 0, data: '0xabc' }), 'data alanı');

console.log('\n--- Test 6: boş/eksik sayısal alan sessizce 0 olmamalı ---');
checkThrows('nonce hiç verilmemiş', () => buildDigest({ walletAddress: WALLET, to: TO, value: 0, data: '0x' }), 'nonce alanı boş bırakılamaz');
checkThrows('nonce null', () => buildDigest({ walletAddress: WALLET, nonce: null, to: TO, value: 0, data: '0x' }), 'nonce alanı boş bırakılamaz');
checkThrows('value boş string', () => buildDigest({ walletAddress: WALLET, nonce: 0, to: TO, value: '', data: '0x' }), 'value alanı boş bırakılamaz');
checkThrows('value sadece boşluk', () => buildDigest({ walletAddress: WALLET, nonce: 0, to: TO, value: '   ', data: '0x' }), 'value alanı boş bırakılamaz');

console.log('\n--- Test 7: uint256 üst sınırı ---');
checkThrows('value 2^256', () => buildDigest({ walletAddress: WALLET, nonce: 0, to: TO, value: (2n ** 256n).toString(), data: '0x' }), 'value alanı uint256 sınırını aşıyor');
checkThrows('nonce 2^256', () => buildDigest({ walletAddress: WALLET, nonce: (2n ** 256n).toString(), to: TO, value: 0, data: '0x' }), 'nonce alanı uint256 sınırını aşıyor');

console.log('\n--- Test 8: uint256 sınır değeri kabul edilmeli ---');
const tMax = buildDigest({ walletAddress: WALLET, nonce: ((1n << 256n) - 1n).toString(), to: TO, value: 0, data: '0x' });
check('uint256 max nonce kabul edildi', typeof tMax.digest, 'string');

console.log(failures === 0 ? '\nTÜM TESTLER GEÇTİ' : `\n${failures} TEST BAŞARISIZ`);
process.exit(failures === 0 ? 0 : 1);
