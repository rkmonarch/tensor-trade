import {
  findCollectionBySlug,
  getListingsByCollection,
} from "@/utils/tensor-api";
import {
  createBuyNftTransaction,
  formatTokenAmount,
  getTotalPrice,
} from "../../../utils/transactions-utils";
import { ActionGetResponse } from "@solana/actions";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const collection = req.nextUrl.searchParams.get("collection");
  // const collectionSlug = c.req.param("collectionSlug");
  const collectiond = await findCollectionBySlug(collection as string);
  if (!collectiond) {
    return NextResponse.json(
      {
        message: `Collection ${collection} not found`,
      },
      {
        status: 422,
      }
    );
  }
  console.log(collectiond);
  const buyNowPriceNetFees = collectiond.stats.buyNowPriceNetFees
    ? parseInt(collectiond.stats.buyNowPriceNetFees)
    : await getListingsByCollection(collectiond.collId).then((resp) =>
        getTotalPrice(
          parseInt(resp.mints[0].listing.price),
          collectiond.sellRoyaltyFeeBPS,
          resp.mints[0].listing.source
        )
      );
  const numListed = collectiond.stats.numListed;
  if (numListed < 1) {
    return NextResponse.json(
      {
        icon: collectiond?.imageUri,
        label: `Not Available`,
        title: `Buy Floor ${collectiond?.name}`,
        description: collectiond?.description,
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
  const uiPrice = formatTokenAmount(buyNowPriceNetFees / LAMPORTS_PER_SOL);
  return NextResponse.json({
    icon: collectiond.imageUri,
    label: `${uiPrice} SOL`,
    title: `Buy Floor ${collectiond.name}`,
    description: collectiond.description,
  } as ActionGetResponse);
}

export const OPTIONS = GET;

export async function POST(req: NextRequest) {
  const collection = req.nextUrl.searchParams.get("collection");
  try {
    const { account } = await req.json();
    const collectiond = await findCollectionBySlug(collection as string);
    if (!collectiond) {
      return NextResponse.json(
        {
          message: `Collection ${collection} not found`,
        },
        {
          status: 422,
        }
      );
    }
    const floorMint = (await getListingsByCollection(collectiond.collId))
      .mints[0];
    if (!floorMint) {
      return NextResponse.json(
        {
          message: `Collection has no listed NFTs`,
        },
        {
          status: 422,
        }
      );
    }

    const transaction = await createBuyNftTransaction(floorMint, account);

    if (!transaction) {
      throw new Error("Failed to create transaction");
    }

    return NextResponse.json({
      transaction: transaction,
    });
  } catch (e) {
    console.error(
      `Failed to prepare buy floor transaction for ${collection}`,
      e
    );
    return NextResponse.json(
      {
        message: `Failed to prepare transaction`,
      },
      {
        status: 500,
      }
    );
  }
}
