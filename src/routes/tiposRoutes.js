const express = require('express');
const router = express.Router();
const tiposController = require('../controllers/tiposController');

router.get('/', tiposController.listarTipos);
router.post('/', tiposController.criarTipo);
router.put('/:id', tiposController.atualizarTipo);
router.delete('/:id', tiposController.deletarTipo);

module.exports = router;