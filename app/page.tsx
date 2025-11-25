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
import ImageViewer from "@/components/ImageViewer";
import { useTheme } from "@/components/ThemeProvider"; // <--- เรียกใช้ Hook เปลี่ยนธีม

import { Swiper, SwiperSlide } from "swiper/react";
import { Pagination, Navigation, Autoplay, EffectFade } from "swiper/modules";
import "swiper/css";
("swiper/css/pagination");
("swiper/css/navigation");
("swiper/css/effect-fade");

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
    title: "จุดเริ่มต้น...",
    body: "เรื่องราว...",
    imageUrl: "https://placehold.co/800x600/3E2723/FFECB3?text=Story",
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
  const { theme, toggleTheme } = useTheme(); // <--- ใช้ Hook นี้แทน State เดิม

  const [user, setUser] = useState<User | null>(null);
  const [isRealAdmin, setIsRealAdmin] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);

  const [heroTitle, setHeroTitle] = useState("ตะลึงตะลุง");
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
  const [viewImage, setViewImage] = useState<string | null>(null);
  const [showSecretKey, setShowSecretKey] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const [clickCount, setClickCount] = useState(0);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (
        currentUser?.email === "uthaipan.aon@gmail.com" ||
        currentUser?.email === "tonmaejo@gmail.com"
      )
        setIsRealAdmin(true);
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
        const settingsRef = doc(db, "pages", "settings");
        const settingsSnap = await getDoc(settingsRef);
        if (settingsSnap.exists()) {
          const data = settingsSnap.data();
          setSocials(data.socials || defaultSocials);
          if (data.heroTitle) setHeroTitle(data.heroTitle);
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
    if (confirm("ยืนยันลบบทความนี้?")) {
      if (s?.imagePublicId)
        setPendingDeletes((prev) => [...prev, s.imagePublicId!]);
      setSections((prev) => prev.filter((x) => x.id !== id));
    }
  };

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
      await setDoc(
        doc(db, "pages", "settings"),
        { socials, heroTitle },
        { merge: true }
      );
      setMainSlider(finalSlider);
      setIsEditing(false);
      alert("✅ บันทึกเรียบร้อย!");
    } catch (error: any) {
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
        title: "เรื่องใหม่...",
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
  const handleImageClick = (url: string) => {
    if (!isEditing) setViewImage(url);
  };
  const getShapeClass = (shape: ShapeType) => {
    switch (shape) {
      case "circle":
        return "rounded-full aspect-square";
      case "square":
        return "rounded-sm aspect-square";
      default:
        return "rounded-sm aspect-[4/3] md:aspect-video";
    }
  };

  if (loading && !isEditing)
    return (
      <div className="flex h-screen items-center justify-center text-theme-primary bg-theme-bg">
        กำลังโหลด...
      </div>
    );

  return (
    <main
      className="min-h-screen pb-20 relative select-none overflow-hidden bg-theme-bg text-theme-primary transition-colors duration-500"
      onMouseDown={startPress}
      onMouseUp={endPress}
      onMouseLeave={endPress}
      onTouchStart={startPress}
      onTouchEnd={endPress}
    >
      <ScrollToTop />
      <ImageViewer src={viewImage} onClose={() => setViewImage(null)} />

      {/* ปุ่มเปลี่ยนธีม (ใช้จาก Context) */}
      <button
        onClick={toggleTheme}
        className="fixed bottom-4 left-4 z-30 p-3 bg-theme-paper border border-theme-accent rounded-full shadow-lg text-xl hover:rotate-12 transition cursor-pointer"
        title="เปลี่ยนธีม"
      >
        {theme === "vintage" ? "🍂" : theme === "minimal" ? "🤍" : "🌙"}
      </button>

      <AnimatePresence>
        {showSecretKey && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
            <motion.button
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 0, opacity: 0 }}
              onClick={handleLogin}
              className="w-24 h-24 bg-theme-accent text-theme-bg rounded-full flex items-center justify-center shadow-[0_0_30px_currentColor] cursor-pointer border-4 border-white"
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

      <div className="fixed top-4 right-4 z-40 flex gap-2 items-center">
        {user && isRealAdmin && (
          <>
            {!isEditing ? (
              <button
                onClick={() => setIsEditing(true)}
                className="bg-theme-primary hover:bg-theme-secondary text-theme-bg px-5 py-2 rounded-full text-sm font-bold shadow-xl border border-theme-muted transition transform hover:scale-105 backdrop-blur-md"
              >
                ✏️ แก้ไขเนื้อหา
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={handleCancelEdit}
                  className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-full text-sm font-bold shadow-lg transition"
                >
                  ❌ ยกเลิก
                </button>
                <button
                  onClick={handleSave}
                  disabled={loading}
                  className="bg-theme-accent hover:opacity-90 text-white px-5 py-2 rounded-full text-sm font-bold shadow-lg transition transform hover:scale-105"
                >
                  {loading ? "..." : "💾 บันทึก"}
                </button>
              </div>
            )}
          </>
        )}
        {user && (
          <div className="flex items-center gap-2 bg-theme-paper/90 backdrop-blur-md p-1 pr-4 rounded-full border border-theme-primary/20 shadow-lg">
            <img
              src={user.photoURL || ""}
              className="w-8 h-8 rounded-full border border-theme-primary/20"
            />
            <button
              onClick={handleLogout}
              className="text-xs text-theme-primary font-bold hover:text-theme-accent"
            >
              ออก
            </button>
          </div>
        )}
      </div>

      {/* --- HERO HEADER --- */}
      <section className="relative min-h-[60vh] flex flex-col items-center justify-center bg-theme-primary text-theme-bg pb-32 transition-colors duration-500">
        <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/wood-pattern.png')]"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-theme-primary via-transparent to-theme-primary/50"></div>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.2 }}
          className="z-10 text-center px-4 w-full max-w-5xl mt-10"
        >
          {isEditing ? (
            <input
              type="text"
              value={heroTitle}
              onChange={(e) => setHeroTitle(e.target.value)}
              className="text-5xl md:text-8xl font-bold bg-transparent border-b-2 border-theme-accent text-center text-theme-bg focus:outline-none w-full placeholder-white/20 font-ibm"
            />
          ) : (
            <h1 className="text-6xl md:text-9xl font-bold tracking-tight font-ibm text-theme-bg drop-shadow-2xl leading-tight">
              {heroTitle}
            </h1>
          )}
          <div className="h-1 w-24 bg-theme-accent mx-auto mt-8 rounded-full opacity-80"></div>
          <p className="mt-6 text-lg md:text-xl text-theme-bg/80 font-light tracking-widest uppercase">
            Authentic Thai Vintage Cafe
          </p>
        </motion.div>
      </section>

      {/* --- MAIN SLIDER --- */}
      <div className="relative w-full px-4 z-20 -mt-24">
        <div className="max-w-6xl mx-auto">
          <div className="relative w-full aspect-video md:aspect-[21/9] rounded-lg overflow-hidden shadow-[0_30px_60px_-15px_rgba(0,0,0,0.7)] border-[8px] border-theme-bg bg-black">
            {mainSlider.length > 0 ? (
              <Swiper
                modules={[Pagination, Navigation, Autoplay, EffectFade]}
                effect="fade"
                spaceBetween={0}
                slidesPerView={1}
                pagination={{ clickable: true }}
                navigation={true}
                autoplay={{ delay: 6000, disableOnInteraction: false }}
                className="w-full h-full"
              >
                {mainSlider.map((slide) => (
                  <SwiperSlide key={slide.id} className="relative">
                    <div
                      className={`w-full h-full ${
                        !isEditing ? "cursor-zoom-in" : ""
                      }`}
                      onClick={() => handleImageClick(slide.url)}
                    >
                      <SafeImage
                        src={slide.url}
                        alt="Slide"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    {isEditing && (
                      <button
                        onClick={() => removeMainSliderImage(slide.id)}
                        className="absolute top-4 right-4 bg-theme-accent text-white p-2 rounded-full shadow-lg hover:bg-red-700 z-20"
                      >
                        🗑️
                      </button>
                    )}
                  </SwiperSlide>
                ))}
              </Swiper>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-white/30">
                <p>เพิ่มภาพบรรยากาศที่นี่</p>
              </div>
            )}
            {isEditing && (
              <button
                onClick={() => openUploader("main-slider")}
                className="absolute bottom-4 right-4 z-20 bg-theme-paper hover:bg-white text-theme-primary font-bold px-5 py-2 rounded-full shadow-xl text-sm flex items-center gap-2"
              >
                📷 เพิ่มรูปสไลด์
              </button>
            )}
          </div>
        </div>
      </div>

      {/* --- STORY CONTENT --- */}
      <div className="bg-theme-bg pt-20 pb-20 transition-colors duration-500">
        <div className="max-w-5xl mx-auto px-6 flex flex-col gap-32">
          {sections.map((section, index) => (
            <motion.div
              key={section.id}
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.8 }}
              className={`relative flex flex-col ${
                section.imagePosition === "left"
                  ? "md:flex-row-reverse"
                  : "md:flex-row"
              } items-stretch gap-0 md:gap-12 group`}
            >
              {isEditing && (
                <button
                  onClick={() => handleDeleteSection(section.id)}
                  className="absolute -top-10 right-0 bg-red-100 text-red-600 px-3 py-1 rounded text-xs hover:bg-red-200 shadow-sm z-30"
                >
                  ลบบทความนี้
                </button>
              )}

              <div className="flex-1 w-full z-10 py-4">
                <div className="relative h-full p-8 md:p-12 bg-theme-paper rounded-sm shadow-[0_15px_30px_-5px_rgba(0,0,0,0.1)] border-l-4 border-theme-accent flex flex-col justify-center transition-colors duration-500">
                  <div className="absolute top-4 right-4 w-16 h-16 border-2 border-theme-muted rounded-full opacity-50 flex items-center justify-center rotate-12 pointer-events-none">
                    <span className="text-[10px] text-theme-muted font-mono text-center leading-none">
                      POST
                      <br />
                      CARD
                    </span>
                  </div>
                  {isEditing ? (
                    <div className="flex flex-col gap-4">
                      <input
                        type="text"
                        value={section.title}
                        onChange={(e) =>
                          handleUpdateSection(
                            section.id,
                            "title",
                            e.target.value
                          )
                        }
                        className="bg-transparent text-3xl font-bold text-theme-primary border-b border-theme-accent/30 p-2 outline-none font-ibm"
                      />
                      <textarea
                        value={section.body}
                        onChange={(e) =>
                          handleUpdateSection(
                            section.id,
                            "body",
                            e.target.value
                          )
                        }
                        rows={6}
                        className="bg-transparent text-theme-secondary w-full text-lg leading-relaxed border border-theme-muted rounded p-2"
                      />
                      <div className="flex gap-3 w-full mt-2">
                        <select
                          value={section.imagePosition}
                          onChange={(e) =>
                            handleUpdateSection(
                              section.id,
                              "imagePosition",
                              e.target.value
                            )
                          }
                          className="flex-1 bg-theme-bg/90 text-theme-primary border border-theme-secondary text-sm rounded-md px-3 py-2 shadow-sm focus:outline-none focus:border-theme-accent cursor-pointer"
                        >
                          <option value="right">รูปขวา</option>
                          <option value="left">รูปซ้าย</option>
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
                          className="flex-1 bg-theme-bg/90 text-theme-primary border border-theme-secondary text-sm rounded-md px-3 py-2 shadow-sm focus:outline-none focus:border-theme-accent cursor-pointer"
                        >
                          <option value="rectangle">ผืนผ้า</option>
                          <option value="square">จัตุรัส</option>
                          <option value="circle">วงกลม</option>
                        </select>
                      </div>
                    </div>
                  ) : (
                    <>
                      <h2 className="text-4xl md:text-5xl font-bold text-theme-primary mb-6 leading-tight font-ibm">
                        {section.title}
                      </h2>
                      <div className="w-12 h-1 bg-theme-accent mb-6 opacity-30"></div>
                      <p className="text-lg text-theme-secondary leading-loose whitespace-pre-wrap font-sarabun font-medium">
                        {section.body}
                      </p>
                    </>
                  )}
                </div>
              </div>

              <div className="flex-1 w-full flex items-center justify-center md:justify-end relative">
                <div
                  className={`relative p-3 bg-theme-paper shadow-[0_20px_40px_-10px_rgba(0,0,0,0.2)] transition-all duration-500 group-hover:scale-[1.02] group-hover:rotate-1 cursor-pointer w-full max-w-lg ${getShapeClass(
                    section.imageShape
                  )}`}
                  onClick={() => handleImageClick(section.imageUrl)}
                >
                  <div
                    className={`w-full h-full overflow-hidden border border-gray-100 relative ${
                      section.imageShape === "circle"
                        ? "rounded-full"
                        : "rounded-sm"
                    }`}
                  >
                    <div className="absolute inset-0 bg-theme-primary mix-blend-color opacity-10 pointer-events-none z-10"></div>
                    <SafeImage
                      src={section.imageUrl}
                      alt={section.title}
                      className="object-cover w-full h-full grayscale-[10%] contrast-110"
                    />
                  </div>
                  {isEditing && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-sm z-20">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openUploader("section", section.id);
                        }}
                        className="bg-theme-paper text-theme-primary px-4 py-2 rounded shadow font-bold hover:bg-white"
                      >
                        เปลี่ยนรูป
                      </button>
                    </div>
                  )}
                </div>
                {section.imageShape === "rectangle" && (
                  <div className="absolute -top-4 left-1/2 w-24 h-8 bg-white/40 backdrop-blur-sm rotate-3 shadow-sm border-l border-r border-white/20 pointer-events-none"></div>
                )}
              </div>
            </motion.div>
          ))}
          {isEditing && (
            <div className="flex justify-center">
              <button
                onClick={handleAddSection}
                className="bg-theme-primary text-theme-bg px-8 py-4 rounded-full shadow-xl font-bold hover:bg-theme-secondary transition flex items-center gap-2 text-lg border-2 border-theme-bg/50"
              >
                <span>➕</span> เพิ่มเรื่องราวใหม่
              </button>
            </div>
          )}
        </div>
      </div>

      {/* --- ALBUM SECTION --- */}
      <section className="w-full max-w-7xl mx-auto px-4 py-20 border-t border-theme-muted/50 bg-theme-bg transition-colors duration-500">
        <div className="flex justify-between items-end mb-12 px-2">
          <div>
            <h2 className="text-5xl font-bold text-theme-primary font-ibm mb-2 tracking-tight">
              อัลบั้มภาพ
            </h2>
            <p className="text-theme-secondary font-sarabun italic">
              บันทึกความทรงจำที่สวยงาม
            </p>
          </div>
          {isEditing && (
            <button
              onClick={() => openUploader("album")}
              className="bg-theme-accent text-white px-6 py-2 rounded-full shadow-lg hover:opacity-80 transition font-bold flex items-center gap-2 text-sm"
            >
              <span>📷</span> เพิ่มรูป
            </button>
          )}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {album.map((img, idx) => (
            <motion.div
              layout
              key={img.id}
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              transition={{ delay: idx * 0.05 }}
              className="relative group cursor-pointer overflow-hidden rounded-lg shadow-md hover:shadow-2xl transition-all duration-300 aspect-square bg-theme-paper"
              onClick={() => handleImageClick(img.url)}
            >
              <SafeImage
                src={img.url}
                alt="Album"
                className="w-full h-full object-cover transition duration-700 group-hover:scale-110 grayscale-[20%] group-hover:grayscale-0"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              {isEditing && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeAlbumImage(img.id);
                  }}
                  className="absolute top-2 right-2 bg-white text-red-600 w-8 h-8 rounded-full flex items-center justify-center shadow-lg z-20 font-bold hover:bg-red-50"
                >
                  X
                </button>
              )}
            </motion.div>
          ))}
        </div>
        {album.length === 0 && (
          <div className="text-center py-12 text-theme-muted">
            ยังไม่มีรูปภาพ
          </div>
        )}
      </section>

      {/* --- FOOTER --- */}
      <footer className="w-full bg-theme-primary text-theme-bg py-20 relative overflow-hidden mt-20 transition-colors duration-500">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-theme-primary via-theme-accent to-theme-primary"></div>
        <div className="max-w-4xl mx-auto px-4 text-center relative z-10">
          <div className="mb-10">
            <h3 className="text-3xl font-bold mb-2 text-theme-bg font-ibm">
              ตะลึงตะลุงคาเฟ่
            </h3>
            <p className="text-sm opacity-60 font-sarabun tracking-wider">
              Talung Talung Cafe
            </p>
          </div>

          {/* โซนไอคอน Social (แก้ใหม่ให้เป็นสีจริง) */}
          <div className="flex flex-wrap justify-center gap-6 items-center mb-12 ">
            {/* 1. FACEBOOK (สีน้ำเงิน) */}
            {(isEditing || socials.facebook) && (
              <div className="flex flex-col items-center">
                {isEditing ? (
                  <input
                    placeholder="FB Link"
                    value={socials.facebook}
                    onChange={(e) =>
                      setSocials({ ...socials, facebook: e.target.value })
                    }
                    className="bg-white text-black text-xs p-2 rounded w-40 border-0"
                  />
                ) : (
                  <a
                    href={socials.facebook}
                    target="_blank"
                    className="p-3 bg-[#1877F2] rounded-full text-white transition shadow-lg hover:scale-110 hover:shadow-[#1877F2]/50 group"
                  >
                    <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                    </svg>
                  </a>
                )}
              </div>
            )}

            {/* 2. INSTAGRAM (ไล่สี Gradient) */}
            {(isEditing || socials.instagram) && (
              <div className="flex flex-col items-center">
                {isEditing ? (
                  <input
                    placeholder="IG Link"
                    value={socials.instagram}
                    onChange={(e) =>
                      setSocials({ ...socials, instagram: e.target.value })
                    }
                    className="bg-white text-black text-xs p-2 rounded w-40 border-0"
                  />
                ) : (
                  <a
                    href={socials.instagram}
                    target="_blank"
                    className="p-3 bg-gradient-to-tr from-[#FFD600] via-[#FF0069] to-[#D300C5] rounded-full text-white transition shadow-lg hover:scale-110 hover:shadow-pink-500/50 group"
                  >
                    <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
                      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                    </svg>
                  </a>
                )}
              </div>
            )}

            {/* 3. TIKTOK (สีดำ) */}
            {(isEditing || socials.tiktok) && (
              <div className="flex flex-col items-center">
                {isEditing ? (
                  <input
                    placeholder="TT Link"
                    value={socials.tiktok}
                    onChange={(e) =>
                      setSocials({ ...socials, tiktok: e.target.value })
                    }
                    className="bg-white text-black text-xs p-2 rounded w-40 border-0"
                  />
                ) : (
                  <a
                    href={socials.tiktok}
                    target="_blank"
                    className="p-3 bg-black rounded-full text-white transition shadow-lg hover:scale-110 hover:shadow-gray-500/50 group border border-white/20"
                  >
                    <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
                      <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.49-3.35-3.98-5.6-.48-2.21.08-4.52 1.54-6.32 1.4-1.8 3.6-2.9 5.91-2.94.55-.01 1.1.06 1.64.18.06 1.34.03 2.67.03 4.01-.21-.06-.44-.12-.67-.14-.73-.04-1.47.11-2.12.42-1.22.6-1.99 1.87-1.95 3.23.04 1.39.86 2.66 2.11 3.2 1.25.54 2.69.24 3.73-.55 1.05-.8 1.67-2.07 1.64-3.39-.02-2.9-.01-5.8-.01-8.71.01-1.64.01-3.29.01-4.93z" />
                    </svg>
                  </a>
                )}
              </div>
            )}

            {/* 4. MAP (สีเขียว Google) */}
            {(isEditing || socials.map) && (
              <div className="flex flex-col items-center">
                {isEditing ? (
                  <input
                    placeholder="Map Link"
                    value={socials.map}
                    onChange={(e) =>
                      setSocials({ ...socials, map: e.target.value })
                    }
                    className="bg-white text-black text-xs p-2 rounded w-40 border-0"
                  />
                ) : (
                  <a
                    href={socials.map}
                    target="_blank"
                    className="p-3 bg-[#34A853] rounded-full text-white transition shadow-lg hover:scale-110 hover:shadow-green-500/50 group"
                  >
                    <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
                      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
                    </svg>
                  </a>
                )}
              </div>
            )}
          </div>
          <p className="text-theme-bg/40 text-xs font-light tracking-widest cursor-pointer select-none active:text-white">
            © 2025 TALUNG TALUNG CAFE. ALL RIGHTS RESERVED.
          </p>
        </div>
      </footer>
    </main>
  );
}
