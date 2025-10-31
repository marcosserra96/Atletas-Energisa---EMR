import { auth, db } from "./firebase-config.js";
import {
  collection, query, where, onSnapshot, updateDoc, doc,
  getDocs, addDoc, deleteDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "index.html";
    return;
  }

  const tabelaPendentes = document.querySelector("#atividadesPendentes tbody");
  const listaEventos = document.getElementById("listaEventos");
  const rankingBody = document.querySelector("#rankingTabela tbody");
  const tabButtons = document.querySelectorAll(".tab-btn");
  let tipoAtual = "bike";

  // 🔄 Carrega atividades pendentes
  const q = query(collection(db, "atividades"), where("status", "==", "pendente"));
  onSnapshot(q, async (snapshot) => {
    tabelaPendentes.innerHTML = "";
    const usersSnap = await getDocs(collection(db, "users"));
    const userMap = {};
    usersSnap.forEach(u => userMap[u.id] = u.data().nome);

    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${userMap[data.atletaId] || "—"}</td>
        <td>${data.tipo}</td>
        <td>${data.km}</td>
        <td>${data.data}</td>
        <td>${data.presencial ? "Sim" : "Não"}</td>
        <td>${data.uniforme ? "Sim" : "Não"}</td>
        <td>${data.eventoExtra || "-"}</td>
        <td>
          <button class="btn-validar" data-id="${docSnap.id}" data-status="validado"><i class="bi bi-check-circle"></i></button>
          <button class="btn-rejeitar" data-id="${docSnap.id}" data-status="rejeitado"><i class="bi bi-x-circle"></i></button>
        </td>
      `;
      tabelaPendentes.appendChild(tr);
    });

    document.querySelectorAll(".btn-validar, .btn-rejeitar").forEach(btn => {
      btn.addEventListener("click", async () => {
        const id = btn.getAttribute("data-id");
        const novoStatus = btn.getAttribute("data-status");
        await updateDoc(doc(db, "atividades", id), {
          status: novoStatus,
          aprovadoPor: user.uid
        });
      });
    });
  });

  // 🎯 Gerenciamento de eventos extras
  const eventosRef = collection(db, "eventos");
  const eventosQuery = query(eventosRef);
  onSnapshot(eventosQuery, (snapshot) => {
    listaEventos.innerHTML = "";
    snapshot.forEach((docSnap) => {
      const evento = docSnap.data();
      const div = document.createElement("div");
      div.classList.add("treino-card");
      div.innerHTML = `
        <p><strong>${evento.nome}</strong> (${evento.equipe}) — ${evento.data}</p>
        <p>Pontos: ${evento.pontos}</p>
        <button class="btn-excluir" data-id="${docSnap.id}"><i class="bi bi-trash"></i></button>
      `;
      listaEventos.appendChild(div);
    });

    document.querySelectorAll(".btn-excluir").forEach(btn => {
      btn.addEventListener("click", async () => {
        await deleteDoc(doc(db, "eventos", btn.getAttribute("data-id")));
      });
    });
  });

  // ➕ Adicionar novo evento
  document.getElementById("addEvento").addEventListener("click", async () => {
    const nome = document.getElementById("nomeEvento").value.trim();
    const equipe = document.getElementById("equipeEvento").value;
    const data = document.getElementById("dataEvento").value;
    const pontos = parseInt(document.getElementById("pontosEvento").value);
    if (!nome || !data || !pontos) return alert("Preencha todos os campos do evento.");

    await addDoc(eventosRef, {
      nome,
      equipe,
      data,
      pontos,
      ativo: true,
      criadoEm: serverTimestamp()
    });

    document.getElementById("nomeEvento").value = "";
    document.getElementById("dataEvento").value = "";
    document.getElementById("pontosEvento").value = "";
  });

  // 🏆 Ranking consolidado
  tabButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      tabButtons.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      tipoAtual = btn.getAttribute("data-tipo");
      carregarRanking(tipoAtual);
    });
  });

  async function carregarRanking(tipo) {
    const q = query(collection(db, "atividades"), where("tipo", "==", tipo), where("status", "==", "validado"));
    const snapshot = await getDocs(q);
    const usersSnap = await getDocs(collection(db, "users"));
    const userMap = {};
    usersSnap.forEach(u => userMap[u.id] = u.data().nome);

    const ranking = {};
    snapshot.forEach(docSnap => {
      const d = docSnap.data();
      if (!ranking[d.atletaId]) {
        ranking[d.atletaId] = { km: 0, atividades: 0, pontos: 0 };
      }
      ranking[d.atletaId].km += Number(d.km || 0);
      ranking[d.atletaId].atividades++;
      ranking[d.atletaId].pontos += (d.pontuacao || 0) + (d.eventoExtra ? 10 : 0);
    });

    const lista = Object.keys(ranking).map(uid => ({
      nome: userMap[uid] || "—",
      ...ranking[uid]
    })).sort((a, b) => b.pontos - a.pontos);

    rankingBody.innerHTML = "";
    lista.forEach(r => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${r.nome}</td>
        <td>${r.km.toFixed(1)}</td>
        <td>${r.atividades}</td>
        <td><strong>${r.pontos}</strong></td>
      `;
      rankingBody.appendChild(tr);
    });
  }

  // 🔁 Atualiza ranking em tempo real
  onSnapshot(collection(db, "atividades"), () => carregarRanking(tipoAtual));
  carregarRanking(tipoAtual);

  // 🔴 Logout
  document.getElementById("logoutBtn").addEventListener("click", async () => {
    await signOut(auth);
    localStorage.removeItem("userRole");
    window.location.href = "index.html";
  });
});
