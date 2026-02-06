import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { 
  getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword 
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import { 
  getFirestore, doc, setDoc, getDoc 
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

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

// Toast
function showToast(msg, type = "info") {
  const container = document.getElementById("toastContainer");
  if(!container) return;
  const t = document.createElement("div");
  t.className = `toast ${type}`;
  t.textContent = msg;
  t.style.zIndex = "9999";
  container.appendChild(t);
  setTimeout(() => t.remove(), 4000);
}

// === LOGIN ===
const loginBtn = document.getElementById("loginBtn");
if (loginBtn) {
  loginBtn.addEventListener("click", async (e) => {
    e.preventDefault();
    const email = document.getElementById("email").value;
    const pass = document.getElementById("password").value;

    if (!email || !pass) return showToast("Preencha e-mail e senha", "error");

    loginBtn.textContent = "Entrando...";
    try {
      const cred = await signInWithEmailAndPassword(auth, email, pass);
      const snap = await getDoc(doc(db, "atletas", cred.user.uid));
      
      let nome = "Usuário";
      let grupo = "atleta";
      
      if (snap.exists()) {
        nome = snap.data().nome;
        grupo = snap.data().grupo;
      }

      localStorage.setItem("userName", nome);
      localStorage.setItem("userGroup", grupo);
      localStorage.setItem("userEmail", email);

      window.location.href = "portal.html";
    } catch (err) {
      console.error(err);
      showToast("Erro no login. Verifique os dados.", "error");
      loginBtn.textContent = "Entrar";
    }
  });
}

// === CADASTRO ===
const regBtn = document.getElementById("registerBtn");
if (regBtn) {
  regBtn.addEventListener("click", async (e) => {
    e.preventDefault();
    const nome = document.getElementById("nameRegister").value;
    const email = document.getElementById("emailRegister").value;
    const pass = document.getElementById("passwordRegister").value;
    const grupo = document.getElementById("teamRegister").value;

    if (!nome || !email || !pass || !grupo) {
      return showToast("Preencha tudo e escolha um grupo!", "error");
    }

    regBtn.textContent = "Criando...";
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, pass);
      await setDoc(doc(db, "atletas", cred.user.uid), {
        nome, email, grupo, criadoEm: new Date().toISOString()
      });

      localStorage.setItem("userName", nome);
      localStorage.setItem("userGroup", grupo);
      localStorage.setItem("userEmail", email);

      showToast("Conta criada!", "success");
      setTimeout(() => window.location.href = "portal.html", 1500);
    } catch (err) {
      console.error(err);
      showToast("Erro ao criar conta: " + err.code, "error");
      regBtn.textContent = "Cadastrar";
    }
  });
}

// Botões de Grupo
document.querySelectorAll(".team-btn").forEach(btn => {
  btn.addEventListener("click", (e) => {
    e.preventDefault();
    document.querySelectorAll(".team-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    document.getElementById("teamRegister").value = btn.dataset.value;
  });
});

// Modais
document.getElementById("showRegister")?.addEventListener("click", () => {
  document.getElementById("registerModal").style.display = "flex";
});
document.getElementById("closeModal")?.addEventListener("click", () => {
  document.getElementById("registerModal").style.display = "none";
});
