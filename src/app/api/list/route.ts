import { connection } from "@/utils/connection";
import { retrieveDASAssetFields } from "@/utils/tensor-api";
import { ActionGetResponse, ActionPostResponse } from "@solana/actions";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const payload: ActionGetResponse = {
    icon: "https://ozww27zcrtofmfkf2x7syaiooqkjwyouijf55gdlj3qgvm6k7uea.arweave.net/dm1tfyKM3FYVRdX_LAEOdBSbYdRCS96Ya07garPK_Qg?ext=png",
    label: "List NFT",
    title: "List NFT",
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
  return NextResponse.json(payload);
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
      }
    );
  }

  const payload: ActionPostResponse = {
    transaction: serializedTx,
  };

  return NextResponse.json(payload);
}
