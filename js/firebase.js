import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getFirestore, collection, getDocs, doc, getDoc, setDoc, updateDoc, addDoc } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";

// --- SUA CONFIGURAÇÃO ---
const firebaseConfig = {
  apiKey: "AIzaSyC2l8LU3vYfQjTly8JSa658mfIlVk2Dw8E",
  authDomain: "inovacao-emr.firebaseapp.com",
  projectId: "inovacao-emr",
  storageBucket: "inovacao-emr.firebasestorage.app",
  messagingSenderId: "1075399271811",
  appId: "1:1075399271811:web:f532f1d6fa2b21c53c2ff3"
};

// Inicia o App (apenas uma vez)
const app = initializeApp(firebaseConfig);

// Prepara os serviços para exportação
const db = getFirestore(app);
const auth = getAuth(app);

// Exporta tudo o que o site precisa
export { 
  app, db, auth, 
  collection, getDocs, doc, getDoc, setDoc, updateDoc, addDoc, 
  signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut 
};
