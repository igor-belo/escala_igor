const pool = require('../config/db');

exports.listarSetores = async (req, res) => {
    try { 
        const result = await pool.query('SELECT * FROM setores ORDER BY nome');
        res.json(result.rows); 
    } catch (erro) { 
        res.status(500).json({ erro: 'Erro ao buscar setores' }); 
    }
};

exports.criarSetor = async (req, res) => {
    try {
        await pool.query('INSERT INTO setores (nome) VALUES ($1)', [req.body.nome]);
        res.json({ sucesso: true });
    } catch (e) { res.status(500).json({erro: e.message}); }
};

exports.atualizarSetor = async (req, res) => {
    try {
        await pool.query('UPDATE setores SET nome=$1 WHERE id=$2', [req.body.nome, req.params.id]);
        res.json({ sucesso: true });
    } catch (e) { res.status(500).json({erro: e.message}); }
};

exports.deletarSetor = async (req, res) => {
    try {
        await pool.query('DELETE FROM setores WHERE id=$1', [req.params.id]);
        res.json({ sucesso: true });
    } catch (e) { 
        res.status(500).json({erro: "Não é possível excluir um setor que já possui usuários ou atendimentos vinculados."}); 
    }
};