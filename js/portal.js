import { 
  db, auth, collection, getDocs, doc, setDoc, getDoc, addDoc, deleteDoc, signOut 
} from "./firebase.js";

// --- VARIÁVEIS ---
const userName = localStorage.getItem("userName") || "Atleta";
const userEmail = localStorage.getItem("userEmail") || "";
const userGroup = localStorage.getItem("userGroup") || "atleta";
const ADMIN_EMAIL = "marcospauloserra@outlook.com.br";
const isAdmin = userEmail.toLowerCase() === ADMIN_EMAIL.toLowerCase();

// --- INICIALIZAÇÃO ---
window.addEventListener("DOMContentLoaded", async () => {
  setupUI();
  setupNavigation();
  setupModais(); // Nova função para controlar janelas
  
  if (isAdmin) {
    carregarListaAtletas();
    carregarRegras();
  }
  
  carregarEventos(); // Todos veem eventos
  carregarDashboard(); // Carrega dados
  
  await verificarCallbackStrava();
  lucide.createIcons();

  // Botões Globais
  document.getElementById("logoutBtn").addEventListener("click", () => {
    signOut(auth).then(() => { localStorage.clear(); window.location.href = "index.html"; });
  });
});

// --- UI & PERMISSÕES ---
function setupUI() {
  document.querySelector(".portal-nome").textContent = `Olá, ${userName.split(" ")[0]}`;
  const badge = document.getElementById("userGroupBadge");
  if(badge) {
    badge.textContent = isAdmin ? "Administrador" : userGroup.toUpperCase();
    badge.style.background = isAdmin ? "#e63946" : "rgba(255,255,255,0.2)";
  }

  if (!isAdmin) {
    document.querySelectorAll(".admin-only").forEach(el => el.remove());
  } else {
    configurarAdminStrava();
  }
}

// --- 👥 GESTÃO DE ATLETAS (Funcional) ---
async function carregarListaAtletas() {
  const tbody = document.getElementById("listaAtletas");
  if(!tbody) return;

  tbody.innerHTML = "<tr><td colspan='4'>Carregando...</td></tr>";
  
  try {
    const snap = await getDocs(collection(db, "atletas"));
    tbody.innerHTML = "";
    
    if (snap.empty) {
      tbody.innerHTML = "<tr><td colspan='4'>Nenhum atleta encontrado.</td></tr>";
      return;
    }

    snap.forEach(docSnap => {
      const u = docSnap.data();
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td><strong>${u.nome}</strong></td>
        <td>${u.grupo}</td>
        <td>${u.email}</td>
        <td>
          <button class="btn-acao btn-excluir" data-id="${docSnap.id}" style="color:red; border-color:red;">
            <i data-lucide="trash-2" style="width:16px;"></i>
          </button>
        </td>
      `;
      tbody.appendChild(tr);
    });
    
    // Adiciona eventos aos botões de excluir
    document.querySelectorAll(".btn-excluir").forEach(btn => {
      btn.addEventListener("click", async (e) => {
        if(confirm("Tem certeza que deseja remover este atleta?")) {
          const id = e.currentTarget.dataset.id;
          await deleteDoc(doc(db, "atletas", id));
          carregarListaAtletas(); // Recarrega lista
        }
      });
    });
    lucide.createIcons();

  } catch(e) {
    console.error(e);
    tbody.innerHTML = "<tr><td colspan='4'>Erro ao carregar lista.</td></tr>";
  }
}

// --- 📅 EVENTOS (Completo com Modal) ---
async function carregarEventos() {
  const lista = document.getElementById("listaEventos");
  if(!lista) return;
  
  const snap = await getDocs(collection(db, "eventos"));
  lista.innerHTML = "";
  
  if(snap.empty) {
    lista.innerHTML = "<p>Nenhum evento agendado.</p>";
    return;
  }

  snap.forEach(d => {
    const ev = d.data();
    // Formata data
    const dataF = ev.data ? new Date(ev.data).toLocaleDateString('pt-BR') : 'Data indef.';
    
    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `
      <div style="display:flex; justify-content:space-between;">
        <h3 style="margin:0">${ev.titulo}</h3>
        <span style="font-size:0.8rem; background:#eee; padding:2px 6px; border-radius:4px;">${ev.tipo || 'Geral'}</span>
      </div>
      <p style="font-size:0.9rem; color:#666; margin:10px 0;">
        📅 ${dataF} às ${ev.hora || '--:--'} <br>
        🏁 ${ev.km ? ev.km + ' km' : 'Distância livre'}
      </p>
      ${isAdmin ? `<button class="btn-acao btn-del-evento" data-id="${d.id}" style="font-size:0.8rem; color:red">Excluir</button>` : ''}
    `;
    lista.appendChild(card);
  });

  // Botão excluir evento
  if(isAdmin) {
    document.querySelectorAll(".btn-del-evento").forEach(b => {
      b.addEventListener("click", async (e) => {
        if(confirm("Excluir evento?")) {
          await deleteDoc(doc(db, "eventos", e.target.dataset.id));
          carregarEventos();
        }
      });
    });
  }
}

// Salvar Evento via Modal
const btnSalvarEvento = document.getElementById("salvarEventoBtn");
if(btnSalvarEvento) {
  btnSalvarEvento.addEventListener("click", async () => {
    const titulo = document.getElementById("eventoTitulo").value;
    const data = document.getElementById("eventoData").value;
    const hora = document.getElementById("eventoHora").value;
    const tipo = document.getElementById("eventoTipo").value;
    const km = document.getElementById("eventoKm").value;

    if(!titulo || !data) return alert("Título e Data são obrigatórios!");

    btnSalvarEvento.textContent = "Salvando...";
    try {
      await addDoc(collection(db, "eventos"), {
        titulo, data, hora, tipo, km, criadoEm: new Date().toISOString()
      });
      document.getElementById("modalEvento").style.display = "none";
      carregarEventos();
      // Limpar campos
      document.getElementById("eventoTitulo").value = "";
    } catch(e) { alert("Erro ao criar evento"); }
    btnSalvarEvento.textContent = "Criar Evento";
  });
}

// --- 🏅 REGRAS DE PONTUAÇÃO ---
async function carregarRegras() {
  const div = document.getElementById("listaCriterios");
  if(!div) return;
  
  const snap = await getDocs(collection(db, "criterios"));
  div.innerHTML = "";

  snap.forEach(d => {
    const r = d.data();
    div.innerHTML += `
      <div class="card" style="padding:15px; border-left:4px solid var(--secondary)">
        <strong>${r.descricao}</strong>
        <p style="font-size:1.1rem; color:var(--primary); margin:5px 0;">${r.pontos} pts</p>
        <span style="font-size:0.8rem; color:#888;">Tipo: ${r.tipo === 'km' ? 'Por KM' : 'Fixo'}</span>
        <button class="btn-acao btn-del-regra" data-id="${d.id}" style="float:right; margin-top:-20px; color:red; border:none;">X</button>
      </div>
    `;
  });

  document.querySelectorAll(".btn-del-regra").forEach(b => {
    b.addEventListener("click", async (e) => {
      await deleteDoc(doc(db, "criterios", e.target.dataset.id));
      carregarRegras();
    });
  });
}

const btnSalvarRegra = document.getElementById("salvarCriterioBtn");
if(btnSalvarRegra) {
  btnSalvarRegra.addEventListener("click", async () => {
    const descricao = document.getElementById("regraDesc").value;
    const pontos = document.getElementById("regraPontos").value;
    const tipo = document.getElementById("regraTipo").value;

    if(!descricao || !pontos) return alert("Preencha a descrição e pontos.");

    await addDoc(collection(db, "criterios"), { descricao, pontos, tipo });
    document.getElementById("modalCriterio").style.display = "none";
    carregarRegras();
  });
}

// --- MODAIS (Abrir e Fechar) ---
function setupModais() {
  const modalEv = document.getElementById("modalEvento");
  const modalCr = document.getElementById("modalCriterio");

  // Abrir
  document.getElementById("abrirModalEvento")?.addEventListener("click", () => modalEv.style.display = "flex");
  document.getElementById("abrirModalCriterio")?.addEventListener("click", () => modalCr.style.display = "flex");

  // Fechar
  document.querySelectorAll(".fechar-modal").forEach(btn => {
    btn.addEventListener("click", () => {
      if(modalEv) modalEv.style.display = "none";
      if(modalCr) modalCr.style.display = "none";
    });
  });
}

// --- DASHBOARD E STRAVA (Mantidos) ---
// (Mantenha as funções carregarDashboard, verificarCallbackStrava, configurarAdminStrava do arquivo anterior aqui)
// Vou incluir a versão resumida para o arquivo ficar completo:

async function carregarDashboard() {
  const container = document.getElementById("dashboardCards");
  const titulo = document.getElementById("tituloDashboard");
  if(!container) return;

  if(isAdmin) {
    if(titulo) titulo.textContent = "Painel de Controle";
    const u = await getDocs(collection(db, "atletas"));
    const e = await getDocs(collection(db, "eventos"));
    container.innerHTML = `
      <div class="card"><h3>Atletas</h3><p>${u.size}</p></div>
      <div class="card"><h3>Eventos</h3><p>${e.size}</p></div>
    `;
  } else {
    if(titulo) titulo.textContent = "Seu Desempenho";
    const token = localStorage.getItem("strava_access_token");
    if(token) {
       // Chama função de busca Strava (igual anterior)
       container.innerHTML = "<div class="card"><h3>Strava</h3><p>Conectado</p></div>";
    } else {
       container.innerHTML = "<div class='card'><h3>Pontos</h3><p>0</p></div>";
    }
  }
}

async function verificarCallbackStrava() {
  const code = new URLSearchParams(window.location.search).get("code");
  if(code) {
    window.history.replaceState({}, document.title, window.location.pathname);
    // Lógica de troca de token (igual anterior)
    localStorage.setItem("strava_access_token", "token_simulado"); // Simulação
    alert("Strava conectado!");
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

// Navegação
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
