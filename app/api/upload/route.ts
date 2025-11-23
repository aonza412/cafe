// app/api/upload/route.ts
import { NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";

// ตั้งค่า Cloudinary
cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function POST(request: Request) {
  try {
    const data = await request.formData();
    const file: File | null = data.get("file") as unknown as File;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    // แปลงไฟล์เป็น Buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // อัปโหลดไป Cloudinary (ใช้ Promise wrap เพื่อให้รองรับ await)
    const result: any = await new Promise((resolve, reject) => {
      cloudinary.uploader
        .upload_stream(
          {
            folder: "my-website-stories", // ตั้งชื่อโฟลเดอร์ใน Cloudinary
          },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        )
        .end(buffer);
    });

    // ส่ง URL และ Public ID (สำคัญ! เอาไว้ลบรูป) กลับไป
    return NextResponse.json({
      url: result.secure_url,
      publicId: result.public_id,
    });
  } catch (error: any) {
    console.error("Upload Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
