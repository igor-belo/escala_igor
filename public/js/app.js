let usuarioLogado = JSON.parse(localStorage.getItem('usuarioLogado'));
const auth = typeof SecurityManager !== 'undefined' ? new SecurityManager(usuarioLogado) : null;

let calendar;
let usuariosSetor = [];
let atendimentosAtivos = [];
let dadosRelatorio = [];
let filaPendente = [];
let timerInterval;
let painelUpdateInterval;
let chartTipos = null;
let chartAnalistas = null;

document.addEventListener("DOMContentLoaded", async () => {
    if (!usuarioLogado) { 
        if (!window.location.pathname.includes('login.html')) { window.location.href = 'login.html'; }
        return; 
    }
    if (usuarioLogado && window.location.pathname.includes('login.html')) { window.location.href = 'index.html'; return; }

    const headerHtml = await fetch('/components/header.html').then(r => r.text());
    document.getElementById('header-container').innerHTML = headerHtml;

    const modaisHtml = await fetch('/components/modais.html').then(r => r.text());
    document.getElementById('modais-container').innerHTML = modaisHtml;

    const footerHtml = await fetch('/components/footer.html').then(r => r.text());
    document.getElementById('footer-container').innerHTML = footerHtml;

    setupGlobal();
    
    if (window.location.pathname.includes('atendimentos.html')) { setTimeout(initAtendimentos, 300); } 
    else { initEscalas(); }
});

function setupGlobal() {
    document.getElementById('saudacao').textContent = `Olá, ${usuarioLogado.nome}`;
    if (usuarioLogado.tipo_perfil === 'ADMIN') {
        const btnGerenciar = document.getElementById('btnGerenciar');
        if(btnGerenciar) { btnGerenciar.classList.remove('hidden'); btnGerenciar.onclick = () => document.getElementById('modalConfiguracoes').classList.remove('hidden'); }
        const boxGerador = document.getElementById('box-gerador-admin');
        if(boxGerador) boxGerador.classList.remove('hidden');
    } else {
        const barraFiltros = document.getElementById('barra-filtros'); if(barraFiltros) barraFiltros.remove(); 
        const boxSetor = document.getElementById('box-setor'); if(boxSetor) boxSetor.remove();
        const btnConfig = document.getElementById('btnGerenciar'); if(btnConfig) btnConfig.remove();
    }
    const abaAtend = document.getElementById('aba-atendimentos'); const abaEscala = document.getElementById('aba-escalas');
    if(window.location.pathname.includes('atendimentos.html') && abaAtend) { abaAtend.classList.add('bg-blue-100', 'text-blue-700', 'dark:bg-blue-900', 'dark:text-blue-300'); } 
    else if(abaEscala) { abaEscala.classList.add('bg-blue-100', 'text-blue-700', 'dark:bg-blue-900', 'dark:text-blue-300'); }
    const btnDarkMode = document.getElementById('btnDarkMode');
    if(localStorage.getItem('tema') === 'dark') document.documentElement.classList.add('dark');
    if(btnDarkMode) { btnDarkMode.onclick = () => { document.documentElement.classList.toggle('dark'); localStorage.setItem('tema', document.documentElement.classList.contains('dark') ? 'dark' : 'light'); }; }
    const formCadastro = document.getElementById('formCadastro'); if(formCadastro && typeof salvarUsuario !== 'undefined') formCadastro.onsubmit = salvarUsuario;
    const formEdicaoEscala = document.getElementById('formEdicaoEscala'); if(formEdicaoEscala) formEdicaoEscala.onsubmit = salvarEdicaoEscala;
    const formObsDia = document.getElementById('formObsDia'); if(formObsDia) formObsDia.onsubmit = salvarAviso;
    const btnExcluirObs = document.getElementById('btnExcluirObs'); if(btnExcluirObs) btnExcluirObs.onclick = excluirAviso;
    const selectTipoPerfil = document.getElementById('tipo_perfil');
    if(selectTipoPerfil) { selectTipoPerfil.onchange = (e) => { document.getElementById('camposAnalista').classList.toggle('hidden', e.target.value === 'ADMIN'); }; }
    const selectSetorAviso = document.getElementById('setor_do_aviso_novo');
    if(selectSetorAviso) { selectSetorAviso.addEventListener('change', (e) => { preencherUsuariosAviso(e.target.value); }); }
}

async function preencherUsuariosAviso(setorId, usuarioSelecionadoId = '') {
    const select = document.getElementById('usuario_do_aviso_novo'); if(!select) return; select.innerHTML = '<option value="">Geral (Todos)</option>';
    try {
        const res = await fetch('/api/usuarios'); const usuarios = await res.json();
        usuarios.filter(u => u.setor_id == setorId && u.tipo_perfil === 'ANALISTA').forEach(u => { select.innerHTML += `<option value="${u.id}" ${u.id == usuarioSelecionadoId ? 'selected' : ''}>${u.nome}</option>`; });
    } catch(e) {}
}

async function initEscalas() {
    const res = await fetch('/api/setores'); const setores = await res.json();
    const f = document.getElementById('filtro-setor'); const c = document.getElementById('setor_id_cadastro'); const o = document.getElementById('setor_do_aviso_novo');
    if(f) f.innerHTML = usuarioLogado.tipo_perfil === 'ADMIN' ? '<option value="todos">Todos os Setores</option>' : ''; 
    if(c) c.innerHTML = ''; if(o) o.innerHTML = '';
    setores.forEach(s => { 
        const opt = `<option value="${s.id}">${s.nome}</option>`; 
        if (usuarioLogado.tipo_perfil === 'ADMIN' || s.id == usuarioLogado.setor_id) { if(f) f.innerHTML += opt; if(o) o.innerHTML += opt; } 
        if(c) c.innerHTML += opt; 
    });
    const inputDataInicio = document.getElementById('data_inicio_geracao'); if(inputDataInicio) inputDataInicio.value = new Date().toISOString().split('T')[0];

    const calendarEl = document.getElementById('calendar'); if(!calendarEl) return;
    calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: 'dayGridMonth', locale: 'pt-br', weekends: false, headerToolbar: { left: 'prev,next today', center: 'title', right: 'dayGridMonth,timeGridWeek' }, eventOrder: 'ordem_exibicao',
        dateClick: async function(info) {
            if (usuarioLogado.tipo_perfil !== 'ADMIN') return alert('Apenas administradores.');
            document.getElementById('formObsDia').reset(); document.getElementById('id_do_aviso_novo').value = ''; document.getElementById('data_do_aviso_novo').value = info.dateStr; document.getElementById('hora_do_aviso_novo').value = ''; document.getElementById('usuario_do_aviso_novo').value = '';
            const [ano, mes, dia] = info.dateStr.split('-'); document.getElementById('tituloModalObs').textContent = `Novo Aviso: ${dia}/${mes}/${ano}`;
            const elSetor = document.getElementById('filtro-setor');
            const sf = (elSetor && elSetor.value !== 'todos') ? elSetor.value : document.getElementById('setor_do_aviso_novo').options[0].value;
            document.getElementById('setor_do_aviso_novo').value = sf; await preencherUsuariosAviso(sf);
            document.getElementById('btnExcluirObs').classList.add('hidden'); document.getElementById('modalObsDia').classList.remove('hidden');
        },
        events: async (info, success, failure) => {
            const elSetor = document.getElementById('filtro-setor'); const sid = (elSetor && elSetor.value) ? elSetor.value : usuarioLogado.setor_id; let todosEventos = [];
            try {
                const resEscala = await fetch(`/api/escala?setor_id=${sid}`);
                if (resEscala.ok) { todosEventos = todosEventos.concat((await resEscala.json()).map(d => {
                    let tituloExt = d.dia_inteiro ? '(Dia Inteiro)' : (d.hora_inicio ? `(${d.hora_inicio.substring(0,5)} as ${d.hora_fim.substring(0,5)})` : '');
                    return { id: `esc_${d.id}`, title: `${d.funcao}: ${d.nome} ${tituloExt}` + (d.observacao ? ` (Obs)` : ''), start: d.data, color: d.funcao === 'Chat' ? '#3b82f6' : d.funcao === 'Filtro' ? '#10b981' : '#f59e0b', ordem_exibicao: 1, classNames: d.editado_manualmente ? ['evento-editado'] : [], extendedProps: { tipo: 'escala', id_real: d.id, usuario_id: d.usuario_id, observacao: d.observacao || '', funcao: d.funcao, setor_id: d.setor_id, dia_inteiro: d.dia_inteiro, hora_inicio: d.hora_inicio, hora_fim: d.hora_fim } };
                })); }
                const resObs = await fetch(`/api/observacoes?setor_id=${sid}`);
                if (resObs.ok) { todosEventos = todosEventos.concat((await resObs.json()).map(o => { let t = o.observacao; if(o.nome) t = `${o.nome}: ${t}`; if (o.hora) { t = `[${o.hora.substring(0, 5)}] ⚠️ ${t}`; } else { t = `⚠️ ${t}`; } return { id: `obs_${o.id}`, title: t, start: o.data, color: '#ef4444', ordem_exibicao: 2, classNames: ['evento-aviso'], extendedProps: { tipo: 'observacao_dia', id_real: o.id, observacao: o.observacao, setor_id: o.setor_id, data: o.data, usuario_id: o.usuario_id, hora: o.hora ? o.hora.substring(0, 5) : '' } }; })); }
                success(todosEventos);
            } catch (e) { failure(e); }
        },
        eventClick: async function(info) {
            if (usuarioLogado.tipo_perfil !== 'ADMIN') return; const ev = info.event;
            if (ev.extendedProps.tipo === 'observacao_dia') {
                document.getElementById('id_do_aviso_novo').value = ev.extendedProps.id_real; document.getElementById('data_do_aviso_novo').value = ev.extendedProps.data; document.getElementById('setor_do_aviso_novo').value = ev.extendedProps.setor_id; document.getElementById('texto_do_aviso_novo').value = ev.extendedProps.observacao; document.getElementById('hora_do_aviso_novo').value = ev.extendedProps.hora || '';
                await preencherUsuariosAviso(ev.extendedProps.setor_id, ev.extendedProps.usuario_id);
                const [a, m, d] = ev.extendedProps.data.split('-'); document.getElementById('tituloModalObs').textContent = `Editar Aviso: ${d}/${m}/${a}`;
                document.getElementById('btnExcluirObs').classList.remove('hidden'); document.getElementById('modalObsDia').classList.remove('hidden'); return;
            }
            try {
                const resU = await fetch('/api/usuarios'); const an = (await resU.json()).filter(u => u.setor_id == ev.extendedProps.setor_id && u.tipo_perfil === 'ANALISTA');
                const sel = document.getElementById('edit_usuario_id'); sel.innerHTML = ''; an.forEach(u => { sel.innerHTML += `<option value="${u.id}">${u.nome}</option>`; });
                document.getElementById('edit_escala_id').value = ev.extendedProps.id_real; document.getElementById('edit_usuario_id').value = ev.extendedProps.usuario_id; document.getElementById('edit_observacao').value = ev.extendedProps.observacao;
                document.getElementById('edit_dia_inteiro').checked = ev.extendedProps.dia_inteiro; document.getElementById('edit_hora_inicio').value = ev.extendedProps.hora_inicio || ''; document.getElementById('edit_hora_fim').value = ev.extendedProps.hora_fim || '';
                document.getElementById('container_edit_horarios').classList.toggle('hidden', ev.extendedProps.dia_inteiro);
                document.getElementById('modalEdicaoEscala').classList.remove('hidden');
            } catch (e) { alert("Erro ao carregar analistas."); }
        }
    });
    calendar.render();
    const filtroSetor = document.getElementById('filtro-setor'); if(filtroSetor) filtroSetor.onchange = () => calendar.refetchEvents();
    const btnGerar = document.getElementById('btnGerarEscala');
    if(btnGerar) {
        btnGerar.onclick = async () => {
            const sid = document.getElementById('filtro-setor').value; if (sid === 'todos') return alert('Selecione um setor.');
            const dt = document.getElementById('data_inicio_geracao').value; if (!dt) return alert('Selecione a data inicial.');
            const btn = document.getElementById('btnGerarEscala'); const txt = btn.innerText; btn.innerText = 'Gerando...'; btn.disabled = true;
            try {
                const res = await fetch('/api/escala/gerar', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ setor_id: sid, data_inicio: dt, tipo_periodo: document.getElementById('tipo-escala').value }) });
                if (res.ok) { alert('Sucesso!'); calendar.refetchEvents(); } else { alert('Erro.'); }
            } catch (e) { alert('Erro de conexão.'); } finally { btn.innerText = txt; btn.disabled = false; }
        };
    }
}

async function salvarEdicaoEscala(e) {
    e.preventDefault(); 
    const body = { 
        usuario_id: document.getElementById('edit_usuario_id').value, 
        observacao: document.getElementById('edit_observacao').value,
        dia_inteiro: document.getElementById('edit_dia_inteiro').checked,
        hora_inicio: document.getElementById('edit_hora_inicio').value,
        hora_fim: document.getElementById('edit_hora_fim').value
    };
    const res = await fetch(`/api/escala/${document.getElementById('edit_escala_id').value}`, { method: 'PUT', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(body) });
    if (res.ok) { document.getElementById('modalEdicaoEscala').classList.add('hidden'); calendar.refetchEvents(); } else { alert('Erro.'); }
}

async function salvarAviso(e) {
    e.preventDefault(); const uv = document.getElementById('usuario_do_aviso_novo').value; const hv = document.getElementById('hora_do_aviso_novo').value;
    const body = { id: document.getElementById('id_do_aviso_novo').value || null, data: document.getElementById('data_do_aviso_novo').value, setor_id: parseInt(document.getElementById('setor_do_aviso_novo').value), observacao: document.getElementById('texto_do_aviso_novo').value, usuario_id: uv ? parseInt(uv) : null, hora: hv ? hv : null };
    const res = await fetch('/api/observacoes', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(body) });
    if (res.ok) { document.getElementById('modalObsDia').classList.add('hidden'); calendar.refetchEvents(); } else { alert('Erro.'); }
}

async function excluirAviso() {
    if(!confirm('Excluir aviso?')) return;
    const res = await fetch(`/api/observacoes/${document.getElementById('id_do_aviso_novo').value}`, { method: 'DELETE' });
    if (res.ok) { document.getElementById('modalObsDia').classList.add('hidden'); calendar.refetchEvents(); } else { alert('Erro.'); }
}

async function initAtendimentos() {
    if (usuarioLogado.tipo_perfil === 'ADMIN') {
        const abas = document.getElementById('abas-admin'); if(abas) abas.classList.remove('hidden');
        const btnPri = document.getElementById('btnNovaPrioridade'); if(btnPri) btnPri.classList.remove('hidden');
        const btnNovo = document.getElementById('btnNovoAtendimento'); if(btnNovo) btnNovo.classList.add('hidden'); 
    } else {
        const btnPri = document.getElementById('btnNovaPrioridade'); if(btnPri) btnPri.remove();
        const abasAdmin = document.getElementById('abas-admin'); if(abasAdmin) abasAdmin.remove();
    }
    try {
        const resS = await fetch('/api/setores'); const setores = await resS.json();
        const f = document.getElementById('filtro-setor'); const priSetor = document.getElementById('pri_setor');
        if (priSetor) priSetor.innerHTML = '';
        if (f) f.innerHTML = usuarioLogado.tipo_perfil === 'ADMIN' ? '<option value="todos">Todos os Setores</option>' : '';
        if (Array.isArray(setores)) { setores.forEach(s => { if (usuarioLogado.tipo_perfil === 'ADMIN' || s.id == usuarioLogado.setor_id) { if (f) f.innerHTML += `<option value="${s.id}">${s.nome}</option>`; } if (priSetor) priSetor.innerHTML += `<option value="${s.id}">${s.nome}</option>`; }); }
        if (f) f.addEventListener('change', carregarPainelE_Fila);
    } catch (erro) { console.error(erro); }
    await carregarTiposDeAtendimento(); carregarPainelE_Fila();
    if (painelUpdateInterval) clearInterval(painelUpdateInterval);
    painelUpdateInterval = setInterval(() => { const areaKanban = document.getElementById('area-kanban'); if (areaKanban && !areaKanban.classList.contains('hidden')) { carregarPainelE_Fila(); } }, 10000);
}

async function carregarTiposDeAtendimento() {
    try {
        const resT = await fetch('/api/tipos_atendimento'); if (!resT.ok) throw new Error("Erro"); const tipos = await resT.json();
        const comboFiltro = document.getElementById('filtro-tipo'); const comboModal = document.getElementById('tipo_atend'); const comboPri = document.getElementById('pri_tipo'); 
        let opcoesHtml = '';
        if (Array.isArray(tipos) && tipos.length > 0) { tipos.forEach(t => { opcoesHtml += `<option value="${t.id}">${t.nome}</option>`; }); } else { opcoesHtml = '<option value="">(Tabela vazia)</option>'; }
        if (comboFiltro) comboFiltro.innerHTML = '<option value="">Todos</option>' + opcoesHtml; if (comboModal) comboModal.innerHTML = opcoesHtml; if (comboPri) comboPri.innerHTML = opcoesHtml;
    } catch (erro) { console.error(erro); }
}

async function carregarPainelE_Fila() { await carregarPainelKanban(); await carregarFilaPrioridades(); }

window.mudarAba = function(aba) {
    const btnKanban = document.getElementById('tab-kanban'); const btnRelatorios = document.getElementById('tab-relatorios');
    const areaKanban = document.getElementById('area-kanban'); const areaRelatorios = document.getElementById('area-relatorios'); const areaImpressao = document.getElementById('area-impressao');
    if (aba === 'kanban') {
        btnKanban.classList.replace('border-transparent', 'border-blue-600'); btnKanban.classList.replace('text-gray-500', 'text-blue-600');
        btnRelatorios.classList.replace('border-blue-600', 'border-transparent'); btnRelatorios.classList.replace('text-blue-600', 'text-gray-500');
        areaKanban.classList.remove('hidden'); areaRelatorios.classList.add('hidden'); areaImpressao.classList.add('hidden');
    } else {
        btnRelatorios.classList.replace('border-transparent', 'border-blue-600'); btnRelatorios.classList.replace('text-gray-500', 'text-blue-600');
        btnKanban.classList.replace('border-blue-600', 'border-transparent'); btnKanban.classList.replace('text-blue-600', 'text-gray-500');
        areaKanban.classList.add('hidden'); areaRelatorios.classList.remove('hidden'); areaImpressao.classList.remove('hidden');
        if(!document.getElementById('filtro-data-inicio').value) { document.getElementById('filtro-data-inicio').value = new Date().toISOString().split('T')[0]; document.getElementById('filtro-data-fim').value = new Date().toISOString().split('T')[0]; }
    }
};

window.abrirModalPrioridade = function() { const form = document.getElementById('formNovaPrioridade'); if(form) form.reset(); document.getElementById('modalNovaPrioridade').classList.remove('hidden'); };

window.salvarPrioridade = async function(e) {
    if (e) e.preventDefault();
    if (usuarioLogado.tipo_perfil !== 'ADMIN') return alert("Acesso negado");
    const inputPriId = document.getElementById('pri_id'); const idAtendimento = inputPriId ? inputPriId.value : '';
    const body = { numero_atendimento: document.getElementById('pri_numero').value, prioridade: document.getElementById('pri_nivel').value, origem: document.getElementById('pri_origem').value, tipo_id: document.getElementById('pri_tipo').value, setor_id: document.getElementById('pri_setor').value };
    if(!body.numero_atendimento || !body.origem || !body.setor_id) return alert("Preencha Ticket, Origem e Setor Destino");
    try {
        let res; if (idAtendimento) { res = await fetch(`/api/atendimentos/fila/${idAtendimento}`, { method: 'PUT', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(body) }); } else { res = await fetch('/api/atendimentos/fila', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(body) }); }
        if (res.ok) { document.getElementById('modalNovaPrioridade').classList.add('hidden'); document.getElementById('formNovaPrioridade').reset(); if (inputPriId) inputPriId.value = ''; carregarFilaPrioridades(); } else { alert("Erro ao Gravar na Fila."); }
    } catch (erro) { console.error(erro); alert("Erro de Conexão."); }
};

async function carregarFilaPrioridades() {
    const f = document.getElementById('filtro-setor'); const sid = (f && f.value) ? f.value : usuarioLogado.setor_id; if(!sid) return;
    try {
        const res = await fetch(`/api/atendimentos/fila?setor_id=${sid}`); filaPendente = await res.json();
        const container = document.getElementById('container-fila'); const gridFila = document.getElementById('fila-cards'); if(!gridFila) return; gridFila.innerHTML = '';
        if (filaPendente.length === 0) { if (container) container.classList.add('hidden'); return; }
        if (container) container.classList.remove('hidden');
        filaPendente.forEach(f => {
            let corBorda = f.prioridade === 'Alta' ? 'border-red-500 bg-red-50 dark:bg-red-900/20' : f.prioridade === 'Média' ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20' : 'border-blue-500 bg-blue-50 dark:bg-blue-900/20';
            let icone = f.prioridade === 'Alta' ? '🔴' : f.prioridade === 'Média' ? '🟡' : '🔵';
            let botoesAcao = '';
            
            // TROCAMOS A COR DO ASSUMIR DE INDIGO PARA AZUL (bg-blue-600)
            if (usuarioLogado.tipo_perfil !== 'ADMIN') { botoesAcao = `<button onclick="assumirTicket(${f.id})" class="mt-4 w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded transition shadow"><i class="fa-solid fa-hand-pointer mr-2"></i>Assumir</button>`; } 
            else { botoesAcao = `<div class="mt-4 flex gap-2"><button onclick="editarPrioridade(${f.id})" class="flex-1 bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-2 rounded transition shadow"><i class="fa-solid fa-pen"></i></button><button onclick="excluirAtendimento(${f.id})" class="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold py-2 rounded transition shadow"><i class="fa-solid fa-trash"></i></button></div>`; }
            gridFila.innerHTML += `<div class="p-4 rounded-lg border-2 shadow-md relative flex flex-col justify-between ${corBorda}"><div><div class="flex justify-between items-start mb-2"><span class="font-black text-lg dark:text-white">#${f.numero_atendimento}</span><span class="text-xs font-bold uppercase px-2 py-1 rounded bg-white dark:bg-gray-800 shadow-sm">${icone} ${f.prioridade}</span></div><p class="text-sm font-bold text-gray-700 dark:text-gray-300 mb-1"><i class="fa-solid fa-tag mr-1"></i>${f.tipo_nome}</p><p class="text-xs text-gray-600 dark:text-gray-400 mb-1"><i class="fa-solid fa-bullseye mr-1"></i>Origem: <b>${f.origem}</b></p><p class="text-xs text-gray-500 dark:text-gray-400"><i class="fa-regular fa-calendar mr-1"></i>Solicitado: ${formatarDataHora(f.data_solicitacao)}</p></div>${botoesAcao}</div>`;
        });
    } catch (e) { console.error(e); }
}

window.assumirTicket = async function(ticketId) {
    if (usuarioLogado.tipo_perfil === 'ADMIN') return alert("Apenas Analistas podem assumir atendimentos.");
    if(!confirm("Deseja assumir este ticket e iniciar o atendimento agora?")) return;
    try {
        const res = await fetch(`/api/atendimentos/${ticketId}/assumir`, { method: 'PUT', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ usuario_id: usuarioLogado.id }) });
        if (res.ok) { carregarPainelE_Fila(); } else { alert("Erro ao assumir."); }
    } catch (e) { alert("Erro."); }
};

window.abrirModalNovoAtendimento = function() {
    if (usuarioLogado.tipo_perfil === 'ADMIN') return alert("Apenas Analistas.");
    const form = document.getElementById('formNovoAtendimento'); if(form) { form.reset(); form.onsubmit = salvarNovoAtendimento; }
    const modal = document.getElementById('modalNovoAtendimento'); if(modal) modal.classList.remove('hidden');
};

window.fecharModalNovoAtendimento = function() { document.getElementById('modalNovoAtendimento').classList.add('hidden'); };

window.salvarNovoAtendimento = async function(e) {
    if (e) e.preventDefault();
    const numAtend = document.getElementById('numero_atend').value; const tipoId = document.getElementById('tipo_atend').value; const sid = document.getElementById('filtro-setor') ? document.getElementById('filtro-setor').value : '';
    if (!numAtend || !tipoId) return alert("Preencha Ticket e tipo.");
    const body = { numero_atendimento: numAtend, tipo_id: tipoId, usuario_id: usuarioLogado.id, setor_id: sid !== 'todos' && sid !== '' ? sid : usuarioLogado.setor_id };
    try {
        const res = await fetch('/api/atendimentos', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(body) });
        if (res.ok) { window.fecharModalNovoAtendimento(); carregarPainelE_Fila(); } else { const err = await res.json(); alert("Erro: " + err.erro); }
    } catch (erro) { alert("Erro."); }
};

async function carregarPainelKanban() {
    const f = document.getElementById('filtro-setor'); const sid = (f && f.value) ? f.value : usuarioLogado.setor_id; if(!sid) return;
    const resU = await fetch('/api/usuarios'); const todosU = await resU.json();
    usuariosSetor = todosU.filter(u => u.tipo_perfil === 'ANALISTA' && u.ativo !== false && (sid === 'todos' || u.setor_id == sid));
    const selAnalista = document.getElementById('filtro-analista');
    if(selAnalista) { selAnalista.innerHTML = '<option value="">Todos</option>'; usuariosSetor.forEach(u => selAnalista.innerHTML += `<option value="${u.id}">${u.nome}</option>`); }
    const resA = await fetch(`/api/atendimentos/ativos?setor_id=${sid}`); atendimentosAtivos = await resA.json();
    desenharPainelKanban();
}

function desenharPainelKanban() {
    const container = document.getElementById('painel_usuarios'); if(!container) return; container.innerHTML = '';
    usuariosSetor.forEach(user => {
        const cardsAtendimento = atendimentosAtivos.filter(a => a.usuario_id == user.id).map(a => {
            
            let htmlPausa = '';
            if (a.status === 'PAUSADO') {
                htmlPausa = `<div class="mt-2 bg-yellow-100 dark:bg-yellow-900/40 border border-yellow-300 dark:border-yellow-700 text-yellow-800 dark:text-yellow-300 text-xs p-2 rounded flex items-center"><i class="fa-solid fa-pause mr-2"></i><b>PAUSADO:</b> &nbsp;${a.motivo_pausa}</div>`;
            }

            let footerCard = '';
            // Usa '==' ao invés de '===' para evitar bug do texto vs número no ID
            if (usuarioLogado.tipo_perfil === 'ADMIN' || usuarioLogado.id == user.id) {
                footerCard = `<div class="mt-3 text-center bg-gray-800 text-white rounded font-mono text-lg py-1 timer-calculado shadow-inner ${a.status === 'PAUSADO' ? 'opacity-50' : ''}" data-inicio="${a.data_inicio}" data-pausa="${a.tempo_em_pausa_ms}" data-inicio-pausa="${a.inicio_ultima_pausa}" data-status="${a.status}">00:00:00</div>`; 
            }
            
            if (usuarioLogado.id == user.id || usuarioLogado.tipo_perfil === 'ADMIN') { 
                footerCard += `<div class="mt-2 grid grid-cols-3 gap-1">`;
                
                if (a.status === 'PAUSADO') {
                    footerCard += `<button onclick="retomarAtendimento(${a.id})" class="bg-blue-500 hover:bg-blue-600 text-white text-xs font-bold py-2 rounded shadow flex justify-center items-center" title="Retomar"><i class="fa-solid fa-play"></i></button>`;
                } else {
                    footerCard += `<button onclick="abrirModalPausa(${a.id})" class="bg-yellow-500 hover:bg-yellow-600 text-white text-xs font-bold py-2 rounded shadow flex justify-center items-center" title="Pausar"><i class="fa-solid fa-pause"></i></button>`;
                }

                footerCard += `
                    <button onclick="abrirModalTransferencia(${a.id})" class="bg-blue-400 hover:bg-blue-500 text-white text-xs font-bold py-2 rounded shadow flex justify-center items-center" title="Transferir Ticket"><i class="fa-solid fa-right-left"></i></button>
                    <button onclick="finalizarAtendimento(${a.id})" class="bg-green-500 hover:bg-green-600 text-white text-xs font-bold py-2 rounded shadow flex justify-center items-center" title="Concluir Atendimento"><i class="fa-solid fa-check"></i></button>
                </div>`;
            }
            return `<div class="bg-white dark:bg-gray-700 p-3 rounded-lg border border-gray-200 dark:border-gray-600 shadow-sm relative overflow-hidden"><div class="absolute top-0 left-0 w-1 h-full ${a.status === 'PAUSADO' ? 'bg-yellow-500' : 'bg-blue-500'}"></div><div class="text-xs text-blue-600 dark:text-blue-300 font-bold uppercase mb-1 ml-2"><i class="fa-solid fa-tag mr-1"></i>${a.tipo_nome}</div><div class="font-bold dark:text-white ml-2 text-lg">#${a.numero_atendimento}</div>${htmlPausa}${footerCard}</div>`;
        }).join('');
        container.innerHTML += `<div class="bg-gray-50 dark:bg-gray-800 p-4 rounded-xl border dark:border-gray-700 shadow flex flex-col h-full"><h3 class="font-bold text-lg dark:text-white text-center mb-4 border-b dark:border-gray-700 pb-2 text-gray-700 dark:text-gray-200"><i class="fa-solid fa-user-tie mr-2 text-gray-500"></i>${user.nome.split(' ')[0]}</h3><div class="flex-1 flex flex-col gap-3">${cardsAtendimento || '<div class="text-center text-sm text-gray-400 italic mt-4"><i class="fa-regular fa-clock mr-1"></i>Livre</div>'}</div></div>`;
    });
    clearInterval(timerInterval); atualizarCronometros(); timerInterval = setInterval(atualizarCronometros, 1000);
}

window.finalizarAtendimento = async function(id) {
    if(!confirm("Deseja realmente encerrar este atendimento?")) return;
    const res = await fetch(`/api/atendimentos/${id}/finalizar`, { method: 'PUT' });
    if (res.ok) carregarPainelE_Fila();
};

function calcularTempoUtil(dataInicioISO, dataFimISO = null, tempoPausaMs = 0, inicioUltimaPausaISO = null, status = 'EM_ANDAMENTO') {
    if (!dataInicioISO) return 0;
    let start = new Date(dataInicioISO + (!dataInicioISO.includes('Z') ? 'Z' : '')).getTime();
    let end;

    // Se estiver pausado, o tempo "congela" no momento em que a pausa iniciou
    if (status === 'PAUSADO' && inicioUltimaPausaISO) {
        end = new Date(inicioUltimaPausaISO + (!inicioUltimaPausaISO.includes('Z') ? 'Z' : '')).getTime();
    } else if (dataFimISO) {
        end = new Date(dataFimISO + (!dataFimISO.includes('Z') ? 'Z' : '')).getTime();
    } else {
        end = new Date().getTime();
    }

    let totalMs = (end - start) - parseInt(tempoPausaMs || 0);
    return totalMs > 0 ? totalMs : 0;
}

function atualizarCronometros() { 
    document.querySelectorAll('.timer-calculado').forEach(t => { 
        t.textContent = msParaTexto(calcularTempoUtil(
            t.getAttribute('data-inicio'), 
            null, 
            t.getAttribute('data-pausa'), 
            t.getAttribute('data-inicio-pausa'), 
            t.getAttribute('data-status')
        )); 
    }); 
}

function msParaTexto(diffMs) { const horas = Math.floor(diffMs / (1000 * 60 * 60)); const minutos = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60)); const segundos = Math.floor((diffMs % (1000 * 60)) / 1000); return `${String(horas).padStart(2, '0')}:${String(minutos).padStart(2, '0')}:${String(segundos).padStart(2, '0')}`; }

function formatarDataHora(dataISO) {
    if(!dataISO) return '--'; let strData = dataISO; if (!strData.includes('Z')) strData += 'Z';
    const d = new Date(strData); return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')} às ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
}

function atualizarCronometros() { document.querySelectorAll('.timer-calculado').forEach(t => { t.textContent = msParaTexto(calcularTempoUtil(t.getAttribute('data-inicio'))); }); }

window.buscarRelatorios = async function() {
    const setor_id = document.getElementById('filtro-setor').value; const data_inicio = document.getElementById('filtro-data-inicio').value; const data_fim = document.getElementById('filtro-data-fim').value; const usuario_id = document.getElementById('filtro-analista').value; const tipo_id = document.getElementById('filtro-tipo').value;
    let url = `/api/atendimentos/concluidos?setor_id=${setor_id}`; if(data_inicio) url += `&data_inicio=${data_inicio}`; if(data_fim) url += `&data_fim=${data_fim}`; if(usuario_id) url += `&usuario_id=${usuario_id}`; if(tipo_id) url += `&tipo_id=${tipo_id}`;
    try { const res = await fetch(url); dadosRelatorio = await res.json(); renderizarTabelaRelatorio();atualizarGraficos(); } catch (erro) { alert("Falha."); }
};

function renderizarTabelaRelatorio() {
    const corpo = document.getElementById('corpo-tabela-relatorio'); corpo.innerHTML = ''; let somaMs = 0;
    if (!Array.isArray(dadosRelatorio) || dadosRelatorio.length === 0) { corpo.innerHTML = `<tr><td colspan="6" class="p-4 text-center text-gray-500">Nenhum atendimento.</td></tr>`; } 
    else { dadosRelatorio.forEach(a => { const tempoMs = calcularTempoUtil(a.data_inicio, a.data_fim); somaMs += tempoMs; corpo.innerHTML += `<tr class="border-b dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700/50"><td class="p-3 font-bold">#${a.numero_atendimento}</td><td class="p-3">${a.usuario_nome}</td><td class="p-3"><span class="bg-gray-200 dark:bg-gray-600 px-2 py-1 rounded text-xs">${a.tipo_nome}</span></td><td class="p-3">${formatarDataHora(a.data_inicio)}</td><td class="p-3">${formatarDataHora(a.data_fim)}</td><td class="p-3 font-mono text-green-600 dark:text-green-400 font-bold">${msParaTexto(tempoMs)}</td></tr>`; }); }
    const resTotal = document.getElementById('resumo-total'); const resTempo = document.getElementById('resumo-tempo-total'); const resMedio = document.getElementById('resumo-tempo-medio');
    if(resTotal) resTotal.textContent = dadosRelatorio.length || 0; if(resTempo) resTempo.textContent = msParaTexto(somaMs); if(resMedio) resMedio.textContent = dadosRelatorio.length > 0 ? msParaTexto(somaMs / dadosRelatorio.length) : '00:00:00';
}

window.exportarCSV = function() {
    if (!dadosRelatorio || dadosRelatorio.length === 0) return alert('Não há dados.'); let csvContent = "data:text/csv;charset=utf-8,Ticket;Analista;Tipo;Inicio;Termino;TempoUtil\n";
    dadosRelatorio.forEach(a => { const tempo = msParaTexto(calcularTempoUtil(a.data_inicio, a.data_fim)); csvContent += `${a.numero_atendimento};${a.usuario_nome};${a.tipo_nome};${formatarDataHora(a.data_inicio)};${formatarDataHora(a.data_fim)};${tempo}\n`; });
    const encodedUri = encodeURI(csvContent); const link = document.createElement("a"); link.setAttribute("href", encodedUri); link.setAttribute("download", "relatorio.csv"); document.body.appendChild(link); link.click(); document.body.removeChild(link);
};

window.editarPrioridade = function(id) {
    if (usuarioLogado.tipo_perfil !== 'ADMIN') return alert("Acesso negado.");
    const atendimento = filaPendente.find(f => f.id == id);
    if (!atendimento) return alert("Erro.");
    let inputPriId = document.getElementById('pri_id');
    if (!inputPriId) { inputPriId = document.createElement('input'); inputPriId.type = 'hidden'; inputPriId.id = 'pri_id'; document.getElementById('formNovaPrioridade').appendChild(inputPriId); }
    inputPriId.value = atendimento.id;
    document.getElementById('pri_numero').value = atendimento.numero_atendimento || '';
    document.getElementById('pri_nivel').value = atendimento.prioridade || 'Média';
    document.getElementById('pri_origem').value = atendimento.origem || '';
    if (atendimento.setor_id) document.getElementById('pri_setor').value = atendimento.setor_id;
    if (atendimento.tipo_id) document.getElementById('pri_tipo').value = atendimento.tipo_id;
    document.getElementById('modalNovaPrioridade').classList.remove('hidden');
};

window.excluirAtendimento = async function(id) {
    if (usuarioLogado.tipo_perfil !== 'ADMIN') return alert("Acesso negado.");
    if(!confirm("Tem certeza que deseja excluir este atendimento permanentemente?")) return;
    try { const res = await fetch(`/api/atendimentos/${id}`, { method: 'DELETE' }); if (res.ok) { carregarPainelE_Fila(); } else { alert("Erro ao excluir."); } } catch (e) { alert("Erro."); }
};

function atualizarGraficos() {
    const statsAnalista = {};
    dadosRelatorio.forEach(a => {
        const tempoMs = calcularTempoUtil(a.data_inicio, a.data_fim);
        if (!statsAnalista[a.usuario_nome]) { statsAnalista[a.usuario_nome] = { qtd: 0, tempoTotalMs: 0 }; }
        statsAnalista[a.usuario_nome].qtd += 1; statsAnalista[a.usuario_nome].tempoTotalMs += tempoMs;
    });
    const labelsAnalistas = Object.keys(statsAnalista); const dataQuantidade = labelsAnalistas.map(nome => statsAnalista[nome].qtd);
    const dataTempoMedio = labelsAnalistas.map(nome => { const mediaMs = statsAnalista[nome].tempoTotalMs / statsAnalista[nome].qtd; return (mediaMs / (1000 * 60)).toFixed(2); });
    const cores = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];
    const isDark = document.documentElement.classList.contains('dark');
    const corTexto = isDark ? '#e5e7eb' : '#374151'; const corGrade = isDark ? '#374151' : '#e5e7eb';
    const ctxTempo = document.getElementById('graficoTempo');
    if (ctxTempo) {
        if (window.chartTempo) window.chartTempo.destroy();
        window.chartTempo = new Chart(ctxTempo, { type: 'bar', data: { labels: labelsAnalistas, datasets: [{ label: 'Tempo Médio (Minutos)', data: dataTempoMedio, backgroundColor: '#8b5cf6', borderRadius: 6 }] }, options: { maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { color: corTexto }, grid: { color: corGrade } }, x: { ticks: { color: corTexto, font: { weight: 'bold' } }, grid: { display: false } } } } });
    }
    const ctxAnalistas = document.getElementById('graficoAnalistas');
    if (ctxAnalistas) {
        if (window.chartAnalistas) window.chartAnalistas.destroy();
        window.chartAnalistas = new Chart(ctxAnalistas, { type: 'doughnut', data: { labels: labelsAnalistas, datasets: [{ data: dataQuantidade, backgroundColor: cores, borderWidth: 0 }] }, options: { maintainAspectRatio: false, plugins: { legend: { position: 'right', labels: { color: corTexto, font: { weight: 'bold' } } } }, cutout: '60%' } });
    }
}

window.abrirModalGeradorPersonalizado = async function() {
    document.getElementById('formGeradorCustom').reset();
    const hoje = new Date(); document.getElementById('gerar_data_inicio').value = hoje.toISOString().split('T')[0]; hoje.setDate(hoje.getDate() + 30); document.getElementById('gerar_data_fim').value = hoje.toISOString().split('T')[0];
    const res = await fetch('/api/setores'); const setores = await res.json();
    const selectSetor = document.getElementById('gerar_setor'); selectSetor.innerHTML = '<option value="">Selecione um Setor...</option>';
    setores.forEach(s => selectSetor.innerHTML += `<option value="${s.id}">${s.nome}</option>`);
    document.getElementById('gerar_analistas_lista').innerHTML = '<p class="text-xs text-gray-500 col-span-full">Selecione um setor acima...</p>';
    document.getElementById('gerar_turnos_container').innerHTML = '';
    adicionarTurnoGerador();
    selectSetor.onchange = carregarAnalistasGerador;
    document.getElementById('modalGeradorPersonalizado').classList.remove('hidden');
};

async function carregarAnalistasGerador() {
    const setorId = document.getElementById('gerar_setor').value;
    const container = document.getElementById('gerar_analistas_lista');
    if (!setorId) { container.innerHTML = '<p class="text-xs text-gray-500">Selecione um setor acima...</p>'; return; }
    container.innerHTML = '<p class="text-xs text-gray-500 col-span-full">Carregando...</p>';
    try {
        const res = await fetch('/api/usuarios'); const usuarios = await res.json();
        const analistas = usuarios.filter(u => u.setor_id == setorId && u.tipo_perfil === 'ANALISTA' && u.ativo !== false);
        container.innerHTML = '';
        if(analistas.length === 0) return container.innerHTML = '<p class="text-xs text-red-500 col-span-full">Nenhum analista ativo.</p>';
        analistas.forEach(u => { container.innerHTML += `<label class="flex items-center gap-2 p-1 border rounded dark:border-gray-600 bg-gray-50 dark:bg-gray-700 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"><input type="checkbox" value="${u.id}" class="chk-analista-gerador w-4 h-4 text-purple-600" checked><span class="text-sm font-bold dark:text-white truncate">${u.nome.split(' ')[0]}</span></label>`; });
    } catch(e) { container.innerHTML = '<p class="text-xs text-red-500">Erro.</p>'; }
}

window.adicionarTurnoGerador = function() {
    const container = document.getElementById('gerar_turnos_container');
    const id = Date.now();
    const novoTurnoHTML = `<div id="turno_${id}" class="flex flex-col gap-2 bg-white dark:bg-gray-800 p-3 rounded border dark:border-gray-600 mb-2"><div class="flex gap-2 items-center"><select class="turno-funcao flex-1 p-1 text-sm border rounded dark:bg-gray-700 dark:text-white dark:border-gray-500"><option value="Filtro">Filtro</option><option value="Chat">Chat</option><option value="Rev Almoço">Rev Almoço</option><option value="Visita Externa">Visita Externa</option></select><label class="flex items-center gap-1 text-sm dark:text-white font-bold"><input type="checkbox" class="turno-dia-inteiro w-4 h-4" onchange="document.getElementById('horarios_${id}').classList.toggle('hidden', this.checked)"> Dia Inteiro</label><button type="button" onclick="document.getElementById('turno_${id}').remove()" class="text-red-500 hover:text-red-700 px-2"><i class="fa-solid fa-trash"></i></button></div><div id="horarios_${id}" class="flex gap-2 items-center"><span class="text-xs dark:text-gray-300">Das:</span><input type="time" class="turno-inicio p-1 text-sm border rounded dark:bg-gray-700 dark:text-white dark:border-gray-500"><span class="text-xs dark:text-gray-300">Até:</span><input type="time" class="turno-fim p-1 text-sm border rounded dark:bg-gray-700 dark:text-white dark:border-gray-500"></div></div>`;
    container.insertAdjacentHTML('beforeend', novoTurnoHTML);
};

let payloadGeradorMemoria = null;

window.executarGeradorPersonalizado = async function() {
    const setor_id = document.getElementById('gerar_setor').value; const data_inicio = document.getElementById('gerar_data_inicio').value; const data_fim = document.getElementById('gerar_data_fim').value; const frequencia_dias = parseInt(document.getElementById('gerar_frequencia').value);
    const checkboxes = document.querySelectorAll('.chk-analista-gerador:checked'); const analistas = Array.from(checkboxes).map(chk => parseInt(chk.value));
    const turnosConfig = document.querySelectorAll('#gerar_turnos_container > div');
    const turnos = Array.from(turnosConfig).map(div => { return { funcao: div.querySelector('.turno-funcao').value, dia_inteiro: div.querySelector('.turno-dia-inteiro').checked, hora_inicio: div.querySelector('.turno-inicio').value, hora_fim: div.querySelector('.turno-fim').value }; });
    if (!setor_id || !data_fim || analistas.length === 0 || turnos.length === 0) return alert("Preencha todos os campos do gerador e selecione analistas/turnos.");
    const btn = document.getElementById('btnExecutarGerador'); const txtOriginal = btn.innerHTML; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i>Verificando...'; btn.disabled = true;
    payloadGeradorMemoria = { setor_id, data_inicio, data_fim, frequencia_dias, analistas, turnos, sobrescrever: false };
    try {
        const checkRes = await fetch('/api/escala/check_conflito', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ setor_id, data_inicio, data_fim, analistas }) });
        if (!checkRes.ok) { const erroReal = await checkRes.text(); alert("ERRO: " + erroReal); btn.innerHTML = txtOriginal; btn.disabled = false; return; }
        const checkData = await checkRes.json();
        if (checkData.conflito) { document.getElementById('modalConfirmarSubstituicao').classList.remove('hidden'); btn.innerHTML = txtOriginal; btn.disabled = false; } 
        else { await confirmarE_GerarEscala(); }
    } catch (e) { alert('Erro: ' + e.message); btn.innerHTML = txtOriginal; btn.disabled = false; }
};

window.confirmarE_GerarEscala = async function() {
    document.getElementById('modalConfirmarSubstituicao').classList.add('hidden');
    payloadGeradorMemoria.sobrescrever = true;
    const btn = document.getElementById('btnExecutarGerador'); const txtOriginal = btn.innerHTML; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i>Gerando...'; btn.disabled = true;
    try {
        const res = await fetch('/api/escala/gerar_custom', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(payloadGeradorMemoria) });
        if (res.ok) { document.getElementById('modalGeradorPersonalizado').classList.add('hidden'); if (typeof calendar !== 'undefined' && calendar) calendar.refetchEvents(); alert('Escala gerada!'); } 
        else { const err = await res.json(); alert('Erro: ' + err.erro); }
    } catch (e) { alert('Erro de conexão.'); }
    btn.innerHTML = txtOriginal; btn.disabled = false;
};

window.abrirModalPausa = function(id) {
    document.getElementById('pausa_atendimento_id').value = id;
    document.getElementById('pausa_motivo').value = '';
    const form = document.getElementById('formPausarAtendimento');
    form.onsubmit = async (e) => {
        e.preventDefault();
        const res = await fetch(`/api/atendimentos/${id}/pausar`, { method: 'PUT', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ motivo: document.getElementById('pausa_motivo').value }) });
        if(res.ok) { document.getElementById('modalPausarAtendimento').classList.add('hidden'); carregarPainelE_Fila(); }
    };
    document.getElementById('modalPausarAtendimento').classList.remove('hidden');
};

window.retomarAtendimento = async function(id) {
    const res = await fetch(`/api/atendimentos/${id}/retomar`, { method: 'PUT' });
    if(res.ok) carregarPainelE_Fila();
};

window.abrirModalTransferencia = function(id) {
    document.getElementById('transf_atendimento_id').value = id;
    const sel = document.getElementById('transf_usuario_id'); sel.innerHTML = '';
    usuariosSetor.filter(u => u.id !== usuarioLogado.id).forEach(u => sel.innerHTML += `<option value="${u.id}">${u.nome}</option>`);
    
    const form = document.getElementById('formTransferirAtendimento');
    form.onsubmit = async (e) => {
        e.preventDefault();
        if(!confirm('O tempo do ticket atual será encerrado e ele será recomeçado na tela do outro analista. Confirmar?')) return;
        const res = await fetch(`/api/atendimentos/${id}/transferir`, { method: 'PUT', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ novo_usuario_id: document.getElementById('transf_usuario_id').value }) });
        if(res.ok) { document.getElementById('modalTransferirAtendimento').classList.add('hidden'); carregarPainelE_Fila(); }
    };
    document.getElementById('modalTransferirAtendimento').classList.remove('hidden');
};

// ==========================================
// RELATÓRIO DE ESCALAS
// ==========================================
let dadosRelatorioEscalaBase = [];

window.abrirModalRelatorioEscala = async function() {
    const hoje = new Date();
    document.getElementById('rel_escala_inicio').value = hoje.toISOString().split('T')[0];
    hoje.setDate(hoje.getDate() + 7);
    document.getElementById('rel_escala_fim').value = hoje.toISOString().split('T')[0];
    
    const selectSetor = document.getElementById('rel_escala_setor');
    selectSetor.innerHTML = usuarioLogado.tipo_perfil === 'ADMIN' ? '<option value="todos">Todos os Setores</option>' : '';
    
    try {
        const res = await fetch('/api/setores'); const setores = await res.json();
        setores.forEach(s => { 
            if (usuarioLogado.tipo_perfil === 'ADMIN' || s.id == usuarioLogado.setor_id) {
                selectSetor.innerHTML += `<option value="${s.id}">${s.nome}</option>`;
            }
        });
    } catch(e) {}
    
    document.getElementById('corpo_relatorio_escala').innerHTML = '<tr><td colspan="5" class="p-6 text-center text-gray-500 italic">Preencha os filtros e clique em buscar.</td></tr>';
    dadosRelatorioEscalaBase = [];
    document.getElementById('modalRelatorioEscala').classList.remove('hidden');
};

window.buscarRelatorioEscala = async function() {
    const setor_id = document.getElementById('rel_escala_setor').value;
    const data_inicio = document.getElementById('rel_escala_inicio').value;
    const data_fim = document.getElementById('rel_escala_fim').value;

    if (!data_inicio || !data_fim) return alert("Selecione a data inicial e final.");

    const corpo = document.getElementById('corpo_relatorio_escala');
    corpo.innerHTML = '<tr><td colspan="5" class="p-6 text-center text-gray-500 font-bold"><i class="fa-solid fa-spinner fa-spin mr-2"></i>Buscando...</td></tr>';

    try {
        const res = await fetch(`/api/escala/relatorio?setor_id=${setor_id}&data_inicio=${data_inicio}&data_fim=${data_fim}`);
        dadosRelatorioEscalaBase = await res.json();
        
        corpo.innerHTML = '';
        if (dadosRelatorioEscalaBase.length === 0) {
            corpo.innerHTML = '<tr><td colspan="5" class="p-6 text-center text-red-500 font-bold">Nenhuma escala encontrada neste período.</td></tr>';
            return;
        }

        dadosRelatorioEscalaBase.forEach(e => {
            const dataBr = e.data.split('-').reverse().join('/');
            const horario = e.dia_inteiro ? '<span class="text-blue-600 font-bold">Dia Inteiro</span>' : (e.hora_inicio ? `<span class="font-mono text-gray-700 dark:text-gray-300">${e.hora_inicio.substring(0,5)} as ${e.hora_fim.substring(0,5)}</span>` : '<span class="text-gray-400 italic">Não definido</span>');
            
            corpo.innerHTML += `
                <tr class="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td class="p-3 font-bold">${dataBr}</td>
                    <td class="p-3">${e.analista}</td>
                    <td class="p-3"><span class="bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded text-xs font-bold shadow-sm">${e.funcao}</span></td>
                    <td class="p-3">${horario}</td>
                    <td class="p-3 text-gray-600 dark:text-gray-400 max-w-[200px] truncate" title="${e.observacao || ''}">${e.observacao || ''}</td>
                </tr>
            `;
        });
    } catch (e) {
        corpo.innerHTML = '<tr><td colspan="5" class="p-6 text-center text-red-500 font-bold">Erro ao buscar dados.</td></tr>';
    }
};

window.exportarCSVEscala = function() {
    if (!dadosRelatorioEscalaBase || dadosRelatorioEscalaBase.length === 0) return alert('Não há dados para exportar. Faça uma busca primeiro.');
    
    // 1. Descobre todas as colunas (Funções) únicas que existem nesse período
    const funcoesUnicas = [...new Set(dadosRelatorioEscalaBase.map(e => e.funcao))].filter(f => f).sort();
    
    // 2. Agrupa os dados por Data (Transformando na Tabela da foto)
    const dadosAgrupados = {};
    
    dadosRelatorioEscalaBase.forEach(e => {
        if (!dadosAgrupados[e.data]) {
            dadosAgrupados[e.data] = {};
        }
        
        const nomeAnalista = e.analista.split(' ')[0]; 

        if (!dadosAgrupados[e.data][e.funcao]) {
            dadosAgrupados[e.data][e.funcao] = nomeAnalista;
        } else {
            dadosAgrupados[e.data][e.funcao] += " / " + nomeAnalista;
        }
    });

    let csvContent = "\uFEFFData;"; 
    csvContent += funcoesUnicas.join(";") + "\n";

    const nomeDias = { 0: 'Domingo', 1: 'Segunda', 2: 'Terça', 3: 'Quarta', 4: 'Quinta', 5: 'Sexta', 6: 'Sábado' };

    const datasOrdenadas = Object.keys(dadosAgrupados).sort();
    
    datasOrdenadas.forEach(dataIso => {
        const dataObj = new Date(dataIso + 'T12:00:00Z');
        const dataBr = dataIso.split('-').reverse().join('/');
        const diaSemana = nomeDias[dataObj.getUTCDay()];
        
        let linha = `${dataBr} ${diaSemana};`; 
        
        funcoesUnicas.forEach(funcao => {
            const analista = dadosAgrupados[dataIso][funcao] || "-";
            linha += `${analista};`;
        });
        csvContent += linha.slice(0, -1) + "\n"; 
    });


    const encodedUri = encodeURI("data:text/csv;charset=utf-8," + csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "Escala_Equipe.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};