const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const setoresRoutes = require('./src/routes/setoresRoutes');
const tiposRoutes = require('./src/routes/tiposRoutes');
const authRoutes = require('./src/routes/authRoutes');
const usuariosRoutes = require('./src/routes/usuariosRoutes');
const atendimentosRoutes = require('./src/routes/atendimentosRoutes');
const escalaRoutes = require('./src/routes/escalaRoutes');
const observacoesRoutes = require('./src/routes/observacoesRoutes');

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Rotas
app.use('/api/setores', setoresRoutes);
app.use('/api/tipos_atendimento', tiposRoutes);
app.use('/api/usuarios', usuariosRoutes);
app.use('/api', authRoutes);
app.use('/api/atendimentos', atendimentosRoutes);
app.use('/api/escala', escalaRoutes);
app.use('/api/observacoes', observacoesRoutes);

// Rota para servir o index.html em qualquer outra rota (opcional para SPAs)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Configuração da Porta
const PORT = process.env.PORT || 3000;

// Só inicia o servidor se não estiver rodando no Vercel (ambiente local)
if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => console.log(`SERVIDOR RODANDO NA PORTA ${PORT}`));
}

// Exportar para o Vercel tratar como Serverless Function
module.exports = app;