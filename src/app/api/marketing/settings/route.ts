import { NextResponse } from "next/server";
import { updateMarketingSettings } from "@/lib/firebase";

export async function PUT(request: Request) {
  try {
    const data = await request.json();
    const settings = await updateMarketingSettings(data);
    return NextResponse.json(settings);
  } catch (error) {
    console.error("Error updating marketing settings:", error);
    return NextResponse.json(
      { error: "Failed to update marketing settings" },
      { status: 500 },
    );
  }
}
