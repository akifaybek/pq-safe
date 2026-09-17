/* tslint:disable */
/* eslint-disable */

/**
 * Generate SPHINCS+ keypair from a BIP-39 mnemonic.
 * Returns JSON: { "seed": "0x...", "root": "0x...", "ecdsa_address": "0x..." }
 */
export function keygen_from_mnemonic(mnemonic: string, passphrase: string): string;

/**
 * Sign a message hash (32 bytes hex) using a BIP-39 mnemonic.
 * Returns the raw signature as hex (3688 bytes).
 */
export function sign_from_mnemonic(mnemonic: string, passphrase: string, message_hex: string): string;

/**
 * Sign with a pre-derived keypair (hex seed, hex sk_seed, hex root, hex message).
 * Skips BIP-39 derivation and pkRoot rebuild — fastest path.
 */
export function sign_with_keys(seed_hex: string, sk_seed_hex: string, root_hex: string, message_hex: string): string;
