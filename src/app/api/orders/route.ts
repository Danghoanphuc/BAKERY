import { NextResponse } from "next/server";
import { getOrders, createOrder, generateOrderNumber } from "@/lib/db";
import { createCustomerSessionCookie } from "@/lib/auth/customer-session";
import { createOrUpdateCustomerFromPurchase } from "@/lib/firebase";

export async function GET() {
  try {
    const orders = await getOrders();
    return NextResponse.json(orders);
  } catch (error) {
    console.error("Error fetching orders:", error);
    return NextResponse.json(
      { error: "Failed to fetch orders" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const orderNumber = generateOrderNumber();
    const customer =
      data.customerName && data.customerPhone
        ? await createOrUpdateCustomerFromPurchase({
            name: data.customerName,
            phone: data.customerPhone,
            email: data.customerEmail,
            birthday: data.customerBirthday,
            gender: data.customerGender,
            status: "active",
            personalization: {},
          })
        : null;
    const order = await createOrder({
      ...data,
      orderNumber,
      status: "pending",
    });
    const response = NextResponse.json(
      {
        ...order,
        customerId: customer?.id,
      },
      { status: 201 },
    );

    if (customer) {
      response.headers.append("Set-Cookie", createCustomerSessionCookie(customer.id));
    }

    return response;
  } catch (error) {
    console.error("Error creating order:", error);
    return NextResponse.json(
      { error: "Failed to create order" },
      { status: 500 }
    );
  }
}
