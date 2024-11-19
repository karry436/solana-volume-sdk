# Solana Volume SDK

[![npm version](https://img.shields.io/npm/v/@oselezi/solana-volume-sdk.svg)](https://www.npmjs.com/package/@oselezi/solana-volume-sdk)
[![license](https://img.shields.io/npm/l/@oselezi/solana-volume-sdk.svg)](https://github.com/oselezi/solana-volume-sdk/blob/main/LICENSE)

A powerful and easy-to-use SDK for generating trading volume and market making on the Solana blockchain.

## Table of Contents

- [Introduction](#introduction)
- [Features](#features)
- [Installation](#installation)
- [Usage](#usage)
  - [Setup](#setup)
  - [Generate Volume](#generate-volume)
  - [Create Makers](#create-makers)
  - [Execute a Single Swap](#execute-a-single-swap)
- [API Reference](#api-reference)
  - [Class: Amm](#class-amm)
    - [Constructor](#constructor)
    - [Methods](#methods)
- [Examples](#examples)
- [Contributing](#contributing)
- [License](#license)

## Introduction

The Solana Volume SDK allows developers to easily interact with the Solana blockchain to generate trading volume, create market maker orders, and perform swaps. It leverages the power of the Solana ecosystem and integrates with popular decentralized exchanges (DEXes) and services like Jupiter and Jito for MEV protection.

## Features

- 🚀 **Easy to Use**: Simple and intuitive API for interacting with the Solana blockchain.
- 📈 **Volume Generation**: Generate trading volume for a given token to simulate market activity.
- ⚡ **MEV Protection**: Integrates with Jito for transaction bundling and MEV protection.
- 🔧 **DEX Integration**: Supports multiple DEXes and allows you to specify which ones to include.
- 💰 **Market Making**: Create multiple maker orders to provide liquidity.
- 🛠️ **TypeScript Support**: Fully typed for better developer experience and code safety.

## Installation

Install the SDK via npm:

```bash
npm install @oselezi/solana-volume-sdk
```

Or using yarn:

```bash
yarn add @oselezi/solana-volume-sdk
```

## Usage

### Setup

```typescript
import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { Amm } from '@oselezi/solana-volume-sdk';

// Initialize Solana connection
const connection = new Connection('https://api.mainnet-beta.solana.com');

// Load your payer wallet (ensure you handle private keys securely)
const payerSecretKey = Uint8Array.from([/* Your Secret Key Array */]);
const payerWallet = Keypair.fromSecretKey(payerSecretKey);

// Specify the token mint address
const mint = new PublicKey('YourTokenMintAddress');

// Create an instance of the Amm class
const amm = new Amm(connection, payerWallet, { disableLogs: false });
```

### Generate Volume

```typescript
// Volume generation parameters
const minSolPerSwap = 0.001; // Minimum SOL per swap
const maxSolPerSwap = 0.002; // Maximum SOL per swap
const mCapFactor = 1;        // Market cap factor
const speedFactor = 1;       // Speed factor (1 is normal speed)

// Start volume generation
amm.volume(
  mint,
  minSolPerSwap,
  maxSolPerSwap,
  mCapFactor,
  speedFactor,
  {
    includeDexes: ['Raydium', 'Orca', 'Whirlpool'], // Optional: specify DEXes
    jitoTipLamports: 100_000,                      // Optional: tip amount for Jito in lamports
  }
).catch(console.error);
```

### Create Makers

```typescript
// Number of maker orders to create
const totalMakersRequired = 5000;

// Start creating makers
amm.makers(
  mint,
  totalMakersRequired,
  {
    includeDexes: ['Raydium', 'Orca', 'Whirlpool'], // Optional: specify DEXes
    jitoTipLamports: 100_000,                      // Optional: tip amount for Jito in lamports
  }
).then((stats) => {
  console.log('Maker stats:', stats);
}).catch(console.error);
```

### Execute a Single Swap

```typescript
// Swap parameters
const direction: 'buy' | 'sell' = 'buy';
const amount = 0.5; // Amount in SOL

// Execute the swap
amm.swap(
  mint,
  direction,
  amount,
  {
    jitoTipLamports: 100_000, // Optional: tip amount for Jito in lamports
  }
).catch(console.error);
```

## API Reference

### Class: `Amm`

#### Constructor

```typescript
constructor(connection: Connection, payerKeypair: Keypair, options?: AmmOptions)
```

- **Parameters:**
  - `connection`: `Connection` - Solana RPC connection.
  - `payerKeypair`: `Keypair` - Keypair for the payer account.
  - `options`: `AmmOptions` (optional)
    - `disableLogs`: `boolean` - If `true`, disables logging output.

#### Methods

- `volume(mint: PublicKey, minSolPerSwap: number, maxSolPerSwap: number, mCapFactor: number, speedFactor?: number, options?: VolumeOptions): Promise<void>`

  Generates trading volume for a token.

- `makers(mint: PublicKey, totalMakersRequired: number, options?: MakerOptions): Promise<MakerStats>`

  Executes maker orders for a token.

- `swap(mint: PublicKey, direction: 'buy' | 'sell', amount: number, options?: SwapOptions): Promise<void>`

  Executes a single swap.

- `getTokenBalance(mint: PublicKey): Promise<number>`

  Gets the token balance for the payer account.

- `getSolBalance(): Promise<number>`

  Gets the SOL balance for the payer account.

## Examples

You can find more examples in the [`examples`](https://github.com/oselezi/solana-volume-sdk/tree/main/examples) directory of the repository.

## Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository.
2. Create a new branch: `git checkout -b feature/my-feature`
3. Commit your changes: `git commit -am 'Add my feature'`
4. Push to the branch: `git push origin feature/my-feature`
5. Submit a pull request.

Please make sure to follow the coding style guidelines and include appropriate tests.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

### Disclaimer

This SDK is provided as-is, without warranty of any kind. Use it at your own risk. Ensure you understand the implications of interacting with the Solana blockchain and handle private keys securely.

---

If you have any questions or need further assistance, feel free to open an issue on the [GitHub repository](https://github.com/oselezi/solana-volume-sdk/issues) or contact me directly.
---

**Note:** Replace placeholders like `YourTokenMintAddress` and `/* Your Secret Key Array */` with actual values specific to your setup.

---

### Acknowledgments

- [Solana Labs](https://solana.com/) for providing the ecosystem.
- [Jupiter Aggregator](https://jup.ag/) for liquidity aggregation.
- [Jito Labs](https://jito.wtf/) for MEV protection services.

---

### Contact

- **Author:** Osman Elezi
- **Email:** [Osman Elezi](mailto:osman.elezi.19@gmail.com)
- **GitHub:** [@oselezi](https://github.com/oselezi)