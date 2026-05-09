---
title: Solidity & Smart Contract Security
slug: solidity-101
---

# State and Storage

Solidity contracts live on the Ethereum Virtual Machine (EVM). Every contract has its own permanent **storage** — a giant key/value map of 256-bit slots that persists between transactions. Reading a storage slot costs roughly 2,100 gas; writing a slot costs 20,000 gas the first time and 5,000 thereafter. This is why senior Solidity engineers obsess over storage layout: you pay for every byte forever.

A contract also has **memory** (cleared between calls, much cheaper, used for temporary computation) and **calldata** (read-only input from the transaction). Choosing the right location matters: a function parameter declared `string memory name` allocates and copies; the same parameter as `string calldata name` does neither and saves gas.

State variables declared at the contract level are storage by default. Local variables of value types (uint, address, bool) live on the stack. Local variables of reference types (struct, array, mapping) need an explicit data location — `memory`, `storage`, or `calldata`.

# Functions and Visibility

Solidity has four visibility modifiers and using the wrong one is a frequent source of bugs and exploits.

`public` functions are callable both internally and externally — the compiler auto-generates an external ABI entry. `external` functions are only callable from outside the contract; they're slightly cheaper than `public` for large parameter lists because arguments stay in calldata. `internal` functions are visible to the contract and any contract that inherits it — the default for helpers. `private` functions are visible only inside the declaring contract; note that private does **not** mean confidential — anyone can read the bytecode and storage off-chain.

State-mutability modifiers further constrain what a function can do. `view` functions promise not to write state (the compiler enforces this). `pure` functions promise not to read or write state. `payable` functions can receive ETH; non-payable functions revert if ETH is sent. Default is non-payable, non-view.

# Reentrancy and Checks-Effects-Interactions

The DAO hack of 2016 drained 3.6 million ETH through a reentrancy bug. The pattern still appears in audits today. The vulnerability: a contract calls an external address (which could be an attacker contract), and that external call re-enters the original function before the original state was updated.

The defensive pattern is **Checks-Effects-Interactions**: validate inputs first, update state second, make external calls last. If the external call re-enters, the state has already been written, so the second invocation will fail its checks.

For belt-and-suspenders, OpenZeppelin's `ReentrancyGuard` provides a `nonReentrant` modifier that uses a single storage slot as a mutex. Apply it to any function that performs an external call after touching state. The gas cost is negligible against the disaster it prevents.

# Events and Logs

Events are how a contract communicates with the world off-chain. When you `emit Transfer(from, to, amount)`, the EVM writes a log entry into the transaction receipt — visible to any indexer, subgraph, or wallet. Logs cost dramatically less than storage: a 32-byte log topic is about 375 gas vs 20,000 for a storage write.

Events have up to three **indexed** parameters. Indexed parameters become topics that node operators index for fast filtering — `eth_getLogs` with a `topics` filter is what powers every block explorer's "Transfers To" tab. Non-indexed parameters are stored in the data field and require a full log scan to filter.

Indexer rule of thumb: index addresses (from, to, sender, owner) and identifiers (tokenId, marketId). Don't index amounts — they're rarely useful as filters and they cost a topic slot.

# Access Control

Most production contracts have privileged functions: pausing trading, upgrading parameters, draining a treasury. The simplest pattern is OpenZeppelin's `Ownable` — a single `owner` address, set to `msg.sender` at construction, with an `onlyOwner` modifier. Good for prototypes; brittle for production because losing the key bricks the contract.

`AccessControl` is the role-based version: a contract can have many roles (`MINTER_ROLE`, `PAUSER_ROLE`), each held by zero or more addresses, with a `DEFAULT_ADMIN_ROLE` that grants and revokes the others. This composes well with multisigs (Gnosis Safe) and timelocks (governance contracts that delay privileged actions for 48 hours so users can exit if they disagree).

The most secure production pattern: a multisig admin behind a timelock, with role assignments for routine operations to less-privileged keys. The admin can pause; routine ops can't pause.

# ERC-20 and ERC-721

ERC-20 is the fungible token standard — every USDC, DAI, and USDT contract implements the same nine-function interface so wallets and exchanges can integrate them without bespoke code. The standard mandates `transfer`, `transferFrom`, `approve`, `balanceOf`, `allowance`, `totalSupply`, plus the `Transfer` and `Approval` events.

ERC-20 has subtle traps. `transfer` returns a bool but many old tokens return nothing — always use OpenZeppelin's `SafeERC20`. The `approve` race condition (USDT being the famous case) means changing an allowance from non-zero to non-zero requires two transactions; `safeIncreaseAllowance` and `safeDecreaseAllowance` are the modern fix.

ERC-721 is the non-fungible standard — each token has a unique `tokenId`. Soulbound tokens (used for credentials, identity, achievements) are typically ERC-721 contracts that override `transferFrom` and `safeTransferFrom` to revert. The token can be minted and burned, but never transferred — perfect for proof-of-completion certificates that shouldn't be saleable.

# Foundry: testing and fuzzing

Foundry is the modern Solidity toolchain — written in Rust, fast, and built around Solidity-native tests. A test is just a contract: functions named `testSomething()` are run; functions named `testFuzz_Something(uint256 amount)` are fuzzed with random inputs.

The killer feature is `vm` cheatcodes. `vm.prank(alice)` makes the next call originate from alice. `vm.expectRevert("Insufficient balance")` asserts that the next call reverts with that message. `vm.warp(block.timestamp + 1 days)` jumps the chain forward — invaluable for testing time-gated logic.

Invariant testing goes one step further: you write properties that must always hold (`totalSupply == sum(balances)`) and Foundry pounds the contract with random sequences of calls trying to break them. Real bugs that humans missed get caught this way.

Coverage and gas reports are first-class: `forge coverage` shows untested branches; `forge test --gas-report` shows the gas cost of every external function — essential before deploying to mainnet.

# Deployment and Verification

Deploying a contract puts its bytecode on-chain at a deterministic address (a hash of deployer + nonce, or with `CREATE2`, a hash of salt + bytecode). Once deployed, the bytecode is immutable. Storage is the only thing that can change.

After deployment, **always verify** the source on the relevant block explorer (Etherscan, Basescan, Arbiscan). Verification posts your Solidity source plus exact compiler version + optimization settings; the explorer recompiles and confirms the bytecode matches. Without verification, users see a wall of opcodes — most will refuse to interact. With verification, the read/write tabs become functional and users can audit the source themselves.

Verification is free, takes one command (`forge verify-contract`), and is the single highest-leverage thing you can do for trust. Skip it and your "decentralized" app is functionally a black box.
