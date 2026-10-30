let usuarioIdEmEdicao = null;
const dias = [
  { id: 1, n: "Segunda" },
  { id: 2, n: "Terça" },
  { id: 3, n: "Quarta" },
  { id: 4, n: "Quinta" },
  { id: 5, n: "Sexta" },
];
window.abrirModalCadastro = function () {
  usuarioIdEmEdicao = null;
  document.getElementById("tituloModal").textContent = "Cadastrar Novo Usuário";
  document.getElementById("formCadastro").reset();
  document.getElementById("usuario_ativo").checked = true;
  const btnReset = document.getElementById("btnResetarSenha");
  if (btnReset) btnReset.classList.add("hidden");
  const container = document.getElementById("gridHorarios");
  container.innerHTML = "";
  dias.forEach((d) => {
    container.innerHTML += `<div class="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-700 rounded text-xs"><input type="checkbox" id="ativo_${d.id}" checked class="w-4 h-4"><span class="w-16 font-bold dark:text-white">${d.n}</span><input type="time" id="ent_${d.id}" value="09:00" class="rounded p-1 dark:bg-gray-600 dark:text-white"><input type="time" id="alm_s_${d.id}" value="12:00" class="rounded p-1 dark:bg-gray-600 dark:text-white"><span class="dark:text-white font-bold mx-1">|</span><input type="time" id="alm_r_${d.id}" value="13:00" class="rounded p-1 dark:bg-gray-600 dark:text-white"><input type="time" id="sai_${d.id}" value="18:00" class="rounded p-1 dark:bg-gray-600 dark:text-white"></div>`;
  });
  document.getElementById("modalCadastro").classList.remove("hidden");
};
window.fecharModalCadastro = function () {
  document.getElementById("modalCadastro").classList.add("hidden");
};
window.abrirListagemUsuarios = async function () {
  document.getElementById("modalLista").classList.remove("hidden");
  await carregarTabelaUsuarios();
};
window.fecharModalLista = function () {
  document.getElementById("modalLista").classList.add("hidden");
};
window.voltarParaConfiguracoes = function (modalAtualId) {
  document.getElementById(modalAtualId).classList.add("hidden");
};
async function carregarTabelaUsuarios() {
  try {
    const res = await fetch("/api/usuarios");
    const usuarios = await res.json();
    const corpo = document.getElementById("corpoTabelaUsuarios");
    corpo.innerHTML = "";
    usuarios.forEach((u) => {
      const statusHtml =
        u.ativo !== false
          ? '<span class="text-green-500 font-bold"><i class="fa-solid fa-circle-check mr-1"></i>Ativo</span>'
          : '<span class="text-red-500 font-bold"><i class="fa-solid fa-circle-xmark mr-1"></i>Inativo</span>';
      const nomeEscapado = SecurityManager.escapeHTML(u.nome);
      const loginEscapado = SecurityManager.escapeHTML(u.login);
      const setorEscapado = u.setor ? SecurityManager.escapeHTML(u.setor) : '<span class="text-gray-400">Admin</span>';
      corpo.innerHTML += `<tr class="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-900/40 transition"><td class="p-3">${statusHtml}</td><td class="p-3">${nomeEscapado}</td><td class="p-3">${loginEscapado}</td><td class="p-3">${setorEscapado}</td><td class="p-3"><button onclick="prepararEdicao(${u.id})" class="text-indigo-600 font-bold hover:underline"><i class="fa-solid fa-pen mr-1"></i>Editar</button></td></tr>`;
    });
  } catch (e) {
    console.error(e);
  }
}
window.prepararEdicao = async function (id) {
  try {
    const res = await fetch("/api/usuarios");
    const usuarios = await res.json();
    const u = usuarios.find((user) => user.id === id);
    usuarioIdEmEdicao = id;
    document.getElementById("tituloModal").textContent = `Editando: ${u.nome}`;
    document.getElementById("nome").value = u.nome;
    document.getElementById("email").value = u.email;
    document.getElementById("tipo_perfil").value = u.tipo_perfil;
    document.getElementById("usuario_ativo").checked = u.ativo !== false;
    document.getElementById("webhook_url").value = u.webhook_url || "";
    document.getElementById("id_bimer").value = u.id_bimer || "";
    const container = document.getElementById("gridHorarios");
    container.innerHTML = "";
    dias.forEach((d) => {
      container.innerHTML += `<div class="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-700 rounded text-xs"><input type="checkbox" id="ativo_${d.id}" checked class="w-4 h-4"><span class="w-16 font-bold dark:text-white">${d.n}</span><input type="time" id="ent_${d.id}" value="09:00" class="rounded p-1 dark:bg-gray-600 dark:text-white"><input type="time" id="alm_s_${d.id}" value="12:00" class="rounded p-1 dark:bg-gray-600 dark:text-white"><span class="dark:text-white font-bold mx-1">|</span><input type="time" id="alm_r_${d.id}" value="13:00" class="rounded p-1 dark:bg-gray-600 dark:text-white"><input type="time" id="sai_${d.id}" value="18:00" class="rounded p-1 dark:bg-gray-600 dark:text-white"></div>`;
    });
    const camposA = document.getElementById("camposAnalista");
    if (u.tipo_perfil === "ANALISTA") {
      camposA.classList.remove("hidden");
      document.getElementById("setor_id_cadastro").value = u.setor_id;
      document.getElementById("funcao_fixa").value = u.funcao_fixa || "";
      document.getElementById("fixa_inicio").value = u.fixa_inicio
        ? u.fixa_inicio.split("T")[0]
        : "";
      document.getElementById("fixa_fim").value = u.fixa_fim
        ? u.fixa_fim.split("T")[0]
        : "";
      if (u.horarios_semana) {
        Object.keys(u.horarios_semana).forEach((diaId) => {
          const h = u.horarios_semana[diaId];
          document.getElementById(`ativo_${diaId}`).checked = h.ativo;
          document.getElementById(`ent_${diaId}`).value = h.entrada;
          document.getElementById(`alm_s_${diaId}`).value = h.almoco_saida;
          document.getElementById(`alm_r_${diaId}`).value = h.almoco_retorno;
          document.getElementById(`sai_${diaId}`).value = h.saida;
        });
      }
    } else {
      camposA.classList.add("hidden");
    }
    fecharModalLista();
    document.getElementById("modalCadastro").classList.remove("hidden");
    const btnReset = document.getElementById("btnResetarSenha");
    if (btnReset) btnReset.classList.remove("hidden");
  } catch (e) {
    console.error(e);
  }
};
window.salvarUsuario = async function (e) {
  if (e) e.preventDefault();
  const tipoP = document.getElementById("tipo_perfil").value;
  const hs = {};
  if (tipoP === "ANALISTA") {
    dias.forEach((d) => {
      hs[d.id] = {
        ativo: document.getElementById(`ativo_${d.id}`).checked,
        entrada: document.getElementById(`ent_${d.id}`).value,
        almoco_saida: document.getElementById(`alm_s_${d.id}`).value,
        almoco_retorno: document.getElementById(`alm_r_${d.id}`).value,
        saida: document.getElementById(`sai_${d.id}`).value,
      };
    });
  }
  const body = {
    nome: document.getElementById("nome").value,
    email: document.getElementById("email").value,
    tipo_perfil: tipoP,
    setor_id:
      tipoP === "ANALISTA"
        ? document.getElementById("setor_id_cadastro").value
        : null,
    horarios_semana: tipoP === "ANALISTA" ? hs : null,
    funcao_fixa: document.getElementById("funcao_fixa").value,
    fixa_inicio: document.getElementById("fixa_inicio").value,
    fixa_fim: document.getElementById("fixa_fim").value,
    ativo: document.getElementById("usuario_ativo").checked,
    webhook_url: document.getElementById("webhook_url").value,
    id_bimer: document.getElementById("id_bimer").value,
  };
  try {
    const res = await fetch(
      usuarioIdEmEdicao
        ? `/api/usuarios/${usuarioIdEmEdicao}`
        : "/api/usuarios",
      {
        method: usuarioIdEmEdicao ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      },
    );
    if (res.ok) {
      showToast(usuarioIdEmEdicao ? "Usuário atualizado com sucesso!" : "Usuário cadastrado com sucesso!", "success");
      fecharModalCadastro();
      await carregarTabelaUsuarios();
    } else {
      const err = await res.json();
      showToast(err.erro || "Erro ao salvar.", "error");
    }
  } catch (e) {
    showToast("Erro de conexão.", "error");
  }
};

window.filtrarUsuarios = function () {
  const termo = document.getElementById("pesquisa_usuario").value.toLowerCase();
  const linhas = document.querySelectorAll("#corpoTabelaUsuarios tr");
  linhas.forEach((linha) => {
    const textoLinha = linha.textContent.toLowerCase();
    if (textoLinha.includes(termo)) {
      linha.style.display = "";
    } else {
      linha.style.display = "none";
    }
  });
};

window.buscarIdBimerAuto = async function () {
  const email = document.getElementById("email").value.trim();
  const status = document.getElementById("bimer_busca_status");
  const btn = document.getElementById("btnBuscarIdBimer");
  const campo = document.getElementById("id_bimer");

  if (!email) {
    status.textContent = "Preencha o e-mail antes de buscar.";
    status.className = "text-xs mt-1 pl-2 text-amber-500 dark:text-amber-400";
    status.classList.remove("hidden");
    return;
  }

  // Estado: carregando
  const txtOriginal = btn.innerHTML;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
  btn.disabled = true;
  status.textContent = "Buscando na API Bimer...";
  status.className = "text-xs mt-1 pl-2 text-zinc-400 dark:text-zinc-500";
  status.classList.remove("hidden");

  try {
    const res = await fetch(`/api/bimer/buscar-usuario?email=${encodeURIComponent(email)}`);
    const data = await res.json();

    if (!res.ok) {
      status.textContent = data.erro || "Erro ao buscar usuário.";
      status.className = "text-xs mt-1 pl-2 text-red-500 dark:text-red-400";
      return;
    }

    // Preenche o campo e mostra sucesso
    campo.value = data.identificador;
    status.textContent = `✓ Encontrado: ${data.nome} (${data.nomeLogin})`;
    status.className = "text-xs mt-1 pl-2 text-emerald-600 dark:text-emerald-400 font-medium";

    // Destaca brevemente o campo
    campo.classList.add("ring-2", "ring-emerald-500");
    setTimeout(() => campo.classList.remove("ring-2", "ring-emerald-500"), 2000);
  } catch (err) {
    status.textContent = "Erro de conexão ao buscar na API Bimer.";
    status.className = "text-xs mt-1 pl-2 text-red-500 dark:text-red-400";
  } finally {
    btn.innerHTML = txtOriginal;
    btn.disabled = false;
  }
};

window.resetarSenha = async function () {
  if (!usuarioIdEmEdicao) return;
  const nome = document.getElementById("nome").value;
  const confirmou = await showConfirm(
    `Tem certeza que deseja resetar a senha de <strong>"${nome}"</strong>?<br><br>A senha será redefinida para o padrão <strong>(123456)</strong> e o usuário precisará criar uma nova senha no próximo login.`,
    "Resetar Senha",
    "amber"
  );
  if (!confirmou) return;
  try {
    const res = await fetch(`/api/usuarios/${usuarioIdEmEdicao}/resetar-senha`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    if (res.ok) {
      showToast(`Senha de "${nome}" resetada com sucesso! No próximo login, será solicitada a criação de uma nova senha.`, "success", 5000);
    } else {
      const err = await res.json();
      showToast(err.erro || 'Erro ao resetar senha.', 'error');
    }
  } catch (e) {
    showToast('Erro de conexão ao resetar senha.', 'error');
  }
};
