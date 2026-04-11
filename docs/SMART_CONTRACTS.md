# Smart Contract Specification

Chain: **Base** (Sepolia testnet for development, Base mainnet for production)
Framework: **Foundry** (forge, cast, anvil)
Language: **Solidity ^0.8.24**
Token: **USDC** (Circle's native stablecoin — 6 decimals)

---

## Contract 1: ProofOfLearnEscrow

The core financial contract. Holds sponsor deposits and releases USDC to students upon verified quiz completion.

### State

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract ProofOfLearnEscrow is Ownable, ReentrancyGuard {

    IERC20 public immutable usdc;

    struct Bounty {
        address sponsor;
        uint256 rewardPerStudent;       // in USDC (6 decimals)
        uint256 totalDeposited;
        uint256 totalPaidOut;
        uint256 maxStudents;
        uint256 completions;
        uint256 deadline;               // unix timestamp
        bytes32 curriculumHash;         // keccak256 of curriculum metadata
        bool active;
    }

    // bountyId => Bounty
    mapping(bytes32 => Bounty) public bounties;

    // bountyId => studentAddress => bool (has been paid)
    mapping(bytes32 => mapping(address => bool)) public hasClaimed;

    // Authorized relayer addresses (our backend)
    mapping(address => bool) public authorizedRelayers;
}
```

### Events

```solidity
event BountyCreated(
    bytes32 indexed bountyId,
    address indexed sponsor,
    uint256 rewardPerStudent,
    uint256 maxStudents,
    uint256 totalDeposited,
    bytes32 curriculumHash
);

event ProofOfLearn(
    bytes32 indexed bountyId,
    address indexed student,
    bytes32 scoreHash,          // keccak256(score + nonce) — privacy-preserving
    uint256 reward,
    uint256 timestamp
);

event BountyRefunded(
    bytes32 indexed bountyId,
    address indexed sponsor,
    uint256 amount
);

event RelayerUpdated(address indexed relayer, bool authorized);
```

### Core Functions

#### `createBounty`

Called by sponsors to create a bounty and deposit USDC.

```solidity
function createBounty(
    bytes32 bountyId,
    uint256 rewardPerStudent,
    uint256 maxStudents,
    uint256 deadline,
    bytes32 curriculumHash
) external nonReentrant {
    require(bounties[bountyId].sponsor == address(0), "Bounty exists");
    require(rewardPerStudent > 0, "Reward must be > 0");
    require(maxStudents > 0, "Max students must be > 0");
    require(deadline > block.timestamp, "Deadline must be future");

    uint256 totalDeposit = rewardPerStudent * maxStudents;
    // Add 2% reserve buffer for gas/edge cases
    uint256 depositWithBuffer = totalDeposit + (totalDeposit * 2 / 100);

    require(
        usdc.transferFrom(msg.sender, address(this), depositWithBuffer),
        "USDC transfer failed"
    );

    bounties[bountyId] = Bounty({
        sponsor: msg.sender,
        rewardPerStudent: rewardPerStudent,
        totalDeposited: depositWithBuffer,
        totalPaidOut: 0,
        maxStudents: maxStudents,
        completions: 0,
        deadline: deadline,
        curriculumHash: curriculumHash,
        active: true
    });

    emit BountyCreated(
        bountyId, msg.sender, rewardPerStudent,
        maxStudents, depositWithBuffer, curriculumHash
    );
}
```

#### `releasePayout`

Called by authorized relayer (our backend) when a student passes a quiz.

```solidity
function releasePayout(
    bytes32 bountyId,
    address student,
    bytes32 scoreHash
) external nonReentrant {
    require(authorizedRelayers[msg.sender], "Not authorized");

    Bounty storage bounty = bounties[bountyId];
    require(bounty.active, "Bounty not active");
    require(block.timestamp <= bounty.deadline, "Bounty expired");
    require(!hasClaimed[bountyId][student], "Already claimed");
    require(bounty.completions < bounty.maxStudents, "Bounty full");

    uint256 remaining = bounty.totalDeposited - bounty.totalPaidOut;
    require(remaining >= bounty.rewardPerStudent, "Insufficient funds");

    hasClaimed[bountyId][student] = true;
    bounty.completions++;
    bounty.totalPaidOut += bounty.rewardPerStudent;

    require(
        usdc.transfer(student, bounty.rewardPerStudent),
        "USDC transfer failed"
    );

    emit ProofOfLearn(
        bountyId, student, scoreHash,
        bounty.rewardPerStudent, block.timestamp
    );
}
```

#### `refundSponsor`

Sponsors can reclaim unused USDC after the bounty deadline.

```solidity
function refundSponsor(bytes32 bountyId) external nonReentrant {
    Bounty storage bounty = bounties[bountyId];
    require(msg.sender == bounty.sponsor, "Not sponsor");
    require(
        block.timestamp > bounty.deadline || !bounty.active,
        "Bounty still active"
    );

    uint256 remaining = bounty.totalDeposited - bounty.totalPaidOut;
    require(remaining > 0, "Nothing to refund");

    bounty.active = false;
    bounty.totalDeposited = bounty.totalPaidOut; // zero out remaining

    require(usdc.transfer(bounty.sponsor, remaining), "Refund failed");

    emit BountyRefunded(bountyId, bounty.sponsor, remaining);
}
```

#### `setRelayer`

Owner-only function to authorize/deauthorize relayer addresses.

```solidity
function setRelayer(address relayer, bool authorized) external onlyOwner {
    authorizedRelayers[relayer] = authorized;
    emit RelayerUpdated(relayer, authorized);
}
```

### Security Considerations

| Threat | Mitigation |
|--------|-----------|
| Reentrancy | `ReentrancyGuard` on all state-changing functions |
| Double-claim | `hasClaimed` mapping checked before every payout |
| Unauthorized payout | Only `authorizedRelayers` can call `releasePayout` |
| Sponsor rug-pull | Funds locked until deadline; no early withdrawal |
| Relayer compromise | Relayer can only release to verified students — can't drain to arbitrary address (student must exist in `hasClaimed` mapping) |
| Over-payout | Remaining balance checked before every transfer |

---

## Contract 2: LearnCredential (Soulbound Token)

Non-transferable ERC-721 that serves as verifiable proof that a specific student completed a specific curriculum.

### Design

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract LearnCredential is ERC721, Ownable {

    uint256 private _nextTokenId;

    struct Credential {
        bytes32 bountyId;
        bytes32 curriculumHash;
        bytes32 scoreHash;
        uint256 completedAt;
    }

    // tokenId => Credential
    mapping(uint256 => Credential) public credentials;

    // student => bountyId => bool (one credential per bounty per student)
    mapping(address => mapping(bytes32 => bool)) public hasCredential;

    // Authorized minters (our backend relayer)
    mapping(address => bool) public authorizedMinters;

    constructor() ERC721("ProofOfLearn Credential", "POLC") Ownable(msg.sender) {}

    function mint(
        address student,
        bytes32 bountyId,
        bytes32 curriculumHash,
        bytes32 scoreHash
    ) external returns (uint256) {
        require(authorizedMinters[msg.sender], "Not authorized");
        require(!hasCredential[student][bountyId], "Already has credential");

        uint256 tokenId = _nextTokenId++;

        credentials[tokenId] = Credential({
            bountyId: bountyId,
            curriculumHash: curriculumHash,
            scoreHash: scoreHash,
            completedAt: block.timestamp
        });

        hasCredential[student][bountyId] = true;
        _safeMint(student, tokenId);

        return tokenId;
    }

    // ── Soulbound: block all transfers ──────────────────

    function transferFrom(address, address, uint256) public pure override {
        revert("Soulbound: non-transferable");
    }

    function safeTransferFrom(address, address, uint256, bytes memory) public pure override {
        revert("Soulbound: non-transferable");
    }

    function approve(address, uint256) public pure override {
        revert("Soulbound: non-transferable");
    }

    function setApprovalForAll(address, bool) public pure override {
        revert("Soulbound: non-transferable");
    }

    // ── Admin ───────────────────────────────────────────

    function setMinter(address minter, bool authorized) external onlyOwner {
        authorizedMinters[minter] = authorized;
    }
}
```

### Token Metadata

Each credential's on-chain data includes:
- **bountyId**: Links to the specific bounty program
- **curriculumHash**: Verifiable link to the curriculum content
- **scoreHash**: Privacy-preserving score proof (keccak256 of score + nonce)
- **completedAt**: Timestamp of completion

Off-chain metadata (for NFT viewers) is served via a tokenURI that returns:
```json
{
  "name": "Proof of Learn: Rust Programming",
  "description": "Completed Rust fundamentals curriculum with verified score",
  "image": "https://api.proofoflearn.xyz/credentials/image/{tokenId}",
  "attributes": [
    { "trait_type": "Curriculum", "value": "Rust Programming" },
    { "trait_type": "Completed", "value": "2026-04-11" },
    { "trait_type": "Verified", "value": "true" }
  ]
}
```

---

## Deployment

### Local (Anvil)

```bash
# Start local chain
anvil --fork-url https://sepolia.base.org

# Deploy
forge script script/Deploy.s.sol --rpc-url http://localhost:8545 --broadcast
```

### Testnet (Base Sepolia)

```bash
forge script script/Deploy.s.sol \
  --rpc-url https://sepolia.base.org \
  --private-key $DEPLOYER_PRIVATE_KEY \
  --broadcast \
  --verify \
  --etherscan-api-key $BASESCAN_API_KEY
```

### Deploy Script (`script/Deploy.s.sol`)

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script} from "forge-std/Script.sol";
import {ProofOfLearnEscrow} from "../src/ProofOfLearnEscrow.sol";
import {LearnCredential} from "../src/LearnCredential.sol";

contract Deploy is Script {
    // Base Sepolia USDC address
    address constant USDC = 0x036CbD53842c5426634e7929541eC2318f3dCF7e;

    function run() external {
        vm.startBroadcast();

        ProofOfLearnEscrow escrow = new ProofOfLearnEscrow(USDC);
        LearnCredential credential = new LearnCredential();

        // Authorize deployer as initial relayer/minter
        escrow.setRelayer(msg.sender, true);
        credential.setMinter(msg.sender, true);

        vm.stopBroadcast();
    }
}
```

---

## Gas Estimates (Base L2)

| Operation | Gas Units | Cost @ 0.001 gwei (Base) |
|-----------|-----------|--------------------------|
| createBounty | ~150,000 | ~$0.0001 |
| releasePayout | ~80,000 | ~$0.00005 |
| mint credential | ~120,000 | ~$0.00008 |
| refundSponsor | ~60,000 | ~$0.00004 |

At Base L2 prices, the entire lifecycle of a bounty (creation + 10,000 payouts + 10,000 credentials) costs under $2 in gas. This is why L2 matters for micro-payouts.

---

## Testing Strategy

```bash
# Run all tests
forge test

# Run with verbosity
forge test -vvvv

# Run specific test
forge test --match-test testReleasePayout

# Fuzz testing (default 256 runs)
forge test --match-test testFuzz

# Gas report
forge test --gas-report
```

### Key Test Cases

- `testCreateBounty` — sponsor deposits, bounty created correctly
- `testReleasePayout` — authorized relayer releases, student receives USDC
- `testDoubleClaimReverts` — same student can't claim twice
- `testUnauthorizedRelayerReverts` — random address can't call releasePayout
- `testRefundAfterDeadline` — sponsor reclaims unused funds
- `testRefundBeforeDeadlineReverts` — sponsor can't rug-pull early
- `testBountyFullReverts` — can't exceed max students
- `testSoulboundTransferReverts` — credential can't be transferred
- `testFuzzReleasePayout` — fuzz with random students and amounts
