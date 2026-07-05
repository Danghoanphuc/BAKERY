import { NextResponse } from "next/server";
import { getPublicVouchers } from "@/lib/vouchers";

export async function GET() {
  return NextResponse.json({
    vouchers: getPublicVouchers(),
  });
}
