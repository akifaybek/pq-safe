#!/usr/bin/env node
//
// scan-secrets.mjs — .superpowers/sdd/progress.md başlığındaki "commit öncesi
// tarama zorunlu" kuralının uygulaması. Sahiplik: Akif (docs/ altı).
//
// KULLANIM
//   node docs/tools/scan-secrets.mjs <dosya>
//   git diff --cached -- <yol> | grep '^+' | grep -v '^+++' | cut -c2- \
//     | node docs/tools/scan-secrets.mjs
//   Argüman yoksa stdin okunur. Çıkış kodu: 0 = A dışı desenlerde eşleşme yok,
//   1 = B/C/D'de eşleşme var (gözle bakılacak), 2 = betik çalışamadı.
//
// KAPSAMI BETİK BELİRLEMEZ. Ne verirsen onu tarar. Commit mesajına kapsamı
// ("bu turun +N satırı" / "tüm dosya") sen yazarsın.
//
// EŞİKLER (değiştirirsen commit mesajında gerekçelendir)
//   A · BIP-39 ardışık kelime : >=2 uzunluktaki her dizi RAPORLANIR.
//       Mnemonic eşiği 12'dir; 2-3 uzunluğundaki diziler teknik terim
//       çiftlerinde (try catch, gas limit) doğal olarak çıkar ve normalde
//       zararsızdır. Eşik 2 BİLEREK düşük: "0 eşleşme" yazabilmek için
//       eşiği yükseltmek, kuralı ritüele çevirmenin en kolay yolu.
//       A'daki eşleşme tek başına çıkış kodunu bozmaz — HÜKMÜ İNSAN VERİR.
//   B · 64 hane hex          : private key / 32 baytlık ham değer.
//   C · opak dizi            : bilinen sağlayıcı adı, URL'de >=20 karakterlik
//                              yol parçası, ya da >=28 karakterlik alfanümerik
//                              blok.
//   D · 0x + 40 hane         : EVM adresi. Kuralın üç deseninde YOK; adresler
//                              zaten aleni. Kayda geçsin diye taranıyor.
//
// NE YAKALAMAZ — bu liste taramanın sınırıdır, "temiz" çıktısı sırrın
// olmadığını KANITLAMAZ:
//   - İngilizce dışı BIP-39 sözlükleri (Türkçe listesi yok; fr/es/ja/ko/pt/it
//     listeleri repoda var ama taranmıyor).
//   - Satır sonunda TİRELEME ile bölünmüş kelimeler (token akışı satır
//     sınırını yok sayar, ama "sec-\nret" tek token olmaz).
//   - 28 karakterden kısa base64/opak sırlar; kısa API anahtarları.
//   - Düzyazıyla anlatılan sır ("parolanın ilk dörtlüsü kedi ile başlıyor").
//   - Normal kelimeye benzeyen .env değerleri.
//   - Anahtarın PARÇASI (12 kelimenin 4'ü, hex'in yarısı).
//   - KISALTILMIŞ / ELİPSLİ hex ve hash (a0f1f0cb…c4d9cd, 0x1234…abcd).
//     B ve D desenleri TAM uzunluk arar; kısaltılmış hâl sessizce geçer.
//     18 Eylül 2026'da gözlendi. Burada zararsızdı — kısaltılmış bir anahtar
//     zaten kullanılamaz — ama yazılı olmazsa sonraki tur "temiz" diye okur.
//   - İkili dosyalar: ekran görüntüsü, QR, PDF. Sadece düz metin taranır.
//
// BAĞIMLILIK: frontend/node_modules/bip39. Temiz klonda (ÖK-2) bu dizin
// yoktur; betik SESSİZCE ATLAMAZ, çıkış kodu 2 ile durur ve ne yapılacağını
// söyler. Sessiz atlama bu projede kovaladığımız hata sınıfının ta kendisi.

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const WORDLIST = resolve(REPO_ROOT, 'frontend/node_modules/bip39/src/wordlists/english.json');
const MNEMONIC_ESIGI = 12;
const ARDISIK_ESIK = 2;
const OPAK_UZUNLUK = 28;

function oku(kaynak) {
  try {
    return readFileSync(kaynak ?? 0, 'utf8');
  } catch (err) {
    console.error(`HATA: girdi okunamadı (${kaynak ?? 'stdin'}): ${err.message}`);
    process.exit(2);
  }
}

function sozluk() {
  try {
    return new Set(JSON.parse(readFileSync(WORDLIST, 'utf8')));
  } catch {
    console.error(
      'HATA: BIP-39 sözlüğü bulunamadı:\n' +
        `  ${WORDLIST}\n` +
        'Temiz klonda beklenen durum. Çözüm:  cd frontend && npm install\n' +
        'A deseni sözlük olmadan taranamaz. Tarama YAPILMADI — commit etme.'
    );
    process.exit(2);
  }
}

const metin = oku(process.argv[2]);
const words = sozluk();

const rapor = (ad, esler, ek = []) => {
  console.log(`\n[${ad}] ${esler.length} eşleşme`);
  esler.forEach((m, i) => console.log(`  ${i + 1}. ${m}`));
  ek.forEach((satir) => console.log(`  ${satir}`));
  return esler.length;
};

// A — token akışı satır sınırı yok sayılarak kurulur.
const tokens = metin.toLowerCase().match(/[a-z]+/g) ?? [];
const diziler = [];
let cur = [];
for (const t of tokens) {
  if (words.has(t)) cur.push(t);
  else {
    if (cur.length >= ARDISIK_ESIK) diziler.push(cur);
    cur = [];
  }
}
if (cur.length >= ARDISIK_ESIK) diziler.push(cur);
const enUzun = diziler.length ? Math.max(...diziler.map((d) => d.length)) : 0;

rapor(
  `A · BIP-39 ardışık kelime (eşik ${ARDISIK_ESIK}, satır sınırı yok sayıldı)`,
  diziler.map((d) => `uzunluk ${d.length}: "${d.join(' ')}"`),
  [
    `toplam token: ${tokens.length}`,
    `listede olan tekil token: ${new Set(tokens.filter((t) => words.has(t))).size}`,
    `en uzun ardışık dizi: ${enUzun} (mnemonic eşiği: ${MNEMONIC_ESIGI})`,
    enUzun >= MNEMONIC_ESIGI ? '>>> EŞİĞİ AŞTI — elle incele' : '',
  ].filter(Boolean)
);

const b = rapor('B · 64 hane hex', metin.match(/\b(?:0x)?[0-9a-fA-F]{64}\b/g) ?? []);
const c = rapor(
  `C · sağlayıcı anahtarı / >=${OPAK_UZUNLUK} karakter opak dizi`,
  [
    ...(metin.match(/\b(?:alchemy|infura|quicknode|ankr|chainstack|blastapi|drpc)\S*/gi) ?? []),
    ...(metin.match(/https?:\/\/\S*\/[A-Za-z0-9_-]{20,}/g) ?? []),
    ...(metin.match(new RegExp(`\\b[A-Za-z0-9_-]{${OPAK_UZUNLUK},}\\b`, 'g')) ?? []),
  ]
);
const d = rapor('D · 0x + 40 hane (EVM adresi)', metin.match(/\b0x[0-9a-fA-F]{40}\b/g) ?? []);

console.log(
  '\nNot: bu çıktı bir FİLTREdir, temizlik kanıtı değil. Betiğin başındaki' +
    '\n"NE YAKALAMAZ" listesini okumadan "tarandı, temiz" yazma.'
);
process.exit(b + c + d > 0 ? 1 : 0);
