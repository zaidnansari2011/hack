// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {ProofOfLearnEscrow} from "../src/ProofOfLearnEscrow.sol";
import {LearnCredential} from "../src/LearnCredential.sol";

contract Deploy is Script {
    function run() external {
        uint256 deployerKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address deployer = vm.addr(deployerKey);

        vm.startBroadcast(deployerKey);

        ProofOfLearnEscrow escrow = new ProofOfLearnEscrow(deployer);
        LearnCredential credential = new LearnCredential(deployer);

        vm.stopBroadcast();

        console2.log("ESCROW_CONTRACT_ADDRESS=", address(escrow));
        console2.log("CREDENTIAL_CONTRACT_ADDRESS=", address(credential));
    }
}
