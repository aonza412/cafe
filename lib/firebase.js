// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore"; // *เพิ่มบรรทัดนี้* (เอาไว้เก็บข้อมูลที่แก้ไข)
import { getAuth, GoogleAuthProvider } from "firebase/auth";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAZkBpLbxGn4H7WBY4W1cwDc_rkM7dqfTw",
  authDomain: "cafe-f8138.firebaseapp.com",
  projectId: "cafe-f8138",
  storageBucket: "cafe-f8138.firebasestorage.app",
  messagingSenderId: "389141433226",
  appId: "1:389141433226:web:e7ca757b90ae32ee749673",
  measurementId: "G-XFWMJVD2TE",
};

// เริ่มต้น Firebase App
const app = initializeApp(firebaseConfig);

// เริ่มต้น Analytics (ถ้าจะใช้)
// ใส่เงื่อนไขเช็คว่ารันบน Browser ไหม เพราะ Next.js อาจ error ตอนรันฝั่ง Server
let analytics;
if (typeof window !== "undefined") {
  analytics = getAnalytics(app);
}

// เริ่มต้น Database
export const db = getFirestore(app); // *เพิ่มบรรทัดนี้ เพื่อส่งออกตัว db ไปใช้*
// 2. Export Auth ออกไปใช้
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
