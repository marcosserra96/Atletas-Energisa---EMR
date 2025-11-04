// =====================================================
// 🔥 Firebase Configuração do Portal Comitê
// =====================================================

// Importa os módulos necessários do Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

// =====================================================
// 🚀 Configuração do seu projeto Firebase
// =====================================================
const firebaseConfig = {
  apiKey: "AIzaSyC2l8LU3vYfQjTly8JSa658mfIlVk2Dw8E",
  authDomain: "inovacao-emr.firebaseapp.com",
  projectId: "inovacao-emr",
  storageBucket: "inovacao-emr.firebasestorage.app",
  messagingSenderId: "1075399271811",
  appId: "1:1075399271811:web:f532f1d6fa2b21c53c2ff3"
};

// =====================================================
// 🧩 Inicialização e exportação do Firestore
// =====================================================
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db };
