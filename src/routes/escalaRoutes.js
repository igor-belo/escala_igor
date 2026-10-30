const express = require("express");
const router = express.Router();
const escalaController = require("../controllers/escalaController");
router.get("/", escalaController.listarEscala);
router.get("/relatorio", escalaController.relatorioEscala);
router.put("/periodo", escalaController.atualizarEscalaPeriodo);
router.put("/:id", escalaController.atualizarEscala);
router.post("/gerar", escalaController.gerarEscalaAntiga);
router.post("/check_conflito", escalaController.checkConflito);
router.post("/gerar_custom", escalaController.gerarEscalaCustom);
router.post("/inserir", escalaController.inserirEscala);
module.exports = router;

