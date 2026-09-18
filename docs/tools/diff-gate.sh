#!/usr/bin/env bash
#
# diff-gate.sh — Task 10 Adım 1'in diff kapısı. Sahiplik: Akif (docs/ altı).
#
# NE YAPAR: plandaki BEŞ dosyanın md5'ini basar; bir referans dosyası
# verilirse karşılaştırır. Karar VERMEZ, kontrol eder — kararı insan verir.
#
# KULLANIM
#   bash docs/tools/diff-gate.sh                 # mevcut md5 setini bas
#   bash docs/tools/diff-gate.sh <referans>      # referansla karşılaştır
#   bash docs/tools/diff-gate.sh --kaydet <yol>  # referans olarak yaz
#
# ÇIKIŞ KODLARI
#   0  yalnızca basıldı · ya da karşılaştırıldı ve BEŞİ DE EŞİT
#   1  en az bir dosya FARKLI  → video yeniden çekilir (plan Task 10 Adım 2)
#   2  dosya eksik, md5 aracı yok, ya da kullanım hatası → kapı KOŞAMADI
#
# DOSYA SETİ PLANDAN ALINDI, tahmin edilmedi:
#   docs/superpowers/plans/2026-09-14-sprint4-demo-measurement-report.md,
#   Task 10 Adım 1. Sıra da oradaki sıradır.
#   index.html dahil çünkü KAMERA DOM'U GÖRÜYOR, mantığı değil.
#   digest.js ve buildTransaction.js dondurulmuş; eşit çıkmaları dondurmanın
#   tuttuğunun YAN KANITIDIR.
#
# KAPI KAYIT_COMMIT ile HEAD EŞİTLİĞİNE BAĞLANMAZ — bu bir md5
# karşılaştırmasıdır ve öyle kalır. Gerekçe plandaki kutuda: kayıttan sonra
# HEAD zorunlu olarak ilerliyor, commit'e bağlanan kapı beş dosyanın tek baytı
# değişmese bile YANLIŞ tetiklenir ve bedeli ikinci bir elle mnemonic oturumu
# artı bir gerçek tx olur.
set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
FRONTEND_DIR="$REPO_ROOT/frontend"

# Windows yol hatasının aynısına düşmemek için: süreç dizini frontend'e alınır
# ve dosyalar GÖRELİ adlanır (bkz. verify-wasm.sh'teki aynı gerekçe).
cd "$FRONTEND_DIR" || { echo "HATA: cd başarısız: $FRONTEND_DIR" >&2; exit 2; }

DOSYALAR=(
  "index.html"
  "src/main.js"
  "src/tx/sendTransaction.js"
  "src/crypto/digest.js"
  "src/tx/buildTransaction.js"
)

# macOS md5 -q, Linux/Git Bash md5sum. Biri yoksa kapı KOŞAMAZ, sessizce
# başka bir özete geçilmez — set değişirse karşılaştırma anlamsız olur.
if command -v md5 >/dev/null 2>&1; then
  ozet() { md5 -q "$1"; }
  ARAC="md5 -q"
elif command -v md5sum >/dev/null 2>&1; then
  ozet() { md5sum "$1" | awk '{print $1}'; }
  ARAC="md5sum"
else
  echo "HATA: md5 de md5sum da yok, kapı koşamaz." >&2
  exit 2
fi

EKSIK=0
for D in "${DOSYALAR[@]}"; do
  [ -f "$D" ] || { echo "HATA: dosya yok: frontend/$D" >&2; EKSIK=1; }
done
[ "$EKSIK" -ne 0 ] && exit 2

uret() { for D in "${DOSYALAR[@]}"; do echo "$(ozet "$D")  $D"; done; }

case "${1:-}" in
  --kaydet)
    HEDEF="${2:-}"
    [ -n "$HEDEF" ] || { echo "HATA: --kaydet için yol gerekli." >&2; exit 2; }
    uret > "$HEDEF" || exit 2
    echo "Referans yazıldı: $HEDEF ($ARAC, 5 dosya)"
    exit 0
    ;;
  "")
    echo "# diff kapısı — mevcut md5 seti ($ARAC, frontend/ göreli)"
    uret
    echo
    echo "Referans YOK, yalnızca basıldı. Karşılaştırma için:"
    echo "  bash docs/tools/diff-gate.sh <referans-dosyasi>"
    exit 0
    ;;
  *)
    REFERANS="$1"
    [ -f "$REFERANS" ] || { echo "HATA: referans dosyası yok: $REFERANS" >&2; exit 2; }
    FARK=0
    for D in "${DOSYALAR[@]}"; do
      SIMDI="$(ozet "$D")"
      BEKLENEN="$(awk -v f="$D" '$2==f {print $1}' "$REFERANS" | head -1)"
      if [ -z "$BEKLENEN" ]; then
        echo "HATA: referansta satır yok: $D" >&2
        exit 2
      elif [ "$SIMDI" != "$BEKLENEN" ]; then
        echo "FARKLI  $D"
        echo "        referans: $BEKLENEN"
        echo "        şimdi   : $SIMDI"
        FARK=1
      else
        echo "eşit    $D"
      fi
    done
    echo
    if [ "$FARK" -eq 0 ]; then
      echo "BEŞİ DE EŞİT — mevcut çekim FİNAL (plan Task 10 Adım 1)."
      exit 0
    fi
    echo "EN AZ BİR DOSYA FARKLI — video YENİDEN ÇEKİLİR (plan Task 10 Adım 2)."
    echo "Bu bir karar değil, kontrol sonucudur; kararı insan verir."
    exit 1
    ;;
esac
