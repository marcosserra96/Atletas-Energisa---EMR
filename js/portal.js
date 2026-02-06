import { 
  db, auth, collection, getDocs, doc, setDoc, getDoc, addDoc, deleteDoc, updateDoc, signOut, 
  onAuthStateChanged, query, where, orderBy 
} from "./firebase.js";

// Variáveis Globais
let userName = "Atleta";
let userEmail = "";
let userGroup = "atleta";
const ADMIN_EMAIL = "marcospauloserra@outlook.com.br";
let isAdmin = false;

window.addEventListener("DOMContentLoaded", () => {
  setupUI();
  
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      userEmail = user.email;
      isAdmin = userEmail.toLowerCase() === ADMIN_EMAIL.toLowerCase();

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
      } catch (e) { console.error(e); }

      userName = localStorage.getItem("userName") || "Atleta";
      userGroup = localStorage.getItem("userGroup") || "atleta";

      setupUI();
      setupNavigation();
      setupModais();
      configurarBotoesGlobais();

      if (isAdmin) {
        carregarListaAtletas();
        carregarValidacoes();
        carregarRegras(); // ✅ Trazido de volta
      } else {
        configurarStravaAtleta();
      }
      
      carregarEventos();
      carregarDashboard();
      await verificarCallbackStrava();
      lucide.createIcons();

    } else {
      window.location.href = "index.html";
    }
  });
});

// --- UI ---
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

// --- 🏃 MEUS TREINOS (ATLETA) ---
document.getElementById("btnSincronizarStrava")?.addEventListener("click", async () => {
  const token = localStorage.getItem("strava_access_token");
  if(!token) return alert("Conecte o Strava na aba Configurações primeiro.");
  
  const container = document.getElementById("listaAtividadesStrava");
  container.innerHTML = "<p>Buscando atividades...</p>";

  try {
    const res = await fetch("https://www.strava.com/api/v3/athlete/activities?per_page=10", { 
      headers: { "Authorization": `Bearer ${token}` }
    });
    if(!res.ok) throw new Error("Erro Strava");
    const atividades = await res.json();
    container.innerHTML = "";
    
    atividades.forEach(atv => {
      const dataFormatada = new Date(atv.start_date).toLocaleDateString('pt-BR');
      const km = (atv.distance / 1000).toFixed(1);
      
      const div = document.createElement("div");
      div.className = "card";
      div.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center">
           <div><strong>${atv.name}</strong><div style="font-size:0.85rem; color:#666;">${dataFormatada} • ${km} km</div></div>
           <button class="btn-acao btn-enviar-treino" data-id="${atv.id}" data-nome="${atv.name}" data-km="${km}" data-data="${atv.start_date}" style="color:var(--primary); border-color:var(--primary)">Enviar</button>
        </div>`;
      container.appendChild(div);
    });

    document.querySelectorAll(".btn-enviar-treino").forEach(btn => {
      btn.addEventListener("click", async (e) => {
        const d = e.currentTarget.dataset;
        if(confirm(`Enviar treino "${d.nome}"?`)) {
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
           alert("Enviado para validação!");
           e.currentTarget.textContent = "Enviado";
           e.currentTarget.disabled = true;
        }
      });
    });
  } catch(e) { container.innerHTML = "<p style='color:red'>Erro. Tente reconectar o Strava.</p>"; }
});

// --- ✅ VALIDAÇÃO (ADMIN) ---
async function carregarValidacoes() {
  const tbody = document.getElementById("listaValidacao");
  const filtro = document.getElementById("filtroValidacao");
  if(!tbody) return;

  const carregar = async () => {
    tbody.innerHTML = "<tr><td colspan='5'>Carregando...</td></tr>";
    let q = query(collection(db, "treinos_registrados"), where("status", "==", "Pendente"), orderBy("criadoEm", "desc"));
    const snap = await getDocs(q);
    tbody.innerHTML = "";
    
    if(snap.empty) { tbody.innerHTML = "<tr><td colspan='5'>Nada pendente.</td></tr>"; return; }

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

    document.querySelectorAll(".btn-aprovar").forEach(b => b.addEventListener("click", async e => {
       await updateDoc(doc(db, "treinos_registrados", e.target.dataset.id), { status: "Aprovado" }); carregar();
    }));
    document.querySelectorAll(".btn-reprovar").forEach(b => b.addEventListener("click", async e => {
       await updateDoc(doc(db, "treinos_registrados", e.target.dataset.id), { status: "Reprovado" }); carregar();
    }));
  };
  carregar();
  filtro.addEventListener("change", carregar);
}

// --- 🏅 REGRAS (ADMIN) - RESGATADO ---
async function carregarRegras() {
  const l = document.getElementById("listaCriterios"); if(!l) return;
  const s = await getDocs(collection(db, "criterios")); l.innerHTML="";
  if(s.empty) return l.innerHTML="<p>Sem regras.</p>";
  s.forEach(d=>{ const r=d.data(); l.innerHTML+=`<div class="card" style="padding:15px; border-left:4px solid var(--secondary); margin-bottom:10px"><div style="display:flex; justify-content:space-between"><strong>${r.descricao}</strong><div><span style="color:var(--primary); font-weight:bold">${r.pontos} pts</span><button class="del-regra" data-id="${d.id}" style="color:red; border:0; bg:none; cursor:pointer; margin-left:10px">X</button></div></div></div>`;});
  document.querySelectorAll(".del-regra").forEach(b=>b.addEventListener("click",async e=>{ await deleteDoc(doc(db,"criterios",e.target.dataset.id)); carregarRegras(); }));
}
document.getElementById("salvarCriterioBtn")?.addEventListener("click", async()=>{
  const d=document.getElementById("regraDesc").value; const p=document.getElementById("regraPontos").value; const t=document.getElementById("regraTipo").value;
  if(!d||!p)return alert("Preencha tudo");
  await addDoc(collection(db,"criterios"),{descricao:d,pontos:p,tipo:t});
  document.getElementById("modalCriterio").style.display="none"; carregarRegras();
});

// --- GESTÃO & EVENTOS ---
async function carregarListaAtletas() {
  const t=document.getElementById("listaAtletas"); if(!t)return;
  const s=await getDocs(collection(db,"atletas")); t.innerHTML="";
  s.forEach(d=>{const u=d.data(); t.innerHTML+=`<tr><td>${u.nome}</td><td>${u.grupo}</td><td>${u.email}</td><td><button class="del-atleta btn-acao" data-id="${d.id}" style="color:red;border:0"><i data-lucide="trash-2"></i></button></td></tr>`;});
  document.querySelectorAll(".del-atleta").forEach(b=>b.addEventListener("click",async e=>{if(confirm("Excluir?")){await deleteDoc(doc(db,"atletas",e.currentTarget.dataset.id)); carregarListaAtletas();}}));
  lucide.createIcons();
}
async function carregarEventos() {
  const l=document.getElementById("listaEventos"); if(!l)return;
  const s=await getDocs(collection(db,"eventos")); l.innerHTML="";
  s.forEach(d=>{const ev=d.data(); const df=ev.data?new Date(ev.data).toLocaleDateString('pt-BR',{timeZone:'UTC'}):'-'; l.innerHTML+=`<div class="card" style="border-left:4px solid ${ev.tipo==='Prova'?'#e63946':'#00b37e'}"><div style="display:flex; justify-content:space-between"><h3>${ev.titulo}</h3>${isAdmin?`<button class="del-ev" data-id="${d.id}" style="border:0;bg:none;color:red;cursor:pointer">X</button>`:''}</div><p style="font-size:0.9rem; margin-top:5px">📅 ${df} • ${ev.km?ev.km+'km':ev.tipo}</p></div>`;});
  if(isAdmin) document.querySelectorAll(".del-ev").forEach(b=>b.addEventListener("click",async e=>{if(confirm("Apagar?")){await deleteDoc(doc(db,"eventos",e.target.dataset.id)); carregarEventos();}}));
}
document.getElementById("salvarEventoBtn")?.addEventListener("click", async()=>{
  const t=document.getElementById("eventoTitulo").value; const d=document.getElementById("eventoData").value; const tp=document.getElementById("eventoTipo").value; const k=document.getElementById("eventoKm").value;
  if(!t||!d)return alert("Preencha título e data");
  await addDoc(collection(db,"eventos"),{titulo:t,data:d,tipo:tp,km:k,criadoEm:new Date().toISOString()});
  document.getElementById("modalEvento").style.display="none"; carregarEventos();
});

// --- DASHBOARD & UTILS ---
async function carregarDashboard(){
  const c=document.getElementById("dashboardCards"); const t=document.getElementById("tituloDashboard"); if(!c)return;
  if(isAdmin){
    if(t)t.textContent="Painel de Controle";
    try{const u=await getDocs(collection(db,"atletas")); const p=await getDocs(query(collection(db,"treinos_registrados"),where("status","==","Pendente"))); c.innerHTML=`<div class="card"><i data-lucide="users"></i><h3>Atletas</h3><p>${u.size}</p></div><div class="card"><i data-lucide="check-square"></i><h3>Pendentes</h3><p>${p.size}</p></div>`;}catch(e){c.innerHTML="<p>Erro.</p>";}
  }else{
    if(t)t.textContent="Seu Desempenho";
    const tk=localStorage.getItem("strava_access_token");
    c.innerHTML=tk?`<div class="card"><i data-lucide="check"></i><h3>Strava</h3><p>Conectado</p></div>`:`<div class="card" style="border-left:4px solid #fc4c02"><i data-lucide="alert-circle"></i><h3>Strava</h3><p>Desconectado</p></div>`;
  }
}
function setupNavigation(){document.querySelectorAll(".menu-item").forEach(m=>m.addEventListener("click",()=>{document.querySelectorAll(".menu-item").forEach(x=>x.classList.remove("active")); m.classList.add("active"); const t=m.dataset.section; document.querySelectorAll("main section").forEach(s=>{s.classList.remove("active-section");if(s.id===t)s.classList.add("active-section");}); lucide.createIcons();}));}
function setupModais(){
  const me=document.getElementById("modalEvento"); const mc=document.getElementById("modalCriterio");
  document.getElementById("abrirModalEvento")?.addEventListener("click",()=>me.style.display="flex");
  document.getElementById("abrirModalCriterio")?.addEventListener("click",()=>mc.style.display="flex");
  document.querySelectorAll(".fechar-modal").forEach(b=>b.addEventListener("click",()=>{if(me)me.style.display="none"; if(mc)mc.style.display="none";}));
}
function configurarBotoesGlobais(){ document.getElementById("logoutBtn")?.addEventListener("click",()=>{signOut(auth).then(()=>{localStorage.clear();window.location.href="index.html"});}); }
function configurarStravaAtleta(){
  const b=document.getElementById("btnConnectStrava"); if(b){
     const n=b.cloneNode(true); b.parentNode.replaceChild(n,b);
     n.addEventListener("click",async()=>{try{const s=await getDoc(doc(db,"config_sistema","strava"));if(s.exists()){const{client_id}=s.data();window.location.href=`http://www.strava.com/oauth/authorize?client_id=${client_id}&response_type=code&redirect_uri=${window.location.href.split('?')[0]}&approval_prompt=force&scope=activity:read_all`;}else alert("Admin não configurou Strava.");}catch(e){alert("Erro conexão.");}});
  }
}
async function verificarCallbackStrava(){const c=new URLSearchParams(window.location.search).get("code");if(c){window.history.replaceState({},document.title,window.location.pathname);try{const s=await getDoc(doc(db,"config_sistema","strava"));if(s.exists()){const{client_id,client_secret}=s.data();const r=await fetch('https://www.strava.com/oauth/token',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({client_id,client_secret,code:c,grant_type:'authorization_code'})});const d=await r.json();if(d.access_token){localStorage.setItem("strava_access_token",d.access_token);alert("Conectado!");carregarDashboard();}}}catch(e){console.error(e);}}}
function configurarAdminStrava(){const b=document.getElementById("btnSalvarConfigStrava");if(b)b.addEventListener("click",async()=>{const id=document.getElementById("stravaClientId").value;const sec=document.getElementById("stravaClientSecret").value;await setDoc(doc(db,"config_sistema","strava"),{client_id:id,client_secret:sec});alert("Salvo!");});}
