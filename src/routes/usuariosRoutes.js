const express = require("express");
const router = express.Router();
const usuariosController = require("../controllers/usuariosController");
router.get("/", usuariosController.listarUsuarios);
router.get("/ativos", usuariosController.listarUsuariosAtivos);
router.post("/", usuariosController.criarUsuario);
router.put("/:id", usuariosController.atualizarUsuario);
router.post("/:id/resetar-senha", usuariosController.resetarSenha);
module.exports = router;
