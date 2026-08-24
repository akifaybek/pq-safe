// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IPQVerifier} from "./interfaces/IPQVerifier.sol";

/// @notice SPHINCS- (C13) imzalı, kuantum-güvenli akıllı kontrat cüzdanı.
/// Yetkilendirme tamamen imza doğrulamasından gelir — msg.sender'a bakılmaz,
/// bu yüzden bir relayer de imzalı payload'ı gönderebilir (bkz. docs/INTERFACE.md).
contract PQWallet {
    /// @notice SPHINCS-/C13 açık anahtarı (ham bytes) — imza bununla doğrulanır.
    bytes public ownerPublicKey;

    /// @notice İmza doğrulayıcı (IPQVerifier). Sprint 2'de MockVerifier, Sprint
    /// sonunda gerçek SPHINCSVerifier ile değiştirilir (GOREV_SINIRLARI.md Sprint 2).
    IPQVerifier public immutable verifier;

    /// @notice Replay koruması. SPHINCS- stateless olduğu için leaf sayacı YOK,
    /// sadece bu nonce var (bkz. GOREV_SINIRLARI.md Bölüm 5, CLAUDE.md).
    uint256 public nonce;

    constructor(IPQVerifier _verifier, bytes memory _ownerPublicKey) {
        verifier = _verifier;
        ownerPublicKey = _ownerPublicKey;
    }

    /// @notice Cüzdanın bakiyesini beslemek için düz ETH transferlerini kabul eder.
    receive() external payable {}

    /// @notice Dondurulmuş digest formülünü (docs/INTERFACE.md Bölüm 4,
    /// GOREV_SINIRLARI.md Bölüm 4) BİREBİR uygular. Mevcut `nonce`'u kullanır.
    /// Test dosyasından (digest çapraz doğrulama) çağrılabilmesi için public.
    function _computeDigest(address to, uint256 value, bytes calldata data) public view returns (bytes32) {
        bytes32 domainSeparator = keccak256(abi.encode(keccak256("PQSAFE_V1"), block.chainid, address(this)));
        return keccak256(abi.encode(domainSeparator, nonce, to, value, keccak256(data)));
    }

    /// @notice İmzalı bir işlemi doğrulayıp yürütür.
    /// @param to Çağrının hedefi.
    /// @param value Gönderilecek wei miktarı.
    /// @param data Hedefe iletilecek calldata.
    /// @param signature Mevcut nonce ile hesaplanan digest'in SPHINCS- imzası.
    function execute(address to, uint256 value, bytes calldata data, bytes calldata signature) external {
        bytes32 digest = _computeDigest(to, value, data);
        require(verifier.verify(digest, signature, ownerPublicKey), "PQWallet: invalid signature");

        // Checks-effects-interactions: nonce, dış çağrıdan ÖNCE artırılır ki
        // reentrancy ile aynı imza (aynı nonce'a bağlı digest) tekrar kullanılamasın.
        nonce++;

        (bool success,) = to.call{value: value}(data);
        require(success, "PQWallet: call failed");
    }
}
