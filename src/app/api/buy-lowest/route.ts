import {
  findCollectionBySlug,
  getListingsByCollection,
} from "@/utils/tensor-api";
import {
  createBuyNftTransaction,
  formatTokenAmount,
} from "@/utils/transactions-utils";
import { ActionGetResponse, ActionPostResponse } from "@solana/actions";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const collectionName = req.nextUrl.searchParams.get("collection");
  const collection = await findCollectionBySlug(collectionName as string);

  if (!collection) {
    return NextResponse.json(
      {
        message: `Collection not found`,
      },
      {
        status: 422,
      }
    );
  }

  const numListed = collection.stats.numListed;
  if (numListed < 1) {
    return NextResponse.json(
      {
        icon: collection?.imageUri,
        label: `Not Available`,
        title: `Buy Floor ${collection?.name}`,
        description: collection?.description,
        disabled: true,
        error: {
          message: `Collection has no listed NFTs`,
        },
      },
      {
        status: 200,
      }
    );
  }

  const listings = await getListingsByCollection(collection?.collId as string);

  if (!listings || listings.mints.length === 0) {
    return NextResponse.json(
      {
        error: "No listings found for this collection",
      },
      {
        status: 404,
      }
    );
  }

  let lowestPrice = Number.MAX_SAFE_INTEGER;
  let lowestMint = null;

  for (let index = 0; index < listings.mints.length; index++) {
    const mint = listings.mints[index];
    const price = Number(mint.listing.price);
    if (price < lowestPrice) {
      lowestPrice = price;
      lowestMint = mint;
    }
  }

  if (!lowestMint) {
    return NextResponse.json(
      {
        error: "No lowest price mint found for this collection",
      },
      {
        status: 404,
      }
    );
  }

  const uiPrice = formatTokenAmount(lowestPrice / LAMPORTS_PER_SOL);
  return NextResponse.json({
    icon: collection.imageUri,
    label: `${uiPrice} SOL`,
    title: `Buy lowest listed ${collection.name}`,
    description: collection.description,
  } as ActionGetResponse);
}

export const OPTIONS = GET;

export async function POST(req: NextRequest) {
  const collectionName = req.nextUrl.searchParams.get("collection");
  const collection = await findCollectionBySlug(collectionName as string);
  const { account } = await req.json();

  if (!collection) {
    return NextResponse.json(
      {
        message: `Collection not found`,
      },
      {
        status: 422,
      }
    );
  }

  const listings = await getListingsByCollection(collection?.collId as string);

  if (!listings || listings.mints.length === 0) {
    return NextResponse.json(
      {
        error: "No listings found for this collection",
      },
      {
        status: 404,
      }
    );
  }

  let lowestPrice = Number.MAX_SAFE_INTEGER;
  let lowestMint = null;

  for (let index = 0; index < listings.mints.length; index++) {
    const mint = listings.mints[index];
    const price = Number(mint.listing.price);
    if (price < lowestPrice) {
      lowestPrice = price;
      lowestMint = mint;
    }
  }

  if (!lowestMint) {
    return NextResponse.json(
      {
        error: "No lowest price mint found for this collection",
      },
      {
        status: 404,
      }
    );
  }

  const tx = await createBuyNftTransaction(lowestMint, account);
  const payload: ActionPostResponse = {
    transaction: tx as string,
  };
  return NextResponse.json(payload);
}
