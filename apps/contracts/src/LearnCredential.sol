// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title LearnCredential
/// @notice Soulbound (non-transferable) ERC-721 minted to a student wallet upon
///         verified curriculum completion. Token metadata captures the
///         curriculum hash and quiz score so the credential is self-describing.
/// @dev    Minimal hand-rolled ERC-721 — keeps the bytecode small and avoids
///         pulling in the full OZ contracts library for the demo build.
contract LearnCredential {
    // ─── ERC-165 / ERC-721 metadata ─────────────────────────────────────────
    string public constant name = "Proof-of-Learn Credential";
    string public constant symbol = "POLC";

    // ─── Storage ────────────────────────────────────────────────────────────
    address public immutable owner;
    address public minter;

    uint256 private _nextTokenId = 1;
    mapping(uint256 => address) private _ownerOf;
    mapping(address => uint256) private _balanceOf;
    mapping(uint256 => string) private _tokenURI;

    struct CredentialData {
        bytes32 curriculumHash;
        uint16 scorePct;
        uint64 mintedAt;
    }
    mapping(uint256 => CredentialData) public credentialOf;

    // ─── Events ─────────────────────────────────────────────────────────────
    event Transfer(address indexed from, address indexed to, uint256 indexed tokenId);
    event CredentialMinted(
        address indexed student,
        uint256 indexed tokenId,
        bytes32 indexed curriculumHash,
        uint16 scorePct,
        string tokenURI
    );
    event MinterUpdated(address indexed previous, address indexed next);

    // ─── Errors ─────────────────────────────────────────────────────────────
    error NotOwner();
    error NotMinter();
    error Soulbound();
    error InvalidStudent();
    error TokenNotFound();

    // ─── Modifiers ──────────────────────────────────────────────────────────
    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    modifier onlyMinter() {
        if (msg.sender != minter) revert NotMinter();
        _;
    }

    constructor(address _minter) {
        owner = msg.sender;
        minter = _minter == address(0) ? msg.sender : _minter;
    }

    // ─── Admin ──────────────────────────────────────────────────────────────
    function setMinter(address _minter) external onlyOwner {
        emit MinterUpdated(minter, _minter);
        minter = _minter;
    }

    // ─── Mint ───────────────────────────────────────────────────────────────
    function mint(
        address student,
        bytes32 curriculumHash,
        uint16 scorePct,
        string calldata uri
    ) external onlyMinter returns (uint256 tokenId) {
        if (student == address(0)) revert InvalidStudent();
        tokenId = _nextTokenId++;

        _ownerOf[tokenId] = student;
        _balanceOf[student] += 1;
        _tokenURI[tokenId] = uri;
        credentialOf[tokenId] = CredentialData({
            curriculumHash: curriculumHash,
            scorePct: scorePct,
            mintedAt: uint64(block.timestamp)
        });

        emit Transfer(address(0), student, tokenId);
        emit CredentialMinted(student, tokenId, curriculumHash, scorePct, uri);
    }

    // ─── ERC-721 reads ──────────────────────────────────────────────────────
    function ownerOf(uint256 tokenId) external view returns (address) {
        address o = _ownerOf[tokenId];
        if (o == address(0)) revert TokenNotFound();
        return o;
    }

    function balanceOf(address holder) external view returns (uint256) {
        return _balanceOf[holder];
    }

    function tokenURI(uint256 tokenId) external view returns (string memory) {
        if (_ownerOf[tokenId] == address(0)) revert TokenNotFound();
        return _tokenURI[tokenId];
    }

    function totalSupply() external view returns (uint256) {
        return _nextTokenId - 1;
    }

    // ─── Soulbound: transfers disabled ──────────────────────────────────────
    function transferFrom(address, address, uint256) external pure {
        revert Soulbound();
    }

    function safeTransferFrom(address, address, uint256) external pure {
        revert Soulbound();
    }

    function safeTransferFrom(address, address, uint256, bytes calldata) external pure {
        revert Soulbound();
    }

    function approve(address, uint256) external pure {
        revert Soulbound();
    }

    function setApprovalForAll(address, bool) external pure {
        revert Soulbound();
    }

    function getApproved(uint256) external pure returns (address) {
        return address(0);
    }

    function isApprovedForAll(address, address) external pure returns (bool) {
        return false;
    }

    // ERC-165: supports ERC-721 + metadata, but no transfer interface.
    function supportsInterface(bytes4 interfaceId) external pure returns (bool) {
        return
            interfaceId == 0x01ffc9a7 || // ERC-165
            interfaceId == 0x80ac58cd || // ERC-721
            interfaceId == 0x5b5e139f;   // ERC-721 Metadata
    }
}
