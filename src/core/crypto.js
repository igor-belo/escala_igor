const crypto = require("crypto");

const ALGORITHM = "aes-256-cbc";

function getCryptoKey() {
  const key = process.env.CRYPTO_KEY || "e5c2f8a1b9d4e7f0a3c6b9d2e5f8a1b4";
  return crypto.createHash("sha256").update(key).digest();
}

function encrypt(text) {
  if (!text) return "";
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, getCryptoKey(), iv);
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  return iv.toString("hex") + ":" + encrypted;
}

function decrypt(text) {
  if (!text || !text.includes(":")) return text || "";
  const [ivHex, encrypted] = text.split(":");
  const iv = Buffer.from(ivHex, "hex");
  const decipher = crypto.createDecipheriv(ALGORITHM, getCryptoKey(), iv);
  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

module.exports = { encrypt, decrypt };
