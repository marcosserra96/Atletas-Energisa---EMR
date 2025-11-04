// =====================================================
// ⚙️ Importação Firebase
// =====================================================
import { db } from "./firebase.js";
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

// =====================================================
// 🌙 Tema Claro / Escuro (persistente)
// =====================================================
const themeToggle = document.getElementById("theme-toggle");
const body = document.body;
const savedTheme = localStorage.getItem("theme") || "light";
body.setAttribute("data-theme", savedTheme);
if (savedTheme === "dark") themeToggle.innerHTML = `<i data-lucide="sun"></i>`;
lucide.createIcons();

themeToggle.addEventListener("click", () => {
  const isDark = body.getAttribute("data-theme") === "dark";
  body.setAttribute("data-theme", isDark ? "light" : "dark");
  localStorage.setItem("theme", isDark ? "light" : "dark");
  themeToggle.innerHTML = isDark
    ? `<i data-lucide="moon"></i>`
    : `<i data-lucide="sun"></i>`;
  lucide.createIcons();
});

// =====================================================
// 👤 Exibir nome do usuário automaticamente
// =====================================================
function carregarNomeUsuario() {
  const userNameEl = document.getElementById("userName");
  if (!userNameEl) return;

  // 🔹 tenta primeiro pelo localStorage (usado após login)
  let nomeUsuario = localStorage.getItem("userName");

  // 🔹 se não houver, tenta pegar de userData salvo
  if (!nomeUsuario) {
    try {
      const userData = JSON.parse(localStorage.getItem("userData"));
      nomeUsuario = userData?.displayName || userData?.nome || "";
    } catch {
      nomeUsuario = "";
    }
  }

  // 🔹 fallback
  if (!nomeUsuario || nomeUsuario.trim() === "") {
    nomeUsuario = "Usuário";
  }

  // 🔹 capitaliza e mostra só o primeiro nome
  nomeUsuario = nomeUsuario.trim();
  const primeiroNome = nomeUsuario.split(" ")[0];
  userNameEl.textContent =
    primeiroNome.charAt(0).toUpperCase() + primeiroNome.slice(1).toLowerCase();
}

// chama ao carregar
window.addEventListener("load", carregarNomeUsuario);

// =====================================================
// 🚪 Logout
// =====================================================
document.getElementById("logoutBtn").addEventListener("click", () => {
  localStorage.clear();
  window.location.href = "index.html";
});

// =====================================================
// 🧭 Navegação entre seções
// =====================================================
const menuItems = document.querySelectorAll(".menu-item");
const sections = document.querySelectorAll("main section");

menuItems.forEach((item) => {
  item.addEventListener("click", () => {
    menuItems.forEach((i) => i.classList.remove("active"));
    item.classList.add("active");
    const target = item.getAttribute("data-section");

    sections.forEach((sec) => {
      sec.classList.remove("active-section");
      if (sec.id === target) sec.classList.add("active-section");
    });
    lucide.createIcons();
  });
});

// =====================================================
// 📊 Dashboard — Gráficos e Contadores
// =====================================================
async function carregarDashboard() {
  const atletasSnap = await getDocs(collection(db, "atletas"));
  const eventosSnap = await getDocs(collection(db, "eventos"));
  const criteriosSnap = await getDocs(collection(db, "criterios"));

  document.getElementById("totalAtletas").textContent = atletasSnap.size;
  document.getElementById("totalEventos").textContent = eventosSnap.size;
  document.getElementById("totalCriterios").textContent = criteriosSnap.size;

  // Ranking simples (pontuação somada)
  const rankingList = document.getElementById("rankingList");
  rankingList.innerHTML = "";
  const ranking = [];

  const atletas = [];
  atletasSnap.forEach((docSnap) => atletas.push(docSnap.data()));

  atletas.forEach((a) => {
    ranking.push({
      nome: a.nome,
      pontos: a.pontos || 0
    });
  });

  ranking
    .sort((a, b) => b.pontos - a.pontos)
    .slice(0, 5)
    .forEach((r) => {
      const li = document.createElement("li");
      li.textContent = `⭐ ${r.nome} — ${r.pontos} pts`;
      rankingList.appendChild(li);
    });

  // Gráfico de participação mensal
  const ctx = document.getElementById("graficoParticipacao");
  if (ctx) {
    const chart = new Chart(ctx, {
      type: "line",
      data: {
        labels: [
          "Jan",
          "Fev",
          "Mar",
          "Abr",
          "Mai",
          "Jun",
          "Jul",
          "Ago",
          "Set",
          "Out",
          "Nov",
          "Dez"
        ],
        datasets: [
          {
            label: "Participações",
            data: [3, 5, 4, 7, 9, 8, 10, 6, 7, 5, 4, 9],
            borderColor: "#009bc1",
            backgroundColor: "rgba(0,155,193,0.2)",
            borderWidth: 2,
            fill: true,
            tension: 0.4
          }
        ]
      },
      options: {
        plugins: { legend: { display: false } },
        scales: {
          y: { beginAtZero: true }
        }
      }
    });
  }
}

// =====================================================
// 👟 Atletas + Validação de Treinos
// =====================================================
async function carregarAtletas() {
  const tbody = document.getElementById("listaAtletas");
  tbody.innerHTML = "";

  const snap = await getDocs(collection(db, "atletas"));
  snap.forEach((docSnap) => {
    const atleta = docSnap.data();
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${atleta.nome}</td>
      <td>${atleta.equipe}</td>
      <td>${atleta.status || "Ativo"}</td>
      <td>
        <button class="btn-mini" data-id="${docSnap.id}" data-action="editar">✏️</button>
        <button class="btn-mini" data-id="${docSnap.id}" data-action="excluir">🗑️</button>
      </td>`;
    tbody.appendChild(tr);
  });
}

// =====================================================
// 🗓️ Eventos
// =====================================================
const modalEvento = document.getElementById("modalEvento");
const novoEventoBtn = document.getElementById("novoEventoBtn");
const cancelarModal = document.getElementById("cancelarModal");
const salvarEvento = document.getElementById("salvarEvento");

novoEventoBtn.addEventListener("click", () => (modalEvento.style.display = "flex"));
cancelarModal.addEventListener("click", () => (modalEvento.style.display = "none"));

salvarEvento.addEventListener("click", async () => {
  const titulo = document.getElementById("eventoTitulo").value;
  const tipo = document.getElementById("eventoTipo").value;
  const equipe = document.getElementById("eventoEquipe").value;
  const km = document.getElementById("eventoKm").value;
  const data = document.getElementById("eventoData").value;
  const link = document.getElementById("eventoLink").value;

  if (!titulo || !data || !tipo) {
    alert("Preencha os campos obrigatórios!");
    return;
  }

  await addDoc(collection(db, "eventos"), {
    titulo,
    tipo,
    equipe,
    km,
    data,
    link
  });

  modalEvento.style.display = "none";
  carregarEventos();
});

// Carregar lista de eventos
async function carregarEventos() {
  const lista = document.getElementById("listaEventos");
  lista.innerHTML = "<p>Carregando...</p>";

  const snap = await getDocs(collection(db, "eventos"));
  lista.innerHTML = "";
  snap.forEach((docSnap) => {
    const evento = docSnap.data();
    const div = document.createElement("div");
    div.classList.add("card-evento");
    div.innerHTML = `
      <h4>${evento.titulo}</h4>
      <p><strong>Data:</strong> ${evento.data}</p>
      <p><strong>Tipo:</strong> ${evento.tipo}</p>
      <p><strong>Equipe:</strong> ${evento.equipe}</p>
      <p><strong>KM:</strong> ${evento.km || "-"}</p>
    `;
    lista.appendChild(div);
  });
}

// =====================================================
// 🏅 Critérios
// =====================================================
const modalCriterio = document.getElementById("modalCriterio");
const novoCriterioBtn = document.getElementById("novoCriterioBtn");
const cancelarCriterio = document.getElementById("cancelarCriterio");
const salvarCriterio = document.getElementById("salvarCriterio");

novoCriterioBtn.addEventListener("click", () => (modalCriterio.style.display = "flex"));
cancelarCriterio.addEventListener("click", () => (modalCriterio.style.display = "none"));

salvarCriterio.addEventListener("click", async () => {
  const descricao = document.getElementById("criterioDescricao").value;
  const pontuacao = document.getElementById("criterioPontuacao").value;
  const aplicavel = document.getElementById("criterioAplicavel").value;

  if (!descricao || !pontuacao) {
    alert("Preencha todos os campos!");
    return;
  }

  await addDoc(collection(db, "criterios"), {
    descricao,
    pontuacao: Number(pontuacao),
    aplicavel
  });

  modalCriterio.style.display = "none";
  carregarCriterios();
});

async function carregarCriterios() {
  const lista = document.getElementById("listaCriterios");
  lista.innerHTML = "<p>Carregando...</p>";

  const snap = await getDocs(collection(db, "criterios"));
  lista.innerHTML = "";
  snap.forEach((docSnap) => {
    const crit = docSnap.data();
    const div = document.createElement("div");
    div.classList.add("card-criterio");
    div.innerHTML = `
      <h4>${crit.descricao}</h4>
      <p><strong>Pontuação:</strong> ${crit.pontuacao}</p>
      <p><strong>Aplicável:</strong> ${crit.aplicavel || "Global"}</p>
    `;
    lista.appendChild(div);
  });
}

// =====================================================
// 🔒 Alterar Senha (modal)
// =====================================================
const modalSenha = document.getElementById("modalSenha");
document.getElementById("btnAlterarSenha").addEventListener("click", () => {
  modalSenha.style.display = "flex";
});
document.getElementById("cancelarSenha").addEventListener("click", () => {
  modalSenha.style.display = "none";
});
document.getElementById("salvarSenha").addEventListener("click", () => {
  alert("Senha alterada com sucesso! (simulação)");
  modalSenha.style.display = "none";
});

// =====================================================
// 🚀 Inicialização
// =====================================================
window.addEventListener("DOMContentLoaded", () => {
  carregarDashboard();
  carregarAtletas();
  carregarEventos();
  carregarCriterios();
  inicializarControleDeCalendario(); // 🔹 nova função que gerencia o calendário
});

// =======================================================
// 📅 FULLCALENDAR — CALENDÁRIO INTERATIVO DE EVENTOS
// =======================================================
function inicializarControleDeCalendario() {
  let calendario;
  const alternarVisaoBtn = document.getElementById("alternarVisao");
  const listaEventos = document.getElementById("listaEventos");
  const calendarioEventos = document.getElementById("calendarioEventos");

  if (alternarVisaoBtn && listaEventos && calendarioEventos) {
    alternarVisaoBtn.addEventListener("click", () => {
      const mostrandoLista = listaEventos.style.display !== "none";
      listaEventos.style.display = mostrandoLista ? "none" : "block";
      calendarioEventos.style.display = mostrandoLista ? "block" : "none";

      alternarVisaoBtn.innerHTML = mostrandoLista
        ? '<i data-lucide="list"></i> Lista'
        : '<i data-lucide="calendar-days"></i> Calendário';
      lucide.createIcons();

      if (mostrandoLista && !calendario) inicializarCalendarioInterativo();
    });
  }

function inicializarCalendarioInterativo() {
  const calendarEl = document.getElementById("calendarioEventos");

  calendario = new FullCalendar.Calendar(calendarEl, {
    locale: "pt-br",
    initialView: "dayGridMonth",
    height: "auto",
    themeSystem: "standard",
    buttonText: {
      today: "Hoje",
      month: "Mês",
      week: "Semana",
      day: "Dia"
    },
    headerToolbar: {
      left: "prev,next today",
      center: "title",
      right: "dayGridMonth,timeGridWeek,timeGridDay"
    },

    // 🔹 Carrega os eventos do Firestore
    events: async function (fetchInfo, successCallback, failureCallback) {
      try {
        const snapshot = await getDocs(collection(db, "eventos"));
        const eventos = snapshot.docs
          .map(doc => {
            const data = doc.data();
            if (!data.dataISO && !data.data) return null;
            return {
              id: doc.id,
              title: data.titulo || "Sem título",
              start: data.dataISO || converterDataBrasileira(data.data),
              extendedProps: {
                equipe: data.equipe || "",
                tipo: data.tipo || "",
                km: data.km || ""
              }
            };
          })
          .filter(Boolean);
        successCallback(eventos);
      } catch (error) {
        console.error("Erro ao carregar eventos:", error);
        failureCallback(error);
      }
    },

    // 🔹 Clique no evento → popup de opções
    eventClick: function (info) {
      const evento = info.event;
      const dados = evento.extendedProps;

      const titulo = evento.title;
      const descricao = `Equipe: ${dados.equipe}\nTipo: ${dados.tipo}\nKM: ${dados.km}`;
      const dataInicio = new Date(evento.start);
      const dataFim = new Date(dataInicio);
      dataFim.setHours(dataFim.getHours() + 1);

      const dtStart = dataInicio.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
      const dtEnd = dataFim.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";

      const icsContent = `
BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Portal Comitê Energisa//Calendário de Eventos//PT
BEGIN:VEVENT
UID:${evento.id}@energisa.com.br
DTSTAMP:${dtStart}
DTSTART:${dtStart}
DTEND:${dtEnd}
SUMMARY:${titulo}
DESCRIPTION:${descricao}
END:VEVENT
END:VCALENDAR`.trim();

      const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
      const url = URL.createObjectURL(blob);

      const googleUrl = new URL("https://calendar.google.com/calendar/render");
      googleUrl.searchParams.set("action", "TEMPLATE");
      googleUrl.searchParams.set("text", titulo);
      googleUrl.searchParams.set("details", descricao);
      googleUrl.searchParams.set("dates", `${dtStart}/${dtEnd}`);

      const popup = document.createElement("div");
popup.classList.add("evento-popup");
popup.innerHTML = `
  <div class="evento-popup-content">
    <h3>${titulo}</h3>
    <p><strong>Equipe:</strong> ${dados.equipe || "-"}<br>
       <strong>Tipo:</strong> ${dados.tipo || "-"}<br>
       <strong>KM:</strong> ${dados.km || "-"}</p>

    <div class="popup-botoes">
      <a href="${url}" download="${titulo}.ics" class="btn-acao">📥 Adicionar ao Outlook / iOS</a>
      <a href="${googleUrl}" target="_blank" class="btn-acao">📆 Adicionar ao Google Calendar</a>
      <button class="btn-cancelar fechar-popup">Fechar</button>
    </div>
  </div>
`;
document.body.appendChild(popup);

// Fecha ao clicar no X ou no botão
popup.querySelector(".fechar-popup").addEventListener("click", () => popup.remove());
popup.querySelector(".evento-popup-content").addEventListener("click", e => e.stopPropagation());
popup.addEventListener("click", () => popup.remove());

    },

    // 🔹 Clique em uma data → abre modal de novo evento
    dateClick: function () {
      document.getElementById("novoEventoBtn").click();
    }
  });

  calendario.render();
}

// 🔹 Converte data “05/11/2025” → “2025-11-05”
function converterDataBrasileira(dataBR) {
  if (!dataBR) return null;
  const [dia, mes, ano] = dataBR.split("/");
  return `${ano}-${mes}-${dia}`;
}

}
;
// =====================================================
// 📱 Barra flutuante responsiva com animação
// =====================================================
const menuFlutuante = document.querySelector(".menu-flutuante");

function atualizarModoMenu() {
  const largura = window.innerWidth;
  const jaCompacta = menuFlutuante.classList.contains("compacta");

  if (largura <= 768 && !jaCompacta) {
    // entra em modo compacto com delay e animação
    menuFlutuante.classList.add("compacta");
    document.body.classList.add("menu-compacto");
    setTimeout(() => {
      menuFlutuante.style.opacity = "1";
    }, 50);
  } 
  else if (largura > 768 && jaCompacta) {
    // sai com animação reversa antes de remover classes
    menuFlutuante.classList.add("saindo");
    setTimeout(() => {
      menuFlutuante.classList.remove("compacta", "saindo");
      document.body.classList.remove("menu-compacto");
      menuFlutuante.style.opacity = "1";
    }, 300);
  }
}

// detecta resize e load
window.addEventListener("resize", atualizarModoMenu);
window.addEventListener("load", atualizarModoMenu);

