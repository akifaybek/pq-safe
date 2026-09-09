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
