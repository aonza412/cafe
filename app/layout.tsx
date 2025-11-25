import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";

export const metadata: Metadata = {
  verification: {
    google: "iw5-Z-JjI9Vmi8rUi4OyN0Cn-SOCTBLDHusXJYkYl_M",
  },
  title: "ตะลึงตะลุงคาเฟ่ | Talung Talung Cafe",
  description: "พบกับเรื่องราวและบรรยากาศคาเฟ่ไทยโบราณ ที่อบอุ่นและมีเสน่ห์",
  keywords: [
    "คาเฟ่",
    "ไทยโบราณ",
    "ร้านกาแฟ",
    "เรื่องเล่า",
    "ประวัติ",
    "ตะลึงตะลุงคาเฟ่",
    "ตะลึงตะลุง",
  ],
  authors: [{ name: "ton" }],
  openGraph: {
    title: "ตะลึงตะลุงคาเฟ่",
    description: "เข้ามาสัมผัสบรรยากาศคาเฟ่ไทยโบราณที่ไม่เหมือนใคร",
    url: "https://cafe-seven-nu.vercel.app",
    siteName: "My Story Platform",
    images: [
      {
        url: "https://placehold.co/1200x630/D2B48C/6C5441?text=Thai+Cafe+Story",
        width: 1200,
        height: 630,
        alt: "Thai Vintage Cafe Cover",
      },
    ],
    locale: "th_TH",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "ตะลึงตะลุงคาเฟ่",
    description: "คาเฟ่ไทยโบราณ ที่มีเรื่องเล่า",
    images: [
      "https://placehold.co/1200x630/D2B48C/6C5441?text=Thai+Cafe+Story",
    ],
  },
  icons: {
    icon: "/favicon.ico",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#3E2723",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th">
      <body className="antialiased overflow-x-hidden">
        {/* 2. ครอบ ThemeProvider ไว้ตรงนี้ เพื่อให้ทุกหน้าใช้ useTheme ได้ */}
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
