// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title ProofOfLearnEscrow
/// @notice Sponsors deposit ETH (or wrapped USDC) into per-bounty escrow buckets.
///         A trusted backend verifier releases payouts to students upon verified
///         curriculum completion. The contract emits LearningVerified events that
///         serve as the on-chain proof for each completion.
/// @dev    Demo-mode contract: payouts are recorded on-chain (event + bookkeeping)
///         even when the actual fiat (INR) settlement happens off-chain via UPI.
contract ProofOfLearnEscrow {
    // ─── Types ──────────────────────────────────────────────────────────────
    struct Bounty {
        address sponsor;
        bytes32 curriculumHash;
        uint256 rewardPerStudent;
        uint256 maxStudents;
        uint256 paidStudents;
        uint256 deposited;
        uint256 remaining;
        bool exists;
        bool closed;
    }

    // ─── Storage ────────────────────────────────────────────────────────────
    address public immutable owner;
    address public verifier;
    mapping(bytes32 => Bounty) public bounties;
    mapping(bytes32 => mapping(address => bool)) public hasBeenPaid;

    // ─── Events ─────────────────────────────────────────────────────────────
    event BountyCreated(
        bytes32 indexed bountyId,
        address indexed sponsor,
        bytes32 indexed curriculumHash,
        uint256 rewardPerStudent,
        uint256 maxStudents,
        uint256 deposited
    );

    event LearningVerified(
        bytes32 indexed bountyId,
        address indexed student,
        bytes32 indexed scoreHash,
        uint256 rewardAmount,
        uint256 timestamp
    );

    event BountyRefunded(
        bytes32 indexed bountyId,
        address indexed sponsor,
        uint256 refundAmount
    );

    event VerifierUpdated(address indexed previous, address indexed next);

    // ─── Errors ─────────────────────────────────────────────────────────────
    error NotOwner();
    error NotVerifier();
    error BountyAlreadyExists();
    error BountyNotFound();
    error BountyClosed();
    error InsufficientDeposit();
    error AlreadyPaid();
    error CapReached();
    error InvalidStudent();
    error TransferFailed();

    // ─── Modifiers ──────────────────────────────────────────────────────────
    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    modifier onlyVerifier() {
        if (msg.sender != verifier) revert NotVerifier();
        _;
    }

    // ─── Constructor ────────────────────────────────────────────────────────
    constructor(address _verifier) {
        owner = msg.sender;
        verifier = _verifier == address(0) ? msg.sender : _verifier;
    }

    // ─── Admin ──────────────────────────────────────────────────────────────
    function setVerifier(address _verifier) external onlyOwner {
        emit VerifierUpdated(verifier, _verifier);
        verifier = _verifier;
    }

    // ─── Sponsor flow ───────────────────────────────────────────────────────
    /// @notice Deposit native ETH to fund a new bounty.
    /// @param  bountyId          Unique identifier (e.g. keccak of off-chain row id).
    /// @param  curriculumHash    Content hash of the curriculum being sponsored.
    /// @param  rewardPerStudent  Wei released per verified completion.
    /// @param  maxStudents       Maximum number of students that can be paid.
    function depositBounty(
        bytes32 bountyId,
        bytes32 curriculumHash,
        uint256 rewardPerStudent,
        uint256 maxStudents
    ) external payable {
        if (bounties[bountyId].exists) revert BountyAlreadyExists();
        uint256 required = rewardPerStudent * maxStudents;
        if (msg.value < required) revert InsufficientDeposit();

        bounties[bountyId] = Bounty({
            sponsor: msg.sender,
            curriculumHash: curriculumHash,
            rewardPerStudent: rewardPerStudent,
            maxStudents: maxStudents,
            paidStudents: 0,
            deposited: msg.value,
            remaining: msg.value,
            exists: true,
            closed: false
        });

        emit BountyCreated(
            bountyId,
            msg.sender,
            curriculumHash,
            rewardPerStudent,
            maxStudents,
            msg.value
        );
    }

    // ─── Verifier flow ──────────────────────────────────────────────────────
    /// @notice Release a single payout to a student who has been verified by the
    ///         backend. Emits LearningVerified — that event is the public proof.
    function releasePayout(
        bytes32 bountyId,
        address student,
        bytes32 scoreHash
    ) external onlyVerifier {
        Bounty storage b = bounties[bountyId];
        if (!b.exists) revert BountyNotFound();
        if (b.closed) revert BountyClosed();
        if (student == address(0)) revert InvalidStudent();
        if (hasBeenPaid[bountyId][student]) revert AlreadyPaid();
        if (b.paidStudents >= b.maxStudents) revert CapReached();
        if (b.remaining < b.rewardPerStudent) revert InsufficientDeposit();

        hasBeenPaid[bountyId][student] = true;
        b.paidStudents += 1;
        b.remaining -= b.rewardPerStudent;

        (bool ok, ) = student.call{value: b.rewardPerStudent}("");
        if (!ok) revert TransferFailed();

        emit LearningVerified(
            bountyId,
            student,
            scoreHash,
            b.rewardPerStudent,
            block.timestamp
        );

        if (b.paidStudents == b.maxStudents) {
            b.closed = true;
        }
    }

    // ─── Refund ─────────────────────────────────────────────────────────────
    function refundSponsor(bytes32 bountyId) external {
        Bounty storage b = bounties[bountyId];
        if (!b.exists) revert BountyNotFound();
        if (msg.sender != b.sponsor && msg.sender != owner) revert NotOwner();
        if (b.closed) revert BountyClosed();

        uint256 refund = b.remaining;
        b.remaining = 0;
        b.closed = true;

        if (refund > 0) {
            (bool ok, ) = b.sponsor.call{value: refund}("");
            if (!ok) revert TransferFailed();
        }

        emit BountyRefunded(bountyId, b.sponsor, refund);
    }

    // ─── Views ──────────────────────────────────────────────────────────────
    function getBounty(bytes32 bountyId) external view returns (Bounty memory) {
        return bounties[bountyId];
    }
}
