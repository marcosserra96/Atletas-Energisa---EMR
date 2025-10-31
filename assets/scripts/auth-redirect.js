// Verifica se há login ativo
const role = localStorage.getItem("userRole");

if (!role) {
  // Sem login → volta ao index (login)
  window.location.href = "index.html";
}

// Exemplo de checagem adicional:
if (window.location.pathname.includes("admin.html") && role !== "admin") {
  window.location.href = "atleta.html";
}
if (window.location.pathname.includes("admin-metas.html") && role !== "comite" && role !== "admin") {
  window.location.href = "atleta.html";
}
