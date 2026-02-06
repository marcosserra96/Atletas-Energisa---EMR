import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { 
  getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, fetchSignInMethodsForEmail 
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import { 
  getFirestore, doc, setDoc, getDoc 
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

// --- CONFIGURAÇÃO ---
const firebaseConfig = {
  apiKey: "AIzaSyC2l8LU3vYfQjTly8JSa658mfIlVk2Dw8E",
  authDomain: "inovacao-emr.firebaseapp.com",
  projectId: "inovacao-emr",
  storageBucket: "inovacao-emr.firebasestorage.app",
  messagingSenderId: "1075399271811",
  appId: "1:1075399271811:web:f532f1d6fa2b21c53c2ff3"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// --- TOAST (Feedback Visual) ---
function showToast(message, type = "info") {
  const container = document.getElementById("toastContainer");
  if (!container) return;
  
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  
  // Animação de entrada e saída
  setTimeout(() => {
    toast.style.opacity = "0";
    setTimeout(() => toast.remove(), 500);
  }, 3000);
}

// --- LOGIN ---
const loginBtn = document.getElementById("loginBtn");
if (loginBtn) {
  loginBtn.addEventListener("click", async () => {
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value.trim();

    if (!email || !password) return showToast("Preencha e-mail e senha.", "error");

    loginBtn.textContent = "Entrando...";
    loginBtn.disabled = true;

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Busca dados complementares
      const docRef = doc(db, "atletas", user.uid);
      const docSnap = await getDoc(docRef);
      
      let nome = "Usuário";
      let grupo = "atleta";

      if (docSnap.exists()) {
        const data = docSnap.data();
        nome = data.nome || nome;
        grupo = data.grupo || grupo;
      }

      // SALVA TUDO QUE O PORTAL PRECISA
      localStorage.setItem("userName", nome);
      localStorage.setItem("userGroup", grupo);
      localStorage.setItem("userEmail", user.email); // CRUCIAL PARA O ADMIN

      showToast("Login realizado!", "success");
      setTimeout(() => window.location.href = "portal.html", 1000);

    } catch (error) {
      console.error(error);
      showToast("Erro ao entrar. Verifique suas credenciais.", "error");
      loginBtn.textContent = "Entrar";
      loginBtn.disabled = false;
    }
  });
}

// --- CADASTRO (Lógica mantida, simplificada para brevidade) ---
// ... (Mantenha a lógica de cadastro existente ou remova se só o admin for usar agora) ...
// Para garantir que o login funcione, certifique-se de que o usuário marcospauloserra@outlook.com.br
// foi criado no Firebase Authentication. Se não foi, use a aba de cadastro uma vez para criá-lo.
