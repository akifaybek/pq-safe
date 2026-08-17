// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IPQVerifier {
    /// @notice SPHINCS- imzasının geçerli olup olmadığını doğrular.
    /// @param digest İmzalanan 32 byte'lık mesaj özeti
    /// @param signature SPHINCS- imzası (ham bytes)
    /// @param publicKey SPHINCS- açık anahtarı (ham bytes)
    /// @return valid İmza geçerliyse true, değilse false. ASLA revert etmez.
    function verify(
        bytes32 digest,
        bytes calldata signature,
        bytes calldata publicKey
    ) external view returns (bool valid);
}
