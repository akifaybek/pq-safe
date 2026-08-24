// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script} from "forge-std/Script.sol";
import {console} from "forge-std/console.sol";
import {SPHINCSVerifier} from "../src/verifier/SPHINCSVerifier.sol";
import {Migration} from "../src/Migration.sol";
import {PQWallet} from "../src/PQWallet.sol";

/// @notice SPHINCSVerifier, Migration ve PQWallet'ı sırayla deploy eder.
/// ownerPublicKey hardcode edilmez — `OWNER_PUBLIC_KEY` env değişkeninden okunur,
/// gerçek deploy'da elle verilmesi gerekir (henüz gerçek bir SPHINCS anahtarımız yok).
contract DeployScript is Script {
    function run() external {
        bytes memory ownerPublicKey = vm.envBytes("OWNER_PUBLIC_KEY");

        vm.startBroadcast();

        SPHINCSVerifier verifier = new SPHINCSVerifier();
        Migration migration = new Migration();
        PQWallet wallet = new PQWallet(verifier, ownerPublicKey);

        vm.stopBroadcast();

        console.log("SPHINCSVerifier deployed at:", address(verifier));
        console.log("Migration deployed at:", address(migration));
        console.log("PQWallet deployed at:", address(wallet));
    }
}
