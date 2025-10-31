// 🔹 Arquivo: /firebase/firebase-config.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

const firebaseConfig = {
      apiKey: "AIzaSyC2l8LU3vYfQjTly8JSa658mfIlVk2Dw8E",
      authDomain: "inovacao-emr.firebaseapp.com",
      projectId: "inovacao-emr",
      storageBucket: "inovacao-emr.firebasestorage.app",
      messagingSenderId: "1075399271811",
      appId: "1:1075399271811:web:f532f25547125d6a8f42b6",
      measurementId: "G-8CTLMNCZJN"
};

// Inicializa Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
