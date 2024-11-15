import {
  PublicKey,
  TransactionInstruction,
  VersionedTransaction,
  TransactionMessage,
  AddressLookupTableAccount,
  Connection,
  Keypair,
} from "@solana/web3.js";
import * as splToken from "@solana/spl-token";
import fetch from "node-fetch";
import { BN } from "bn.js";

import { JITO_ACCOUNTS, JITO_URLS, JUPITER_PROGRAM_ID } from "./constants";

/**
 * Selects a random Jito account from the list.
 * @returns A `PublicKey` representing the selected Jito account.
 */
export const getRandomJitoAccount = (): PublicKey => {
  const index = Math.floor(Math.random() * JITO_ACCOUNTS.length);
  return JITO_ACCOUNTS[index];
};

/**
 * Selects a random Jito URL from the list.
 * @returns A string representing the selected Jito URL.
 */
export const getRandomJitoUrl = (): string => {
  const index = Math.floor(Math.random() * JITO_URLS.length);
  return JITO_URLS[index];
};

/**
 * Sends a bundle of transactions to a Jito endpoint.
 * @param bundled - An array of base58-encoded transactions.
 * @param url - The Jito endpoint URL.
 * @returns A `Promise` resolving to the response.
 */
export async function sendBundle(bundled: string[], url: string): Promise<any> {
  const data = {
    jsonrpc: "2.0",
    id: 1,
    method: "sendBundle",
    params: [bundled],
  };
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return res.json();
}

/**
 * Computes the associated token address (ATA) for a given mint and owner.
 * @param mint - The token mint address.
 * @param owner - The owner's public key.
 * @returns The associated token address as a `PublicKey`.
 */
export function getOwnerAta(mint: PublicKey, owner: PublicKey): PublicKey {
  const [ata] = PublicKey.findProgramAddressSync(
    [owner.toBuffer(), splToken.TOKEN_PROGRAM_ID.toBuffer(), mint.toBuffer()],
    splToken.ASSOCIATED_TOKEN_PROGRAM_ID
  );
  return ata;
}

/**
 * Retrieves address lookup tables from the Solana network.
 * @param tables - An array of address lookup table addresses.
 * @param connection - The Solana connection object.
 * @returns A `Promise` resolving to an array of `AddressLookupTableAccount` objects.
 */
export async function getLookupTables(
  tables: string[],
  connection: Connection
): Promise<AddressLookupTableAccount[]> {
  const lookupTables: AddressLookupTableAccount[] = [];
  if (!tables || tables.length === 0) {
    return lookupTables;
  }
  for (const table of tables) {
    const lookupTable = await connection.getAddressLookupTable(
      new PublicKey(table)
    );
    if (lookupTable.value) {
      lookupTables.push(lookupTable.value);
    }
  }
  return lookupTables;
}

/**
 * Parses a raw swap instruction from Jupiter into a `TransactionInstruction`.
 * @param rawSwap - The raw swap instruction data.
 * @returns A `Promise` resolving to a `TransactionInstruction` object.
 */
export async function parseSwap(rawSwap: any): Promise<TransactionInstruction> {
  const accountMetas = rawSwap.accounts.map((account: any) => ({
    pubkey: new PublicKey(account.pubkey),
    isSigner: account.isSigner,
    isWritable: account.isWritable,
  }));

  const ixData = Buffer.from(rawSwap.data, "base64");
  const programId = new PublicKey(rawSwap.programId);

  const swapIx = new TransactionInstruction({
    keys: accountMetas,
    programId,
    data: ixData,
  });
  return swapIx;
}

/**
 * Creates a `VersionedTransaction` with only the main signer.
 * @param ixs - An array of `TransactionInstruction`s.
 * @param wallet - The main signer's `Keypair`.
 * @param blockhash - The recent blockhash.
 * @returns A `VersionedTransaction` object.
 */
export function createVtxWithOnlyMainSigner(
  ixs: TransactionInstruction[],
  wallet: Keypair,
  blockhash: string
): VersionedTransaction {
  if (!blockhash || typeof blockhash !== "string") {
    throw new Error(
      "Invalid blockhash provided to createVtxWithOnlyMainSigner"
    );
  }

  const msg = new TransactionMessage({
    payerKey: wallet.publicKey,
    instructions: ixs,
    recentBlockhash: blockhash,
  }).compileToV0Message([]);

  const vTx = new VersionedTransaction(msg);
  vTx.sign([wallet]);
  return vTx;
}

/**
 * Creates a `VersionedTransaction` with multiple signers and lookup tables.
 * @param ixs - An array of `TransactionInstruction`s.
 * @param wallets - An array of `Keypair`s for signing.
 * @param tables - An array of `AddressLookupTableAccount`s.
 * @param blockhash - The recent blockhash.
 * @returns A `VersionedTransaction` object.
 */
export function createVtx(
  ixs: TransactionInstruction[],
  wallets: Keypair[],
  tables: AddressLookupTableAccount[],
  blockhash: string
): VersionedTransaction {
  const msg = new TransactionMessage({
    payerKey: wallets[0].publicKey,
    instructions: ixs,
    recentBlockhash: blockhash,
  }).compileToV0Message(tables);

  const vTx = new VersionedTransaction(msg);
  vTx.sign(wallets);
  return vTx;
}
