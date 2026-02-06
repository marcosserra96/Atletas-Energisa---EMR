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

// --- FUNÇÕES AUXILIARES ---

// Toast (Mensagem na tela)
function showToast(message, type = "info") {
  const container = document.getElementById("toastContainer");
  if (!container) return;
  
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  
  // Remove após 3s
  setTimeout(() => {
    toast.style.opacity = "0";
    setTimeout(() => toast.remove(), 500);
  }, 3000);
}

// Validação de Email
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// --- LÓGICA DE LOGIN ---
const loginBtn = document.getElementById("loginBtn");
if (loginBtn) {
  loginBtn.addEventListener("click", async () => {
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value.trim();

    if (!email || !password) return showToast("Preencha e-mail e senha.", "error");

    const originalText = loginBtn.textContent;
    loginBtn.textContent = "Entrando...";
    loginBtn.disabled = true;

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Busca dados do usuário
      const docRef = doc(db, "atletas", user.uid);
      const docSnap = await getDoc(docRef);
      
      let nome = "Usuário";
      let grupo = "atleta"; // Padrão

      if (docSnap.exists()) {
        const data = docSnap.data();
        nome = data.nome || nome;
        grupo = data.grupo || grupo;
      }

      // SALVA DADOS PARA O PORTAL
      localStorage.setItem("userName", nome);
      localStorage.setItem("userGroup", grupo);
      localStorage.setItem("userEmail", user.email); // CRUCIAL para identificar Admin

      showToast("Login realizado!", "success");
      setTimeout(() => window.location.href = "portal.html", 1000);

    } catch (error) {
      console.error(error);
      let msg = "Erro ao entrar. ";
      if (error.code === "auth/invalid-credential") msg += "Senha ou e-mail incorretos.";
      showToast(msg, "error");
      
      loginBtn.textContent = originalText;
      loginBtn.disabled = false;
    }
  });
}

// --- LÓGICA DE CADASTRO (Restaurada) ---
const registerBtn = document.getElementById("registerBtn");

if (registerBtn) {
  registerBtn.addEventListener("click", async () => {
    const name = document.getElementById("nameRegister").value.trim();
    const email = document.getElementById("emailRegister").value.trim();
    const password = document.getElementById("passwordRegister").value.trim();
    const team = document.getElementById("teamRegister").value;

    if (!name || !email || !password || !team) {
      showToast("Preencha todos os campos e selecione seu grupo.", "error");
      return;
    }

    if (!isValidEmail(email)) {
      showToast("E-mail inválido.", "error");
      return;
    }

    const originalText = registerBtn.textContent;
    registerBtn.textContent = "Cadastrando...";
    registerBtn.disabled = true;

    try {
      // Cria usuário no Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Salva detalhes no Firestore
      await setDoc(doc(db, "atletas", user.uid), {
        nome: name,
        email: email,
        grupo: team,
        criadoEm: new Date().toISOString()
      });

      // Salva no LocalStorage para login automático
      localStorage.setItem("userName", name);
      localStorage.setItem("userGroup", team);
      localStorage.setItem("userEmail", email);

      showToast("Cadastro realizado com sucesso!", "success");
      
      // Redireciona para o portal
      setTimeout(() => {
        window.location.href = "portal.html";
      }, 1500);

    } catch (error) {
      console.error(error);
      let msg = "Erro no cadastro. ";
      if (error.code === "auth/email-already-in-use") msg += "E-mail já está em uso.";
      if (error.code === "auth/weak-password") msg += "A senha deve ter pelo menos 6 caracteres.";
      
      showToast(msg, "error");
      registerBtn.textContent = originalText;
      registerBtn.disabled = false;
    }
  });
}

// --- INTERFACE (Modais e Botões) ---

// Abrir Modal
const showRegister = document.getElementById("showRegister");
if (showRegister) {
  showRegister.addEventListener("click", (e) => {
    e.preventDefault();
    document.getElementById("registerModal").style.display = "flex";
  });
}

// Fechar Modal
const closeModal = document.getElementById("closeModal");
if (closeModal) {
  closeModal.addEventListener("click", () => {
    document.getElementById("registerModal").style.display = "none";
  });
}

// Seleção de Grupo (Botões)
const teamButtons = document.querySelectorAll(".team-btn");
teamButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    teamButtons.forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    document.getElementById("teamRegister").value = btn.getAttribute("data-value");
  });
});
