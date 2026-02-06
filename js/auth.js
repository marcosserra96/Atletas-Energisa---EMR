import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { 
  getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, fetchSignInMethodsForEmail 
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import { 
  getFirestore, doc, setDoc, getDoc 
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

// --- 1. CONFIGURAÇÃO ---
const firebaseConfig = {
  apiKey: "AIzaSyC2l8LU3vYfQjTly8JSa658mfIlVk2Dw8E",
  authDomain: "inovacao-emr.firebaseapp.com",
  projectId: "inovacao-emr",
  storageBucket: "inovacao-emr.firebasestorage.app",
  messagingSenderId: "1075399271811",
  appId: "1:1075399271811:web:f532f1d6fa2b21c53c2ff3"
};

// Inicializa Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

console.log("Sistema de Autenticação carregado."); // Debug para confirmar carregamento

// --- 2. FUNÇÕES VISUAIS (TOAST) ---
function showToast(message, type = "info") {
  const container = document.getElementById("toastContainer");
  if (!container) return console.warn("Toast container não encontrado!");
  
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.textContent = message;
  toast.style.zIndex = "10000"; // Força ficar acima do modal
  
  container.appendChild(toast);
  
  setTimeout(() => {
    toast.style.opacity = "0";
    setTimeout(() => toast.remove(), 500);
  }, 4000);
}

// Validação de Email simples
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// --- 3. LÓGICA DE LOGIN ---
const loginBtn = document.getElementById("loginBtn");
if (loginBtn) {
  loginBtn.addEventListener("click", async (e) => {
    e.preventDefault();
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value.trim();

    if (!email || !password) return showToast("Digite e-mail e senha.", "error");

    const btnText = loginBtn.textContent;
    loginBtn.textContent = "Verificando...";
    loginBtn.disabled = true;

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Busca dados extras no Firestore
      const docRef = doc(db, "atletas", user.uid);
      const docSnap = await getDoc(docRef);
      
      let nome = "Atleta";
      let grupo = "atleta";

      if (docSnap.exists()) {
        const data = docSnap.data();
        nome = data.nome || nome;
        grupo = data.grupo || grupo;
      }

      // Salva sessão
      localStorage.setItem("userName", nome);
      localStorage.setItem("userGroup", grupo);
      localStorage.setItem("userEmail", user.email);

      showToast("Login realizado! Redirecionando...", "success");
      setTimeout(() => window.location.href = "portal.html", 1000);

    } catch (error) {
      console.error("Erro Login:", error);
      let msg = "Falha ao entrar.";
      if (error.code === "auth/invalid-credential") msg = "E-mail ou senha incorretos.";
      showToast(msg, "error");
      loginBtn.textContent = btnText;
      loginBtn.disabled = false;
    }
  });
}

// --- 4. LÓGICA DE CADASTRO (DEBUGADA) ---
const registerBtn = document.getElementById("registerBtn");

if (registerBtn) {
  registerBtn.addEventListener("click", async (e) => {
    e.preventDefault(); // Evita recarregar a página
    console.log("Botão Cadastrar clicado!");

    // Coleta valores
    const nameInput = document.getElementById("nameRegister");
    const emailInput = document.getElementById("emailRegister");
    const passInput = document.getElementById("passwordRegister");
    const teamInput = document.getElementById("teamRegister");

    const name = nameInput ? nameInput.value.trim() : "";
    const email = emailInput ? emailInput.value.trim() : "";
    const password = passInput ? passInput.value.trim() : "";
    const team = teamInput ? teamInput.value : "";

    console.log("Dados:", { name, email, team }); // Debug

    // Validações explícitas
    if (!name) return showToast("Por favor, digite seu nome.", "error");
    if (!email || !isValidEmail(email)) return showToast("E-mail inválido.", "error");
    if (!password || password.length < 6) return showToast("A senha deve ter no mínimo 6 caracteres.", "error");
    if (!team) return showToast("Selecione um grupo (Bike, Corrida ou Comitê).", "error");

    // Feedback visual
    const originalText = registerBtn.textContent;
    registerBtn.textContent = "Criando conta...";
    registerBtn.disabled = true;

    try {
      // 1. Cria usuário no Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // 2. Salva no Firestore
      await setDoc(doc(db, "atletas", user.uid), {
        nome: name,
        email: email,
        grupo: team,
        criadoEm: new Date().toISOString()
      });

      // 3. Salva Sessão
      localStorage.setItem("userName", name);
      localStorage.setItem("userGroup", team);
      localStorage.setItem("userEmail", email);

      showToast("Conta criada com sucesso!", "success");
      
      setTimeout(() => {
        window.location.href = "portal.html";
      }, 1500);

    } catch (error) {
      console.error("Erro Cadastro:", error);
      let msg = "Erro ao criar conta.";
      if (error.code === "auth/email-already-in-use") msg = "Este e-mail já está cadastrado.";
      if (error.code === "auth/weak-password") msg = "Senha muito fraca.";
      
      showToast(msg, "error");
      registerBtn.textContent = originalText;
      registerBtn.disabled = false;
    }
  });
} else {
  console.error("Botão 'registerBtn' não encontrado no HTML!");
}

// --- 5. INTERFACE (MODAL & BOTÕES DE TIME) ---

// Abrir Modal
const showRegister = document.getElementById("showRegister");
if (showRegister) {
  showRegister.addEventListener("click", (e) => {
    e.preventDefault();
    const modal = document.getElementById("registerModal");
    if (modal) modal.style.display = "flex";
  });
}

// Fechar Modal
const closeModal = document.getElementById("closeModal");
if (closeModal) {
  closeModal.addEventListener("click", () => {
    const modal = document.getElementById("registerModal");
    if (modal) modal.style.display = "none";
  });
}

// Botões de Seleção de Time
const teamButtons = document.querySelectorAll(".team-btn");
teamButtons.forEach(btn => {
  btn.addEventListener("click", (e) => {
    e.preventDefault(); // Impede comportamento estranho de botão
    
    // Remove classe active de todos
    teamButtons.forEach(b => b.classList.remove("active"));
    
    // Adiciona ao clicado
    btn.classList.add("active");
    
    // Atualiza input oculto
    const val = btn.getAttribute("data-value");
    const inputHidden = document.getElementById("teamRegister");
    if (inputHidden) {
        inputHidden.value = val;
        console.log("Time selecionado:", val);
    }
  });
});
