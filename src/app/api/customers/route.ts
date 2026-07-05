import { NextResponse } from "next/server";
import {
  buildMagicLinkUrl,
  createCustomerWithMagicLink,
  getAllCustomers,
} from "@/lib/firebase";

export async function GET() {
  try {
    const customers = await getAllCustomers();
    return NextResponse.json(customers);
  } catch (error) {
    console.error("Error fetching customers:", error);
    return NextResponse.json(
      { error: "Failed to fetch customers" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();

    if (!data.name || !data.phone) {
      return NextResponse.json(
        { error: "Customer name and phone are required" },
        { status: 400 },
      );
    }

    const result = await createCustomerWithMagicLink(data);
    return NextResponse.json(
      {
        ...result.customer,
        currentMagicLinkToken: result.token,
        magicLinkExpiresAt: result.expiresAt,
        magicLinkUrlPath: result.urlPath,
        magicLinkUrl: buildMagicLinkUrl(result.urlPath),
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Error creating customer:", error);
    return NextResponse.json(
      { error: "Failed to create customer" },
      { status: 500 },
    );
  }
}
