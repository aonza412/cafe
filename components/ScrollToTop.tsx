"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function ScrollToTop() {
  const [isVisible, setIsVisible] = useState(false);

  // ตรวจจับการเลื่อนหน้าจอ
  useEffect(() => {
    const toggleVisibility = () => {
      // ถ้าเลื่อนลงมาเกิน 300px ให้โชว์ปุ่ม
      if (window.scrollY > 300) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener("scroll", toggleVisibility);

    // ลบ Event Listener เมื่อปิดหน้าเว็บ (Clean up)
    return () => window.removeEventListener("scroll", toggleVisibility);
  }, []);

  // ฟังก์ชันเลื่อนขึ้นบนสุด
  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth", // เลื่อนนุ่มๆ
    });
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.button
          initial={{ opacity: 0, scale: 0.5, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.5, y: 20 }} // ตอนหายให้หดลง
          whileHover={{ scale: 1.1 }} // เมาส์ชี้แล้วขยาย
          whileTap={{ scale: 0.9 }} // กดแล้วยุบ
          onClick={scrollToTop}
          className="fixed bottom-8 right-8 z-50 p-4 bg-blue-600 hover:bg-blue-500 text-white rounded-full shadow-xl shadow-blue-900/50 border border-blue-400/50 backdrop-blur-sm transition-colors"
          aria-label="Back to top"
        >
          {/* ไอคอนลูกศรชี้ขึ้น */}
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
