const { listarLogs, contarLogs } = require('../services/auditService');

exports.listarLogs = async (req, res) => {
    try {
        const { usuario_id, acao, tabela, data_inicio, data_fim, page = 1, limit = 50 } = req.query;
        
        const offset = (parseInt(page) - 1) * parseInt(limit);
        
        const [logs, total] = await Promise.all([
            listarLogs({
                usuario_id,
                acao,
                tabela,
                data_inicio,
                data_fim,
                limit: parseInt(limit),
                offset
            }),
            contarLogs({
                usuario_id,
                acao,
                tabela,
                data_inicio,
                data_fim
            })
        ]);
        
        res.json({
            logs,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                total_pages: Math.ceil(total / parseInt(limit))
            }
        });
    } catch (e) {
        console.error('[LOGS] Erro ao listar logs:', e);
        res.status(500).json({ erro: e.message });
    }
};

exports.listarAcoes = async (req, res) => {
    try {
        const result = await require('../config/db').query(
            `SELECT DISTINCT acao FROM logs_auditoria ORDER BY acao`
        );
        res.json(result.rows.map(r => r.acao));
    } catch (e) {
        res.status(500).json({ erro: e.message });
    }
};

exports.listarTabelas = async (req, res) => {
    try {
        const result = await require('../config/db').query(
            `SELECT DISTINCT tabela FROM logs_auditoria WHERE tabela IS NOT NULL ORDER BY tabela`
        );
        res.json(result.rows.map(r => r.tabela));
    } catch (e) {
        res.status(500).json({ erro: e.message });
    }
};
