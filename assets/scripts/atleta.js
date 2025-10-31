import { auth, db } from "./firebase-config.js";
import {
  collection, addDoc, serverTimestamp, query, where,
  orderBy, onSnapshot, getDocs
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";

// 🔒 Protege o acesso
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "index.html";
    return;
  }

  const atletaId = user.uid;
  const tabelaBody = document.querySelector("#historicoTabela tbody");
  const ultimosTreinosDiv = document.getElementById("ultimosTreinos");
  const eventoExtraSelect = document.getElementById("eventoExtra");

  // 🔄 Carrega eventos extras da equipe do atleta
  const userDoc = await getDocs(query(collection(db, "users"), where("email", "==", user.email)));
  let equipe = "corrida";
  userDoc.forEach((doc) => { equipe = doc.data().equipe || "corrida"; });

  const eventosSnap = await getDocs(query(collection(db, "eventos"), where("equipe", "==", equipe), where("ativo", "==", true)));
  eventosSnap.forEach((doc) => {
    const opt = document.createElement("option");
    opt.value = doc.data().nome;
    opt.textContent = doc.data().nome;
    eventoExtraSelect.appendChild(opt);
  });

  // 🔄 Atualiza histórico e últimos treinos em tempo real
  const q = query(collection(db, "atividades"), where("atletaId", "==", atletaId), orderBy("criadoEm", "desc"));
  onSnapshot(q, (snapshot) => {
    tabelaBody.innerHTML = "";
    ultimosTreinosDiv.innerHTML = "";

    snapshot.forEach((doc, index) => {
      const data = doc.data();
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${data.data || ""}</td>
        <td>${data.tipo}</td>
        <td>${data.km}</td>
        <td>${data.presencial ? "Sim" : "Não"}</td>
        <td>${data.uniforme ? "Sim" : "Não"}</td>
        <td>${data.eventoExtra || "-"}</td>
        <td>${data.status}</td>
      `;
      tabelaBody.appendChild(tr);

      if (index < 5) {
        const card = document.createElement("div");
        card.classList.add("treino-card");
        card.innerHTML = `
          <p><strong>${data.data}</strong> — ${data.tipo == "bike" ? "🚴‍♂️" : "🏃‍♂️"} ${data.km} km</p>
          <p>Status: <strong>${data.status}</strong></p>
        `;
        ultimosTreinosDiv.appendChild(card);
      }
    });
  });

  // 🟢 Registrar nova atividade
  document.getElementById("registrarBtn").addEventListener("click", async () => {
    const tipo = document.getElementById("tipo").value;
    const km = parseFloat(document.getElementById("km").value);
    const data = document.getElementById("data").value;
    const presencial = document.getElementById("presencial").checked;
    const uniforme = document.getElementById("uniforme").checked;
    const eventoExtra = document.getElementById("eventoExtra").value;

    if (!km || !data) return alert("Preencha os campos obrigatórios.");

    await addDoc(collection(db, "atividades"), {
      atletaId,
      tipo,
      km,
      data,
      presencial,
      uniforme,
      eventoExtra,
      status: "pendente",
      criadoEm: serverTimestamp()
    });

    document.getElementById("km").value = "";
    document.getElementById("data").value = "";
    document.getElementById("presencial").checked = false;
    document.getElementById("uniforme").checked = false;
    document.getElementById("eventoExtra").value = "";
  });

  // 🔴 Logout
  document.getElementById("logoutBtn").addEventListener("click", async () => {
    await signOut(auth);
    localStorage.removeItem("userRole");
    window.location.href = "index.html";
  });
});
