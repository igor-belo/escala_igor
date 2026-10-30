const express = require("express");
const router = express.Router();
const { executarLimpezaManual } = require("../services/cleanupService");

/**
 * Endpoint para executar limpeza manual de escalas antigas
 * GET /api/cleanup/executar
 */
router.get("/executar", async (req, res) => {
  try {
    const resultado = await executarLimpezaManual();
    res.json({
      sucesso: true,
      mensagem: "Limpeza executada com sucesso",
      detalhes: resultado
    });
  } catch (erro) {
    res.status(500).json({ 
      erro: "Erro ao executar limpeza",
      mensagem: erro.message 
    });
  }
});

/**
 * Endpoint para verificar quantos registros seriam removidos (simulação)
 * GET /api/cleanup/preview
 */
router.get("/preview", async (req, res) => {
  try {
    const pool = require("../config/db");
    
    const dataLimite = new Date();
    dataLimite.setMonth(dataLimite.getMonth() - 2);
    const dataLimiteStr = dataLimite.toISOString().split('T')[0];
    
    const escalas = await pool.query(
      'SELECT COUNT(*) FROM escala WHERE data < $1',
      [dataLimiteStr]
    );
    
    const observacoes = await pool.query(
      'SELECT COUNT(*) FROM observacoes_dia WHERE data < $1',
      [dataLimiteStr]
    );
    
    res.json({
      dataLimite: dataLimiteStr,
      escalasARemover: parseInt(escalas.rows[0].count),
      observacoesARemover: parseInt(observacoes.rows[0].count),
      mensagem: `Registros anteriores a ${dataLimiteStr} serão removidos`
    });
  } catch (erro) {
    res.status(500).json({ 
      erro: "Erro ao verificar preview",
      mensagem: erro.message 
    });
  }
});

module.exports = router;
