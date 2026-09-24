// format.js doğrulaması — ekranın kullandığı fonksiyonların TA KENDİSİ koşulur.
//
// Neden ayrı dosya: bu değerler ilk raporlandığında çıktı, `node -e` içine elle
// yazılmış bir KOPYADAN üretilmişti. Kopya ile ürünün aynı şeyi yaptığı
// ölçülmemişti — varsayımdı. Buradaki import o boşluğu kapatıyor ve kalıcı
// hale getiriyor: biçim bir daha değişirse bu test kırmızı yanar.
//
// Beklenen dizeler ELLE yazıldı (Intl'in çıktısı Intl'e sorularak
// doğrulanmaz); tr-TR binlik ayracı `.`, ondalık ayracı `,`.

import { fmtGas, fmtWei } from './format.js';

let failures = 0;

function check(name, actual, expected) {
  if (actual === expected) {
    console.log(`✓ ${name}`);
  } else {
    failures++;
    console.error(`✗ ${name}\n    beklenen: ${expected}\n    gelen   : ${actual}`);
  }
}

console.log('=== format.js testi (beklenen dizeler elle yazıldı) ===\n');

// ── gas ─────────────────────────────────────────────────────────────────────
check('fmtGas: ölçülen gasUsed (nonce 4 tx)', fmtGas(216269n), '216.269 gas');
check('fmtGas: zincirdeki gaz limiti', fmtGas(262983n), '262.983 gas');
check('fmtGas: GAS_FALLBACK', fmtGas(350000n), '350.000 gas');

// ── wei ─────────────────────────────────────────────────────────────────────
// ADI DİKKATLİ: bu satır 17 haneli bir değerin BİÇİMİNİ sabitler, Number
// dönüşümünü YAKALAMAZ. Ölçüldü (kırmızı/yeşil kontrolü): `nf.format(Number(wei))`
// bozmasında bu assertion YEŞİL kaldı — 50600000000000000 bir double olarak
// tam temsil edilebiliyor. Number bugünü yakalayan tek satır aşağıdaki
// 1000000000000000001'dir.
check(
  'fmtWei: cüzdan bakiyesi biçimi (17 hane)',
  fmtWei(50600000000000000n),
  '50.600.000.000.000.000 wei = 0,0506 ETH',
);
check('fmtWei: demo value (0,0001 ETH)', fmtWei(100000000000000n), '100.000.000.000.000 wei = 0,0001 ETH');

// Bu değer Sprint 3'te GERÇEKTEN ekrana basıldı
// (sprint3-end-to-end-transaction.md:233). Number'a çevrilseydi 18 ondalık
// hanenin sonu yuvarlanırdı; testin asıl görevi bunu sabitlemek.
check(
  'fmtWei: tam ondalık korunuyor — yuvarlama YOK',
  fmtWei(1000000000000000001n),
  '1.000.000.000.000.000.001 wei = 1,000000000000000001 ETH',
);

// Sınır değerler: ayraçsız tek hane ve tam bir ETH.
check('fmtWei: sıfır', fmtWei(0n), '0 wei = 0,0 ETH');
check('fmtWei: tam 1 ETH', fmtWei(1000000000000000000n), '1.000.000.000.000.000.000 wei = 1,0 ETH');

console.log(failures === 0 ? '\nTÜM TESTLER GEÇTİ' : `\n${failures} TEST BAŞARISIZ`);
process.exit(failures === 0 ? 0 : 1);
