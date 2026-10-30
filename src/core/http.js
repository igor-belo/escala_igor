const https = require("https");

function httpsPost(url, payload, headers) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const data = typeof payload === "string" ? payload : JSON.stringify(payload);
    const options = {
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      method: "POST",
      headers: {
        ...headers,
        "Content-Length": Buffer.byteLength(data),
      },
    };
    const req = https.request(options, (res) => {
      let body = "";
      res.on("data", (chunk) => (body += chunk));
      res.on("end", () => {
        resolve({ status: res.statusCode, body });
      });
    });
    req.on("error", reject);
    req.write(data);
    req.end();
  });
}

function enviarWebhook(webhookUrl, mensagem) {
  return new Promise((resolve) => {
    if (!webhookUrl) return resolve();
    try {
      const payload = JSON.stringify({ text: mensagem });
      const url = new URL(webhookUrl);
      const options = {
        hostname: url.hostname,
        path: url.pathname + url.search,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(payload),
        },
      };
      const req = https.request(options, (res) => {
        console.log(`[Webhook] Status: ${res.statusCode}`);
        resolve();
      });
      req.on("error", (e) => {
        console.error("[Webhook] Erro:", e.message);
        resolve();
      });
      req.write(payload);
      req.end();
    } catch (e) {
      console.error("[Webhook] Erro ao montar requisição:", e.message);
      resolve();
    }
  });
}


function httpsGet(url, headers = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      method: "GET",
      headers,
    };
    const req = https.request(options, (res) => {
      let body = "";
      res.on("data", (chunk) => (body += chunk));
      res.on("end", () => {
        resolve({ status: res.statusCode, body });
      });
    });
    req.on("error", reject);
    req.end();
  });
}

module.exports = { httpsPost, httpsGet, enviarWebhook };
