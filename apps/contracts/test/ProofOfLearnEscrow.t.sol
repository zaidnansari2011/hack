// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {ProofOfLearnEscrow} from "../src/ProofOfLearnEscrow.sol";
import {LearnCredential} from "../src/LearnCredential.sol";

contract ProofOfLearnEscrowTest is Test {
    ProofOfLearnEscrow internal escrow;
    LearnCredential internal credential;

    address internal sponsor = address(0xAAA1);
    address internal student = address(0xBEEF);
    address internal verifier = address(this);

    bytes32 internal constant BOUNTY_ID = bytes32("bounty-1");
    bytes32 internal constant CURRICULUM = bytes32("rust-101");

    function setUp() public {
        escrow = new ProofOfLearnEscrow(verifier);
        credential = new LearnCredential(verifier);
        vm.deal(sponsor, 10 ether);
    }

    function test_DepositAndPayout() public {
        vm.prank(sponsor);
        escrow.depositBounty{value: 1 ether}(BOUNTY_ID, CURRICULUM, 0.1 ether, 10);

        ProofOfLearnEscrow.Bounty memory b = escrow.getBounty(BOUNTY_ID);
        assertEq(b.sponsor, sponsor);
        assertEq(b.deposited, 1 ether);

        uint256 before = student.balance;
        escrow.releasePayout(BOUNTY_ID, student, bytes32("score-95"));
        assertEq(student.balance, before + 0.1 ether);

        b = escrow.getBounty(BOUNTY_ID);
        assertEq(b.paidStudents, 1);
        assertEq(b.remaining, 0.9 ether);
    }

    function test_RevertOnDoublePayout() public {
        vm.prank(sponsor);
        escrow.depositBounty{value: 1 ether}(BOUNTY_ID, CURRICULUM, 0.1 ether, 10);

        escrow.releasePayout(BOUNTY_ID, student, bytes32("s1"));

        vm.expectRevert(ProofOfLearnEscrow.AlreadyPaid.selector);
        escrow.releasePayout(BOUNTY_ID, student, bytes32("s1"));
    }

    function test_Refund() public {
        vm.prank(sponsor);
        escrow.depositBounty{value: 1 ether}(BOUNTY_ID, CURRICULUM, 0.1 ether, 10);

        vm.prank(sponsor);
        escrow.refundSponsor(BOUNTY_ID);

        assertEq(sponsor.balance, 10 ether);
    }

    function test_CredentialIsSoulbound() public {
        uint256 tokenId = credential.mint(student, CURRICULUM, 95, "ipfs://demo");
        assertEq(credential.ownerOf(tokenId), student);

        vm.prank(student);
        vm.expectRevert(LearnCredential.Soulbound.selector);
        credential.transferFrom(student, address(0xC0FFEE), tokenId);
    }
}
