const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const rateLimit = require("express-rate-limit");
const { validate } = require("../middleware/validateMiddleware");
const { z } = require("zod");

const loginSchema = z.object({
  identificador: z.string().min(1, "Preencha o usuário/email"),
  senha: z.string().min(1, "Preencha a senha")
});

const googleSchema = z.object({
  token: z.string().min(1, "Token do Google é obrigatório")
});

const alterarSenhaSchema = z.object({
  id: z.number().int().positive(),
  novaSenha: z.string().min(6, "A nova senha deve ter no mínimo 6 caracteres")
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // Limita cada IP a 5 tentativas por `window` (aqui, por 15 minutos)
  message: { erro: "Muitas tentativas de login a partir deste IP. Por favor, tente novamente após 15 minutos." },
  standardHeaders: true, 
  legacyHeaders: false, 
});

router.post("/login", loginLimiter, validate(loginSchema), authController.login);
router.post("/google", loginLimiter, validate(googleSchema), authController.loginGoogle);
router.post("/alterar-senha", validate(alterarSenhaSchema), authController.alterarSenha);
router.post("/logout", authController.logout);

module.exports = router;
