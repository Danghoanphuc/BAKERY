import { NextResponse } from "next/server";
import { isPayOSEnabled } from "@/lib/payos";

export async function GET() {
  return NextResponse.json({
    payosEnabled: isPayOSEnabled() });
}
