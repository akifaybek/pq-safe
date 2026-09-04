// Sepolia'daki gerçek PQWallet'a karşı zincir okuma + saf calldata/imza
// yardımcıları.
//
// Neden buildTransaction.js'e eklenmedi: o modül saf ve ağdan habersiz
// kalmalı (compute*/build* ayrımı). Zincir okuma yan etkisi onu test
// edilemez hale getirirdi.
import { Contract } from 'ethers';
import { CONTRACTS } from '../config/contracts.js';
import { getSepoliaProvider, assertSepoliaNetwork } from '../network/sepolia.js';

// Yalnızca çağırdığımız üç fonksiyon. Tam ABI src/contracts/PQWallet.json'da
// duruyor; Task 2'deki test bu parçaların o ABI ile aynı calldata'yı
// ürettiğini doğruluyor.
export const PQWALLET_FRAGMENTS = [
  'function nonce() view returns (uint256)',
  'function _computeDigest(address to, uint256 value, bytes data) view returns (bytes32)',
  'function execute(address to, uint256 value, bytes data, bytes signature)',
];

// provider enjeksiyonu test içindir, ama enjekte edilen provider da
// doğrulanır — doğrulanmamış provider chainId kontrolünü atlatamaz.
async function resolveProvider(provider) {
  if (!provider) return getSepoliaProvider();
  await assertSepoliaNetwork(provider);
  return provider;
}

async function walletContract(provider) {
  return new Contract(CONTRACTS.pqWallet, PQWALLET_FRAGMENTS, await resolveProvider(provider));
}

export async function readNonce(provider) {
  return (await walletContract(provider)).nonce();
}

export async function readBalance(provider) {
  const p = await resolveProvider(provider);
  return p.getBalance(CONTRACTS.pqWallet);
}

// Kontratın kendi digest hesabı. JS tarafıyla karşılaştırmak için — Sprint
// 2'deki digest uyum testinin canlı, deploy edilmiş kontrat üzerindeki hali.
// DİKKAT: kontrat MEVCUT on-chain nonce'u kullanır (PQWallet.sol:34), yani
// karşılaştırma ancak imzalanan nonce güncelken anlamlıdır.
export async function readDigest({ to, value, data }, provider) {
  return (await walletContract(provider))._computeDigest(to, value, data);
}
