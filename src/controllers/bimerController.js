const pool = require("../config/db");
const { encrypt, decrypt, httpsPost, httpsGet } = require("../core");

exports.getConfig = async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT valor FROM configuracoes WHERE chave = $1",
      ["bimer_config"],
    );
    if (result.rows.length === 0) {
      return res.json({
        username: "",
        password: "",
        auth_url: "https://apibimer.alterdata.com.br/auth/token",
        lancamento_url: "https://apibimer.alterdata.com.br/api/agenda",
        id_tipo_agendamento: "001000009P",
        id_usuario_cadastro: "00100008ZL",
        id_pessoa: "001000000I",
      });
    }
    const encrypted = result.rows[0].valor;
    const decrypted = decrypt(encrypted);
    res.json(JSON.parse(decrypted));
  } catch (e) {
    console.error("[Bimer] Erro ao buscar config:", e.message);
    res.status(500).json({ erro: e.message });
  }
};

exports.saveConfig = async (req, res) => {
  try {
    if (req.usuario_logado.tipo_perfil !== "ADMIN") {
      return res.status(403).json({ erro: "Acesso negado." });
    }
    const config = req.body;
    const encrypted = encrypt(JSON.stringify(config));
    await pool.query(
      `INSERT INTO configuracoes (chave, valor) VALUES ($1, $2) ON CONFLICT (chave) DO UPDATE SET valor = $2`,
      ["bimer_config", encrypted],
    );
    res.json({ sucesso: true });
  } catch (e) {
    console.error("[Bimer] Erro ao salvar config:", e.message);
    res.status(500).json({ erro: e.message });
  }
};

exports.preview = async (req, res) => {
  try {
    if (req.usuario_logado.tipo_perfil !== "ADMIN") {
      return res.status(403).json({ erro: "Acesso negado." });
    }
    const { setor_id, analista_id, data_inicio, data_fim, tipos_selecionados } = req.body;
    if (!setor_id || !data_inicio || !data_fim || !tipos_selecionados?.length) {
      return res
        .status(400)
        .json({ erro: "Preencha todos os filtros obrigatórios." });
    }

    let query = `SELECT e.id, TO_CHAR(e.data, 'YYYY-MM-DD') as data, e.funcao, e.usuario_id, e.dia_inteiro, e.hora_inicio, e.hora_fim,
              u.nome, u.id_bimer
       FROM escala e
       JOIN usuarios u ON e.usuario_id = u.id
       WHERE e.setor_id = $1
         AND e.data >= $2
         AND e.data <= $3
         AND e.funcao = ANY($4::text[])`;
    const values = [setor_id, data_inicio, data_fim, tipos_selecionados];

    if (analista_id) {
      query += ` AND e.usuario_id = $5`;
      values.push(analista_id);
    }
    query += ` ORDER BY e.data ASC, u.nome ASC`;

    const escalaResult = await pool.query(query, values);

    const lancamentos = [];
    for (const row of escalaResult.rows) {
      if (!row.id_bimer) continue;

      const dataBase = row.data;
      if (row.dia_inteiro) {
        lancamentos.push({
          analista: row.nome,
          id_bimer: row.id_bimer,
          usuario_id: row.usuario_id,
          data: dataBase,
          funcao: row.funcao,
          periodo: "Manhã (08:00 às 12:00)",
          dataInicial: `${dataBase}T08:00:00Z`,
          dataFinal: `${dataBase}T12:00:00Z`,
          diaCheio: false,
          diaBloqueado: false,
        });
        lancamentos.push({
          analista: row.nome,
          id_bimer: row.id_bimer,
          usuario_id: row.usuario_id,
          data: dataBase,
          funcao: row.funcao,
          periodo: "Tarde (13:00 às 17:00)",
          dataInicial: `${dataBase}T13:00:00Z`,
          dataFinal: `${dataBase}T17:00:00Z`,
          diaCheio: false,
          diaBloqueado: false,
        });
      } else {
        const hi = row.hora_inicio || "08:00";
        const hf = row.hora_fim || "17:00";
        
        const hiMin = parseInt(hi.split(':')[0], 10) * 60 + parseInt(hi.split(':')[1], 10);
        const hfMin = parseInt(hf.split(':')[0], 10) * 60 + parseInt(hf.split(':')[1], 10);
        const almocoInicio = 12 * 60; // 12:00
        const almocoFim = 13 * 60; // 13:00

        if (hiMin <= almocoInicio && hfMin >= almocoFim) {
          // Divide em dois (antes do almoço e depois do almoço)
          lancamentos.push({
            analista: row.nome,
            id_bimer: row.id_bimer,
            usuario_id: row.usuario_id,
            data: dataBase,
            funcao: row.funcao,
            periodo: `${hi.substring(0, 5)} às 12:00`,
            dataInicial: `${dataBase}T${hi.substring(0, 5)}:00Z`,
            dataFinal: `${dataBase}T12:00:00Z`,
            diaCheio: false,
            diaBloqueado: false,
          });
          lancamentos.push({
            analista: row.nome,
            id_bimer: row.id_bimer,
            usuario_id: row.usuario_id,
            data: dataBase,
            funcao: row.funcao,
            periodo: `13:00 às ${hf.substring(0, 5)}`,
            dataInicial: `${dataBase}T13:00:00Z`,
            dataFinal: `${dataBase}T${hf.substring(0, 5)}:00Z`,
            diaCheio: false,
            diaBloqueado: false,
          });
        } else {
          // Mantém o turno contínuo se não cruzar a hora do almoço toda
          lancamentos.push({
            analista: row.nome,
            id_bimer: row.id_bimer,
            usuario_id: row.usuario_id,
            data: dataBase,
            funcao: row.funcao,
            periodo: `${hi.substring(0, 5)} às ${hf.substring(0, 5)}`,
            dataInicial: `${dataBase}T${hi.substring(0, 5)}:00Z`,
            dataFinal: `${dataBase}T${hf.substring(0, 5)}:00Z`,
            diaCheio: false,
            diaBloqueado: false,
          });
        }
      }
    }

    const analistasSemBimer = [
      ...new Set(
        escalaResult.rows.filter((r) => !r.id_bimer).map((r) => r.nome),
      ),
    ];

    res.json({ lancamentos, analistasSemBimer });
  } catch (e) {
    console.error("[Bimer] Erro no preview:", e.message);
    res.status(500).json({ erro: e.message });
  }
};

exports.lancar = async (req, res) => {
  try {
    if (req.usuario_logado.tipo_perfil !== "ADMIN") {
      return res.status(403).json({ erro: "Acesso negado." });
    }
    const { lancamentosPorAnalista } = req.body;

    if (
      !lancamentosPorAnalista ||
      Object.keys(lancamentosPorAnalista).length === 0
    ) {
      return res.status(400).json({ erro: "Nenhum lançamento para enviar." });
    }

    const configResult = await pool.query(
      "SELECT valor FROM configuracoes WHERE chave = $1",
      ["bimer_config"],
    );
    if (configResult.rows.length === 0) {
      return res.status(400).json({
        erro: "Configurações da API Bimer não encontradas. Configure em Configurações > API Bimer.",
      });
    }
    const config = JSON.parse(decrypt(configResult.rows[0].valor));

    const authRes = await httpsPost(
      config.auth_url,
      `username=${encodeURIComponent(config.username)}&password=${encodeURIComponent(config.password)}`,
      { "Content-Type": "application/x-www-form-urlencoded" },
    );

    if (authRes.status !== 200) {
      console.error("[Bimer] Erro na autenticação:", authRes.body);
      return res.status(500).json({
        erro: `Falha na autenticação com a API Bimer (HTTP ${authRes.status}). Verifique as credenciais nas Configurações.`,
      });
    }

    let authData;
    try {
      authData = JSON.parse(authRes.body);
    } catch {
      return res
        .status(500)
        .json({ erro: "Resposta inválida da autenticação Bimer." });
    }
    const token = authData.accessToken;

    const resultados = [];
    for (const [_chave, dados] of Object.entries(lancamentosPorAnalista)) {
      const idBimer = dados.id_bimer || _chave.split("__")[0];
      const payload = {
        identificadorTipoAgendamento: config.id_tipo_agendamento || "001000009P",
        identificadorUsuarioCadastro: config.id_usuario_cadastro || "00100008ZL",
        datasAgendamento: dados.turnos,
        pessoas: [
          {
            identificadorPessoa: config.id_pessoa || "001000000I",
            codigoEndereco: null,
            identificadorContatoVenda: null,
          },
        ],
        identificadoresUsuarios: [idBimer],
        identificadorAtendimento: null,
        identificadorProduto: null,
        identificadorLocalAgendamento: null,
        identificadorTipoAtendimento: null,
        valorVisita: 0,
        observacao: dados.observacao || "",
      };

      try {
        const lancRes = await httpsPost(config.lancamento_url, payload, {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        });

        if (lancRes.status >= 200 && lancRes.status < 300) {
          resultados.push({
            analista: dados.analista,
            sucesso: true,
            turnos: dados.turnos.length,
          });
        } else {
          console.error(
            `[Bimer] Erro no lançamento para ${dados.analista}:`,
            lancRes.body,
          );
          resultados.push({
            analista: dados.analista,
            sucesso: false,
            erro: `HTTP ${lancRes.status}`,
          });
        }
      } catch (err) {
        resultados.push({
          analista: dados.analista,
          sucesso: false,
          erro: err.message,
        });
      }
    }

    res.json({ sucesso: true, resultados });
  } catch (e) {
    console.error("[Bimer] Erro no lançamento:", e.message);
    res.status(500).json({ erro: e.message });
  }
};

exports.buscarUsuario = async (req, res) => {
  try {
    if (req.usuario_logado.tipo_perfil !== "ADMIN") {
      return res.status(403).json({ erro: "Acesso negado." });
    }
    const { email } = req.query;
    if (!email) {
      return res.status(400).json({ erro: "Informe o email do usuário." });
    }

    // Extrai o nomeLogin a partir do email (parte antes do @)
    const nomeLogin = email.split("@")[0];
    if (!nomeLogin) {
      return res.status(400).json({ erro: "Email inválido." });
    }

    // Busca as configurações do Bimer
    const configResult = await pool.query(
      "SELECT valor FROM configuracoes WHERE chave = $1",
      ["bimer_config"]
    );
    if (configResult.rows.length === 0) {
      return res.status(400).json({
        erro: "Configurações da API Bimer não encontradas. Configure em Configurações > API Bimer.",
      });
    }
    const config = JSON.parse(decrypt(configResult.rows[0].valor));

    // Autentica na API Bimer
    const authRes = await httpsPost(
      config.auth_url,
      `username=${encodeURIComponent(config.username)}&password=${encodeURIComponent(config.password)}`,
      { "Content-Type": "application/x-www-form-urlencoded" }
    );
    if (authRes.status !== 200) {
      return res.status(500).json({
        erro: `Falha na autenticação com a API Bimer (HTTP ${authRes.status}).`,
      });
    }
    const authData = JSON.parse(authRes.body);
    const token = authData.accessToken;

    // Faz GET na API de usuários do Bimer
    const apiUrl = `https://apibimer.alterdata.com.br/api/usuarios?nomeLogin=${encodeURIComponent(nomeLogin)}`;
    const apiRes = await httpsGet(apiUrl, {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    });

    if (apiRes.status !== 200) {
      return res.status(500).json({
        erro: `Erro na API Bimer ao buscar usuário (HTTP ${apiRes.status}).`,
      });
    }

    const data = JSON.parse(apiRes.body);
    const lista = data.ListaObjetos;
    if (!lista || lista.length === 0) {
      return res.status(404).json({
        erro: `Nenhum usuário encontrado com o login "${nomeLogin}" na API Bimer.`,
      });
    }

    const usuario = lista[0];
    res.json({
      identificador: usuario.Identificador,
      nome: usuario.Nome,
      nomeLogin: usuario.NomeLogin,
    });
  } catch (e) {
    console.error("[Bimer] Erro ao buscar usuário:", e.message);
    res.status(500).json({ erro: e.message });
  }
};
