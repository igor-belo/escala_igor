const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

// Rota de teste para ver se o Vercel "acorda"
app.get('/api/teste', (req, res) => {
    res.json({ status: 'Rodando no Vercel!', data: new Date() });
});

// Exportar para o Vercel
module.exports = app;