import { db } from "./firebase.js";
import {
  collection, getDocs, doc, setDoc, getDoc
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

// --- VARIÁVEIS GLOBAIS DE ESTADO ---
const userEmail = localStorage.getItem("userEmail") || "";
const userName = localStorage.getItem("userName") || "Usuário";
// REGRA: Apenas este e-mail é admin. Todos os outros (incluindo 'comite') são visualizadores.
const ADMIN_EMAIL = "marcospauloserra@outlook.com.br";
const isAdmin = userEmail.toLowerCase() === ADMIN_EMAIL.toLowerCase();

// =====================================================
// 🚀 INICIALIZAÇÃO
// =====================================================
window.addEventListener("DOMContentLoaded", () => {
  // 1. Configurar Interface Base
  configurarTopo();
  
  // 2. Aplicar Permissões (Esconde/Mostra coisas)
  aplicarPermissoes();

  // 3. Ativar Navegação (Menu)
  inicializarNavegacao();

  // 4. Carregar Dados Iniciais
  carregarDashboard();

  // 5. Configurar Botões de Ação (Sair, Salvar, etc)
  configurarBotoesGlobais();

  // 6. Recriar ícones
  lucide.createIcons();
});

// =====================================================
// 🔐 CONTROLE DE ACESSO
// =====================================================
function aplicarPermissoes() {
  // Se NÃO for o admin específico, remove elementos de gestão
  if (!isAdmin) {
    document.querySelectorAll(".admin-only").forEach(el => {
      el.remove(); // Remove do DOM para evitar cliques acidentais
    });
    
    // Redireciona se estiver numa aba proibida (ex: atualizou a página na aba errada)
    const secaoAtual = document.querySelector("section.active-section");
    if (secaoAtual && (secaoAtual.id === "atletas" || secaoAtual.id === "criterios")) {
      navegarPara("inicio");
    }
  } else {
    // Se FOR admin, carrega configurações sensíveis
    carregarConfigStrava();
  }
}

function configurarTopo() {
  document.getElementById("userName").textContent = userName;
  const badge = document.getElementById("userGroupBadge");
  if (badge) {
    badge.textContent = isAdmin ? "Administrador" : "Atleta";
    badge.style.background = isAdmin ? "#e63946" : "rgba(255,255,255,0.2)"; // Vermelho para Admin
  }
}

// =====================================================
// 🧭 NAVEGAÇÃO
// =====================================================
function inicializarNavegacao() {
  const menuItems = document.querySelectorAll(".menu-item");
  
  menuItems.forEach(item => {
    item.addEventListener("click", () => {
      const targetId = item.getAttribute("data-section");
      navegarPara(targetId);
    });
  });
}

function navegarPara(secaoId) {
  // 1. Atualiza Menu
  document.querySelectorAll(".menu-item").forEach(i => i.classList.remove("active"));
  const menuItem = document.querySelector(`.menu-item[data-section="${secaoId}"]`);
  if (menuItem) menuItem.classList.add("active");

  // 2. Atualiza Seção Principal
  document.querySelectorAll("main section").forEach(s => {
    s.classList.remove("active-section");
    s.style.display = "none"; // Garante que suma
  });
  
  const secaoAlvo = document.getElementById(secaoId);
  if (secaoAlvo) {
    secaoAlvo.style.display = "block";
    // Pequeno delay para animação CSS funcionar (se houver fade-in)
    setTimeout(() => secaoAlvo.classList.add("active-section"), 10);
  }

  // 3. Ícones precisam ser recarregados em algumas trocas
  lucide.createIcons();
}

// =====================================================
// 📊 DASHBOARD
// =====================================================
async function carregarDashboard() {
  const container = document.getElementById("dashboardCards");
  const titulo = document.getElementById("tituloDashboard");
  
  if (!container) return;

  if (isAdmin) {
    // --- PAINEL DO ADMINISTRADOR ---
    titulo.textContent = "Painel de Controle";
    
    // Buscando contagens reais (Exemplo simplificado)
    try {
      const usersSnap = await getDocs(collection(db, "atletas"));
      const eventsSnap = await getDocs(collection(db, "eventos"));
      
      container.innerHTML = `
        <div class="card">
          <i data-lucide="users"></i>
          <h3>Atletas Cadastrados</h3>
          <p>${usersSnap.size}</p>
        </div>
        <div class="card">
          <i data-lucide="calendar"></i>
          <h3>Eventos Criados</h3>
          <p>${eventsSnap.size}</p>
        </div>
        <div class="card">
           <i data-lucide="settings"></i>
           <h3>Configuração</h3>
           <p style="font-size:1rem">API Strava</p>
        </div>
      `;
    } catch (e) {
      container.innerHTML = "<p>Erro ao carregar dados.</p>";
    }

  } else {
    // --- PAINEL DO ATLETA ---
    titulo.textContent = `Olá, ${userName.split(" ")[0]}!`;
    container.innerHTML = `
      <div class="card">
        <i data-lucide="trophy" style="color:#f37021"></i>
        <h3>Minha Pontuação</h3>
        <p style="color:#f37021">0</p>
      </div>
      <div class="card">
        <i data-lucide="activity"></i>
        <h3>Atividades</h3>
        <p>0</p>
      </div>
    `;
  }
  lucide.createIcons();
}

// =====================================================
// ⚙️ CONFIGURAÇÕES & BOTÕES
// =====================================================
function configurarBotoesGlobais() {
  // LOGOUT
  const btnSair = document.getElementById("logoutBtn");
  if (btnSair) {
    btnSair.addEventListener("click", () => {
      localStorage.clear();
      window.location.href = "index.html";
    });
  }

  // SALVAR STRAVA (Só funciona se o elemento existir, ou seja, se for Admin)
  const btnSalvarStrava = document.getElementById("btnSalvarConfigStrava");
  if (btnSalvarStrava) {
    btnSalvarStrava.addEventListener("click", async () => {
      const clientId = document.getElementById("stravaClientId").value;
      const clientSecret = document.getElementById("stravaClientSecret").value;

      if (!clientId || !clientSecret) return alert("Preencha os campos!");

      await setDoc(doc(db, "config_sistema", "strava"), {
        client_id: clientId,
        client_secret: clientSecret
      });
      alert("Configurações salvas!");
    });
  }
  
  // CONECTAR STRAVA (Atleta)
  const btnConnect = document.getElementById("btnConnectStrava");
  if (btnConnect) {
    btnConnect.addEventListener("click", () => {
      alert("Redirecionando para Strava... (Implementar lógica de redirecionamento)");
    });
  }
}

async function carregarConfigStrava() {
  try {
    const docSnap = await getDoc(doc(db, "config_sistema", "strava"));
    if (docSnap.exists()) {
      const data = docSnap.data();
      const inputId = document.getElementById("stravaClientId");
      const inputSecret = document.getElementById("stravaClientSecret");
      if (inputId) inputId.value = data.client_id || "";
      if (inputSecret) inputSecret.value = data.client_secret || "";
    }
  } catch (e) {
    console.log("Erro ao carregar configs:", e);
  }
}
