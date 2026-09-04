// Node testi. Çalıştırma: cd frontend && node src/contracts/pqwallet-test.mjs
// Canlı Sepolia'ya bağlanır — ağ gerekir.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JsonRpcProvider } from 'ethers';
import { CONTRACTS } from '../config/contracts.js';
import { readNonce, readBalance, readDigest, encodeExecute, tamperSignature, buildNegativeProofCalldata } from './pqwallet.js';

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

console.log('\n=== saf yardımcılar ===');

const SAMPLE = {
  to: '0x7268a7c3d52baa50486930e6ed25d29804d075b6',
  value: 1000000000000000n,
  data: '0x',
  signature: '0xdeadbeef',
};

// 1) Calldata, commit'li tam ABI ile aynı mı? (fragment'lerimiz sapmasın)
const fullAbi = JSON.parse(readFileSync(new URL('./PQWallet.json', import.meta.url), 'utf8'));
const { Interface } = await import('ethers');
const fromFullAbi = new Interface(fullAbi).encodeFunctionData('execute', [
  SAMPLE.to, SAMPLE.value, SAMPLE.data, SAMPLE.signature,
]);
const mine = encodeExecute(SAMPLE);
assert.equal(mine, fromFullAbi, 'encodeExecute, commit li tam ABI ile aynı calldata üretmeli');
ok('encodeExecute == tam ABI (PQWallet.json) çıktısı');

// 2) BAĞIMSIZ oracle: Foundry cast. Yukarıdaki karşılaştırma gerçek bir
// bağımsız doğrulama DEĞİL — iki taraf da ethers kullanıyor. cast, ethers'tan
// tamamen bağımsız bir ABI kodlayıcısı.
//
// Zorunludur, atlanamaz: koşullu atlanan bir kontrol, hiç yapılmamış bir
// kontroldür ve testi sessizce yeşile boyar.
const CAST_EXPECTED = process.env.CAST_EXPECTED;
assert.ok(
  CAST_EXPECTED,
  'CAST_EXPECTED verilmedi — bu testi Step 4 te belirtilen komutla calistirin',
);
assert.equal(mine, CAST_EXPECTED, 'encodeExecute, cast calldata çıktısıyla aynı olmalı');
ok('encodeExecute == cast calldata (bağımsız oracle)');

// C13 imzası gerçekte 3688 bayt. Uzunluk kontrolünün anlamlı olması için
// test girdisi de gerçek uzunlukta.
const REAL_LEN_SIG = '0x' + 'ab'.repeat(3688);

// 3) SAKLANAN STATE KONTROLÜ — asıl olan bu.
//
// Demo günü patlayacak hata şu: negatif kanıt handler'ı
// `state.signature = tamperSignature(state.signature)` gibi bir ATAMA yaparsa,
// tamperSignature kusursuz saf olsa bile saklanan imza bozulur ve sonraki
// "Gönder" bozuk imzayı zincire yollar. Bu assertion'ın DİŞİ var, çünkü
// `state` bir nesne (mutable) — aşağıdaki boş assertion'ın aksine.
// Anlık görüntü TÜM `signed` nesnesini kapsıyor, sadece signature'ı değil.
// Sebep: fonksiyon calldata kurmak için `signed.fields`'a da erişiyor. Orada
// yapılacak yerinde bir normalizasyon `fields`'ı bozar, gerçek gönderim yolunu
// zehirler ve bu İMZA KONTROLÜNDEN KAÇAR (digest fields'tan türüyor).
//
// BigInt-güvenli replacer şart: `fields.value` bir BigInt ve düz
// JSON.stringify BigInt'te "Do not know how to serialize a BigInt" ile patlar.
const snap = (o) => JSON.stringify(o, (_, v) => (typeof v === 'bigint' ? `${v}n` : v));

const state = {
  fields: { to: SAMPLE.to, value: SAMPLE.value, data: SAMPLE.data },
  signature: REAL_LEN_SIG,
};
const before = snap(state);
const negativeCalldata = buildNegativeProofCalldata(state);
assert.equal(snap(state), before, 'negatif kanıt akışı SAKLANAN state i (signature VE fields) değiştirmemeli');
ok('buildNegativeProofCalldata saklanan state i bozmuyor (signature + fields)');
assert.notEqual(negativeCalldata, encodeExecute({ ...state.fields, signature: REAL_LEN_SIG }),
  'negatif kanıt calldata sı gerçek calldata dan farklı olmalı');
ok('negatif kanıt calldata si gercek calldata dan farkli');

// 4) Bozmanın anlamlı olduğu: farklı, AYNI UZUNLUKTA, tam olarak bir bayt.
//
// Uzunluk kritik: imza kısalırsa verifier onu "geçersiz imza" diye değil
// "bozuk girdi" diye reddedebilir. Negatif kanıtın jüriye ispatladığı şey
// "doğru biçimli ama geçersiz imza reddediliyor" olmalı — biçimsiz girdinin
// reddi çok daha zayıf bir iddiadır.
const tampered = tamperSignature(REAL_LEN_SIG);
assert.notEqual(tampered, REAL_LEN_SIG, 'tamperSignature farklı bir değer döndürmeli');
assert.equal(tampered.length, REAL_LEN_SIG.length, 'tamperSignature uzunluğu korumalı');
assert.equal((tampered.length - 2) / 2, 3688, 'bozulmuş imza da 3688 bayt olmalı');
const a = REAL_LEN_SIG.slice(2), b = tampered.slice(2);
let diffBytes = 0;
for (let i = 0; i < a.length; i += 2) if (a.slice(i, i + 2) !== b.slice(i, i + 2)) diffBytes++;
assert.equal(diffBytes, 1, 'tam olarak BİR bayt farklı olmalı');
ok('bozma anlamlı: 3688 bayt korunuyor, tam 1 bayt değişiyor');

// 5) Planın istediği orijinal assertion — KORUNUYOR, niyeti belgeliyor.
// UYARI: bu assertion tek başına ZAYIF. `signature` bir string ve JS
// string'leri immutable, yani bu kontrol tamperSignature kasten kirli
// yazılsaydı bile geçerdi — dilin garantisini sınıyor, implementasyonunkini
// değil. Gerçek güvence yukarıdaki (3) numaralı state kontrolünde.
const original = '0x' + 'ab'.repeat(64);
tamperSignature(original);
assert.equal(original, '0x' + 'ab'.repeat(64), 'tamperSignature girdiyi DEĞİŞTİRMEMELİ');
ok('tamperSignature girdi string ini değiştirmiyor (zayıf kontrol — bkz. yorum)');

console.log(`\n=== ${passed} assertion geçti ===`);
