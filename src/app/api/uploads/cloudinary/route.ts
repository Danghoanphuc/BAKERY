import crypto from "crypto";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type CloudinaryUploadResult = {
  secure_url?: string;
  public_id?: string;
  width?: number;
  height?: number;
  bytes?: number;
  format?: string;
  error?: { message?: string };
};

const CLOUDINARY_UPLOAD_URL = (cloudName: string) =>
  `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;

export async function POST(request: Request) {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    return NextResponse.json(
      { error: "Cloudinary chưa được cấu hình trên server." },
      { status: 500 },
    );
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "Không tìm thấy file ảnh để tải lên." },
        { status: 400 },
      );
    }

    if (!file.type.startsWith("image/")) {
      return NextResponse.json(
        { error: "Chỉ hỗ trợ tải lên file ảnh." },
        { status: 400 },
      );
    }

    if (file.size > 8 * 1024 * 1024) {
      return NextResponse.json(
        { error: "Ảnh quá lớn. Vui lòng chọn ảnh dưới 8MB." },
        { status: 400 },
      );
    }

    const timestamp = Math.round(Date.now() / 1000).toString();
    const folder = "bakery/products";
    const signature = crypto
      .createHash("sha1")
      .update(`folder=${folder}&timestamp=${timestamp}${apiSecret}`)
      .digest("hex");

    const uploadForm = new FormData();
    uploadForm.append("file", file);
    uploadForm.append("api_key", apiKey);
    uploadForm.append("timestamp", timestamp);
    uploadForm.append("folder", folder);
    uploadForm.append("signature", signature);

    const response = await fetch(CLOUDINARY_UPLOAD_URL(cloudName), {
      method: "POST",
      body: uploadForm,
    });
    const result = (await response.json()) as CloudinaryUploadResult;

    if (!response.ok || !result.secure_url) {
      return NextResponse.json(
        {
          error:
            result.error?.message ??
            "Cloudinary không thể xử lý ảnh này. Vui lòng thử ảnh khác.",
        },
        { status: 502 },
      );
    }

    return NextResponse.json({
      url: result.secure_url,
      publicId: result.public_id,
      width: result.width,
      height: result.height,
      bytes: result.bytes,
      format: result.format,
    });
  } catch (error) {
    console.error("Cloudinary upload failed:", error);
    return NextResponse.json(
      { error: "Không thể tải ảnh lên Cloudinary." },
      { status: 500 },
    );
  }
}
