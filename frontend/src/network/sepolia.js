// Sepolia RPC'sine salt-okunur bağlantı. Şimdilik sadece bağlantıyı
// doğrulamak için var (chainId + blok numarası) — tx gönderme ve kontrat
// state okuma, Hakan'ın deploy adresleri geldikten sonraki ayrı bir adım.
import { JsonRpcProvider } from 'ethers';

const SEPOLIA_CHAIN_ID = 11155111n;

export function getProvider() {
  const rpcUrl = import.meta.env.VITE_SEPOLIA_RPC_URL;
  if (!rpcUrl) {
    throw new Error(
      'VITE_SEPOLIA_RPC_URL tanımlı değil — frontend/.env dosyasına ekleyin (bkz. .env.example)',
    );
  }
  return new JsonRpcProvider(rpcUrl);
}

export async function checkSepoliaConnection() {
  const provider = getProvider();
  const network = await provider.getNetwork();
  if (network.chainId !== SEPOLIA_CHAIN_ID) {
    throw new Error(
      `Sepolia (${SEPOLIA_CHAIN_ID}) bekleniyordu, RPC chainId ${network.chainId} döndürdü — ` +
        "digest formatı chainId'e bağlı, yanlış ağda üretilen imzalar geçersiz olur.",
    );
  }
  const blockNumber = await provider.getBlockNumber();
  return { chainId: network.chainId, blockNumber };
}
