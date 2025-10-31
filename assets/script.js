import { db } from "../firebase/firebase-config.js";
import { collection, query, where, orderBy, limit, onSnapshot } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

const listaCorrida = document.getElementById("lista-corrida");
const listaBike = document.getElementById("lista-bike");

function criarItem(atleta, pos) {
  return `
    <div class="list-group-item d-flex justify-content-between align-items-center">
      <span>${pos}. <strong>${atleta.nome}</strong></span>
      <span class="badge bg-primary rounded-pill">${atleta.pontosTotais ?? 0} pts</span>
    </div>`;
}

// Ranking Corrida
const qCorrida = query(
  collection(db, "atletas"),
  where("equipe", "==", "corrida"),
  orderBy("pontosTotais", "desc"),
  limit(10)
);

onSnapshot(qCorrida, (snapshot) => {
  listaCorrida.innerHTML = "";
  let pos = 1;
  snapshot.forEach((doc) => {
    listaCorrida.innerHTML += criarItem(doc.data(), pos++);
  });
});

// Ranking Bicicleta
const qBike = query(
  collection(db, "atletas"),
  where("equipe", "==", "bicicleta"),
  orderBy("pontosTotais", "desc"),
  limit(10)
);

onSnapshot(qBike, (snapshot) => {
  listaBike.innerHTML = "";
  let pos = 1;
  snapshot.forEach((doc) => {
    listaBike.innerHTML += criarItem(doc.data(), pos++);
  });
});
