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

import {
  disconnectMessage,
  classifyNegativeProofError,
  INVALID_SIGNATURE_REASON,
} from './sendTransaction.js';
import { CONTRACTS } from '../config/contracts.js';

// ── SÜRE SINIRI ─────────────────────────────────────────────────────────────
//
// NEDEN VAR: 15 Eylül 2026'da bu test 45 assertion'dan sonra ASILDI — kırmızı
// yanmadı, %0 CPU'da süresiz bekledi. Sebep ölçüldü: aşağıdaki canlı Sepolia
// oracle'ının sabitlenmiş hash'leri için RPC sağlayıcı
// `eth_getTransactionReceipt` çağrısına `null` döndürüyor (publicnode receipt
// saklama süresi ~8.000-10.000 blok ≈ 30 saat) ve ethers'ın `wait()`'i null
// receipt'te süresiz yokluyor.
//
// ASILAN TEST, BAŞARISIZ TESTTEN DAHA KÖTÜDÜR: "testler geçti mi" sorusunun
// cevabı yoktur ve bir sonraki oturumda kimse sebebini bulamaz. Bu blok
// asılmayı KIRMIZIYA çeviriyor — teşhis etmiyor, görünür kılıyor.
//
// Zamanlayıcı `unref()`li: süreci AYAKTA TUTMAZ, testler normal biterse süreç
// normal çıkar (clearTimeout gerekmez). Ama süreç başka bir sebeple — asılı bir
// RPC yoklaması — ayakta kalırsa yine de ateşler. Aranan davranış bu.
//
// Ayrıntı: docs/evidence/crypto-tests/sprint4-screen-consistency.md § 7.1
const TIMEOUT_MS = Number(process.env.TEST_TIMEOUT_MS ?? 180_000);
const startedAt = Date.now();
setTimeout(() => {
  const secs = ((Date.now() - startedAt) / 1000).toFixed(0);
  console.error(`\n✗ SÜRE SINIRI AŞILDI — test ${secs} sn sonra ASILDI, GEÇMEDİ.`);
  console.error('  En son tamamlanan bölüm yukarıdaki çıktının sonunda.');
  console.error('  İlk bakılacak yer: canlı Sepolia oracle\'ının hash\'leri hâlâ');
  console.error('  receipt döndürüyor mu? (eth_getTransactionReceipt → null ise sebep budur.)');
  console.error('  Ayrıntı ve ölçüm: docs/evidence/crypto-tests/sprint4-screen-consistency.md § 7.1');
  console.error(`  Sınır TEST_TIMEOUT_MS ile değiştirilebilir (şu an ${TIMEOUT_MS} ms).`);
  process.exit(1);
}, TIMEOUT_MS).unref();

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


// ── sendExecute() — receipt/revert mantığı ──────────────────────────────────
//
// İKİ AYRI KATMAN, karıştırılmamalı:
//
//   A) Sahte signer'lı testler — YALNIZCA sendExecute'un kendi dallanma
//      mantığını sınar (gas payı, fallback, hangi hatayı yutup hangisini
//      fırlattığı). Bunlar ethers'ın NE YAPTIĞI hakkında HİÇBİR ŞEY
//      kanıtlamaz: hatayı testin kendisi kuruyor.
//
//   B) Gerçek oracle (aşağıda, "GERÇEK ETHERS" bölümü) — gerçek
//      JsonRpcProvider, zincirde gerçekten revert etmiş bir tx ve GERÇEK
//      `.wait()`. ethers 6.17'nin revert karşısındaki sözleşmesini
//      (`code`, `receipt`in nerede durduğu) burada sabitliyoruz.
//
// Bu ayrım bilerek yazıldı: ilk sürümde yalnızca (A) vardı ve iddia
// "ethers CALL_EXCEPTION fırlatır" idi — oysa CALL_EXCEPTION'ı testin
// kendisi fırlatıyordu. Kendine referanslı bir test, ethers `e.receipt`
// yerine `e.info.receipt` kullansaydı bunu Task 7'de, sahnede öğrenirdik.
// (Aynı bulgu sınıfı progress.md'de iki kez geçiyor: Task 2'nin boş
// assertion'ı ve devreden Minor (c) "bağımsız oracle değil".)

import { readFileSync } from 'node:fs';
import { JsonRpcProvider } from 'ethers';
import { sendExecute, GAS_FALLBACK } from './sendTransaction.js';

console.log('\n=== sendExecute() receipt/revert testi ===\n');

const CALLDATA = '0xdeadbeef';

// Sahte signer: ethers Signer'ın sendExecute'un kullandığı üç yüzeyi.
function fakeSigner({ estimateGas, waitResult, waitError }) {
  const seen = {};
  return {
    seen,
    async estimateGas(tx) {
      seen.estimateTx = tx;
      if (typeof estimateGas === 'function') return estimateGas();
      return estimateGas;
    },
    async sendTransaction(tx) {
      seen.sentTx = tx;
      return {
        hash: '0xaaaa',
        async wait() {
          if (waitError) throw waitError;
          return waitResult;
        },
      };
    },
  };
}

const okReceipt = { status: 1, gasUsed: 233429n, blockNumber: 9000000 };
const revertReceipt = { status: 0, gasUsed: 123456n, blockNumber: 9000001 };

// 1. Normal yol: tahmin alınır, %20 pay eklenir.
{
  const signer = fakeSigner({ estimateGas: 200000n, waitResult: okReceipt });
  const r = await sendExecute({ signer, calldata: CALLDATA });
  check('tahmin başarılı → gasLimit = tahmin * 1.2', r.gasLimit === 240000n, `gelen: ${r.gasLimit}`);
  check('tahmin başarılı → gasEstimated true', r.gasEstimated === true);
  check('receipt olduğu gibi dönüyor (status 1)', r.receipt.status === 1);
  check('hash dönüyor', r.hash === '0xaaaa');
  check('calldata sendTransaction\'a aynen gidiyor', signer.seen.sentTx.data === CALLDATA);
  check('hedef PQWallet adresi', signer.seen.sentTx.to === CONTRACTS.pqWallet);
  check('gasLimit tx\'e geçiyor', signer.seen.sentTx.gasLimit === 240000n);
}

// 2. Tahmin patlarsa ölçülmüş sabit limite düşülür — gönderim ölmez.
{
  const signer = fakeSigner({
    estimateGas: () => { throw new Error('rpc: estimate failed'); },
    waitResult: okReceipt,
  });
  const r = await sendExecute({ signer, calldata: CALLDATA });
  check('tahmin patladı → GAS_FALLBACK', r.gasLimit === GAS_FALLBACK, `gelen: ${r.gasLimit}`);
  check('tahmin patladı → 350.000 (spec değeri)', GAS_FALLBACK === 350000n, `gelen: ${GAS_FALLBACK}`);
  check('tahmin patladı → gasEstimated false (kullanıcıya söylenebilsin)', r.gasEstimated === false);
}

// 3. Dallanma mantığı: CALL_EXCEPTION + receipt geldiğinde kurtarılıyor mu?
//    DİKKAT — bu test hatayı KENDİSİ kuruyor, yani ethers'ın gerçekten böyle
//    bir hata ürettiğini KANITLAMAZ. O iddianın kanıtı aşağıdaki "GERÇEK
//    ETHERS" bölümü.
{
  const err = Object.assign(new Error('transaction execution reverted'), {
    code: 'CALL_EXCEPTION',
    receipt: revertReceipt,
  });
  const signer = fakeSigner({ estimateGas: 200000n, waitError: err });
  // try/catch: kurtarma kaldırılırsa bu satır FIRLATIR. Yakalanmazsa test
  // yakalanmamış bir reddedişle ÇÖKER — kırmızıdır ama hangi iddianın
  // düştüğünü söylemez. Burada isimli bir ✗'e çevriliyor.
  let r = null;
  let thrown = null;
  try {
    r = await sendExecute({ signer, calldata: CALLDATA });
  } catch (e) {
    thrown = e;
  }
  check('revert → fırlatmıyor, receipt döndürüyor', thrown === null && r?.receipt != null, `fırlayan: ${thrown?.code}`);
  check('revert → status 0 ÇAĞIRANA ULAŞIYOR', r?.receipt?.status === 0, `gelen: ${r?.receipt?.status}`);
  check('revert → hash korunuyor (Etherscan kanıtı)', r?.hash === '0xaaaa');
  check('revert → harcanan gas korunuyor', r?.receipt?.gasUsed === 123456n);
}

// 4. Belirsiz yollar YUTULMAZ: timeout/replacement "revert etti" değildir,
//    tx'in akıbeti bilinmiyordur. Fırlatılır — ama hash iliştirilerek, yoksa
//    zincirde olabilecek gerçek bir tx kaybolur.
{
  const err = Object.assign(new Error('wait for transaction timeout'), { code: 'TIMEOUT' });
  const signer = fakeSigner({ estimateGas: 200000n, waitError: err });
  let thrown = null;
  try {
    await sendExecute({ signer, calldata: CALLDATA });
  } catch (e) {
    thrown = e;
  }
  check('timeout → fırlatılıyor (sessizce başarı sayılmıyor)', thrown !== null);
  check('timeout → hash hataya iliştirilmiş', thrown?.txHash === '0xaaaa', `gelen: ${thrown?.txHash}`);
  check('timeout → kod korunuyor', thrown?.code === 'TIMEOUT');
}

// 5. receipt'siz CALL_EXCEPTION de yutulmaz — kurtaracak bir şey yok.
{
  const err = Object.assign(new Error('call exception, no receipt'), { code: 'CALL_EXCEPTION' });
  const signer = fakeSigner({ estimateGas: 200000n, waitError: err });
  let thrown = null;
  try {
    await sendExecute({ signer, calldata: CALLDATA });
  } catch (e) {
    thrown = e;
  }
  check('receipt\'siz CALL_EXCEPTION → fırlatılıyor', thrown !== null);
  check('receipt\'siz CALL_EXCEPTION → hash iliştirilmiş', thrown?.txHash === '0xaaaa');
}

// 6. onSubmitted — hash ile receipt arasındaki pencerenin haberi.
//
//    NEDEN MOCK: bu pencere tarayıcıda gözlenemedi, çünkü gözlemek gerçek bir
//    tx gerektiriyor ve nonce 5 kayıtlı demoya ayrılmış durumda. Ölçülen şey
//    ekranın kendisi DEĞİL, sendExecute'un ÇAĞRI SIRASI: callback `wait()`
//    çözülmeden önce mi çağrılıyor?
//
//    Sıra, zamanlamaya değil GÖZLENEN SIRAYA bağlanıyor: sahte `wait()`
//    bilerek 20 ms gecikiyor ve çözüldüğünde kendini `order`a yazıyor. Callback
//    `await tx.wait()`in ALTINA taşınırsa iki kayıt yer değiştirir ve assertion
//    kırmızı yanar — asılma değil, kırmızı (bu paketin 15 Eylül'de öğrendiği
//    ders: § 7.1).
{
  const order = [];
  const signer = {
    async estimateGas() {
      return 200000n;
    },
    async sendTransaction() {
      return {
        hash: '0xbbbb',
        async wait() {
          await new Promise((res) => setTimeout(res, 20));
          order.push('wait-çözüldü');
          return okReceipt;
        },
      };
    },
  };
  const r = await sendExecute({
    signer,
    calldata: CALLDATA,
    onSubmitted: (h) => order.push(`onSubmitted:${h}`),
  });
  check('onSubmitted ÇAĞRILDI', order.some((x) => x.startsWith('onSubmitted:')), `sıra: ${order.join(' → ')}`);
  check('onSubmitted DOĞRU hash ile çağrıldı', order.includes('onSubmitted:0xbbbb'), `sıra: ${order.join(' → ')}`);
  check(
    'SIRA: onSubmitted, wait() ÇÖZÜLMEDEN önce',
    order.join('|') === 'onSubmitted:0xbbbb|wait-çözüldü',
    `sıra: ${order.join(' → ')}`,
  );
  check('onSubmitted tam BİR kez çağrıldı', order.filter((x) => x.startsWith('onSubmitted:')).length === 1);
  check('callback varken receipt yine dönüyor', r.receipt.status === 1);
  check('callback varken hash yine dönüyor', r.hash === '0xbbbb');
}

// 7. Callback VERİLMEZSE davranış bugünküyle birebir aynı — opsiyonelliğin
//    kendisi sabitleniyor. (Yukarıdaki 1-5 numaralı testlerin hepsi zaten
//    callback'siz koşuyor; bu blok o sessiz varsayımı açık bir assertion'a
//    çeviriyor.)
{
  const signer = fakeSigner({ estimateGas: 200000n, waitResult: okReceipt });
  let thrown = null;
  let r = null;
  try {
    r = await sendExecute({ signer, calldata: CALLDATA }); // onSubmitted YOK
  } catch (e) {
    thrown = e;
  }
  check('callback yok → fırlatmıyor', thrown === null, `fırlayan: ${thrown?.message}`);
  check('callback yok → hash aynı', r?.hash === '0xaaaa');
  check('callback yok → receipt aynı', r?.receipt?.status === 1);
  check('callback yok → gasLimit aynı (tahmin * 1.2)', r?.gasLimit === 240000n, `gelen: ${r?.gasLimit}`);
}


console.log('\n=== classifyNegativeProofError() — ÜÇ YOL ===\n');

// Neden bu testler var: negatif kanıtın ekrana YEŞİL mi GRİ mi yazacağına bu
// saf fonksiyon karar veriyor. Brief'teki tek yollu kontrol
// (`String(reason).includes('PQWallet: invalid signature')`) bir ağ hatasını
// "Reddedildi, ama beklenen mesaj değil: <ağ hatası>" diye basıyordu — sahnede
// güvenlik bulgusu gibi okunan bir yanlış alarm.
//
// Girdiler ethers 6.17'nin GERÇEK hata şekillerine göre kuruldu: revert eden
// bir eth_call'da `code === 'CALL_EXCEPTION'`, `reason` çözülmüş require
// string'i, `data` ise ham Error(string) revert verisi (0x08c379a0…).
// Canlı doğrulaması ayrıca tarayıcıda yapıldı (kanıt notu, bölüm 3).

// Error(string) ABI kodlaması: selector 0x08c379a0 + offset + uzunluk + veri.
const REVERT_DATA_INVALID_SIG =
  '0x08c379a0' +
  '0000000000000000000000000000000000000000000000000000000000000020' +
  '000000000000000000000000000000000000000000000000000000000000001a' +
  Buffer.from('PQWallet: invalid signature').toString('hex').padEnd(64, '0');

const cRejected = classifyNegativeProofError({
  code: 'CALL_EXCEPTION',
  reason: 'PQWallet: invalid signature',
  shortMessage: 'execution reverted: "PQWallet: invalid signature"',
  data: REVERT_DATA_INVALID_SIG,
});
check('(a) CALL_EXCEPTION + beklenen sebep → rejected (YEŞİL)', cRejected.outcome === 'rejected', `gelen: ${cRejected.outcome}`);
check('(a) sebep metni olduğu gibi taşınıyor', cRejected.reason === INVALID_SIGNATURE_REASON);
check('(a) why === revert', cRejected.why === 'revert');

const cOther = classifyNegativeProofError({
  code: 'CALL_EXCEPTION',
  reason: 'PQWallet: call failed',
  data: '0x08c379a0deadbeef',
});
check('(b) CALL_EXCEPTION + BAŞKA sebep → unexpected-revert (SARI)', cOther.outcome === 'unexpected-revert', `gelen: ${cOther.outcome}`);
check('(b) SARI yolu YEŞİL değil', cOther.outcome !== 'rejected');

// (c) Ağ hataları. ethers bunları CALL_EXCEPTION ile DEĞİL kendi kodlarıyla
// fırlatır; hiçbirinde `reason` yoktur.
for (const netErr of [
  { code: 'NETWORK_ERROR', shortMessage: 'could not detect network' },
  { code: 'SERVER_ERROR', shortMessage: 'could not coalesce error' },
  { code: 'TIMEOUT', shortMessage: 'timeout' },
  { code: 'UNKNOWN_ERROR', message: 'Failed to fetch' },
  new TypeError('Failed to fetch'),
]) {
  const c = classifyNegativeProofError(netErr);
  check(
    `(c) ${netErr.code ?? 'TypeError'} → unavailable/network (GRİ)`,
    c.outcome === 'unavailable' && c.why === 'network',
    `gelen: ${c.outcome}/${c.why}`,
  );
}

// Kritik yanlış-alarm testi: ağ hatasının metninde beklenen require string'i
// GEÇSE bile yeşile boyanmamalı. Sınıflandırma metne DEĞİL, kontratın cevap
// verip vermediğine bakar.
const cTrap = classifyNegativeProofError({
  code: 'SERVER_ERROR',
  message: 'proxy error while handling PQWallet: invalid signature',
});
check('(c) ağ hatası metninde beklenen string geçse BİLE yeşil değil', cTrap.outcome === 'unavailable', `gelen: ${cTrap.outcome}`);

// Aynı tuzağın tersi: brief'in kontrolü bu girdide ne yapardı? Assertion'ın
// boş olmadığını gösterir — eski mantık bu satırda YANLIŞ cevap veriyor.
const briefWouldSay = String(cTrap.reason).includes(INVALID_SIGNATURE_REASON);
check("(c) brief'in tek yollu kontrolü aynı girdide YANILIYOR (assertion boş değil)", briefWouldSay === true);

// Revert verisi OLMAYAN CALL_EXCEPTION: ethers "missing revert data" der.
// Kontratın ne dediğini okuyamıyoruz → sarı DEĞİL, gri.
const cNoData = classifyNegativeProofError({
  code: 'CALL_EXCEPTION',
  reason: null,
  data: null,
  shortMessage: 'missing revert data',
});
check('(c) CALL_EXCEPTION ama revert verisi yok → unavailable/no-revert-data', cNoData.outcome === 'unavailable' && cNoData.why === 'no-revert-data', `gelen: ${cNoData.outcome}/${cNoData.why}`);
check("(c) 'missing revert data' SARI değil (bulgu adayı diye basılmaz)", cNoData.outcome !== 'unexpected-revert');

const cEmptyData = classifyNegativeProofError({ code: 'CALL_EXCEPTION', data: '0x', shortMessage: 'execution reverted' });
check("(c) data === '0x' boş sayılıyor", cEmptyData.outcome === 'unavailable' && cEmptyData.why === 'no-revert-data');

// `reason` yok ama ham revert verisi VAR: kontrat cevap vermiştir (özel bir
// error tipi olabilir). Kontratın cevabı okunamadığı için beklenen metinle
// eşleşmez → SARI, bulgu adayı.
const cDataOnly = classifyNegativeProofError({ code: 'CALL_EXCEPTION', data: '0xdeadbeef', shortMessage: 'execution reverted (unknown custom error)' });
check('(b) reason yok ama revert verisi VAR → unexpected-revert', cDataOnly.outcome === 'unexpected-revert', `gelen: ${cDataOnly.outcome}`);

check('undefined/null hata patlatmıyor', classifyNegativeProofError(undefined).outcome === 'unavailable');

// Beklenen sebep sabitinin kontrat kaynağıyla aynı olduğu — elle yazılmış bir
// metin, typo sessizce YEŞİLİ SARIYA çevirirdi.
check('INVALID_SIGNATURE_REASON birebir kontrattaki string', INVALID_SIGNATURE_REASON === 'PQWallet: invalid signature');

// ══════════════════════════════════════════════════════════════════════════
// CANLI ORACLE EN SONDA — bu sıra KASITLI, değiştirmeyin.
//
// ÖLÇÜLDÜ (15 Eylül 2026): paket canlı oracle'da asıldığında koşamayan 30
// assertion'ın **18'i** aşağıdaki `classifyNegativeProofError` bölümüydü —
// saf fonksiyon testleri, ağla hiçbir ilgisi yok. Koşmama sebepleri tek:
// dosyada asılma noktasının ALTINDA duruyorlardı.
//
// Canlı oracle anahtarsız, ücretsiz bir gateway'e bağlı; yavaşlaması ya da
// kırmızıya düşmesi öngörülebilir bir olay. O olduğunda bedeli YALNIZCA ağ
// assertion'ları ödesin. Saf fonksiyon testleri ağa rehin olmamalı.
//
// Task 9 bu paketi bir kapı olarak kullanıyor: kapının ağ arızasında kaç
// assertion'ı sessizce düşürdüğü belirsiz kalmasın diye ağ işi en sonda.
// ══════════════════════════════════════════════════════════════════════════

// ── GERÇEK ETHERS — bağımsız oracle ────────────────────────────────────────
//
// Yukarıdaki testlerin hiçbiri ethers'ın revert karşısında NE YAPTIĞINI
// kanıtlamıyor; hatayı testin kendisi kuruyor. Burada taklit YOK:
//
//   - gerçek JsonRpcProvider (frontend/.env'deki Sepolia RPC'si)
//   - zincirde GERÇEKTEN revert etmiş, var olan bir tx
//   - ethers'ın KENDİ TransactionResponse.wait()'i
//
// Zincire hiçbir şey yayınlanmıyor: tx zaten orada, yalnızca okunuyor.
//
// Bu bölüm ethers'ın sözleşmesini sabitler: hangi `code`, `receipt` nerede
// duruyor (`e.receipt` mi, `e.info.receipt` mi). ethers sürümü yükseltilir de
// sözleşme değişirse burası kırmızı yanar — sahnede değil, burada.

console.log('\n=== GERÇEK ETHERS — canlı Sepolia oracle ===\n');

// Sepolia'da revert etmiş gerçek bir tx (blok 11690650). PQWallet ile İLGİSİ
// YOK — burada sınanan şey ethers'ın revert sözleşmesi, PQWallet'ın davranışı
// değil. PQWallet'ın kendi revert'i Task 7'de görülecek.
const REVERTED_TX = '0xe6bc4e2c67593cfea5a372af7e4af3b64391ad192bd336b10abca10897a388a0';
// Aynı bölgeden başarılı bir tx (blok 11690651) — status 1 yolunun karşılığı.
const SUCCESS_TX = '0x3eb20c482dc3a3503fdd5e18cb57ded0489b0a9b9d0b139c06461d1e82659843';

const envText = readFileSync(new URL('../../.env', import.meta.url), 'utf8');
const rpcUrl = envText.match(/^VITE_SEPOLIA_RPC_URL=(.*)$/m)?.[1]?.trim();
check('frontend/.env içinde VITE_SEPOLIA_RPC_URL var', Boolean(rpcUrl));

// ── BU BÖLÜM ARŞİV DÜĞÜMÜ İSTER ─────────────────────────────────────────────
//
// Paketin geri kalanı `VITE_SEPOLIA_RPC_URL`de kalıyor; YALNIZCA bu canlı
// oracle arşiv endpoint'ini kullanıyor. Sebep ölçüldü (15 Eylül 2026): public
// sağlayıcılar Sepolia receipt'lerini ~8.000-10.000 blok (≈30 saat) sonra
// buduyor. `eth_getTransactionByHash` tx'i vermeye devam ederken
// `eth_getTransactionReceipt` null dönüyor — yani bu bölümün sabitlenmiş
// hash'leri public endpoint'ten DOĞRULANAMIYOR.
//
// Bu bir kusur değil, ağ gerçeği: arşiv geçmişi tutmak pahalı ve ücretsiz
// public düğümler bunu yapmıyor.
const archiveRpcUrl = envText.match(/^VITE_SEPOLIA_ARCHIVE_RPC_URL=(.*)$/m)?.[1]?.trim();

// Değişken yoksa NET KIRMIZI — eksik değişkenin ADIYLA. Zaman aşımına düşüp
// "acaba ağ mı bozuk" diye düşündürmesi yasak; sessiz atlama da yok.
check('frontend/.env içinde VITE_SEPOLIA_ARCHIVE_RPC_URL var', Boolean(archiveRpcUrl),
  'EKSİK DEĞİŞKEN: VITE_SEPOLIA_ARCHIVE_RPC_URL — bu bölüm ARŞİV düğümü ister; '
  + 'public endpoint Sepolia receipt\'lerini buduyor. Anahtarsız çalışan: '
  + 'https://sepolia.gateway.tenderly.co (bkz. .env.example)');

// ── CANLI ORACLE'IN SÜRE SINIRI ─────────────────────────────────────────────
//
// TEŞHİS (15 Eylül 2026, ölçüldü — tahmin değil): paket `revertedTx.wait()`
// satırında asılıyordu. Her canlı await'in önüne bir iz satırı basılıp
// çalıştırıldı; çıktı `getTransaction` ikisinde de DÖNDÜ (null değil), sonra
// `wait()` çağrıldı ve bir daha dönmedi.
//
// KÖK SEBEP: `eth_getTransactionByHash` tx'i veriyor ama
// `eth_getTransactionReceipt` **null** dönüyor — sağlayıcı receipt geçmişini
// buduyor (~8.000-10.000 blok ≈ 30 saat). Aşağıdaki koruma (eski hâli)
// `getTransaction`'ın null olup olmadığına bakıyordu; **budanan receipt'ti,
// tx değil.** Koruma yanlış şeyi ölçtüğü için kırmızı yerine ASILMA çıkıyordu.
//
// ÜÇ KATMANLI SINIR (her katman ethers kaynağından TEYİT EDİLDİ):
//
//   1. `wait(confirms, timeout)` — ethers'ın KENDİ süre parametresi.
//      `lib.commonjs/providers/provider.js:1048` imza; `:1051` varsayılan 0
//      (= sınırsız, bugünkü asılmanın sebebi); `:1177-1182` timeout > 0 ise
//      `setTimeout` → `cancel()` + `reject(TIMEOUT)`. `cancel()` yoklamayı
//      GERÇEKTEN durduruyor: `stopScanning = true` ve
//      `provider.off(this.hash, txListener)`. Promise.race bunu yapamaz —
//      assertion'ı kırmızı yapar ama alttaki poll'ü iptal etmez, süreç yine
//      çıkmaz ve dışarıdan bugünkü asılmanın AYNISI görünür.
//   2. `provider.destroy()` — `finally`'de. Poller'ları söküyor:
//      `provider-jsonrpc.js:823` (drain timer + bekleyen istekler iptal) →
//      `super.destroy()` → `abstract-provider.js:1218`
//      (`removeAllListeners()` + tüm `#timers` temizleniyor). Süreç doğal
//      yoldan çıkıyor, çıkış kodu korunuyor.
//   3. Paket sonundaki açık `process.exit(kod)` — 1 ve 2 yetse bile yedek.
//
// Paket seviyesindeki genel sınır (dosyanın başı) dördüncü ağdır: BU testin
// değil, HERHANGİ bir asılmanın kırmızıya dönmesi için.
const WAIT_TIMEOUT_MS = Number(process.env.TEST_WAIT_TIMEOUT_MS ?? 20_000);

// Hangi hatayı yakaladığımızı AYRI AYRI yazar. Aksi hâlde bir sonraki kişi
// aynı teşhisi sıfırdan çıkarır — 15 Eylül'de olan tam olarak buydu.
function liveFailure(e, secs) {
  if (e == null) return 'bilinmeyen';
  // ÖLÇÜLDÜ: iki alan AYNI DEĞİL. `shortMessage` çıplak metni tutuyor,
  // `message` ise "(code=TIMEOUT, version=6.17.0)" ekini alıyor. Eşitlik
  // `message` üzerinden kurulursa wait-zaman-aşımı sessizce HTTP zaman
  // aşımı diye sınıflanır — kontrol edilmeden yazılmış bir eşitlik tam olarak
  // bu hatayı yapmıştı.
  const short = String(e.shortMessage ?? e.message ?? '');
  if (e.code === 'TIMEOUT' && short.startsWith('wait for transaction timeout')) {
    // provider.js:1180 — ethers'ın wait() sınırı doldu, receipt hiç gelmedi.
    return `receipt gelmedi, ${secs} sn (eth_getTransactionReceipt → null; sağlayıcı budamış olabilir)`;
  }
  if (e.code === 'TIMEOUT') {
    // utils/fetch.js:428 — HTTP isteğinin kendisi zaman aşımına uğradı.
    return `istek zaman aşımı (HTTP katmanı, ${secs} sn)`;
  }
  if (e.code === 'NETWORK_ERROR' || e.code === 'SERVER_ERROR') {
    return `ağ/sunucu hatası: ${e.code} — ${e.shortMessage ?? e.message}`;
  }
  return `${e.code ?? e.name} — ${e.shortMessage ?? e.message}`;
}

// liveFailure()'ın kendisi sınanır: kırmızı mesaj yanlış kategoriyi yazarsa
// bir sonraki kişi yanlış yeri kazar. Girdiler ethers 6.17'den ÖLÇÜLEN gerçek
// şekiller (yukarıdaki kaynak satırları).
{
  const waitTimeout = { code: 'TIMEOUT', shortMessage: 'wait for transaction timeout', message: 'wait for transaction timeout (code=TIMEOUT, version=6.17.0)' };
  const httpTimeout = { code: 'TIMEOUT', shortMessage: 'timeout', message: 'timeout (code=TIMEOUT, version=6.17.0)' };
  const netErr = { code: 'NETWORK_ERROR', shortMessage: 'could not detect network' };
  check('kırmızı mesaj: wait zaman aşımı → "receipt gelmedi"',
    liveFailure(waitTimeout, '20').startsWith('receipt gelmedi, 20 sn'), `gelen: ${liveFailure(waitTimeout, '20')}`);
  check('kırmızı mesaj: HTTP zaman aşımı → "istek zaman aşımı" (wait ile KARIŞMIYOR)',
    liveFailure(httpTimeout, '20').startsWith('istek zaman aşımı'), `gelen: ${liveFailure(httpTimeout, '20')}`);
  check('kırmızı mesaj: ağ hatası ayrı kategoriye düşüyor',
    liveFailure(netErr, '20').startsWith('ağ/sunucu hatası'), `gelen: ${liveFailure(netErr, '20')}`);
  check('kırmızı mesaj: tx null ve receipt null AYRI metinler',
    liveFailure(waitTimeout, '20') !== liveFailure(httpTimeout, '20'));
}

// Değişken yoksa bölüm HİÇ koşmaz: yukarıdaki check zaten KIRMIZI yandı ve
// paket kırmızı bitecek. Yine de koşturmak, gerçek sebebi (eksik değişken)
// yirmi saniyelik bir zaman aşımının altına gömerdi.
if (archiveRpcUrl) {
const provider = new JsonRpcProvider(archiveRpcUrl);

try {
  const revertedTx = await provider.getTransaction(REVERTED_TX);
  const successTx = await provider.getTransaction(SUCCESS_TX);

  // Zincirden gelmediyse sessizce atlama YOK — atlanan kontrol, yapılmamış
  // kontroldür. (RPC bu tx'leri budadıysa test kırmızı yanar ve yeni bir hash
  // seçilir; sessiz yeşilden iyidir.)
  check('revert eden tx zincirden okunabildi', revertedTx !== null, `tx null — hash: ${REVERTED_TX}`);
  check('başarılı tx zincirden okunabildi', successTx !== null, `tx null — hash: ${SUCCESS_TX}`);

  // KORUMA ARTIK DOĞRU ŞEYE BAKIYOR: budanan receipt'ti, tx değil. Receipt
  // yoksa aşağıdaki `wait()` çağrılarının hepsi süresiz yoklardı — ve
  // `sendExecute` içindeki `wait()` bizim dokunmadığımız dosyada (kapsam dışı:
  // gönderim yolu), yani oraya hiç girmemek tek doğru koruma.
  const revertedReceipt = revertedTx && await provider.getTransactionReceipt(REVERTED_TX);
  const successReceipt = successTx && await provider.getTransactionReceipt(SUCCESS_TX);

  check("revert eden tx'in RECEIPT'i zincirden okunabildi", revertedReceipt != null,
    `receipt null — sağlayıcı budamış. hash: ${REVERTED_TX}`);
  check("başarılı tx'in RECEIPT'i zincirden okunabildi", successReceipt != null,
    `receipt null — sağlayıcı budamış. hash: ${SUCCESS_TX}`);

  if (revertedTx && successTx && revertedReceipt && successReceipt) {
    // 1) ethers'ın KENDİ wait()'i revert karşısında ne yapıyor?
    let realErr = null;
    let realReceipt = null;
    let waitTimedOut = false;
    const t0 = Date.now();
    try {
      realReceipt = await revertedTx.wait(1, WAIT_TIMEOUT_MS);
    } catch (e) {
      realErr = e;
      waitTimedOut = e?.code === 'TIMEOUT';
    }
    const waitSecs = ((Date.now() - t0) / 1000).toFixed(0);

    // Süre dolması KIRMIZI'dır, "skipped" değil.
    check('GERÇEK ethers: wait() bir sonuca vardı (asılmadı)', !waitTimedOut,
      liveFailure(realErr, waitSecs));

    check('GERÇEK ethers: revert eden tx için wait() FIRLATIYOR (receipt döndürmüyor)',
      realErr !== null && realReceipt === null,
      `dönen receipt: ${realReceipt?.status}`);
    check('GERÇEK ethers: code === CALL_EXCEPTION', realErr?.code === 'CALL_EXCEPTION', `gelen: ${liveFailure(realErr, waitSecs)}`);
    check('GERÇEK ethers: receipt `e.receipt` alanında (e.info.receipt DEĞİL)',
      realErr?.receipt != null,
      `e.receipt: ${realErr?.receipt}, e.info?.receipt: ${realErr?.info?.receipt}`);
    check('GERÇEK ethers: e.receipt.status === 0', realErr?.receipt?.status === 0, `gelen: ${realErr?.receipt?.status}`);
    check('GERÇEK ethers: e.receipt.gasUsed zincirdeki değer (63730)', realErr?.receipt?.gasUsed === 63730n, `gelen: ${realErr?.receipt?.gasUsed}`);

    // 2) sendExecute bu GERÇEK hatadan receipt'i kurtarabiliyor mu?
    //    signer stub'ı yalnızca "tx gönderildi" numarası yapıyor; wait()'i
    //    yürüten ethers'ın kendi TransactionResponse'u.
    const realSigner = {
      async estimateGas() { return 200000n; },
      async sendTransaction() { return revertedTx; },
    };
    let rr = null;
    let rrThrown = null;
    try {
      rr = await sendExecute({ signer: realSigner, calldata: CALLDATA });
    } catch (e) {
      rrThrown = e;
    }
    check('sendExecute GERÇEK ethers hatasından receipt kurtarıyor', rrThrown === null && rr?.receipt != null, `fırlayan: ${rrThrown?.code}`);
    check('sendExecute → gerçek status 0 çağırana ulaşıyor', rr?.receipt?.status === 0, `gelen: ${rr?.receipt?.status}`);
    check('sendExecute → gerçek hash korunuyor', rr?.hash === REVERTED_TX);
    check('sendExecute → gerçek gasUsed korunuyor (63730)', rr?.receipt?.gasUsed === 63730n);

    // 3) Başarılı yol: gerçek wait() receipt döndürüyor, status 1.
    const okSigner = {
      async estimateGas() { return 200000n; },
      async sendTransaction() { return successTx; },
    };
    const okRes = await sendExecute({ signer: okSigner, calldata: CALLDATA });
    check('GERÇEK ethers: başarılı tx için wait() receipt DÖNDÜRÜYOR', okRes.receipt != null);
    check('sendExecute → gerçek status 1', okRes.receipt.status === 1, `gelen: ${okRes.receipt.status}`);
    check('sendExecute → status 1 ve status 0 AYIRT EDİLİYOR', okRes.receipt.status !== rr?.receipt?.status);
  }
} catch (e) {
  // Canlı oracle'ın kendisi patladıysa da KIRMIZI — sessizce yutulmaz.
  check('canlı Sepolia oracle bölümü hatasız koştu', false, liveFailure(e, '?'));
} finally {
  // KATMAN 2: poller'ları sök, süreç doğal yoldan çıksın (çıkış kodu korunur).
  provider.destroy();
}
} // if (archiveRpcUrl)

console.log(failures === 0 ? '\nTÜMÜ GEÇTİ' : `\n${failures} BAŞARISIZ`);
process.exit(failures === 0 ? 0 : 1);
