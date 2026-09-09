// Node testi. Çalıştırma: cd frontend && node src/tx/send-transaction-test.mjs
//
// KAPSAM: `disconnectMessage()` — bağlantı düştüğünde hangi metnin basılacağı.
// Bu, MetaMask olmadan elle doğrulanması ZOR olan yol: `accountsChanged`'in
// boş dizi ile gelmesini (site erişiminin kesilmesi) tarayıcıda tetiklemek
// kolay değil, hesap değişimiyle karıştırılması ise sessizce yanlış teşhise
// yol açar.
//
// KAPSAM DIŞI: connectWallet() ve watchWalletChanges() — ikisi de
// `window.ethereum`a bağlı, node'da yok. Onların doğrulaması tarayıcıda
// yapılır (plan Task 4, Step 3).

import { disconnectMessage } from './sendTransaction.js';
import { CONTRACTS } from '../config/contracts.js';

let failures = 0;

function check(name, cond, detail = '') {
  if (cond) {
    console.log(`✓ ${name}`);
  } else {
    failures++;
    console.error(`✗ ${name}${detail ? `\n    ${detail}` : ''}`);
  }
}

console.log('=== disconnectMessage() testi ===\n');

const ACTIVE = '0x80a98eb27DC9e688d1A9dE073315B6E4B532ACF4';
const OTHER = '0x1111111111111111111111111111111111111111';

const chain = disconnectMessage({ reason: 'chainChanged', chainIdHex: '0x1' });
const revoked = disconnectMessage({ reason: 'accountsChanged', accounts: [] }, ACTIVE);
const switched = disconnectMessage({ reason: 'accountsChanged', accounts: [OTHER, ACTIVE] }, ACTIVE);
// MetaMask accountsChanged ile izinli hesapların TAM listesini gönderiyor
// (ilk eleman aktif olan) — 8 Eylül elle doğrulamasında olay dökümünden
// görüldü. Aktif hesap aynı kalıp listeye yeni hesap eklenmesi ayrı bir durum.
const permsOnly = disconnectMessage({ reason: 'accountsChanged', accounts: [ACTIVE, OTHER] }, ACTIVE);

// 1. Dört durumun dördü de bağlantının düştüğünü söylemeli.
const CASES = [
  ['chainChanged', chain],
  ['erişim kesildi', revoked],
  ['hesap değişti', switched],
  ['sadece izinler değişti', permsOnly],
];
for (const [name, m] of CASES) {
  check(`${name}: bağlantının düştüğünü söylüyor`, m.title.includes('bağlantısı düştü'), `gelen: ${m.title}`);
  check(`${name}: düzeltme metni boş değil`, m.fix.length > 0);
}

// 2. ASIL İDDİA: dört metin de birbirinden FARKLI. Aynı metni basmak,
//    provada yanlış yere baktırır — sebepler de düzeltmeler de farklı.
const titles = CASES.map(([, m]) => m.title);
const fixes = CASES.map(([, m]) => m.fix);
check('dört başlık da birbirinden farklı', new Set(titles).size === 4, `gelen: ${JSON.stringify(titles, null, 2)}`);
check('dört düzeltme metni de birbirinden farklı', new Set(fixes).size === 4, `gelen: ${JSON.stringify(fixes, null, 2)}`);

// 2b. Aktif hesap DEĞİŞMEDİYSE "aktif hesap değişti" DENMEMELİ — düzeltmenin
//     asıl sebebi bu. Liste büyüdü ama accounts[0] aynı.
check('izin listesi büyüdü ama aktif hesap aynı: "aktif hesap değişti" demiyor',
  !permsOnly.title.includes('aktif hesap değişti'), `gelen: ${permsOnly.title}`);
check('aktif hesap gerçekten değiştiyse öyle diyor',
  switched.title.includes('aktif hesap değişti'), `gelen: ${switched.title}`);
// Checksum tuzağı: MetaMask accounts[0]'ı bazen checksum'lı, bazen küçük
// harfli döndürür. Ham string karşılaştırması yapılırsa HER accountsChanged
// "hesap değişti" görünür — yani bu düzeltmenin tam tersi üretilir. İki yön de
// test ediliyor.
check('kayıtlı checksum\'lı, gelen küçük harfli → "hesap değişti" DEMİYOR',
  disconnectMessage({ reason: 'accountsChanged', accounts: [ACTIVE.toLowerCase()] }, ACTIVE).title
    === permsOnly.title);
check('kayıtlı küçük harfli, gelen checksum\'lı → "hesap değişti" DEMİYOR',
  disconnectMessage({ reason: 'accountsChanged', accounts: [ACTIVE] }, ACTIVE.toLowerCase()).title
    === permsOnly.title);

// 2c. previousAddress bilinmiyorsa (savunmacı yol) hesap değişimi varsayılır —
//     "izinler değişti" demek, aslında hesap değişmişken yanlış olur.
check('previousAddress yoksa "aktif hesap değişti" dalına düşüyor',
  disconnectMessage({ reason: 'accountsChanged', accounts: [OTHER] }).title === switched.title);

// 3. Her metin doğru DÜZELTMEYİ söylüyor mu.
check("chainChanged: Sepolia'ya dönmeyi söylüyor", chain.fix.includes('Sepolia'));
check(
  'chainChanged: doğru chainId\'i yazıyor',
  chain.fix.includes(String(CONTRACTS.chainId)),
  `gelen: ${chain.fix}`,
);
check('chainChanged: yeni ağın chainId\'ini gösteriyor', chain.title.includes('0x1'), `gelen: ${chain.title}`);
check('erişim kesildi: yeniden izin vermeyi söylüyor', revoked.fix.includes('izin'));
check('hesap değişti: hesap seçmeyi söylüyor', switched.fix.includes('hesab'));

// 4. chainChanged, chainId olmadan da anlamlı bir metin üretmeli (olayın
//    argümanı gelmezse parantezli ek düşer, cümle bozulmaz).
const chainNoId = disconnectMessage({ reason: 'chainChanged' });
check('chainId gelmezse başlık yine de düzgün', chainNoId.title.endsWith('değişti.'), `gelen: ${chainNoId.title}`);
check('chainId gelmezse "undefined" sızmıyor', !chainNoId.title.includes('undefined'));

// 5. accounts hiç gelmezse "erişim kesildi" gibi ele alınmalı (undefined
//    dizi ?? [] ile boşa düşer) — sessizce "hesap değişti" demek yanlış olur.
const noAccounts = disconnectMessage({ reason: 'accountsChanged' });
check('accounts undefined ise "erişim kesildi" metni', noAccounts.title === revoked.title, `gelen: ${noAccounts.title}`);

console.log(failures === 0 ? '\nTÜMÜ GEÇTİ' : `\n${failures} BAŞARISIZ`);
process.exit(failures === 0 ? 0 : 1);
