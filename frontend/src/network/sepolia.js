// Sepolia RPC'sine salt-okunur bağlantı. Şimdilik sadece bağlantıyı
// doğrulamak için var (chainId + blok numarası) — tx gönderme ve kontrat
// state okuma, Hakan'ın deploy adresleri geldikten sonraki ayrı bir adım.
import { JsonRpcProvider } from 'ethers';

export const SEPOLIA_CHAIN_ID = 11155111n;

// Ağı doğrulanmış provider ilk başarılı kontrolden sonra burada tutulur.
// Sadece başarı durumunda dolduruluyor: geçici bir RPC hatası bağlantıyı
// kalıcı olarak zehirlemesin, kullanıcı tekrar deneyebilsin.
let validated = null;

// Ağı DOĞRULANMAMIŞ provider. Bilerek dışa açılmıyor: doğrudan kullanılırsa
// chainId kontrolü atlanır, yanlış ağda üretilen imzalar da yerelde hiçbir
// belirti vermeden on-chain reddedilir. Kontrat okuma ve tx gönderme dahil
// her tüketici getSepoliaProvider() kullanmalı.
function createUncheckedProvider() {
  const rpcUrl = import.meta.env.VITE_SEPOLIA_RPC_URL?.trim();
  if (!rpcUrl) {
    throw new Error(
      'VITE_SEPOLIA_RPC_URL tanımlı değil — frontend/.env dosyasına ekleyin (bkz. .env.example)',
    );
  }
  return new JsonRpcProvider(rpcUrl);
}

// Bir provider'ın gerçekten Sepolia'ya baktığını doğrular. Dışa açık, çünkü
// test koşucusu (Node) kendi provider'ını enjekte ediyor — ama enjeksiyon
// chainId kontrolünü ATLAYAMAMALI. Doğrulanmamış provider sızarsa yanlış
// ağda üretilen imzalar yerelde hiçbir belirti vermeden on-chain reddedilir.
// Doğrulanan Network nesnesini DÖNDÜRÜR — çağıranın chainId için ikinci bir
// getNetwork() (yani ikinci bir RPC gidiş-dönüşü) yapmasına gerek kalmasın.
export async function assertSepoliaNetwork(provider) {
  const network = await provider.getNetwork();
  if (network.chainId !== SEPOLIA_CHAIN_ID) {
    throw new Error(
      `Sepolia (${SEPOLIA_CHAIN_ID}) bekleniyordu, RPC chainId ${network.chainId} döndürdü — ` +
        "digest formatı chainId'e bağlı, yanlış ağda üretilen imzalar geçersiz olur.",
    );
  }
  return network;
}

// Ağı doğrulanmış Sepolia provider'ı — frontend'in tek provider kaynağı.
export async function getSepoliaProvider() {
  if (validated) return validated.provider;

  const provider = createUncheckedProvider();
  // DİKKAT: assertSepoliaNetwork içindeki getNetwork() bilerek RPC'ye soruyor.
  // Provider'a `staticNetwork: true` eklenirse ethers ağı sormadan
  // yapılandırılmış değeri döndürür ve kontrol hiçbir zaman başarısız
  // olamayan bir totolojiye dönüşür. Performans gerekçesiyle değiştirmeyin.
  const network = await assertSepoliaNetwork(provider);

  validated = { provider, chainId: network.chainId };
  return provider;
}

export async function checkSepoliaConnection() {
  const provider = await getSepoliaProvider();
  const blockNumber = await provider.getBlockNumber();
  // chainId olarak sabit değil, RPC'nin gerçekten döndürdüğü değer dönüyor —
  // UI'da gösterilen sayı bağlantının kanıtı olsun diye.
  return { chainId: validated.chainId, blockNumber };
}
