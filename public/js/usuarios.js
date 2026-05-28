let usuarioIdEmEdicao = null;
const dias = [{id: 1, n: 'Segunda'}, {id: 2, n: 'Terça'}, {id: 3, n: 'Quarta'}, {id: 4, n: 'Quinta'}, {id: 5, n: 'Sexta'}];

window.abrirModalCadastro = function() {
    usuarioIdEmEdicao = null;
    document.getElementById('tituloModal').textContent = "Cadastrar Novo Usuário";
    document.getElementById('formCadastro').reset();
    document.getElementById('usuario_ativo').checked = true;
    const container = document.getElementById('gridHorarios');
    container.innerHTML = '';
    dias.forEach(d => { container.innerHTML += `<div class="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-700 rounded text-xs"><input type="checkbox" id="ativo_${d.id}" checked class="w-4 h-4"><span class="w-16 font-bold dark:text-white">${d.n}</span><input type="time" id="ent_${d.id}" value="09:00" class="rounded p-1 dark:bg-gray-600 dark:text-white"><input type="time" id="alm_s_${d.id}" value="12:00" class="rounded p-1 dark:bg-gray-600 dark:text-white"><span class="dark:text-white font-bold mx-1">|</span><input type="time" id="alm_r_${d.id}" value="13:00" class="rounded p-1 dark:bg-gray-600 dark:text-white"><input type="time" id="sai_${d.id}" value="18:00" class="rounded p-1 dark:bg-gray-600 dark:text-white"></div>`; });
    document.getElementById('modalCadastro').classList.remove('hidden');
};

window.fecharModalCadastro = function() { document.getElementById('modalCadastro').classList.add('hidden'); };

window.abrirListagemUsuarios = async function() {
    document.getElementById('modalConfiguracoes').classList.add('hidden');
    document.getElementById('modalLista').classList.remove('hidden');
    await carregarTabelaUsuarios();
};

window.fecharModalLista = function() { document.getElementById('modalLista').classList.add('hidden'); };

window.voltarParaConfiguracoes = function(modalAtualId) {
    document.getElementById(modalAtualId).classList.add('hidden');
    document.getElementById('modalConfiguracoes').classList.remove('hidden');
};

async function carregarTabelaUsuarios() {
    try {
        const res = await fetch('/api/usuarios');
        const usuarios = await res.json();
        const corpo = document.getElementById('corpoTabelaUsuarios');
        corpo.innerHTML = '';
        usuarios.forEach(u => {
            const statusHtml = u.ativo !== false ? '<span class="text-green-500 font-bold"><i class="fa-solid fa-circle-check mr-1"></i>Ativo</span>' : '<span class="text-red-500 font-bold"><i class="fa-solid fa-circle-xmark mr-1"></i>Inativo</span>';
            corpo.innerHTML += `<tr class="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-900/40 transition"><td class="p-3">${statusHtml}</td><td class="p-3">${u.nome}</td><td class="p-3">${u.login}</td><td class="p-3">${u.setor || '<span class="text-gray-400">Admin</span>'}</td><td class="p-3"><button onclick="prepararEdicao(${u.id})" class="text-indigo-600 font-bold hover:underline"><i class="fa-solid fa-pen mr-1"></i>Editar</button></td></tr>`;
        });
    } catch (e) { console.error(e); }
}

window.prepararEdicao = async function(id) {
    try {
        const res = await fetch('/api/usuarios');
        const usuarios = await res.json();
        const u = usuarios.find(user => user.id === id);
        usuarioIdEmEdicao = id;
        document.getElementById('tituloModal').textContent = `Editando: ${u.nome}`;
        document.getElementById('nome').value = u.nome;
        document.getElementById('email').value = u.email;
        document.getElementById('tipo_perfil').value = u.tipo_perfil;
        document.getElementById('usuario_ativo').checked = u.ativo !== false;
        const container = document.getElementById('gridHorarios');
        container.innerHTML = '';
        dias.forEach(d => { container.innerHTML += `<div class="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-700 rounded text-xs"><input type="checkbox" id="ativo_${d.id}" checked class="w-4 h-4"><span class="w-16 font-bold dark:text-white">${d.n}</span><input type="time" id="ent_${d.id}" value="09:00" class="rounded p-1 dark:bg-gray-600 dark:text-white"><input type="time" id="alm_s_${d.id}" value="12:00" class="rounded p-1 dark:bg-gray-600 dark:text-white"><span class="dark:text-white font-bold mx-1">|</span><input type="time" id="alm_r_${d.id}" value="13:00" class="rounded p-1 dark:bg-gray-600 dark:text-white"><input type="time" id="sai_${d.id}" value="18:00" class="rounded p-1 dark:bg-gray-600 dark:text-white"></div>`; });
        const camposA = document.getElementById('camposAnalista');
        if(u.tipo_perfil === 'ANALISTA') {
            camposA.classList.remove('hidden');
            document.getElementById('setor_id_cadastro').value = u.setor_id;
            document.getElementById('funcao_fixa').value = u.funcao_fixa || '';
            document.getElementById('fixa_inicio').value = u.fixa_inicio ? u.fixa_inicio.split('T')[0] : '';
            document.getElementById('fixa_fim').value = u.fixa_fim ? u.fixa_fim.split('T')[0] : '';
            if(u.horarios_semana) { Object.keys(u.horarios_semana).forEach(diaId => { const h = u.horarios_semana[diaId]; document.getElementById(`ativo_${diaId}`).checked = h.ativo; document.getElementById(`ent_${diaId}`).value = h.entrada; document.getElementById(`alm_s_${diaId}`).value = h.almoco_saida; document.getElementById(`alm_r_${diaId}`).value = h.almoco_retorno; document.getElementById(`sai_${diaId}`).value = h.saida; }); }
        } else { camposA.classList.add('hidden'); }
        fecharModalLista(); document.getElementById('modalCadastro').classList.remove('hidden');
    } catch (e) { console.error(e); }
};

window.salvarUsuario = async function(e) {
    if(e) e.preventDefault();
    const tipoP = document.getElementById('tipo_perfil').value;
    const hs = {};
    if(tipoP === 'ANALISTA') { dias.forEach(d => { hs[d.id] = { ativo: document.getElementById(`ativo_${d.id}`).checked, entrada: document.getElementById(`ent_${d.id}`).value, almoco_saida: document.getElementById(`alm_s_${d.id}`).value, almoco_retorno: document.getElementById(`alm_r_${d.id}`).value, saida: document.getElementById(`sai_${d.id}`).value }; }); }
    const body = { nome: document.getElementById('nome').value, email: document.getElementById('email').value, tipo_perfil: tipoP, setor_id: tipoP === 'ANALISTA' ? document.getElementById('setor_id_cadastro').value : null, horarios_semana: tipoP === 'ANALISTA' ? hs : null, funcao_fixa: document.getElementById('funcao_fixa').value, fixa_inicio: document.getElementById('fixa_inicio').value, fixa_fim: document.getElementById('fixa_fim').value, ativo: document.getElementById('usuario_ativo').checked };
    try {
        const res = await fetch(usuarioIdEmEdicao ? `/api/usuarios/${usuarioIdEmEdicao}` : '/api/usuarios', { method: usuarioIdEmEdicao ? 'PUT' : 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(body) });
        if (res.ok) { alert(usuarioIdEmEdicao ? 'Atualizado!' : 'Cadastrado!'); fecharModalCadastro(); await carregarTabelaUsuarios(); } else { const err = await res.json(); alert(err.erro); }
    } catch (e) { alert("Erro de conexão."); }
}