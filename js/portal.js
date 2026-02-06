import { 
  db, auth, collection, getDocs, doc, setDoc, getDoc, addDoc, deleteDoc, signOut, 
  onAuthStateChanged 
} from "./firebase.js";

// --- VARIÁVEIS GLOBAIS ---
let userName = "Atleta";
let userEmail = "";
let userGroup = "atleta";
const ADMIN_EMAIL = "marcospauloserra@outlook.com.br";
let isAdmin = false;

// =====================================================
// 🚀 INICIALIZAÇÃO
// =====================================================
window.addEventListener("DOMContentLoaded", () => {
  console.log("Sistema Iniciado.");

  // 1. Botões que funcionam sempre (Sair, Tema)
  configurarBotoesGlobais();

  // 2. O Porteiro (Autenticação)
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      // --- USUÁRIO LOGADO ---
      userEmail = user.email;
      isAdmin = userEmail.toLowerCase() === ADMIN_EMAIL.toLowerCase();

      // Recupera dados do LocalStorage ou Banco
      try {
        if (!localStorage.getItem("userName")) {
          const snap = await getDoc(doc(db, "atletas", user.uid));
          if (snap.exists()) {
            const data = snap.data();
            localStorage.setItem("userName", data.nome || "Atleta");
            localStorage.setItem("userGroup", data.grupo || "atleta");
            localStorage.setItem("userEmail", data.email);
          }
        }
      } catch (e) { console.error("Erro perfil:", e); }

      // Atualiza memória
      userName = localStorage.getItem("userName") || "Atleta";
      userGroup = localStorage.getItem("userGroup") || "atleta";

      // 3. Monta a Tela
      setupUI();
      setupNavigation();
      setupModais();

      // 4. Carrega Dados Específicos
      if (isAdmin) {
        carregarListaAtletas();
        carregarRegras();
      } else {
        // [CORREÇÃO] O botão do Strava volta a funcionar aqui
        configurarStravaAtleta(); 
      }
      
      carregarEventos();
      carregarDashboard();
      await verificarCallbackStrava();
      lucide.createIcons();

    } else {
      // --- NÃO LOGADO ---
      window.location.href = "index.html";
    }
  });
});

// =====================================================
// 🖥️ UI & VISUAL
// =====================================================
function setupUI() {
  const nomeSpan = document.querySelector(".portal-nome");
  if(nomeSpan) nomeSpan.textContent = `Olá, ${userName.split(" ")[0]}`;
  
  const userSpan = document.getElementById("userName");
  if(userSpan) userSpan.textContent = userName.split(" ")[0];

  const badge = document.getElementById("userGroupBadge");
  if(badge) {
    badge.textContent = isAdmin ? "Administrador" : userGroup.toUpperCase();
    badge.style.background = isAdmin ? "#e63946" : "rgba(255,255,255,0.2)";
  }

  // Remove coisas de Admin se for Atleta
  if (!isAdmin) {
    document.querySelectorAll(".admin-only").forEach(el => el.remove());
  } else {
    configurarAdminStrava(); // Configuração das chaves (Admin)
  }
}

function configurarBotoesGlobais() {
  document.getElementById("logoutBtn")?.addEventListener("click", () => {
    signOut(auth).then(() => { localStorage.clear(); window.location.href = "index.html"; });
  });

  const themeToggle = document.getElementById("theme-toggle");
  if(themeToggle) {
    themeToggle.addEventListener("click", () => {
      const isDark = document.body.getAttribute("data-theme") === "dark";
      document.body.setAttribute("data-theme", isDark ? "light" : "dark");
      themeToggle.innerHTML = isDark ? '<i data-lucide="moon"></i>' : '<i data-lucide="sun"></i>';
      lucide.createIcons();
    });
  }
}

// =====================================================
// 🚴 STRAVA (O RESGATE DO BOTÃO)
// =====================================================
function configurarStravaAtleta() {
  const btn = document.getElementById("btnConnectStrava");
  if (btn) {
    // Remove clenes anteriores para evitar duplicação (boa prática)
    const novoBtn = btn.cloneNode(true);
    btn.parentNode.replaceChild(novoBtn, btn);

    novoBtn.addEventListener("click", async () => {
      try {
        const docSnap = await getDoc(doc(db, "config_sistema", "strava"));
        
        if (!docSnap.exists()) {
          alert("Erro: O Administrador ainda não configurou a API do Strava.");
          return;
        }
        
        const { client_id } = docSnap.data();
        if (!client_id) {
          alert("Erro: Client ID não encontrado.");
          return;
        }

        const redirect = window.location.href.split('?')[0];
        const scope = "activity:read_all"; // Permissão para ler treinos
        
        // Redireciona para o Strava
        window.location.href = `http://www.strava.com/oauth/authorize?client_id=${client_id}&response_type=code&redirect_uri=${redirect}&approval_prompt=force&scope=${scope}`;
        
      } catch (e) {
        console.error("Erro Strava:", e);
        alert("Erro de conexão. Verifique o console.");
      }
    });
  }
}

// Retorno do Strava (Callback)
async function verificarCallbackStrava() {
  const code = new URLSearchParams(window.location.search).get("code");
  if(code) {
    window.history.replaceState({}, document.title, window.location.pathname);
    
    // Feedback visual simples
    const container = document.getElementById("dashboardCards");
    if(container) container.innerHTML = "<p>Conectando ao Strava...</p>";

    try {
      const snap = await getDoc(doc(db, "config_sistema", "strava"));
      if(snap.exists()) {
         const { client_id, client_secret } = snap.data();
         
         // Troca CODE por TOKEN
         const res = await fetch('https://www.strava.com/oauth/token', {
            method: 'POST',
            headers: {'Content-Type':'application/json'},
            body: JSON.stringify({ 
              client_id, client_secret, code, grant_type: 'authorization_code' 
            })
         });
         
         const data = await res.json();
         
         if(data.access_token) {
            localStorage.setItem("strava_access_token", data.access_token);
            alert("Strava Conectado com Sucesso!");
            carregarDashboard(); // Recarrega para mostrar os dados
         } else {
            alert("Falha na autenticação Strava.");
         }
      }
    } catch(e) { console.error(e); }
  }
}

// Configuração do Admin (Salvar Chaves)
function configurarAdminStrava() {
  const btn = document.getElementById("btnSalvarConfigStrava");
  if(btn) {
    btn.addEventListener("click", async () => {
       const id = document.getElementById("stravaClientId").value;
       const secret = document.getElementById("stravaClientSecret").value;
       if(!id || !secret) return alert("Preencha Client ID e Secret.");
       
       await setDoc(doc(db, "config_sistema", "strava"), { client_id: id, client_secret: secret });
       alert("Configurações salvas!");
    });
  }
}

// Busca Atividades (API)
async function buscarDadosStrava(token) {
  const r = await fetch("https://www.strava.com/api/v3/athlete/activities?per_page=30", { 
    headers: { "Authorization": `Bearer ${token}` }
  });
  
  if(!r.ok) throw new Error(r.status);
  
  const d = await r.json();
  let dist = 0; 
  d.forEach(x => dist += x.distance);
  
  return { 
    distancia: (dist/1000).toFixed(1), 
    count: d.length 
  };
}

// =====================================================
// 📊 DASHBOARD
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
        <div class="card"><i data-lucide="server"></i><h3>Sistema</h3><p>Online</p></div>
      `;
    } catch(e) { container.innerHTML = "<p>Erro dados.</p>"; }
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
            carregarDashboard(); // Pede login de novo
         } else {
            container.innerHTML = `<div class="card"><p style="color:red">Erro Strava. <br>Tente reconectar.</p></div>`;
         }
       }
    } else {
       container.innerHTML = `
         <div class="card"><i data-lucide="trophy" style="color:#ccc"></i><h3>Pontos</h3><p style="color:#ccc">0</p></div>
         <div class="card" style="border-left:4px solid #fc4c02">
            <i data-lucide="alert-circle" style="color:#fc4c02"></i>
            <h3>Conectar</h3>
            <p style="font-size:0.9rem">Clique em Configurações > Conectar Strava</p>
         </div>
       `;
    }
  }
}

// =====================================================
// 👥 GESTÃO & EVENTOS (ADMIN)
// =====================================================
async function carregarListaAtletas() {
  const tbody = document.getElementById("listaAtletas");
  if(!tbody) return;
  tbody.innerHTML = "<tr><td colspan='4'>Carregando...</td></tr>";
  try {
    const s = await getDocs(collection(db, "atletas"));
    tbody.innerHTML = "";
    s.forEach(d => {
      const u = d.data();
      tbody.innerHTML += `
        <tr>
          <td>${u.nome}</td>
          <td>${u.grupo}</td>
          <td>${u.email}</td>
          <td><button class="btn-del btn-acao" data-id="${d.id}" style="color:red; border:0;"><i data-lucide="trash-2"></i></button></td>
        </tr>`;
    });
    document.querySelectorAll(".btn-del").forEach(b => b.addEventListener("click", async e => {
      if(confirm("Excluir?")) { await deleteDoc(doc(db,"atletas",e.currentTarget.dataset.id)); carregarListaAtletas(); }
    }));
    lucide.createIcons();
  } catch(e){ tbody.innerHTML = "<tr><td colspan='4'>Erro.</td></tr>"; }
}

async function carregarEventos() {
  const l = document.getElementById("listaEventos");
  if(!l) return;
  const s = await getDocs(collection(db, "eventos"));
  l.innerHTML = "";
  if(s.empty) return l.innerHTML = "<div class='card'><p>Sem eventos.</p></div>";
  
  s.forEach(d => {
    const ev = d.data();
    const dataF = ev.data ? new Date(ev.data).toLocaleDateString('pt-BR',{timeZone:'UTC'}) : '-';
    l.innerHTML += `
      <div class="card" style="border-left:4px solid ${ev.tipo==='Prova'?'#e63946':'#00b37e'}">
        <div style="display:flex; justify-content:space-between">
           <h3>${ev.titulo}</h3>
           ${isAdmin ? `<button class="del-ev" data-id="${d.id}" style="border:0; bg:none; color:red; cursor:pointer">X</button>` : ''}
        </div>
        <p style="font-size:0.9rem; color:#666; margin-top:5px">📅 ${dataF} • ${ev.tipo}</p>
      </div>`;
  });
  if(isAdmin) document.querySelectorAll(".del-ev").forEach(b => b.addEventListener("click", async e => {
     if(confirm("Apagar?")) { await deleteDoc(doc(db,"eventos",e.target.dataset.id)); carregarEventos(); }
  }));
}

document.getElementById("salvarEventoBtn")?.addEventListener("click", async () => {
  const titulo = document.getElementById("eventoTitulo").value;
  const data = document.getElementById("eventoData").value;
  const tipo = document.getElementById("eventoTipo").value;
  if(!titulo || !data) return alert("Preencha título e data");
  await addDoc(collection(db,"eventos"), { titulo, data, tipo, criadoEm: new Date().toISOString() });
  document.getElementById("modalEvento").style.display = "none";
  carregarEventos();
});

// =====================================================
// 🏅 REGRAS (ADMIN)
// =====================================================
async function carregarRegras() {
  const l = document.getElementById("listaCriterios");
  if(!l) return;
  const s = await getDocs(collection(db, "criterios"));
  l.innerHTML = "";
  s.forEach(d => {
    const r = d.data();
    l.innerHTML += `
      <div class="card" style="padding:15px; border-left:4px solid var(--secondary); margin-bottom:10px">
        <div style="display:flex; justify-content:space-between">
           <strong>${r.descricao}</strong>
           <div>
             <span style="color:var(--primary); font-weight:bold">${r.pontos} pts</span>
             <button class="del-regra" data-id="${d.id}" style="color:red; border:0; bg:none; cursor:pointer; margin-left:10px">X</button>
           </div>
        </div>
      </div>`;
  });
  document.querySelectorAll(".del-regra").forEach(b => b.addEventListener("click", async e => {
     await deleteDoc(doc(db,"criterios",e.target.dataset.id)); carregarRegras();
  }));
}

document.getElementById("salvarCriterioBtn")?.addEventListener("click", async () => {
  const descricao = document.getElementById("regraDesc").value;
  const pontos = document.getElementById("regraPontos").value;
  const tipo = document.getElementById("regraTipo").value;
  if(!descricao || !pontos) return alert("Preencha tudo");
  await addDoc(collection(db,"criterios"), { descricao, pontos, tipo });
  document.getElementById("modalCriterio").style.display = "none";
  carregarRegras();
});

// =====================================================
// 🧭 UTILITÁRIOS (Navegação & Modais)
// =====================================================
function setupNavigation() {
  document.querySelectorAll(".menu-item").forEach(m => m.addEventListener("click", () => {
    document.querySelectorAll(".menu-item").forEach(x => x.classList.remove("active"));
    m.classList.add("active");
    const t = m.dataset.section;
    document.querySelectorAll("main section").forEach(s => {
       s.classList.remove("active-section");
       if(s.id === t) s.classList.add("active-section");
    });
    lucide.createIcons();
  }));
}

function setupModais() {
  const mev = document.getElementById("modalEvento");
  const mcr = document.getElementById("modalCriterio");
  document.getElementById("abrirModalEvento")?.addEventListener("click", () => mev.style.display="flex");
  document.getElementById("abrirModalCriterio")?.addEventListener("click", () => mcr.style.display="flex");
  document.querySelectorAll(".fechar-modal").forEach(b => b.addEventListener("click", () => {
    if(mev) mev.style.display="none"; if(mcr) mcr.style.display="none";
  }));
}
