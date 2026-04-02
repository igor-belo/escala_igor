const pool = require('../config/db');

exports.listarAtivos = async (req, res) => {
    try {
        const { setor_id } = req.query;
        let query = `SELECT a.*, t.nome as tipo_nome FROM atendimentos a JOIN tipos_atendimento t ON a.tipo_id = t.id WHERE a.status IN ('EM_ANDAMENTO', 'PAUSADO')`;
        const params = [];
        if (setor_id && setor_id !== 'todos') { query += ` AND a.setor_id = $1`; params.push(setor_id); }
        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (e) { res.status(500).json({erro: e.message}); }
};

exports.iniciarAtendimento = async (req, res) => {
    try {
        const { numero_atendimento, tipo_id, usuario_id, setor_id } = req.body;
        await pool.query(`INSERT INTO atendimentos (numero_atendimento, tipo_id, usuario_id, setor_id, data_inicio, status) VALUES ($1, $2, $3, $4, NOW(), 'EM_ANDAMENTO')`, [numero_atendimento, tipo_id, usuario_id, setor_id]);
        res.json({ sucesso: true });
    } catch (e) { res.status(500).json({erro: e.message}); }
};

exports.finalizarAtendimento = async (req, res) => {
    try {
        // Se encerrar enquanto estava pausado, soma o tempo da pausa final antes de fechar
        await pool.query(`UPDATE atendimentos SET status = 'CONCLUIDO', data_fim = NOW(), tempo_em_pausa_ms = CASE WHEN status = 'PAUSADO' THEN tempo_em_pausa_ms + (EXTRACT(EPOCH FROM (NOW() - inicio_ultima_pausa)) * 1000) ELSE tempo_em_pausa_ms END WHERE id = $1`, [req.params.id]);
        res.json({ sucesso: true });
    } catch (e) { res.status(500).json({erro: e.message}); }
};

exports.pausarAtendimento = async (req, res) => {
    try {
        await pool.query(`UPDATE atendimentos SET status = 'PAUSADO', motivo_pausa = $1, inicio_ultima_pausa = NOW() WHERE id = $2`, [req.body.motivo, req.params.id]);
        res.json({ sucesso: true });
    } catch (e) { res.status(500).json({erro: e.message}); }
};

exports.retomarAtendimento = async (req, res) => {
    try {
        await pool.query(`UPDATE atendimentos SET status = 'EM_ANDAMENTO', motivo_pausa = NULL, tempo_em_pausa_ms = tempo_em_pausa_ms + (EXTRACT(EPOCH FROM (NOW() - inicio_ultima_pausa)) * 1000), inicio_ultima_pausa = NULL WHERE id = $1`, [req.params.id]);
        res.json({ sucesso: true });
    } catch (e) { res.status(500).json({erro: e.message}); }
};

exports.transferirAtendimento = async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const resAtual = await client.query('SELECT * FROM atendimentos WHERE id = $1', [req.params.id]);
        const at = resAtual.rows[0];
        if (!at) throw new Error("Atendimento não encontrado.");

        await client.query(`UPDATE atendimentos SET status = 'TRANSFERIDO', data_fim = NOW(), tempo_em_pausa_ms = CASE WHEN status = 'PAUSADO' THEN tempo_em_pausa_ms + (EXTRACT(EPOCH FROM (NOW() - inicio_ultima_pausa)) * 1000) ELSE tempo_em_pausa_ms END WHERE id = $1`, [req.params.id]);
        
        await client.query(`INSERT INTO atendimentos (numero_atendimento, tipo_id, usuario_id, setor_id, origem, prioridade, data_solicitacao, data_inicio, status) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), 'EM_ANDAMENTO')`, [at.numero_atendimento, at.tipo_id, req.body.novo_usuario_id, at.setor_id, at.origem, at.prioridade, at.data_solicitacao]);

        await client.query('COMMIT');
        res.json({ sucesso: true });
    } catch (e) {
        await client.query('ROLLBACK');
        res.status(500).json({erro: e.message});
    } finally { client.release(); }
};

exports.listarConcluidos = async (req, res) => {
    try {
        const { setor_id, data_inicio, data_fim, usuario_id, tipo_id } = req.query;
        // Mostra concluidos E transferidos no relatorio
        let query = `SELECT a.*, t.nome as tipo_nome, u.nome as usuario_nome FROM atendimentos a JOIN tipos_atendimento t ON a.tipo_id = t.id JOIN usuarios u ON a.usuario_id = u.id WHERE a.status IN ('CONCLUIDO', 'TRANSFERIDO')`;
        const params = []; let paramIndex = 1;
        if (setor_id && setor_id !== 'todos') { query += ` AND a.setor_id = $${paramIndex++}`; params.push(setor_id); }
        if (data_inicio) { query += ` AND DATE(a.data_inicio) >= $${paramIndex++}`; params.push(data_inicio); }
        if (data_fim) { query += ` AND DATE(a.data_inicio) <= $${paramIndex++}`; params.push(data_fim); }
        if (usuario_id) { query += ` AND a.usuario_id = $${paramIndex++}`; params.push(usuario_id); }
        if (tipo_id) { query += ` AND a.tipo_id = $${paramIndex++}`; params.push(tipo_id); }
        query += ` ORDER BY a.data_fim DESC`;
        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (e) { res.status(500).json({erro: e.message}); }
};

exports.cadastrarFila = async (req, res) => {
    try {
        const { numero_atendimento, tipo_id, setor_id, origem, prioridade } = req.body;
        await pool.query(`INSERT INTO atendimentos (numero_atendimento, tipo_id, setor_id, origem, prioridade, status, data_solicitacao) VALUES ($1, $2, $3, $4, $5, 'PENDENTE', NOW())`, [numero_atendimento, tipo_id, setor_id, origem, prioridade]);
        res.json({ sucesso: true });
    } catch (e) { res.status(500).json({erro: e.message}); }
};

exports.listarFila = async (req, res) => {
    try {
        const { setor_id } = req.query;
        let query = `SELECT a.*, t.nome as tipo_nome FROM atendimentos a JOIN tipos_atendimento t ON a.tipo_id = t.id WHERE a.status = 'PENDENTE'`;
        const params = [];
        if (setor_id && setor_id !== 'todos') { query += ` AND a.setor_id = $1`; params.push(setor_id); }
        query += ` ORDER BY CASE a.prioridade WHEN 'Alta' THEN 1 WHEN 'Média' THEN 2 ELSE 3 END, a.data_solicitacao ASC`;
        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (e) { res.status(500).json({erro: e.message}); }
};

exports.atualizarFila = async (req, res) => {
    try {
        const { numero_atendimento, prioridade, origem, tipo_id, setor_id } = req.body;
        await pool.query(`UPDATE atendimentos SET numero_atendimento=$1, prioridade=$2, origem=$3, tipo_id=$4, setor_id=$5 WHERE id=$6`, [numero_atendimento, prioridade, origem, tipo_id, setor_id, req.params.id]);
        res.json({ sucesso: true });
    } catch (e) { res.status(500).json({erro: e.message}); }
};

exports.assumirTicket = async (req, res) => {
    try {
        const { usuario_id } = req.body;
        await pool.query(`UPDATE atendimentos SET status = 'EM_ANDAMENTO', usuario_id = $1, data_inicio = NOW() WHERE id = $2`, [usuario_id, req.params.id]);
        res.json({ sucesso: true });
    } catch (e) { res.status(500).json({erro: e.message}); }
};

exports.excluirAtendimento = async (req, res) => {
    try {
        await pool.query(`DELETE FROM atendimentos WHERE id=$1`, [req.params.id]);
        res.json({ sucesso: true });
    } catch (e) { res.status(500).json({erro: e.message}); }
};