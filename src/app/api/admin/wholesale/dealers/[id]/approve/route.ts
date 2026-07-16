import { NextResponse } from "next/server";
import { getFirestore, doc, getDoc, updateDoc, Timestamp } from "firebase/firestore";
import { requireAdmin } from "@/lib/auth/require-admin";

const db = getFirestore();

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const unauthorized = requireAdmin(request);
  if (unauthorized) return unauthorized;
  const { id } = await params;

  try {
    const body = await request.json();
    const { approved, rejectionReason, tier } = body;

    const dealerRef = doc(db, "dealers", id);
    const dealerSnap = await getDoc(dealerRef);

    if (!dealerSnap.exists()) {
      return NextResponse.json(
        { error: "Dealer not found" },
        { status: 404 }
      );
    }

    const updateData: any = {
      updatedAt: Timestamp.now(),
    };

    if (approved) {
      updateData.status = "approved";
      updateData.approvedAt = Timestamp.now();
      updateData.approvedBy = "admin"; // TODO: Get actual admin ID from session
      updateData.rejectionReason = null;
      if (tier) {
        updateData.tier = tier;
        // Set discount based on tier
        if (tier === "gold") updateData.discountPercent = 3;
        else if (tier === "platinum") updateData.discountPercent = 5;
        else updateData.discountPercent = 0;
      }
    } else {
      updateData.status = "rejected";
      updateData.rejectionReason = rejectionReason || "Không được phê duyệt";
      updateData.approvedAt = null;
      updateData.approvedBy = null;
    }

    await updateDoc(dealerRef, updateData);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error approving dealer:", error);
    return NextResponse.json(
      { error: "Failed to approve dealer" },
      { status: 500 }
    );
  }
}
