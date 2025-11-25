"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { doc, getDoc, setDoc } from "firebase/firestore";
import {
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  User,
} from "firebase/auth";
import { db, auth, googleProvider } from "@/lib/firebase";
import ImageUploader from "@/components/ImageUploader";
import SafeImage from "@/components/SafeImage";
import ScrollToTop from "@/components/ScrollToTop";

import { Swiper, SwiperSlide } from "swiper/react";
import { Pagination, Navigation, Autoplay } from "swiper/modules";
import "swiper/css";
("swiper/css/pagination");
("swiper/css/navigation");

// --- TYPES ---
type ShapeType = "rectangle" | "square" | "circle";
type StorySection = {
  id: number;
  title: string;
  body: string;
  imageUrl: string;
  imagePublicId?: string;
  imagePosition: "left" | "right";
  imageShape: ShapeType;
  gallery?: string[];
};
type SocialLinks = {
  facebook: string;
  instagram: string;
  tiktok: string;
  map: string;
};
type AlbumImage = { id: string; url: string; publicId?: string };
type SliderItem = {
  id: string;
  url: string;
  publicId?: string;
  file?: Blob;
  isNew?: boolean;
};

const defaultSections: StorySection[] = [
  {
    id: 1,
    title: "จุดเริ่มต้น",
    body: "เนื้อหา...",
    imageUrl: "https://placehold.co/800x600/png",
    imagePosition: "right",
    imageShape: "rectangle",
  },
];
const defaultSocials: SocialLinks = {
  facebook: "",
  instagram: "",
  tiktok: "",
  map: "",
};

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [isRealAdmin, setIsRealAdmin] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);

  // Data States
  const [heroTitle, setHeroTitle] = useState("The Stories"); // <--- (ใหม่) เก็บชื่อหัวข้อหลัก
  const [sections, setSections] = useState<StorySection[]>([]);
  const [album, setAlbum] = useState<AlbumImage[]>([]);
  const [socials, setSocials] = useState<SocialLinks>(defaultSocials);

  const [mainSlider, setMainSlider] = useState<SliderItem[]>([]);
  const [pendingDeletes, setPendingDeletes] = useState<string[]>([]);

  const [showUploader, setShowUploader] = useState(false);
  const [uploadTarget, setUploadTarget] = useState<{
    type: "section" | "album" | "main-slider";
    id?: number;
  } | null>(null);

  const [showSecretKey, setShowSecretKey] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // --- AUTH & FETCH ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (
        currentUser?.email === "uthaipan.aon@gmail.com" ||
        currentUser?.email === "tonmaejo@gmail.com"
      )
        setIsRealAdmin(true); // <--- เช็คเมลคุณ
      else {
        setIsRealAdmin(false);
        setIsEditing(false);
      }
    });
    const fetchData = async () => {
      try {
        const contentRef = doc(db, "pages", "storytelling");
        const contentSnap = await getDoc(contentRef);
        if (contentSnap.exists()) {
          setSections(contentSnap.data().sections || defaultSections);
          setMainSlider(contentSnap.data().mainSlider || []);
        } else {
          setSections(defaultSections);
        }
        const albumRef = doc(db, "pages", "album");
        const albumSnap = await getDoc(albumRef);
        if (albumSnap.exists()) setAlbum(albumSnap.data().images || []);

        // Fetch Settings & Hero Title
        const settingsRef = doc(db, "pages", "settings");
        const settingsSnap = await getDoc(settingsRef);
        if (settingsSnap.exists()) {
          const data = settingsSnap.data();
          setSocials(data.socials || defaultSocials);
          if (data.heroTitle) setHeroTitle(data.heroTitle); // <--- (ใหม่) ดึงค่า Title
        }
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
    return () => unsubscribe();
  }, []);

  const startPress = () => {
    if (user) return;
    timerRef.current = setTimeout(() => {
      if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
      setShowSecretKey(true);
    }, 5000);
  };
  const endPress = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };
  const handleLogin = async () => {
    try {
      setShowSecretKey(false);
      await signInWithPopup(auth, googleProvider);
    } catch (e: any) {
      alert(e.message);
    }
  };
  const handleLogout = async () => {
    await signOut(auth);
    setIsEditing(false);
    window.location.reload();
  };

  // --- UPLOAD LOGIC ---
  const openUploader = (
    type: "section" | "album" | "main-slider",
    id?: number
  ) => {
    setUploadTarget({ type, id });
    setShowUploader(true);
  };
  const handleFileSelected = (blob: Blob) => {
    if (!uploadTarget) return;
    const previewUrl = URL.createObjectURL(blob);
    if (uploadTarget.type === "main-slider") {
      setMainSlider((prev) => [
        ...prev,
        { id: Date.now().toString(), url: previewUrl, file: blob, isNew: true },
      ]);
    } else if (
      uploadTarget.type === "section" &&
      typeof uploadTarget.id === "number"
    ) {
      const oldSection = sections.find((s) => s.id === uploadTarget.id);
      if (oldSection?.imagePublicId)
        setPendingDeletes((prev) => [...prev, oldSection.imagePublicId!]);
      uploadFileToServer(blob).then(({ url, publicId }) => {
        setSections((prev) =>
          prev.map((s) =>
            s.id === uploadTarget.id
              ? { ...s, imageUrl: url, imagePublicId: publicId }
              : s
          )
        );
      });
    } else if (uploadTarget.type === "album") {
      uploadFileToServer(blob).then(({ url, publicId }) => {
        setAlbum((prev) => [
          ...prev,
          { id: Date.now().toString(), url, publicId },
        ]);
      });
    }
    setShowUploader(false);
  };
  const uploadFileToServer = async (blob: Blob) => {
    const formData = new FormData();
    formData.append("file", blob, "image.jpg");
    const res = await fetch("/api/upload", { method: "POST", body: formData });
    return await res.json();
  };
  const removeMainSliderImage = (id: string) => {
    const item = mainSlider.find((i) => i.id === id);
    if (!item) return;
    if (item.isNew) URL.revokeObjectURL(item.url);
    else if (item.publicId)
      setPendingDeletes((prev) => [...prev, item.publicId!]);
    setMainSlider((prev) => prev.filter((i) => i.id !== id));
  };
  const handleDeleteSection = (id: number) => {
    const s = sections.find((x) => x.id === id);
    if (confirm("ยืนยันลบบทความนี้? (รูปจะถูกลบเมื่อกด Save All)")) {
      if (s?.imagePublicId)
        setPendingDeletes((prev) => [...prev, s.imagePublicId!]);
      setSections((prev) => prev.filter((x) => x.id !== id));
    }
  };

  // --- SAVE ALL ---
  const handleSave = async () => {
    setLoading(true);
    try {
      if (pendingDeletes.length > 0) {
        await Promise.all(
          pendingDeletes.map((pid) =>
            fetch("/api/delete", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ publicId: pid }),
            })
          )
        );
        setPendingDeletes([]);
      }
      const finalSlider = await Promise.all(
        mainSlider.map(async (item) => {
          if (item.isNew && item.file) {
            const { url, publicId } = await uploadFileToServer(item.file);
            return { id: item.id, url, publicId };
          }
          return { id: item.id, url: item.url, publicId: item.publicId };
        })
      );
      await setDoc(
        doc(db, "pages", "storytelling"),
        { sections, mainSlider: finalSlider },
        { merge: true }
      );
      await setDoc(
        doc(db, "pages", "album"),
        { images: album },
        { merge: true }
      );

      // *** (ใหม่) บันทึก heroTitle ไปพร้อมกับ settings ***
      await setDoc(
        doc(db, "pages", "settings"),
        { socials, heroTitle },
        { merge: true }
      );

      setMainSlider(finalSlider);
      setIsEditing(false);
      alert("✅ บันทึกข้อมูลทั้งหมดเรียบร้อย!");
    } catch (error: any) {
      console.error(error);
      alert("❌ บันทึกไม่สำเร็จ: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    window.location.reload();
  };
  const handleUpdateSection = (
    id: number,
    field: keyof StorySection,
    value: any
  ) =>
    setSections((prev) =>
      prev.map((s) => (s.id === id ? { ...s, [field]: value } : s))
    );
  const handleAddSection = () => {
    const newId =
      sections.length > 0 ? Math.max(...sections.map((s) => s.id)) + 1 : 1;
    setSections([
      ...sections,
      {
        id: newId,
        title: "New Story",
        body: "...",
        imageUrl: "https://placehold.co/800x600/png",
        imagePosition: sections.length % 2 === 0 ? "right" : "left",
        imageShape: "rectangle",
      },
    ]);
    setTimeout(
      () =>
        window.scrollTo({
          top: document.body.scrollHeight,
          behavior: "smooth",
        }),
      100
    );
  };
  const removeAlbumImage = (id: string) =>
    setAlbum((prev) => prev.filter((i) => i.id !== id));

  if (loading && !isEditing)
    return (
      <div className="flex h-screen items-center justify-center text-white bg-slate-900">
        Loading...
      </div>
    );

  return (
    <main
      className="min-h-screen bg-slate-900 text-white overflow-hidden font-sans pb-20 relative select-none"
      onMouseDown={startPress}
      onMouseUp={endPress}
      onMouseLeave={endPress}
      onTouchStart={startPress}
      onTouchEnd={endPress}
    >
      <ScrollToTop />

      <AnimatePresence>
        {showSecretKey && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
            <motion.button
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 0, opacity: 0 }}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={handleLogin}
              className="w-24 h-24 bg-yellow-500 rounded-full flex items-center justify-center shadow-[0_0_50px_rgba(234,179,8,0.6)] cursor-pointer"
            >
              <span className="text-4xl">🔐</span>
            </motion.button>
            <div
              className="absolute inset-0 -z-10"
              onClick={() => setShowSecretKey(false)}
            ></div>
          </div>
        )}
      </AnimatePresence>

      {showUploader && (
        <ImageUploader
          onFileSelected={handleFileSelected}
          onCancel={() => setShowUploader(false)}
          aspectRatio={uploadTarget?.type === "main-slider" ? 16 / 9 : 4 / 3}
          cropShape="rect"
        />
      )}

      <div className="fixed top-5 right-5 z-40 flex gap-2 items-center">
        {user && isRealAdmin && (
          <>
            {!isEditing ? (
              <button
                onClick={() => setIsEditing(true)}
                className="bg-blue-500 hover:bg-blue-600 px-4 py-2 rounded-full text-sm font-bold shadow-lg transition"
              >
                ✏️ Edit Mode
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={handleCancelEdit}
                  className="bg-slate-600 hover:bg-slate-500 px-4 py-2 rounded-full text-sm font-bold shadow-lg transition"
                >
                  ❌ Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={loading}
                  className="bg-green-500 hover:bg-green-600 px-4 py-2 rounded-full text-sm font-bold shadow-lg transition"
                >
                  {loading ? "Saving..." : "💾 Save All"}
                </button>
              </div>
            )}
          </>
        )}
        {user && (
          <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md p-1 pr-4 rounded-full border border-white/20">
            <img src={user.photoURL || ""} className="w-8 h-8 rounded-full" />
            <button
              onClick={handleLogout}
              className="text-xs text-slate-300 hover:text-white font-bold"
            >
              LOGOUT
            </button>
          </div>
        )}
      </div>

      {/* --- HEADER (แก้ไขให้เปลี่ยนข้อความได้) --- */}
      <section className="pt-20 pb-10 flex items-center justify-center bg-gradient-to-b from-indigo-950 to-slate-900">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.2 }}
          className="text-center px-4 w-full"
        >
          {isEditing ? (
            // โหมดแก้ไข: แสดง Input
            <input
              type="text"
              value={heroTitle}
              onChange={(e) => setHeroTitle(e.target.value)}
              className="text-5xl md:text-8xl font-bold bg-transparent border-b-2 border-cyan-500 text-center text-white focus:outline-none w-full max-w-4xl placeholder-slate-500"
              placeholder="ใส่ชื่อเรื่อง..."
            />
          ) : (
            // โหมดปกติ: แสดง H1
            <h1 className="text-5xl md:text-8xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-purple-500 mb-4 break-words">
              {heroTitle}
            </h1>
          )}
        </motion.div>
      </section>

      {/* --- MAIN IMAGE SLIDER --- */}
      <section className="w-full max-w-6xl mx-auto px-4 mb-20">
        <div className="relative w-full aspect-video md:aspect-[21/9] rounded-3xl overflow-hidden shadow-2xl border border-slate-800 bg-black/40">
          {mainSlider.length > 0 ? (
            <Swiper
              modules={[Pagination, Navigation, Autoplay]}
              spaceBetween={0}
              slidesPerView={1}
              pagination={{ clickable: true }}
              navigation={true}
              autoplay={{ delay: 5000 }}
              className="w-full h-full"
            >
              {mainSlider.map((slide) => (
                <SwiperSlide key={slide.id} className="relative">
                  <SafeImage
                    src={slide.url}
                    alt="Slide"
                    className="w-full h-full object-cover"
                  />
                  {isEditing && (
                    <button
                      onClick={() => removeMainSliderImage(slide.id)}
                      className="absolute top-4 right-4 bg-red-600 text-white p-2 rounded-full shadow-lg hover:bg-red-500 z-20"
                      title="ลบรูปนี้"
                    >
                      🗑️
                    </button>
                  )}
                  {isEditing && slide.isNew && (
                    <div className="absolute top-4 left-4 bg-green-500 text-white text-xs px-2 py-1 rounded shadow">
                      New (Draft)
                    </div>
                  )}
                </SwiperSlide>
              ))}
            </Swiper>
          ) : (
            <div className="w-full h-full flex items-center justify-center text-slate-500">
              <p>No Images in Slider</p>
            </div>
          )}
          {isEditing && (
            <button
              onClick={() => openUploader("main-slider")}
              className={`absolute z-20 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-full shadow-lg transition flex items-center gap-2 ${
                mainSlider.length === 0
                  ? "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 px-6 py-3 text-lg"
                  : "bottom-4 right-4 px-4 py-2 text-sm"
              }`}
            >
              <span>➕ เพิ่มรูปสไลด์</span>
            </button>
          )}
        </div>
      </section>

      {/* --- STORY SECTIONS --- */}
      <div className="max-w-6xl mx-auto px-4 py-10 flex flex-col gap-32">
        {sections.map((section) => (
          <motion.div
            key={section.id}
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8 }}
            className={`relative flex flex-col md:flex-row items-center gap-12 ${
              section.imagePosition === "left" ? "md:flex-row-reverse" : ""
            }`}
          >
            {isEditing && (
              <button
                onClick={() => handleDeleteSection(section.id)}
                className="absolute -top-10 right-0 bg-red-500/80 hover:bg-red-600 text-white px-3 py-1 rounded text-xs"
              >
                🗑️ ลบบทความนี้
              </button>
            )}
            <div className="flex-1 space-y-6 w-full z-10">
              {isEditing ? (
                <div className="flex flex-col gap-4 p-6 bg-slate-800 rounded-2xl border border-slate-700 shadow-xl">
                  <input
                    type="text"
                    value={section.title}
                    onChange={(e) =>
                      handleUpdateSection(section.id, "title", e.target.value)
                    }
                    className="bg-slate-900 text-xl font-bold text-cyan-300 border border-slate-700 rounded p-2"
                  />
                  <textarea
                    value={section.body}
                    onChange={(e) =>
                      handleUpdateSection(section.id, "body", e.target.value)
                    }
                    rows={4}
                    className="bg-slate-900 text-slate-300 w-full p-2 rounded border border-slate-700 whitespace-pre-wrap"
                  />
                  <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-700">
                    <select
                      value={section.imagePosition}
                      onChange={(e) =>
                        handleUpdateSection(
                          section.id,
                          "imagePosition",
                          e.target.value
                        )
                      }
                      className="w-full bg-slate-700 text-sm rounded p-1"
                    >
                      <option value="right">Right</option>
                      <option value="left">Left</option>
                    </select>
                    <select
                      value={section.imageShape}
                      onChange={(e) =>
                        handleUpdateSection(
                          section.id,
                          "imageShape",
                          e.target.value
                        )
                      }
                      className="w-full bg-slate-700 text-sm rounded p-1"
                    >
                      <option value="rectangle">Rectangle</option>
                      <option value="square">Square</option>
                      <option value="circle">Circle</option>
                    </select>
                  </div>
                </div>
              ) : (
                <>
                  <h2 className="text-4xl md:text-5xl font-bold text-white leading-tight">
                    <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-200 to-cyan-200">
                      {section.title}
                    </span>
                  </h2>
                  <p className="text-lg text-slate-400 leading-relaxed font-light whitespace-pre-wrap">
                    {section.body}
                  </p>
                </>
              )}
            </div>
            <div className="flex-1 w-full flex justify-center items-center">
              <div
                className={`relative group w-full max-w-lg overflow-hidden shadow-2xl shadow-black/50 border border-slate-800 transition-all duration-500 ${
                  section.imageShape === "circle"
                    ? "rounded-full aspect-square"
                    : section.imageShape === "square"
                    ? "rounded-3xl aspect-square"
                    : "rounded-3xl aspect-video"
                }`}
              >
                <SafeImage
                  src={section.imageUrl}
                  alt={section.title}
                  className="object-cover w-full h-full"
                />
                {isEditing && (
                  <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => openUploader("section", section.id)}
                      className="bg-cyan-500 text-black font-bold px-4 py-2 rounded-full transform hover:scale-105 transition"
                    >
                      📷 เปลี่ยนรูป
                    </button>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        ))}
        {isEditing && (
          <div className="flex justify-center pb-10">
            <button
              onClick={handleAddSection}
              className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-300 px-8 py-4 rounded-xl transition shadow-lg group"
            >
              <span className="text-2xl group-hover:scale-125 transition">
                ➕
              </span>
              <span className="font-bold">เพิ่มบทความใหม่</span>
            </button>
          </div>
        )}
      </div>

      {/* ALBUM ZONE */}
      <section className="w-full max-w-6xl mx-auto px-4 py-20 border-t border-slate-800">
        <div className="flex justify-between items-end mb-8">
          <h2 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-pink-400 to-yellow-400">
            Gallery Album
          </h2>
          {isEditing && (
            <button
              onClick={() => openUploader("album")}
              className="bg-pink-600 hover:bg-pink-500 px-4 py-2 rounded-lg text-sm font-bold shadow-lg transition flex items-center gap-2"
            >
              <span>➕ เพิ่มรูปอัลบั้ม</span>
            </button>
          )}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {album.map((img) => (
            <motion.div
              layout
              key={img.id}
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              className="relative aspect-square rounded-xl overflow-hidden group cursor-pointer bg-slate-800"
            >
              <SafeImage
                src={img.url}
                alt="Album"
                className="w-full h-full object-cover transition duration-500 group-hover:scale-110"
              />
              {isEditing && (
                <button
                  onClick={() => removeAlbumImage(img.id)}
                  className="absolute top-2 right-2 bg-red-500 text-white w-8 h-8 rounded-full flex items-center justify-center shadow-md opacity-0 group-hover:opacity-100 transition"
                >
                  ✕
                </button>
              )}
            </motion.div>
          ))}
        </div>
      </section>

      <footer className="w-full bg-black/50 backdrop-blur-lg border-t border-slate-800 py-10 mt-10">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h3 className="text-2xl font-bold text-white mb-8">
            Connect With Me
          </h3>
          <div className="flex flex-wrap justify-center gap-8 items-center">
            {(isEditing || socials.facebook) && (
              <div className="flex flex-col items-center gap-2">
                {isEditing ? (
                  <input
                    placeholder="Facebook"
                    value={socials.facebook}
                    onChange={(e) =>
                      setSocials({ ...socials, facebook: e.target.value })
                    }
                    className="bg-slate-800 text-xs p-2 rounded border border-slate-600 w-40"
                  />
                ) : (
                  <a
                    href={socials.facebook}
                    target="_blank"
                    className="p-4 bg-blue-600/20 hover:bg-blue-600 rounded-full transition group"
                  >
                    <svg
                      className="w-8 h-8 text-blue-500 group-hover:text-white"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                    </svg>
                  </a>
                )}
              </div>
            )}
            {(isEditing || socials.instagram) && (
              <div className="flex flex-col items-center gap-2">
                {isEditing ? (
                  <input
                    placeholder="Instagram"
                    value={socials.instagram}
                    onChange={(e) =>
                      setSocials({ ...socials, instagram: e.target.value })
                    }
                    className="bg-slate-800 text-xs p-2 rounded border border-slate-600 w-40"
                  />
                ) : (
                  <a
                    href={socials.instagram}
                    target="_blank"
                    className="p-4 bg-pink-600/20 hover:bg-pink-600 rounded-full transition group"
                  >
                    <svg
                      className="w-8 h-8 text-pink-500 group-hover:text-white"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                    </svg>
                  </a>
                )}
              </div>
            )}
            {(isEditing || socials.tiktok) && (
              <div className="flex flex-col items-center gap-2">
                {isEditing ? (
                  <input
                    placeholder="TikTok"
                    value={socials.tiktok}
                    onChange={(e) =>
                      setSocials({ ...socials, tiktok: e.target.value })
                    }
                    className="bg-slate-800 text-xs p-2 rounded border border-slate-600 w-40"
                  />
                ) : (
                  <a
                    href={socials.tiktok}
                    target="_blank"
                    className="p-4 bg-slate-600/20 hover:bg-black rounded-full transition group border border-slate-700"
                  >
                    <svg
                      className="w-8 h-8 text-white group-hover:scale-110 transition"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.49-3.35-3.98-5.6-.48-2.21.08-4.52 1.54-6.32 1.4-1.8 3.6-2.9 5.91-2.94.55-.01 1.1.06 1.64.18.06 1.34.03 2.67.03 4.01-.21-.06-.44-.12-.67-.14-.73-.04-1.47.11-2.12.42-1.22.6-1.99 1.87-1.95 3.23.04 1.39.86 2.66 2.11 3.2 1.25.54 2.69.24 3.73-.55 1.05-.8 1.67-2.07 1.64-3.39-.02-2.9-.01-5.8-.01-8.71.01-1.64.01-3.29.01-4.93z" />
                    </svg>
                  </a>
                )}
              </div>
            )}
            {(isEditing || socials.map) && (
              <div className="flex flex-col items-center gap-2">
                {isEditing ? (
                  <input
                    placeholder="Map"
                    value={socials.map}
                    onChange={(e) =>
                      setSocials({ ...socials, map: e.target.value })
                    }
                    className="bg-slate-800 text-xs p-2 rounded border border-slate-600 w-40"
                  />
                ) : (
                  <a
                    href={socials.map}
                    target="_blank"
                    className="p-4 bg-green-600/20 hover:bg-green-600 rounded-full transition group"
                  >
                    <svg
                      className="w-8 h-8 text-green-500 group-hover:text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                    </svg>
                  </a>
                )}
              </div>
            )}
          </div>
          <div className="text-slate-600 pt-10 text-sm">
            <p>© 2024 My Story Platform</p>
          </div>
        </div>
      </footer>
    </main>
  );
}
