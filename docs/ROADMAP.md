# PQ-SAFE — Yol Haritası (Genel Bakış)

**Hedef:** TEKNOFEST 2026 Blokzincir Yarışması finali, **30 Eylül – 4 Ekim 2026**.
**Bugün:** 17 Ağustos 2026. Finale kadar **~6 hafta** var.
**Ekip:** Akif (frontend + kripto + doğrulayıcı kontrat + dokümantasyon),
Hakan (cüzdan kontratı + migration + deployment).

Bu dosya kısa bir **genel bakıştır**. Ayrıntılı görev listesi (kim, ne, hangi
kanıt), dosya sahipliği tablosu, "bitti" tanımı ve git protokolü için tek
referans dosya: **[`docs/GOREV_SINIRLARI.md`](./GOREV_SINIRLARI.md)**.

---

## Zaman çizelgesi

| Sprint | Tarih | Tema |
|---|---|---|
| Sprint 0 | 17–23 Ağustos | Kurulum ve risk ölçümü |
| Sprint 1 | 24–30 Ağustos | Migration.sol, verifier iskeleti |
| Sprint 2 | 31 Ağustos – 6 Eylül | PQWallet.sol + digest uyum testi |
| Sprint 3 | 7–13 Eylül | Sepolia deploy + gerçek ölçüm |
| Sprint 4 | 14–20 Eylül | Demo + rapor |
| Sprint 5 | 21–27 Eylül | Sunum ve prova |
| Buffer | 28–29 Eylül | Boşluk payı |
| **Final** | **30 Eylül – 4 Ekim** | **TEKNOFEST** |

Sprint aralıkları tahminidir, gerçek ilerlemeye göre kayabilir — önemli olan
**bağımlılık sırası**, bunun ayrıntısı `docs/GOREV_SINIRLARI.md` Bölüm 9'da.

---

## Durum özeti (17 Ağustos itibarıyla)

**Bitti:**
- Repo iskeleti, `CLAUDE.md` (klasör sahipliği + çalışma kuralları)
- `docs/DECISIONS.md`, `docs/INTERFACE.md`, `docs/GOREV_SINIRLARI.md`
- `contracts/src/interfaces/IPQVerifier.sol`
- Foundry kurulumu (`solc 0.8.20` sabit, optimizer açık), `forge-std` submodule
- Consigny'nin SPHINCS- referans implementasyonu submodule olarak eklendi
  (`contracts/lib/sphincs-minus`, commit `eef1f889a46c77d45dca013d321e9648fd3eaa7e`)
- GitHub'a push edildi: https://github.com/akifaybek/pq-safe

**Sırada (Sprint 0'ın geri kalanı):** bkz. `docs/GOREV_SINIRLARI.md` Bölüm 9,
Sprint 0 tablosu.

---

## Riskler / dikkat noktaları

- **SPHINCS- imza/anahtar boyutu büyük** → calldata maliyeti gas rakamını
  etkiler, frontend tarafında da imza üretim süresi (WASM/JS performansı) test
  edilmeli. Erken ölçüm (Sprint 0-1) bu riski azaltır.
- **Digest formatı eşleşmesi** (Solidity ↔ JS) — tek bir encode sırası hatası
  tüm imzaları geçersiz kılar. Sprint 2'nin en kritik işi bu eşleşmeyi
  doğrulamak (bkz. `GOREV_SINIRLARI.md` Bölüm 4).
- **Ortam/kurulum sorunları** — GitHub API rate limit (solc indirirken bu bende
  gerçekleşti, `binaries.soliditylang.org`'dan elle indirip çözdüm). Hakan aynı
  soruna düşerse aynı çözüm uygulanabilir.
- **Koordinasyon** — `IPQVerifier` arayüzü veya digest formatı değiştirilmesi
  gerekirse, tek taraflı yapılmaz; `docs/DECISIONS.md`'ye kayıt + diğer tarafın
  onayı şart (bkz. `CLAUDE.md` kural 1, `GOREV_SINIRLARI.md` Bölüm 6).

---

## Commit ve iletişim kuralları (hatırlatma — ayrıntı `GOREV_SINIRLARI.md` Bölüm 8'de)

- Her mantıksal iş parçası bitince dur, `git status`/`git diff --stat` göster,
  commit mesajı öner, onay bekle
- 3'ten fazla dosyayı commit'siz biriktirme
- Test olmadan "bitti" deme
- Karşı tarafın klasörüne dokunmadan önce sor
- Belirsizlik/tasarım kararı varsa `docs/DECISIONS.md`'ye kayıt düş
