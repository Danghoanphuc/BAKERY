import { NextResponse } from "next/server";

import { getCategories, getProducts } from "@/lib/db";
import {
  buildProductFeedItem,
  getCategoryName,
} from "@/lib/product-publishing";

export async function GET() {
  try {
    const [products, categories] = await Promise.all([
      getProducts(),
      getCategories(),
    ]);
    const feed = products.map((product) =>
      buildProductFeedItem(product, getCategoryName(product, categories)),
    );

    return NextResponse.json({
      generated_at: new Date().toISOString(),
      currency: "VND",
      count: feed.length,
      products: feed,
    });
  } catch (error) {
    console.error("Error generating product feed:", error);
    return NextResponse.json(
      { error: "Failed to generate product feed" },
      { status: 500 },
    );
  }
}
