import {
  ComputeBudgetProgram,
  PublicKey,
  Keypair,
  SystemProgram,
  TransactionInstruction,
  Connection,
  VersionedTransaction,
  AddressLookupTableAccount,
} from "@solana/web3.js";
import bs58 from "bs58";
import BN from "bn.js";
import * as splToken from "@solana/spl-token";
import fetch from "node-fetch";

import {
  getRandomJitoAccount,
  getRandomJitoUrl,
  sendBundle,
  createVtxWithOnlyMainSigner,
  getOwnerAta,
  getLookupTables,
  parseSwap,
  createVtx,
} from "./common";

import {
  FEE_ACCOUNT_1,
  FEE_ACCOUNT_2,
  AMM_PROGRAM_ID,
  JUPITER_PROGRAM_ID,
  WSOL_MINT,
} from "./constants";

type Direction = "buy" | "sell";

interface AmmOptions {
  disableLogs?: boolean;
}

interface MakerOptions {
  jitoTipLamports?: number;
  includeDexes?: string[];
}

interface VolumeOptions {
  jitoTipLamports?: number;
  includeDexes?: string[];
}

interface SwapOptions {
  jitoTipLamports?: number;
  includeDexes?: string[];
}

interface JupiterCache {
  buy: any | null;
  sell: any | null;
  lastUpdateTime: number;
  tables: AddressLookupTableAccount[] | null;
}

interface MakerStats {
  makersCompleted: number;
  makersRemaining: number;
  bundleCount: number;
  latestBundleId: string | null;
  solBalance?: number;
  finished: boolean;
}

/**
 * Automated Market Maker class for Solana tokens.
 */
export class AMM {
  private connection: Connection;
  private payer: Keypair;
  private jupiterCache: JupiterCache;
  private disableLogs: boolean;
  private balance: number;
  private blockhash: string;
  private lastBlockhashRefresh: number;

  /**
   * Creates a new AMM instance.
   * @param connection - Solana RPC connection.
   * @param payerKeypair - Keypair for the payer account.
   * @param options - Optional configuration parameters.
   */
  constructor(
    connection: Connection,
    payerKeypair: Keypair,
    options: AmmOptions = {}
  ) {
    this.connection = connection;
    this.payer = payerKeypair;
    this.jupiterCache = {
      buy: null,
      sell: null,
      lastUpdateTime: 0,
      tables: null,
    };
    this.disableLogs = options.disableLogs || false;
    this.balance = 0;
    this.blockhash = "";
    this.lastBlockhashRefresh = 0;
    this.initializeBlockhash();
  }

  /**
   * Initializes the recent blockhash.
   */
  private async initializeBlockhash(): Promise<void> {
    const response = await this.connection.getLatestBlockhash("finalized");
    this.blockhash = response.blockhash;
    this.lastBlockhashRefresh = 0;
  }

  /**
   * Creates a funding transaction for multiple accounts.
   * @param pubkeys - An array of Keypairs to fund.
   * @param jitoTipLamports - The tip amount in lamports for Jito.
   * @param blockhash - The recent blockhash.
   * @returns A Promise resolving to a VersionedTransaction.
   */
  private createFundTx(
    pubkeys: Keypair[],
    jitoTipLamports: number,
    blockhash: string
  ): VersionedTransaction {
    const selectedJitoAccount = getRandomJitoAccount();
    const accounts = [
      { pubkey: this.payer.publicKey, isSigner: true, isWritable: true },
      { pubkey: pubkeys[0].publicKey, isSigner: false, isWritable: true },
      { pubkey: pubkeys[1].publicKey, isSigner: false, isWritable: true },
      { pubkey: pubkeys[2].publicKey, isSigner: false, isWritable: true },
      { pubkey: pubkeys[3].publicKey, isSigner: false, isWritable: true },
      { pubkey: selectedJitoAccount, isSigner: false, isWritable: true },
      { pubkey: FEE_ACCOUNT_1, isSigner: false, isWritable: true },
      { pubkey: FEE_ACCOUNT_2, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ];

    const instructionData = Buffer.alloc(9);
    instructionData[0] = 0; // Command identifier
    new BN(jitoTipLamports)
      .toArrayLike(Buffer, "le", 8)
      .copy(instructionData, 1);

    const createFundTxIx = new TransactionInstruction({
      programId: AMM_PROGRAM_ID,
      keys: accounts,
      data: instructionData,
    });

    const computeBudgetIxs = this.getComputeBudgetInstructions();

    const vTx = createVtxWithOnlyMainSigner(
      [...computeBudgetIxs, createFundTxIx],
      this.payer,
      blockhash
    );
    return vTx;
  }

  /**
   * Creates a funding transaction for a single account.
   * @param pubkey - The Keypair to fund.
   * @param jitoTipLamports - The tip amount in lamports for Jito.
   * @param blockhash - The recent blockhash.
   * @returns A Promise resolving to a VersionedTransaction.
   */
  private createFundSingleTx(
    pubkey: Keypair,
    jitoTipLamports: number,
    blockhash: string
  ): VersionedTransaction {
    const selectedJitoAccount = getRandomJitoAccount();
    const accounts = [
      { pubkey: this.payer.publicKey, isSigner: true, isWritable: true },
      { pubkey: pubkey.publicKey, isSigner: false, isWritable: true },
      { pubkey: selectedJitoAccount, isSigner: false, isWritable: true },
      { pubkey: FEE_ACCOUNT_1, isSigner: false, isWritable: true },
      { pubkey: FEE_ACCOUNT_2, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ];

    const instructionData = Buffer.alloc(9);
    instructionData[0] = 3; // Command identifier
    new BN(jitoTipLamports)
      .toArrayLike(Buffer, "le", 8)
      .copy(instructionData, 1);

    const createFundTxIx = new TransactionInstruction({
      programId: AMM_PROGRAM_ID,
      keys: accounts,
      data: instructionData,
    });

    const computeBudgetIxs = this.getComputeBudgetInstructions();

    const vTx = createVtxWithOnlyMainSigner(
      [...computeBudgetIxs, createFundTxIx],
      this.payer,
      blockhash
    );
    return vTx;
  }

  /**
   * Retrieves compute budget instructions.
   * @returns An array of TransactionInstructions.
   */
  private getComputeBudgetInstructions(): TransactionInstruction[] {
    const unitPrice = Math.floor((10000 * 1_000_000) / 600_000);
    const computeUnitPriceIx = ComputeBudgetProgram.setComputeUnitPrice({
      microLamports: unitPrice,
    });
    const computeUnitLimitIx = ComputeBudgetProgram.setComputeUnitLimit({
      units: 600_000,
    });

    return [computeUnitPriceIx, computeUnitLimitIx];
  }

  /**
   * Executes maker orders for a token.
   * @param mint - Token mint public key.
   * @param totalMakersRequired - Total number of maker orders to create.
   * @param options - Optional configuration parameters.
   * @returns A Promise resolving to maker creation statistics.
   */
  public async makers(
    mint: PublicKey,
    totalMakersRequired: number,
    options: MakerOptions = {}
  ): Promise<MakerStats> {
    const includeDexes = options.includeDexes || [];
    const dexes = includeDexes.length > 0 ? includeDexes.join(",") : "";
    const jitoTipLamports = options.jitoTipLamports || 0.0001 * 1e9;

    this.log("Starting makers...");

    const stats: MakerStats = {
      makersCompleted: 0,
      makersRemaining: totalMakersRequired,
      bundleCount: 0,
      latestBundleId: null,
      finished: false,
    };

    while (stats.makersCompleted < totalMakersRequired) {
      try {
        // Refresh blockhash if needed
        if (
          !this.blockhash ||
          stats.bundleCount - this.lastBlockhashRefresh >= 10
        ) {
          const latestBlockhash = await this.connection.getLatestBlockhash(
            "finalized"
          );
          this.blockhash = latestBlockhash.blockhash;
          this.lastBlockhashRefresh = stats.bundleCount;
        }

        const signers = Array.from({ length: 4 }, () => Keypair.generate());
        const fundTx = this.createFundTx(
          signers,
          jitoTipLamports,
          this.blockhash
        );

        const swapTxs = await Promise.all(
          signers.map((signer) =>
            this.swapMakers(
              "buy",
              mint,
              signer,
              this.blockhash as string,
              dexes
            )
          )
        );

        const serializedTxs = [
          bs58.encode(fundTx.serialize()),
          ...swapTxs.map((tx) => bs58.encode(tx.serialize())),
        ];

        const bundleResponse = await sendBundle(
          serializedTxs,
          getRandomJitoUrl()
        );

        if (bundleResponse && bundleResponse.result) {
          stats.bundleCount++;
          stats.latestBundleId = bundleResponse.result;
          stats.makersCompleted += signers.length;
          stats.makersRemaining = totalMakersRequired - stats.makersCompleted;
          const currentSolBalance = await this.getSolBalance();

          this.log(
            `Bundle #${stats.bundleCount} sent. Makers completed: ${
              stats.makersCompleted
            }/${totalMakersRequired}. SOL Balance: ${currentSolBalance.toFixed(
              4
            )}`
          );
        }
      } catch (error) {
        this.log("Error in makers:", error);
        await this.wait(5000);
      }
    }

    stats.finished = true;
    return stats;
  }

  /**
   * Generates trading volume for a token.
   * @param mint - Token mint public key.
   * @param minSolPerSwap - Minimum SOL per swap.
   * @param maxSolPerSwap - Maximum SOL per swap.
   * @param mCapFactor - Market cap factor to control price impact.
   * @param speedFactor - Speed factor to control trading frequency.
   * @param options - Optional configuration parameters.
   */
  public async volume(
    mint: PublicKey,
    minSolPerSwap: number,
    maxSolPerSwap: number,
    mCapFactor: number,
    speedFactor: number = 1,
    options: VolumeOptions = {}
  ): Promise<void> {
    const includeDexes = options.includeDexes || [];
    const dexes = includeDexes.length > 0 ? includeDexes.join(",") : "";
    const jitoTipLamports = options.jitoTipLamports || 0.001 * 1e9;

    this.log("Starting volume generation...");

    let totalNetVolume = 0;
    let totalRealVolume = 0;
    let tradesUntilNextSell = Math.floor(Math.random() * 3) + 1;
    const startTime = Date.now();
    let tradeCount = 0;

    while (true) {
      try {
        if (
          !this.blockhash ||
          Date.now() - this.lastBlockhashRefresh >= 60_000
        ) {
          const latestBlockhash = await this.connection.getLatestBlockhash(
            "finalized"
          );
          this.blockhash = latestBlockhash.blockhash;
          this.lastBlockhashRefresh = Date.now();
        }

        const signer = Keypair.generate();

        const shouldSell =
          (tradesUntilNextSell <= 0 || Math.random() < 0.3) &&
          totalNetVolume > 0;
        const direction: Direction = shouldSell ? "sell" : "buy";
        let amount: number;

        if (shouldSell) {
          const maxSellPercentage = 1 / mCapFactor;
          const sellPercentage = 0.5 + Math.random() * 0.5 * maxSellPercentage;
          amount = Math.floor(totalNetVolume * sellPercentage * 1e9);
          tradesUntilNextSell = Math.floor(Math.random() * 3) + 1;
        } else {
          amount = Math.floor(
            (Math.random() * (maxSolPerSwap - minSolPerSwap) + minSolPerSwap) *
              1e9
          );
          tradesUntilNextSell--;
        }

        const fundTx = this.createFundSingleTx(
          signer,
          jitoTipLamports,
          this.blockhash
        );

        const swapTx = await this.swapVolume(
          direction,
          mint,
          amount,
          this.blockhash,
          signer,
          dexes
        );

        const serializedTxs = [
          bs58.encode(fundTx.serialize()),
          bs58.encode(swapTx.serialize()),
        ];

        const bundleResponse = await sendBundle(
          serializedTxs,
          getRandomJitoUrl()
        );

        if (bundleResponse && bundleResponse.result) {
          const solAmount = amount / 1e9;
          tradeCount++;
          if (direction === "buy") {
            totalNetVolume += solAmount;
          } else {
            totalNetVolume -= solAmount;
          }
          totalRealVolume += solAmount;

          const runTime = ((Date.now() - startTime) / (1000 * 60)).toFixed(1);
          const currentSolBalance = await this.getSolBalance();
          this.log(
            `Trade #${tradeCount}: ${direction.toUpperCase()} ${solAmount.toFixed(
              4
            )} SOL. Net Volume: ${totalNetVolume.toFixed(
              4
            )} SOL. SOL Balance: ${currentSolBalance.toFixed(
              4
            )}. Runtime: ${runTime} minutes.`
          );
        }

        const baseDelay = 5000 + Math.random() * 10000;
        const adjustedDelay = baseDelay / speedFactor;
        await this.wait(adjustedDelay);
      } catch (error) {
        this.log("Error during volume generation:", error);
        await this.wait(5000);
      }
    }
  }

  /**
   * Executes a single swap.
   * @param mint - Token mint public key.
   * @param direction - Swap direction ("buy" or "sell").
   * @param amount - Amount to swap in SOL.
   * @param options - Optional configuration parameters.
   * @returns A Promise resolving when the swap is complete.
   */
  public async swap(
    mint: PublicKey,
    direction: Direction,
    amount: number,
    options: SwapOptions = {}
  ): Promise<void> {
    const signer = Keypair.generate();
    if (!this.blockhash) {
      await this.initializeBlockhash();
    }
    const jitoTipLamports = options.jitoTipLamports || 0.001 * 1e9;
    const dexes = options.includeDexes?.join(",") || "";

    try {
      const fundTx = this.createFundSingleTx(
        signer,
        jitoTipLamports,
        this.blockhash
      );
      const swapTx = await this.swapVolume(
        direction,
        mint,
        amount * 1e9,
        this.blockhash,
        signer,
        dexes
      );
      const serializedTxs = [
        bs58.encode(fundTx.serialize()),
        bs58.encode(swapTx.serialize()),
      ];
      const bundleResponse = await sendBundle(
        serializedTxs,
        getRandomJitoUrl()
      );

      if (bundleResponse && bundleResponse.result) {
        this.log(`Swap successful. Bundle ID: ${bundleResponse.result}`);
      } else {
        throw new Error(
          "Swap failed: " + (bundleResponse.error || "Unknown error")
        );
      }
    } catch (error) {
      this.log("Error during swap:", error);
      throw error;
    }
  }

  /**
   * Gets the token balance for the payer account.
   * @param mint - Token mint public key.
   * @returns A Promise resolving to the token balance.
   */
  public async getTokenBalance(mint: PublicKey): Promise<number> {
    try {
      const ata = getOwnerAta(mint, this.payer.publicKey);
      const balanceInfo = await this.connection.getTokenAccountBalance(ata);
      return (
        Number(balanceInfo.value.amount) / 10 ** balanceInfo.value.decimals
      );
    } catch (error) {
      this.log("Error getting token balance:", error);
      return 0;
    }
  }

  /**
   * Gets the SOL balance for the payer account.
   * @returns A Promise resolving to the SOL balance.
   */
  public async getSolBalance(): Promise<number> {
    try {
      const lamports = await this.connection.getBalance(this.payer.publicKey);
      return lamports / 1e9;
    } catch (error) {
      this.log("Error getting SOL balance:", error);
      return 0;
    }
  }

  /**
   * Internal logging method.
   * @param args - Arguments to log.
   */
  private log(...args: any[]): void {
    if (!this.disableLogs) {
      const timestamp = new Date().toISOString();
      console.log(`[${timestamp}]`, ...args);
    }
  }

  /**
   * Waits for a specified number of milliseconds.
   * @param ms - Milliseconds to wait.
   * @returns A Promise that resolves after the specified time.
   */
  private async wait(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Swaps tokens for the makers method.
   * @param direction - Swap direction ("buy" or "sell").
   * @param mint - Token mint public key.
   * @param signer - Keypair of the signer.
   * @param blockhash - The recent blockhash.
   * @param dexes - Comma-separated list of DEXes to include.
   * @returns A Promise resolving to a VersionedTransaction.
   */
  private async swapMakers(
    direction: Direction,
    mint: PublicKey,
    signer: Keypair,
    blockhash: string,
    dexes: string
  ): Promise<VersionedTransaction> {
    // For maker orders, we use a minimal amount
    const amount = 1; // Amount in smallest units (e.g., lamports)

    // Determine swap mode and input/output mints based on direction
    const swapMode = direction === "buy" ? "ExactOut" : "ExactIn";
    const inputMint =
      direction === "buy" ? WSOL_MINT.toBase58() : mint.toBase58();
    const outputMint =
      direction === "buy" ? mint.toBase58() : WSOL_MINT.toBase58();

    // Construct the Jupiter quote API URL
    const apiUrl = `https://quote-api.jup.ag/v4/quote?inputMint=${inputMint}&outputMint=${outputMint}&amount=${amount}&swapMode=${swapMode}&onlyDirectRoutes=true&maxSlippageBps=100&minLiquidity=0&dexes=${dexes}`;

    // Fetch the quote from Jupiter
    const response = await fetch(apiUrl);
    const data = await response.json();

    if (!data.data || data.data.length === 0) {
      throw new Error("No routes found for the swap.");
    }

    const route = data.data[0];

    // Prepare the swap request
    const swapRequest = {
      route,
      userPublicKey: signer.publicKey.toBase58(),
      wrapUnwrapSOL: false,
      feeAccount: FEE_ACCOUNT_1.toBase58(),
      asLegacyTransaction: false,
    };

    // Get the swap transaction from Jupiter
    const swapResponse = await fetch("https://quote-api.jup.ag/v4/swap", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(swapRequest),
    });

    const swapData = await swapResponse.json();

    if (!swapData.swapTransaction) {
      throw new Error("Failed to get swap transaction from Jupiter.");
    }

    // Deserialize the transaction
    const swapTransaction = VersionedTransaction.deserialize(
      Buffer.from(swapData.swapTransaction, "base64")
    );

    // Update the recent blockhash
    swapTransaction.message.recentBlockhash = blockhash;

    // Sign the transaction
    swapTransaction.sign([signer]);

    return swapTransaction;
  }

  /**
   * Swaps tokens for the volume method.
   * @param direction - Swap direction ("buy" or "sell").
   * @param mint - Token mint public key.
   * @param amount - Amount to swap in lamports.
   * @param blockhash - The recent blockhash.
   * @param signer - Keypair of the signer.
   * @param dexes - Comma-separated list of DEXes to include.
   * @returns A Promise resolving to a VersionedTransaction.
   */
  private async swapVolume(
    direction: Direction,
    mint: PublicKey,
    amount: number,
    blockhash: string,
    signer: Keypair,
    dexes: string
  ): Promise<VersionedTransaction> {
    // Determine swap mode and input/output mints based on direction
    const swapMode = direction === "buy" ? "ExactIn" : "ExactOut";
    const inputMint =
      direction === "buy" ? WSOL_MINT.toBase58() : mint.toBase58();
    const outputMint =
      direction === "buy" ? mint.toBase58() : WSOL_MINT.toBase58();

    // Construct the Jupiter quote API URL
    const apiUrl = `https://quote-api.jup.ag/v4/quote?inputMint=${inputMint}&outputMint=${outputMint}&amount=${amount}&swapMode=${swapMode}&slippageBps=100&onlyDirectRoutes=true&maxSlippageBps=100&minLiquidity=0&dexes=${dexes}`;

    // Fetch the quote from Jupiter
    const response = await fetch(apiUrl);
    const data = await response.json();

    if (!data.data || data.data.length === 0) {
      throw new Error("No routes found for the swap.");
    }

    const route = data.data[0];

    // Prepare the swap request
    const swapRequest = {
      route,
      userPublicKey: signer.publicKey.toBase58(),
      wrapUnwrapSOL: false,
      feeAccount: FEE_ACCOUNT_1.toBase58(),
      asLegacyTransaction: false,
    };

    // Get the swap transaction from Jupiter
    const swapResponse = await fetch("https://quote-api.jup.ag/v4/swap", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(swapRequest),
    });

    const swapData = await swapResponse.json();

    if (!swapData.swapTransaction) {
      throw new Error("Failed to get swap transaction from Jupiter.");
    }

    // Deserialize the transaction
    const swapTransaction = VersionedTransaction.deserialize(
      Buffer.from(swapData.swapTransaction, "base64")
    );

    // Update the recent blockhash
    swapTransaction.message.recentBlockhash = blockhash;

    // Sign the transaction
    swapTransaction.sign([signer]);

    return swapTransaction;
  }
}
