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
    // 🔹 Busca coleções do Firestore
    const corridaSnap = await getDocs(collection(db, "corrida"));
    const bicicletaSnap = await getDocs(collection(db, "bicicleta"));

    // 🔹 Converte os dados
    const corrida = corridaSnap.docs.map(doc => doc.data());
    const bicicleta = bicicletaSnap.docs.map(doc => doc.data());

    // 🔹 Ordena por pontos
    corrida.sort((a, b) => b.pontos - a.pontos);
    bicicleta.sort((a, b) => b.pontos - a.pontos);

    // 🔹 Monta o top 3
    exibirTop(rankingCorrida, corrida);
    exibirTop(rankingBicicleta, bicicleta);

    // 🔹 Calcula ranking geral
    const todos = [...corrida, ...bicicleta];
    const mapa = {};

    todos.forEach(atleta => {
      if (!mapa[atleta.nome]) mapa[atleta.nome] = 0;
      mapa[atleta.nome] += atleta.pontos;
    });

    const geral = Object.entries(mapa)
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
