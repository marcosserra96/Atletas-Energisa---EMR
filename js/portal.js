// Importa do arquivo central (resolvendo o conflito de versões)
import { 
  db, auth, collection, getDocs, doc, setDoc, getDoc, updateDoc, addDoc, signOut 
} from "./firebase.js";

// --- VARIÁVEIS ---
const userName = localStorage.getItem("userName") || "Atleta";
const userEmail = localStorage.getItem("userEmail") || "";
const userGroup = localStorage.getItem("userGroup") || "atleta";
const ADMIN_EMAIL = "marcospauloserra@outlook.com.br";
const isAdmin = userEmail.toLowerCase() === ADMIN_EMAIL.toLowerCase();

// --- INICIALIZAÇÃO ---
window.addEventListener("DOMContentLoaded", async () => {
  console.log("Portal Iniciado. Admin?", isAdmin);
  
  setupUI();
  setupNavigation();
  
  // Verifica retorno do Strava (se houver código na URL)
  await verificarCallbackStrava();

  // Carrega os dados
  carregarDashboard();

  // Ativa ícones
  lucide.createIcons();

  // Botão Sair
  document.getElementById("logoutBtn").addEventListener("click", () => {
    signOut(auth).then(() => {
      localStorage.clear();
      window.location.href = "index.html";
    });
  });

  // Botão Tema
  const themeToggle = document.getElementById("theme-toggle");
  if(themeToggle) {
    themeToggle.addEventListener("click", () => {
      const body = document.body;
      const isDark = body.getAttribute("data-theme") === "dark";
      body.setAttribute("data-theme", isDark ? "light" : "dark");
      themeToggle.innerHTML = isDark ? '<i data-lucide="moon"></i>' : '<i data-lucide="sun"></i>';
      lucide.createIcons();
    });
  }
});

// --- UI & PERMISSÕES ---
function setupUI() {
  // Nome no topo
  const nomePrimeiro = userName.split(" ")[0];
  const titulo = document.querySelector(".portal-nome");
  if(titulo) titulo.textContent = `Olá, ${nomePrimeiro}`;
  
  // Nome na direita (se houver o elemento)
  const userSpan = document.getElementById("userName");
  if(userSpan) userSpan.textContent = nomePrimeiro;

  // Badge
  const badge = document.getElementById("userGroupBadge");
  if(badge) {
    badge.textContent = isAdmin ? "Administrador" : userGroup.toUpperCase();
    if(isAdmin) badge.style.background = "#e63946";
  }

  // Remove itens de Admin para quem não é
  if (!isAdmin) {
    document.querySelectorAll(".admin-only").forEach(el => el.remove());
  } else {
    configurarAdminStrava();
    configurarNovoEvento(); // Habilita o botão para Admin
    carregarListaAtletas(); // Carrega tabela para Admin
  }
}

// --- DASHBOARD ---
async function carregarDashboard() {
  const container = document.getElementById("dashboardCards");
  const titulo = document.getElementById("tituloDashboard");
  
  if (!container) return; // Proteção

  // -- MODO ADMIN --
  if(isAdmin) {
    if(titulo) titulo.textContent = "Painel de Controle";
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
          <i data-lucide="settings"></i>
          <h3>Sistema</h3>
          <p>Ativo</p>
        </div>
      `;
    } catch(e) { 
      console.error(e);
      container.innerHTML = "<p>Erro ao carregar dados. Verifique o console.</p>"; 
    }
  } 
  // -- MODO ATLETA --
  else {
    if(titulo) titulo.textContent = "Seu Desempenho";
    const stravaToken = localStorage.getItem("strava_access_token");

    if (stravaToken) {
      container.innerHTML = `<p>Sincronizando Strava...</p>`;
      try {
        const stats = await buscarDadosStrava(stravaToken);
        container.innerHTML = `
          <div class="card">
            <i data-lucide="map" style="color:#fc4c02"></i>
            <h3>Distância</h3>
            <p style="color:#fc4c02">${stats.distancia} km</p>
          </div>
          <div class="card">
            <i data-lucide="activity"></i>
            <h3>Atividades</h3>
            <p>${stats.count}</p>
          </div>
        `;
      } catch (error) {
        container.innerHTML = `<div class="card"><p style="color:red">Reconecte o Strava.</p></div>`;
      }
    } else {
      container.innerHTML = `
        <div class="card">
          <i data-lucide="trophy"></i>
          <h3>Pontos</h3>
          <p>0</p>
        </div>
        <div class="card">
          <i data-lucide="alert-circle"></i>
          <h3>Aviso</h3>
          <p style="font-size:1rem; font-weight:400">Conecte o Strava em Configurações.</p>
        </div>
      `;
    }
  }
  lucide.createIcons();
}

// --- GESTÃO DE ATLETAS (ADMIN) ---
async function carregarListaAtletas() {
  const tbody = document.getElementById("listaAtletas");
  if (!tbody) return;

  try {
    const querySnapshot = await getDocs(collection(db, "atletas"));
    tbody.innerHTML = "";
    
    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${data.nome || "-"}</td>
        <td>${data.grupo || "-"}</td>
        <td>Ativo</td>
        <td><button class="btn-acao btn-mini">Editar</button></td>
      `;
      tbody.appendChild(tr);
    });
  } catch(e) {
    console.error("Erro lista atletas:", e);
    tbody.innerHTML = "<tr><td colspan='4'>Erro ao carregar.</td></tr>";
  }
}

// --- EVENTOS (ADMIN) ---
function configurarNovoEvento() {
  const btn = document.getElementById("novoEventoBtn");
  // Como não temos o modal no HTML que passei antes, vamos simular ou alertar
  // Se quiser o modal completo, precisa garantir que o HTML tenha a div id="modalEvento"
  if(btn) {
    btn.addEventListener("click", () => {
      const titulo = prompt("Nome do Evento:");
      if(titulo) {
        addDoc(collection(db, "eventos"), {
          titulo: titulo,
          data: new Date().toISOString(),
          criadoPor: userEmail
        }).then(() => {
          alert("Evento criado!");
          carregarDashboard(); // Atualiza contadores
        });
      }
    });
  }
}

// --- STRAVA (Lógica Simplificada) ---
async function buscarDadosStrava(token) {
  // Simulação de busca real para evitar erros de CORS local
  // Se estiver rodando localmente, isso falhará sem extensão CORS, então retorne dados seguros
  try {
     const response = await fetch("https://www.strava.com/api/v3/athlete/activities?per_page=30", {
       headers: { "Authorization": `Bearer ${token}` }
     });
     if (!response.ok) throw new Error("Erro API");
     const data = await response.json();
     let dist = 0;
     data.forEach(d => dist += d.distance);
     return { distancia: (dist/1000).toFixed(1), count: data.length };
  } catch(e) {
     console.warn("Falha Strava (provavel CORS):", e);
     return { distancia: "0.0", count: 0 }; 
  }
}

const btnConnect = document.getElementById("btnConnectStrava");
if(btnConnect) {
  btnConnect.addEventListener("click", async () => {
    try {
      const docSnap = await getDoc(doc(db, "config_sistema", "strava"));
      if(docSnap.exists()) {
         const { client_id } = docSnap.data();
         const redirect = window.location.href.split('?')[0];
         window.location.href = `http://www.strava.com/oauth/authorize?client_id=${client_id}&response_type=code&redirect_uri=${redirect}&approval_prompt=force&scope=activity:read_all`;
      } else {
        alert("Admin não configurou Strava ainda.");
      }
    } catch(e) { console.error(e); }
  });
}

async function verificarCallbackStrava() {
  const params = new URLSearchParams(window.location.search);
  const code = params.get("code");
  if (code) {
    window.history.replaceState({}, document.title, window.location.pathname);
    // Aqui trocariamos o token. Para simplificar e não travar:
    alert("Código recebido! (Em produção, trocaria por Token via Backend)");
    // Simulamos um token para ver a tela funcionar
    localStorage.setItem("strava_access_token", "token_simulado");
    carregarDashboard();
  }
}

function configurarAdminStrava() {
  const btn = document.getElementById("btnSalvarConfigStrava");
  if(btn) {
    btn.addEventListener("click", async () => {
       const id = document.getElementById("stravaClientId").value;
       const secret = document.getElementById("stravaClientSecret").value;
       await setDoc(doc(db, "config_sistema", "strava"), { client_id: id, client_secret: secret });
       alert("Salvo!");
    });
  }
}

// --- NAVEGAÇÃO ---
function setupNavigation() {
  document.querySelectorAll(".menu-item").forEach(menu => {
    menu.addEventListener("click", () => {
      document.querySelectorAll(".menu-item").forEach(m => m.classList.remove("active"));
      menu.classList.add("active");
      const target = menu.dataset.section;
      document.querySelectorAll("main section").forEach(s => {
        s.classList.remove("active-section");
        if(s.id === target) s.classList.add("active-section");
      });
      lucide.createIcons();
    });
  });
}
