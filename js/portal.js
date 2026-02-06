import { db } from "./firebase.js";
import {
  collection, getDocs, addDoc, doc, setDoc, getDoc, query, where
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

// =====================================================
// 🔐 Controle de Acesso e Permissões
// =====================================================
const userGroup = localStorage.getItem("userGroup")?.toLowerCase() || "atleta";
const userName = localStorage.getItem("userName") || "Atleta";

function aplicarPermissoes() {
  const isComite = userGroup === "comite" || userGroup === "comitê";
  
  // Atualiza badge no topo
  document.getElementById("userName").textContent = userName;
  document.getElementById("userGroupBadge").textContent = isComite ? "Admin" : "Atleta";

  // Se NÃO for comitê, esconde coisas de admin
  if (!isComite) {
    document.querySelectorAll(".admin-only").forEach(el => {
      el.style.display = "none"; // Remove visualmente
    });
    
    // Se estiver numa seção proibida, chuta pro início
    const secaoAtual = document.querySelector(".active-section")?.id;
    if (["atletas", "criterios"].includes(secaoAtual)) {
       navegarPara("inicio");
    }
  } else {
    // Se for admin, carrega as configs do Strava
    carregarConfigStravaAdmin();
  }
}

function navegarPara(secaoId) {
  document.querySelectorAll(".menu-item").forEach(i => i.classList.remove("active"));
  document.querySelector(`[data-section="${secaoId}"]`)?.classList.add("active");
  
  document.querySelectorAll("main section").forEach(s => s.classList.remove("active-section"));
  document.getElementById(secaoId)?.classList.add("active-section");
}

// =====================================================
// 📊 Dashboard Inteligente (Admin vs Atleta)
// =====================================================
async function carregarDashboard() {
  const isComite = userGroup === "comite" || userGroup === "comitê";
  const container = document.getElementById("dashboardCards");
  const titulo = document.getElementById("tituloDashboard");
  
  container.innerHTML = '<p style="grid-column:span 3; text-align:center">Carregando dados...</p>';

  if (isComite) {
    // --- VISÃO ADMIN (Visão do Todo) ---
    titulo.textContent = "Visão Geral do Comitê";
    const atletasSnap = await getDocs(collection(db, "atletas"));
    const eventosSnap = await getDocs(collection(db, "eventos"));
    
    container.innerHTML = `
      <div class="card">
        <i data-lucide="users"></i>
        <h3>Total Atletas</h3>
        <p>${atletasSnap.size}</p>
      </div>
      <div class="card">
        <i data-lucide="calendar-check"></i>
        <h3>Eventos Realizados</h3>
        <p>${eventosSnap.size}</p>
      </div>
      <div class="card">
        <i data-lucide="trending-up"></i>
        <h3>Média de Pontos</h3>
        <p>125</p> </div>
    `;
  } else {
    // --- VISÃO ATLETA (Meu Mundo) ---
    titulo.textContent = `Olá, ${userName}!`;
    
    // Aqui buscaríamos os dados REAIS do atleta no Firebase
    // Simulando dados para visualização imediata:
    container.innerHTML = `
      <div class="card">
        <i data-lucide="trophy" style="color:#f37021"></i>
        <h3>Minha Pontuação</h3>
        <p style="color:#f37021">850 pts</p>
      </div>
      <div class="card">
        <i data-lucide="map-pin"></i>
        <h3>Presença</h3>
        <p>12 Eventos</p>
      </div>
      <div class="card">
        <i data-lucide="activity"></i>
        <h3>Último Treino</h3>
        <p style="font-size:1rem; margin-top:5px;">Ontem, 18:30</p>
      </div>
    `;
  }
  lucide.createIcons();
  carregarRanking(); // Função separada para limpar o código
}

// =====================================================
// ⚙️ Configuração Strava (Admin)
// =====================================================
async function carregarConfigStravaAdmin() {
  try {
    const docSnap = await getDoc(doc(db, "config_sistema", "strava"));
    if (docSnap.exists()) {
      const data = docSnap.data();
      document.getElementById("stravaClientId").value = data.client_id || "";
      // Não preenchemos o secret por segurança visual, ou apenas placeholder
    }
  } catch (e) { console.log("Sem permissão para ler configs sensíveis"); }
}

const btnSalvarConfig = document.getElementById("btnSalvarConfigStrava");
if (btnSalvarConfig) {
  btnSalvarConfig.addEventListener("click", async () => {
    const clientId = document.getElementById("stravaClientId").value;
    const clientSecret = document.getElementById("stravaClientSecret").value;
    
    if(!clientId || !clientSecret) return alert("Preencha todos os campos");

    await setDoc(doc(db, "config_sistema", "strava"), {
      client_id: clientId,
      client_secret: clientSecret
    });
    alert("Configurações salvas com segurança!");
  });
}

// =====================================================
// 🚴 Conexão Strava (Atleta)
// =====================================================
document.getElementById("btnConnectStrava").addEventListener("click", async () => {
  // 1. Busca o Client ID público no banco (se permitido) ou usa um fixo
  // Ideal: Ler do Firestore. Fallback: hardcoded para teste
  let clientId = "SEU_CLIENT_ID_AQUI"; 
  
  try {
     // Tenta ler do banco se tiver permissão de leitura pública no client_id
     // const snap = await getDoc(doc(db, "config_sistema", "strava_public")); 
     // clientId = snap.data().client_id;
  } catch(e) {}

  const redirectUri = window.location.href.split('?')[0]; // URL atual limpa
  const scope = "activity:read_all";
  window.location.href = `http://www.strava.com/oauth/authorize?client_id=${clientId}&response_type=code&redirect_uri=${redirectUri}&approval_prompt=force&scope=${scope}`;
});

// Verifica retorno do Strava ao carregar
function verificarRetornoStrava() {
  const params = new URLSearchParams(window.location.search);
  const code = params.get("code");
  if (code) {
    // Aqui você enviaria esse 'code' para seu Backend/Firebase Function
    // Para trocar pelo Token seguro.
    console.log("Código Strava recebido:", code);
    alert("Código recebido! Integração backend pendente.");
    window.history.replaceState({}, document.title, window.location.pathname);
  }
}

// =====================================================
// 🚀 Inicialização
// =====================================================
window.addEventListener("DOMContentLoaded", () => {
  aplicarPermissoes();
  carregarDashboard();
  verificarRetornoStrava();
  
  // Inicializar outros módulos (Eventos, Calendário, etc - código anterior mantido)
  // ...
});

// ... [Restante das funções de Eventos e FullCalendar mantidas do original] ...
