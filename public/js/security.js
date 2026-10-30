class SecurityManager {
  static escapeHTML(str) {
    if (typeof str !== 'string') return str;
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  constructor(usuario) {
    this.usuario = usuario;
    this.isAdmin = usuario && usuario.tipo_perfil === "ADMIN";
  }
  destruirParaAnalistas(listaDeIDs) {
    if (this.isAdmin) return;
    listaDeIDs.forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.remove();
    });
  }
  esconderParaAnalistas(listaDeIDs) {
    if (this.isAdmin) return;
    listaDeIDs.forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.classList.add("hidden");
    });
  }
  revelarParaAdmins(listaDeIDs) {
    if (!this.isAdmin) return;
    listaDeIDs.forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.classList.remove("hidden");
    });
  }
  exigirAdmin() {
    if (!this.isAdmin) {
      alert("Acesso Negado: Esta ação é exclusiva para Administradores.");
      throw new Error("Execução bloqueada pelo SecurityManager.");
    }
  }
}

// Intercepta todas as chamadas de fetch (API) para adicionar credentials e lidar com erros de auth
const { fetch: originalFetch } = window;
window.fetch = async (...args) => {
    let [resource, config] = args;
    
    // Sempre envia cookies para rotas da API
    if (typeof resource === 'string' && resource.startsWith('/api')) {
        config = config || {};
        config.credentials = 'include';
    }
    
    const response = await originalFetch(resource, config);
    if (response.status === 401 || response.status === 403) {
        if (!window.location.pathname.includes('/login')) {
            localStorage.removeItem('usuarioLogado');
            window.location.href = '/login';
        }
    }
    return response;
};
