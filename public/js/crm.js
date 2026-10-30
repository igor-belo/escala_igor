document.addEventListener("DOMContentLoaded", async () => {
    if (!usuarioLogado || usuarioLogado.tipo_perfil !== "ADMIN") {
        window.location.href = "/";
        return;
    }
    
    // Header & Footer
    const headerHtml = await fetch("/components/header.html").then((r) => r.text());
    document.getElementById("header-container").innerHTML = headerHtml;
    const footerHtml = await fetch("/components/footer.html").then((r) => r.text());
    document.getElementById("footer-container").innerHTML = footerHtml;
    
    // Setup Sidebar
    document.getElementById("saudacao").textContent = `Olá, ${usuarioLogado.nome}`;
    
    // Show admin options
    ['aba-configuracoes', 'aba-alinhamentos', 'aba-bimer', 'aba-crm'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.remove('hidden');
    });
    
    const abaCrm = document.getElementById('aba-crm');
    if (abaCrm) {
        abaCrm.classList.add("bg-zinc-100", "dark:bg-zinc-800", "text-emerald-600", "dark:text-emerald-400");
        const ind = abaCrm.querySelector(".sidebar-indicator");
        if (ind) ind.classList.remove("hidden");
    }
    
    const btnDarkMode = document.getElementById("btnDarkMode");
    if (btnDarkMode) {
        btnDarkMode.onclick = () => {
            document.documentElement.classList.toggle("dark");
            localStorage.setItem("tema", document.documentElement.classList.contains("dark") ? "dark" : "light");
        };
    }
    
    await carregarDadosCRM();
});

let dadosCrmGlobais = [];

async function carregarDadosCRM() {
    const container = document.getElementById('container-grupos-crm');
    container.innerHTML = '<div class="text-center p-8 text-zinc-500 text-sm">Carregando dados do CRM...</div>';
    try {
        const res = await fetch('/api/bimer-scraping/atendimentos-abertos', {
            headers: { 'Authorization': `Bearer ${auth ? auth.token : ''}` }
        });
        if (!res.ok) throw new Error('Erro ao carregar');
        dadosCrmGlobais = await res.json();
        
        // Exclui IgorBelo
        dadosCrmGlobais = dadosCrmGlobais.filter(d => d.pessoa && !d.pessoa.toLowerCase().includes('igorbelo'));
        
        renderizarBimerCRM();
    } catch (e) {
        container.innerHTML = '<div class="text-center p-8 text-red-500 text-sm">Erro ao carregar os dados.</div>';
    }
}

window.isHojeBimer = function(dataStr) {
    if (!dataStr) return false;
    const partes = dataStr.split('/');
    if (partes.length !== 3) return false;
    const d = parseInt(partes[0], 10);
    const m = parseInt(partes[1], 10);
    const a = parseInt(partes[2], 10);
    const dateProx = new Date(a, m - 1, d);
    dateProx.setHours(0,0,0,0);
    const hoje = new Date();
    hoje.setHours(0,0,0,0);
    return dateProx.getTime() === hoje.getTime();
};

window.renderizarBimerCRM = function() {
    const container = document.getElementById('container-grupos-crm');
    const pesquisa = document.getElementById('filtro-pesquisa-crm').value.toLowerCase();
    const soAtraso = document.getElementById('filtro-atraso-crm').checked;
    
    let dadosFiltrados = dadosCrmGlobais;
    
    if (pesquisa) {
        dadosFiltrados = dadosFiltrados.filter(d => d.pessoa.toLowerCase().includes(pesquisa));
    }
    
    // Group by pessoa
    const grupos = {};
    dadosFiltrados.forEach(d => {
        const emAtraso = window.calcularAtrasoBimer(d.data_proximo_contato, d.pessoa);
        const ehHoje = window.isHojeBimer(d.data_proximo_contato);
        if (soAtraso && !emAtraso && !ehHoje) return;
        
        const key = d.pessoa.toUpperCase();
        if (!grupos[key]) grupos[key] = [];
        
        grupos[key].push({ ...d, emAtraso, ehHoje });
    });
    
    if (Object.keys(grupos).length === 0) {
        container.innerHTML = '<div class="text-center p-8 text-zinc-500 text-sm">Nenhum atendimento corresponde aos filtros.</div>';
        return;
    }
    
    let html = '';
    Object.keys(grupos).sort().forEach((key, index) => {
        const tickets = grupos[key];
        // Ordenar: atrasados primeiro, depois hoje, depois futuros
        tickets.sort((a, b) => {
            if (a.emAtraso && !b.emAtraso) return -1;
            if (!a.emAtraso && b.emAtraso) return 1;
            if (a.ehHoje && !b.ehHoje) return -1;
            if (!a.ehHoje && b.ehHoje) return 1;
            return 0;
        });
        const numAtrasados = tickets.filter(t => t.emAtraso).length;
        const numHoje = tickets.filter(t => t.ehHoje).length;
        
        const badgeTotal = `<span class="bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 py-0.5 px-2 rounded-full text-xs font-semibold">${tickets.length}</span>`;
        const badgeAtraso = numAtrasados > 0 ? `<span class="bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 py-0.5 px-2 rounded-full text-xs font-semibold ring-1 ring-inset ring-red-600/10 dark:ring-red-500/20">${numAtrasados} Atrasados</span>` : '';
        const badgeHoje = numHoje > 0 ? `<span class="bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 py-0.5 px-2 rounded-full text-xs font-semibold ring-1 ring-inset ring-amber-600/10 dark:ring-amber-500/20">${numHoje} Hoje</span>` : '';
        
        html += `
            <div class="bg-white dark:bg-zinc-900 rounded-xl ring-1 ring-zinc-900/5 dark:ring-white/10 overflow-hidden shadow-sm transition-all">
                <button onclick="toggleGrupo('grupo-${index}')" class="w-full flex items-center justify-between p-4 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors focus:outline-none">
                    <div class="flex items-center gap-3 flex-wrap">
                        <i id="icon-grupo-${index}" class="fa-solid fa-chevron-down text-zinc-400 dark:text-zinc-500 text-sm w-4 transition-transform"></i>
                        <h3 class="text-sm font-semibold text-zinc-900 dark:text-white uppercase">${key}</h3>
                        ${badgeTotal}
                        ${badgeAtraso}
                        ${badgeHoje}
                    </div>
                </button>
                <div id="grupo-${index}" class="hidden border-t border-zinc-100 dark:border-zinc-800">
                    <table class="w-full text-left text-sm">
                        <thead class="bg-zinc-50/50 dark:bg-zinc-800/30">
                            <tr>
                                <th class="px-4 py-3 text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest w-1/3">Ticket</th>
                                <th class="px-4 py-3 text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest w-1/3">Próximo Contato</th>
                                <th class="px-4 py-3 text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest w-1/3">Status</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-zinc-100 dark:divide-zinc-800/50">
                            ${tickets.map(t => {
                                let trColor, dateColor, alertIcon, statusBadge;
                                if (t.emAtraso) {
                                    trColor = 'bg-red-50/30 dark:bg-red-900/10';
                                    dateColor = 'text-red-600 dark:text-red-400 font-semibold';
                                    alertIcon = '<i class="fa-solid fa-circle-exclamation text-red-500 mr-1.5"></i>';
                                    statusBadge = '<span class="inline-flex items-center gap-1 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 py-0.5 px-2 rounded-full text-xs font-semibold ring-1 ring-inset ring-red-600/10 dark:ring-red-500/20"><i class="fa-solid fa-triangle-exclamation text-[10px]"></i>Atrasado</span>';
                                } else if (t.ehHoje) {
                                    trColor = 'bg-amber-50/30 dark:bg-amber-900/10';
                                    dateColor = 'text-amber-600 dark:text-amber-400 font-semibold';
                                    alertIcon = '<i class="fa-solid fa-clock text-amber-500 mr-1.5"></i>';
                                    statusBadge = '<span class="inline-flex items-center gap-1 bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 py-0.5 px-2 rounded-full text-xs font-semibold ring-1 ring-inset ring-amber-600/10 dark:ring-amber-500/20"><i class="fa-solid fa-bell text-[10px]"></i>Hoje</span>';
                                } else {
                                    trColor = 'bg-transparent';
                                    dateColor = 'text-emerald-600 dark:text-emerald-400';
                                    alertIcon = '';
                                    statusBadge = '<span class="inline-flex items-center gap-1 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 py-0.5 px-2 rounded-full text-xs font-semibold ring-1 ring-inset ring-emerald-600/10 dark:ring-emerald-500/20"><i class="fa-solid fa-calendar text-[10px]"></i>Agendado</span>';
                                }
                                return `
                                <tr class="${trColor} hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                                    <td class="px-4 py-3 font-mono text-zinc-600 dark:text-zinc-300">
                                        ${alertIcon}${t.numero_atendimento}
                                    </td>
                                    <td class="px-4 py-3 ${dateColor}">${t.data_proximo_contato}</td>
                                    <td class="px-4 py-3">${statusBadge}</td>
                                </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
};

window.toggleGrupo = function(id) {
    const el = document.getElementById(id);
    const icon = document.getElementById(`icon-${id}`);
    if (el.classList.contains('hidden')) {
        el.classList.remove('hidden');
        icon.classList.add('rotate-180');
    } else {
        el.classList.add('hidden');
        icon.classList.remove('rotate-180');
    }
};

window.toggleTodosGrupos = function(expand) {
    const container = document.getElementById('container-grupos-crm');
    if (!container) return;
    
    const divs = container.querySelectorAll('[id^="grupo-"]');
    const icons = container.querySelectorAll('[id^="icon-grupo-"]');
    
    divs.forEach(el => expand ? el.classList.remove('hidden') : el.classList.add('hidden'));
    icons.forEach(el => expand ? el.classList.add('rotate-180') : el.classList.remove('rotate-180'));
};

function mostrarToastCRM(mensagem, tipo = 'sucesso') {
    let toast = document.getElementById('crm-toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'crm-toast';
        toast.className = 'fixed bottom-4 right-4 max-w-sm w-full p-4 rounded-xl shadow-lg transform transition-all duration-300 translate-y-20 opacity-0 z-50 flex items-center gap-3';
        document.body.appendChild(toast);
    }
    
    // Configurar cores baseado no tipo
    if (tipo === 'sucesso') {
        toast.className = 'fixed bottom-4 right-4 max-w-sm w-full p-4 rounded-xl shadow-lg transform transition-all duration-300 z-50 flex items-center gap-3 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-800 dark:text-emerald-400 translate-y-0 opacity-100';
        toast.innerHTML = `<i class="fa-solid fa-circle-check text-emerald-500 text-lg"></i><div><p class="text-sm font-medium">${mensagem}</p></div>`;
    } else if (tipo === 'erro') {
        toast.className = 'fixed bottom-4 right-4 max-w-sm w-full p-4 rounded-xl shadow-lg transform transition-all duration-300 z-50 flex items-center gap-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-800 dark:text-red-400 translate-y-0 opacity-100';
        toast.innerHTML = `<i class="fa-solid fa-circle-exclamation text-red-500 text-lg"></i><div><p class="text-sm font-medium">${mensagem}</p></div>`;
    } else if (tipo === 'info') {
        toast.className = 'fixed bottom-4 right-4 max-w-sm w-full p-4 rounded-xl shadow-lg transform transition-all duration-300 z-50 flex items-center gap-3 bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 text-blue-800 dark:text-blue-400 translate-y-0 opacity-100';
        toast.innerHTML = `<i class="fa-solid fa-circle-info text-blue-500 text-lg"></i><div><p class="text-sm font-medium">${mensagem}</p></div>`;
    }

    // Auto-remover após 4 segundos
    setTimeout(() => {
        toast.classList.add('translate-y-20', 'opacity-0');
    }, 4000);
}

function customConfirmCRM(mensagem, callback) {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 z-[100] flex items-center justify-center bg-zinc-900/50 backdrop-blur-sm px-4';
    modal.innerHTML = `
        <div class="bg-white dark:bg-zinc-900 rounded-2xl p-6 max-w-sm w-full shadow-xl ring-1 ring-zinc-900/5 dark:ring-white/10 transform transition-all">
            <h3 class="text-lg font-semibold text-zinc-900 dark:text-white mb-2">Atenção</h3>
            <p class="text-sm text-zinc-500 dark:text-zinc-400 mb-6">${mensagem}</p>
            <div class="flex justify-end gap-3">
                <button id="btn-cancel-crm" class="px-4 py-2 rounded-lg text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors">Cancelar</button>
                <button id="btn-confirm-crm" class="px-4 py-2 rounded-lg text-sm font-medium text-white bg-emerald-500 hover:bg-emerald-600 shadow-sm transition-colors">Confirmar</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);

    document.getElementById('btn-cancel-crm').onclick = () => {
        modal.remove();
    };
    
    document.getElementById('btn-confirm-crm').onclick = () => {
        modal.remove();
        callback();
    };
}

function mostrarLoadingCRM(mostrar, texto = 'Processando...') {
    let overlay = document.getElementById('crm-loading-overlay');
    if (mostrar) {
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'crm-loading-overlay';
            overlay.className = 'fixed inset-0 z-[200] flex flex-col items-center justify-center bg-zinc-900/60 backdrop-blur-sm transition-opacity duration-300';
            overlay.innerHTML = `
                <div class="bg-white dark:bg-zinc-900 p-6 rounded-2xl shadow-2xl flex flex-col items-center gap-4 animate-bounce-subtle">
                    <i class="fa-solid fa-circle-notch fa-spin text-emerald-500 text-4xl"></i>
                    <p id="crm-loading-texto" class="text-sm font-semibold text-zinc-700 dark:text-zinc-300">${texto}</p>
                </div>
            `;
            document.body.appendChild(overlay);
        } else {
            document.getElementById('crm-loading-texto').innerText = texto;
            overlay.classList.remove('hidden');
        }
    } else {
        if (overlay) overlay.classList.add('hidden');
    }
}

window.sincronizarBimer = function() {
    customConfirmCRM('Deseja iniciar a sincronização com o Bimer CRM? Isso será feito em segundo plano (pode levar 1-2 minutos).', async () => {
        mostrarLoadingCRM(true, 'Sincronizando com o Bimer...');
        try {
            const res = await fetch('/api/bimer-scraping/sync', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${auth ? auth.token : ''}` }
            });
            const d = await res.json();
            mostrarLoadingCRM(false);
            if (res.ok) mostrarToastCRM(d.mensagem, 'sucesso');
            else mostrarToastCRM('Erro: ' + d.erro, 'erro');
        } catch(e) {
            mostrarLoadingCRM(false);
            mostrarToastCRM('Erro ao solicitar sincronização.', 'erro');
        }
    });
};

window.enviarWebhooksManualmente = function() {
    customConfirmCRM('Deseja disparar as notificações (webhooks) agora para a equipe?', async () => {
        mostrarLoadingCRM(true, 'Disparando notificações via Webhook...');
        try {
            const res = await fetch('/api/bimer-scraping/notificar', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${auth ? auth.token : ''}` }
            });
            const d = await res.json();
            mostrarLoadingCRM(false);
            if (res.ok) mostrarToastCRM(d.mensagem, 'sucesso');
            else mostrarToastCRM('Erro: ' + d.erro, 'erro');
        } catch(e) {
            mostrarLoadingCRM(false);
            mostrarToastCRM('Erro ao solicitar notificações.', 'erro');
        }
    });
};
