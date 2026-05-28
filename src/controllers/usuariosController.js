// Arquivo: src/controllers/usuariosController.js
const pool = require('../config/db');
const bcrypt = require('bcryptjs');

exports.listarUsuarios = async (req, res) => {
    try { 
        res.json((await pool.query(`SELECT u.*, s.nome as setor FROM usuarios u LEFT JOIN setores s ON u.setor_id = s.id ORDER BY u.ativo DESC, u.nome`)).rows); 
    } catch (erro) { res.status(500).json({ erro: 'Erro ao buscar usuários' }); }
};

exports.criarUsuario = async (req, res) => {
    try {
        const { email, nome, tipo_perfil, setor_id, horarios_semana, funcao_fixa, fixa_inicio, fixa_fim, ativo, webhook_url } = req.body;
        const login = email.split('@')[0];
        const senhaCripto = await bcrypt.hash('123456', 10);
        await pool.query(
            `INSERT INTO usuarios (email, login, nome, tipo_perfil, setor_id, horarios_semana, funcao_fixa, fixa_inicio, fixa_fim, senha, primeiro_acesso, ativo, webhook_url) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, true, $11, $12)`,
            [email, login, nome, tipo_perfil, tipo_perfil === 'ANALISTA' ? setor_id : null, tipo_perfil === 'ANALISTA' ? horarios_semana : null, funcao_fixa || null, fixa_inicio || null, fixa_fim || null, senhaCripto, ativo !== false, webhook_url || null]
        );
        res.status(201).json({ sucesso: true });
    } catch (erro) { res.status(500).json({ erro: 'Erro ao cadastrar usuário' }); }
};

exports.atualizarUsuario = async (req, res) => {
    try {
        const { id } = req.params;
        const { nome, email, tipo_perfil, setor_id, horarios_semana, funcao_fixa, fixa_inicio, fixa_fim, ativo, webhook_url } = req.body;
        await pool.query(
            `UPDATE usuarios SET nome=$1, email=$2, tipo_perfil=$3, setor_id=$4, horarios_semana=$5, funcao_fixa=$6, fixa_inicio=$7, fixa_fim=$8, ativo=$9, webhook_url=$10 WHERE id=$11`,
            [nome, email, tipo_perfil, tipo_perfil === 'ANALISTA' ? setor_id : null, tipo_perfil === 'ANALISTA' ? horarios_semana : null, funcao_fixa || null, fixa_inicio || null, fixa_fim || null, ativo !== false, webhook_url || null, id]
        );
        res.json({ sucesso: true });
    } catch (erro) { res.status(500).json({ erro: 'Erro ao atualizar usuário' }); }
};