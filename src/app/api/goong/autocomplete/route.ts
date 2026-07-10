import { NextResponse } from "next/server";
import { autocompleteGoongPlaces } from "@/lib/goong";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const input = searchParams.get("input")?.trim() ?? "";

    if (input.length < 2) {
      return NextResponse.json({ predictions: [] });
    }

    const predictions = await autocompleteGoongPlaces({
      input,
      location: searchParams.get("location") ?? undefined,
      sessionToken: searchParams.get("sessionToken") ?? undefined,
    });

    return NextResponse.json({ predictions });
  } catch (error) {
    console.error("Goong autocomplete failed:", error);
    return NextResponse.json(
      { error: "Không thể tìm địa chỉ." },
      { status: 500 },
    );
  }
}
