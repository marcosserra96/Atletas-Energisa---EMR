const btnAdmin = document.getElementById("btnAdmin");
const adminModal = document.getElementById("adminModal");
const btnFecharModal = document.getElementById("btnFecharModal");
const btnEntrar = document.getElementById("btnEntrarAdmin");
const inputSenha = document.getElementById("adminSenha");

// Senha padrão (pode ser alterada no painel)
let senhaAtual = localStorage.getItem("senhaAdmin") || "energisa2025";

btnAdmin.addEventListener("click", () => {
  adminModal.style.display = "flex";
});

btnFecharModal.addEventListener("click", () => {
  adminModal.style.display = "none";
});

btnEntrar.addEventListener("click", () => {
  const senhaDigitada = inputSenha.value.trim();
  if (senhaDigitada === senhaAtual) {
    window.location.href = "painel-config.html";
  } else {
    alert("Senha incorreta!");
  }
});
