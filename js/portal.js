import { db } from "./firebase.js";
import {
  collection, getDocs, doc, setDoc, getDoc
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

// --- VARIÁVEIS ---
const userName = localStorage.getItem("userName") || "Atleta";
const userEmail = localStorage.getItem("userEmail") || "";
const userGroup = localStorage.getItem("userGroup") || "atleta";
const ADMIN_EMAIL = "marcospauloserra@outlook.com.br";

// É admin se o email bater
const isAdmin = userEmail.toLowerCase() === ADMIN_EMAIL.toLowerCase();

// --- INICIALIZAÇÃO ---
window.addEventListener("DOMContentLoaded", () => {
  setupUI();
  setupNavigation();
  loadDashboard();
  lucide.createIcons();

  // Botão Sair
  document.getElementById("logoutBtn").addEventListener("click", () => {
    localStorage.clear();
    window.location.href = "index.html";
  });

  // Tema Escuro
  const themeToggle = document.getElementById("theme-toggle");
  themeToggle.addEventListener("click", () => {
    const body = document.body;
    const isDark = body.getAttribute("data-theme") === "dark";
    body.setAttribute("data-theme", isDark ? "light" : "dark");
    themeToggle.innerHTML = isDark ? '<i data-lucide="moon"></i>' : '<i data-lucide="sun"></i>';
    lucide.createIcons();
  });
});

// --- UI & PERMISSÕES ---
function setupUI() {
  // Topo
  const nomePrimeiro = userName.split(" ")[0];
  const titulo = document.querySelector(".portal-nome");
  if(titulo) titulo.textContent = `Olá, ${nomePrimeiro}`;

  const badge = document.getElementById("userGroupBadge");
  if(badge) {
    badge.textContent = isAdmin ? "Administrador" : userGroup.toUpperCase();
    if(isAdmin) badge.style.background = "#e63946"; // Vermelho
  }

  // Esconde elementos Admin se não for o Marcos
  if (!isAdmin) {
    document.querySelectorAll(".admin-only").forEach(el => el.remove());
  } else {
    // Se for admin, carrega configs
    loadAdminConfigs();
  }
}

// --- DASHBOARD ---
async function loadDashboard() {
  const container = document.getElementById("dashboardCards");
  const titulo = document.getElementById("tituloDashboard");
  
  if(isAdmin) {
    titulo.textContent = "Visão Geral (Admin)";
    try {
      const users = await getDocs(collection(db, "atletas"));
      const events = await getDocs(collection(db, "eventos"));
      
      container.innerHTML = `
        <div class="card">
          <i data-lucide="users"></i>
          <h3>Atletas</h3>
          <p>${users.size}</p>
        </div>
        <div class="card">
          <i data-lucide="calendar"></i>
          <h3>Eventos</h3>
          <p>${events.size}</p>
        </div>
        <div class="card">
          <i data-lucide="target"></i>
          <h3>Metas</h3>
          <p>85%</p>
        </div>
      `;
    } catch(e) { container.innerHTML = "<p>Erro ao carregar dados.</p>"; }
  } else {
    titulo.textContent = "Seu Desempenho";
    container.innerHTML = `
      <div class="card">
        <i data-lucide="trophy" style="color:var(--accent)"></i>
        <h3>Pontos</h3>
        <p style="color:var(--accent)">1.250</p>
      </div>
      <div class="card">
        <i data-lucide="activity"></i>
        <h3>Atividades</h3>
        <p>12</p>
      </div>
      <div class="card">
        <i data-lucide="calendar-check"></i>
        <h3>Presença</h3>
        <p>100%</p>
      </div>
    `;
  }
  lucide.createIcons();
}

// --- NAVEGAÇÃO ---
function setupNavigation() {
  const menus = document.querySelectorAll(".menu-item");
  menus.forEach(menu => {
    menu.addEventListener("click", () => {
      // Menu ativo
      menus.forEach(m => m.classList.remove("active"));
      menu.classList.add("active");

      // Seção ativa
      const target = menu.dataset.section;
      document.querySelectorAll("main section").forEach(s => {
        s.classList.remove("active-section");
        if(s.id === target) s.classList.add("active-section");
      });
      lucide.createIcons();
    });
  });
}

// --- STRAVA (ADMIN) ---
async function loadAdminConfigs() {
  try {
    const docSnap = await getDoc(doc(db, "config_sistema", "strava"));
    if (docSnap.exists()) {
      document.getElementById("stravaClientId").value = docSnap.data().client_id || "";
    }
    
    document.getElementById("btnSalvarConfigStrava").addEventListener("click", async () => {
      const id = document.getElementById("stravaClientId").value;
      const secret = document.getElementById("stravaClientSecret").value;
      await setDoc(doc(db, "config_sistema", "strava"), { client_id: id, client_secret: secret });
      alert("Salvo com sucesso!");
    });
  } catch(e) { console.log(e); }
}

// --- STRAVA (USER) ---
const btnConnect = document.getElementById("btnConnectStrava");
if(btnConnect) {
  btnConnect.addEventListener("click", () => {
    alert("Redirecionando para login no Strava...");
    // Aqui virá a lógica do OAuth
  });
}
