#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FRONTEND_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
REPO_ROOT="$(cd "$FRONTEND_DIR/.." && pwd)"
CRATE_DIR="$REPO_ROOT/contracts/lib/sphincs-minus/signer-wasm"
OUT_DIR="$FRONTEND_DIR/src/crypto/wasm-pkg"

if ! command -v wasm-pack >/dev/null 2>&1; then
  echo "ERROR: wasm-pack bulunamadı. Kurulum: cargo install wasm-pack" >&2
  exit 1
fi

if ! rustup target list --installed 2>/dev/null | grep -q wasm32-unknown-unknown; then
  echo "ERROR: wasm32-unknown-unknown target kurulu değil. Kurulum: rustup target add wasm32-unknown-unknown" >&2
  exit 1
fi

echo "Derleniyor: $CRATE_DIR -> $OUT_DIR"
wasm-pack build "$CRATE_DIR" --target nodejs --out-dir "$OUT_DIR"
echo "Tamamlandı: $OUT_DIR"
