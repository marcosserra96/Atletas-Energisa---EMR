import { db } from "../firebase/firebase-config.js";
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

async function carregarRanking() {
  const rankingCorrida = document.getElementById("rankingCorrida");
  const rankingBicicleta = document.getElementById("rankingBicicleta");
  const rankingGeral = document.getElementById("rankingGeral");

  rankingCorrida.innerHTML = "<li>Carregando...</li>";
  rankingBicicleta.innerHTML = "<li>Carregando...</li>";
  rankingGeral.innerHTML = "<li>Carregando...</li>";

  try {
    const corridaSnap = await getDocs(collection(db, "corrida"));
    const bicicletaSnap = await getDocs(collection(db, "bicicleta"));

    const corrida = corridaSnap.docs.map(doc => doc.data());
    const bicicleta = bicicletaSnap.docs.map(doc => doc.data());

    corrida.sort((a, b) => b.pontos - a.pontos);
    bicicleta.sort((a, b) => b.pontos - a.pontos);

    exibirTop(rankingCorrida, corrida);
    exibirTop(rankingBicicleta, bicicleta);

    const todos = [...corrida, ...bicicleta];
    const geralMap = {};

    todos.forEach(a => {
      if (!geralMap[a.nome]) geralMap[a.nome] = 0;
      geralMap[a.nome] += a.pontos;
    });

    const geral = Object.entries(geralMap)
      .map(([nome, pontos]) => ({ nome, pontos }))
      .sort((a, b) => b.pontos - a.pontos);

    exibirTop(rankingGeral, geral);

  } catch (e) {
    console.error("Erro ao carregar ranking:", e);
  }
}

function exibirTop(elemento, lista) {
  elemento.innerHTML = "";
  lista.slice(0, 3).forEach((a, i) => {
    elemento.innerHTML += `
      <li>
        <span>${i + 1}. ${a.nome}</span>
        <span>${a.pontos} pts</span>
      </li>
    `;
  });
}

carregarRanking();
