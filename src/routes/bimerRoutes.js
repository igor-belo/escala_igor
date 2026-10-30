const express = require("express");
const router = express.Router();
const bimerController = require("../controllers/bimerController");
router.get("/config", bimerController.getConfig);
router.put("/config", bimerController.saveConfig);
router.get("/buscar-usuario", bimerController.buscarUsuario);
router.post("/preview", bimerController.preview);
router.post("/lancar", bimerController.lancar);
module.exports = router;

