import { NextResponse } from "next/server";
import { createMagicLinkForCustomer, getCustomerByPhone } from "@/lib/firebase";

export async function POST(request: Request) {
  try {
    const { phone } = await request.json();

    if (typeof phone === "string" && phone.trim()) {
      const customer = await getCustomerByPhone(phone);

      if (customer) {
        await createMagicLinkForCustomer(customer.id);
      }
    }

    return NextResponse.json({
      ok: true,
      message:
        "Nếu số điện thoại đã có trong CRM, hệ thống đã tạo magic link mới để nhân viên gửi cho khách.",
    });
  } catch (error) {
    console.error("Phone login request failed:", error);
    return NextResponse.json(
      { error: "Không thể tạo yêu cầu đăng nhập" },
      { status: 500 },
    );
  }
}