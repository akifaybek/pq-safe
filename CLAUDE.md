# PQ-SAFE — Claude için proje kuralları

## Proje
Ethereum üzerinde kuantum-güvenli akıllı kontrat cüzdanı (SPHINCS- imzalı).
İki kişilik ekip: Akif (frontend + imza doğrulayıcı + kripto), Hakan (cüzdan/migration kontratları).

## MUTLAK KURALLAR

1. Klasör sahipliği:
   - Akif: frontend/, contracts/src/verifier/, contracts/test/SPHINCSVerifier.t.sol, docs/
   - Hakan: contracts/src/PQWallet.sol, contracts/src/Migration.sol, contracts/test/ (kendi testleri), contracts/script/, README.md
   - Ortak: CLAUDE.md, contracts/src/interfaces/IPQVerifier.sol, docs/DECISIONS.md, docs/INTERFACE.md
   Bir oturumda karşı tarafın dosyasına dokunma. Emin değilsen SOR.

2. COMMIT ZORUNLULUĞU: Her mantıksal iş parçası bittiğinde DUR:
   - Değişiklik özetini çıkar
   - git status ve git diff --stat çalıştır
   - "Bu noktada commit atalım" de, önerilen commit mesajını ver
   - Kullanıcı onaylamadan sonraki göreve GEÇME
   - Asla 3'ten fazla dosyayı commit'siz biriktirme

3. Test olmadan "bitti" deme. Solidity → geçen Foundry testi. Frontend → çalıştırılabilir doğrulama.

4. Kanıt topla: gas raporları, test çıktıları, tx hash'ler docs/evidence/ altına. Hatırlat.

5. Tek görev: aynı anda tek iş.

6. Kriptografi kodunu uydurma. Anlaşılmayan kısım varsa açıkla, "çalışıyor gibi görünsün" diye yazma.

## Teknik kararlar (değiştirilmeyecek)
- İmza şeması: SPHINCS- / **C13** (Consigny'nin WOTS+C/FORS+C ailesi, h=22 d=2 a=19 k=7 w=8, resmi FIPS 205 seti değil — ePrint 2025/2203 araştırma varyantı) — ~105K gas (bizim ortamımızda 106,672 gas ölçüldü, doğrulandı: `docs/evidence/gas-reports/sprint0-c13-verifier-gas.md`). Eski hedef SLH-DSA-SHA2-128-24'ten 19 Ağustos 2026'da değiştirildi, bkz. `docs/DECISIONS.md` — Hakan onayı bekleniyor.
- Doğrulama: her işlemde direkt on-chain (itiraz penceresi/bond YOK)
- SPHINCS- STATELESS'tır: leaf sayacı YOK, sadece nonce (replay koruması)
- Migration: ECDSA ecrecover + eski adresi kalıcı işaretleme
- JS kütüphanesi: @noble/post-quantum (slh_dsa)
- Ağ: Sepolia testnet

## Arayüz sözleşmesi (dondurulmuş)
interface IPQVerifier {
    function verify(bytes32 digest, bytes calldata signature, bytes calldata publicKey)
        external view returns (bool valid);
}
Verifier ASLA revert etmez, geçersizse false döner. view fonksiyondur.

## Digest formatı (dondurulmuş)
digest = keccak256(abi.encode(DOMAIN_SEPARATOR, nonce, to, value, keccak256(data)))
DOMAIN_SEPARATOR = keccak256(abi.encode(keccak256("PQSAFE_V1"), block.chainid, address(this)))
