const { z } = require('zod');

exports.validate = (schema) => (req, res, next) => {
  try {
    schema.parse(req.body);
    next();
  } catch (error) {
    return res.status(400).json({
      erro: "Dados inválidos na requisição.",
      detalhes: error.errors
    });
  }
};
