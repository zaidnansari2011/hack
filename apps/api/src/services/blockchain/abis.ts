// Hand-authored ABIs mirroring the Solidity contracts in apps/contracts/.
// Foundry artifacts also produce these — kept here so the API builds without
// requiring `forge build` in CI.

export const escrowAbi = [
  {
    type: "function",
    name: "depositBounty",
    stateMutability: "payable",
    inputs: [
      { name: "bountyId", type: "bytes32" },
      { name: "curriculumHash", type: "bytes32" },
      { name: "rewardPerStudent", type: "uint256" },
      { name: "maxStudents", type: "uint256" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "releasePayout",
    stateMutability: "nonpayable",
    inputs: [
      { name: "bountyId", type: "bytes32" },
      { name: "student", type: "address" },
      { name: "scoreHash", type: "bytes32" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "refundSponsor",
    stateMutability: "nonpayable",
    inputs: [{ name: "bountyId", type: "bytes32" }],
    outputs: [],
  },
  {
    type: "function",
    name: "getBounty",
    stateMutability: "view",
    inputs: [{ name: "bountyId", type: "bytes32" }],
    outputs: [
      {
        type: "tuple",
        components: [
          { name: "sponsor", type: "address" },
          { name: "curriculumHash", type: "bytes32" },
          { name: "rewardPerStudent", type: "uint256" },
          { name: "maxStudents", type: "uint256" },
          { name: "paidStudents", type: "uint256" },
          { name: "deposited", type: "uint256" },
          { name: "remaining", type: "uint256" },
          { name: "exists", type: "bool" },
          { name: "closed", type: "bool" },
        ],
      },
    ],
  },
  {
    type: "event",
    name: "BountyCreated",
    inputs: [
      { name: "bountyId", type: "bytes32", indexed: true },
      { name: "sponsor", type: "address", indexed: true },
      { name: "curriculumHash", type: "bytes32", indexed: true },
      { name: "rewardPerStudent", type: "uint256", indexed: false },
      { name: "maxStudents", type: "uint256", indexed: false },
      { name: "deposited", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "LearningVerified",
    inputs: [
      { name: "bountyId", type: "bytes32", indexed: true },
      { name: "student", type: "address", indexed: true },
      { name: "scoreHash", type: "bytes32", indexed: true },
      { name: "rewardAmount", type: "uint256", indexed: false },
      { name: "timestamp", type: "uint256", indexed: false },
    ],
  },
] as const

export const credentialAbi = [
  {
    type: "function",
    name: "mint",
    stateMutability: "nonpayable",
    inputs: [
      { name: "student", type: "address" },
      { name: "curriculumHash", type: "bytes32" },
      { name: "scorePct", type: "uint16" },
      { name: "uri", type: "string" },
    ],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "ownerOf",
    stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ type: "address" }],
  },
  {
    type: "event",
    name: "CredentialMinted",
    inputs: [
      { name: "student", type: "address", indexed: true },
      { name: "tokenId", type: "uint256", indexed: true },
      { name: "curriculumHash", type: "bytes32", indexed: true },
      { name: "scorePct", type: "uint16", indexed: false },
      { name: "tokenURI", type: "string", indexed: false },
    ],
  },
] as const
