import { NextResponse } from "next/server";
import { getGoongPlaceDetail } from "@/lib/goong";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const placeId = searchParams.get("placeId");

    if (!placeId) {
      return NextResponse.json({ error: "Thiếu mã địa điểm." }, { status: 400 });
    }

    const result = await getGoongPlaceDetail({
      placeId,
      sessionToken: searchParams.get("sessionToken") ?? undefined,
    });

    return NextResponse.json({ result });
  } catch (error) {
    console.error("Goong place detail failed:", error);
    return NextResponse.json(
      { error: "Không thể lấy chi tiết địa chỉ." },
      { status: 500 },
    );
  }
}
