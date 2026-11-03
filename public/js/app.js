let usuarioLogado = JSON.parse(localStorage.getItem("usuarioLogado"));
const auth =
  typeof SecurityManager !== "undefined"
    ? new SecurityManager(usuarioLogado)
    : null;
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
  // Na página de login: limpar estado antigo e não fazer nada.
  // O formulário inline do login.html cuida de tudo.
  if (window.location.pathname.includes("/login")) {
    localStorage.removeItem("usuarioLogado");
    usuarioLogado = null;
    return;
  }

  if (!usuarioLogado) {
    window.location.href = "/login";
    return;
  }
  const headerHtml = await fetch("/components/header.html").then((r) =>
    r.text(),
  );
  document.getElementById("header-container").innerHTML = headerHtml;
  if (typeof applySidebarState === "function") applySidebarState();
  const modaisHtml = await fetch("/components/modais.html").then((r) =>
    r.text(),
  );
  document.getElementById("modais-container").innerHTML = modaisHtml;
  const footerHtml = await fetch("/components/footer.html").then((r) =>
    r.text(),
  );
  document.getElementById("footer-container").innerHTML = footerHtml;
  setupGlobal();
  if (window.location.pathname.includes("/atendimentos")) {
    setTimeout(initAtendimentos, 300);
  } else if (window.location.pathname.includes("/alinhamentos")) {
    inicializarAlinhamentos();
  } else if (window.location.pathname.includes("/bimer")) {
    setTimeout(initBimer, 300);
  } else {
    initEscalas();
  }
});
function setupGlobal() {
  document.getElementById("saudacao").textContent =
    `Olá, ${usuarioLogado.nome}`;
  if (usuarioLogado.tipo_perfil === "ADMIN") {
    const btnGerenciar = document.getElementById("aba-configuracoes");
    if (btnGerenciar) {
      btnGerenciar.classList.remove("hidden");
    }
    const abaAlinhamentos = document.getElementById("aba-alinhamentos");
    if (abaAlinhamentos) {
      abaAlinhamentos.classList.remove("hidden");
    }
    const abaBimer = document.getElementById("aba-bimer");
    if (abaBimer) {
      abaBimer.classList.remove("hidden");
    }
    const abaCrm = document.getElementById("aba-crm");
    if (abaCrm) {
      abaCrm.classList.remove("hidden");
    }
    const boxGerador = document.getElementById("box-gerador-admin");
    if (boxGerador) boxGerador.classList.remove("hidden");
  } else {
    // Check if Retaguarda for aba-alinhamentos
    fetch("/api/setores")
      .then((r) => r.json())
      .then((setores) => {
        const setorUser = setores.find((s) => s.id === usuarioLogado.setor_id);
        if (setorUser && setorUser.nome.toLowerCase().includes("retaguarda")) {
          const abaAlinhamentos = document.getElementById("aba-alinhamentos");
          if (abaAlinhamentos) abaAlinhamentos.classList.remove("hidden");
        }
      })
      .catch(() => {});

    const barraFiltros = document.getElementById("barra-filtros");
    if (barraFiltros) barraFiltros.remove();
    const boxSetor = document.getElementById("box-setor");
    if (boxSetor) boxSetor.remove();
    const btnConfig = document.getElementById("aba-configuracoes");
    if (btnConfig) btnConfig.remove();
    const abaBimerRm = document.getElementById("aba-bimer");
    if (abaBimerRm) abaBimerRm.remove();
    const abaCrmRm = document.getElementById("aba-crm");
    if (abaCrmRm) abaCrmRm.remove();
  }
  const abaAtend = document.getElementById("aba-atendimentos");
  const abaEscala = document.getElementById("aba-escalas");
  if (window.location.pathname.includes("/atendimentos") && abaAtend) {
    abaAtend.classList.add(
      "bg-zinc-100",
      "dark:bg-zinc-800",
      "text-emerald-600",
      "dark:text-emerald-400",
    );
    const indAtend = abaAtend.querySelector(".sidebar-indicator");
    if (indAtend) indAtend.classList.remove("hidden");
  } else if (
    window.location.pathname.includes("/configuracoes") &&
    document.getElementById("aba-configuracoes")
  ) {
    const abaConf = document.getElementById("aba-configuracoes");
    abaConf.classList.add(
      "bg-zinc-100",
      "dark:bg-zinc-800",
      "text-emerald-600",
      "dark:text-emerald-400",
    );
    const indConf = abaConf.querySelector(".sidebar-indicator");
    if (indConf) indConf.classList.remove("hidden");
  } else if (
    window.location.pathname.includes("/alinhamentos") &&
    document.getElementById("aba-alinhamentos")
  ) {
    const abaAlin = document.getElementById("aba-alinhamentos");
    abaAlin.classList.add(
      "bg-zinc-100",
      "dark:bg-zinc-800",
      "text-emerald-600",
      "dark:text-emerald-400",
    );
    const indAlin = abaAlin.querySelector(".sidebar-indicator");
    if (indAlin) indAlin.classList.remove("hidden");
  } else if (
    window.location.pathname.includes("/bimer") &&
    document.getElementById("aba-bimer")
  ) {
    const abaBim = document.getElementById("aba-bimer");
    abaBim.classList.add(
      "bg-zinc-100",
      "dark:bg-zinc-800",
      "text-emerald-600",
      "dark:text-emerald-400",
    );
    const indBim = abaBim.querySelector(".sidebar-indicator");
    if (indBim) indBim.classList.remove("hidden");
  } else if (
    abaEscala &&
    !window.location.pathname.includes("/configuracoes") &&
    !window.location.pathname.includes("/alinhamentos") &&
    !window.location.pathname.includes("/bimer")
  ) {
    abaEscala.classList.add(
      "bg-zinc-100",
      "dark:bg-zinc-800",
      "text-emerald-600",
      "dark:text-emerald-400",
    );
    const indEscala = abaEscala.querySelector(".sidebar-indicator");
    if (indEscala) indEscala.classList.remove("hidden");
  }
  const btnDarkMode = document.getElementById("btnDarkMode");
  if (localStorage.getItem("tema") === "dark")
    document.documentElement.classList.add("dark");
  if (btnDarkMode) {
    btnDarkMode.onclick = () => {
      document.documentElement.classList.toggle("dark");
      localStorage.setItem(
        "tema",
        document.documentElement.classList.contains("dark") ? "dark" : "light",
      );
    };
  }
  const formCadastro = document.getElementById("formCadastro");
  if (formCadastro && typeof salvarUsuario !== "undefined")
    formCadastro.onsubmit = salvarUsuario;
  const formEdicaoEscala = document.getElementById("formEdicaoEscala");
  if (formEdicaoEscala) formEdicaoEscala.onsubmit = salvarEdicaoEscala;
  const formInclusaoEscala = document.getElementById("formInclusaoEscala");
  if (formInclusaoEscala) formInclusaoEscala.onsubmit = salvarInclusaoEscala;
  const formObsDia = document.getElementById("formObsDia");
  if (formObsDia) formObsDia.onsubmit = salvarAviso;
  const btnExcluirObs = document.getElementById("btnExcluirObs");
  if (btnExcluirObs) btnExcluirObs.onclick = excluirAviso;
  const selectTipoPerfil = document.getElementById("tipo_perfil");
  if (selectTipoPerfil) {
    selectTipoPerfil.onchange = (e) => {
      document
        .getElementById("camposAnalista")
        .classList.toggle("hidden", e.target.value === "ADMIN");
    };
  }
  const selectSetorAviso = document.getElementById("setor_do_aviso_novo");
  if (selectSetorAviso) {
    selectSetorAviso.addEventListener("change", (e) => {
      preencherUsuariosAviso(e.target.value);
    });
  }
}
// Retorna primeiro + segundo nome (para distinguir analistas com mesmo primeiro nome)
function doisNomes(nomeCompleto) {
  if (!nomeCompleto) return "";
  const partes = nomeCompleto.trim().split(/\s+/);
  return partes.length >= 2 ? `${partes[0]} ${partes[1]}` : partes[0];
}
window.atualizarTextoParticipantes = function () {
  const checkboxes = document.querySelectorAll(".cb-participante:checked");
  const span = document.getElementById("participantes_selecionados_texto");
  if (!span) return;
  if (checkboxes.length === 0) {
    span.textContent = "Nenhum";
    span.classList.add("text-gray-500");
    span.classList.remove("text-gray-800", "dark:text-white", "font-bold");
  } else if (checkboxes.length === 1) {
    span.textContent = checkboxes[0].dataset.nome;
    span.classList.remove("text-gray-500");
    span.classList.add("text-gray-800", "dark:text-white", "font-bold");
  } else {
    span.textContent = `${checkboxes.length} selecionados`;
    span.classList.remove("text-gray-500");
    span.classList.add("text-gray-800", "dark:text-white", "font-bold");
  }
};
async function preencherUsuariosAviso(
  setorId,
  usuarioSelecionadoId = "",
  participantesIds = [],
) {
  const select = document.getElementById("usuario_do_aviso_novo");
  const listaPart = document.getElementById("dropdown_participantes_lista");
  if (select) select.innerHTML = '<option value="">Nenhum (Geral)</option>';
  if (listaPart) listaPart.innerHTML = "";
  try {
    const res = await fetch("/api/usuarios/ativos");
    const usuarios = await res.json();
    usuarios
      .filter((u) => u.setor_id == setorId)
      .forEach((u) => {
        if (select)
          select.innerHTML += `<option value="${u.id}" ${u.id == usuarioSelecionadoId ? "selected" : ""}>${u.nome}</option>`;
        if (listaPart) {
          const isChecked = participantesIds.includes(u.id) ? "checked" : "";
          listaPart.innerHTML += `<label class="flex items-center gap-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 p-1.5 rounded-full transition"><input type="checkbox" value="${u.id}" data-nome="${u.nome}" class="cb-participante w-3.5 h-3.5 text-blue-600 rounded-full dark:bg-gray-800 border-gray-300 dark:border-gray-500" onchange="atualizarTextoParticipantes()" ${isChecked}> <span class="dark:text-gray-200 truncate font-medium">${u.nome}</span></label>`;
        }
      });
    atualizarTextoParticipantes();
  } catch (e) {}
}
async function initEscalas() {
  const res = await fetch("/api/setores");
  const setores = await res.json();
  const f = document.getElementById("filtro-setor");
  const c = document.getElementById("setor_id_cadastro");
  const o = document.getElementById("setor_do_aviso_novo");
  if (f)
    f.innerHTML =
      usuarioLogado.tipo_perfil === "ADMIN"
        ? '<option value="todos">Todos os Setores</option>'
        : "";
  if (c) c.innerHTML = "";
  if (o) o.innerHTML = "";
  setores.forEach((s) => {
    const opt = `<option value="${s.id}">${s.nome}</option>`;
    if (
      usuarioLogado.tipo_perfil === "ADMIN" ||
      s.id == usuarioLogado.setor_id
    ) {
      if (f) f.innerHTML += opt;
      if (o) o.innerHTML += opt;
    }
    if (c) c.innerHTML += opt;
  });
  if (f && f.options.length > 1 && f.options[0].value === "todos") {
    f.value = f.options[1].value;
  }
  const inputDataInicio = document.getElementById("data_inicio_geracao");
  if (inputDataInicio)
    inputDataInicio.value = new Date().toISOString().split("T")[0];
  const calendarEl = document.getElementById("calendar");
  if (!calendarEl) return;
  calendar = new FullCalendar.Calendar(calendarEl, {
    initialView: "dayGridMonth",
    locale: "pt-br",
    weekends: false,
    headerToolbar: {
      left: "prev,next",
      center: "title",
      right: "dayGridMonth,timeGridWeek",
    },
    eventOrder: "ordem_exibicao",
    dateClick: async function (info) {
      if (usuarioLogado.tipo_perfil === "ADMIN") {
        // Admin vê modal de escolha
        const [ano, mes, dia] = info.dateStr.split("-");
        document.getElementById("escolha_acao_data_label").textContent =
          `Data selecionada: ${dia}/${mes}/${ano}`;
        // Guarda a data e setor para uso posterior
        window._escolhaDataStr = info.dateStr;
        const elSetor = document.getElementById("filtro-setor");
        window._escolhaSetorId =
          elSetor && elSetor.value !== "todos"
            ? elSetor.value
            : (document.getElementById("setor_do_aviso_novo")?.options[0]?.value || "");
        document.getElementById("modalEscolhaAcaoData").classList.remove("hidden");
      } else {
        // Analista abre aviso diretamente
        document.getElementById("formObsDia").reset();
        document.getElementById("id_do_aviso_novo").value = "";
        document.getElementById("data_do_aviso_novo").value = info.dateStr;
        document.getElementById("hora_do_aviso_novo").value = "";
        document.getElementById("usuario_do_aviso_novo").value = "";
        const [ano, mes, dia] = info.dateStr.split("-");
        document.getElementById("tituloModalObs").textContent =
          `Novo Aviso: ${dia}/${mes}/${ano}`;
        const sf = usuarioLogado.setor_id;
        document.getElementById("setor_do_aviso_novo").disabled = true;
        document.getElementById("setor_do_aviso_novo").value = sf;
        await preencherUsuariosAviso(sf);
        document.getElementById("btnExcluirObs").classList.add("hidden");
        document.getElementById("modalObsDia").classList.remove("hidden");
      }
    },
    events: async (info, success, failure) => {
      const elSetor = document.getElementById("filtro-setor");
      const sid =
        elSetor && elSetor.value ? elSetor.value : usuarioLogado.setor_id;
      let todosEventos = [];
      try {
        const resEscala = await fetch(`/api/escala?setor_id=${sid}`);
        if (resEscala.ok) {
          todosEventos = todosEventos.concat(
            (await resEscala.json()).map((d) => {
              let tituloExt = d.dia_inteiro
                ? "(Dia Inteiro)"
                : d.hora_inicio
                  ? `(${d.hora_inicio.substring(0, 5)} as ${d.hora_fim.substring(0, 5)})`
                  : "";

              let ord = 4;
              let f_low = d.funcao ? d.funcao.toLowerCase() : "";
              if (f_low.includes("chat")) ord = 1;
              else if (f_low.includes("rev almoço") || f_low.includes("rev. almoço") || f_low.includes("revalmoço")) ord = 2;
              else if (f_low.includes("filtro")) ord = 3;

              let color = "#9ca3af";
              if (f_low.includes("chat")) color = "#3b82f6";
              else if (f_low.includes("filtro")) color = "#10b981"; // emerald-500
              else if (f_low.includes("treinamento")) color = "#8b5cf6"; // violet-500
              else if (f_low.includes("rev almoço") || f_low.includes("rev. almoço") || f_low.includes("revalmoço")) color = "#f59e0b"; // amber-500
              else if (f_low.includes("visita externa")) color = "#0ea5e9"; // sky-500
              else if (f_low.includes("férias") || f_low.includes("ferias")) color = "#ec4899"; // pink-500
              else if (f_low.includes("licença") || f_low.includes("licenca")) color = "#f43f5e"; // rose-500
              else if (f_low.includes("falta")) color = "#dc2626"; // red-600
              else if (f_low.includes("folga")) color = "#64748b"; // slate-500
              else if (f_low.includes("processo seletivo")) color = "#7c3aed"; // violet-700

              return {
                id: `esc_${d.id}`,
                title:
                  `${d.funcao}: ${d.nome} ${tituloExt}` +
                  (d.observacao ? ` (Obs)` : ""),
                start: d.data,
                color: color,
                ordem_exibicao: ord,
                classNames: d.editado_manualmente ? ["evento-editado"] : [],
                extendedProps: {
                  tipo: "escala",
                  id_real: d.id,
                  usuario_id: d.usuario_id,
                  observacao: d.observacao || "",
                  funcao: d.funcao,
                  setor_id: d.setor_id,
                  dia_inteiro: d.dia_inteiro,
                  hora_inicio: d.hora_inicio,
                  hora_fim: d.hora_fim,
                },
              };
            }),
          );
        }
        const chkApenasEscala = document.getElementById("chk-apenas-escala");
        if (!chkApenasEscala || !chkApenasEscala.checked) {
          const resObs = await fetch(`/api/observacoes?setor_id=${sid}`);
          if (resObs.ok) {
            todosEventos = todosEventos.concat(
              (await resObs.json()).map((o) => {
                let t = o.assunto || o.observacao;
                if (o.nome) t = `${o.nome}: ${t}`;
                if (o.hora) {
                  t = `[${o.hora.substring(0, 5)}] ⚠️ ${t}`;
                } else {
                  t = `⚠️ ${t}`;
                }

                let ordObs = 100000;
                if (o.hora) {
                   const partes = o.hora.split(":");
                   if (partes.length >= 2) {
                      ordObs += (parseInt(partes[0], 10) * 60) + parseInt(partes[1], 10);
                   }
                }

                return {
                  id: `obs_${o.id}`,
                  title: t,
                  start: o.data,
                  color: "#ef4444",
                  ordem_exibicao: ordObs,
                  classNames: ["evento-aviso"],
                  extendedProps: {
                    tipo: "observacao_dia",
                    id_real: o.id,
                    observacao: o.observacao,
                    setor_id: o.setor_id,
                    data: o.data,
                    usuario_id: o.usuario_id,
                    hora: o.hora ? o.hora.substring(0, 5) : "",
                    nome_analista: o.nome || "",
                    crm: o.crm || "",
                    numero_atendimento: o.numero_atendimento || "",
                    assunto: o.assunto || "",
                    numero_contato: o.numero_contato || "",
                    cliente_responsavel: o.cliente_responsavel || "",
                    analista_contato: o.analista_contato || "",
                    participantes: o.participantes || [],
                  },
                };
              }),
            );
          }
        }
        success(todosEventos);
      } catch (e) {
        failure(e);
      }
    },
    eventClick: async function (info) {
      const ev = info.event;
      if (ev.extendedProps.tipo === "observacao_dia") {
        const ep = ev.extendedProps;
        document.getElementById("id_do_aviso_novo").value = ep.id_real;
        document.getElementById("data_do_aviso_novo").value = ep.data;
        if (usuarioLogado.tipo_perfil !== "ADMIN") {
          document.getElementById("setor_do_aviso_novo").value =
            usuarioLogado.setor_id;
          document.getElementById("setor_do_aviso_novo").disabled = true;
        } else {
          document.getElementById("setor_do_aviso_novo").value = ep.setor_id;
          document.getElementById("setor_do_aviso_novo").disabled = false;
        }
        document.getElementById("texto_do_aviso_novo").value = ep.observacao;
        document.getElementById("hora_do_aviso_novo").value = ep.hora || "";
        document.getElementById("aviso_crm").value = ep.crm || "";
        document.getElementById("aviso_numero_atendimento").value =
          ep.numero_atendimento || "";
        document.getElementById("aviso_assunto").value = ep.assunto || "";
        document.getElementById("aviso_numero_contato").value =
          ep.numero_contato || "";
        document.getElementById("aviso_cliente_responsavel").value =
          ep.cliente_responsavel || "";
        document.getElementById("aviso_analista_contato").value =
          ep.analista_contato || "";
        await preencherUsuariosAviso(
          ep.setor_id,
          ep.usuario_id,
          ep.participantes,
        );
        const [a, m, d] = ep.data.split("-");
        document.getElementById("tituloModalObs").textContent =
          `Editar Aviso: ${d}/${m}/${a}`;
        document.getElementById("btnExcluirObs").classList.remove("hidden");
        document.getElementById("modalObsDia").classList.remove("hidden");
        return;
      }
      if (usuarioLogado.tipo_perfil !== "ADMIN") return;
      try {
        const resU = await fetch("/api/usuarios/ativos");
        const an = (await resU.json()).filter(
          (u) =>
            u.setor_id == ev.extendedProps.setor_id &&
            u.tipo_perfil === "ANALISTA",
        );
        const sel = document.getElementById("edit_usuario_id");
        sel.innerHTML = "";
        an.forEach((u) => {
          sel.innerHTML += `<option value="${u.id}">${u.nome}</option>`;
        });
        document.getElementById("edit_escala_id").value =
          ev.extendedProps.id_real;
        document.getElementById("edit_setor_id").value =
          ev.extendedProps.setor_id;
        document.getElementById("edit_usuario_id").value =
          ev.extendedProps.usuario_id;
        document.getElementById("edit_observacao").value =
          ev.extendedProps.observacao;
        document.getElementById("edit_funcao").value =
          ev.extendedProps.funcao || "Chat";
        document.getElementById("edit_data_inicio").value =
          ev.startStr.split("T")[0];
        document.getElementById("edit_data_fim").value =
          ev.startStr.split("T")[0];
        document.querySelector(
          "input[name='edit_tipo_alteracao'][value='dia']",
        ).checked = true;
        document
          .getElementById("container_edit_periodo")
          .classList.add("hidden");

        document.getElementById("edit_dia_inteiro").checked =
          ev.extendedProps.dia_inteiro;
        document.getElementById("edit_hora_inicio").value =
          ev.extendedProps.hora_inicio || "";
        document.getElementById("edit_hora_fim").value =
          ev.extendedProps.hora_fim || "";
        document
          .getElementById("container_edit_horarios")
          .classList.toggle("hidden", ev.extendedProps.dia_inteiro);
        document.getElementById("modalEdicaoEscala").classList.remove("hidden");
      } catch (e) {
        alert("Erro ao carregar analistas.");
      }
    },
  });
  calendar.render();
  const filtroSetor = document.getElementById("filtro-setor");
  if (filtroSetor) filtroSetor.onchange = () => calendar.refetchEvents();
  const btnGerar = document.getElementById("btnGerarEscala");
  if (btnGerar) {
    btnGerar.onclick = async () => {
      const sid = document.getElementById("filtro-setor").value;
      if (sid === "todos") return alert("Selecione um setor.");
      const dt = document.getElementById("data_inicio_geracao").value;
      if (!dt) return alert("Selecione a data inicial.");
      const btn = document.getElementById("btnGerarEscala");
      const txt = btn.innerText;
      btn.innerText = "Gerando...";
      btn.disabled = true;
      try {
        const res = await fetch("/api/escala/gerar", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            setor_id: sid,
            data_inicio: dt,
            tipo_periodo: document.getElementById("tipo-escala").value,
          }),
        });
        if (res.ok) {
          alert("Sucesso!");
          calendar.refetchEvents();
        } else {
          alert("Erro.");
        }
      } catch (e) {
        alert("Erro de conexão.");
      } finally {
        btn.innerText = txt;
        btn.disabled = false;
      }
    };
  }
}
async function salvarEdicaoEscala(e) {
  e.preventDefault();

  const tipoAlteracao = document.querySelector(
    "input[name='edit_tipo_alteracao']:checked",
  ).value;

  const body = {
    usuario_id: document.getElementById("edit_usuario_id").value,
    observacao: document.getElementById("edit_observacao").value,
    dia_inteiro: document.getElementById("edit_dia_inteiro").checked,
    hora_inicio: document.getElementById("edit_hora_inicio").value,
    hora_fim: document.getElementById("edit_hora_fim").value,
    funcao: document.getElementById("edit_funcao").value,
  };

  let endpoint = `/api/escala/${document.getElementById("edit_escala_id").value}`;

  if (tipoAlteracao === "periodo") {
    endpoint = `/api/escala/periodo`;
    body.setor_id = document.getElementById("edit_setor_id").value;
    body.data_inicio = document.getElementById("edit_data_inicio").value;
    body.data_fim = document.getElementById("edit_data_fim").value;

    if (!body.data_inicio || !body.data_fim) {
      return alert("Preencha a data de início e fim.");
    }
  }

  const res = await fetch(endpoint, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (res.ok) {
    document.getElementById("modalEdicaoEscala").classList.add("hidden");
    calendar.refetchEvents();
  } else {
    alert("Erro ao salvar escala.");
  }
}

// Função para excluir escala
async function excluirEscala() {
  const escalaId = document.getElementById("edit_escala_id").value;
  
  if (!escalaId) {
    alert("Erro: ID da escala não encontrado.");
    return;
  }

  const confirmacao = confirm("Tem certeza que deseja excluir esta escala?\n\nEsta ação não pode ser desfeita.");
  
  if (!confirmacao) {
    return;
  }

  try {
    const res = await fetch(`/api/escala/${escalaId}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
    });

    if (res.ok) {
      document.getElementById("modalEdicaoEscala").classList.add("hidden");
      calendar.refetchEvents();
      alert("Escala excluída com sucesso.");
    } else {
      const errorData = await res.json();
      alert(`Erro ao excluir escala: ${errorData.erro || 'Erro desconhecido'}`);
    }
  } catch (erro) {
    console.error("Erro ao excluir escala:", erro);
    alert("Erro ao excluir escala. Verifique sua conexão.");
  }
}

// Chamada pelo modal de escolha quando admin clica em uma data
async function escolhaAcaoData(tipo) {
  document.getElementById("modalEscolhaAcaoData").classList.add("hidden");
  if (tipo === "aviso") {
    const dateStr = window._escolhaDataStr;
    const sf = window._escolhaSetorId;
    document.getElementById("formObsDia").reset();
    document.getElementById("id_do_aviso_novo").value = "";
    document.getElementById("data_do_aviso_novo").value = dateStr;
    document.getElementById("hora_do_aviso_novo").value = "";
    document.getElementById("usuario_do_aviso_novo").value = "";
    const [ano, mes, dia] = dateStr.split("-");
    document.getElementById("tituloModalObs").textContent =
      `Novo Aviso: ${dia}/${mes}/${ano}`;
    document.getElementById("setor_do_aviso_novo").value = sf;
    document.getElementById("setor_do_aviso_novo").disabled = false;
    await preencherUsuariosAviso(sf);
    document.getElementById("btnExcluirObs").classList.add("hidden");
    document.getElementById("modalObsDia").classList.remove("hidden");
  } else if (tipo === "escala") {
    await abrirModalInclusaoEscala(window._escolhaDataStr, window._escolhaSetorId);
  }
}

async function abrirModalInclusaoEscala(dateStr, setorId) {
  try {
    const resU = await fetch("/api/usuarios/ativos");
    const usuarios = await resU.json();
    const analistas = usuarios.filter(
      (u) => u.setor_id == setorId && u.tipo_perfil === "ANALISTA"
    );
    const sel = document.getElementById("inclusao_usuario_id");
    sel.innerHTML = "";
    analistas.forEach((u) => {
      sel.innerHTML += `<option value="${u.id}">${u.nome}</option>`;
    });
    const [ano, mes, dia] = dateStr.split("-");
    document.getElementById("inclusao_escala_titulo_data").textContent =
      `Data selecionada: ${dia}/${mes}/${ano}`;
    document.getElementById("inclusao_setor_id").value = setorId;
    document.getElementById("inclusao_data").value = dateStr;
    document.getElementById("inclusao_data_inicio").value = dateStr;
    document.getElementById("inclusao_data_fim").value = dateStr;
    document.getElementById("inclusao_funcao").value = "Chat";
    document.getElementById("inclusao_observacao").value = "";
    document.getElementById("inclusao_dia_inteiro").checked = true;
    document.getElementById("container_inclusao_horarios").classList.add("hidden");
    document.getElementById("modalInclusaoEscala").classList.remove("hidden");
  } catch (e) {
    alert("Erro ao carregar analistas.");
  }
}

async function salvarInclusaoEscala(e) {
  e.preventDefault();
  const usuarioId = document.getElementById("inclusao_usuario_id").value;
  const setorId = document.getElementById("inclusao_setor_id").value;
  const dataInicio = document.getElementById("inclusao_data_inicio").value;
  const dataFim = document.getElementById("inclusao_data_fim").value;
  const funcao = document.getElementById("inclusao_funcao").value;
  const observacao = document.getElementById("inclusao_observacao").value;
  const diaInteiro = document.getElementById("inclusao_dia_inteiro").checked;
  const horaInicio = document.getElementById("inclusao_hora_inicio").value;
  const horaFim = document.getElementById("inclusao_hora_fim").value;

  if (!dataInicio || !dataFim) return alert("Preencha as datas de início e fim.");
  if (dataFim < dataInicio) return alert("A data fim não pode ser anterior à data início.");

  const btn = e.target.querySelector("[type=submit]");
  const txtOrig = btn.innerHTML;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i>Salvando...';
  btn.disabled = true;

  try {
    let current = new Date(`${dataInicio}T12:00:00Z`);
    const end = new Date(`${dataFim}T12:00:00Z`);
    let erros = 0;
    let inseridos = 0;
    while (current <= end) {
      const dow = current.getUTCDay();
      if (dow !== 0 && dow !== 6) {
        const dataStr = current.toISOString().split("T")[0];
        const res = await fetch("/api/escala/inserir", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            usuario_id: usuarioId,
            setor_id: setorId,
            data: dataStr,
            funcao,
            observacao: observacao || null,
            dia_inteiro: diaInteiro,
            hora_inicio: diaInteiro ? null : (horaInicio || null),
            hora_fim: diaInteiro ? null : (horaFim || null),
          }),
        });
        if (res.ok) inseridos++;
        else erros++;
      }
      current.setUTCDate(current.getUTCDate() + 1);
    }
    document.getElementById("modalInclusaoEscala").classList.add("hidden");
    calendar.refetchEvents();
    if (erros > 0) {
      alert(`Concluído com ${inseridos} inserção(ões) e ${erros} erro(s).`);
    }
  } catch (err) {
    alert("Erro ao incluir escala: " + err.message);
  } finally {
    btn.innerHTML = txtOrig;
    btn.disabled = false;
  }
}

async function salvarAviso(e) {
  e.preventDefault();
  const uv = document.getElementById("usuario_do_aviso_novo").value;
  const hv = document.getElementById("hora_do_aviso_novo").value;
  const cbPart = document.querySelectorAll(".cb-participante:checked");
  const participantesIds = Array.from(cbPart).map((cb) => parseInt(cb.value));
  const body = {
    id: document.getElementById("id_do_aviso_novo").value || null,
    data: document.getElementById("data_do_aviso_novo").value,
    setor_id: parseInt(document.getElementById("setor_do_aviso_novo").value),
    observacao: document.getElementById("texto_do_aviso_novo").value,
    usuario_id: uv ? parseInt(uv) : null,
    hora: hv ? hv : null,
    crm: document.getElementById("aviso_crm").value || null,
    numero_atendimento:
      document.getElementById("aviso_numero_atendimento").value || null,
    assunto: document.getElementById("aviso_assunto").value || null,
    numero_contato:
      document.getElementById("aviso_numero_contato").value || null,
    cliente_responsavel:
      document.getElementById("aviso_cliente_responsavel").value || null,
    analista_contato:
      document.getElementById("aviso_analista_contato").value || null,
    criado_por: usuarioLogado.id,
    participantes: participantesIds,
  };
  const res = await fetch("/api/observacoes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (res.ok) {
    document.getElementById("modalObsDia").classList.add("hidden");
    calendar.refetchEvents();
  } else {
    alert("Erro ao salvar aviso.");
  }
}
async function excluirAviso() {
  if (!confirm("Excluir aviso?")) return;
  const res = await fetch(
    `/api/observacoes/${document.getElementById("id_do_aviso_novo").value}`,
    { method: "DELETE" },
  );
  if (res.ok) {
    document.getElementById("modalObsDia").classList.add("hidden");
    calendar.refetchEvents();
  } else {
    alert("Erro.");
  }
}
async function initAtendimentos() {
  if (usuarioLogado.tipo_perfil === "ADMIN") {
    const abas = document.getElementById("abas-admin");
    if (abas) abas.classList.remove("hidden");
    const btnPri = document.getElementById("btnNovaPrioridade");
    if (btnPri) btnPri.classList.remove("hidden");
    const btnNovo = document.getElementById("btnNovoAtendimento");
    if (btnNovo) btnNovo.classList.add("hidden");
  } else {
    const btnPri = document.getElementById("btnNovaPrioridade");
    if (btnPri) btnPri.remove();
    const abasAdmin = document.getElementById("abas-admin");
    if (abasAdmin) {
      abasAdmin.classList.remove("hidden");
      const tabRelatorios = document.getElementById("tab-relatorios");
      if (tabRelatorios) tabRelatorios.classList.add("hidden");
      const tabDashboard = document.getElementById("tab-dashboard");
      if (tabDashboard) tabDashboard.classList.add("hidden");
    }
  }
  try {
    const resS = await fetch("/api/setores");
    const setores = await resS.json();
    const f = document.getElementById("filtro-setor");
    const priSetor = document.getElementById("pri_setor");
    if (priSetor) priSetor.innerHTML = "";
    if (f)
      f.innerHTML =
        usuarioLogado.tipo_perfil === "ADMIN"
          ? '<option value="todos">Todos os Setores</option>'
          : "";
    if (Array.isArray(setores)) {
      setores.forEach((s) => {
        if (
          usuarioLogado.tipo_perfil === "ADMIN" ||
          s.id == usuarioLogado.setor_id
        ) {
          if (f) f.innerHTML += `<option value="${s.id}">${s.nome}</option>`;
        }
        if (priSetor)
          priSetor.innerHTML += `<option value="${s.id}">${s.nome}</option>`;
      });
    }
    if (f && f.options.length > 1 && f.options[0].value === "todos") {
      f.value = f.options[1].value;
    }
    if (f) f.addEventListener("change", carregarPainelE_Fila);
  } catch (erro) {
    console.error(erro);
  }
  await carregarTiposDeAtendimento();
  carregarPainelE_Fila();
  if (painelUpdateInterval) clearInterval(painelUpdateInterval);
  painelUpdateInterval = setInterval(() => {
    const areaKanban = document.getElementById("area-kanban");
    if (areaKanban && !areaKanban.classList.contains("hidden")) {
      carregarPainelE_Fila();
    }
  }, 10000);
}
async function carregarTiposDeAtendimento() {
  try {
    const resT = await fetch("/api/tipos_atendimento");
    if (!resT.ok) throw new Error("Erro");
    const tipos = await resT.json();
    const comboFiltro = document.getElementById("filtro-tipo");
    const comboModal = document.getElementById("tipo_atend");
    const comboPri = document.getElementById("pri_tipo");
    let opcoesHtml = "";
    if (Array.isArray(tipos) && tipos.length > 0) {
      tipos.forEach((t) => {
        opcoesHtml += `<option value="${t.id}">${t.nome}</option>`;
      });
    } else {
      opcoesHtml = '<option value="">(Tabela vazia)</option>';
    }
    if (comboFiltro)
      comboFiltro.innerHTML = '<option value="">Todos</option>' + opcoesHtml;
    if (comboModal) comboModal.innerHTML = opcoesHtml;
    if (comboPri) comboPri.innerHTML = opcoesHtml;
  } catch (erro) {
    console.error(erro);
  }
}
async function carregarPainelE_Fila() {
  await carregarPainelKanban();
  await carregarFilaPrioridades();
}
window.mudarAba = function (aba) {
  const btnKanban = document.getElementById("tab-kanban");
  const btnDashboard = document.getElementById("tab-dashboard");
  const btnRelatorios = document.getElementById("tab-relatorios");
  const btnFinalizados = document.getElementById("tab-finalizados-hoje");
  const btnAtendimentosAbertos = document.getElementById("tab-atendimentos-abertos");
  const areaKanban = document.getElementById("area-kanban");
  const areaDashboard = document.getElementById("area-dashboard");
  const areaRelatorios = document.getElementById("area-relatorios");
  const areaImpressao = document.getElementById("area-impressao");
  const areaFinalizados = document.getElementById("area-finalizados-hoje");
  const areaFiltros = document.getElementById("area-filtros-relatorios");
  [btnKanban, btnDashboard, btnRelatorios, btnFinalizados].forEach((btn) => {
    if (!btn) return;
    btn.classList.remove(
      "bg-zinc-900",
      "dark:bg-white",
      "text-white",
      "dark:text-zinc-900",
    );
    btn.classList.add("text-zinc-500", "dark:text-zinc-400");
  });
  [
    areaKanban,
    areaDashboard,
    areaRelatorios,
    areaImpressao,
    areaFinalizados,
    areaFiltros
  ].forEach((area) => {
    if (area) area.classList.add("hidden");
  });
  if (aba === "kanban") {
    if (btnKanban) {
      btnKanban.classList.add(
        "bg-zinc-900",
        "dark:bg-white",
        "text-white",
        "dark:text-zinc-900",
      );
      btnKanban.classList.remove("text-zinc-500", "dark:text-zinc-400");
    }
    if (areaKanban) areaKanban.classList.remove("hidden");
  } else if (aba === "dashboard") {
    if (btnDashboard) {
      btnDashboard.classList.add(
        "bg-zinc-900",
        "dark:bg-white",
        "text-white",
        "dark:text-zinc-900",
      );
      btnDashboard.classList.remove("text-zinc-500", "dark:text-zinc-400");
    }
    if (areaDashboard) areaDashboard.classList.remove("hidden");
    if (areaFiltros) areaFiltros.classList.remove("hidden");
    if (!window.dadosRelatorio || window.dadosRelatorio.length === 0) {
      if (!document.getElementById("filtro-data-inicio").value) {
        document.getElementById("filtro-data-inicio").value = new Date()
          .toISOString()
          .split("T")[0];
        document.getElementById("filtro-data-fim").value = new Date()
          .toISOString()
          .split("T")[0];
      }
      if (typeof buscarRelatorios === "function") buscarRelatorios();
    } else {
      atualizarGraficosDashboard();
    }
  } else if (aba === "relatorios") {
    if (btnRelatorios) {
      btnRelatorios.classList.add(
        "bg-zinc-900",
        "dark:bg-white",
        "text-white",
        "dark:text-zinc-900",
      );
      btnRelatorios.classList.remove("text-zinc-500", "dark:text-zinc-400");
    }
    if (areaRelatorios) areaRelatorios.classList.remove("hidden");
    if (areaFiltros) areaFiltros.classList.remove("hidden");
    if (areaImpressao) areaImpressao.classList.remove("hidden");
    if (!document.getElementById("filtro-data-inicio").value) {
      document.getElementById("filtro-data-inicio").value = new Date()
        .toISOString()
        .split("T")[0];
      document.getElementById("filtro-data-fim").value = new Date()
        .toISOString()
        .split("T")[0];
    }
    if (typeof buscarRelatorios === "function") buscarRelatorios();
  } else if (aba === "finalizados") {
    if (btnFinalizados) {
      btnFinalizados.classList.add(
        "bg-zinc-900",
        "dark:bg-white",
        "text-white",
        "dark:text-zinc-900",
      );
      btnFinalizados.classList.remove("text-zinc-500", "dark:text-zinc-400");
    }
    if (areaFinalizados) areaFinalizados.classList.remove("hidden");
    carregarFinalizadosHoje();
  }
};

window.calcularAtrasoBimer = function(dataStr, pessoa) {
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
    
    const p = pessoa ? pessoa.toLowerCase() : '';
    
    if (p.includes('retaguardashop') || p.includes('layoutshop') || p.includes('analisebaseshop')) {
        let diasUteis = 0;
        let curr = new Date(dateProx);
        while (curr < hoje) {
            curr.setDate(curr.getDate() + 1);
            if (curr.getDay() !== 0 && curr.getDay() !== 6) { 
                diasUteis++;
            }
        }
        return diasUteis >= 4;
    } else {
        return dateProx < hoje;
    }
};
window.abrirModalPrioridade = function () {
  const form = document.getElementById("formNovaPrioridade");
  if (form) form.reset();
  document.getElementById("modalNovaPrioridade").classList.remove("hidden");
};
window.salvarPrioridade = async function (e) {
  if (e) e.preventDefault();
  if (usuarioLogado.tipo_perfil !== "ADMIN") return alert("Acesso negado");
  const inputPriId = document.getElementById("pri_id");
  const idAtendimento = inputPriId ? inputPriId.value : "";
  const body = {
    numero_atendimento: document.getElementById("pri_numero").value,
    prioridade: document.getElementById("pri_nivel").value,
    origem: document.getElementById("pri_origem").value,
    tipo_id: document.getElementById("pri_tipo").value,
    setor_id: document.getElementById("pri_setor").value,
  };
  if (!body.numero_atendimento || !body.origem || !body.setor_id)
    return alert("Preencha Ticket, Origem e Setor Destino");
  try {
    let res;
    if (idAtendimento) {
      res = await fetch(`/api/atendimentos/fila/${idAtendimento}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    } else {
      res = await fetch("/api/atendimentos/fila", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    }
    if (res.ok) {
      document.getElementById("modalNovaPrioridade").classList.add("hidden");
      document.getElementById("formNovaPrioridade").reset();
      if (inputPriId) inputPriId.value = "";
      carregarFilaPrioridades();
    } else {
      alert("Erro ao Gravar na Fila.");
    }
  } catch (erro) {
    console.error(erro);
    alert("Erro de Conexão.");
  }
};
async function carregarFilaPrioridades() {
  const f = document.getElementById("filtro-setor");
  const sid = f && f.value ? f.value : usuarioLogado.setor_id;
  if (!sid) return;
  try {
    const res = await fetch(`/api/atendimentos/fila?setor_id=${sid}`);
    filaPendente = await res.json();
    const container = document.getElementById("container-fila");
    const gridFila = document.getElementById("fila-cards");
    if (!gridFila) return;
    gridFila.innerHTML = "";
    if (filaPendente.length === 0) {
      if (container) container.classList.add("hidden");
      return;
    }
    if (container) container.classList.remove("hidden");
    filaPendente.forEach((f) => {
      let corBorda =
        f.prioridade === "Alta"
          ? "border-l-[3px] border-red-500"
          : f.prioridade === "Média"
            ? "border-l-[3px] border-amber-500"
            : "border-l-[3px] border-sky-500";
      let icone =
        f.prioridade === "Alta" ? "🔴" : f.prioridade === "Média" ? "🟡" : "🔵";
      let botoesAcao = "";
      if (usuarioLogado.tipo_perfil !== "ADMIN") {
        botoesAcao = `<button onclick="assumirTicket(${f.id})" class="mt-4 w-full text-emerald-600 dark:text-emerald-400 ring-1 ring-inset ring-emerald-500/30 dark:ring-emerald-500/20 hover:bg-emerald-500/10 dark:hover:bg-emerald-500/10 bg-emerald-500/5 font-medium py-2 rounded-full transition shadow-sm text-sm"><i class="fa-solid fa-hand-pointer mr-2"></i>Assumir</button>`;
      } else {
        botoesAcao = `<div class="mt-4 flex gap-2"><button onclick="editarPrioridade(${f.id})" class="flex-1 text-amber-600 dark:text-amber-400 ring-1 ring-inset ring-amber-500/30 dark:ring-amber-500/20 hover:bg-amber-500/10 dark:hover:bg-amber-500/10 bg-amber-500/5 font-medium py-2 rounded-full transition shadow-sm"><i class="fa-solid fa-pen text-xs"></i></button><button onclick="excluirAtendimento(${f.id})" class="flex-1 text-red-600 dark:text-red-400 ring-1 ring-inset ring-red-500/30 dark:ring-red-500/20 hover:bg-red-500/10 dark:hover:bg-red-500/10 bg-red-500/5 font-medium py-2 rounded-full transition shadow-sm"><i class="fa-solid fa-trash text-xs"></i></button></div>`;
      }
      gridFila.innerHTML += `<div class="bg-white dark:bg-zinc-900 p-4 rounded-2xl ring-1 ring-zinc-900/5 dark:ring-white/10 flex flex-col justify-between ${corBorda}"><div><div class="flex justify-between items-start mb-2"><span class="font-semibold text-lg dark:text-white">#${f.numero_atendimento}</span><span class="text-[10px] font-semibold uppercase px-2 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">${icone} ${f.prioridade}</span></div><p class="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1"><i class="fa-solid fa-tag mr-1"></i>${f.tipo_nome}</p><p class="text-xs text-zinc-500 dark:text-zinc-400 mb-1"><i class="fa-solid fa-bullseye mr-1"></i>Origem: <b class="text-zinc-700 dark:text-zinc-300">${f.origem}</b></p><p class="text-xs text-zinc-500 dark:text-zinc-400"><i class="fa-regular fa-calendar mr-1"></i>Solicitado: ${formatarDataHora(f.data_solicitacao)}</p></div>${botoesAcao}</div>`;
    });
  } catch (e) {
    console.error(e);
  }
}
window.assumirTicket = async function (ticketId) {
  if (usuarioLogado.tipo_perfil === "ADMIN")
    return alert("Apenas Analistas podem assumir atendimentos.");
  if (!confirm("Deseja assumir este ticket e iniciar o atendimento agora?"))
    return;
  try {
    const res = await fetch(`/api/atendimentos/${ticketId}/assumir`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ usuario_id: usuarioLogado.id }),
    });
    if (res.ok) {
      carregarPainelE_Fila();
    } else {
      alert("Erro ao assumir.");
    }
  } catch (e) {
    alert("Erro.");
  }
};
window.abrirModalNovoAtendimento = function () {
  if (usuarioLogado.tipo_perfil === "ADMIN") return alert("Apenas Analistas.");
  const form = document.getElementById("formNovoAtendimento");
  if (form) {
    form.reset();
    form.onsubmit = salvarNovoAtendimento;
  }
  const modal = document.getElementById("modalNovoAtendimento");
  if (modal) modal.classList.remove("hidden");
};
window.fecharModalNovoAtendimento = function () {
  document.getElementById("modalNovoAtendimento").classList.add("hidden");
};
window.salvarNovoAtendimento = async function (e) {
  if (e) e.preventDefault();
  const numAtend = document.getElementById("numero_atend").value;
  const tipoId = document.getElementById("tipo_atend").value;
  const sid = document.getElementById("filtro-setor")
    ? document.getElementById("filtro-setor").value
    : "";
  if (!numAtend || !tipoId) return alert("Preencha Ticket e tipo.");
  const body = {
    numero_atendimento: numAtend,
    tipo_id: tipoId,
    usuario_id: usuarioLogado.id,
    setor_id: sid !== "todos" && sid !== "" ? sid : usuarioLogado.setor_id,
  };
  try {
    const res = await fetch("/api/atendimentos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      window.fecharModalNovoAtendimento();
      carregarPainelE_Fila();
    } else {
      const err = await res.json();
      alert("Erro: " + err.erro);
    }
  } catch (erro) {
    alert("Erro.");
  }
};
async function carregarPainelKanban() {
  const f = document.getElementById("filtro-setor");
  const sid = f && f.value ? f.value : usuarioLogado.setor_id;
  if (!sid) return;
  const resU = await fetch("/api/usuarios/ativos");
  const todosU = await resU.json();
  usuariosSetor = todosU.filter(
    (u) =>
      u.tipo_perfil === "ANALISTA" &&
      (sid === "todos" || u.setor_id == sid),
  );
  const selAnalista = document.getElementById("filtro-analista");
  if (selAnalista) {
    selAnalista.innerHTML = '<option value="">Todos</option>';
    usuariosSetor.forEach(
      (u) =>
        (selAnalista.innerHTML += `<option value="${u.id}">${u.nome}</option>`),
    );
  }
  const resA = await fetch(`/api/atendimentos/ativos?setor_id=${sid}`);
  atendimentosAtivos = await resA.json();
  desenharPainelKanban();
}
function desenharPainelKanban() {
  const container = document.getElementById("painel_usuarios");
  if (!container) return;
  container.innerHTML = "";
  usuariosSetor.forEach((user) => {
    const cardsAtendimento = atendimentosAtivos
      .filter((a) => a.usuario_id == user.id)
      .map((a) => {
        let htmlPausa = "";
        if (a.status === "PAUSADO") {
          htmlPausa = `<div class="mt-2 bg-yellow-100 dark:bg-yellow-900/40 border border-yellow-300 dark:border-yellow-700 text-yellow-800 dark:text-yellow-300 text-xs p-2 rounded-full flex items-center"><i class="fa-solid fa-pause mr-2"></i><b>PAUSADO:</b> &nbsp;${a.motivo_pausa}</div>`;
        }
        let footerCard = "";
        if (usuarioLogado.tipo_perfil === "ADMIN") {
          footerCard = `<div class="mt-3 text-center bg-gray-800 text-white rounded-full font-mono text-lg py-1 timer-calculado shadow-inner ${a.status === "PAUSADO" ? "opacity-50" : ""}" data-inicio="${a.data_inicio}" data-pausa="${a.tempo_em_pausa_ms}" data-inicio-pausa="${a.inicio_ultima_pausa}" data-status="${a.status}">00:00:00</div>`;
        }
        if (
          usuarioLogado.id == user.id ||
          usuarioLogado.tipo_perfil === "ADMIN"
        ) {
          footerCard += `<div class="mt-2 grid grid-cols-3 gap-1">`;
          if (a.status === "PAUSADO") {
            footerCard += `<button onclick="retomarAtendimento(${a.id})" class="text-sky-600 dark:text-sky-400 ring-1 ring-inset ring-sky-500/30 dark:ring-sky-500/20 hover:bg-sky-500/10 dark:hover:bg-sky-500/10 bg-sky-500/5 text-xs font-bold py-2 rounded-full shadow flex justify-center items-center" title="Retomar"><i class="fa-solid fa-play"></i></button>`;
          } else {
            footerCard += `<button onclick="abrirModalPausa(${a.id})" class="text-amber-600 dark:text-amber-400 ring-1 ring-inset ring-amber-500/30 dark:ring-amber-500/20 hover:bg-amber-500/10 dark:hover:bg-amber-500/10 bg-amber-500/5 text-xs font-bold py-2 rounded-full shadow flex justify-center items-center" title="Pausar"><i class="fa-solid fa-pause"></i></button>`;
          }
          footerCard += `
                    <button onclick="abrirModalTransferencia(${a.id})" class="text-sky-600 dark:text-sky-400 ring-1 ring-inset ring-sky-500/30 dark:ring-sky-500/20 hover:bg-sky-500/10 dark:hover:bg-sky-500/10 bg-sky-500/5 py-2 rounded-full shadow flex justify-center items-center" title="Transferir Ticket"><i class="fa-solid fa-right-left"></i></button>
                    <button onclick="finalizarAtendimento(${a.id})" class="bg-green-500 hover:bg-green-600 text-white text-xs font-bold py-2 rounded-full shadow flex justify-center items-center" title="Concluir Atendimento"><i class="fa-solid fa-check"></i></button>
                </div>`;
          footerCard += `<div class="mt-1 grid grid-cols-2 gap-1">
                    <button onclick="abrirModalEditarAtendimento(${a.id}, '${a.numero_atendimento}', ${a.tipo_id})" class="text-zinc-700 dark:text-zinc-300 ring-1 ring-inset ring-zinc-900/10 dark:ring-white/10 hover:bg-zinc-900/5 dark:hover:bg-white/5 bg-zinc-50 dark:bg-zinc-800/50 text-xs font-bold py-1.5 rounded-full shadow flex justify-center items-center gap-1" title="Editar ticket ou tipo"><i class="fa-solid fa-pen text-xs"></i> Editar</button>
                    <button onclick="abrirModalCancelarAtendimento(${a.id}, '${a.numero_atendimento}')" class="text-red-600 dark:text-red-400 ring-1 ring-inset ring-red-500/30 dark:ring-red-500/20 hover:bg-red-500/10 dark:hover:bg-red-500/10 bg-red-500/5 text-xs font-bold py-1.5 rounded-full shadow flex justify-center items-center gap-1" title="Cancelar (aberto por engano)"><i class="fa-solid fa-ban text-xs"></i> Cancelar</button>
                </div>`;
        }
        return `<div class="bg-white dark:bg-zinc-800 p-3 rounded-xl ring-1 ring-zinc-900/5 dark:ring-white/10 relative overflow-hidden"><div class="absolute top-0 left-0 w-1 h-full ${a.status === "PAUSADO" ? "bg-yellow-500" : "bg-blue-500"}"></div><div class="text-xs text-blue-600 dark:text-blue-300 font-bold uppercase mb-1 ml-2"><i class="fa-solid fa-tag mr-1"></i>${a.tipo_nome}</div><div class="font-bold dark:text-white ml-2 text-lg">#${a.numero_atendimento}</div>${htmlPausa}${footerCard}</div>`;
      })
      .join("");
    container.innerHTML += `<div class="bg-white dark:bg-zinc-900 p-4 rounded-2xl ring-1 ring-zinc-900/5 dark:ring-white/10 flex flex-col h-full"><h3 class="font-semibold text-sm dark:text-white text-center mb-4 border-b border-zinc-100 dark:border-zinc-800 pb-3 text-zinc-600 dark:text-zinc-300 uppercase tracking-wider"><i class="fa-solid fa-user-tie mr-2 text-gray-500"></i>${doisNomes(user.nome)}</h3><div class="flex-1 flex flex-col gap-3">${cardsAtendimento || '<div class="text-center text-xs text-zinc-400 dark:text-zinc-500 italic mt-4"><i class="fa-regular fa-clock mr-1"></i>Livre</div>'}</div></div>`;
  });
  clearInterval(timerInterval);
  atualizarCronometros();
  timerInterval = setInterval(atualizarCronometros, 1000);
}
window.finalizarAtendimento = async function (id) {
  if (!confirm("Deseja realmente encerrar este atendimento?")) return;
  const res = await fetch(`/api/atendimentos/${id}/finalizar`, {
    method: "PUT",
  });
  if (res.ok) carregarPainelE_Fila();
};
window.abrirModalEditarAtendimento = async function (
  id,
  numeroAtual,
  tipoAtualId,
) {
  document.getElementById("edit_atend_id").value = id;
  document.getElementById("edit_atend_numero").value = numeroAtual;
  const selectTipo = document.getElementById("edit_atend_tipo");
  try {
    const resT = await fetch("/api/tipos_atendimento");
    const tipos = await resT.json();
    selectTipo.innerHTML = tipos
      .map((t) => `<option value="${t.id}">${t.nome}</option>`)
      .join("");
  } catch (e) {
    selectTipo.innerHTML = '<option value="">Erro ao carregar tipos</option>';
  }
  selectTipo.value = tipoAtualId;
  const form = document.getElementById("formEditarAtendimento");
  form.onsubmit = async (e) => {
    e.preventDefault();
    const body = {
      numero_atendimento: document.getElementById("edit_atend_numero").value,
      tipo_id: document.getElementById("edit_atend_tipo").value,
    };
    try {
      const res = await fetch(`/api/atendimentos/${id}/editar`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        document
          .getElementById("modalEditarAtendimento")
          .classList.add("hidden");
        carregarPainelE_Fila();
      } else {
        const err = await res.json().catch(() => ({}));
        alert(
          "Erro " +
            res.status +
            ": " +
            (err.erro || "Não foi possível salvar."),
        );
      }
    } catch (e) {
      alert("Erro de conexão: " + e.message);
    }
  };
  document.getElementById("modalEditarAtendimento").classList.remove("hidden");
};
window.abrirModalCancelarAtendimento = function (id, numero) {
  document.getElementById("cancelar_atend_id").value = id;
  document.getElementById("cancelar_atend_info").textContent = `#${numero}`;
  document
    .getElementById("modalCancelarAtendimento")
    .classList.remove("hidden");
};
window.confirmarCancelamento = async function () {
  const id = document.getElementById("cancelar_atend_id").value;
  try {
    const res = await fetch(`/api/atendimentos/${id}`, { method: "DELETE" });
    if (res.ok) {
      document
        .getElementById("modalCancelarAtendimento")
        .classList.add("hidden");
      carregarPainelE_Fila();
    } else {
      alert("Erro ao cancelar o atendimento.");
    }
  } catch (e) {
    alert("Erro de conexão.");
  }
};
function calcularTempoUtil(
  dataInicioISO,
  dataFimISO = null,
  tempoPausaMs = 0,
  inicioUltimaPausaISO = null,
  status = "EM_ANDAMENTO",
) {
  if (!dataInicioISO) return 0;
  let start = new Date(
    dataInicioISO + (!dataInicioISO.includes("Z") ? "Z" : ""),
  ).getTime();
  let end;
  if (status === "PAUSADO" && inicioUltimaPausaISO) {
    end = new Date(
      inicioUltimaPausaISO + (!inicioUltimaPausaISO.includes("Z") ? "Z" : ""),
    ).getTime();
  } else if (dataFimISO) {
    end = new Date(
      dataFimISO + (!dataFimISO.includes("Z") ? "Z" : ""),
    ).getTime();
  } else {
    end = new Date().getTime();
  }
  let totalMs = end - start - parseInt(tempoPausaMs || 0);
  return totalMs > 0 ? totalMs : 0;
}
function atualizarCronometros() {
  document.querySelectorAll(".timer-calculado").forEach((t) => {
    t.textContent = msParaTexto(
      calcularTempoUtil(
        t.getAttribute("data-inicio"),
        null,
        t.getAttribute("data-pausa"),
        t.getAttribute("data-inicio-pausa"),
        t.getAttribute("data-status"),
      ),
    );
  });
}
function msParaTexto(diffMs) {
  const horas = Math.floor(diffMs / (1000 * 60 * 60));
  const minutos = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  const segundos = Math.floor((diffMs % (1000 * 60)) / 1000);
  return `${String(horas).padStart(2, "0")}:${String(minutos).padStart(2, "0")}:${String(segundos).padStart(2, "0")}`;
}
function formatarDataHora(dataISO) {
  if (!dataISO) return "--";
  let strData = dataISO;
  if (!strData.includes("Z")) strData += "Z";
  const d = new Date(strData);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")} às ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}
window.buscarRelatorios = async function () {
  const setor_id = document.getElementById("filtro-setor").value;
  const data_inicio = document.getElementById("filtro-data-inicio").value;
  const data_fim = document.getElementById("filtro-data-fim").value;
  const usuario_id = document.getElementById("filtro-analista").value;
  const tipo_id = document.getElementById("filtro-tipo").value;
  let url = `/api/atendimentos/concluidos?setor_id=${setor_id}`;
  if (data_inicio) url += `&data_inicio=${data_inicio}`;
  if (data_fim) url += `&data_fim=${data_fim}`;
  if (usuario_id) url += `&usuario_id=${usuario_id}`;
  if (tipo_id) url += `&tipo_id=${tipo_id}`;
  try {
    const res = await fetch(url);
    dadosRelatorio = await res.json();
    renderizarTabelaRelatorio();
    atualizarGraficos();
  } catch (erro) {
    alert("Falha.");
  }
};
function renderizarTabelaRelatorio() {
  const corpo = document.getElementById("corpo-tabela-relatorio");
  corpo.innerHTML = "";
  let somaMs = 0;
  if (!Array.isArray(dadosRelatorio) || dadosRelatorio.length === 0) {
    corpo.innerHTML = `<tr><td colspan="6" class="p-4 text-center text-gray-500">Nenhum atendimento.</td></tr>`;
  } else {
    dadosRelatorio.forEach((a) => {
      const tempoMs = calcularTempoUtil(a.data_inicio, a.data_fim);
      somaMs += tempoMs;
      corpo.innerHTML += `<tr class="border-b dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700/50"><td class="p-3 font-bold">#${a.numero_atendimento}</td><td class="p-3">${a.usuario_nome}</td><td class="p-3"><span class="bg-gray-200 dark:bg-gray-600 px-2 py-1 rounded-full text-xs">${a.tipo_nome}</span></td><td class="p-3">${formatarDataHora(a.data_inicio)}</td><td class="p-3">${formatarDataHora(a.data_fim)}</td><td class="p-3 font-mono text-green-600 dark:text-green-400 font-bold">${msParaTexto(tempoMs)}</td></tr>`;
    });
  }
  const resTotal = document.getElementById("resumo-total");
  const resTempo = document.getElementById("resumo-tempo-total");
  const resMedio = document.getElementById("resumo-tempo-medio");
  if (resTotal) resTotal.textContent = dadosRelatorio.length || 0;
  if (resTempo) resTempo.textContent = msParaTexto(somaMs);
  if (resMedio)
    resMedio.textContent =
      dadosRelatorio.length > 0
        ? msParaTexto(somaMs / dadosRelatorio.length)
        : "00:00:00";
}
window.exportarCSV = function () {
  if (!dadosRelatorio || dadosRelatorio.length === 0)
    return alert("Não há dados.");
  let csvContent =
    "data:text/csv;charset=utf-8,Ticket;Analista;Tipo;Inicio;Termino;TempoUtil\n";
  dadosRelatorio.forEach((a) => {
    const tempo = msParaTexto(calcularTempoUtil(a.data_inicio, a.data_fim));
    csvContent += `${a.numero_atendimento};${a.usuario_nome};${a.tipo_nome};${formatarDataHora(a.data_inicio)};${formatarDataHora(a.data_fim)};${tempo}\n`;
  });
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", "relatorio.csv");
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
window.editarPrioridade = function (id) {
  if (usuarioLogado.tipo_perfil !== "ADMIN") return alert("Acesso negado.");
  const atendimento = filaPendente.find((f) => f.id == id);
  if (!atendimento) return alert("Erro.");
  let inputPriId = document.getElementById("pri_id");
  if (!inputPriId) {
    inputPriId = document.createElement("input");
    inputPriId.type = "hidden";
    inputPriId.id = "pri_id";
    document.getElementById("formNovaPrioridade").appendChild(inputPriId);
  }
  inputPriId.value = atendimento.id;
  document.getElementById("pri_numero").value =
    atendimento.numero_atendimento || "";
  document.getElementById("pri_nivel").value =
    atendimento.prioridade || "Média";
  document.getElementById("pri_origem").value = atendimento.origem || "";
  if (atendimento.setor_id)
    document.getElementById("pri_setor").value = atendimento.setor_id;
  if (atendimento.tipo_id)
    document.getElementById("pri_tipo").value = atendimento.tipo_id;
  document.getElementById("modalNovaPrioridade").classList.remove("hidden");
};
window.excluirAtendimento = async function (id) {
  if (usuarioLogado.tipo_perfil !== "ADMIN") return alert("Acesso negado.");
  if (
    !confirm("Tem certeza que deseja excluir este atendimento permanentemente?")
  )
    return;
  try {
    const res = await fetch(`/api/atendimentos/${id}`, { method: "DELETE" });
    if (res.ok) {
      carregarPainelE_Fila();
    } else {
      alert("Erro ao excluir.");
    }
  } catch (e) {
    alert("Erro.");
  }
};
function atualizarGraficos() {
  atualizarGraficosDashboard();
}

function atualizarGraficosDashboard() {
  if (typeof Chart === "undefined") return;
  Chart.defaults.font.family = "Roboto, sans-serif";

  // Aggregation objects
  const statsAnalista = {};
  const statsTipo = {};
  const statsTendencia = {};
  let totalMsGeral = 0;

  // Process data
  if (!dadosRelatorio) dadosRelatorio = [];

  dadosRelatorio.forEach((a) => {
    const tempoMs = calcularTempoUtil(a.data_inicio, a.data_fim);
    totalMsGeral += tempoMs;

    // Analyst Stats
    if (!statsAnalista[a.usuario_nome]) {
      statsAnalista[a.usuario_nome] = { qtd: 0, tempoTotalMs: 0 };
    }
    statsAnalista[a.usuario_nome].qtd += 1;
    statsAnalista[a.usuario_nome].tempoTotalMs += tempoMs;

    // Type Stats
    if (!statsTipo[a.tipo_nome]) {
      statsTipo[a.tipo_nome] = { qtd: 0, tempoTotalMs: 0 };
    }
    statsTipo[a.tipo_nome].qtd += 1;
    statsTipo[a.tipo_nome].tempoTotalMs += tempoMs;

    // Tendency Stats (by Date)
    if (a.data_fim) {
      const dia = a.data_fim.split("T")[0];
      if (!statsTendencia[dia]) {
        statsTendencia[dia] = 0;
      }
      statsTendencia[dia] += 1;
    }
  });

  // --- Update KPI Cards ---
  const totalVolume = dadosRelatorio.length;
  const kpiTotal = document.getElementById("dash-kpi-total");
  if (kpiTotal) kpiTotal.textContent = totalVolume;

  const kpiTm = document.getElementById("dash-kpi-tm");
  if (kpiTm)
    kpiTm.textContent =
      totalVolume > 0 ? msParaTexto(totalMsGeral / totalVolume) : "00:00:00";

  let analistaDestaque = "-";
  let maxVol = 0;
  Object.keys(statsAnalista).forEach((nome) => {
    if (statsAnalista[nome].qtd > maxVol) {
      maxVol = statsAnalista[nome].qtd;
      analistaDestaque = doisNomes(nome);
    }
  });
  const kpiDestaque = document.getElementById("dash-kpi-destaque");
  if (kpiDestaque)
    kpiDestaque.textContent =
      analistaDestaque !== "-" ? `${analistaDestaque} (${maxVol})` : "-";

  let tipoComum = "-";
  let maxTipo = 0;
  Object.keys(statsTipo).forEach((t) => {
    if (statsTipo[t].qtd > maxTipo) {
      maxTipo = statsTipo[t].qtd;
      tipoComum = t;
    }
  });
  const kpiTipo = document.getElementById("dash-kpi-tipo");
  if (kpiTipo) kpiTipo.textContent = tipoComum;

  // --- Chart Configs ---
  const isDark = document.documentElement.classList.contains("dark");
  const corTexto = isDark ? "#a1a1aa" : "#52525b";
  const corGrade = isDark ? "#27272a" : "#e4e4e7";
  const coresVibrantes = [
    "#0ea5e9",
    "#8b5cf6",
    "#ec4899",
    "#f59e0b",
    "#10b981",
    "#ef4444",
    "#06b6d4",
    "#6366f1",
  ];

  // Chart 1: Tendência Diária (Line)
  const labelsTendencia = Object.keys(statsTendencia).sort();
  const dataTendencia = labelsTendencia.map((d) => statsTendencia[d]);
  const labelsTendenciaBR = labelsTendencia.map((d) => {
    const p = d.split("-");
    return `${p[2]}/${p[1]}`;
  });

  const ctxTendencia = document.getElementById("dashChartTendencia");
  if (ctxTendencia) {
    if (window.chartTendencia) window.chartTendencia.destroy();
    window.chartTendencia = new Chart(ctxTendencia, {
      type: "line",
      data: {
        labels: labelsTendenciaBR,
        datasets: [
          {
            label: "Volume Diário",
            data: dataTendencia,
            borderColor: "#6366f1",
            backgroundColor: "rgba(99, 102, 241, 0.1)",
            fill: true,
            tension: 0.3,
          },
        ],
      },
      options: {
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y: {
            beginAtZero: true,
            ticks: { color: corTexto, stepSize: 1 },
            grid: { color: corGrade },
          },
          x: { ticks: { color: corTexto }, grid: { display: false } },
        },
      },
    });
  }

  // Chart 2: Volume por Analista (Bar)
  const labelsAnalistas = Object.keys(statsAnalista).sort(
    (a, b) => statsAnalista[b].qtd - statsAnalista[a].qtd,
  );
  const dataVolAnalista = labelsAnalistas.map((n) => statsAnalista[n].qtd);

  const ctxProdAnalista = document.getElementById("dashChartProdAnalista");
  if (ctxProdAnalista) {
    if (window.chartProdAnalista) window.chartProdAnalista.destroy();
    window.chartProdAnalista = new Chart(ctxProdAnalista, {
      type: "bar",
      data: {
        labels: labelsAnalistas.map((n) => doisNomes(n)),
        datasets: [
          {
            label: "Atendimentos",
            data: dataVolAnalista,
            backgroundColor: "#0ea5e9",
            borderRadius: 4,
          },
        ],
      },
      options: {
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y: {
            beginAtZero: true,
            ticks: { color: corTexto, stepSize: 1 },
            grid: { color: corGrade },
          },
          x: {
            ticks: { color: corTexto, font: { weight: "bold" } },
            grid: { display: false },
          },
        },
      },
    });
  }

  // Chart 3: Distribuição por Tipo (Doughnut)
  const labelsTipos = Object.keys(statsTipo);
  const dataVolTipos = labelsTipos.map((t) => statsTipo[t].qtd);

  const ctxTipos = document.getElementById("dashChartTipos");
  if (ctxTipos) {
    if (window.chartTipos) window.chartTipos.destroy();
    window.chartTipos = new Chart(ctxTipos, {
      type: "doughnut",
      data: {
        labels: labelsTipos,
        datasets: [
          {
            data: dataVolTipos,
            backgroundColor: coresVibrantes,
            borderWidth: 0,
          },
        ],
      },
      options: {
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: "bottom",
            labels: { color: corTexto, padding: 20 },
          },
        },
        cutout: "65%",
      },
    });
  }

  // Chart 4: Tempo Médio por Analista (Horizontal Bar)
  const dataTmAnalista = labelsAnalistas.map((n) =>
    (statsAnalista[n].tempoTotalMs / statsAnalista[n].qtd / 60000).toFixed(1),
  );

  const ctxTmAnalista = document.getElementById("dashChartTmAnalista");
  if (ctxTmAnalista) {
    if (window.chartTmAnalista) window.chartTmAnalista.destroy();
    window.chartTmAnalista = new Chart(ctxTmAnalista, {
      type: "bar",
      data: {
        labels: labelsAnalistas.map((n) => doisNomes(n)),
        datasets: [
          {
            label: "Minutos",
            data: dataTmAnalista,
            backgroundColor: "#10b981",
            borderRadius: 4,
          },
        ],
      },
      options: {
        indexAxis: "y",
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: {
            beginAtZero: true,
            ticks: { color: corTexto },
            grid: { color: corGrade },
          },
          y: {
            ticks: { color: corTexto, font: { weight: "bold" } },
            grid: { display: false },
          },
        },
      },
    });
  }

  // Chart 5: Tempo Médio por Tipo (Horizontal Bar)
  const labelsTiposTm = Object.keys(statsTipo).sort(
    (a, b) =>
      statsTipo[b].tempoTotalMs / statsTipo[b].qtd -
      statsTipo[a].tempoTotalMs / statsTipo[a].qtd,
  );
  const dataTmTipo = labelsTiposTm.map((t) =>
    (statsTipo[t].tempoTotalMs / statsTipo[t].qtd / 60000).toFixed(1),
  );

  const ctxTmTipo = document.getElementById("dashChartTmTipo");
  if (ctxTmTipo) {
    if (window.chartTmTipo) window.chartTmTipo.destroy();
    window.chartTmTipo = new Chart(ctxTmTipo, {
      type: "bar",
      data: {
        labels: labelsTiposTm,
        datasets: [
          {
            label: "Minutos",
            data: dataTmTipo,
            backgroundColor: "#f43f5e",
            borderRadius: 4,
          },
        ],
      },
      options: {
        indexAxis: "y",
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: {
            beginAtZero: true,
            ticks: { color: corTexto },
            grid: { color: corGrade },
          },
          y: {
            ticks: { color: corTexto, font: { weight: "bold" } },
            grid: { display: false },
          },
        },
      },
    });
  }

  // Also preserve backwards compatibility with old chart IDs if they exist on the page
  const ctxTempo = document.getElementById("graficoTempo");
  if (ctxTempo) {
    if (window.chartTempo) window.chartTempo.destroy();
    window.chartTempo = new Chart(ctxTempo, {
      type: "bar",
      data: {
        labels: labelsAnalistas.map((n) => doisNomes(n)),
        datasets: [
          {
            label: "Tempo Médio",
            data: dataTmAnalista,
            backgroundColor: "#5cc55f",
            borderRadius: 6,
          },
        ],
      },
      options: {
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y: {
            beginAtZero: true,
            ticks: { color: corTexto },
            grid: { color: corGrade },
          },
          x: {
            ticks: { color: corTexto, font: { weight: "bold" } },
            grid: { display: false },
          },
        },
      },
    });
  }
  const ctxAnalistas = document.getElementById("graficoAnalistas");
  if (ctxAnalistas) {
    if (window.chartAnalistas) window.chartAnalistas.destroy();
    window.chartAnalistas = new Chart(ctxAnalistas, {
      type: "doughnut",
      data: {
        labels: labelsAnalistas.map((n) => doisNomes(n)),
        datasets: [
          {
            data: dataVolAnalista,
            backgroundColor: coresVibrantes,
            borderWidth: 0,
          },
        ],
      },
      options: {
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: "right",
            labels: { color: corTexto, font: { weight: "bold" } },
          },
        },
        cutout: "60%",
      },
    });
  }
}
window.abrirModalGeradorPersonalizado = async function () {
  document.getElementById("formGeradorCustom").reset();
  const hoje = new Date();
  document.getElementById("gerar_data_inicio").value = hoje
    .toISOString()
    .split("T")[0];
  hoje.setDate(hoje.getDate() + 30);
  document.getElementById("gerar_data_fim").value = hoje
    .toISOString()
    .split("T")[0];
  const res = await fetch("/api/setores");
  const setores = await res.json();
  const selectSetor = document.getElementById("gerar_setor");
  selectSetor.innerHTML = '<option value="">Selecione um Setor...</option>';
  setores.forEach(
    (s) =>
      (selectSetor.innerHTML += `<option value="${s.id}">${s.nome}</option>`),
  );
  document.getElementById("gerar_analistas_lista").innerHTML =
    '<p class="text-xs text-gray-500 col-span-full">Selecione um setor acima...</p>';
  document.getElementById("gerar_turnos_container").innerHTML = "";
  adicionarTurnoGerador();
  selectSetor.onchange = carregarAnalistasGerador;
  document
    .getElementById("modalGeradorPersonalizado")
    .classList.remove("hidden");
};
async function carregarAnalistasGerador() {
  const setorId = document.getElementById("gerar_setor").value;
  const container = document.getElementById("gerar_analistas_lista");
  if (!setorId) {
    container.innerHTML =
      '<p class="text-xs text-gray-500">Selecione um setor acima...</p>';
    return;
  }
  container.innerHTML =
    '<p class="text-xs text-gray-500 col-span-full">Carregando...</p>';
  try {
    const res = await fetch("/api/usuarios/ativos");
    const usuarios = await res.json();
    const analistas = usuarios.filter(
      (u) =>
        u.setor_id == setorId &&
        u.tipo_perfil === "ANALISTA",
    );
    container.innerHTML = "";
    if (analistas.length === 0)
      return (container.innerHTML =
        '<p class="text-xs text-red-500 col-span-full">Nenhum analista ativo.</p>');
    analistas.forEach((u) => {
      container.innerHTML += `<label class="flex items-center gap-2 p-1 border rounded-full dark:border-gray-600 bg-gray-50 dark:bg-gray-700 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"><input type="checkbox" value="${u.id}" class="chk-analista-gerador w-4 h-4 text-purple-600" checked><span class="text-sm font-bold dark:text-white truncate">${u.nome.split(" ")[0]}</span></label>`;
    });
  } catch (e) {
    container.innerHTML = '<p class="text-xs text-red-500">Erro.</p>';
  }
}
window.adicionarTurnoGerador = function () {
  const container = document.getElementById("gerar_turnos_container");
  const id = Date.now();
  const novoTurnoHTML = `<div id="turno_${id}" class="flex flex-col gap-2 bg-white dark:bg-gray-800 p-3 rounded-full border dark:border-gray-600 mb-2"><div class="flex gap-2 items-center"><select class="turno-funcao flex-1 p-1 text-sm border rounded-full dark:bg-gray-700 dark:text-white dark:border-gray-500"><option value="Filtro">Filtro</option><option value="Chat">Chat</option><option value="Rev Almoço">Rev Almoço</option><option value="Visita Externa">Visita Externa</option></select><label class="flex items-center gap-1 text-sm dark:text-white font-bold"><input type="checkbox" class="turno-dia-inteiro w-4 h-4" onchange="document.getElementById('horarios_${id}').classList.toggle('hidden', this.checked)"> Dia Inteiro</label><button type="button" onclick="document.getElementById('turno_${id}').remove()" class="text-red-500 hover:text-red-700 px-2"><i class="fa-solid fa-trash"></i></button></div><div id="horarios_${id}" class="flex gap-2 items-center"><span class="text-xs dark:text-gray-300">Das:</span><input type="time" class="turno-inicio p-1 text-sm border rounded-full dark:bg-gray-700 dark:text-white dark:border-gray-500"><span class="text-xs dark:text-gray-300">Até:</span><input type="time" class="turno-fim p-1 text-sm border rounded-full dark:bg-gray-700 dark:text-white dark:border-gray-500"></div></div>`;
  container.insertAdjacentHTML("beforeend", novoTurnoHTML);
};
let payloadGeradorMemoria = null;
window.executarGeradorPersonalizado = async function () {
  const setor_id = document.getElementById("gerar_setor").value;
  const data_inicio = document.getElementById("gerar_data_inicio").value;
  const data_fim = document.getElementById("gerar_data_fim").value;
  const frequencia_dias = parseInt(
    document.getElementById("gerar_frequencia").value,
  );
  const checkboxes = document.querySelectorAll(".chk-analista-gerador:checked");
  const analistas = Array.from(checkboxes).map((chk) => parseInt(chk.value));
  const turnosConfig = document.querySelectorAll(
    "#gerar_turnos_container > div",
  );
  const turnos = Array.from(turnosConfig).map((div) => {
    return {
      funcao: div.querySelector(".turno-funcao").value,
      dia_inteiro: div.querySelector(".turno-dia-inteiro").checked,
      hora_inicio: div.querySelector(".turno-inicio").value,
      hora_fim: div.querySelector(".turno-fim").value,
    };
  });
  if (!setor_id || !data_fim || analistas.length === 0 || turnos.length === 0)
    return alert(
      "Preencha todos os campos do gerador e selecione analistas/turnos.",
    );
  const btn = document.getElementById("btnExecutarGerador");
  const txtOriginal = btn.innerHTML;
  btn.innerHTML =
    '<i class="fa-solid fa-spinner fa-spin mr-2"></i>Verificando...';
  btn.disabled = true;
  payloadGeradorMemoria = {
    setor_id,
    data_inicio,
    data_fim,
    frequencia_dias,
    analistas,
    turnos,
    sobrescrever: false,
  };
  try {
    const checkRes = await fetch("/api/escala/check_conflito", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ setor_id, data_inicio, data_fim, analistas }),
    });
    if (!checkRes.ok) {
      const erroReal = await checkRes.text();
      alert("ERRO: " + erroReal);
      btn.innerHTML = txtOriginal;
      btn.disabled = false;
      return;
    }
    const checkData = await checkRes.json();
    if (checkData.conflito) {
      document
        .getElementById("modalConfirmarSubstituicao")
        .classList.remove("hidden");
      btn.innerHTML = txtOriginal;
      btn.disabled = false;
    } else {
      await confirmarE_GerarEscala();
    }
  } catch (e) {
    alert("Erro: " + e.message);
    btn.innerHTML = txtOriginal;
    btn.disabled = false;
  }
};
window.confirmarE_GerarEscala = async function () {
  document.getElementById("modalConfirmarSubstituicao").classList.add("hidden");
  payloadGeradorMemoria.sobrescrever = true;
  const btn = document.getElementById("btnExecutarGerador");
  const txtOriginal = btn.innerHTML;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i>Gerando...';
  btn.disabled = true;
  try {
    const res = await fetch("/api/escala/gerar_custom", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payloadGeradorMemoria),
    });
    if (res.ok) {
      document
        .getElementById("modalGeradorPersonalizado")
        .classList.add("hidden");
      if (typeof calendar !== "undefined" && calendar) calendar.refetchEvents();
      alert("Escala gerada!");
    } else {
      const err = await res.json();
      alert("Erro: " + err.erro);
    }
  } catch (e) {
    alert("Erro de conexão.");
  }
  btn.innerHTML = txtOriginal;
  btn.disabled = false;
};
window.abrirModalPausa = function (id) {
  document.getElementById("pausa_atendimento_id").value = id;
  document.getElementById("pausa_motivo").value = "";
  const form = document.getElementById("formPausarAtendimento");
  form.onsubmit = async (e) => {
    e.preventDefault();
    const res = await fetch(`/api/atendimentos/${id}/pausar`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        motivo: document.getElementById("pausa_motivo").value,
      }),
    });
    if (res.ok) {
      document.getElementById("modalPausarAtendimento").classList.add("hidden");
      carregarPainelE_Fila();
    }
  };
  document.getElementById("modalPausarAtendimento").classList.remove("hidden");
};
window.retomarAtendimento = async function (id) {
  const res = await fetch(`/api/atendimentos/${id}/retomar`, { method: "PUT" });
  if (res.ok) carregarPainelE_Fila();
};
window.abrirModalTransferencia = function (id) {
  document.getElementById("transf_atendimento_id").value = id;
  const sel = document.getElementById("transf_usuario_id");
  sel.innerHTML = "";
  usuariosSetor
    .filter((u) => u.id !== usuarioLogado.id)
    .forEach(
      (u) => (sel.innerHTML += `<option value="${u.id}">${u.nome}</option>`),
    );
  const form = document.getElementById("formTransferirAtendimento");
  form.onsubmit = async (e) => {
    e.preventDefault();
    if (
      !confirm(
        "O tempo do ticket atual será encerrado e ele será recomeçado na tela do outro analista. Confirmar?",
      )
    )
      return;
    const res = await fetch(`/api/atendimentos/${id}/transferir`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        novo_usuario_id: document.getElementById("transf_usuario_id").value,
      }),
    });
    if (res.ok) {
      document
        .getElementById("modalTransferirAtendimento")
        .classList.add("hidden");
      carregarPainelE_Fila();
    }
  };
  document
    .getElementById("modalTransferirAtendimento")
    .classList.remove("hidden");
};
let dadosRelatorioEscalaBase = [];
window.abrirModalRelatorioEscala = async function () {
  const hoje = new Date();
  document.getElementById("rel_escala_inicio").value = hoje
    .toISOString()
    .split("T")[0];
  hoje.setDate(hoje.getDate() + 7);
  document.getElementById("rel_escala_fim").value = hoje
    .toISOString()
    .split("T")[0];
  const selectSetor = document.getElementById("rel_escala_setor");
  selectSetor.innerHTML =
    usuarioLogado.tipo_perfil === "ADMIN"
      ? '<option value="todos">Todos os Setores</option>'
      : "";
  try {
    const res = await fetch("/api/setores");
    const setores = await res.json();
    setores.forEach((s) => {
      if (
        usuarioLogado.tipo_perfil === "ADMIN" ||
        s.id == usuarioLogado.setor_id
      ) {
        selectSetor.innerHTML += `<option value="${s.id}">${s.nome}</option>`;
      }
    });
  } catch (e) {}
  if (
    selectSetor.options.length > 1 &&
    selectSetor.options[0].value === "todos"
  ) {
    selectSetor.value = selectSetor.options[1].value;
  }
  document.getElementById("corpo_relatorio_escala").innerHTML =
    '<tr><td colspan="5" class="p-6 text-center text-gray-500 italic">Preencha os filtros e clique em buscar.</td></tr>';
  dadosRelatorioEscalaBase = [];
  document.getElementById("modalRelatorioEscala").classList.remove("hidden");
};
window.buscarRelatorioEscala = async function () {
  const setor_id = document.getElementById("rel_escala_setor").value;
  const data_inicio = document.getElementById("rel_escala_inicio").value;
  const data_fim = document.getElementById("rel_escala_fim").value;
  if (!data_inicio || !data_fim)
    return alert("Selecione a data inicial e final.");
  const corpo = document.getElementById("corpo_relatorio_escala");
  corpo.innerHTML =
    '<tr><td colspan="5" class="p-6 text-center text-gray-500 font-bold"><i class="fa-solid fa-spinner fa-spin mr-2"></i>Buscando...</td></tr>';
  try {
    const res = await fetch(
      `/api/escala/relatorio?setor_id=${setor_id}&data_inicio=${data_inicio}&data_fim=${data_fim}`,
    );
    dadosRelatorioEscalaBase = await res.json();
    corpo.innerHTML = "";
    if (dadosRelatorioEscalaBase.length === 0) {
      corpo.innerHTML =
        '<tr><td colspan="5" class="p-6 text-center text-red-500 font-bold">Nenhuma escala encontrada neste período.</td></tr>';
      return;
    }
    dadosRelatorioEscalaBase.forEach((e) => {
      const dataBr = e.data.split("-").reverse().join("/");
      const horario = e.dia_inteiro
        ? '<span class="text-emerald-500 font-bold">Dia Inteiro</span>'
        : e.hora_inicio
          ? `<span class="font-mono text-gray-700 dark:text-gray-300">${e.hora_inicio.substring(0, 5)} as ${e.hora_fim.substring(0, 5)}</span>`
          : '<span class="text-gray-400 italic">Não definido</span>';
      corpo.innerHTML += `
                <tr class="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td class="p-3 font-bold">${dataBr}</td>
                    <td class="p-3">${e.analista}</td>
                    <td class="p-3"><span class="bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded-full text-xs font-bold shadow-sm">${e.funcao}</span></td>
                    <td class="p-3">${horario}</td>
                    <td class="p-3 text-gray-600 dark:text-gray-400 max-w-[200px] truncate" title="${e.observacao || ""}">${e.observacao || ""}</td>
                </tr>
            `;
    });
  } catch (e) {
    corpo.innerHTML =
      '<tr><td colspan="5" class="p-6 text-center text-red-500 font-bold">Erro ao buscar dados.</td></tr>';
  }
};
window.exportarCSVEscala = function () {
  if (!dadosRelatorioEscalaBase || dadosRelatorioEscalaBase.length === 0)
    return alert("Não há dados para exportar. Faça uma busca primeiro.");
  const funcoesUnicas = [
    ...new Set(dadosRelatorioEscalaBase.map((e) => e.funcao)),
  ]
    .filter((f) => f)
    .sort();
  const dadosAgrupados = {};
  dadosRelatorioEscalaBase.forEach((e) => {
    if (!dadosAgrupados[e.data]) {
      dadosAgrupados[e.data] = {};
    }
    const nomeAnalista = e.analista.split(" ")[0];
    if (!dadosAgrupados[e.data][e.funcao]) {
      dadosAgrupados[e.data][e.funcao] = nomeAnalista;
    } else {
      dadosAgrupados[e.data][e.funcao] += " / " + nomeAnalista;
    }
  });
  let csvContent = "\uFEFFData;";
  csvContent += funcoesUnicas.join(";") + "\n";
  const nomeDias = {
    0: "Domingo",
    1: "Segunda",
    2: "Terça",
    3: "Quarta",
    4: "Quinta",
    5: "Sexta",
    6: "Sábado",
  };
  const datasOrdenadas = Object.keys(dadosAgrupados).sort();
  datasOrdenadas.forEach((dataIso) => {
    const dataObj = new Date(dataIso + "T12:00:00Z");
    const dataBr = dataIso.split("-").reverse().join("/");
    const diaSemana = nomeDias[dataObj.getUTCDay()];
    let linha = `${dataBr} ${diaSemana};`;
    funcoesUnicas.forEach((funcao) => {
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
async function carregarFinalizadosHoje() {
  const corpo = document.getElementById("corpo-finalizados-hoje");
  const resumo = document.getElementById("resumo-finalizados-hoje");
  if (!corpo) return;
  corpo.innerHTML = `<tr><td colspan="3" class="p-6 text-center text-gray-500"><i class="fa-solid fa-spinner fa-spin mr-2"></i>Carregando...</td></tr>`;
  const hoje = new Date().toISOString().split("T")[0];
  const f = document.getElementById("filtro-setor");
  const sid = f && f.value ? f.value : usuarioLogado.setor_id;
  try {
    let url = `/api/atendimentos/concluidos?data_inicio=${hoje}&data_fim=${hoje}`;
    if (sid && sid !== "todos") url += `&setor_id=${sid}`;
    if (usuarioLogado.tipo_perfil !== "ADMIN")
      url += `&usuario_id=${usuarioLogado.id}`;
    const res = await fetch(url);
    const dados = await res.json();
    corpo.innerHTML = "";
    if (!Array.isArray(dados) || dados.length === 0) {
      corpo.innerHTML = `<tr><td colspan="3" class="p-6 text-center text-gray-400 italic"><i class="fa-regular fa-calendar-xmark mr-2"></i>Nenhum atendimento finalizado hoje.</td></tr>`;
      if (resumo) resumo.textContent = "0";
      return;
    }
    const porAnalista = {};
    dados.forEach((a) => {
      if (!porAnalista[a.usuario_nome]) porAnalista[a.usuario_nome] = [];
      porAnalista[a.usuario_nome].push(a);
    });
    Object.entries(porAnalista).forEach(([analista, atendimentos]) => {
      corpo.innerHTML += `<tr class="bg-blue-50 dark:bg-blue-900/20"><td colspan="3" class="px-4 py-2 font-bold text-blue-700 dark:text-blue-300 text-sm uppercase tracking-wide"><i class="fa-solid fa-user-tie mr-2"></i>${analista} <span class="ml-2 bg-blue-600 text-white text-xs px-2 py-0.5 rounded-full font-mono">${atendimentos.length}</span></td></tr>`;
      atendimentos.forEach((a) => {
        corpo.innerHTML += `
                    <tr class="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/40 transition">
                        <td class="px-4 py-3 font-bold text-gray-800 dark:text-gray-100 font-mono">#${a.numero_atendimento}</td>
                        <td class="px-4 py-3 text-gray-700 dark:text-gray-300">${a.usuario_nome}</td>
                        <td class="px-4 py-3"><span class="bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 px-3 py-1 rounded-full text-xs font-bold">${a.tipo_nome}</span></td>
                    </tr>`;
      });
    });
    if (resumo) resumo.textContent = dados.length;
  } catch (e) {
    console.error(e);
    corpo.innerHTML = `<tr><td colspan="3" class="p-6 text-center text-red-500 font-bold">Erro ao carregar dados.</td></tr>`;
  }
}
window.toggleSidebar = function () {
  const isCollapsed = localStorage.getItem("sidebar_collapsed") === "true";
  localStorage.setItem("sidebar_collapsed", !isCollapsed);
  applySidebarState();
};
window.applySidebarState = function () {
  const isCollapsed = localStorage.getItem("sidebar_collapsed") === "true";
  const sidebar = document.getElementById("sidebar");
  const wrapper = document.getElementById("main-wrapper");
  const texts = document.querySelectorAll(".sidebar-text");
  const titles = document.querySelectorAll(".sidebar-title");
  const avatarInfo = document.getElementById("avatar-info");
  const iconBtn = document.getElementById("btnToggleSidebarIcon");
  const arrow = document.getElementById("btnToggleSidebarArrow");

  // elements to center
  const links = document.querySelectorAll(".sidebar-link, #btnDarkMode");
  const header = document.getElementById("sidebar-header");
  const footer = document.getElementById("sidebar-footer");
  const userContainer = document.getElementById("sidebar-user");

  if (!sidebar) return;
  if (isCollapsed) {
    sidebar.classList.replace("w-64", "w-20");
    if (wrapper) wrapper.classList.replace("lg:pl-64", "lg:pl-20");
    texts.forEach((t) => t.classList.add("hidden"));
    titles.forEach((t) => t.classList.add("hidden"));
    if (avatarInfo) avatarInfo.classList.add("hidden");
    if (arrow) arrow.classList.replace("lg:flex", "lg:hidden");
    if (iconBtn) {
      iconBtn.classList.replace("fa-chevron-left", "fa-chevron-right");
    }

    links.forEach((l) => {
      l.classList.remove("px-3", "justify-start");
      l.classList.add("justify-center");
    });
    if (header) {
      header.classList.remove("px-6", "justify-between");
      header.classList.add("px-0", "justify-center");
    }
    if (footer) {
      footer.classList.remove("px-4");
      footer.classList.add("px-0", "flex", "justify-center");
    }
    if (userContainer) {
      userContainer.classList.remove("gap-3");
      userContainer.classList.add("justify-center");
    }
  } else {
    sidebar.classList.replace("w-20", "w-64");
    if (wrapper) wrapper.classList.replace("lg:pl-20", "lg:pl-64");
    texts.forEach((t) => t.classList.remove("hidden"));
    titles.forEach((t) => t.classList.remove("hidden"));
    if (avatarInfo) avatarInfo.classList.remove("hidden");
    if (arrow) arrow.classList.replace("lg:hidden", "lg:flex");
    if (iconBtn) {
      iconBtn.classList.replace("fa-chevron-right", "fa-chevron-left");
    }

    links.forEach((l) => {
      l.classList.remove("justify-center");
      l.classList.add("px-3", "justify-start");
    });
    if (header) {
      header.classList.remove("px-0", "justify-center");
      header.classList.add("px-6", "justify-between");
    }
    if (footer) {
      footer.classList.remove("px-0", "flex", "justify-center");
      footer.classList.add("px-4");
    }
    if (userContainer) {
      userContainer.classList.remove("justify-center");
      userContainer.classList.add("gap-3");
    }
  }
};

let bimerPreviewData = [];

async function initBimer() {
  if (usuarioLogado.tipo_perfil !== "ADMIN") {
    window.location.href = "/";
    return;
  }
  try {
    const res = await fetch("/api/setores");
    const setores = await res.json();
    const sel = document.getElementById("bimer-setor");
    if (sel) {
      sel.innerHTML = "";
      setores.forEach((s) => {
        sel.innerHTML += `<option value="${s.id}">${s.nome}</option>`;
      });
      carregarAnalistasBimer();
    }
  } catch (e) {
    console.error("Erro ao carregar setores:", e);
  }

  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
  const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  document.getElementById("bimer-data-inicio").value = firstDay
    .toISOString()
    .split("T")[0];
  document.getElementById("bimer-data-fim").value = lastDay
    .toISOString()
    .split("T")[0];

  document.querySelectorAll(".bimer-tipo-cb").forEach((cb) => {
    cb.addEventListener("change", atualizarDescricoesBimer);
  });
  atualizarDescricoesBimer();
}

window.carregarAnalistasBimer = async function () {
  const setor_id = document.getElementById("bimer-setor").value;
  const selAnalista = document.getElementById("bimer-analista");
  if (!selAnalista || !setor_id) return;

  selAnalista.innerHTML = '<option value="">Todos os Analistas</option>';
  try {
    const res = await fetch("/api/usuarios/ativos");
    const usuarios = await res.json();
    usuarios
      .filter((u) => u.setor_id == setor_id && u.tipo_perfil === "ANALISTA")
      .forEach((u) => {
        selAnalista.innerHTML += `<option value="${u.id}">${u.nome}</option>`;
      });
  } catch (e) {
    console.error("Erro ao carregar analistas:", e);
  }
};

function atualizarDescricoesBimer() {
  const checked = Array.from(
    document.querySelectorAll(".bimer-tipo-cb:checked"),
  );
  const container = document.getElementById("bimer-descricoes-container");
  const area = document.getElementById("bimer-descricoes-area");
  if (checked.length === 0) {
    area.classList.add("hidden");
    return;
  }
  area.classList.remove("hidden");
  const existingValues = {};
  container
    .querySelectorAll("input[data-tipo]")
    .forEach(
      (inp) => (existingValues[inp.dataset.tipo] = inp.value),
    );
  container.innerHTML = "";
  checked.forEach((cb) => {
    const tipo = cb.value;
    const prev = existingValues[tipo] || "";
    container.innerHTML += `
      <div class="flex items-center gap-3 w-full">
        <span class="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest whitespace-nowrap">${tipo}</span>
        <input type="text" data-tipo="${tipo}" value="${prev}" placeholder="Descrição para ${tipo}..."
          class="flex-1 w-full rounded-lg bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-white px-3 py-2 text-sm ring-1 ring-zinc-900/10 dark:ring-white/10 focus:ring-2 focus:ring-emerald-500 outline-none transition">
      </div>
    `;
  });
}

window.processarPreviewBimer = async function () {
  const setor_id = document.getElementById("bimer-setor").value;
  const analista_id = document.getElementById("bimer-analista").value || null;
  const data_inicio = document.getElementById("bimer-data-inicio").value;
  const data_fim = document.getElementById("bimer-data-fim").value;
  const tiposCb = document.querySelectorAll(".bimer-tipo-cb:checked");
  const tipos_selecionados = Array.from(tiposCb).map((cb) => cb.value);

  if (!setor_id || !data_inicio || !data_fim) {
    return alert("Preencha todos os campos de filtro.");
  }
  if (tipos_selecionados.length === 0) {
    return alert("Selecione pelo menos um tipo.");
  }

  const btn = document.getElementById("btnProcessarBimer");
  const txtOriginal = btn.innerHTML;
  btn.innerHTML =
    '<i class="fa-solid fa-spinner fa-spin mr-1.5 text-xs"></i>Processando...';
  btn.disabled = true;

  try {
    const res = await fetch("/api/bimer/preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ setor_id, analista_id, data_inicio, data_fim, tipos_selecionados }),
    });
    const data = await res.json();
    if (!res.ok) {
      alert(data.erro || "Erro ao processar preview.");
      return;
    }

    bimerPreviewData = data.lancamentos || [];
    const alertas = document.getElementById("bimer-alertas");
    if (data.analistasSemBimer && data.analistasSemBimer.length > 0) {
      alertas.classList.remove("hidden");
      alertas.innerHTML = `
        <div class="bg-amber-50 dark:bg-amber-500/10 ring-1 ring-amber-200/50 dark:ring-amber-500/20 rounded-xl p-4">
          <p class="text-sm font-semibold text-amber-700 dark:text-amber-300 flex items-center gap-2">
            <i class="fa-solid fa-triangle-exclamation"></i> Analistas sem ID Bimer (ignorados):
          </p>
          <p class="text-sm text-amber-600 dark:text-amber-400 mt-1">${data.analistasSemBimer.join(", ")}</p>
          <p class="text-xs text-amber-500 dark:text-amber-500 mt-2">Configure o ID Bimer no cadastro do usuário em Configurações > Equipe.</p>
        </div>
      `;
    } else {
      alertas.classList.add("hidden");
      alertas.innerHTML = "";
    }

    renderizarPreviewBimer();
  } catch (e) {
    alert("Erro de conexão ao processar preview.");
    console.error(e);
  } finally {
    btn.innerHTML = txtOriginal;
    btn.disabled = false;
  }
};

function renderizarPreviewBimer() {
  const area = document.getElementById("bimer-preview-area");
  const body = document.getElementById("bimer-preview-body");
  const contador = document.getElementById("bimer-contador");

  if (bimerPreviewData.length === 0) {
    area.classList.add("hidden");
    return;
  }
  area.classList.remove("hidden");
  contador.textContent = `${bimerPreviewData.length} turnos`;

  body.innerHTML = bimerPreviewData
    .map((item, idx) => {
      const [ano, mes, dia] = item.data.split("-");
      return `
      <tr class="border-b border-zinc-50 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
        <td class="px-5 py-3 font-medium">${SecurityManager.escapeHTML(item.analista)}</td>
        <td class="px-5 py-3 font-mono text-xs">${dia}/${mes}/${ano}</td>
        <td class="px-5 py-3">
          <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
            item.funcao === "Filtro"
              ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 ring-1 ring-emerald-200/50 dark:ring-emerald-500/20"
              : item.funcao === "Chat"
                ? "bg-sky-50 dark:bg-sky-500/10 text-sky-700 dark:text-sky-300 ring-1 ring-sky-200/50 dark:ring-sky-500/20"
                : item.funcao === "Treinamento"
                  ? "bg-purple-50 dark:bg-purple-500/10 text-purple-700 dark:text-purple-300 ring-1 ring-purple-200/50 dark:ring-purple-500/20"
                  : "bg-zinc-100 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 ring-1 ring-zinc-200/50 dark:ring-zinc-600/50"
          }">${SecurityManager.escapeHTML(item.funcao)}</span>
        </td>
        <td class="px-5 py-3 text-xs text-zinc-500 dark:text-zinc-400">${item.periodo}</td>
        <td class="px-5 py-3">
          <button onclick="removerTurnoBimer(${idx})" class="text-red-400 hover:text-red-600 transition-colors p-1" title="Remover turno">
            <i class="fa-solid fa-trash-can text-xs"></i>
          </button>
        </td>
      </tr>
    `;
    })
    .join("");
}

window.removerTurnoBimer = function (index) {
  bimerPreviewData.splice(index, 1);
  renderizarPreviewBimer();
};

window.limparPreviewBimer = function () {
  bimerPreviewData = [];
  document.getElementById("bimer-preview-area").classList.add("hidden");
  document.getElementById("bimer-alertas").classList.add("hidden");
  document.getElementById("bimer-resultados").classList.add("hidden");
};

window.lancarBimer = async function () {
  if (bimerPreviewData.length === 0) {
    return alert("Nenhum turno para lançar.");
  }

  const descricoes = {};
  document
    .querySelectorAll("#bimer-descricoes-container input[data-tipo]")
    .forEach((inp) => {
      descricoes[inp.dataset.tipo] = inp.value;
    });

  // Agrupa por id_bimer + funcao para que cada tipo tenha sua própria observação
  const lancamentosMap = {};
  bimerPreviewData.forEach((item) => {
    const chave = `${item.id_bimer}__${item.funcao}`;
    if (!lancamentosMap[chave]) {
      lancamentosMap[chave] = {
        id_bimer: item.id_bimer,
        analista: item.analista,
        funcao: item.funcao,
        turnos: [],
        observacao: descricoes[item.funcao] || item.funcao,
      };
    }
    lancamentosMap[chave].turnos.push({
      dataInicial: item.dataInicial,
      dataFinal: item.dataFinal,
      diaCheio: item.diaCheio,
      diaBloqueado: item.diaBloqueado,
    });
  });

  // Reagrupa por id_bimer (cada entrada = um request separado para a API)
  const lancamentosPorAnalista = {};
  Object.values(lancamentosMap).forEach((grupo) => {
    // Usa chave única por analista+funcao para enviar requests separados
    const chaveReq = `${grupo.id_bimer}__${grupo.funcao}`;
    lancamentosPorAnalista[chaveReq] = {
      id_bimer: grupo.id_bimer,
      analista: grupo.analista,
      funcao: grupo.funcao,
      turnos: grupo.turnos,
      observacao: grupo.observacao,
    };
  });

  const btn = document.getElementById("btnLancarBimer");
  const txtOriginal = btn.innerHTML;
  btn.innerHTML =
    '<i class="fa-solid fa-spinner fa-spin mr-1.5 text-xs"></i>Lançando...';
  btn.disabled = true;

  try {
    const res = await fetch("/api/bimer/lancar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lancamentosPorAnalista }),
    });
    const data = await res.json();

    const resultArea = document.getElementById("bimer-resultados");
    const resultBody = document.getElementById("bimer-resultados-body");
    resultArea.classList.remove("hidden");

    if (data.sucesso && data.resultados) {
      resultBody.innerHTML = data.resultados
        .map((r) => {
          if (r.sucesso) {
            return `
            <div class="flex items-center gap-3 py-2 px-3 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 ring-1 ring-emerald-200/50 dark:ring-emerald-500/20 mb-2">
              <i class="fa-solid fa-circle-check text-emerald-500"></i>
              <span class="text-sm font-medium text-emerald-700 dark:text-emerald-300">${SecurityManager.escapeHTML(r.analista)}</span>
              <span class="text-xs text-emerald-500 ml-auto">${r.turnos} turnos lançados</span>
            </div>`;
          } else {
            return `
            <div class="flex items-center gap-3 py-2 px-3 rounded-lg bg-red-50 dark:bg-red-500/10 ring-1 ring-red-200/50 dark:ring-red-500/20 mb-2">
              <i class="fa-solid fa-circle-xmark text-red-500"></i>
              <span class="text-sm font-medium text-red-700 dark:text-red-300">${SecurityManager.escapeHTML(r.analista)}</span>
              <span class="text-xs text-red-500 ml-auto">Erro: ${SecurityManager.escapeHTML(r.erro)}</span>
            </div>`;
          }
        })
        .join("");

      bimerPreviewData = [];
      renderizarPreviewBimer();
    } else {
      resultBody.innerHTML = `
        <div class="flex items-center gap-3 py-2 px-3 rounded-lg bg-red-50 dark:bg-red-500/10 ring-1 ring-red-200/50 dark:ring-red-500/20">
          <i class="fa-solid fa-circle-xmark text-red-500"></i>
          <span class="text-sm font-medium text-red-700 dark:text-red-300">${SecurityManager.escapeHTML(data.erro || "Erro desconhecido")}</span>
        </div>`;
    }
  } catch (e) {
    alert("Erro de conexão ao lançar.");
    console.error(e);
  } finally {
    btn.innerHTML = txtOriginal;
    btn.disabled = false;
  }
};

// ============================================================
// Sistema de Alertas Customizados (showToast + showConfirm)
// ============================================================

(function () {
  // Container de toasts
  const toastContainer = document.createElement("div");
  toastContainer.id = "toast-container";
  toastContainer.style.cssText =
    "position:fixed;top:24px;right:24px;z-index:99999;display:flex;flex-direction:column;gap:12px;pointer-events:none;";
  document.body.appendChild(toastContainer);

  const icons = {
    success: '<i class="fa-solid fa-circle-check"></i>',
    error: '<i class="fa-solid fa-circle-xmark"></i>',
    warning: '<i class="fa-solid fa-triangle-exclamation"></i>',
    info: '<i class="fa-solid fa-circle-info"></i>',
  };

  const colors = {
    success: {
      bg: "bg-emerald-50 dark:bg-emerald-500/10",
      ring: "ring-emerald-200/60 dark:ring-emerald-500/20",
      icon: "text-emerald-500",
      text: "text-emerald-800 dark:text-emerald-300",
    },
    error: {
      bg: "bg-red-50 dark:bg-red-500/10",
      ring: "ring-red-200/60 dark:ring-red-500/20",
      icon: "text-red-500",
      text: "text-red-800 dark:text-red-300",
    },
    warning: {
      bg: "bg-amber-50 dark:bg-amber-500/10",
      ring: "ring-amber-200/60 dark:ring-amber-500/20",
      icon: "text-amber-500",
      text: "text-amber-800 dark:text-amber-300",
    },
    info: {
      bg: "bg-blue-50 dark:bg-blue-500/10",
      ring: "ring-blue-200/60 dark:ring-blue-500/20",
      icon: "text-blue-500",
      text: "text-blue-800 dark:text-blue-300",
    },
  };

  /**
   * Exibe um toast estilizado.
   * @param {string} mensagem - Texto do alerta
   * @param {'success'|'error'|'warning'|'info'} tipo - Tipo do alerta
   * @param {number} duracao - Duração em ms (padrão 4000)
   */
  window.showToast = function (mensagem, tipo = "info", duracao = 4000) {
    const c = colors[tipo] || colors.info;
    const toast = document.createElement("div");
    toast.className = `flex items-start gap-3 px-4 py-3 rounded-xl ring-1 shadow-lg backdrop-blur-sm pointer-events-auto max-w-sm ${c.bg} ${c.ring}`;
    toast.style.cssText =
      "animation: toastIn 0.3s cubic-bezier(0.16,1,0.3,1) forwards;";
    toast.innerHTML = `
      <span class="${c.icon} text-lg mt-0.5 flex-shrink-0">${icons[tipo] || icons.info}</span>
      <span class="${c.text} text-sm font-medium leading-snug">${mensagem}</span>
      <button onclick="this.parentElement.remove()" class="ml-auto flex-shrink-0 ${c.text} opacity-50 hover:opacity-100 transition text-xs mt-0.5">
        <i class="fa-solid fa-xmark"></i>
      </button>
    `;
    toastContainer.appendChild(toast);
    setTimeout(() => {
      toast.style.animation =
        "toastOut 0.25s cubic-bezier(0.16,1,0.3,1) forwards";
      setTimeout(() => toast.remove(), 250);
    }, duracao);
  };

  /**
   * Exibe um diálogo de confirmação estilizado.
   * @param {string} mensagem - Texto da pergunta
   * @param {string} textoBotaoConfirmar - Texto do botão de confirmação (padrão "Confirmar")
   * @param {'emerald'|'red'|'amber'} corBotao - Cor do botão (padrão "emerald")
   * @returns {Promise<boolean>}
   */
  window.showConfirm = function (
    mensagem,
    textoBotaoConfirmar = "Confirmar",
    corBotao = "emerald",
  ) {
    return new Promise((resolve) => {
      const overlay = document.createElement("div");
      overlay.className =
        "fixed inset-0 bg-zinc-900/50 backdrop-blur-sm flex items-center justify-center z-[99998] p-4";
      overlay.style.animation =
        "toastIn 0.2s cubic-bezier(0.16,1,0.3,1) forwards";

      const btnColors = {
        emerald:
          "text-emerald-600 dark:text-emerald-400 ring-emerald-500/30 dark:ring-emerald-500/20 hover:bg-emerald-500/10 bg-emerald-500/5",
        red: "text-red-600 dark:text-red-400 ring-red-500/30 dark:ring-red-500/20 hover:bg-red-500/10 bg-red-500/5",
        amber:
          "text-amber-600 dark:text-amber-400 ring-amber-500/30 dark:ring-amber-500/20 hover:bg-amber-500/10 bg-amber-500/5",
      };
      const btnClass = btnColors[corBotao] || btnColors.emerald;

      overlay.innerHTML = `
        <div class="bg-white dark:bg-zinc-900 rounded-2xl ring-1 ring-zinc-900/5 dark:ring-white/10 shadow-xl p-6 w-full max-w-sm" style="animation: toastIn 0.25s cubic-bezier(0.16,1,0.3,1) forwards">
          <div class="flex items-start gap-3 mb-5">
            <div class="w-10 h-10 rounded-full bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center flex-shrink-0">
              <i class="fa-solid fa-triangle-exclamation text-amber-500"></i>
            </div>
            <p class="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed pt-2">${mensagem}</p>
          </div>
          <div class="flex gap-3">
            <button id="_confirmBtn" class="flex-1 ring-1 ring-inset ${btnClass} font-medium py-2.5 rounded-full transition shadow-sm text-sm">
              ${textoBotaoConfirmar}
            </button>
            <button id="_cancelBtn" class="flex-1 ring-1 ring-inset ring-zinc-900/10 dark:ring-white/10 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-900/5 dark:hover:bg-white/5 bg-zinc-50 dark:bg-zinc-800/50 font-medium py-2.5 rounded-full transition shadow-sm text-sm">
              Cancelar
            </button>
          </div>
        </div>
      `;
      document.body.appendChild(overlay);

      const fechar = (resultado) => {
        overlay.style.animation =
          "toastOut 0.2s cubic-bezier(0.16,1,0.3,1) forwards";
        setTimeout(() => {
          overlay.remove();
          resolve(resultado);
        }, 200);
      };

      overlay.querySelector("#_confirmBtn").onclick = () => fechar(true);
      overlay.querySelector("#_cancelBtn").onclick = () => fechar(false);
      overlay.addEventListener("click", (e) => {
        if (e.target === overlay) fechar(false);
      });
    });
  };

  // CSS de animação
  const style = document.createElement("style");
  style.textContent = `
    @keyframes toastIn {
      from { opacity: 0; transform: translateY(-12px) scale(0.95); }
      to { opacity: 1; transform: translateY(0) scale(1); }
    }
    @keyframes toastOut {
      from { opacity: 1; transform: translateY(0) scale(1); }
      to { opacity: 0; transform: translateY(-12px) scale(0.95); }
    }
  `;
  document.head.appendChild(style);
})();
