const express = require('express');
const router = express.Router();
const setoresController = require('../controllers/setoresController');

router.get('/', setoresController.listarSetores);
router.post('/', setoresController.criarSetor);
router.put('/:id', setoresController.atualizarSetor);
router.delete('/:id', setoresController.deletarSetor);

module.exports = router;