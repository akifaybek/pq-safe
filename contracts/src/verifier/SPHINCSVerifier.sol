// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IPQVerifier} from "../interfaces/IPQVerifier.sol";
import {SphincsC13Asm} from "../../lib/sphincs-minus/src/SPHINCs-C13Asm.sol";

contract SPHINCSVerifier is IPQVerifier {
    SphincsC13Asm private immutable REFERENCE;

    constructor() {
        REFERENCE = new SphincsC13Asm();
    }

    function verify(bytes32 digest, bytes calldata signature, bytes calldata publicKey)
        external
        view
        returns (bool valid)
    {
        if (publicKey.length != 64) return false;
        bytes32 pkSeed = bytes32(publicKey[0:32]);
        bytes32 pkRoot = bytes32(publicKey[32:64]);

        try REFERENCE.verify(pkSeed, pkRoot, digest, signature) returns (bool ok) {
            return ok;
        } catch {
            return false;
        }
    }
}
