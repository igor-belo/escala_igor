const express = require("express");
const router = express.Router();
const alinhamentosController = require("../controllers/alinhamentosController");

router.get("/", alinhamentosController.listar);
router.post("/", alinhamentosController.criar);
router.put("/:id/alinhar", alinhamentosController.marcarAlinhado);

module.exports = router;
