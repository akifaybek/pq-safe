#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FRONTEND_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
REPO_ROOT="$(cd "$FRONTEND_DIR/.." && pwd)"
CONTRACTS_DIR="$REPO_ROOT/contracts"
OUT_DIR="$FRONTEND_DIR/src/contracts"

# Frontend'in doğrudan çağırdığı kontratlar. SPHINCSVerifier dahil değil —
# PQWallet.execute() içinden çağrılıyor, frontend onu hiç görmüyor (bkz.
# docs/INTERFACE.md).
CONTRACT_NAMES=(PQWallet Migration)

if ! command -v jq >/dev/null 2>&1; then
  echo "ERROR: jq bulunamadı. Kurulum: brew install jq" >&2
  exit 1
fi

echo "forge build çalıştırılıyor: $CONTRACTS_DIR"
(cd "$CONTRACTS_DIR" && forge build)

mkdir -p "$OUT_DIR"

for name in "${CONTRACT_NAMES[@]}"; do
  artifact="$CONTRACTS_DIR/out/${name}.sol/${name}.json"
  if [ ! -f "$artifact" ]; then
    echo "ERROR: artifact bulunamadı: $artifact (forge build başarısız mı oldu?)" >&2
    exit 1
  fi
  jq '.abi' "$artifact" > "$OUT_DIR/${name}.json"
  entries=$(jq 'length' "$OUT_DIR/${name}.json")
  echo "  ${name}.json yazıldı ($entries ABI girişi)"
done

echo "Tamamlandı: $OUT_DIR"
echo "NOT: Hakan'ın PQWallet.sol/Migration.sol'ünde ABI'yi değiştiren bir değişiklik olursa bu script tekrar çalıştırılmalı."
