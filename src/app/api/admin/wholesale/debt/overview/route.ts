import { NextResponse } from "next/server";
import { getFirestore, collection, getDocs } from "firebase/firestore";
import { requireAdmin } from "@/lib/auth/require-admin";

const db = getFirestore();

export async function GET(request: Request) {
  const unauthorized = requireAdmin(request);
  if (unauthorized) return unauthorized;

  try {
    const dealersRef = collection(db, "dealers");
    const snapshot = await getDocs(dealersRef);
    
    let totalDebt = 0;
    let totalCreditLimit = 0;
    let overdueCount = 0;
    let warningCount = 0;
    let currentCount = 0;
    let blockedCount = 0;

    snapshot.forEach((doc) => {
      const data = doc.data();
      const currentDebt = data.currentDebt || 0;
      const creditLimit = data.creditLimit || 0;
      const debtRatio = creditLimit > 0 ? (currentDebt / creditLimit) * 100 : 0;

      totalDebt += currentDebt;
      totalCreditLimit += creditLimit;

      if (debtRatio >= 100) {
        blockedCount++;
      } else if (debtRatio >= 80) {
        warningCount++;
      } else {
        currentCount++;
      }
    });

    return NextResponse.json({
      totalDebt,
      totalCreditLimit,
      debtRatio: totalCreditLimit > 0 ? (totalDebt / totalCreditLimit) * 100 : 0,
      overdueCount,
      warningCount,
      currentCount,
      blockedCount,
      totalDealers: snapshot.size,
    });
  } catch (error) {
    console.error("Error fetching debt overview:", error);
    return NextResponse.json(
      { error: "Failed to fetch debt overview" },
      { status: 500 }
    );
  }
}
