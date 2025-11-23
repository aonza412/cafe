// components/SafeImage.tsx
"use client";

import { useState, useEffect } from "react";
import { motion, MotionProps } from "framer-motion";

// กำหนด Props ที่ Component นี้จะรับ (รวมถึง Props ของ Framer Motion ด้วย)
// Omit HTML animation event handlers to avoid type conflicts with framer-motion's animation props
interface SafeImageProps
  extends Omit<
    React.ImgHTMLAttributes<HTMLImageElement>,
    "onAnimationStart" | "onAnimationEnd" | "onAnimationIteration"
  > {
  src: string;
  alt: string;
  className?: string;
  // รับ Animation props เพิ่มเติมเพื่อให้ทำงานเหมือนเดิม
  initial?: MotionProps["initial"];
  whileInView?: MotionProps["whileInView"];
  transition?: MotionProps["transition"];
}

export default function SafeImage({
  src,
  alt,
  className,
  initial,
  whileInView,
  transition,
  ...props
}: SafeImageProps) {
  const [hasError, setHasError] = useState(false);

  // Reset error state เมื่อ src เปลี่ยน (เผื่อผู้ใช้เปลี่ยนรูปในหน้า Admin)
  useEffect(() => {
    setHasError(false);
  }, [src]);

  if (hasError) {
    // --- ถ้ามี Error ให้แสดงกล่องสีดำ ---
    return (
      <div
        className={`bg-black ${className} flex items-center justify-center`}
        role="img"
        aria-label={alt}
      >
        {/* อาจจะใส่ icon เล็กๆ หรือปล่อยว่างเลยก็ได้ */}
        <span className="text-slate-700 text-xs">No Image</span>
      </div>
    );
  }

  // --- ถ้าปกติ แสดงรูปพร้อม Animation ---
  return (
    <motion.img
      src={src}
      alt={alt}
      className={className}
      onError={() => setHasError(true)} // เมื่อโหลดไม่ได้ ให้เซ็ต state เป็น true
      initial={initial}
      whileInView={whileInView}
      transition={transition}
      {...(props as React.ComponentProps<typeof motion.img>)}
    />
  );
}
