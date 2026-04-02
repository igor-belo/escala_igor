const express = require('express');
const router = express.Router();
const atendimentosController = require('../controllers/atendimentosController');

router.get('/ativos', atendimentosController.listarAtivos);
router.post('/', atendimentosController.iniciarAtendimento);
router.put('/:id/finalizar', atendimentosController.finalizarAtendimento);

// AS ROTAS NOVAS
router.put('/:id/pausar', atendimentosController.pausarAtendimento);
router.put('/:id/retomar', atendimentosController.retomarAtendimento);
router.put('/:id/transferir', atendimentosController.transferirAtendimento);

router.get('/concluidos', atendimentosController.listarConcluidos);
router.post('/fila', atendimentosController.cadastrarFila);
router.get('/fila', atendimentosController.listarFila);
router.put('/fila/:id', atendimentosController.atualizarFila);
router.put('/:id/assumir', atendimentosController.assumirTicket);
router.delete('/:id', atendimentosController.excluirAtendimento);

module.exports = router;