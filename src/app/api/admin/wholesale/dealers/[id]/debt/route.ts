import { NextResponse } from "next/server";
import { getFirestore, collection, getDocs, getDoc, query, where, orderBy, addDoc, doc, updateDoc, Timestamp } from "firebase/firestore";
import { requireAdmin } from "@/lib/auth/require-admin";

const db = getFirestore();

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const unauthorized = requireAdmin(request);
  if (unauthorized) return unauthorized;
  const { id } = await params;

  try {
    // Get debt records for this dealer
    const debtRecordsRef = collection(db, "debt_records");
    const q = query(
      debtRecordsRef,
      where("dealerId", "==", id),
      orderBy("createdAt", "desc")
    );
    const snapshot = await getDocs(q);

    const debtRecords = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        dealerId: data.dealerId,
        dealerName: data.dealerName,
        orderId: data.orderId,
        orderNumber: data.orderNumber,
        amount: data.amount,
        status: data.status,
        dueDate: data.dueDate?.toDate(),
        paymentTerms: data.paymentTerms,
        paidAmount: data.paidAmount || 0,
        remainingAmount: data.remainingAmount,
        paidAt: data.paidAt?.toDate(),
        overdueDays: data.overdueDays,
        notes: data.notes,
        createdAt: data.createdAt?.toDate(),
        updatedAt: data.updatedAt?.toDate(),
      };
    });

    // Get payment records for this dealer
    const paymentRecordsRef = collection(db, "payment_records");
    const qPayments = query(
      paymentRecordsRef,
      where("dealerId", "==", id),
      orderBy("createdAt", "desc")
    );
    const paymentSnapshot = await getDocs(qPayments);

    const paymentRecords = paymentSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        dealerId: data.dealerId,
        dealerName: data.dealerName,
        amount: data.amount,
        paymentMethod: data.paymentMethod,
        reference: data.reference,
        notes: data.notes,
        recordedBy: data.recordedBy,
        createdAt: data.createdAt?.toDate(),
      };
    });

    return NextResponse.json({
      debtRecords,
      paymentRecords,
    });
  } catch (error) {
    console.error("Error fetching dealer debt:", error);
    return NextResponse.json(
      { error: "Failed to fetch dealer debt" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const unauthorized = requireAdmin(request);
  if (unauthorized) return unauthorized;
  const { id } = await params;

  try {
    const body = await request.json();
    const { type, amount, paymentMethod, reference, notes, orderId, orderNumber } = body;

    if (type === "payment") {
      // Record a payment
      const paymentData = {
        dealerId: id,
        dealerName: body.dealerName,
        amount: amount,
        paymentMethod: paymentMethod || "cash",
        reference: reference || null,
        notes: notes || null,
        recordedBy: "admin", // TODO: Get actual admin ID
        createdAt: Timestamp.now(),
      };

      const paymentRef = await addDoc(collection(db, "payment_records"), paymentData);

      // Update dealer's current debt
      const dealerRef = doc(db, "dealers", id);
      const dealerSnap = await getDoc(dealerRef);
      if (dealerSnap.exists()) {
        const currentDebt = dealerSnap.data().currentDebt || 0;
        await updateDoc(dealerRef, {
          currentDebt: Math.max(0, currentDebt - amount),
          updatedAt: Timestamp.now(),
        });
      }

      return NextResponse.json({ id: paymentRef.id, ...paymentData }, { status: 201 });
    } else if (type === "debt") {
      // Record a new debt (from order)
      const debtData = {
        dealerId: id,
        dealerName: body.dealerName,
        orderId: orderId,
        orderNumber: orderNumber,
        amount: amount,
        status: "current",
        dueDate: body.dueDate ? Timestamp.fromDate(new Date(body.dueDate)) : Timestamp.now(),
        paymentTerms: body.paymentTerms || "cod",
        paidAmount: 0,
        remainingAmount: amount,
        paidAt: null,
        overdueDays: 0,
        notes: notes || null,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };

      const debtRef = await addDoc(collection(db, "debt_records"), debtData);

      // Update dealer's current debt
      const dealerRef = doc(db, "dealers", id);
      const dealerSnap = await getDoc(dealerRef);
      if (dealerSnap.exists()) {
        const currentDebt = dealerSnap.data().currentDebt || 0;
        await updateDoc(dealerRef, {
          currentDebt: currentDebt + amount,
          updatedAt: Timestamp.now(),
        });
      }

      return NextResponse.json({ id: debtRef.id, ...debtData }, { status: 201 });
    }

    return NextResponse.json(
      { error: "Invalid type. Must be 'payment' or 'debt'" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Error creating debt record:", error);
    return NextResponse.json(
      { error: "Failed to create debt record" },
      { status: 500 }
    );
  }
}
