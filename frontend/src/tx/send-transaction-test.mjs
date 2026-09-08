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

const chain = disconnectMessage({ reason: 'chainChanged', chainIdHex: '0x1' });
const revoked = disconnectMessage({ reason: 'accountsChanged', accounts: [] });
const switched = disconnectMessage({
  reason: 'accountsChanged',
  accounts: ['0x1111111111111111111111111111111111111111'],
});

// 1. Üç durumun üçü de bağlantının düştüğünü söylemeli.
for (const [name, m] of [['chainChanged', chain], ['erişim kesildi', revoked], ['hesap değişti', switched]]) {
  check(`${name}: bağlantının düştüğünü söylüyor`, m.title.includes('bağlantısı düştü'), `gelen: ${m.title}`);
  check(`${name}: düzeltme metni boş değil`, m.fix.length > 0);
}

// 2. ASIL İDDİA: üç metin de birbirinden FARKLI. Aynı metni basmak,
//    provada yanlış yere baktırır — sebepler de düzeltmeler de farklı.
const titles = [chain.title, revoked.title, switched.title];
const fixes = [chain.fix, revoked.fix, switched.fix];
check('üç başlık da birbirinden farklı', new Set(titles).size === 3, `gelen: ${JSON.stringify(titles, null, 2)}`);
check('üç düzeltme metni de birbirinden farklı', new Set(fixes).size === 3, `gelen: ${JSON.stringify(fixes, null, 2)}`);

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
