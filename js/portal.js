import { 
  db, auth, collection, getDocs, doc, setDoc, getDoc, updateDoc, addDoc, signOut 
} from "./firebase.js";

// --- VARIÁVEIS GLOBAIS ---
const userName = localStorage.getItem("userName") || "Atleta";
const userEmail = localStorage.getItem("userEmail") || "";
const userGroup = localStorage.getItem("userGroup") || "atleta";
const ADMIN_EMAIL = "marcospauloserra@outlook.com.br";
const isAdmin = userEmail.toLowerCase() === ADMIN_EMAIL.toLowerCase();

// =====================================================
// 🚀 INICIALIZAÇÃO
// =====================================================
window.addEventListener("DOMContentLoaded", async () => {
  setupUI();
  setupNavigation();
  
  // 1. Verifica se estamos voltando do Strava com um código
  await verificarCallbackStrava();

  // 2. Carrega o Dashboard
  carregarDashboard();

  lucide.createIcons();
  configurarBotoesGlobais();
});

// =====================================================
// 🔐 UI & PERMISSÕES
// =====================================================
function setupUI() {
  // Nome e Grupo no Topo
  const nomePrimeiro = userName.split(" ")[0];
  const titulo = document.querySelector(".portal-nome");
  if(titulo) titulo.textContent = `Olá, ${nomePrimeiro}`;
  
  const userSpan = document.getElementById("userName");
  if(userSpan) userSpan.textContent = nomePrimeiro;

  const badge = document.getElementById("userGroupBadge");
  if(badge) {
    badge.textContent = isAdmin ? "Administrador" : userGroup.toUpperCase();
    badge.style.background = isAdmin ? "#e63946" : "rgba(255,255,255,0.2)";
  }

  // Controle de Visualização
  if (!isAdmin) {
    document.querySelectorAll(".admin-only").forEach(el => el.remove());
  } else {
    // Se for admin, ativa as funções de gestão
    configurarAdminStrava();
    carregarListaAtletas();
    configurarNovoEvento();
  }
}

// =====================================================
// 📊 DASHBOARD (CORAÇÃO DO SISTEMA)
// =====================================================
async function carregarDashboard() {
  const container = document.getElementById("dashboardCards");
  const titulo = document.getElementById("tituloDashboard");
  
  if (!container) return;

  // --- MODO ADMINISTRADOR ---
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
          <i data-lucide="server"></i>
          <h3>Status API</h3>
          <p style="color:var(--secondary); font-size:1rem;">Online</p>
        </div>
      `;
    } catch(e) { 
      container.innerHTML = "<p>Erro ao carregar dados.</p>"; 
    }
  } 
  
  // --- MODO ATLETA (DADOS REAIS) ---
  else {
    if(titulo) titulo.textContent = "Seu Desempenho";
    
    const stravaToken = localStorage.getItem("strava_access_token");

    if (stravaToken) {
      container.innerHTML = `<p>Sincronizando com Strava...</p>`;
      
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
            <h3>Pontos (Est.)</h3>
            <p>${Math.floor(stats.distancia * 10)}</p>
          </div>
        `;
      } catch (error) {
        console.error(error);
        // Se o token for inválido, limpa e pede login novo
        if(error.message.includes("401")) {
             localStorage.removeItem("strava_access_token");
             carregarDashboard(); // Recarrega para mostrar botão de conectar
        } else {
             container.innerHTML = `<div class="card"><p style="color:red">Erro na sincronização. Tente mais tarde.</p></div>`;
        }
      }
    } else {
      // Sem token: Mostra card de aviso
      container.innerHTML = `
        <div class="card">
          <i data-lucide="trophy" style="color:#ccc"></i>
          <h3>Pontos</h3>
          <p style="color:#ccc">0</p>
        </div>
        <div class="card" style="border-left: 4px solid #fc4c02;">
          <i data-lucide="alert-circle" style="color:#fc4c02"></i>
          <h3>Conectar</h3>
          <p style="font-size:0.9rem; font-weight:400; color:#666;">Vá em Configurações e conecte seu Strava.</p>
        </div>
      `;
    }
  }
  lucide.createIcons();
}

// =====================================================
// 🚴 INTEGRAÇÃO STRAVA (REAL)
// =====================================================

// 1. Iniciar Login (Botão Laranja)
const btnConnect = document.getElementById("btnConnectStrava");
if(btnConnect) {
  btnConnect.addEventListener("click", async () => {
    try {
      const docSnap = await getDoc(doc(db, "config_sistema", "strava"));
      if(docSnap.exists()) {
         const { client_id } = docSnap.data();
         if(!client_id) return alert("Erro: Admin não configurou o Client ID.");

         const redirect = window.location.href.split('?')[0];
         // Escopo importante: activity:read_all para ler seus pedais/corridas
         window.location.href = `http://www.strava.com/oauth/authorize?client_id=${client_id}&response_type=code&redirect_uri=${redirect}&approval_prompt=force&scope=activity:read_all`;
      } else {
        alert("Administrador ainda não configurou a API do Strava no painel.");
      }
    } catch(e) { console.error(e); alert("Erro de conexão."); }
  });
}

// 2. Processar Retorno (Callback)
async function verificarCallbackStrava() {
  const params = new URLSearchParams(window.location.search);
  const code = params.get("code");

  if (code) {
    // Limpa a URL para ficar bonita
    window.history.replaceState({}, document.title, window.location.pathname);
    
    showToast("Validando com Strava...", "info");

    try {
      // Pega o segredo no banco (Admin configurou)
      const docSnap = await getDoc(doc(db, "config_sistema", "strava"));
      if (!docSnap.exists()) throw new Error("Configuração não encontrada.");
      
      const { client_id, client_secret } = docSnap.data();

      // Troca CODE por TOKEN (POST Request)
      const response = await fetch('https://www.strava.com/oauth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: client_id,
          client_secret: client_secret,
          code: code,
          grant_type: 'authorization_code'
        })
      });

      const data = await response.json();

      if (data.access_token) {
        // Salva o token real
        localStorage.setItem("strava_access_token", data.access_token);
        showToast("Conectado com sucesso!", "success");
        // Recarrega para buscar dados imediatamente
        carregarDashboard();
      } else {
        console.error("Erro Strava:", data);
        showToast("Falha na autenticação Strava.", "error");
      }

    } catch (e) {
      console.error(e);
      showToast("Erro ao trocar token. Verifique o console.", "error");
      alert("Dica de Dev: Se deu erro de CORS no console, o navegador bloqueou. Em produção precisa de Backend, mas para localhost, use uma extensão 'Allow CORS' no Chrome.");
    }
  }
}

// 3. Buscar Atividades (GET Request)
async function buscarDadosStrava(token) {
  const response = await fetch("https://www.strava.com/api/v3/athlete/activities?per_page=30", {
    headers: { "Authorization": `Bearer ${token}` }
  });

  if (!response.ok) throw new Error(`Erro API Strava: ${response.status}`);

  const atividades = await response.json();
  
  let distanciaTotal = 0;
  atividades.forEach(atv => {
    // Soma distância (vem em metros)
    distanciaTotal += atv.distance;
  });

  // Retorna em KM com 1 casa decimal
  return {
    distancia: (distanciaTotal / 1000).toFixed(1),
    count: atividades.length
  };
}

// =====================================================
// ⚙️ FUNÇÕES DE ADMINISTRAÇÃO
// =====================================================
function configurarAdminStrava() {
  const btn = document.getElementById("btnSalvarConfigStrava");
  if(btn) {
    // Carregar valores atuais
    getDoc(doc(db, "config_sistema", "strava")).then(snap => {
      if(snap.exists()) {
        document.getElementById("stravaClientId").value = snap.data().client_id || "";
      }
    });

    // Salvar novos valores
    btn.addEventListener("click", async () => {
       const id = document.getElementById("stravaClientId").value;
       const secret = document.getElementById("stravaClientSecret").value;
       if(!id || !secret) return alert("Preencha ambos os campos.");

       await setDoc(doc(db, "config_sistema", "strava"), { client_id: id, client_secret: secret });
       alert("Credenciais salvas!");
    });
  }
}

async function carregarListaAtletas() {
  const tbody = document.getElementById("listaAtletas");
  if (!tbody) return;

  const snap = await getDocs(collection(db, "atletas"));
  tbody.innerHTML = "";
  
  snap.forEach(d => {
    const user = d.data();
    tbody.innerHTML += `
      <tr>
        <td>${user.nome}</td>
        <td><span style="background:#eee; padding:2px 6px; border-radius:4px; font-size:0.85rem">${user.grupo}</span></td>
        <td><span style="color:var(--secondary)">● Ativo</span></td>
        <td><button class="btn-acao" style="padding:4px 8px; font-size:0.8rem">Ver</button></td>
      </tr>
    `;
  });
}

function configurarNovoEvento() {
  const btn = document.getElementById("novoEventoBtn");
  if(btn) {
    btn.addEventListener("click", async () => {
      const nome = prompt("Nome do Evento:");
      if(nome) {
        await addDoc(collection(db, "eventos"), { titulo: nome, data: new Date().toISOString() });
        alert("Evento Criado!");
        carregarDashboard();
      }
    });
  }
}

// =====================================================
// 🧭 NAVEGAÇÃO & UTILITÁRIOS
// =====================================================
function configurarBotoesGlobais() {
  // Sair
  document.getElementById("logoutBtn").addEventListener("click", () => {
    signOut(auth).then(() => {
      localStorage.clear();
      window.location.href = "index.html";
    });
  });

  // Tema
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
}

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

function showToast(msg, type) {
  const t = document.createElement("div");
  t.textContent = msg;
  t.style.cssText = `
    position: fixed; top: 20px; right: 20px; 
    padding: 12px 20px; border-radius: 8px; color: white; 
    z-index: 10000; font-family: sans-serif; box-shadow: 0 4px 12px rgba(0,0,0,0.2);
    background: ${type === 'success' ? '#00b37e' : type === 'error' ? '#e63946' : '#009bc1'};
  `;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 4000);
}
