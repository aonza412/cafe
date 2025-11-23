import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

// --- ส่วนสำคัญ: การตั้งค่า SEO และ Social Share ---
export const metadata: Metadata = {
  // 1. ข้อมูลพื้นฐานสำหรับ Google
  title: "ตะลึงตะลุง คาเฟ่",
  description:
    "เว็บไซต์เล่าเรื่องราว ประสบการณ์ และความทรงจำ ผ่านภาพถ่ายและตัวอักษร",
  keywords: ["blog", "story", "travel", "portfolio", "nextjs", "firebase"],
  authors: [{ name: "ตะลึงตะลุง" }],

  // 2. ข้อมูลสำหรับ Facebook / Line / Discord (Open Graph)
  openGraph: {
    title: "ตะลึงตะลุง คาเฟ่",
    description: "เข้ามาอ่านเรื่องราวที่น่าสนใจ และดูอัลบั้มภาพสวยๆ ได้ที่นี่",
    url: "cafe-seven-nu.vercel.app", // ใส่ URL จริงตอน Deploy เสร็จ
    siteName: "ตะลึงตะลุง คาเฟ่",
    images: [
      {
        url: "https://placehold.co/1200x630/png", // *** สำคัญ: รูปที่จะโชว์เวลาแชร์ลิงก์ (ขนาดแนะนำ 1200x630) ***
        width: 1200,
        height: 630,
        alt: "My Story Cover",
      },
    ],
    locale: "th_TH",
    type: "website",
  },

  // 3. ข้อมูลสำหรับ Twitter / X
  twitter: {
    card: "summary_large_image",
    title: "ตะลึงตะลุง คาเฟ่",
    description: "เรื่องราวและการเดินทางที่น่าจดจำ",
    images: ["https://placehold.co/1200x630/png"], // ใส่ลิงก์รูปเดียวกัน
  },

  // 4. ไอคอนเว็บ (Favicon)
  icons: {
    icon: "/favicon.ico", // ต้องมีไฟล์ favicon.ico ในโฟลเดอร์ public
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
