// Sprint 0 risk testi — @noble/post-quantum'un slh-dsa API'sinin nasıl davrandığını,
// seed/anahtar üretim mekaniğini ve performansını doğrulamak için.
//
// ÖNEMLİ: Bu test @noble/post-quantum'un dışa verdiği STANDART FIPS 205 seti
// (slh_dsa_sha2_128f) ile çalışır — bizim projede dondurulmuş hedef olan
// SLH-DSA-SHA2-128-24 (Consigny'nin özel varyantı, h=22 d=1 a=24 k=6 w=4)
// DEĞİL. @noble/post-quantum bu özel varyantı desteklemiyor (bkz. konsol
// çıktısındaki not). Bu test sadece kütüphanenin genel API/seed/performans
// davranışını ölçmek için "128f" standart setini kullanıyor.

import { slh_dsa_sha2_128f } from '@noble/post-quantum/slh-dsa.js';
import { randomBytes } from '@noble/post-quantum/utils.js';

console.log('=== 1. API şekli ===');
console.log('slh_dsa_sha2_128f exports:', Object.keys(slh_dsa_sha2_128f));

console.log('\n=== 2. Seed testi: keygen dışarıdan seed alıyor mu? ===');
// noble/post-quantum'un slh-dsa keygen fonksiyonu imzasına bakıyoruz.
console.log('keygen.length (parametre sayısı):', slh_dsa_sha2_128f.keygen.length);
try {
  const fixedSeed = new Uint8Array(48).fill(7); // slh-dsa seed genelde N*3 bayt (128f: N=16 -> 48 bayt)
  const kp1 = slh_dsa_sha2_128f.keygen(fixedSeed);
  const kp2 = slh_dsa_sha2_128f.keygen(fixedSeed);
  const same = Buffer.from(kp1.secretKey).equals(Buffer.from(kp2.secretKey));
  console.log('Aynı seed -> aynı secretKey mi?', same);
  console.log('SONUÇ: Kütüphane DIŞARIDAN SEED KABUL EDİYOR (deterministik keygen mümkün).');
  console.log('secretKey uzunluğu:', kp1.secretKey.length, 'publicKey uzunluğu:', kp1.publicKey.length);
} catch (e) {
  console.log('Sabit seed ile çağrı hata verdi:', e.message);
  console.log('SONUÇ: keygen() muhtemelen seed kabul etmiyor / farklı bir imza bekliyor, kod incelenmeli.');
}

console.log('\n=== 3. Temel keygen/sign/verify akışı (rastgele anahtar) ===');
const seed = randomBytes(48);
const { secretKey, publicKey } = slh_dsa_sha2_128f.keygen(seed);
const msg = new TextEncoder().encode('PQ-SAFE test mesajı');
const sig = slh_dsa_sha2_128f.sign(msg, secretKey);
const ok = slh_dsa_sha2_128f.verify(sig, msg, publicKey);
const wrongMsg = new TextEncoder().encode('PQ-SAFE test mesaji (degistirildi)');
const okWrong = slh_dsa_sha2_128f.verify(sig, wrongMsg, publicKey);
console.log('secretKey:', secretKey.length, 'bayt | publicKey:', publicKey.length, 'bayt | signature:', sig.length, 'bayt');
console.log('Doğru mesajla verify:', ok, '(true olmalı)');
console.log('Yanlış mesajla verify:', okWrong, '(false olmalı)');

console.log('\n=== 4. Performans testi (Node.js — tarayıcı değil, ama kaba fikir verir) ===');
const N_RUNS = 5;
let keygenTimes = [];
let signTimes = [];
let verifyTimes = [];
let lastKp, lastSig;

for (let i = 0; i < N_RUNS; i++) {
  const t0 = performance.now();
  lastKp = slh_dsa_sha2_128f.keygen(randomBytes(48));
  keygenTimes.push(performance.now() - t0);

  const t1 = performance.now();
  lastSig = slh_dsa_sha2_128f.sign(msg, lastKp.secretKey);
  signTimes.push(performance.now() - t1);

  const t2 = performance.now();
  slh_dsa_sha2_128f.verify(lastSig, msg, lastKp.publicKey);
  verifyTimes.push(performance.now() - t2);
}

const avg = (arr) => (arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(1);
console.log(`keygen avg: ${avg(keygenTimes)} ms  (${N_RUNS} çalıştırma)`);
console.log(`sign   avg: ${avg(signTimes)} ms`);
console.log(`verify avg: ${avg(verifyTimes)} ms`);

console.log('\n=== ÖNEMLİ NOT ===');
console.log('Bu ölçümler "128f" standart FIPS 205 setiyle yapıldı, bizim projenin');
console.log('dondurulmuş hedefi SLH-DSA-SHA2-128-24 (Consigny varyantı) DEĞİL.');
console.log('@noble/post-quantum bu özel varyantı desteklemiyor — bkz. Akif\'in raporu.');
