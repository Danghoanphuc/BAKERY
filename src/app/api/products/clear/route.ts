import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function DELETE(_request: Request) {
  try {
    console.log("Deleting all products...");
    const result = await prisma.product.deleteMany({});
    console.log(`Deleted ${result.count} products!`);
    return NextResponse.json({ success: true, deletedCount: result.count });
  } catch (error) {
    console.error("Error deleting all products:", error);
    return NextResponse.json({ error: "Failed to delete all products" }, { status: 500 });
  }
}
