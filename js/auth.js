import { 
  initializeApp 
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";

import { 
  getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, fetchSignInMethodsForEmail 
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

import { 
  getFirestore, doc, setDoc, getDoc, collection, getDocs, query, where 
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// ----------------------
// 🔧 CONFIG FIREBASE
// ----------------------
const firebaseConfig = {
  apiKey: "AIzaSyC2l8LU3vYfQjTly8JSa658mfIlVk2Dw8E",
  authDomain: "inovacao-emr.firebaseapp.com",
  projectId: "inovacao-emr",
  storageBucket: "inovacao-emr.appspot.com",
  messagingSenderId: "1075399271811",
  appId: "1:1075399271811:web:f532f25547125d6a8f42b6"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// ----------------------
// 🔔 TOAST MODERNO
// ----------------------
function showToast(message, type = "info") {
  const toastContainer = document.getElementById("toastContainer");
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.textContent = message;

  toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = "toastOut 0.4s ease forwards";
    setTimeout(() => toast.remove(), 400);
  }, 3500);
}

// ----------------------
// 🧹 LIMPAR CAMPOS
// ----------------------
function clearRegisterFields() {
  document.getElementById("nameRegister").value = "";
  document.getElementById("emailRegister").value = "";
  document.getElementById("passwordRegister").value = "";
  document.getElementById("teamRegister").value = "";
  document.querySelectorAll(".team-btn").forEach(b => b.classList.remove("active"));
}

// ----------------------
// 📧 VALIDAÇÃO DE EMAIL
// ----------------------
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// ----------------------
// ✳️ ABRIR MODAL DE CADASTRO
// ----------------------
document.getElementById("showRegister").addEventListener("click", () => {
  document.getElementById("registerModal").style.display = "flex";
  clearRegisterFields();
});

// ----------------------
// ❌ FECHAR MODAL
// ----------------------
document.getElementById("closeModal").addEventListener("click", () => {
  document.getElementById("registerModal").style.display = "none";
});

// ----------------------
// 🏃 LOGIN
// ----------------------
document.getElementById("loginBtn").addEventListener("click", async () => {
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();

  if (!email || !password) {
    showToast("Informe o e-mail e a senha para entrar.", "error");
    return;
  }

  if (!isValidEmail(email)) {
    showToast("Formato de e-mail inválido. Verifique e tente novamente.", "error");
    return;
  }

  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // 🔍 Busca nome e grupo no Firestore
    const docRef = doc(db, "atletas", user.uid);
    const docSnap = await getDoc(docRef);

    let nomeUsuario = "Usuário";
    let grupo = "";

    if (docSnap.exists()) {
      const data = docSnap.data();
      nomeUsuario = data.nome || nomeUsuario;
      grupo = data.grupo || "";
    } else {
      nomeUsuario = user.email.split("@")[0];
    }

    // 💾 Armazena no localStorage
    localStorage.setItem("userName", nomeUsuario);
    localStorage.setItem("userGroup", grupo);

    showToast("Login realizado com sucesso! Redirecionando...", "success");

    setTimeout(() => {
      window.location.href = "portal.html";
    }, 1500);

  } catch (error) {
    let msg = "Não foi possível acessar sua conta. ";

    switch (error.code) {
      case "auth/invalid-credential":
      case "auth/wrong-password":
        msg += "Senha incorreta.";
        break;
      case "auth/user-not-found":
        msg += "Usuário não encontrado.";
        break;
      case "auth/too-many-requests":
        msg += "Muitas tentativas. Tente novamente mais tarde.";
        break;
      default:
        msg += "Verifique suas credenciais e tente novamente.";
        break;
    }

    showToast(msg, "error");
  }
});

// ----------------------
// 🏗️ CADASTRO
// ----------------------
document.getElementById("registerBtn").addEventListener("click", async () => {
  const name = document.getElementById("nameRegister").value.trim();
  const email = document.getElementById("emailRegister").value.trim();
  const password = document.getElementById("passwordRegister").value.trim();
  const team = document.getElementById("teamRegister").value;

  if (!name || !email || !password || !team) {
    showToast("Preencha todos os campos e selecione seu grupo.", "error");
    return;
  }

  if (!isValidEmail(email)) {
    showToast("Formato de e-mail inválido. Verifique e tente novamente.", "error");
    return;
  }

  // 🔍 Verifica se o e-mail já existe
  try {
    const methods = await fetchSignInMethodsForEmail(auth, email);
    if (methods.length > 0) {
      showToast("Este e-mail já está cadastrado. Tente fazer login.", "error");
      return;
    }
  } catch {
    showToast("Erro ao verificar o e-mail. Tente novamente.", "error");
    return;
  }

  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // 🔖 Grava dados adicionais no Firestore
    await setDoc(doc(db, "atletas", user.uid), {
      nome: name,
      email: email,
      grupo: team,
      criadoEm: new Date().toISOString()
    });

    // 💾 Salva no localStorage para exibição imediata
    localStorage.setItem("userName", name);
    localStorage.setItem("userGroup", team);

    showToast("Cadastro realizado com sucesso! Você já pode acessar sua conta.", "success");
    document.getElementById("registerModal").style.display = "none";
    clearRegisterFields();

  } catch (error) {
    let msg = "Não foi possível concluir o cadastro. ";

    switch (error.code) {
      case "auth/email-already-in-use":
        msg += "Este e-mail já está cadastrado.";
        break;
      case "auth/invalid-email":
        msg += "O e-mail informado é inválido.";
        break;
      case "auth/weak-password":
        msg += "A senha deve ter pelo menos 6 caracteres.";
        break;
      default:
        msg += "Verifique as informações e tente novamente.";
        break;
    }

    showToast(msg, "error");
  }
});

// ----------------------
// 🏅 SELEÇÃO DE GRUPO
// ----------------------
document.querySelectorAll(".team-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".team-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    document.getElementById("teamRegister").value = btn.dataset.value;
  });
});
