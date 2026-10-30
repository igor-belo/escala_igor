let setorIdEmEdicao = null;
let tipoIdEmEdicao = null;
window.abrirModalSetores = async function () {
  document.getElementById("modalGerenciarSetores").classList.remove("hidden");
  cancelarEdicaoSetor();
  carregarListaSetoresConfig();
};
async function carregarListaSetoresConfig() {
  try {
    const res = await fetch("/api/setores");
    const setores = await res.json();
    const lista = document.getElementById("lista_setores");
    lista.innerHTML = "";
    setores.forEach((s) => {
      const nomeSeguro = s.nome.replace(/'/g, "\\'");
      const nomeEscapado = SecurityManager.escapeHTML(s.nome);
      const webhookIcon = s.webhook_url
        ? '<i class="fa-solid fa-bell text-green-500 mr-2" title="Webhook Configurado"></i>'
        : "";
      lista.innerHTML += `<li class="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-700 rounded border dark:border-gray-600"><span class="dark:text-white font-bold">${webhookIcon}${nomeEscapado}</span> <div class="flex gap-3"><button onclick="prepararEdicaoSetor(${s.id}, '${nomeSeguro}', '${s.webhook_url || ""}')" class="text-yellow-500 hover:text-yellow-600"><i class="fa-solid fa-pen"></i></button><button onclick="excluirSetor(${s.id})" class="text-red-500 hover:text-red-700"><i class="fa-solid fa-trash"></i></button></div></li>`;
    });
  } catch (e) {
    console.error(e);
  }
}
window.prepararEdicaoSetor = function (id, nome, webhook_url) {
  setorIdEmEdicao = id;
  document.getElementById("novo_setor_nome").value = nome;
  document.getElementById("novo_setor_webhook").value = webhook_url || "";
  document.getElementById("btnSalvarSetor").innerText = "Salvar";
  document
    .getElementById("btnSalvarSetor")
    .classList.replace("bg-blue-600", "bg-yellow-500");
  document
    .getElementById("btnSalvarSetor")
    .classList.replace("hover:bg-blue-700", "hover:bg-yellow-600");
  document.getElementById("btnCancelarEdicaoSetor").classList.remove("hidden");
};
window.cancelarEdicaoSetor = function () {
  setorIdEmEdicao = null;
  document.getElementById("novo_setor_nome").value = "";
  document.getElementById("novo_setor_webhook").value = "";
  document.getElementById("btnSalvarSetor").innerText = "Adicionar";
  document
    .getElementById("btnSalvarSetor")
    .classList.replace("bg-yellow-500", "bg-blue-600");
  document
    .getElementById("btnSalvarSetor")
    .classList.replace("hover:bg-yellow-600", "hover:bg-blue-700");
  document.getElementById("btnCancelarEdicaoSetor").classList.add("hidden");
};
window.salvarNovoSetor = async function () {
  const nome = document.getElementById("novo_setor_nome").value;
  const webhook_url = document.getElementById("novo_setor_webhook").value;
  if (!nome) return;
  try {
    if (setorIdEmEdicao) {
      await fetch(`/api/setores/${setorIdEmEdicao}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome, webhook_url }),
      });
    } else {
      await fetch("/api/setores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome, webhook_url }),
      });
    }
    cancelarEdicaoSetor();
    carregarListaSetoresConfig();
    if (typeof initAtendimentos === "function") initAtendimentos();
  } catch (e) {
    console.error(e);
  }
};
window.excluirSetor = async function (id) {
  if (!confirm("Excluir este setor permanentemente?")) return;
  try {
    const res = await fetch(`/api/setores/${id}`, { method: "DELETE" });
    if (res.ok) {
      carregarListaSetoresConfig();
      if (typeof initAtendimentos === "function") initAtendimentos();
    } else {
      const err = await res.json();
      alert(err.erro);
    }
  } catch (e) {
    console.error(e);
  }
};
window.abrirModalTipos = async function () {
  document.getElementById("modalGerenciarTipos").classList.remove("hidden");
  cancelarEdicaoTipo();
  carregarListaTiposConfig();
};
async function carregarListaTiposConfig() {
  try {
    const res = await fetch("/api/tipos_atendimento");
    const tipos = await res.json();
    const lista = document.getElementById("lista_tipos");
    lista.innerHTML = "";
    tipos.forEach((t) => {
      const nomeSeguro = t.nome.replace(/'/g, "\\'");
      const nomeEscapado = SecurityManager.escapeHTML(t.nome);
      lista.innerHTML += `<li class="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-700 rounded border dark:border-gray-600"><span class="dark:text-white font-bold">${nomeEscapado}</span> <div class="flex gap-3"><button onclick="prepararEdicaoTipo(${t.id}, '${nomeSeguro}')" class="text-yellow-500 hover:text-yellow-600"><i class="fa-solid fa-pen"></i></button><button onclick="excluirTipo(${t.id})" class="text-red-500 hover:text-red-700"><i class="fa-solid fa-trash"></i></button></div></li>`;
    });
  } catch (e) {
    console.error(e);
  }
}
window.prepararEdicaoTipo = function (id, nome) {
  tipoIdEmEdicao = id;
  document.getElementById("novo_tipo_nome").value = nome;
  document.getElementById("btnSalvarTipo").innerText = "Salvar";
  document
    .getElementById("btnSalvarTipo")
    .classList.replace("bg-green-600", "bg-yellow-500");
  document
    .getElementById("btnSalvarTipo")
    .classList.replace("hover:bg-green-700", "hover:bg-yellow-600");
  document.getElementById("btnCancelarEdicaoTipo").classList.remove("hidden");
};
window.cancelarEdicaoTipo = function () {
  tipoIdEmEdicao = null;
  document.getElementById("novo_tipo_nome").value = "";
  document.getElementById("btnSalvarTipo").innerText = "Adicionar";
  document
    .getElementById("btnSalvarTipo")
    .classList.replace("bg-yellow-500", "bg-green-600");
  document
    .getElementById("btnSalvarTipo")
    .classList.replace("hover:bg-yellow-600", "hover:bg-green-700");
  document.getElementById("btnCancelarEdicaoTipo").classList.add("hidden");
};
window.salvarNovoTipo = async function () {
  const nome = document.getElementById("novo_tipo_nome").value;
  if (!nome) return;
  try {
    if (tipoIdEmEdicao) {
      await fetch(`/api/tipos_atendimento/${tipoIdEmEdicao}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome }),
      });
    } else {
      await fetch("/api/tipos_atendimento", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome }),
      });
    }
    cancelarEdicaoTipo();
    carregarListaTiposConfig();
    if (typeof carregarTiposDeAtendimento === "function")
      carregarTiposDeAtendimento();
  } catch (e) {
    console.error(e);
  }
};
window.excluirTipo = async function (id) {
  if (!confirm("Excluir este tipo de atendimento permanentemente?")) return;
  try {
    const res = await fetch(`/api/tipos_atendimento/${id}`, {
      method: "DELETE",
    });
    if (res.ok) {
      carregarListaTiposConfig();
      if (typeof carregarTiposDeAtendimento === "function")
        carregarTiposDeAtendimento();
    } else {
      const err = await res.json();
      alert(err.erro);
    }
  } catch (e) {
    console.error(e);
  }
};

window.abrirModalWebhookGeral = async function() {
    document.getElementById('modalWebhookGeral').classList.remove('hidden');
    try {
        const res = await fetch('/api/configuracoes');
        if (res.ok) {
            const config = await res.json();
            document.getElementById('webhook_geral_url').value = config.webhook_geral || '';
        }
    } catch(e) {
        console.error('Erro ao carregar configuracoes', e);
    }
};

window.abrirModalBimerConfig = async function() {
    document.getElementById('modalBimerConfig').classList.remove('hidden');
    try {
        const res = await fetch('/api/bimer/config');
        if (res.ok) {
            const config = await res.json();
            document.getElementById('bimer_username').value = config.username || '';
            document.getElementById('bimer_password').value = config.password || '';
            document.getElementById('bimer_auth_url').value = config.auth_url || '';
            document.getElementById('bimer_lancamento_url').value = config.lancamento_url || '';
            document.getElementById('bimer_id_tipo_agendamento').value = config.id_tipo_agendamento || '';
            document.getElementById('bimer_id_usuario_cadastro').value = config.id_usuario_cadastro || '';
            document.getElementById('bimer_id_pessoa').value = config.id_pessoa || '';
        }
    } catch(e) {
        console.error('Erro ao carregar config Bimer', e);
    }
};

document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        const formWebhookGeral = document.getElementById('formWebhookGeral');
        if (formWebhookGeral) {
            formWebhookGeral.onsubmit = async (e) => {
                e.preventDefault();
                const url = document.getElementById('webhook_geral_url').value;
                try {
                    const res = await fetch('/api/configuracoes', {
                        method: 'PUT',
                        headers: {'Content-Type': 'application/json'},
                        body: JSON.stringify({webhook_geral: url})
                    });
                    if (res.ok) {
                        alert('Configuração salva com sucesso!');
                        document.getElementById('modalWebhookGeral').classList.add('hidden');
                    } else {
                        alert('Erro ao salvar configuração.');
                    }
                } catch(err) {
                    alert('Erro de conexão.');
                }
            };
        }

        const formBimerConfig = document.getElementById('formBimerConfig');
        if (formBimerConfig) {
            formBimerConfig.onsubmit = async (e) => {
                e.preventDefault();
                const config = {
                    username: document.getElementById('bimer_username').value,
                    password: document.getElementById('bimer_password').value,
                    auth_url: document.getElementById('bimer_auth_url').value,
                    lancamento_url: document.getElementById('bimer_lancamento_url').value,
                    id_tipo_agendamento: document.getElementById('bimer_id_tipo_agendamento').value,
                    id_usuario_cadastro: document.getElementById('bimer_id_usuario_cadastro').value,
                    id_pessoa: document.getElementById('bimer_id_pessoa').value,
                };
                try {
                    const res = await fetch('/api/bimer/config', {
                        method: 'PUT',
                        headers: {'Content-Type': 'application/json'},
                        body: JSON.stringify(config)
                    });
                    if (res.ok) {
                        alert('Configuração Bimer salva com sucesso!');
                        document.getElementById('modalBimerConfig').classList.add('hidden');
                    } else {
                        const err = await res.json();
                        alert(err.erro || 'Erro ao salvar configuração.');
                    }
                } catch(err) {
                    alert('Erro de conexão.');
                }
            };
        }
    }, 500);
});
