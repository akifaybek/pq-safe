// Sepolia'ya deploy edilmiş kontrat adresleri. Kaynak: docs/tx-hashes.md
// (Hakan, 1 Eylül 2026 — 4/4 kontrat Etherscan'de doğrulandı).
//
// Neden .env değil: bu adresler gizli değil, zincirde zaten herkese açık.
// .env'de tutulursa demo başka bir makinede çalışmaz. .env yalnızca RPC
// URL'i için kullanılıyor.
export const CONTRACTS = {
  pqWallet: '0x2EafA294C14b6752128bfd4f5873D1EA39f000BB',
  sphincsVerifier: '0x143Db127BE77FdE689629b18F9F415014C514a2E',
  migration: '0x93e2938A04AE4FbC59a5FDe59D7683667eDD5536',
  chainId: 11155111n,
  explorerTxBase: 'https://sepolia.etherscan.io/tx/',
  explorerAddressBase: 'https://sepolia.etherscan.io/address/',
};
