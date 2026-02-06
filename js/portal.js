import { 
  db, auth, collection, getDocs, doc, setDoc, getDoc, addDoc, deleteDoc, signOut, 
  onAuthStateChanged // Importamos o "porteiro" do Firebase
} from "./firebase.js";

// --- VARIÁVEIS GLOBAIS ---
let userName = "Atleta";
let userEmail = "";
let userGroup = "atleta";
const ADMIN_EMAIL = "marcospauloserra@outlook.com.br";
let isAdmin = false;

// =====================================================
// 🚀 INICIALIZAÇÃO SEGURA (AUTH GUARD)
// =====================================================
window.addEventListener("DOMContentLoaded", () => {
  // O Porteiro: Verifica se tem alguém logado DE VERDADE
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      // 1. Usuário está logado! Recuperar dados.
      console.log("Usuário autenticado:", user.email);
      userEmail = user.email;
      isAdmin = userEmail.toLowerCase() === ADMIN_EMAIL.toLowerCase();

      // Tenta recuperar nome/grupo do LocalStorage ou busca no banco se sumiu
      if (!localStorage.getItem("userName")) {
        const snap = await getDoc(doc(db, "atletas", user.uid));
        if (snap.exists()) {
          const data = snap.data();
          localStorage.setItem("userName", data.nome);
          localStorage.setItem("userGroup", data.grupo);
          localStorage.setItem("userEmail", data.email);
        }
      }

      // Atualiza variáveis da memória
      userName = localStorage.getItem("userName") || "Atleta";
      userGroup = localStorage.getItem("userGroup") || "atleta";

      // 2. Inicia o Portal
      setupUI();
      setupNavigation();
      setupModais();
      
      if (isAdmin) {
        carregarListaAtletas();
        carregarRegras();
      }
      
      carregarEventos();
      carregarDashboard();
      await verificarCallbackStrava();
      lucide.createIcons();

    } else {
      // 3. Ninguém logado (Cache limpo ou logout) -> Manda pro Login
      console.log("Sessão inválida. Redirecionando...");
      window.location.href = "index.html";
    }
  });

  // Botões Globais
  document.getElementById("logoutBtn").addEventListener("click", () => {
    signOut(auth).then(() => { 
      localStorage.clear(); 
      window.location.href = "index.html"; 
    });
  });
});

// =====================================================
// 🖥️ UI & VISUAL
// =====================================================
function setupUI() {
  const primeiroNome = userName.split(" ")[0];
  document.querySelector(".portal-nome").textContent = `Olá, ${primeiroNome}`;
  
  const badge = document.getElementById("userGroupBadge");
  if(badge) {
    badge.textContent = isAdmin ? "Administrador" : userGroup.toUpperCase();
    badge.style.background = isAdmin ? "#e63946" : "rgba(255,255,255,0.2)";
  }

  // Esconde/Mostra áreas de Admin
  if (!isAdmin) {
    document.querySelectorAll(".admin-only").forEach(el => el.remove());
  } else {
    configurarAdminStrava();
  }
}

// =====================================================
// 👥 GESTÃO DE ATLETAS
// =====================================================
async function carregarListaAtletas() {
  const tbody = document.getElementById("listaAtletas");
  if(!tbody) return;

  tbody.innerHTML = "<tr><td colspan='4'>Carregando...</td></tr>";
  
  try {
    const snap = await getDocs(collection(db, "atletas"));
    tbody.innerHTML = "";
    
    if (snap.empty) {
      tbody.innerHTML = "<tr><td colspan='4'>Nenhum cadastro.</td></tr>";
      return;
    }

    snap.forEach(docSnap => {
      const u = docSnap.data();
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td><strong>${u.nome}</strong></td>
        <td><span style="font-size:0.85rem; background:#eee; padding:2px 6px; border-radius:4px;">${u.grupo}</span></td>
        <td style="font-size:0.9rem; color:#666;">${u.email}</td>
        <td>
          <button class="btn-acao btn-excluir" data-id="${docSnap.id}" title="Excluir" style="color:red; border-color:transparent;">
            <i data-lucide="trash-2" style="width:18px;"></i>
          </button>
        </td>
      `;
      tbody.appendChild(tr);
    });
    
    document.querySelectorAll(".btn-excluir").forEach(btn => {
      btn.addEventListener("click", async (e) => {
        if(confirm("ATENÇÃO: Deseja excluir este atleta permanentemente?")) {
          // Nota: Isso apaga do banco de dados, mas o login (Auth) continua existindo 
          // até ser removido no painel do Firebase Console.
          const id = e.currentTarget.dataset.id;
          await deleteDoc(doc(db, "atletas", id));
          carregarListaAtletas();
        }
      });
    });
    lucide.createIcons();

  } catch(e) {
    console.error(e);
    tbody.innerHTML = "<tr><td colspan='4' style="color:red">Erro de permissão ou conexão.</td></tr>";
  }
}

// =====================================================
// 📅 EVENTOS
// =====================================================
async function carregarEventos() {
  const lista = document.getElementById("listaEventos");
  if(!lista) return;
  
  const snap = await getDocs(collection(db, "eventos"));
  lista.innerHTML = "";
  
  if(snap.empty) {
    lista.innerHTML = `<div class="card"><p style="font-weight:400; font-size:1rem;">Nenhum evento próximo.</p></div>`;
    return;
  }

  snap.forEach(d => {
    const ev = d.data();
    const dataF = ev.data ? new Date(ev.data).toLocaleDateString('pt-BR') : 'Data indef.';
    
    const card = document.createElement("div");
    card.className = "card";
    // Corzinha na lateral pra indicar tipo
    const corBorda = ev.tipo === 'Prova' ? '#e63946' : '#00b37e'; 
    
    card.style.borderLeft = `4px solid ${corBorda}`;
    card.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:start;">
        <div>
          <h3 style="margin:0; font-size:1.1rem;">${ev.titulo}</h3>
          <span style="font-size:0.8rem; color:#666;">${ev.tipo || 'Geral'} • ${ev.km ? ev.km + 'km' : 'Livre'}</span>
        </div>
        ${isAdmin ? `<button class="btn-del-evento" data-id="${d.id}" style="background:none; border:none; color:red; cursor:pointer;"><i data-lucide="trash"></i></button>` : ''}
      </div>
      <div style="margin-top:10px; font-size:0.95rem; display:flex; gap:15px; color:#444;">
        <span><i data-lucide="calendar" style="width:14px; display:inline;"></i> ${dataF}</span>
        <span><i data-lucide="clock" style="width:14px; display:inline;"></i> ${ev.hora || '08:00'}</span>
      </div>
    `;
    lista.appendChild(card);
  });

  if(isAdmin) {
    document.querySelectorAll(".btn-del-evento").forEach(b => {
      b.addEventListener("click", async (e) => {
        if(confirm("Apagar evento?")) {
          await deleteDoc(doc(db, "eventos", e.currentTarget.dataset.id));
          carregarEventos();
        }
      });
    });
  }
}

// Salvar Evento
const btnSalvarEvento = document.getElementById("salvarEventoBtn");
if(btnSalvarEvento) {
  btnSalvarEvento.addEventListener("click", async () => {
    const titulo = document.getElementById("eventoTitulo").value;
    const data = document.getElementById("eventoData").value;
    const hora = document.getElementById("eventoHora").value;
    const tipo = document.getElementById("eventoTipo").value;
    const km = document.getElementById("eventoKm").value;

    if(!titulo || !data) return alert("Preencha Título e Data!");

    btnSalvarEvento.textContent = "Salvando...";
    try {
      await addDoc(collection(db, "eventos"), { titulo, data, hora, tipo, km, criadoEm: new Date().toISOString() });
      document.getElementById("modalEvento").style.display = "none";
      carregarEventos();
      document.getElementById("eventoTitulo").value = ""; // Limpa
    } catch(e) { alert("Erro ao salvar."); }
    btnSalvarEvento.textContent = "Criar Evento";
  });
}

// =====================================================
// 🏅 REGRAS (CRITÉRIOS)
// =====================================================
async function carregarRegras() {
  const div = document.getElementById("listaCriterios");
  if(!div) return;
  
  const snap = await getDocs(collection(db, "criterios"));
  div.innerHTML = "";

  snap.forEach(d => {
    const r = d.data();
    const divCard = document.createElement("div");
    divCard.className = "card";
    divCard.style.cssText = "padding:15px; border-left:4px solid var(--secondary); margin-bottom:10px;";
    divCard.innerHTML = `
      <div style="display:flex; justify-content:space-between;">
         <div>
            <strong>${r.descricao}</strong>
            <div style="font-size:0.85rem; color:#666;">Tipo: ${r.tipo === 'km' ? 'Por KM' : 'Fixo'}</div>
         </div>
         <div style="text-align:right;">
            <div style="font-size:1.2rem; color:var(--primary); font-weight:bold;">${r.pontos} pts</div>
            <button class="btn-del-regra" data-id="${d.id}" style="color:red; background:none; border:none; cursor:pointer; font-size:0.8rem;">Excluir</button>
         </div>
      </div>
    `;
    div.appendChild(divCard);
  });

  document.querySelectorAll(".btn-del-regra").forEach(b => {
    b.addEventListener("click", async (e) => {
      await deleteDoc(doc(db, "criterios", e.currentTarget.dataset.id));
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

    if(!descricao || !pontos) return alert("Preencha tudo.");

    await addDoc(collection(db, "criterios"), { descricao, pontos, tipo });
    document.getElementById("modalCriterio").style.display = "none";
    carregarRegras();
  });
}

// =====================================================
// 📊 DASHBOARD & UTILITÁRIOS
// =====================================================
async function carregarDashboard() {
  const container = document.getElementById("dashboardCards");
  const titulo = document.getElementById("tituloDashboard");
  if(!container) return;

  if(isAdmin) {
    if(titulo) titulo.textContent = "Painel de Controle";
    try {
      const u = await getDocs(collection(db, "atletas"));
      const e = await getDocs(collection(db, "eventos"));
      container.innerHTML = `
        <div class="card"><i data-lucide="users"></i><h3>Atletas</h3><p>${u.size}</p></div>
        <div class="card"><i data-lucide="calendar"></i><h3>Eventos</h3><p>${e.size}</p></div>
        <div class="card"><i data-lucide="activity"></i><h3>Sistema</h3><p>Ativo</p></div>
      `;
    } catch(e) { container.innerHTML = "<p>Erro ao carregar dados.</p>"; }
  } else {
    if(titulo) titulo.textContent = "Seu Desempenho";
    const token = localStorage.getItem("strava_access_token");
    
    if(token) {
       container.innerHTML = `<p>Sincronizando...</p>`;
       try {
         const stats = await buscarDadosStrava(token);
         container.innerHTML = `
           <div class="card"><i data-lucide="map" style="color:#fc4c02"></i><h3>KM Total</h3><p style="color:#fc4c02">${stats.distancia}</p></div>
           <div class="card"><i data-lucide="activity"></i><h3>Atividades</h3><p>${stats.count}</p></div>
         `;
       } catch(e) {
         if(e.message.includes("401")) { 
            localStorage.removeItem("strava_access_token"); 
            carregarDashboard(); 
         } else {
            container.innerHTML = `<div class="card"><p style="color:red">Erro Strava. Tente mais tarde.</p></div>`;
         }
       }
    } else {
       container.innerHTML = `
         <div class="card"><i data-lucide="trophy" style="color:#ccc"></i><h3>Pontos</h3><p style="color:#ccc">0</p></div>
         <div class="card" style="border-left:4px solid #fc4c02"><i data-lucide="alert-circle" style="color:#fc4c02"></i><h3>Conectar</h3><p style="font-size:0.9rem">Configure o Strava.</p></div>
       `;
    }
  }
}

// MODAIS
function setupModais() {
  const modalEv = document.getElementById("modalEvento");
  const modalCr = document.getElementById("modalCriterio");
  
  document.getElementById("abrirModalEvento")?.addEventListener("click", () => modalEv.style.display = "flex");
  document.getElementById("abrirModalCriterio")?.addEventListener("click", () => modalCr.style.display = "flex");
  
  document.querySelectorAll(".fechar-modal").forEach(b => b.addEventListener("click", () => {
    if(modalEv) modalEv.style.display = "none";
    if(modalCr) modalCr.style.display = "none";
  }));
}

// NAVEGAÇÃO
function setupNavigation() {
  document.querySelectorAll(".menu-item").forEach(menu => {
    menu.addEventListener("click", () => {
      document.querySelectorAll(".menu-item").forEach(m => m.classList.remove("active"));
      menu.classList.add("active");
      const t = menu.dataset.section;
      document.querySelectorAll("main section").forEach(s => {
        s.classList.remove("active-section");
        if(s.id === t) s.classList.add("active-section");
      });
      lucide.createIcons();
    });
  });
}

// STRAVA E AUXILIARES (Resumido para manter funcionalidade)
async function buscarDadosStrava(token) {
  const r = await fetch("https://www.strava.com/api/v3/athlete/activities?per_page=30", { headers: { "Authorization": `Bearer ${token}` }});
  if(!r.ok) throw new Error(r.status);
  const d = await r.json();
  let dist = 0; d.forEach(x => dist += x.distance);
  return { distancia: (dist/1000).toFixed(1), count: d.length };
}

async function verificarCallbackStrava() {
  const code = new URLSearchParams(window.location.search).get("code");
  if(code) {
    window.history.replaceState({}, document.title, window.location.pathname);
    try {
      const snap = await getDoc(doc(db, "config_sistema", "strava"));
      if(snap.exists()) {
         const { client_id, client_secret } = snap.data();
         const res = await fetch('https://www.strava.com/oauth/token', {
            method: 'POST', headers: {'Content-Type':'application/json'},
            body: JSON.stringify({ client_id, client_secret, code, grant_type: 'authorization_code' })
         });
         const data = await res.json();
         if(data.access_token) {
            localStorage.setItem("strava_access_token", data.access_token);
            alert("Strava Conectado!");
            carregarDashboard();
         }
      }
    } catch(e) { console.error(e); }
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
