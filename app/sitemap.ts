import { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  // เปลี่ยนเป็น Domain จริงของคุณที่ได้จาก Vercel
  const baseUrl = "https://cafe-seven-nu.vercel.app";

  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
    // ถ้าอยากให้ Google เจอหน้ารองอื่นๆ ก็เพิ่มตรงนี้ได้
  ];
}
