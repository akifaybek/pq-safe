// İşlem alanlarından PQWallet'ın imzalayacağı digest'i kurar.
//
// İsimlendirme: `digest.js`'teki compute* fonksiyonları dondurulmuş formatı
// uygular — saf, ağdan habersiz, verileni olduğu gibi kullanır. Buradaki
// build* fonksiyonları ise zincir bağlamını (chainId) enjekte eder, girdileri
// doğrular ve imzalamayla kompoze eder. Format burada değişmez.

import { getAddress, isHexString } from 'ethers';
import { computeDigest, computeDomainSeparator } from '../crypto/digest.js';
import { SEPOLIA_CHAIN_ID } from '../network/sepolia.js';
import { signDigest } from '../crypto/signer.js';

const UINT256_MAX = (1n << 256n) - 1n;

// ethers hatalı adres için "invalid address" diyor ama HANGİ alan olduğunu
// söylemiyor. Beş girdili bir formda bu kullanılamaz — her alanı kendi adıyla
// sarıyoruz.
function requireAddress(fieldName, value) {
  try {
    return getAddress(String(value ?? '').trim());
  } catch {
    throw new Error(`${fieldName} alanı geçerli bir adres değil: ${value}`);
  }
}

function requireUint(fieldName, value) {
  // BigInt('') === 0n, yani boş/eksik alan sessizce 0'a çökerdi. nonce bu
  // projenin tek replay koruması olduğu için (SPHINCS- stateless, sayaç yok)
  // "girmedim" ile "0 girdim" ayırt edilemez olamaz — boşluk açıkça reddedilir.
  const raw = String(value ?? '').trim();
  if (raw === '') {
    throw new Error(`${fieldName} alanı boş bırakılamaz`);
  }

  let parsed;
  try {
    // BigInt hex/oktal gösterimi de kabul eder ("0x10" → 16n); block explorer'dan
    // kopyalanan nonce/value doğrudan çalışsın diye bilerek engellenmedi.
    parsed = BigInt(raw);
  } catch {
    throw new Error(`${fieldName} alanı geçerli bir tamsayı değil: ${value}`);
  }
  if (parsed < 0n) {
    throw new Error(`${fieldName} alanı negatif olamaz: ${value}`);
  }
  // Üst sınır burada yakalanmazsa hata abiCoder.encode'dan çıplak ethers
  // mesajı olarak geliyor ve hangi alan olduğunu söylemiyor.
  if (parsed > UINT256_MAX) {
    throw new Error(`${fieldName} alanı uint256 sınırını aşıyor: ${value}`);
  }
  return parsed;
}

// isHexString('0xabc') true döner ama uzunluk tek — Solidity bytes'a
// çevrilemez, o yüzden ayrıca çift uzunluk kontrolü var.
// Bu katman yalnızca hex string kabul eder. digest.js'in computeDigest'i
// Uint8Array de kabul ediyor ama form girdisi her zaman metin — tek bir
// veri yolu tutmak keccak256(data) dalının dallanmamasını sağlıyor.
function requireHexData(fieldName, value) {
  const raw = String(value ?? '').trim();
  if (raw === '') return '0x';
  if (!isHexString(raw) || raw.length % 2 !== 0) {
    throw new Error(
      `${fieldName} alanı geçerli hex değil (0x ile başlamalı, çift sayıda karakter): ${value}`,
    );
  }
  return raw;
}

export function buildDigest({ walletAddress, nonce, to, value, data }) {
  const wallet = requireAddress('PQWallet adresi', walletAddress);
  const recipient = requireAddress('to', to);
  const nonceValue = requireUint('nonce', nonce);
  const weiValue = requireUint('value', value);
  const callData = requireHexData('data', data);

  const domainSeparator = computeDomainSeparator(SEPOLIA_CHAIN_ID, wallet);
  const digest = computeDigest({
    chainId: SEPOLIA_CHAIN_ID,
    walletAddress: wallet,
    nonce: nonceValue,
    to: recipient,
    value: weiValue,
    data: callData,
  });

  // Normalize edilmiş alanlar da dönüyor: sonraki adımda execute() calldata'sı
  // bu değerlerden kurulacak. Ham girdiden yeniden normalize edilseydi ikinci
  // bir normalizasyon yolu doğar ve digest'e giren byte'lardan sessizce
  // sapabilirdi — sonucu yerelde yeşil sayfa, zincirde çıplak revert olurdu.
  const fields = {
    walletAddress: wallet,
    nonce: nonceValue,
    to: recipient,
    value: weiValue,
    data: callData,
  };

  return { domainSeparator, digest, fields };
}

// signMs YALNIZCA signDigest() süresini ölçer. Digest hesaplama ayrıca
// ölçülmüyor: milisaniye altı olduğu için kanıt değeri yok ve tek bir
// birleşik süre "bu rakam neyi ölçüyor" belirsizliği yaratırdı.
export async function buildAndSign({ walletAddress, nonce, to, value, data, mnemonic }) {
  if (!mnemonic) {
    throw new Error('mnemonic yok — önce 1. bölümde anahtar üretin');
  }
  const { domainSeparator, digest, fields } = buildDigest({ walletAddress, nonce, to, value, data });

  const t0 = performance.now();
  const { signature, sigBytes } = await signDigest(mnemonic, digest);
  const signMs = performance.now() - t0;

  return { domainSeparator, digest, fields, signature, sigBytes, signMs };
}
