"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function ScrollToTop() {
  const [isVisible, setIsVisible] = useState(false);

  // ตรวจจับการเลื่อนหน้าจอ
  useEffect(() => {
    const toggleVisibility = () => {
      if (window.scrollY > 300) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener("scroll", toggleVisibility);
    return () => window.removeEventListener("scroll", toggleVisibility);
  }, []);

  // --- ฟังก์ชันเลื่อนแบบนุ่มนวล (Custom Smooth Scroll) ---
  const scrollToTop = () => {
    const duration = 1500; // ระยะเวลา: 2000ms (2 วินาที) <-- แก้ตัวเลขนี้ถ้าอยากให้ช้าลง/เร็วขึ้น
    const start = window.scrollY;
    const startTime = performance.now();

    // สูตรคณิตศาสตร์: easeInOutQuart (เริ่มช้า -> เร่งตรงกลาง -> จบช้าๆ)
    // ทำให้รู้สึกหรูหรากว่าแบบปกติ
    const easeInOutQuart = (t: number) => {
      return t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2;
    };

    const animateScroll = (currentTime: number) => {
      const timeElapsed = currentTime - startTime;
      const progress = Math.min(timeElapsed / duration, 1); // ค่า 0 ถึง 1
      const ease = easeInOutQuart(progress); // แปลงเป็นค่าความนุ่ม

      window.scrollTo(0, start * (1 - ease));

      if (progress < 1) {
        requestAnimationFrame(animateScroll);
      }
    };

    requestAnimationFrame(animateScroll);
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.button
          initial={{ opacity: 0, scale: 0.5, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.5, y: 20 }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={scrollToTop}
          className="fixed bottom-8 right-8 z-50 p-4 bg-blue-600/80 hover:bg-blue-500 text-white rounded-full shadow-2xl shadow-blue-900/50 border border-blue-400/50 backdrop-blur-md transition-colors"
          aria-label="Back to top"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={3}
            stroke="currentColor"
            className="w-6 h-6"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4.5 15.75l7.5-7.5 7.5 7.5"
            />
          </svg>
        </motion.button>
      )}
    </AnimatePresence>
  );
}
