import { 
  db, auth, collection, getDocs, doc, setDoc, getDoc, addDoc, deleteDoc, updateDoc, signOut, 
  onAuthStateChanged, query, where, orderBy 
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
  setupUI(); // Interface inicial
  
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      userEmail = user.email;
      isAdmin = userEmail.toLowerCase() === ADMIN_EMAIL.toLowerCase();

      // Recupera Perfil
      try {
        if (!localStorage.getItem("userName")) {
          const snap = await getDoc(doc(db, "atletas", user.uid));
          if (snap.exists()) {
            const data = snap.data();
            localStorage.setItem("userName", data.nome);
            localStorage.setItem("userGroup", data.grupo);
            localStorage.setItem("userEmail", data.email);
          }
        }
      } catch (e) { console.error("Erro perfil:", e); }

      userName = localStorage.getItem("userName") || "Atleta";
      userGroup = localStorage.getItem("userGroup") || "atleta";

      setupUI();
      setupNavigation();
      setupModais();
      configurarBotoesGlobais();

      if (isAdmin) {
        carregarListaAtletas();
        carregarValidacoes();
        carregarRegras();
      } else {
        configurarStravaAtleta();
      }
      
      carregarEventos();
      
      // Tenta processar o retorno do Strava ANTES de carregar o dashboard final
      await verificarCallbackStrava();
      carregarDashboard();
      
      lucide.createIcons();

    } else {
      window.location.href = "index.html";
    }
  });
});

// =====================================================
// 🖥️ UI & VISUAL
// =====================================================
function setupUI() {
  document.querySelector(".portal-nome").textContent = `Olá, ${userName.split(" ")[0]}`;
  const badge = document.getElementById("userGroupBadge");
  if(badge) {
    badge.textContent = isAdmin ? "Administrador" : userGroup.toUpperCase();
    badge.style.background = isAdmin ? "#e63946" : "rgba(255,255,255,0.2)";
  }

  if (isAdmin) {
    document.querySelectorAll(".atleta-only").forEach(el => el.remove());
  } else {
    document.querySelectorAll(".admin-only").forEach(el => el.remove());
  }
}

// =====================================================
// 🚴 INTEGRAÇÃO STRAVA (DIAGNÓSTICO)
// =====================================================

// 1. Botão de Conectar
function configurarStravaAtleta() {
  const btn = document.getElementById("btnConnectStrava");
  if (btn) {
    const novoBtn = btn.cloneNode(true);
    btn.parentNode.replaceChild(novoBtn, btn);

    novoBtn.addEventListener("click", async () => {
      try {
        const docSnap = await getDoc(doc(db, "config_sistema", "strava"));
        if (!docSnap.exists()) return alert("ERRO: Admin não configurou as chaves do Strava no painel.");
        
        const { client_id } = docSnap.data();
        if (!client_id) return alert("ERRO: Client ID está vazio nas configurações.");

        const redirect = window.location.href.split('?')[0];
        // Força permissão de leitura
        window.location.href = `http://www.strava.com/oauth/authorize?client_id=${client_id}&response_type=code&redirect_uri=${redirect}&approval_prompt=force&scope=activity:read_all`;
      } catch (e) {
        alert("Erro ao iniciar conexão: " + e.message);
      }
    });
  }
}

// 2. Processar Retorno (AQUI ESTAVA O PROBLEMA GERALMENTE)
async function verificarCallbackStrava() {
  const params = new URLSearchParams(window.location.search);
  const code = params.get("code");

  if (code) {
    // Limpa URL
    window.history.replaceState({}, document.title, window.location.pathname);
    
    // Feedback visual
    const dash = document.getElementById("dashboardCards");
    if(dash) dash.innerHTML = `<div class="card"><p>Validando conexão com Strava...</p></div>`;

    try {
      const snap = await getDoc(doc(db, "config_sistema", "strava"));
      if (!snap.exists()) throw new Error("Configurações do Strava não encontradas no banco.");
      
      const { client_id, client_secret } = snap.data();

      // Tenta trocar o CODE pelo TOKEN
      const res = await fetch('https://www.strava.com/oauth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: client_id,
          client_secret: client_secret,
          code: code,
          grant_type: 'authorization_code'
        })
      });

      const data = await res.json();

      if (data.access_token) {
        localStorage.setItem("strava_access_token", data.access_token);
        alert("✅ Sucesso! Strava Conectado.");
        carregarDashboard(); // Atualiza a tela imediatamente
      } else {
        console.error("Erro Strava:", data);
        alert("❌ Falha na conexão com Strava.\nMotivo: " + (data.message || "Credenciais inválidas ou erro de CORS."));
      }

    } catch (e) {
      console.error(e);
      // Se for erro de CORS (Bloqueio do Navegador), avisamos o usuário
      if (e.message.includes("Failed to fetch")) {
        alert("⚠️ BLOQUEIO DO NAVEGADOR (CORS)\n\nO Strava bloqueou a conexão direta.\n\nSOLUÇÃO PARA TESTE:\nInstale a extensão 'Allow CORS' no Chrome e ative-a, ou rode o projeto em um servidor local com proxy.");
      } else {
        alert("Erro técnico: " + e.message);
      }
    }
  }
}

// 3. Buscar e Exibir Treinos (Sync)
document.getElementById("btnSincronizarStrava")?.addEventListener("click", async () => {
  const token = localStorage.getItem("strava_access_token");
  if(!token) return alert("Você precisa conectar o Strava na aba Configurações primeiro.");
  
  const container = document.getElementById("listaAtividadesStrava");
  container.innerHTML = "<p>Buscando suas atividades...</p>";

  try {
    const res = await fetch("https://www.strava.com/api/v3/athlete/activities?per_page=10", { 
      headers: { "Authorization": `Bearer ${token}` }
    });
    
    if(!res.ok) {
       if(res.status === 401) {
         localStorage.removeItem("strava_access_token");
         throw new Error("Token expirado. Reconecte o Strava.");
       }
       throw new Error("Erro na API do Strava");
    }

    const atividades = await res.json();
    container.innerHTML = "";
    
    if(atividades.length === 0) {
      container.innerHTML = "<p>Nenhuma atividade recente encontrada.</p>";
      return;
    }

    atividades.forEach(atv => {
      const dataF = new Date(atv.start_date).toLocaleDateString('pt-BR');
      const km = (atv.distance / 1000).toFixed(1);
      
      const div = document.createElement("div");
      div.className = "card";
      div.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center;">
           <div>
             <strong style="font-size:1rem;">${atv.name}</strong>
             <div style="font-size:0.85rem; color:#666;">${atv.type} • ${dataF} • ${km} km</div>
           </div>
           <button class="btn-acao btn-enviar-treino" 
              data-nome="${atv.name}" data-km="${km}" data-data="${atv.start_date}"
              style="color:var(--primary); border-color:var(--primary); font-size:0.85rem;">
              Enviar
           </button>
        </div>
      `;
      container.appendChild(div);
    });

    document.querySelectorAll(".btn-enviar-treino").forEach(btn => {
      btn.addEventListener("click", async (e) => {
        const d = e.currentTarget.dataset;
        if(confirm(`Enviar "${d.nome}" para análise do comitê?`)) {
           try {
             await addDoc(collection(db, "treinos_registrados"), {
               atletaId: auth.currentUser.uid,
               atletaNome: userName,
               grupo: userGroup,
               atividade: d.nome,
               km: parseFloat(d.km),
               data: d.data,
               status: "Pendente",
               criadoEm: new Date().toISOString()
             });
             alert("Treino enviado com sucesso!");
             e.currentTarget.textContent = "Enviado";
             e.currentTarget.disabled = true;
           } catch(err) { alert("Erro ao salvar: " + err.message); }
        }
      });
    });

  } catch(e) {
    container.innerHTML = `<p style='color:red'>${e.message}</p>`;
  }
});

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
      const p = await getDocs(query(collection(db, "treinos_registrados"), where("status", "==", "Pendente")));
      container.innerHTML = `
        <div class="card"><i data-lucide="users"></i><h3>Atletas</h3><p>${u.size}</p></div>
        <div class="card"><i data-lucide="check-square"></i><h3>Pendentes</h3><p>${p.size}</p></div>
        <div class="card"><i data-lucide="server"></i><h3>Sistema</h3><p>Online</p></div>
      `;
    } catch(e) { container.innerHTML = "<p>Erro dados.</p>"; }
  } else {
    if(titulo) titulo.textContent = "Seu Desempenho";
    const token = localStorage.getItem("strava_access_token");
    container.innerHTML = token 
      ? `<div class="card"><i data-lucide="check" style="color:green"></i><h3>Strava</h3><p style="color:green">Conectado</p></div>
         <div class="card"><i data-lucide="activity"></i><h3>Treinos</h3><p>Ver Aba</p></div>`
      : `<div class="card" style="border-left:4px solid #fc4c02"><i data-lucide="alert-circle" style="color:#fc4c02"></i><h3>Strava</h3><p style="font-size:0.9rem">Desconectado</p></div>`;
  }
  lucide.createIcons();
}

// =====================================================
// ✅ VALIDAÇÃO & ADMIN (MANTIDOS)
// =====================================================
async function carregarValidacoes() {
  const tbody = document.getElementById("listaValidacao");
  const filtro = document.getElementById("filtroValidacao");
  if(!tbody) return;

  const carregar = async () => {
    tbody.innerHTML = "<tr><td colspan='5'>Carregando...</td></tr>";
    const q = query(collection(db, "treinos_registrados"), where("status", "==", "Pendente"), orderBy("criadoEm", "desc"));
    const snap = await getDocs(q);
    tbody.innerHTML = "";
    
    if(snap.empty) { tbody.innerHTML = "<tr><td colspan='5'>Nenhum treino pendente.</td></tr>"; return; }

    snap.forEach(d => {
      const t = d.data();
      if(filtro.value !== 'todos' && t.grupo !== filtro.value) return;
      const dataF = new Date(t.data).toLocaleDateString('pt-BR');
      tbody.innerHTML += `
        <tr>
          <td>${t.atletaNome}</td>
          <td><span style="background:#eee; padding:2px 6px; border-radius:4px">${t.grupo}</span></td>
          <td>${dataF}</td>
          <td><strong>${t.km} km</strong></td>
          <td>
            <button class="btn-aprovar btn-acao" data-id="${d.id}" style="color:green; border-color:green">✔</button>
            <button class="btn-reprovar btn-acao" data-id="${d.id}" style="color:red; border-color:red">✖</button>
          </td>
        </tr>`;
    });
    document.querySelectorAll(".btn-aprovar").forEach(b => b.addEventListener("click", async e => { await updateDoc(doc(db, "treinos_registrados", e.target.dataset.id), { status: "Aprovado" }); carregar(); }));
    document.querySelectorAll(".btn-reprovar").forEach(b => b.addEventListener("click", async e => { await updateDoc(doc(db, "treinos_registrados", e.target.dataset.id), { status: "Reprovado" }); carregar(); }));
  };
  carregar();
  filtro.addEventListener("change", carregar);
}

// Config Admin
function configurarAdminStrava() {
  const btn = document.getElementById("btnSalvarConfigStrava");
  if(btn) btn.addEventListener("click", async () => {
     const id = document.getElementById("stravaClientId").value;
     const sec = document.getElementById("stravaClientSecret").value;
     await setDoc(doc(db, "config_sistema", "strava"), { client_id: id, client_secret: sec });
     alert("Configurações salvas!");
  });
}

// ... [Funções de Gestão de Atletas, Eventos e Regras mantidas iguais às anteriores] ...
// (Para economizar espaço, elas são idênticas ao código anterior. Mantenha as funções carregarListaAtletas, carregarEventos, carregarRegras, setupNavigation, setupModais, configurarBotoesGlobais do arquivo anterior)

// --- INCLUSÃO DAS FUNÇÕES RESTANTES (MANTENHA ISSO NO ARQUIVO) ---
async function carregarListaAtletas(){const t=document.getElementById("listaAtletas");if(!t)return;const s=await getDocs(collection(db,"atletas"));t.innerHTML="";s.forEach(d=>{const u=d.data();t.innerHTML+=`<tr><td>${u.nome}</td><td>${u.grupo}</td><td>${u.email}</td><td><button class="del-atleta btn-acao" data-id="${d.id}" style="color:red;border:0"><i data-lucide="trash-2"></i></button></td></tr>`;});document.querySelectorAll(".del-atleta").forEach(b=>b.addEventListener("click",async e=>{if(confirm("Excluir?")){await deleteDoc(doc(db,"atletas",e.currentTarget.dataset.id));carregarListaAtletas();}}));lucide.createIcons();}
async function carregarEventos(){const l=document.getElementById("listaEventos");if(!l)return;const s=await getDocs(collection(db,"eventos"));l.innerHTML="";if(s.empty)return l.innerHTML="<div class='card'><p>Sem eventos.</p></div>";s.forEach(d=>{const ev=d.data();const df=ev.data?new Date(ev.data).toLocaleDateString('pt-BR',{timeZone:'UTC'}):'-';l.innerHTML+=`<div class="card" style="border-left:4px solid ${ev.tipo==='Prova'?'#e63946':'#00b37e'}"><div style="display:flex; justify-content:space-between"><h3>${ev.titulo}</h3>${isAdmin?`<button class="del-ev" data-id="${d.id}" style="border:0;bg:none;color:red;cursor:pointer">X</button>`:''}</div><p style="font-size:0.9rem; margin-top:5px">📅 ${df} • ${ev.km?ev.km+'km':ev.tipo}</p></div>`;});if(isAdmin)document.querySelectorAll(".del-ev").forEach(b=>b.addEventListener("click",async e=>{if(confirm("Apagar?")){await deleteDoc(doc(db,"eventos",e.target.dataset.id));carregarEventos();}}));}
document.getElementById("salvarEventoBtn")?.addEventListener("click",async()=>{const t=document.getElementById("eventoTitulo").value;const d=document.getElementById("eventoData").value;const tp=document.getElementById("eventoTipo").value;const k=document.getElementById("eventoKm").value;if(!t||!d)return alert("Preencha título e data");await addDoc(collection(db,"eventos"),{titulo:t,data:d,tipo:tp,km:k,criadoEm:new Date().toISOString()});document.getElementById("modalEvento").style.display="none";carregarEventos();});
async function carregarRegras(){const l=document.getElementById("listaCriterios");if(!l)return;const s=await getDocs(collection(db,"criterios"));l.innerHTML="";if(s.empty)return l.innerHTML="<p>Sem regras.</p>";s.forEach(d=>{const r=d.data();l.innerHTML+=`<div class="card" style="padding:15px; border-left:4px solid var(--secondary); margin-bottom:10px"><div style="display:flex; justify-content:space-between"><strong>${r.descricao}</strong><div><span style="color:var(--primary); font-weight:bold">${r.pontos} pts</span><button class="del-regra" data-id="${d.id}" style="color:red; border:0; bg:none; cursor:pointer; margin-left:10px">X</button></div></div></div>`;});document.querySelectorAll(".del-regra").forEach(b=>b.addEventListener("click",async e=>{await deleteDoc(doc(db,"criterios",e.target.dataset.id));carregarRegras();}));}
document.getElementById("salvarCriterioBtn")?.addEventListener("click",async()=>{const d=document.getElementById("regraDesc").value;const p=document.getElementById("regraPontos").value;const t=document.getElementById("regraTipo").value;if(!d||!p)return alert("Preencha tudo");await addDoc(collection(db,"criterios"),{descricao:d,pontos:p,tipo:t});document.getElementById("modalCriterio").style.display="none";carregarRegras();});
function setupNavigation(){document.querySelectorAll(".menu-item").forEach(m=>m.addEventListener("click",()=>{document.querySelectorAll(".menu-item").forEach(x=>x.classList.remove("active"));m.classList.add("active");const t=m.dataset.section;document.querySelectorAll("main section").forEach(s=>{s.classList.remove("active-section");if(s.id===t)s.classList.add("active-section");});lucide.createIcons();}));}
function setupModais(){const me=document.getElementById("modalEvento");const mc=document.getElementById("modalCriterio");document.getElementById("abrirModalEvento")?.addEventListener("click",()=>me.style.display="flex");document.getElementById("abrirModalCriterio")?.addEventListener("click",()=>mc.style.display="flex");document.querySelectorAll(".fechar-modal").forEach(b=>b.addEventListener("click",()=>{if(me)me.style.display="none";if(mc)mc.style.display="none";}));}
function configurarBotoesGlobais(){document.getElementById("logoutBtn")?.addEventListener("click",()=>{signOut(auth).then(()=>{localStorage.clear();window.location.href="index.html"});});}
