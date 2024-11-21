import { PublicKey } from "@solana/web3.js";

/**
 * List of decentralized exchanges (DEXes) supported by the SDK.
 */
export const DEXES: string[] = [
  "Cropper",
  "Raydium",
  "Openbook",
  "StableWeightedSwap",
  "Guacswap",
  "OpenBookV2",
  "Aldrin",
  "MeteoraDLMM",
  "Saber(Decimals)",
  "SanctumInfinity",
  "Whirlpool",
  "StepN",
  "Dexlab",
  "RaydiumCP",
  "Mercurial",
  "LifinityV2",
  "ObricV2",
  "Meteora",
  "Phoenix",
  "TokenSwap",
  "HeliumNetwork",
  "Sanctum",
  "Moonshot",
  "StableStableSwap",
  "GooseFX",
  "Penguin",
  "AldrinV2",
  "OrcaV2",
  "LifinityV1",
  "1DEX",
  "CropperLegacy",
  "SolFi",
  "Oasis",
  "Saber",
  "Crema",
  "Pump.fun",
  "RaydiumCLMM",
  "Bonkswap",
  "Perps",
  "Fox",
  "Saros",
  "OrcaV1",
  "FluxBeam",
  "Invariant",
];

/**
 * List of Jito accounts used for MEV protection. (JitoTip 1~8)
 */
export const JITO_ACCOUNTS: PublicKey[] = [
  new PublicKey("96gYZGLnJYVFmbjzopPSU6QiEV5fGqZNyN9nmNhvrZU5"),
  new PublicKey("HFqU5x63VTqvQss8hp11i4wVV8bD44PvwucfZ2bU7gRe"),
  new PublicKey("Cw8CFyM9FkoMi7K7Crf6HNQqf4uEMzpKw6QNghXLvLkY"),
  new PublicKey("ADaUMid9yfUytqMBgopwjb2DTLSokTSzL1zt6iGPaS49"),
  new PublicKey("DfXygSm4jCyNCybVYYK6DwvWqjKee8pbDmJGcLWNDXjh"),
  new PublicKey("ADuUkR4vqLUMWXxW9gh6D6L8pMSawimctcNZ5pGwDcEt"),
  new PublicKey("DttWaMuVvTiduZRnguLF7jNxTgiMBZ1hyAumKUiL2KRL"),
  new PublicKey("3AVi9Tg9Uo68tJfuvoKvqKNWKkC5wPdSSdeBnizKZ6jT"),
];

/**
 * List of Jito URLs for sending transaction bundles.
 */
export const JITO_URLS: string[] = [
  "https://amsterdam.mainnet.block-engine.jito.wtf/api/v1/bundles",
  "https://frankfurt.mainnet.block-engine.jito.wtf/api/v1/bundles",
  "https://ny.mainnet.block-engine.jito.wtf/api/v1/bundles",
  "https://tokyo.mainnet.block-engine.jito.wtf/api/v1/bundles",
  "https://slc.mainnet.block-engine.jito.wtf/api/v1/bundles",
];

/**
 * Fee account public keys. (Jup Fee 1, 2)
 */
export const FEE_ACCOUNT_1 = new PublicKey(
  "BsJVUnreMP9x3hieTGNvfFkgtGWMT5dL2tkNeerY2x6X"
);
export const FEE_ACCOUNT_2 = new PublicKey(
  "HkwQG47SYLprat3A2a7zm2PhA4EiqXe4BRGeZFuBJLGB"
);

/**
 * Program IDs and constants.
 */
export const WSOL_MINT = new PublicKey(
  "So11111111111111111111111111111111111111112"
);
export const JUPITER_PROGRAM_ID = new PublicKey(
  "JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4"
);
export const AMM_PROGRAM_ID = new PublicKey(
  "ammm1g4BXHiRCo3XtUxdTxm4jm5tzqSV6nMK1K52H6W"
);
