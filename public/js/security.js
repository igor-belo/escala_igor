class SecurityManager {
    constructor(usuario) {
        this.usuario = usuario;
        this.isAdmin = usuario && usuario.tipo_perfil === 'ADMIN';
    }

    destruirParaAnalistas(listaDeIDs) {
        if (this.isAdmin) return;
        listaDeIDs.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.remove();
        });
    }

    esconderParaAnalistas(listaDeIDs) {
        if (this.isAdmin) return;
        listaDeIDs.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.classList.add('hidden');
        });
    }

    revelarParaAdmins(listaDeIDs) {
        if (!this.isAdmin) return;
        listaDeIDs.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.classList.remove('hidden');
        });
    }

    exigirAdmin() {
        if (!this.isAdmin) {
            alert("Acesso Negado: Esta ação é exclusiva para Administradores.");
            throw new Error("Execução bloqueada pelo SecurityManager.");
        }
    }
}
