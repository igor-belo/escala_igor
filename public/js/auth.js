async function fazerLogin(e) {
  e.preventDefault();
  const identificador = document
    .getElementById("identificador")
    .value.trim()
    .toLowerCase();
  const senha = document.getElementById("senha").value;
  const btn = e.target.querySelector("button");
  const txtOriginal = btn.innerHTML;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i>Entrando...';
  btn.disabled = true;
  try {
    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identificador, senha }),
    });
    const data = await res.json();
    if (res.ok) {
      localStorage.setItem("usuarioLogado", JSON.stringify(data.usuario));
      // Token is now handled automatically via HttpOnly cookie
      window.location.href = "/";
    } else {
      alert(data.erro);
    }
  } catch (erro) {
    alert("Erro de conexão com o servidor.");
  }
  btn.innerHTML = txtOriginal;
  btn.disabled = false;
}
window.fazerLogout = async function() {
  try {
    await fetch('/api/logout', { method: 'POST', credentials: 'include' });
  } catch (e) {}
  localStorage.removeItem("usuarioLogado");
  localStorage.removeItem("token"); // Apenas para limpar quem já tinha
  window.location.href = "/login.html";
}
