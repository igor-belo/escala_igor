// O carregamento inicial (header, auth, permissão e modals) é feito pelo app.js

function inicializarAlinhamentos() {
    const formNovoAlinhamento = document.getElementById('formNovoAlinhamento');
    if (formNovoAlinhamento) {
        formNovoAlinhamento.onsubmit = salvarAlinhamento;
    }
    carregarAlinhamentos();
}

async function carregarAlinhamentos() {
    try {
        const res = await fetch('/api/alinhamentos');
        const alinhamentos = await res.json();
        const tbody = document.getElementById('tabela-alinhamentos');
        tbody.innerHTML = '';

        if (alinhamentos.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" class="p-6 text-center text-zinc-500">Nenhuma ocorrência registrada.</td></tr>`;
            return;
        }

        alinhamentos.forEach(a => {
            // Se houver data da ocorrência preenchida manualmente usa ela, senão a data de criação
            const dataStr = a.data_ocorrencia 
                ? new Date(a.data_ocorrencia + 'T12:00:00').toLocaleDateString('pt-BR') 
                : new Date(a.data_criacao).toLocaleString('pt-BR');
            const statusClass = a.alinhado ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400';
            const statusText = a.alinhado ? 'Alinhado' : 'Pendente';
            const isAdmin = usuarioLogado.tipo_perfil === 'ADMIN';

            let btnAction = '';
            if (isAdmin) {
                if (a.alinhado) {
                    btnAction = `<button onclick="alternarStatusAlinhamento(${a.id}, false)" class="text-xs px-3 py-1.5 rounded bg-zinc-200 dark:bg-zinc-700 hover:bg-zinc-300 dark:hover:bg-zinc-600 transition">Desmarcar</button>`;
                } else {
                    btnAction = `<button onclick="alternarStatusAlinhamento(${a.id}, true)" class="text-xs px-3 py-1.5 rounded bg-emerald-500 hover:bg-emerald-600 text-white transition">Marcar como Alinhado</button>`;
                }
            }

            tbody.innerHTML += `
                <tr class="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/50 transition-colors">
                    <td class="p-4">${a.aberto_por_texto || a.usuario_abertura || 'Desconhecido'}</td>
                    <td class="p-4 font-medium text-emerald-600 dark:text-emerald-400">${a.numero_atendimento || '-'}</td>
                    <td class="p-4 max-w-xs truncate" title="${a.ocorrencia || ''}">${a.ocorrencia || '-'}</td>
                    <td class="p-4 text-xs text-zinc-500">${dataStr}</td>
                    <td class="p-4 text-center">
                        <span class="px-2.5 py-1 rounded-full text-xs font-semibold ${statusClass}">${statusText}</span>
                    </td>
                    <td class="p-4 text-right">
                        ${btnAction}
                    </td>
                </tr>
            `;
        });
    } catch(e) {
        console.error(e);
        document.getElementById('tabela-alinhamentos').innerHTML = `<tr><td colspan="6" class="p-6 text-center text-red-500">Erro ao carregar dados.</td></tr>`;
    }
}

function abrirModalNovoAlinhamento() {
    document.getElementById('modalNovoAlinhamento').classList.remove('hidden');
    document.getElementById('alin_aberto_por').value = '';
    document.getElementById('alin_data').value = '';
    document.getElementById('alin_numero').value = '';
    document.getElementById('alin_ocorrencia').value = '';
}

function fecharModalNovoAlinhamento() {
    document.getElementById('modalNovoAlinhamento').classList.add('hidden');
}

async function salvarAlinhamento(e) {
    e.preventDefault();
    const numero = document.getElementById('alin_numero').value;
    const ocorrencia = document.getElementById('alin_ocorrencia').value;
    const aberto_por = document.getElementById('alin_aberto_por').value;
    const data_ocorrencia = document.getElementById('alin_data').value;
    
    try {
        const res = await fetch('/api/alinhamentos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                usuario_abertura_id: usuarioLogado.id,
                numero_atendimento: numero,
                ocorrencia: ocorrencia,
                aberto_por_texto: aberto_por,
                data_ocorrencia: data_ocorrencia
            })
        });
        if (res.ok) {
            fecharModalNovoAlinhamento();
            carregarAlinhamentos();
        } else {
            alert('Erro ao registrar ocorrência.');
        }
    } catch(err) {
        alert('Erro ao registrar ocorrência.');
    }
}

async function alternarStatusAlinhamento(id, novoStatus) {
    try {
        const res = await fetch(`/api/alinhamentos/${id}/alinhar`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ alinhado: novoStatus })
        });
        if (res.ok) {
            carregarAlinhamentos();
        } else {
            alert('Erro ao atualizar status.');
        }
    } catch (err) {
        alert('Erro ao atualizar status.');
    }
}

