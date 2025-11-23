"use client";

import { useState, useCallback } from "react";
import Cropper, { Point, Area } from "react-easy-crop";

// ... (ฟังก์ชัน createImage, getRadianAngle, getCroppedImg เหมือนเดิม ไม่ต้องแก้) ...
const createImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", (error) => reject(error));
    image.setAttribute("crossOrigin", "anonymous");
    image.src = url;
  });

function getRadianAngle(degreeValue: number) {
  return (degreeValue * Math.PI) / 180;
}

async function getCroppedImg(imageSrc: string, pixelCrop: Area, rotation = 0) {
  const image = await createImage(imageSrc);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  const maxSize = Math.max(image.width, image.height);
  const safeArea = 2 * ((maxSize / 2) * Math.sqrt(2));
  canvas.width = safeArea;
  canvas.height = safeArea;
  ctx.translate(safeArea / 2, safeArea / 2);
  ctx.rotate(getRadianAngle(rotation));
  ctx.translate(-safeArea / 2, -safeArea / 2);
  ctx.drawImage(
    image,
    safeArea / 2 - image.width * 0.5,
    safeArea / 2 - image.height * 0.5
  );
  const data = ctx.getImageData(0, 0, safeArea, safeArea);
  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;
  ctx.putImageData(
    data,
    0 - safeArea / 2 + image.width * 0.5 - pixelCrop.x,
    0 - safeArea / 2 + image.height * 0.5 - pixelCrop.y
  );
  return new Promise<Blob>((resolve) => {
    canvas.toBlob(
      (blob) => {
        resolve(blob!);
      },
      "image/jpeg",
      0.9
    );
  });
}
// --------------------------------------------------

export default function ImageUploader({
  onUploadComplete,
  onFileSelected, // <--- (ใหม่) รับฟังก์ชันนี้เพิ่ม เพื่อส่งไฟล์กลับแบบไม่อัปโหลด
  onCancel,
  aspectRatio = 4 / 3,
  cropShape = "rect",
}: {
  onUploadComplete?: (url: string, publicId?: string) => void; // เป็น Optional แล้ว
  onFileSelected?: (blob: Blob) => void; // <--- (ใหม่)
  onCancel: () => void;
  aspectRatio?: number;
  cropShape?: "rect" | "round";
}) {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [loading, setLoading] = useState(false);

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const imageDataUrl = await readFile(file);
      setImageSrc(imageDataUrl as string);
    }
  };

  const readFile = (file: File) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.addEventListener("load", () => resolve(reader.result), false);
      reader.readAsDataURL(file);
    });
  };

  const onCropComplete = useCallback(
    (_croppedArea: Area, croppedAreaPixels: Area) => {
      setCroppedAreaPixels(croppedAreaPixels);
    },
    []
  );

  const handleConfirm = async () => {
    if (!imageSrc || !croppedAreaPixels) return;
    setLoading(true);

    try {
      const croppedBlob = await getCroppedImg(imageSrc, croppedAreaPixels);
      if (!croppedBlob) throw new Error("Crop failed");

      // --- ทางแยก: ถ้ามี onFileSelected (โหมด Draft) ให้ส่งไฟล์กลับเลย ---
      if (onFileSelected) {
        onFileSelected(croppedBlob); // ส่งก้อนไฟล์กลับไปให้หน้าหลัก
        setLoading(false);
        return; // จบการทำงาน ไม่ต้องอัปโหลด
      }

      // --- ถ้าไม่มี onFileSelected ก็อัปโหลดทันทีแบบเดิม (Direct Upload) ---
      const formData = new FormData();
      formData.append("file", croppedBlob, "image.jpg");

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();

      if (data.url && onUploadComplete) {
        onUploadComplete(data.url, data.publicId);
      } else {
        alert("Upload Failed");
      }
    } catch (e: any) {
      console.error(e);
      alert("Error: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  // ... (ส่วน Render UI เหมือนเดิมเป๊ะๆ แค่เปลี่ยน onClick={uploadImage} เป็น handleConfirm) ...
  if (!imageSrc) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
        <div className="bg-slate-800 p-8 rounded-2xl shadow-2xl border border-slate-700 max-w-md w-full text-center relative animate-in fade-in zoom-in duration-300">
          <button
            onClick={onCancel}
            className="absolute top-4 right-4 text-slate-400 hover:text-white"
          >
            ✕
          </button>
          <div className="mb-6">
            <div className="w-20 h-20 bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-4xl">📷</span>
            </div>
            <h3 className="text-xl font-bold text-white mb-2">อัปโหลดรูปภาพ</h3>
            <p className="text-slate-400 text-sm">
              เลือกรูปภาพเพื่อประกอบเรื่องราวของคุณ
            </p>
          </div>
          <label className="block w-full cursor-pointer group">
            <div className="w-full py-4 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-xl text-white font-bold shadow-lg group-hover:scale-105 transition-transform flex items-center justify-center gap-2">
              เลือกรูปจากเครื่อง
            </div>
            <input
              type="file"
              onChange={onFileChange}
              accept="image/*"
              className="hidden"
            />
          </label>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/90 p-4">
      <div className="relative w-full max-w-2xl h-[60vh] bg-slate-900 rounded-xl overflow-hidden shadow-2xl border border-slate-700">
        <Cropper
          image={imageSrc}
          crop={crop}
          zoom={zoom}
          aspect={aspectRatio}
          onCropChange={setCrop}
          onCropComplete={onCropComplete}
          onZoomChange={setZoom}
          cropShape={cropShape}
          showGrid={false}
        />
      </div>
      <div className="mt-6 w-full max-w-md flex items-center gap-4">
        <span className="text-xs text-slate-400">Zoom</span>
        <input
          type="range"
          value={zoom}
          min={1}
          max={3}
          step={0.1}
          onChange={(e) => setZoom(Number(e.target.value))}
          className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
        />
      </div>
      <div className="mt-8 flex gap-4">
        <button
          onClick={() => setImageSrc(null)}
          className="px-6 py-3 bg-slate-700 hover:bg-slate-600 rounded-full text-white font-medium transition"
          disabled={loading}
        >
          เปลี่ยนรูป
        </button>
        <button
          onClick={handleConfirm}
          disabled={loading}
          className={`px-8 py-3 rounded-full text-white font-bold shadow-lg flex items-center gap-2 transition ${
            loading
              ? "bg-slate-500 cursor-not-allowed"
              : "bg-green-500 hover:bg-green-600 hover:scale-105"
          }`}
        >
          {loading ? "กำลังประมวลผล..." : "✅ ยืนยัน"}
        </button>
      </div>
      <button
        onClick={onCancel}
        className="mt-4 text-slate-500 text-sm hover:text-slate-300 underline"
      >
        ยกเลิก (ไม่บันทึก)
      </button>
    </div>
  );
}
