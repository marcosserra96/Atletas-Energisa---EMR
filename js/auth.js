// Importa tudo do nosso arquivo central
import { 
  auth, db, doc, setDoc, getDoc, 
  signInWithEmailAndPassword, createUserWithEmailAndPassword 
} from "./firebase.js";

// --- TOAST (Aviso Visual) ---
function showToast(message, type = "info") {
  const container = document.getElementById("toastContainer");
  if (!container) return;
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.textContent = message;
  toast.style.zIndex = "10000";
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 4000);
}

// --- LOGIN ---
const loginBtn = document.getElementById("loginBtn");
if (loginBtn) {
  loginBtn.addEventListener("click", async (e) => {
    e.preventDefault();
    const email = document.getElementById("email").value.trim();
    const pass = document.getElementById("password").value.trim();

    if (!email || !pass) return showToast("Preencha e-mail e senha", "error");

    loginBtn.textContent = "Entrando...";
    
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, pass);
      const user = userCredential.user;

      // Busca dados no Banco
      const docRef = doc(db, "atletas", user.uid);
      const docSnap = await getDoc(docRef);
      
      let nome = "Usuário";
      let grupo = "atleta";

      if (docSnap.exists()) {
        const data = docSnap.data();
        nome = data.nome || nome;
        grupo = data.grupo || grupo;
      }

      // Salva no Navegador
      localStorage.setItem("userName", nome);
      localStorage.setItem("userGroup", grupo);
      localStorage.setItem("userEmail", user.email);

      showToast("Sucesso! Redirecionando...", "success");
      setTimeout(() => window.location.href = "portal.html", 1000);

    } catch (error) {
      console.error(error);
      showToast("Erro ao entrar. Verifique seus dados.", "error");
      loginBtn.textContent = "Entrar";
    }
  });
}

// --- CADASTRO ---
const registerBtn = document.getElementById("registerBtn");
if (registerBtn) {
  registerBtn.addEventListener("click", async (e) => {
    e.preventDefault();
    const nome = document.getElementById("nameRegister").value;
    const email = document.getElementById("emailRegister").value;
    const pass = document.getElementById("passwordRegister").value;
    const grupo = document.getElementById("teamRegister").value;

    if (!nome || !email || !pass || !grupo) {
      return showToast("Preencha tudo e escolha um grupo!", "error");
    }

    registerBtn.textContent = "Criando...";
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, pass);
      
      // Salva no Banco
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
      showToast("Erro ao cadastrar.", "error");
      registerBtn.textContent = "Cadastrar";
    }
  });
}

// Lógica Visual (Modais e Botões de Grupo)
document.querySelectorAll(".team-btn").forEach(btn => {
  btn.addEventListener("click", (e) => {
    e.preventDefault();
    document.querySelectorAll(".team-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    document.getElementById("teamRegister").value = btn.dataset.value;
  });
});

document.getElementById("showRegister")?.addEventListener("click", () => {
  document.getElementById("registerModal").style.display = "flex";
});
document.getElementById("closeModal")?.addEventListener("click", () => {
  document.getElementById("registerModal").style.display = "none";
});
