import { NextResponse } from "next/server";
import { collection, getDocs } from "firebase/firestore";
import { requireAdmin } from "@/lib/auth/require-admin";
import { db } from "@/lib/firebase/app";

export async function GET(request: Request) {
  const unauthorized = requireAdmin(request);
  if (unauthorized) return unauthorized;

  try {
    const dealersRef = collection(db, "dealers");
    const snapshot = await getDocs(dealersRef);
    
    const overdueDealers: any[] = [];

    snapshot.forEach((doc) => {
      const data = doc.data();
      const currentDebt = data.currentDebt || 0;
      const creditLimit = data.creditLimit || 0;
      const debtRatio = creditLimit > 0 ? (currentDebt / creditLimit) * 100 : 0;

      // Overdue: debt ratio >= 80%
      if (debtRatio >= 80) {
        overdueDealers.push({
          id: doc.id,
          name: data.name,
          phone: data.phone,
          address: data.address,
          district: data.district,
          city: data.city,
          currentDebt,
          creditLimit,
          debtRatio,
          status: debtRatio >= 100 ? "blocked" : "warning",
          tier: data.tier,
          paymentTerms: data.paymentTerms,
        });
      }
    });

    // Sort by debt ratio descending
    overdueDealers.sort((a, b) => b.debtRatio - a.debtRatio);

    return NextResponse.json(overdueDealers);
  } catch (error) {
    console.error("Error fetching overdue dealers:", error);
    return NextResponse.json(
      { error: "Failed to fetch overdue dealers" },
      { status: 500 }
    );
  }
}
