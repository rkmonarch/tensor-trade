import { Connection } from "@solana/web3.js";

export const connection = new Connection(
  `https://mainnet.helius-rpc.com/?api-key=${process.env.NEXT_PUBLIC_HELIUS_KEY}`
);
