const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

// Importação das rotas originais
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

// Servir arquivos estáticos da pasta public
app.use(express.static(path.join(__dirname, 'public')));

// Registro das Rotas da API
app.use('/api/setores', setoresRoutes);
app.use('/api/tipos_atendimento', tiposRoutes);
app.use('/api/usuarios', usuariosRoutes);
app.use('/api', authRoutes);
app.use('/api/atendimentos', atendimentosRoutes);
app.use('/api/escala', escalaRoutes);
app.use('/api/observacoes', observacoesRoutes);

// ROTA RAIZ: Para evitar o "Cannot GET /" e carregar seu frontend
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Fallback para rotas não encontradas no Frontend (útil para SPAs)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;

// IMPORTANTE: No Vercel, o app.listen pode causar erros se rodar sempre.
// Esta condicional garante que ele rode localmente, mas deixe o Vercel gerenciar em produção.
if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => console.log(`SERVIDOR RODANDO NA PORTA ${PORT}`));
}

// Essencial para o Vercel identificar o entry point
module.exports = app;