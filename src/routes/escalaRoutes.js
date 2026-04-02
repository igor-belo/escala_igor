const express = require('express');
const router = express.Router();
const escalaController = require('../controllers/escalaController');

router.get('/', escalaController.listarEscala);
router.get('/relatorio', escalaController.relatorioEscala); // <--- ROTA NOVA AQUI
router.put('/:id', escalaController.atualizarEscala);
router.post('/gerar', escalaController.gerarEscalaAntiga);
router.post('/check_conflito', escalaController.checkConflito);
router.post('/gerar_custom', escalaController.gerarEscalaCustom);

module.exports = router;