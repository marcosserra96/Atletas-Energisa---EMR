import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { 
  getFirestore, collection, getDocs, doc, getDoc, setDoc, updateDoc, addDoc, deleteDoc,
  query, where, orderBy // <--- ADICIONADOS PARA FILTROS
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";
import { 
  getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut 
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyC2l8LU3vYfQjTly8JSa658mfIlVk2Dw8E",
  authDomain: "inovacao-emr.firebaseapp.com",
  projectId: "inovacao-emr",
  storageBucket: "inovacao-emr.firebasestorage.app",
  messagingSenderId: "1075399271811",
  appId: "1:1075399271811:web:f532f1d6fa2b21c53c2ff3"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

export { 
  app, db, auth, 
  collection, getDocs, doc, getDoc, setDoc, updateDoc, addDoc, deleteDoc,
  query, where, orderBy,
  signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut 
};
