import { connection } from "@/utils/connection";
import { retrieveDASAssetFields } from "@/utils/tensor-api";
import {
  ACTIONS_CORS_HEADERS,
  ActionGetResponse,
  ActionPostResponse,
} from "@solana/actions";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const payload: ActionGetResponse = {
    icon: "https://lh3.googleusercontent.com/L6zpv_9BKC6IyG1ZAUJ9WxQUDgXHpVU4y6i6F5_Qa5GC85KzFGsAPtKjRQny-BynM6-8HJMSUrF8ARd0gxs9nbJDV8gZPyKo0ATh",
    label: "List NFT",
    title: "List Compressed NFTs on Tensor",
    description: "List your NFT on the tensor directly through the Blinks",
    links: {
      actions: [
        {
          href: "/api/list?mint={mint}&price={price}",
          label: "List NFT",
          parameters: [
            {
              name: "mint",
              label: "Mint Address",
              required: true,
            },
            {
              name: "price",
              label: "Price",
              required: true,
            },
          ],
        },
      ],
    },
  };
  return NextResponse.json(payload, {
    headers: ACTIONS_CORS_HEADERS,
    status: 200,
  });
}

export const OPTIONS = GET;

async function simulateTransaction(serializedTx: string): Promise<boolean> {
  const blockhash = await connection.getLatestBlockhash();

  const response = await fetch("https://api.mainnet-beta.solana.com", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "simulateTransaction",
      params: [
        serializedTx,
        {
          encoding: "base64",
          commitment: "confirmed",
          blockhash: blockhash,
        },
      ],
    }),
  });

  const simulation = await response.json();
  if (simulation.result.value.err !== null) {
    return false;
  }

  return true;
}

export async function POST(req: NextRequest) {
  const mint = req.nextUrl.searchParams.get("mint");
  const asset = await retrieveDASAssetFields(mint as string);
  const { account } = await req.json();

  const operation = "TcompListTx";
  const query = `
      query TcompListTx($mint: String!, $owner: String!, $price: Decimal!) {
        tcompListTx(mint: $mint, owner: $owner, price: $price) {
          txs {
            lastValidBlockHeight
            tx
            txV0 # If this is present, use this!
          }
        }
      }
    `;
  const variables = {
    mint: mint,
    owner: account,
    price: req.nextUrl.searchParams.get("price"),
  };

  const tx = await fetch("https://tensor.xnfts.dev/", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      operationName: operation,
      query: query,
      variables: variables,
    }),
  }).then((res) => res.json());
  if (!asset) {
    return NextResponse.json(
      {
        message: `Asset ${mint} not found`,
      },
      {
        status: 422,
        headers: ACTIONS_CORS_HEADERS,
      }
    );
  }

  if (!tx) {
    return NextResponse.json(
      {
        message: `Transaction failed`,
      },
      {
        status: 422,
        headers: ACTIONS_CORS_HEADERS,
      }
    );
  }

  const serializedTx = Buffer.from(tx.data.tcompListTx.txs[0].tx).toString(
    "base64"
  );

  const isSimulated = await simulateTransaction(serializedTx);
  if (!isSimulated) {
    return NextResponse.json(
      {
        message: `Transaction simulation failed, you are not owner of the asset`,
      },
      {
        status: 422,
        headers: ACTIONS_CORS_HEADERS,
      }
    );
  }

  const payload: ActionPostResponse = {
    transaction: serializedTx,
  };

  return NextResponse.json(payload, {
    headers: ACTIONS_CORS_HEADERS,
    status: 200,
  });
}
