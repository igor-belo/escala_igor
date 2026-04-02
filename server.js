const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const pool = require('./src/config/db');
const setoresRoutes = require('./src/routes/setoresRoutes');
const tiposRoutes = require('./src/routes/tiposRoutes');
const authRoutes = require('./src/routes/authRoutes');
const usuariosRoutes = require('./src/routes/usuariosRoutes');
const atendimentosRoutes = require('./src/routes/atendimentosRoutes');
const escalaRoutes = require('./src/routes/escalaRoutes');
const observacoesRoutes = require('./src/routes/observacoesRoutes');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/api/setores', setoresRoutes);
app.use('/api/tipos_atendimento', tiposRoutes);
app.use('/api/usuarios', usuariosRoutes);
app.use('/api', authRoutes);
app.use('/api/atendimentos', atendimentosRoutes);
app.use('/api/escala', escalaRoutes);
app.use('/api/observacoes', observacoesRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`SERVIDOR RODANDO NA PORTA ${PORT}`));