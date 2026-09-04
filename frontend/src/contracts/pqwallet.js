// Sepolia'daki gerçek PQWallet'a karşı zincir okuma + saf calldata/imza
// yardımcıları.
//
// Neden buildTransaction.js'e eklenmedi: o modül saf ve ağdan habersiz
// kalmalı (compute*/build* ayrımı). Zincir okuma yan etkisi onu test
// edilemez hale getirirdi.
import { Contract, Interface } from 'ethers';
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

const IFACE = new Interface(PQWALLET_FRAGMENTS);

// execute() calldata'sı. Argümanlar HER ZAMAN buildDigest'in döndürdüğü
// `fields`'tan gelmeli — DOM'dan yeniden okunursa ikinci bir normalizasyon
// yolu doğar, digest'e giren baytlardan sessizce sapar ve zincirde
// "PQWallet: invalid signature" alırsınız (imza sağlamken).
export function encodeExecute({ to, value, data, signature }) {
  return IFACE.encodeFunctionData('execute', [to, value, data, signature]);
}

// Negatif kanıt için: imzanın bir baytını bozar.
//
// SAF: girdiyi yerinde değiştirmez, bozulmuş bir KOPYA döndürür. Aksi halde
// "bozuk imzayla dene" butonuna basan kullanıcı saklanan gerçek imzayı da
// bozar ve ardından gönderdiği tx anlaşılmaz şekilde başarısız olur.
export function tamperSignature(signature) {
  const body = signature.slice(2);
  if (body.length < 2) throw new Error('imza çok kısa, bozulamaz');
  // Ortadaki baytı çevir — baş/son baytlar bazı kodlamalarda özel anlam taşır.
  // Uzunluk KORUNUR: imza kısalırsa verifier onu "geçersiz imza" diye değil
  // "bozuk girdi" diye reddedebilir ve negatif kanıtın iddiası zayıflar.
  const i = Math.floor(body.length / 4) * 2;
  const byte = body.slice(i, i + 2);
  const flipped = (parseInt(byte, 16) ^ 0xff).toString(16).padStart(2, '0');
  return '0x' + body.slice(0, i) + flipped + body.slice(i + 2);
}

// Negatif kanıt akışının TAMAMI — bozma + calldata kurma tek yerde.
//
// Neden ayrı fonksiyon, neden `signed` nesnesini alıyor: negatif kanıt
// mantığı handler'a gömülü kalsaydı, orada yazılacak bir
// `signed.signature = tamperSignature(signed.signature)` ataması saklanan
// gerçek imzayı bozardı ve sonraki "Gönder" bozuk imzayı zincire yollardı.
// Buraya çekilince o hata otomatik testle yakalanabiliyor: `signed` bir
// NESNE, yani mutable — "state değişmedi" assertion'ının dişi var.
//
// Bu fonksiyon `signed`'ı OKUR, asla yazmaz.
export function buildNegativeProofCalldata(signed) {
  const { to, value, data } = signed.fields;
  return encodeExecute({ to, value, data, signature: tamperSignature(signed.signature) });
}
