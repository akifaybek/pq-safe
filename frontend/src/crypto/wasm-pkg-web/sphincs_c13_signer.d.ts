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

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
    readonly memory: WebAssembly.Memory;
    readonly keygen_from_mnemonic: (a: number, b: number, c: number, d: number) => [number, number, number, number];
    readonly sign_from_mnemonic: (a: number, b: number, c: number, d: number, e: number, f: number) => [number, number, number, number];
    readonly sign_with_keys: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number) => [number, number, number, number];
    readonly __wbindgen_externrefs: WebAssembly.Table;
    readonly __wbindgen_malloc: (a: number, b: number) => number;
    readonly __wbindgen_realloc: (a: number, b: number, c: number, d: number) => number;
    readonly __externref_table_dealloc: (a: number) => void;
    readonly __wbindgen_free: (a: number, b: number, c: number) => void;
    readonly __wbindgen_start: () => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;

/**
 * Instantiates the given `module`, which can either be bytes or
 * a precompiled `WebAssembly.Module`.
 *
 * @param {{ module: SyncInitInput }} module - Passing `SyncInitInput` directly is deprecated.
 *
 * @returns {InitOutput}
 */
export function initSync(module: { module: SyncInitInput } | SyncInitInput): InitOutput;

/**
 * If `module_or_path` is {RequestInfo} or {URL}, makes a request and
 * for everything else, calls `WebAssembly.instantiate` directly.
 *
 * @param {{ module_or_path: InitInput | Promise<InitInput> }} module_or_path - Passing `InitInput` directly is deprecated.
 *
 * @returns {Promise<InitOutput>}
 */
export default function __wbg_init (module_or_path?: { module_or_path: InitInput | Promise<InitInput> } | InitInput | Promise<InitInput>): Promise<InitOutput>;
