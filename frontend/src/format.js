// Ekranda gösterilen sayıların biçimi. DOM'suz ve saf — node'dan import edilip
// çalıştırılabilsin diye ayrı modül. (İlk halinde bu fonksiyonlar main.js'in
// içindeydi ve doğrulama çıktısı elle yazılmış bir KOPYADAN üretilmişti; kopya
// ile ürünün aynı şeyi yaptığı ölçülmemişti. Ayrı modül o boşluğu kapatıyor:
// ekranın kullandığı fonksiyonun ta kendisi koşuluyor.)

import { formatEther } from 'ethers';

// BigInt doğrudan Intl'e verilir, Number'a ÇEVRİLMEZ: wei değerleri
// Number.MAX_SAFE_INTEGER'ı (9.007.199.254.740.991) aşıyor — cüzdan bakiyesi
// on yedi haneli — ve çevirme bunu SESSİZCE yuvarlardı. Intl.NumberFormat
// BigInt'i kendisi kabul ediyor.
//
// KAPSAM yalnız gas ve wei. İki sayı türü BİLEREK dışarıda:
//   - Bayt sayıları (imza 3688 bayt): ekran tutarlılığı testinin oracle'ı
//     `/İmza \(\d+ bayt\)/` (sprint4-screen-consistency.md:89). Ayraç o regex'i
//     kırar ve test sessizce boş assertion'a döner.
//   - Blok numaraları: Etherscan'de ayraçsız yazılı, kanıt birebir eşleşmeli.
const nf = new Intl.NumberFormat('tr-TR');

export const fmtGas = (v) => `${nf.format(v)} gas`;

// formatEther "0.0506" döndürür (ASCII nokta). Ondalık ayracı DİZE üzerinde
// virgüle çevriliyor, Number'a çevrilerek değil: ethers'ın verdiği tam ondalık
// gösterim korunsun diye (1000000000000000001 wei → "1,000000000000000001 ETH",
// Number bunu yuvarlardı — Sprint 3'te tam olarak bu değer ekrana basıldı).
export const fmtEth = (wei) => `${formatEther(wei).replace('.', ',')} ETH`;

export const fmtWei = (wei) => `${nf.format(wei)} wei = ${fmtEth(wei)}`;
