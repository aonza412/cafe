"use client";

import { createContext, useContext, useEffect, useState } from "react";

type Theme = "vintage" | "minimal" | "midnight";

type ThemeContextType = {
  theme: Theme;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>("vintage");
  const [mounted, setMounted] = useState(false);

  // 1. โหลดค่าจาก LocalStorage เมื่อเปิดเว็บ
  useEffect(() => {
    const savedTheme = localStorage.getItem("site-theme") as Theme;
    if (savedTheme) setTheme(savedTheme);
    setMounted(true);
  }, []);

  // 2. อัปเดต HTML attribute เมื่อธีมเปลี่ยน
  useEffect(() => {
    if (!mounted) return;
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("site-theme", theme);
  }, [theme, mounted]);

  const toggleTheme = () => {
    const themes: Theme[] = ["vintage", "minimal", "midnight"];
    const nextIndex = (themes.indexOf(theme) + 1) % themes.length;
    setTheme(themes[nextIndex]);
  };

  // *** จุดที่แก้ไข ***
  // เราต้อง return Provider เสมอ (ห้าม return children เปล่าๆ)
  // เพื่อให้หน้าลูก (page.tsx) เรียกใช้ useTheme ได้ตั้งแต่เริ่มโหลด
  if (!mounted) {
    return (
      <ThemeContext.Provider value={{ theme, toggleTheme }}>
        {/* ซ่อนเนื้อหาชั่วคราวเพื่อกัน UI กระพริบ แต่ยังคง Provider ไว้ */}
        <div style={{ visibility: "hidden" }}>{children}</div>
      </ThemeContext.Provider>
    );
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

// Hook สำหรับเรียกใช้
export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};
