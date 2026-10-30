const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "secreta_padrao_dev";
const JWT_EXPIRATION = "12h";

function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRATION });
}

function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

function setTokenCookie(res, token) {
  res.cookie("auth_token", token, {
    httpOnly: true,
    secure: false, // Desabilitado para permitir acesso via HTTP na rede local
    sameSite: "lax", // Lax permite navegação mais segura em redes mistas
    maxAge: 12 * 60 * 60 * 1000,
  });
}

function clearTokenCookie(res) {
  res.clearCookie("auth_token", {
    httpOnly: true,
    secure: false,
    sameSite: "lax",
  });
}

module.exports = { signToken, verifyToken, setTokenCookie, clearTokenCookie, JWT_SECRET };
