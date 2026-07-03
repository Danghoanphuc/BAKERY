import { NextResponse } from "next/server";
import {
  deleteMarketingCampaign,
  updateMarketingCampaign,
} from "@/lib/firebase";

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const data = await request.json();
    await updateMarketingCampaign(id, data);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error updating marketing campaign:", error);
    return NextResponse.json(
      { error: "Failed to update marketing campaign" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    await deleteMarketingCampaign(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error deleting marketing campaign:", error);
    return NextResponse.json(
      { error: "Failed to delete marketing campaign" },
      { status: 500 },
    );
  }
}
