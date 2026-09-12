// MetaMask (EIP-1193) üzerinden execute() gönderme katmanı.
//
// Neden ayrı modül: buildTransaction.js saf kalmalı; cüzdan bağlama ve tx
// gönderme yan etkileri onu test edilemez hale getirir. `window.ethereum`a
// dokunan her şey bu dosyada toplanır — main.js EIP-1193 ayrıntısı bilmez.
import { BrowserProvider } from 'ethers';
import { CONTRACTS } from '../config/contracts.js';

export async function connectWallet() {
  if (!window.ethereum) {
    throw new Error(
      'MetaMask bulunamadı — tarayıcı eklentisini kurup sayfayı yenileyin.',
    );
  }
  const browserProvider = new BrowserProvider(window.ethereum);
  await browserProvider.send('eth_requestAccounts', []);
  const network = await browserProvider.getNetwork();
  if (network.chainId !== CONTRACTS.chainId) {
    throw new Error(
      `MetaMask ${network.chainId} ağında; Sepolia (${CONTRACTS.chainId}) gerekiyor. ` +
        "Digest chainId'e bağlı olduğu için yanlış ağda gönderilen işlem geçersizdir.",
    );
  }
  const signer = await browserProvider.getSigner();
  return { signer, address: await signer.getAddress(), chainId: network.chainId };
}

// Bağlantı KURULDUKTAN SONRA MetaMask'te ağ ya da hesap değişebilir.
// connectWallet() chainId'i bir kez okuyup döndürüyor; o değer bağlantı anının
// fotoğrafıdır ve sonrasında bayatlar. Bayat bir bağlantıyla gönderim, Task
// 4'ün var olma sebebi olan chainId kontrolünü bağlantı sonrasındaki her an
// için kör bırakır — yanlış ağda digest geçersizdir.
//
// Bu, kod tabanındaki mevcut desenin aynısı: girdi değişince `signed`
// temizleniyor (main.js `invalidateSignature`). Aynı gerekçe, farklı state.
//
// Ağ Sepolia'dan çıkıp geri dönse bile bağlantı düşürülür — "yeni ağ yine
// doğru mu" diye bakmak yerine tek kural uygulanır, yeniden bağlamak tek
// tık. Sessizce geçerli kalan bir bağlantı, bu kontrolün kör noktasıdır.
export function watchWalletChanges(onDisconnect) {
  if (!window.ethereum?.on) return;

  window.ethereum.on('chainChanged', (chainIdHex) => {
    onDisconnect({ reason: 'chainChanged', chainIdHex });
  });

  window.ethereum.on('accountsChanged', (accounts) => {
    onDisconnect({ reason: 'accountsChanged', accounts: accounts ?? [] });
  });
}

// Bağlantının NEDEN düştüğünü anlatan metin. Dört durumun dördü de bağlantıyı
// düşürür ama sebepleri ve DÜZELTMELERİ farklıdır; hepsine aynı metni basmak
// provada yanlış yere baktırır ("bağlantı düştü" görüp ağa bakarsın, oysa
// hesap değişmiştir).
//
// `previousAddress`: bağlantı düşmeden önce bağlı olan hesap. MetaMask
// `accountsChanged` ile yalnızca yeni hesabı değil, İZİNLİ HESAPLARIN TAM
// LİSTESİNİ gönderiyor (ilk eleman aktif olan) — 8 Eylül elle doğrulamasında
// olay dökümünden görüldü. Bu yüzden "liste değişti" ile "aktif hesap değişti"
// aynı şey değil: kullanıcı aktif hesabı değiştirmeden listeye yeni bir hesap
// eklerse (MetaMask "connect more accounts") olay yine gelir. O durumda
// bağlantıyı düşürmek doğru (izin yüzeyi değişti, signer tazelenmeli) ama
// "aktif hesap değişti" demek YANLIŞ olurdu.
//
// Saf fonksiyon ve HTML üretmiyor (yalnızca metin) — böylece node'dan test
// edilebiliyor (`send-transaction-test.mjs`) ve kaçış işi tek bir yerde,
// çağıranın `esc()`inde kalıyor.
export function disconnectMessage(change, previousAddress = null) {
  if (change.reason === 'chainChanged') {
    const which = change.chainIdHex ? ` (yeni chainId: ${change.chainIdHex})` : '';
    return {
      title: `Cüzdan bağlantısı düştü — MetaMask'in ağı değişti${which}.`,
      fix:
        "Digest chainId'e bağlıdır; başka bir ağda gönderilen işlem geçersizdir. " +
        `MetaMask'i Sepolia'ya (${CONTRACTS.chainId}) alıp yeniden bağlanın.`,
    };
  }
  const accounts = change.accounts ?? [];
  if (accounts.length === 0) {
    return {
      title: 'Cüzdan bağlantısı düştü — MetaMask bu sitenin erişimini kesti.',
      fix: "MetaMask'ten bu siteye tekrar izin verip yeniden bağlanın.",
    };
  }
  const sameActive =
    previousAddress && accounts[0]?.toLowerCase() === previousAddress.toLowerCase();
  if (sameActive) {
    return {
      title: "Cüzdan bağlantısı düştü — MetaMask'te bu sitenin hesap izinleri değişti.",
      fix:
        'Aktif hesap aynı kaldı, ama izinli hesap listesi değişti. Bağlantıyı ' +
        'yenilemek için tekrar bağlanın.',
    };
  }
  return {
    title: "Cüzdan bağlantısı düştü — MetaMask'te aktif hesap değişti.",
    fix:
      "Gas'ı ödeyecek hesap değiştiği için bağlantı yenilenmeli: önceki hesabı " +
      'geri seçin ya da yeni hesapla yeniden bağlanın.',
  };
}

// Gas tahmini başarısız olursa kullanılacak sabit limit.
//
// Neden 350.000: execute()'un gerçek on-chain maliyeti ÖLÇÜLDÜ — 233.429
// (Sepolia tx 0xd62b812e…631ad9), bu onun ~1,5 katı.
//
// DİKKAT: o 233.429, VAR OLAN bir alıcıya yapılan transferdi. Demoda daha önce
// hiç kullanılmamış bir adrese gönderilirse EVM'in yeni hesap oluşturma bedeli
// +25.000 biner (ölçüldü) ve maliyet 258.429 olur. 350.000 bunu da, `data`
// alanı dolu bir çağrıyı da kapsıyor. Kullanılmayan gas iade edildiği için tek
// maliyet peşin bloke edilen bakiyedir (~0,00039 ETH).
// Önceki değer 2.000.000'du; gerekçesi "gerçek maliyeti bilmiyoruz"du ve o
// gerekçe kalktı. Ayrıntı: docs/evidence/gas-reports/sprint3-execute-real-gas.md
export const GAS_FALLBACK = 350000n;

// KALKAN 3 — eth_call ön-uçuşu: gaz harcamadan aynı çağrıyı simüle eder. Bozuk
// imza, yetersiz bakiye, hedef çağrının patlaması ve (kalkan 1'den kaçan) nonce
// uyuşmazlığı — hepsini yakalar. Kontrattaki require string'leri ethers
// tarafından okunabilir metne çevrilir ve hatanın `reason` alanında döner
// ("PQWallet: invalid signature" — PQWallet.sol:44, "PQWallet: call failed" —
// PQWallet.sol:51).
export async function preflight({ signer, calldata }) {
  await signer.call({ to: CONTRACTS.pqWallet, data: calldata });
}

// İmzalı execute() çağrısını zincire gönderir.
//
// DÖNÜŞ: { hash, receipt, gasLimit }. receipt.status'u ÇAĞIRAN kontrol eder —
// bu fonksiyon "başarılı" demez, yalnızca "zincire yazıldı" der.
export async function sendExecute({ signer, calldata }) {
  let gasLimit;
  let gasEstimated = true;
  try {
    const estimated = await signer.estimateGas({ to: CONTRACTS.pqWallet, data: calldata });
    gasLimit = (estimated * 12n) / 10n; // %20 pay
  } catch {
    // Public RPC bu calldata boyutunda (3,9 KB) eth_estimateGas'ta zorlanabilir.
    // Tahminin başarısız olması gönderimi öldürmemeli — ölçülmüş sabit limite
    // düşülür ve çağıran bunu kullanıcıya bildirebilsin diye bayrak döner.
    gasLimit = GAS_FALLBACK;
    gasEstimated = false;
  }

  const tx = await signer.sendTransaction({ to: CONTRACTS.pqWallet, data: calldata, gasLimit });

  // ethers v6'da `tx.wait()` revert eden bir tx için receipt DÖNDÜRMEZ:
  // provider.js'teki `checkReceipt` (v6.17, satır 1139) `receipt.status === 0`
  // görünce CALL_EXCEPTION fırlatır. O hatanın `receipt` alanı DOLUDUR.
  //
  // Burada yakalanmasının sebebi: revert eden bir tx de zincire yazılmıştır —
  // hash'i, blok numarası ve HARCANAN gas'ı gerçektir ve kanıttır. Hatayı
  // olduğu gibi yukarı bırakmak, çağıranın generic hata dalına düşmesine ve
  // ekranda tx hash'i ile Etherscan linkinin KAYBOLMASINA yol açıyordu.
  //
  // Yalnızca CALL_EXCEPTION + receipt kurtarılır. TRANSACTION_REPLACED ve
  // TIMEOUT başka şeylerdir (tx'in akıbeti belirsizdir, "revert etti"
  // denemez); onlar hash'i taşıyarak yeniden fırlatılır.
  let receipt;
  try {
    receipt = await tx.wait();
  } catch (e) {
    if (e?.code === 'CALL_EXCEPTION' && e.receipt) {
      receipt = e.receipt;
    } else {
      if (e && typeof e === 'object') e.txHash = tx.hash;
      throw e;
    }
  }

  return { hash: tx.hash, receipt, gasLimit, gasEstimated };
}
