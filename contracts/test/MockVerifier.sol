// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// STUB — Sprint 1'de Akif'in gerçek SPHINCSVerifier.sol'ü ile değiştirilecek.
// Akif'in verifier'ı hazır olmadan PQWallet/Migration testlerini ilerletmek için var.

import {IPQVerifier} from "../src/interfaces/IPQVerifier.sol";

contract MockVerifier is IPQVerifier {
    function verify(bytes32, bytes calldata, bytes calldata) external pure returns (bool valid) {
        return true;
    }
}
