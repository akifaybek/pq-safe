#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FRONTEND_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
REPO_ROOT="$(cd "$FRONTEND_DIR/.." && pwd)"
CRATE_DIR="$REPO_ROOT/contracts/lib/sphincs-minus/signer-wasm"
SUBMODULE_DIR="$REPO_ROOT/contracts/lib/sphincs-minus"
MANIFEST="$SCRIPT_DIR/wasm-manifest.json"
# İKİ HEDEF DE ZORUNLU, biri değil:
#   nodejs -> wasm-pkg      : src/crypto/wasm-signer-test.mjs require ediyor
#   web    -> wasm-pkg-web  : src/crypto/signer.js import ediyor, yani uygulamanın kendisi
# Yalnızca nodejs üretilirse temiz klonda signer.js çözülemez; build-transaction-test.mjs
# ve `vite build` ERR_MODULE_NOT_FOUND ile patlar. Ölçüldü: ÖK-2, 17 Eylül 2026.
OUT_DIR_NODE="$FRONTEND_DIR/src/crypto/wasm-pkg"
OUT_DIR_WEB="$FRONTEND_DIR/src/crypto/wasm-pkg-web"

# Sabitlenen sürüm. rustc'yi rust-toolchain.toml seçiyor; wasm-pack'in böyle bir
# mekanizması olmadığı için burada kontrol ediliyor.
WASM_PACK_BEKLENEN="0.15.0"

if ! command -v wasm-pack >/dev/null 2>&1; then
  echo "ERROR: wasm-pack bulunamadı. Kurulum: cargo install wasm-pack" >&2
  exit 1
fi

if ! rustup target list --installed 2>/dev/null | grep -q wasm32-unknown-unknown; then
  echo "ERROR: wasm32-unknown-unknown target kurulu değil. Kurulum: rustup target add wasm32-unknown-unknown" >&2
  exit 1
fi

RUSTC_SURUM="$(rustc --version | awk '{print $2}')"
WASM_PACK_SURUM="$(wasm-pack --version | awk '{print $2}')"
HEDEF_PLATFORM="$(rustc -vV | awk -F': ' '/^host:/ {print $2}')"

if [ "$WASM_PACK_SURUM" != "$WASM_PACK_BEKLENEN" ]; then
  echo "UYARI: wasm-pack $WASM_PACK_SURUM, sabitlenen sürüm $WASM_PACK_BEKLENEN." >&2
  echo "       Derleme yapılacak, ama çıktı depodaki sha256'larla eşleşmeyebilir." >&2
  echo "       Bu bir hata DEĞİL; verify-wasm.sh farkı ayrıca bildirecek." >&2
fi

echo "Derleniyor (nodejs): $CRATE_DIR -> $OUT_DIR_NODE"
wasm-pack build "$CRATE_DIR" --target nodejs --out-dir "$OUT_DIR_NODE"

echo "Derleniyor (web): $CRATE_DIR -> $OUT_DIR_WEB"
wasm-pack build "$CRATE_DIR" --target web --out-dir "$OUT_DIR_WEB"

for D in "$OUT_DIR_NODE" "$OUT_DIR_WEB"; do
  if [ ! -f "$D/sphincs_c13_signer.js" ]; then
    echo "ERROR: beklenen çıktı yok: $D/sphincs_c13_signer.js" >&2
    exit 1
  fi
done

# wasm-pack her çıktı dizinine içinde tek bir * olan .gitignore yazıyor. O dosya
# kalırsa `git add` çıktıyı SESSİZCE eklemez — C kararının en sinsi tuzağı.
# Siliniyor; `git add -f` kullanılmıyor, çünkü o tuzağı gizler, kaldırmaz.
rm -f "$OUT_DIR_NODE/.gitignore" "$OUT_DIR_WEB/.gitignore"

# --- Manifest -----------------------------------------------------------
# Çıktının sha256'sı, ONU ÜRETEN toolchain sürümleri ve kaynak kimliği bir
# arada. verify-wasm.sh bunları karşılaştırıyor; sürümler tutmazsa hash
# karşılaştırmasını ATLIYOR, çünkü farklı toolchain'in farklı bayt üretmesi
# hata değil. Cross-machine determinizm ÖLÇÜLMEDİ (bkz. kanıt notu).

sha() { shasum -a 256 "$1" | awk '{print $1}'; }

SUBMODULE_COMMIT="$(git -C "$SUBMODULE_DIR" rev-parse HEAD)"
SUBMODULE_KIRLI="false"
if [ -n "$(git -C "$SUBMODULE_DIR" status --porcelain 2>/dev/null)" ]; then
  SUBMODULE_KIRLI="true"
  echo "UYARI: $SUBMODULE_DIR çalışma ağacı KİRLİ — çıktı, commit'lenmiş kaynağa ait değil." >&2
fi

# Betiğin KENDİ sha256'sı da kayda giriyor: hedefler, bayraklar ve çıktı yolları
# burada tanımlı, yani betik değişirse çıktı da artık aynı tarife ait değil.
BUILD_SCRIPT_SHA="$(sha "${BASH_SOURCE[0]}")"

{
  printf '{\n'
  printf '  "uretildi": "%s",\n' "$(date -u '+%Y-%m-%dT%H:%M:%SZ')"
  printf '  "toolchain": {\n'
  printf '    "rustc": "%s",\n' "$RUSTC_SURUM"
  printf '    "wasm_pack": "%s",\n' "$WASM_PACK_SURUM"
  printf '    "hedef_platform": "%s"\n' "$HEDEF_PLATFORM"
  printf '  },\n'
  printf '  "kaynak": {\n'
  printf '    "submodule": "contracts/lib/sphincs-minus",\n'
  printf '    "commit": "%s",\n' "$SUBMODULE_COMMIT"
  printf '    "calisma_agaci_kirli": %s\n' "$SUBMODULE_KIRLI"
  printf '  },\n'
  printf '  "build_script": {\n'
  printf '    "yol": "frontend/scripts/build-wasm.sh",\n'
  printf '    "sha256": "%s"\n' "$BUILD_SCRIPT_SHA"
  printf '  },\n'
  printf '  "cikti": {\n'
  FIRST=1
  for D in "$OUT_DIR_NODE" "$OUT_DIR_WEB"; do
    REL="src/crypto/$(basename "$D")"
    for F in sphincs_c13_signer.js sphincs_c13_signer_bg.wasm; do
      [ $FIRST -eq 0 ] && printf ',\n'
      printf '    "%s/%s": "%s"' "$REL" "$F" "$(sha "$D/$F")"
      FIRST=0
    done
  done
  printf '\n  }\n'
  printf '}\n'
} > "$MANIFEST"

echo "Manifest: $MANIFEST"
echo "Tamamlandı: $OUT_DIR_NODE + $OUT_DIR_WEB"
echo "Doğrulamak için: bash scripts/verify-wasm.sh"
