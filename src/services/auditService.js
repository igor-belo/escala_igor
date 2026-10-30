const pool = require('../config/db');

/**
 * Registra um log de auditoria no banco de dados
 * @param {Object} logData - Dados do log
 * @param {number} logData.usuario_id - ID do usuário que executou a ação
 * @param {string} logData.usuario_nome - Nome do usuário
 * @param {string} logData.acao - Ação realizada (ex: 'USUARIO_CRIADO', 'ESCALA_EDITADA')
 * @param {string} logData.tabela - Tabela afetada (opcional)
 * @param {number} logData.registro_id - ID do registro afetado (opcional)
 * @param {Object} logData.detalhes - Detalhes adicionais em JSON (opcional)
 * @param {string} logData.ip_address - IP do cliente (opcional)
 * @param {string} logData.user_agent - User agent do navegador (opcional)
 */
async function registrarLog({
    usuario_id,
    usuario_nome,
    acao,
    tabela = null,
    registro_id = null,
    detalhes = null,
    ip_address = null,
    user_agent = null
}) {
    try {
        await pool.query(
            `INSERT INTO logs_auditoria 
            (usuario_id, usuario_nome, acao, tabela, registro_id, detalhes, ip_address, user_agent) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [
                usuario_id,
                usuario_nome,
                acao,
                tabela,
                registro_id,
                detalhes ? JSON.stringify(detalhes) : null,
                ip_address,
                user_agent
            ]
        );
    } catch (error) {
        // Não quebrar a aplicação se o log falhar
        console.error('[AUDIT] Erro ao registrar log:', error.message);
    }
}

/**
 * Extrai informações da requisição para o log
 */
function extrairInfoRequisicao(req) {
    const ip = req.ip || 
               req.headers['x-forwarded-for']?.split(',')[0] || 
               req.headers['x-real-ip'] || 
               req.connection?.remoteAddress || 
               'unknown';
    
    const userAgent = req.headers['user-agent'] || 'unknown';
    
    return { ip_address: ip, user_agent: userAgent };
}

/**
 * Listar logs com filtros
 */
async function listarLogs({ 
    usuario_id = null, 
    acao = null, 
    tabela = null,
    data_inicio = null,
    data_fim = null,
    limit = 100,
    offset = 0
}) {
    let query = `
        SELECT l.*, u.email as usuario_email
        FROM logs_auditoria l
        LEFT JOIN usuarios u ON l.usuario_id = u.id
        WHERE 1=1
    `;
    
    const params = [];
    let paramIndex = 1;
    
    if (usuario_id) {
        query += ` AND l.usuario_id = $${paramIndex++}`;
        params.push(usuario_id);
    }
    
    if (acao) {
        query += ` AND l.acao = $${paramIndex++}`;
        params.push(acao);
    }
    
    if (tabela) {
        query += ` AND l.tabela = $${paramIndex++}`;
        params.push(tabela);
    }
    
    if (data_inicio) {
        query += ` AND DATE(l.criado_em) >= $${paramIndex++}`;
        params.push(data_inicio);
    }
    
    if (data_fim) {
        query += ` AND DATE(l.criado_em) <= $${paramIndex++}`;
        params.push(data_fim);
    }
    
    query += ` ORDER BY l.criado_em DESC LIMIT $${paramIndex++} OFFSET $${paramIndex}`;
    params.push(limit, offset);
    
    const result = await pool.query(query, params);
    return result.rows;
}

/**
 * Contar total de logs (para paginação)
 */
async function contarLogs({ 
    usuario_id = null, 
    acao = null, 
    tabela = null,
    data_inicio = null,
    data_fim = null
}) {
    let query = `SELECT COUNT(*) as total FROM logs_auditoria WHERE 1=1`;
    
    const params = [];
    let paramIndex = 1;
    
    if (usuario_id) {
        query += ` AND usuario_id = $${paramIndex++}`;
        params.push(usuario_id);
    }
    
    if (acao) {
        query += ` AND acao = $${paramIndex++}`;
        params.push(acao);
    }
    
    if (tabela) {
        query += ` AND tabela = $${paramIndex++}`;
        params.push(tabela);
    }
    
    if (data_inicio) {
        query += ` AND DATE(criado_em) >= $${paramIndex++}`;
        params.push(data_inicio);
    }
    
    if (data_fim) {
        query += ` AND DATE(criado_em) <= $${paramIndex++}`;
        params.push(data_fim);
    }
    
    const result = await pool.query(query, params);
    return parseInt(result.rows[0].total);
}

module.exports = {
    registrarLog,
    extrairInfoRequisicao,
    listarLogs,
    contarLogs
};
