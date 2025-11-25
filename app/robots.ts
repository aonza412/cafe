import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = "https://cafe-seven-nu.vercel.app/";

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: "/private/", // ถ้ามีหน้าไหนไม่อยากให้เจอก็ใส่ตรงนี้
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
