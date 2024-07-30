import { Connection } from "@solana/web3.js";

export const connection = new Connection(
  `https://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_KEY}`
);
