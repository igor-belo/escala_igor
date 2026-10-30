const express = require('express');
const router = express.Router();
const logsController = require('../controllers/logsController');
const { authMiddleware } = require('../middleware/authMiddleware');

// Todas as rotas de logs requerem autenticação e perfil ADMIN
router.use(authMiddleware);
router.use((req, res, next) => {
    if (req.user.tipo_perfil !== 'ADMIN') {
        return res.status(403).json({ erro: 'Acesso negado. Apenas administradores podem ver logs.' });
    }
    next();
});

router.get('/', logsController.listarLogs);
router.get('/acoes', logsController.listarAcoes);
router.get('/tabelas', logsController.listarTabelas);

module.exports = router;
