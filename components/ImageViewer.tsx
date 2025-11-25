"use client";

import { motion, AnimatePresence } from "framer-motion";

export default function ImageViewer({
  src,
  onClose,
}: {
  src: string | null;
  onClose: () => void;
}) {
  if (!src) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose} // กดที่พื้นหลังเพื่อปิด
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-sm p-4 cursor-zoom-out"
      >
        {/* ปุ่มปิด X มุมขวาบน */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-white/50 hover:text-white p-2 rounded-full transition"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
            className="w-8 h-8"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>

        {/* ตัวรูปภาพ */}
        <motion.img
          src={src}
          alt="Full Screen"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.8, opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl cursor-default"
          onClick={(e) => e.stopPropagation()} // กดที่รูปไม่ปิด (ต้องกดพื้นหลัง)
        />
      </motion.div>
    </AnimatePresence>
  );
}
