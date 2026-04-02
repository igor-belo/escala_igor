let setorIdEmEdicao = null;
let tipoIdEmEdicao = null;

window.abrirModalSetores = async function() {
    document.getElementById('modalConfiguracoes').classList.add('hidden');
    document.getElementById('modalGerenciarSetores').classList.remove('hidden');
    cancelarEdicaoSetor();
    carregarListaSetoresConfig();
};

async function carregarListaSetoresConfig() {
    try {
        const res = await fetch('/api/setores');
        const setores = await res.json();
        const lista = document.getElementById('lista_setores');
        lista.innerHTML = '';
        setores.forEach(s => {
            const nomeSeguro = s.nome.replace(/'/g, "\\'");
            lista.innerHTML += `<li class="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-700 rounded border dark:border-gray-600"><span class="dark:text-white font-bold">${s.nome}</span> <div class="flex gap-3"><button onclick="prepararEdicaoSetor(${s.id}, '${nomeSeguro}')" class="text-yellow-500 hover:text-yellow-600"><i class="fa-solid fa-pen"></i></button><button onclick="excluirSetor(${s.id})" class="text-red-500 hover:text-red-700"><i class="fa-solid fa-trash"></i></button></div></li>`;
        });
    } catch (e) { console.error(e); }
}

window.prepararEdicaoSetor = function(id, nome) {
    setorIdEmEdicao = id;
    document.getElementById('novo_setor_nome').value = nome;
    document.getElementById('btnSalvarSetor').innerText = 'Salvar';
    document.getElementById('btnSalvarSetor').classList.replace('bg-blue-600', 'bg-yellow-500');
    document.getElementById('btnSalvarSetor').classList.replace('hover:bg-blue-700', 'hover:bg-yellow-600');
    document.getElementById('btnCancelarEdicaoSetor').classList.remove('hidden');
};

window.cancelarEdicaoSetor = function() {
    setorIdEmEdicao = null;
    document.getElementById('novo_setor_nome').value = '';
    document.getElementById('btnSalvarSetor').innerText = 'Adicionar';
    document.getElementById('btnSalvarSetor').classList.replace('bg-yellow-500', 'bg-blue-600');
    document.getElementById('btnSalvarSetor').classList.replace('hover:bg-yellow-600', 'hover:bg-blue-700');
    document.getElementById('btnCancelarEdicaoSetor').classList.add('hidden');
};

window.salvarNovoSetor = async function() {
    const nome = document.getElementById('novo_setor_nome').value;
    if(!nome) return;
    try {
        if (setorIdEmEdicao) { await fetch(`/api/setores/${setorIdEmEdicao}`, { method: 'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify({nome}) }); }
        else { await fetch('/api/setores', { method: 'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({nome}) }); }
        cancelarEdicaoSetor();
        carregarListaSetoresConfig();
        if (typeof initAtendimentos === 'function') initAtendimentos();
    } catch (e) { console.error(e); }
};

window.excluirSetor = async function(id) {
    if(!confirm('Excluir este setor permanentemente?')) return;
    try {
        const res = await fetch(`/api/setores/${id}`, { method: 'DELETE' });
        if(res.ok) { carregarListaSetoresConfig(); if (typeof initAtendimentos === 'function') initAtendimentos(); }
        else { const err = await res.json(); alert(err.erro); }
    } catch (e) { console.error(e); }
};

window.abrirModalTipos = async function() {
    document.getElementById('modalConfiguracoes').classList.add('hidden');
    document.getElementById('modalGerenciarTipos').classList.remove('hidden');
    cancelarEdicaoTipo();
    carregarListaTiposConfig();
};

async function carregarListaTiposConfig() {
    try {
        const res = await fetch('/api/tipos_atendimento');
        const tipos = await res.json();
        const lista = document.getElementById('lista_tipos');
        lista.innerHTML = '';
        tipos.forEach(t => {
            const nomeSeguro = t.nome.replace(/'/g, "\\'");
            lista.innerHTML += `<li class="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-700 rounded border dark:border-gray-600"><span class="dark:text-white font-bold">${t.nome}</span> <div class="flex gap-3"><button onclick="prepararEdicaoTipo(${t.id}, '${nomeSeguro}')" class="text-yellow-500 hover:text-yellow-600"><i class="fa-solid fa-pen"></i></button><button onclick="excluirTipo(${t.id})" class="text-red-500 hover:text-red-700"><i class="fa-solid fa-trash"></i></button></div></li>`;
        });
    } catch (e) { console.error(e); }
}

window.prepararEdicaoTipo = function(id, nome) {
    tipoIdEmEdicao = id;
    document.getElementById('novo_tipo_nome').value = nome;
    document.getElementById('btnSalvarTipo').innerText = 'Salvar';
    document.getElementById('btnSalvarTipo').classList.replace('bg-green-600', 'bg-yellow-500');
    document.getElementById('btnSalvarTipo').classList.replace('hover:bg-green-700', 'hover:bg-yellow-600');
    document.getElementById('btnCancelarEdicaoTipo').classList.remove('hidden');
};

window.cancelarEdicaoTipo = function() {
    tipoIdEmEdicao = null;
    document.getElementById('novo_tipo_nome').value = '';
    document.getElementById('btnSalvarTipo').innerText = 'Adicionar';
    document.getElementById('btnSalvarTipo').classList.replace('bg-yellow-500', 'bg-green-600');
    document.getElementById('btnSalvarTipo').classList.replace('hover:bg-yellow-600', 'hover:bg-green-700');
    document.getElementById('btnCancelarEdicaoTipo').classList.add('hidden');
};

window.salvarNovoTipo = async function() {
    const nome = document.getElementById('novo_tipo_nome').value;
    if(!nome) return;
    try {
        if (tipoIdEmEdicao) { await fetch(`/api/tipos_atendimento/${tipoIdEmEdicao}`, { method: 'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify({nome}) }); }
        else { await fetch('/api/tipos_atendimento', { method: 'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({nome}) }); }
        cancelarEdicaoTipo();
        carregarListaTiposConfig();
        if (typeof carregarTiposDeAtendimento === 'function') carregarTiposDeAtendimento();
    } catch (e) { console.error(e); }
};

window.excluirTipo = async function(id) {
    if(!confirm('Excluir este tipo de atendimento permanentemente?')) return;
    try {
        const res = await fetch(`/api/tipos_atendimento/${id}`, { method: 'DELETE' });
        if(res.ok) { carregarListaTiposConfig(); if (typeof carregarTiposDeAtendimento === 'function') carregarTiposDeAtendimento(); }
        else { const err = await res.json(); alert(err.erro); }
    } catch (e) { console.error(e); }
};