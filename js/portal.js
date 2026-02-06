import { db } from "./firebase.js";
import {
  collection, getDocs, doc, setDoc, getDoc, updateDoc
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

// --- VARIÁVEIS DE ESTADO ---
const userName = localStorage.getItem("userName") || "Atleta";
const userEmail = localStorage.getItem("userEmail") || "";
const userGroup = localStorage.getItem("userGroup") || "atleta";
const userID = localStorage.getItem("userID"); // Precisamos garantir que isso exista no auth.js, ou buscamos pelo email
const ADMIN_EMAIL = "marcospauloserra@outlook.com.br";

const isAdmin = userEmail.toLowerCase() === ADMIN_EMAIL.toLowerCase();

// =====================================================
// 🚀 INICIALIZAÇÃO
// =====================================================
window.addEventListener("DOMContentLoaded", async () => {
  setupUI();
  setupNavigation();
  
  // 1. Verifica se voltou do Strava com código
  await verificarCallbackStrava();

  // 2. Carrega Dashboard (com dados reais se tiver token)
  carregarDashboard();

  lucide.createIcons();

  // Eventos Globais
  document.getElementById("logoutBtn").addEventListener("click", () => {
    localStorage.clear();
    window.location.href = "index.html";
  });

  const themeToggle = document.getElementById("theme-toggle");
  themeToggle.addEventListener("click", () => {
    const body = document.body;
    const isDark = body.getAttribute("data-theme") === "dark";
    body.setAttribute("data-theme", isDark ? "light" : "dark");
    themeToggle.innerHTML = isDark ? '<i data-lucide="moon"></i>' : '<i data-lucide="sun"></i>';
    lucide.createIcons();
  });
});

// =====================================================
// 🔐 UI & PERMISSÕES
// =====================================================
function setupUI() {
  const nomePrimeiro = userName.split(" ")[0];
  const titulo = document.querySelector(".portal-nome");
  if(titulo) titulo.textContent = `Olá, ${nomePrimeiro}`;

  const badge = document.getElementById("userGroupBadge");
  if(badge) {
    badge.textContent = isAdmin ? "Administrador" : userGroup.toUpperCase();
    if(isAdmin) badge.style.background = "#e63946";
  }

  // Remove itens de Admin para Atletas
  if (!isAdmin) {
    document.querySelectorAll(".admin-only").forEach(el => el.remove());
  } else {
    configurarAdminStrava(); // Carrega inputs do admin
  }
}

// =====================================================
// 📊 DASHBOARD (AGORA COM DADOS REAIS)
// =====================================================
async function carregarDashboard() {
  const container = document.getElementById("dashboardCards");
  const titulo = document.getElementById("tituloDashboard");
  
  // -- MODO ADMINISTRADOR --
  if(isAdmin) {
    titulo.textContent = "Painel de Controle";
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
    } catch(e) { container.innerHTML = "<p>Erro ao carregar dados admin.</p>"; }
    lucide.createIcons();
    return;
  } 

  // -- MODO ATLETA (DADOS REAIS) --
  titulo.textContent = "Seu Desempenho";
  
  // Verifica se temos token do Strava salvo
  const stravaToken = localStorage.getItem("strava_access_token");

  if (stravaToken) {
    container.innerHTML = `<p>Buscando suas atividades no Strava...</p>`;
    
    try {
      const stats = await buscarDadosStrava(stravaToken);
      
      container.innerHTML = `
        <div class="card">
          <i data-lucide="map" style="color:#fc4c02"></i>
          <h3>Distância Total</h3>
          <p style="color:#fc4c02">${stats.distancia} km</p>
        </div>
        <div class="card">
          <i data-lucide="activity"></i>
          <h3>Atividades</h3>
          <p>${stats.count}</p>
        </div>
        <div class="card">
          <i data-lucide="trophy"></i>
          <h3>Pontos Estimados</h3>
          <p>${Math.floor(stats.distancia * 10)}</p>
        </div>
      `;
    } catch (error) {
      console.error(error);
      container.innerHTML = `
        <div class="card" style="border: 1px solid red">
          <p style="color:red">Erro na conexão Strava. Tente reconectar.</p>
        </div>
      `;
      // Se der erro de token expirado, removemos para forçar login
      if(error.message.includes("401")) localStorage.removeItem("strava_access_token");
    }

  } else {
    // Sem token: Mostra zeros
    container.innerHTML = `
      <div class="card">
        <i data-lucide="trophy" style="color:#aaa"></i>
        <h3>Pontos</h3>
        <p style="color:#aaa">0</p>
      </div>
      <div class="card">
        <i data-lucide="activity"></i>
        <h3>Atividades</h3>
        <p>0</p>
        <small>Conecte o Strava nas configurações</small>
      </div>
    `;
  }
  lucide.createIcons();
}

// =====================================================
// 🚴 LÓGICA DO STRAVA (API REAL)
// =====================================================

// 1. Busca Atividades na API do Strava
async function buscarDadosStrava(token) {
  // Pega as últimas 30 atividades
  const response = await fetch("https://www.strava.com/api/v3/athlete/activities?per_page=30", {
    headers: { "Authorization": `Bearer ${token}` }
  });

  if (!response.ok) throw new Error(`Erro Strava: ${response.status}`);

  const atividades = await response.json();
  
  // Soma a distância (vem em metros, converter para KM)
  let totalMetros = 0;
  atividades.forEach(act => {
    // Filtra apenas se for bike ou corrida dependendo do grupo do usuário se quiser
    totalMetros += act.distance; 
  });

  return {
    distancia: (totalMetros / 1000).toFixed(1),
    count: atividades.length
  };
}

// 2. Inicia o Login (Botão Conectar)
const btnConnect = document.getElementById("btnConnectStrava");
if(btnConnect) {
  btnConnect.addEventListener("click", async () => {
    try {
      // Busca Client ID configurado pelo Admin
      const docSnap = await getDoc(doc(db, "config_sistema", "strava"));
      if (!docSnap.exists()) return alert("Administrador ainda não configurou o ID do Strava.");
      
      const clientId = docSnap.data().client_id;
      const redirectUri = window.location.href.split('?')[0]; // URL atual limpa
      const scope = "activity:read_all";
      
      // Redireciona
      window.location.href = `http://www.strava.com/oauth/authorize?client_id=${clientId}&response_type=code&redirect_uri=${redirectUri}&approval_prompt=force&scope=${scope}`;
    } catch(e) {
      alert("Erro ao iniciar conexão: " + e.message);
    }
  });
}

// 3. Volta do Strava (Callback)
async function verificarCallbackStrava() {
  const params = new URLSearchParams(window.location.search);
  const code = params.get("code");

  if (code) {
    // Limpa a URL para não ficar feio
    window.history.replaceState({}, document.title, window.location.pathname);
    
    try {
      showToast("Conectando ao Strava...", "info");
      
      // Busca segredo para troca (CUIDADO: Isso é inseguro no front, mas necessário sem backend)
      const docSnap = await getDoc(doc(db, "config_sistema", "strava"));
      if (!docSnap.exists()) throw new Error("Configuração Strava não encontrada.");
      
      const { client_id, client_secret } = docSnap.data();

      // Tenta trocar Code por Token
      const tokenUrl = `https://www.strava.com/oauth/token`;
      const payload = new URLSearchParams({
        client_id,
        client_secret,
        code,
        grant_type: 'authorization_code'
      });

      const response = await fetch(tokenUrl, { method: 'POST', body: payload });
      const data = await response.json();

      if (data.access_token) {
        // Salva Token no Navegador do usuário
        localStorage.setItem("strava_access_token", data.access_token);
        localStorage.setItem("strava_refresh_token", data.refresh_token); // Para uso futuro
        localStorage.setItem("strava_expires_at", data.expires_at);

        showToast("Strava Conectado com Sucesso!", "success");
        // Recarrega dashboard para mostrar dados
        carregarDashboard();
      } else {
        throw new Error("Strava não retornou token.");
      }

    } catch (error) {
      console.error(error);
      showToast("Erro na conexão. Verifique o Console.", "error");
      alert("Atenção: Se deu erro de CORS, é porque o Strava bloqueia localhost/frontend. Para funcionar 100% precisa de Cloud Functions. Mas verifique suas chaves.");
    }
  }
}

// =====================================================
// ⚙️ ADMINISTRAÇÃO
// =====================================================
async function configurarAdminStrava() {
  const btnSalvar = document.getElementById("btnSalvarConfigStrava");
  if(!btnSalvar) return;

  // Carregar
  try {
    const docSnap = await getDoc(doc(db, "config_sistema", "strava"));
    if (docSnap.exists()) {
      document.getElementById("stravaClientId").value = docSnap.data().client_id || "";
      // Secret não mostramos ou mostramos asteriscos se quiser
    }
  } catch(e) { console.log("Erro ler config admin", e); }

  // Salvar
  btnSalvar.addEventListener("click", async () => {
    const client_id = document.getElementById("stravaClientId").value;
    const client_secret = document.getElementById("stravaClientSecret").value;

    if(!client_id || !client_secret) return alert("Preencha tudo.");

    await setDoc(doc(db, "config_sistema", "strava"), {
      client_id, client_secret
    });
    alert("Configurações salvas!");
  });
}

// =====================================================
// 🧭 NAVEGAÇÃO
// =====================================================
function setupNavigation() {
  const menus = document.querySelectorAll(".menu-item");
  menus.forEach(menu => {
    menu.addEventListener("click", () => {
      menus.forEach(m => m.classList.remove("active"));
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

// Helper Toast
function showToast(msg, type="info") {
  const div = document.createElement("div");
  div.className = `toast ${type}`;
  div.textContent = msg;
  div.style.cssText = "position:fixed; top:20px; right:20px; padding:15px; background:#333; color:#fff; border-radius:8px; z-index:9999;";
  if(type==="success") div.style.background = "#00b37e";
  if(type==="error") div.style.background = "#e63946";
  document.body.appendChild(div);
  setTimeout(()=>div.remove(), 4000);
}
