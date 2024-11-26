import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import base58 from 'bs58';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const SDK = require('@oselezi/solana-volume-sdk');
console.log('SDK Exports:', SDK);

const { AMM } = SDK;

// Initialize Solana connection
const connection = new Connection('https://api.mainnet-beta.solana.com');

// Your private key and mint address
const privateKeyBase58 = 'YOUR_PRIVATE_KEY';
const payerSecretKey = base58.decode(privateKeyBase58);
const payerWallet = Keypair.fromSecretKey(payerSecretKey);
const mint = new PublicKey('YOUR_TOKEN_MINT');

// Create an instance of the AMM class
const amm = new AMM(connection, payerWallet, { disableLogs: false });
