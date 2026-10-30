const pool = require("../config/db");
const { registrarLog, extrairInfoRequisicao } = require("../services/auditService");
exports.inserirEscala = async (req, res) => {
  try {
    const { usuario_id, setor_id, data, funcao, observacao, dia_inteiro, hora_inicio, hora_fim } = req.body;
    if (!usuario_id || !setor_id || !data || !funcao) {
      return res.status(400).json({ erro: "Campos obrigatórios: usuario_id, setor_id, data, funcao" });
    }
    await pool.query(
      `INSERT INTO escala (usuario_id, setor_id, data, funcao, observacao, dia_inteiro, hora_inicio, hora_fim, editado_manualmente)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, TRUE)`,
      [
        usuario_id,
        setor_id,
        data,
        funcao,
        observacao || null,
        dia_inteiro !== false,
        hora_inicio || null,
        hora_fim || null,
      ]
    );
    res.json({ sucesso: true });
  } catch (erro) {
    res.status(500).json({ erro: erro.message });
  }
};
exports.listarEscala = async (req, res) => {
  try {
    const { setor_id } = req.query;
    let query = `SELECT e.id, TO_CHAR(e.data, 'YYYY-MM-DD') as data, e.funcao, e.observacao, e.editado_manualmente, e.usuario_id, e.setor_id, e.dia_inteiro, e.hora_inicio, e.hora_fim, u.nome FROM escala e JOIN usuarios u ON e.usuario_id = u.id WHERE 1=1`;
    const params = [];
    if (setor_id && setor_id !== "todos") {
      query += ` AND e.setor_id = $1`;
      params.push(setor_id);
    }
    res.json((await pool.query(query, params)).rows);
  } catch (erro) {
    res.status(500).json({ erro: erro.message });
  }
};
exports.atualizarEscala = async (req, res) => {
  try {
    await pool.query(
      "UPDATE escala SET usuario_id = $1, observacao = $2, dia_inteiro = $3, hora_inicio = $4, hora_fim = $5, funcao = $6, editado_manualmente = TRUE WHERE id = $7",
      [
        req.body.usuario_id,
        req.body.observacao || null,
        req.body.dia_inteiro,
        req.body.hora_inicio || null,
        req.body.hora_fim || null,
        req.body.funcao,
        req.params.id,
      ],
    );
    res.json({ sucesso: true });
  } catch (erro) {
    res.status(500).json({ erro: erro.message });
  }
};

exports.atualizarEscalaPeriodo = async (req, res) => {
  try {
    const {
      setor_id,
      usuario_id,
      data_inicio,
      data_fim,
      funcao,
      observacao,
      dia_inteiro,
      hora_inicio,
      hora_fim,
    } = req.body;

    await pool.query(
      `UPDATE escala 
       SET funcao = $1, observacao = $2, dia_inteiro = $3, hora_inicio = $4, hora_fim = $5, editado_manualmente = TRUE 
       WHERE setor_id = $6 AND usuario_id = $7 AND data >= $8 AND data <= $9`,
      [
        funcao,
        observacao || null,
        dia_inteiro,
        hora_inicio || null,
        hora_fim || null,
        setor_id,
        usuario_id,
        data_inicio,
        data_fim,
      ],
    );
    res.json({ sucesso: true });
  } catch (erro) {
    res.status(500).json({ erro: erro.message });
  }
};
exports.gerarEscalaAntiga = async (req, res) => {
  const client = await pool.connect();
  try {
    const { setor_id, data_inicio, tipo_periodo } = req.body;
    let [ano, mes, dia] = data_inicio.split("-");
    ano = parseInt(ano);
    mes = parseInt(mes) - 1;
    dia = parseInt(dia);
    let atual = new Date(Date.UTC(ano, mes, dia));
    let dataFim = new Date(Date.UTC(ano + 1, mes, dia));
    const dataInicioObj = new Date(Date.UTC(ano, mes, dia));
    const resU = await client.query(
      `SELECT id, nome, horarios_semana, funcao_fixa, TO_CHAR(fixa_inicio, 'YYYY-MM-DD') as fixa_inicio, TO_CHAR(fixa_fim, 'YYYY-MM-DD') as fixa_fim FROM usuarios WHERE setor_id = $1 AND ativo = TRUE ORDER BY id`,
      [setor_id],
    );
    const analistas = resU.rows;
    const funcoesObrigatorias = ["Chat", "Filtro", "Rev Almoço"];
    await client.query("BEGIN");
    await client.query(
      `DELETE FROM escala WHERE setor_id = $1 AND data >= $2 AND data < $3 AND (editado_manualmente IS NULL OR editado_manualmente = FALSE)`,
      [setor_id, data_inicio, dataFim.toISOString().split("T")[0]],
    );
    const dayOfWeek = dataInicioObj.getUTCDay();
    const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const startMonday = new Date(Date.UTC(ano, mes, dia + diffToMonday));
    while (atual < dataFim) {
      const ds = atual.getUTCDay();
      if (ds !== 0 && ds !== 6) {
        const dtStr = atual.toISOString().split("T")[0];
        let indexRotacao = 0;
        const diffTime = atual.getTime() - startMonday.getTime();
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        if (tipo_periodo === "semanal") indexRotacao = Math.floor(diffDays / 7);
        else if (tipo_periodo === "quinzenal")
          indexRotacao = Math.floor(diffDays / 14);
        else if (tipo_periodo === "mensal")
          indexRotacao =
            (atual.getUTCFullYear() - startMonday.getUTCFullYear()) * 12 +
            (atual.getUTCMonth() - startMonday.getUTCMonth());
        const resManual = await client.query(
          "SELECT usuario_id, funcao FROM escala WHERE setor_id = $1 AND data = $2 AND editado_manualmente = TRUE",
          [setor_id, dtStr],
        );
        let ocupadosNoDia = resManual.rows.map((r) => ({
          id: r.usuario_id,
          funcao: r.funcao,
        }));
        let funcoesRestantes = funcoesObrigatorias.filter(
          (f) => !ocupadosNoDia.find((o) => o.funcao === f),
        );
        const disp = analistas.filter(
          (a) => a.horarios_semana && a.horarios_semana[ds.toString()]?.ativo,
        );
        disp.forEach((a) => {
          const isFixo =
            a.funcao_fixa &&
            (!a.fixa_inicio || dtStr >= a.fixa_inicio) &&
            (!a.fixa_fim || dtStr <= a.fixa_fim);
          if (
            isFixo &&
            funcoesRestantes.includes(a.funcao_fixa) &&
            !ocupadosNoDia.find((o) => o.id === a.id)
          ) {
            ocupadosNoDia.push({ id: a.id, funcao: a.funcao_fixa, novo: true });
            funcoesRestantes = funcoesRestantes.filter(
              (f) => f !== a.funcao_fixa,
            );
          }
        });
        const livres = disp.filter(
          (a) => !ocupadosNoDia.find((o) => o.id === a.id),
        );
        if (livres.length > 0) {
          const shift = indexRotacao % livres.length;
          const livresRotacionados = livres
            .slice(shift)
            .concat(livres.slice(0, shift));
          funcoesRestantes.forEach((f, i) => {
            if (livresRotacionados[i])
              ocupadosNoDia.push({
                id: livresRotacionados[i].id,
                funcao: f,
                novo: true,
              });
          });
        }
        for (const o of ocupadosNoDia) {
          if (o.novo) {
            await client.query(
              "INSERT INTO escala (data, setor_id, usuario_id, funcao, dia_inteiro, editado_manualmente) VALUES ($1, $2, $3, $4, TRUE, FALSE)",
              [dtStr, setor_id, o.id, o.funcao],
            );
          }
        }
      }
      atual.setUTCDate(atual.getUTCDate() + 1);
    }
    await client.query("COMMIT");
    res.json({ sucesso: true });
  } catch (e) {
    await client.query("ROLLBACK");
    res.status(500).json({ erro: e.message });
  } finally {
    client.release();
  }
};
exports.checkConflito = async (req, res) => {
  try {
    const { setor_id, data_inicio, data_fim, analistas } = req.body;
    let query = `SELECT COUNT(*) FROM escala WHERE setor_id = $1 AND data >= $2 AND data <= $3`;
    const params = [setor_id, data_inicio, data_fim];
    if (analistas && analistas.length > 0) {
      query += ` AND usuario_id = ANY($4::int[])`;
      params.push(analistas);
    }
    const resDB = await pool.query(query, params);
    res.json({ conflito: parseInt(resDB.rows[0].count) > 0 });
  } catch (e) {
    res.status(500).json({ erro: e.message });
  }
};
exports.gerarEscalaCustom = async (req, res) => {
  const client = await pool.connect();
  try {
    const {
      setor_id,
      data_inicio,
      data_fim,
      frequencia_dias,
      analistas,
      turnos,
      sobrescrever,
    } = req.body;
    if (!analistas || analistas.length === 0)
      throw new Error("Nenhum analista selecionado.");
    if (!turnos || turnos.length === 0)
      throw new Error("Adicione pelo menos um turno.");
    if (!data_fim) throw new Error("Defina a data final da escala.");
    let currentDate = new Date(`${data_inicio}T12:00:00Z`);
    let endDate = new Date(`${data_fim}T12:00:00Z`);
    let diasUteisContabilizados = 0;
    const resUsuarios = await client.query(
      `SELECT id, horarios_semana FROM usuarios WHERE id = ANY($1::int[])`,
      [analistas],
    );
    const mapHorarios = {};
    resUsuarios.rows.forEach((u) => (mapHorarios[u.id] = u.horarios_semana));
    await client.query("BEGIN");
    while (currentDate <= endDate) {
      const diaSemana = currentDate.getUTCDay();
      if (diaSemana !== 0 && diaSemana !== 6) {
        const dataStr = currentDate.toISOString().split("T")[0];
        if (sobrescrever) {
          await client.query(
            `DELETE FROM escala WHERE setor_id = $1 AND data = $2 AND usuario_id = ANY($3::int[])`,
            [setor_id, dataStr, analistas],
          );
        } else {
          await client.query(
            `DELETE FROM escala WHERE setor_id = $1 AND data = $2 AND (editado_manualmente IS NULL OR editado_manualmente = FALSE) AND usuario_id = ANY($3::int[])`,
            [setor_id, dataStr, analistas],
          );
        }
        let cicloAtual = Math.floor(diasUteisContabilizados / frequencia_dias);
        for (let i = 0; i < turnos.length; i++) {
          let turno = turnos[i];
          let indexAnalista = (i + cicloAtual) % analistas.length;
          let id_analista = analistas[indexAnalista];
          const expediente = mapHorarios[id_analista];
          const trabalhaNoDia =
            expediente && expediente[diaSemana] && expediente[diaSemana].ativo;
          let funcaoFinal = trabalhaNoDia ? turno.funcao : "Folga";
          let diaInteiroFinal = trabalhaNoDia ? turno.dia_inteiro : true;
          let horaInicioFinal = trabalhaNoDia
            ? turno.hora_inicio || null
            : null;
          let horaFimFinal = trabalhaNoDia ? turno.hora_fim || null : null;
          let obs =
            turno.horario && trabalhaNoDia ? `Horário: ${turno.horario}` : "";
          await client.query(
            `INSERT INTO escala (usuario_id, setor_id, data, funcao, observacao, dia_inteiro, hora_inicio, hora_fim, editado_manualmente) 
                         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, FALSE)`,
            [
              id_analista,
              setor_id,
              dataStr,
              funcaoFinal,
              obs,
              diaInteiroFinal,
              horaInicioFinal,
              horaFimFinal,
            ],
          );
        }
        diasUteisContabilizados++;
      }
      currentDate.setUTCDate(currentDate.getUTCDate() + 1);
    }
    await client.query("COMMIT");
    res.json({ sucesso: true });
  } catch (e) {
    await client.query("ROLLBACK");
    res.status(500).json({ erro: e.message });
  } finally {
    client.release();
  }
};
exports.listarObservacoes = async (req, res) => {
  try {
    const { setor_id } = req.query;
    let query = `SELECT o.id, TO_CHAR(o.data, 'YYYY-MM-DD') as data, o.setor_id, o.observacao, o.usuario_id, o.hora, u.nome, o.crm, o.numero_atendimento, o.assunto, o.numero_contato, o.cliente_responsavel, o.analista_contato, o.criado_por, o.participantes FROM observacoes_dia o LEFT JOIN usuarios u ON o.usuario_id = u.id WHERE 1=1`;
    const params = [];
    if (setor_id && setor_id !== "todos") {
      query += ` AND o.setor_id = $1`;
      params.push(setor_id);
    }
    res.json((await pool.query(query, params)).rows);
  } catch (erro) {
    res.status(500).json({ erro: erro.message });
  }
};
exports.salvarObservacao = async (req, res) => {
  try {
    let {
      id,
      data,
      setor_id,
      observacao,
      usuario_id,
      hora,
      crm,
      numero_atendimento,
      assunto,
      numero_contato,
      cliente_responsavel,
      analista_contato,
      criado_por,
      participantes,
    } = req.body;
    let u_id = usuario_id ? usuario_id : null;
    if (id) {
      await pool.query(
        `UPDATE observacoes_dia 
                 SET data=$1, setor_id=$2, observacao=$3, usuario_id=$4, hora=$5,
                     crm=$6, numero_atendimento=$7, assunto=$8, numero_contato=$9, 
                     cliente_responsavel=$10, analista_contato=$11, participantes=$12
                 WHERE id=$13`,
        [
          data,
          setor_id,
          observacao,
          u_id,
          hora || null,
          crm || null,
          numero_atendimento || null,
          assunto || null,
          numero_contato || null,
          cliente_responsavel || null,
          analista_contato || null,
          JSON.stringify(participantes || []),
          id,
        ],
      );
    } else {
      await pool.query(
        "INSERT INTO observacoes_dia (data, setor_id, observacao, usuario_id, hora, crm, numero_atendimento, assunto, numero_contato, cliente_responsavel, analista_contato, criado_por, participantes) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)",
        [
          data,
          setor_id,
          observacao,
          u_id,
          hora || null,
          crm || null,
          numero_atendimento || null,
          assunto || null,
          numero_contato || null,
          cliente_responsavel || null,
          analista_contato || null,
          criado_por || null,
          JSON.stringify(participantes || []),
        ],
      );
    }
    res.json({ sucesso: true });
  } catch (erro) {
    res.status(500).json({ erro: erro.message });
  }
};
exports.deletarObservacao = async (req, res) => {
  try {
    await pool.query("DELETE FROM observacoes_dia WHERE id = $1", [
      req.params.id,
    ]);
    res.json({ sucesso: true });
  } catch (erro) {
    res.status(500).json({ erro: erro.message });
  }
};
exports.relatorioEscala = async (req, res) => {
  try {
    const { setor_id, data_inicio, data_fim } = req.query;
    let query = `
            SELECT TO_CHAR(e.data, 'YYYY-MM-DD') as data, u.nome as analista, e.funcao, 
                   e.dia_inteiro, e.hora_inicio, e.hora_fim, e.observacao 
            FROM escala e 
            JOIN usuarios u ON e.usuario_id = u.id 
            WHERE 1=1
        `;
    const params = [];
    let paramIndex = 1;
    if (setor_id && setor_id !== "todos") {
      query += ` AND e.setor_id = $${paramIndex++}`;
      params.push(setor_id);
    }
    if (data_inicio) {
      query += ` AND e.data >= $${paramIndex++}`;
      params.push(data_inicio);
    }
    if (data_fim) {
      query += ` AND e.data <= $${paramIndex++}`;
      params.push(data_fim);
    }
    query += ` ORDER BY e.data ASC, u.nome ASC`;
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (erro) {
    res.status(500).json({ erro: erro.message });
  }
};

exports.excluirEscala = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Buscar informações da escala antes de excluir
    const resEscala = await pool.query(
      `SELECT e.*, u.nome as usuario_nome 
       FROM escala e 
       JOIN usuarios u ON e.usuario_id = u.id 
       WHERE e.id = $1`,
      [id]
    );
    
    if (resEscala.rows.length === 0) {
      return res.status(404).json({ erro: 'Escala não encontrada' });
    }
    
    const escala = resEscala.rows[0];
    
    // Excluir a escala
    await pool.query('DELETE FROM escala WHERE id = $1', [id]);
    
    // Registrar log
    if (req.user) {
      await registrarLog({
        usuario_id: req.user.id,
        usuario_nome: req.user.nome || req.user.email,
        acao: 'ESCALA_EXCLUIDA',
        tabela: 'escala',
        registro_id: parseInt(id),
        detalhes: {
          data: escala.data,
          usuario_escalado: escala.usuario_nome,
          funcao: escala.funcao
        },
        ...extrairInfoRequisicao(req)
      });
    }
    
    res.json({ sucesso: true });
  } catch (erro) {
    res.status(500).json({ erro: erro.message });
  }
};
