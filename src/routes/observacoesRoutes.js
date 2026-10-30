const express = require("express");
const router = express.Router();
const escalaController = require("../controllers/escalaController");
router.get("/", escalaController.listarObservacoes);
router.post("/", escalaController.salvarObservacao);
router.delete("/:id", escalaController.deletarObservacao);
module.exports = router;
