const pool = require("../config/db");

exports.listar = async (req, res) => {
  try {
    const query = `
            SELECT a.*, u.nome as usuario_abertura 
            FROM alinhamentos a 
            LEFT JOIN usuarios u ON a.usuario_abertura_id = u.id 
            ORDER BY a.data_criacao DESC
        `;
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (erro) {
    res.status(500).json({ erro: erro.message });
  }
};

exports.criar = async (req, res) => {
  try {
    const {
      usuario_abertura_id,
      numero_atendimento,
      ocorrencia,
      aberto_por_texto,
      data_ocorrencia,
    } = req.body;
    await pool.query(
      `INSERT INTO alinhamentos (usuario_abertura_id, numero_atendimento, ocorrencia, aberto_por_texto, data_ocorrencia) VALUES ($1, $2, $3, $4, $5)`,
      [
        usuario_abertura_id,
        numero_atendimento,
        ocorrencia,
        aberto_por_texto || null,
        data_ocorrencia || null,
      ],
    );
    res.json({ sucesso: true });
  } catch (e) {
    res.status(500).json({ erro: e.message });
  }
};

exports.marcarAlinhado = async (req, res) => {
  try {
    const { id } = req.params;
    const { alinhado } = req.body; // true or false
    await pool.query(`UPDATE alinhamentos SET alinhado = $1 WHERE id = $2`, [
      alinhado,
      id,
    ]);
    res.json({ sucesso: true });
  } catch (e) {
    res.status(500).json({ erro: e.message });
  }
};
