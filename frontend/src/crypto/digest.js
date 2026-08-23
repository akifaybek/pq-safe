// PQWallet'ın imzalattığı mesaj özetini (digest) üretir. Format
// `docs/GOREV_SINIRLARI.md` Bölüm 4'te dondurulmuş — Solidity tarafıyla
// (Hakan'ın `PQWallet.sol._computeDigest()`) birebir aynı byte'ları
// üretmek zorunda. Değişirse ikisi de bozulur, tek taraflı değiştirilmez.
//
// digest = keccak256(abi.encode(DOMAIN_SEPARATOR, nonce, to, value, keccak256(data)))
// DOMAIN_SEPARATOR = keccak256(abi.encode(keccak256("PQSAFE_V1"), chainId, walletAddress))

import { AbiCoder, keccak256, toUtf8Bytes } from 'ethers';

const abiCoder = AbiCoder.defaultAbiCoder();
const VERSION_TAG = keccak256(toUtf8Bytes('PQSAFE_V1'));

export function computeDomainSeparator(chainId, walletAddress) {
  return keccak256(
    abiCoder.encode(['bytes32', 'uint256', 'address'], [VERSION_TAG, chainId, walletAddress]),
  );
}

// data: '0x'-önekli hex string veya Uint8Array. Boşsa '0x' geç (Solidity'de
// keccak256("") ile aynı sonucu verir).
export function computeDigest({ chainId, walletAddress, nonce, to, value, data = '0x' }) {
  const domainSeparator = computeDomainSeparator(chainId, walletAddress);
  const dataHash = keccak256(data);
  return keccak256(
    abiCoder.encode(
      ['bytes32', 'uint256', 'address', 'uint256', 'bytes32'],
      [domainSeparator, nonce, to, value, dataHash],
    ),
  );
}
