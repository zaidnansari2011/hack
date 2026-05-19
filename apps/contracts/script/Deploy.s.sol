// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {ProofOfLearnEscrow} from "../src/ProofOfLearnEscrow.sol";
import {LearnCredential} from "../src/LearnCredential.sol";

/// @notice One-shot deploy + fund script for the judges' demo.
///         Deploys both contracts, then funds the seeded "Acme Rust" bounty
///         on the escrow so the end-to-end demo (student passes → escrow
///         releases ETH → SBT mints) works out of the box.
///
///         The bountyId hash MUST match what the API computes for the seed
///         bounty id `00000000-0000-0000-0000-000000000001` — see
///         `bountyIdHash(uuid)` in apps/api/src/services/blockchain/chain-service.ts.
contract Deploy is Script {
    // The demo Rust bounty seeded by apps/api/prisma/seed.ts.
    string constant DEMO_BOUNTY_UUID = "00000000-0000-0000-0000-000000000001";
    string constant DEMO_CURRICULUM_SLUG = "rust-101";

    // 0.0025 ETH per student matches the API's `inrToWei(250 INR)` so on-chain
    // and DB stay coherent. 10 students on-chain = 10 judge-demo passes
    // possible before the escrow runs dry. Total funding: 0.025 ETH.
    uint256 constant DEMO_REWARD_PER_STUDENT = 0.0025 ether;
    uint256 constant DEMO_MAX_STUDENTS = 10;

    function run() external {
        uint256 deployerKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address deployer = vm.addr(deployerKey);

        vm.startBroadcast(deployerKey);

        ProofOfLearnEscrow escrow = new ProofOfLearnEscrow(deployer);
        LearnCredential credential = new LearnCredential(deployer);

        bytes32 demoBountyId = keccak256(bytes(DEMO_BOUNTY_UUID));
        bytes32 curriculumHash = keccak256(bytes(DEMO_CURRICULUM_SLUG));
        uint256 deposit = DEMO_REWARD_PER_STUDENT * DEMO_MAX_STUDENTS;

        escrow.depositBounty{value: deposit}(
            demoBountyId,
            curriculumHash,
            DEMO_REWARD_PER_STUDENT,
            DEMO_MAX_STUDENTS
        );

        vm.stopBroadcast();

        console2.log("ESCROW_CONTRACT_ADDRESS=", address(escrow));
        console2.log("CREDENTIAL_CONTRACT_ADDRESS=", address(credential));
        console2.log("DEMO_BOUNTY_FUNDED_WEI=", deposit);
        console2.log("DEMO_BOUNTY_MAX_STUDENTS=", DEMO_MAX_STUDENTS);
    }
}
