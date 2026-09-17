#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FRONTEND_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
REPO_ROOT="$(cd "$FRONTEND_DIR/.." && pwd)"
CRATE_DIR="$REPO_ROOT/contracts/lib/sphincs-minus/signer-wasm"
# İKİ HEDEF DE ZORUNLU, biri değil:
#   nodejs -> wasm-pkg      : src/crypto/wasm-signer-test.mjs require ediyor
#   web    -> wasm-pkg-web  : src/crypto/signer.js import ediyor, yani uygulamanın kendisi
# Yalnızca nodejs üretilirse temiz klonda signer.js çözülemez; build-transaction-test.mjs
# ve `vite build` ERR_MODULE_NOT_FOUND ile patlar. Ölçüldü: ÖK-2, 17 Eylül 2026.
OUT_DIR_NODE="$FRONTEND_DIR/src/crypto/wasm-pkg"
OUT_DIR_WEB="$FRONTEND_DIR/src/crypto/wasm-pkg-web"

if ! command -v wasm-pack >/dev/null 2>&1; then
  echo "ERROR: wasm-pack bulunamadı. Kurulum: cargo install wasm-pack" >&2
  exit 1
fi

if ! rustup target list --installed 2>/dev/null | grep -q wasm32-unknown-unknown; then
  echo "ERROR: wasm32-unknown-unknown target kurulu değil. Kurulum: rustup target add wasm32-unknown-unknown" >&2
  exit 1
fi

echo "Derleniyor (nodejs): $CRATE_DIR -> $OUT_DIR_NODE"
wasm-pack build "$CRATE_DIR" --target nodejs --out-dir "$OUT_DIR_NODE"

echo "Derleniyor (web): $CRATE_DIR -> $OUT_DIR_WEB"
wasm-pack build "$CRATE_DIR" --target web --out-dir "$OUT_DIR_WEB"

# wasm-pack her çıktı dizinine içinde tek bir * olan .gitignore koyuyor. Bu yüzden
# eksik dizin `git status`ta HİÇ görünmez; hata yalnızca temiz klonda ortaya çıkar.
for D in "$OUT_DIR_NODE" "$OUT_DIR_WEB"; do
  if [ ! -f "$D/sphincs_c13_signer.js" ]; then
    echo "ERROR: beklenen çıktı yok: $D/sphincs_c13_signer.js" >&2
    exit 1
  fi
done

echo "Tamamlandı: $OUT_DIR_NODE + $OUT_DIR_WEB"
