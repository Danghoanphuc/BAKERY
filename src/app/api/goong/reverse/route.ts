import { NextResponse } from "next/server";
import { reverseGeocodeGoong } from "@/lib/goong";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const lat = Number(searchParams.get("lat"));
    const lng = Number(searchParams.get("lng"));

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return NextResponse.json({ error: "Tọa độ không hợp lệ." }, { status: 400 });
    }

    const result = await reverseGeocodeGoong(lat, lng);
    return NextResponse.json({ result });
  } catch (error) {
    console.error("Goong reverse geocode failed:", error);
    return NextResponse.json(
      { error: "Không thể lấy địa chỉ từ vị trí." },
      { status: 500 },
    );
  }
}
