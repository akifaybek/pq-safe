#!/usr/bin/env bash
#
# verify-wasm.sh — depoya commit'lenmiş WASM çıktısının kaynağa ve manifest'e
# uyduğunu kontrol eder. C kararının (17 Eylül 2026) tutarsızlık kontrolü.
#
# ÇIKIŞ KODLARI — kontrol tek kırmızıya YIKILMAZ, durumlar ayrı:
#   0  her şey eşleşiyor
#   0  toolchain farklı → hash karşılaştırması ATLANDI (sesli uyarı, hata DEĞİL)
#   1  kaynak kimliği (submodule commit / build betiği) manifest'le uyuşmuyor
#   1  AYNI toolchain, çıktı farklı
#   2  manifest ya da çıktı eksik, kontrol koşamadı
#
# Kaynak kontrolü toolchain'den BAĞIMSIZDIR ve her zaman koşar: toolchain
# farklıysa hash karşılaştırması atlanır, ama biri kaynağı değiştirip çıktıyı
# yenilemediyse o hâlâ yakalanır.
#
# NE KANITLAMAZ: cross-machine / cross-sürüm determinizm ÖLÇÜLMEDİ. "OK"
# çıktısı, çıktının BU toolchain'de yeniden üretilebilir olduğunu gösterir;
# başka bir makinede aynı baytların çıkacağını göstermez.
set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FRONTEND_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
REPO_ROOT="$(cd "$FRONTEND_DIR/.." && pwd)"
SUBMODULE_DIR="$REPO_ROOT/contracts/lib/sphincs-minus"
MANIFEST="$SCRIPT_DIR/wasm-manifest.json"

if [ ! -f "$MANIFEST" ]; then
  echo "HATA: manifest yok: $MANIFEST" >&2
  echo "      Üretmek için: bash scripts/build-wasm.sh" >&2
  exit 2
fi

oku() { node -e "
const m=require('$MANIFEST');
const p='$1'.split('.').reduce((o,k)=>o===undefined?undefined:o[k],m);
process.stdout.write(p===undefined?'':String(p));
" 2>/dev/null; }

M_RUSTC="$(oku toolchain.rustc)"
M_WASMPACK="$(oku toolchain.wasm_pack)"
M_PLATFORM="$(oku toolchain.hedef_platform)"
M_COMMIT="$(oku kaynak.commit)"
M_KIRLI="$(oku kaynak.calisma_agaci_kirli)"
M_SCRIPT_SHA="$(oku build_script.sha256)"

if [ -z "$M_COMMIT" ] || [ -z "$M_RUSTC" ]; then
  echo "HATA: manifest okunamadı ya da eksik alan var: $MANIFEST" >&2
  exit 2
fi

sha() { shasum -a 256 "$1" | awk '{print $1}'; }
HATA=0

# --- 1) Kaynak kimliği: toolchain'den bağımsız, HER ZAMAN koşar -------------
GERCEK_COMMIT="$(git -C "$SUBMODULE_DIR" rev-parse HEAD 2>/dev/null || echo '')"
if [ -z "$GERCEK_COMMIT" ]; then
  echo "HATA: submodule commit'i okunamadı: $SUBMODULE_DIR" >&2
  echo "      Submodule çekilmemiş olabilir: git submodule update --init --recursive" >&2
  exit 2
fi
if [ "$GERCEK_COMMIT" != "$M_COMMIT" ]; then
  echo "HATA: submodule commit'i manifest'le uyuşmuyor." >&2
  echo "      manifest: $M_COMMIT" >&2
  echo "      gerçek  : $GERCEK_COMMIT" >&2
  echo "      Çıktı bu kaynağa ait değil. Yeniden derle: bash scripts/build-wasm.sh" >&2
  HATA=1
fi

if [ -n "$(git -C "$SUBMODULE_DIR" status --porcelain 2>/dev/null)" ]; then
  echo "UYARI: $SUBMODULE_DIR çalışma ağacı KİRLİ." >&2
  echo "       Commit'lenmemiş kaynak değişikliği çıktıya yansımış olabilir;" >&2
  echo "       submodule commit'i aynı olduğu için bu kontrol onu yakalayamaz." >&2
elif [ "$M_KIRLI" = "true" ]; then
  echo "UYARI: manifest, çıktının KİRLİ bir çalışma ağacında üretildiğini söylüyor." >&2
  echo "       Kaynak şimdi temiz; çıktıyı yeniden derlemek gerekir." >&2
fi

GERCEK_SCRIPT_SHA="$(sha "$SCRIPT_DIR/build-wasm.sh")"
if [ "$GERCEK_SCRIPT_SHA" != "$M_SCRIPT_SHA" ]; then
  echo "HATA: build-wasm.sh manifest'te kayıtlı olandan farklı." >&2
  echo "      manifest: $M_SCRIPT_SHA" >&2
  echo "      gerçek  : $GERCEK_SCRIPT_SHA" >&2
  echo "      Hedefler, bayraklar ve çıktı yolları o betikte tanımlı; çıktı" >&2
  echo "      artık aynı tarifeye ait değil. Yeniden derle." >&2
  HATA=1
fi

[ "$HATA" -ne 0 ] && exit 1

# --- 2) Toolchain eşleşmesi: tutmazsa hash karşılaştırması ATLANIR ----------
if command -v rustc >/dev/null 2>&1; then
  Y_RUSTC="$(rustc --version | awk '{print $2}')"
  Y_PLATFORM="$(rustc -vV | awk -F': ' '/^host:/ {print $2}')"
else
  Y_RUSTC="(rustc yok)"; Y_PLATFORM="(bilinmiyor)"
fi
if command -v wasm-pack >/dev/null 2>&1; then
  Y_WASMPACK="$(wasm-pack --version | awk '{print $2}')"
else
  Y_WASMPACK="(wasm-pack yok)"
fi

if [ "$Y_RUSTC" != "$M_RUSTC" ] || [ "$Y_WASMPACK" != "$M_WASMPACK" ] || [ "$Y_PLATFORM" != "$M_PLATFORM" ]; then
  echo "UYARI: toolchain farklı — HASH KARŞILAŞTIRMASI ATLANDI."
  echo "  rustc     : yerel $Y_RUSTC    | manifest $M_RUSTC"
  echo "  wasm-pack : yerel $Y_WASMPACK | manifest $M_WASMPACK"
  echo "  platform  : yerel $Y_PLATFORM | manifest $M_PLATFORM"
  echo
  echo "BU BİR HATA DEĞİL. Farklı toolchain sürümleri farklı bayt üretebilir ve"
  echo "cross-machine determinizm ÖLÇÜLMEDİ; o yüzden karşılaştırma yapılmadı,"
  echo "kırmızı da yanmadı. Kaynak kimliği kontrolleri GEÇTİ."
  echo
  echo "Karşılaştırma istiyorsan sabitlenen sürümleri kullan:"
  echo "  rustc $M_RUSTC (rust-toolchain.toml) · wasm-pack $M_WASMPACK"
  exit 0
fi

# --- 3) Aynı toolchain: hash'ler eşleşmek ZORUNDA --------------------------
SAYAC=0
node -e "
const m=require('$MANIFEST');
for (const [k,v] of Object.entries(m.cikti)) console.log(k+' '+v);
" | while read -r REL BEKLENEN; do
  DOSYA="$FRONTEND_DIR/$REL"
  if [ ! -f "$DOSYA" ]; then
    echo "HATA: çıktı dosyası yok: $REL" >&2
    echo "EKSIK" >> /tmp/verify-wasm-$$.flag
    continue
  fi
  GERCEK="$(sha "$DOSYA")"
  if [ "$GERCEK" != "$BEKLENEN" ]; then
    echo "HATA: aynı toolchain, çıktı farklı: $REL" >&2
    echo "      manifest: $BEKLENEN" >&2
    echo "      gerçek  : $GERCEK" >&2
    echo "FARK" >> /tmp/verify-wasm-$$.flag
  fi
done

if [ -f "/tmp/verify-wasm-$$.flag" ]; then
  SORUN="$(sort -u "/tmp/verify-wasm-$$.flag" | tr '\n' ' ')"
  rm -f "/tmp/verify-wasm-$$.flag"
  case "$SORUN" in
    *EKSIK*) echo "Çıktı eksik — yeniden derle: bash scripts/build-wasm.sh" >&2; exit 2 ;;
    *) echo "Kaynak ya da derleme değişmiş. Yeniden derleyip farkı incele." >&2; exit 1 ;;
  esac
fi

# .gitignore tuzağı: varsa sessiz `git add` hatasının habercisi.
for D in wasm-pkg wasm-pkg-web; do
  if [ -f "$FRONTEND_DIR/src/crypto/$D/.gitignore" ]; then
    echo "UYARI: src/crypto/$D/.gitignore var — wasm-pack yazmış."
    echo "       İçinde tek bir yıldız var ve git add çıktıyı SESSİZCE eklemez."
    echo "       Silinmeli: bash scripts/build-wasm.sh onu siliyor."
  fi
done

SAYAC="$(node -e "console.log(Object.keys(require('$MANIFEST').cikti).length)")"
echo "OK: $SAYAC dosya, sha256 eş, toolchain eş (rustc $M_RUSTC · wasm-pack $M_WASMPACK · $M_PLATFORM)."
exit 0
