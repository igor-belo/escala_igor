const express = require('express');
const cors = require('cors');
const path = require('path');
const https = require('https');
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

// ==========================================
// MIGRATIONS — Adiciona colunas novas se não existirem
// ==========================================
async function runMigrations() {
    const migrations = [
        `ALTER TABLE observacoes_dia ADD COLUMN IF NOT EXISTS crm TEXT`,
        `ALTER TABLE observacoes_dia ADD COLUMN IF NOT EXISTS numero_atendimento TEXT`,
        `ALTER TABLE observacoes_dia ADD COLUMN IF NOT EXISTS assunto TEXT`,
        `ALTER TABLE observacoes_dia ADD COLUMN IF NOT EXISTS numero_contato TEXT`,
        `ALTER TABLE observacoes_dia ADD COLUMN IF NOT EXISTS cliente_responsavel TEXT`,
        `ALTER TABLE observacoes_dia ADD COLUMN IF NOT EXISTS analista_contato TEXT`,
        `ALTER TABLE observacoes_dia ADD COLUMN IF NOT EXISTS notificado BOOLEAN DEFAULT FALSE`,
        `ALTER TABLE observacoes_dia ADD COLUMN IF NOT EXISTS criado_por INTEGER`,
        `ALTER TABLE observacoes_dia ADD COLUMN IF NOT EXISTS participantes JSONB DEFAULT '[]'::jsonb`,
        `ALTER TABLE setores ADD COLUMN IF NOT EXISTS webhook_url TEXT`
    ];
    for (const sql of migrations) {
        try { await pool.query(sql); } catch (e) { console.error('[Migration]', sql, e.message); }
    }
    console.log('[Migrations] Concluídas.');
}

// ==========================================
// WEBHOOK — Envia mensagem para Google Chat
// ==========================================
function enviarWebhook(webhookUrl, mensagem) {
    if (!webhookUrl) return;
    try {
        const payload = JSON.stringify({ text: mensagem });
        const url = new URL(webhookUrl);
        const options = {
            hostname: url.hostname,
            path: url.pathname + url.search,
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) }
        };
        const req = https.request(options, (res) => {
            console.log(`[Webhook] Status: ${res.statusCode}`);
        });
        req.on('error', (e) => console.error('[Webhook] Erro:', e.message));
        req.write(payload);
        req.end();
    } catch (e) { console.error('[Webhook] Erro ao montar requisição:', e.message); }
}

function formatarMensagemChat(obs, nomeAnalistaDestinatario, emailAnalista, mencoesExtras = '') {
    const dataBr = obs.data ? obs.data.split('-').reverse().join('/') : '--';
    let msg = `🗓️ *LEMBRETE DE AGENDAMENTO — 15 minutos*\n\n` +
        `*Setor:* ${obs.nome_setor || '--'}\n` +
        `*CRM:* ${obs.crm || '--'}\n` +
        `*Atendimento:* ${obs.numero_atendimento || '--'}\n` +
        `*Assunto:* ${obs.assunto || '--'}\n` +
        `*Dia do contato:* ${dataBr}\n` +
        `*Hora do contato:* ${obs.hora ? obs.hora.substring(0, 5) : '--'}\n` +
        `*Número de contato:* ${obs.numero_contato || '--'}\n` +
        `*Cliente responsável:* ${obs.cliente_responsavel || '--'}\n` +
        `*Analista de contato:* ${nomeAnalistaDestinatario || obs.analista_contato || '--'}\n`;
        
    if (mencoesExtras.trim()) {
        msg += `*Participantes:* ${mencoesExtras.trim()}\n`;
    }
    
    msg += `*Alguma observação:* ${obs.observacao || '--'}`;
    return msg;
}

// ==========================================
// SCHEDULER — Verifica a cada 60s se há avisos para notificar
// ==========================================
async function verificarNotificacoesPendentes() {
    try {
        // Janela: notificar observações cujo data+hora esteja entre agora+14min e agora+16min
        const agora = new Date();
        const limite_min = new Date(agora.getTime() + 14 * 60 * 1000);
        const limite_max = new Date(agora.getTime() + 16 * 60 * 1000);

        // Usa o horário local do Brasil para determinar a data de hoje
        // e compara a janela de 14-16 minutos diretamente no banco
        const resultado = await pool.query(`
            SELECT o.id,
                   TO_CHAR(o.data, 'YYYY-MM-DD') AS data,
                   TO_CHAR(o.hora, 'HH24:MI') AS hora,
                   o.observacao, o.crm, o.numero_atendimento, o.assunto,
                   o.numero_contato, o.cliente_responsavel, o.analista_contato,
                   o.usuario_id, o.criado_por, o.participantes,
                   u_dest.nome AS nome_analista, u_dest.email AS email_analista,
                   s.nome AS nome_setor, s.webhook_url AS webhook_setor
            FROM observacoes_dia o
            LEFT JOIN usuarios u_dest ON o.usuario_id = u_dest.id
            LEFT JOIN setores s ON o.setor_id = s.id
            WHERE o.notificado = FALSE
              AND o.hora IS NOT NULL
              AND (o.data + o.hora) BETWEEN
                  (NOW() AT TIME ZONE 'America/Sao_Paulo' + INTERVAL '14 minutes')
                  AND (NOW() AT TIME ZONE 'America/Sao_Paulo' + INTERVAL '16 minutes')
        `);

        for (const obs of resultado.rows) {
            let mencoesExtras = '';
            if (obs.participantes && Array.isArray(obs.participantes) && obs.participantes.length > 0) {
                try {
                    const resPart = await pool.query('SELECT nome FROM usuarios WHERE id = ANY($1::int[])', [obs.participantes]);
                    for (const p of resPart.rows) {
                        if (p.nome && p.nome !== obs.nome_analista) mencoesExtras += `${p.nome}, `;
                    }
                    if (mencoesExtras.endsWith(', ')) mencoesExtras = mencoesExtras.slice(0, -2);
                } catch(err) { console.error('[Scheduler] Erro ao buscar participantes extras:', err.message); }
            }

            console.log(`[Scheduler] Notificando observação ID ${obs.id} — ${obs.assunto || obs.observacao}`);
            const mensagem = formatarMensagemChat(obs, obs.nome_analista, obs.email_analista, mencoesExtras);

            // Envia para o webhook configurado no setor
            if (obs.webhook_setor) {
                enviarWebhook(obs.webhook_setor, mensagem);
            }

            // Marca como notificado
            await pool.query('UPDATE observacoes_dia SET notificado = TRUE WHERE id = $1', [obs.id]);
        }
    } catch (e) { console.error('[Scheduler] Erro:', e.message); }
}

// Endpoint para ser chamado pelo Vercel Cron Job
app.get('/api/cron/notificacoes', async (req, res) => {
    try {
        await verificarNotificacoesPendentes();
        res.status(200).send('Cron de notificações executado com sucesso');
    } catch (e) {
        res.status(500).send(e.message);
    }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, async () => {
    console.log(`SERVIDOR RODANDO NA PORTA ${PORT}`);
    await runMigrations();
    // Inicia o scheduler a cada 60 segundos
    setInterval(verificarNotificacoesPendentes, 60 * 1000);
    console.log('[Scheduler] Iniciado — verifica notificações a cada 60s.');
});