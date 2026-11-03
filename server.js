const express = require('express');
const cors = require('cors');
const path = require('path');
const helmet = require('helmet');
const { verifyToken, clearTokenCookie, enviarWebhook, isFuturo } = require('./src/core');
const envPath = process.pkg ? path.join(path.dirname(process.execPath), '.env') : path.join(process.cwd(), '.env');
require('dotenv').config({ path: envPath, override: true });

const pool = require('./src/config/db');
const setoresRoutes = require('./src/routes/setoresRoutes');
const tiposRoutes = require('./src/routes/tiposRoutes');
const authRoutes = require('./src/routes/authRoutes');
const usuariosRoutes = require('./src/routes/usuariosRoutes');
const atendimentosRoutes = require('./src/routes/atendimentosRoutes');
const escalaRoutes = require('./src/routes/escalaRoutes');
const observacoesRoutes = require('./src/routes/observacoesRoutes');
const alinhamentosRoutes = require('./src/routes/alinhamentosRoutes');
const bimerRoutes = require('./src/routes/bimerRoutes');
const cleanupRoutes = require('./src/routes/cleanupRoutes');
const authMiddleware = require('./src/middleware/authMiddleware');
const { iniciarLimpezaAutomatica } = require('./src/services/cleanupService');

const cookieParser = require('cookie-parser');
const app = express();
app.use(helmet({ 
    contentSecurityPolicy: false, // CSP desabilitado temporariamente para não quebrar scripts inline do Tailwind
    crossOriginOpenerPolicy: false, // Permite que o Google Auth funcione sem HTTPS local
    originAgentCluster: false, // Evita erro de cluster em IPs de rede local
    crossOriginResourcePolicy: false // Permite carregar recursos pela rede local
}));

const corsOptions = {
    origin: true, // Permite qualquer origem — segurança já é feita via JWT/cookies
    credentials: true // Necessário para permitir Cookies
};
app.use(cors(corsOptions));
app.use(express.json());
app.use(cookieParser());

const publicRoutes = ['/login', '/css', '/js', '/components', '/shop_icone.webp'];
const publicRoutes = ['/login', '/login.html', '/css', '/js', '/components', '/shop_icone.webp'];
const adminRoutes = ['/bimer', '/bimer-crm', '/configuracoes', '/logs'];

app.use((req, res, next) => {
    // Rotas de API são protegidas pelos middlewares nas declarações de rotas
    if (req.path.startsWith('/api')) return next();
    
    // Rotas públicas (estáticos e login) - não verificar token
    if (publicRoutes.some(pr => req.path === pr || req.path.startsWith(pr))) return next();
    
    // Protege acesso às páginas (HTML)
    if (req.path === '/' || req.path.endsWith('.html') || !path.extname(req.path)) {
        const token = req.cookies && req.cookies.auth_token;
        if (!token) {
            res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
            return res.redirect('/login.html');
        }
        
        try {
            const decoded = verifyToken(token);
            
            const isAdminRoute = adminRoutes.some(ar => req.path.startsWith(ar) || req.path === ar);
            if (isAdminRoute && decoded.tipo_perfil !== 'ADMIN') {
                return res.redirect('/'); // Usuário comum não pode acessar telas de admin
            }
            
            next();
        } catch (e) {
            clearTokenCookie(res);
            res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
            return res.redirect('/login.html');
        }
    } else {
        next();
    }
});

// Rota explícita para /login — garante que o browser nunca use cache
app.get('/login', (req, res) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    res.set('Surrogate-Control', 'no-store');
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/login.html', (req, res) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    res.set('Surrogate-Control', 'no-store');
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.use(express.static(path.join(__dirname, 'public'), { 
    extensions: ['html'],
    setHeaders: (res, filePath) => {
        if (filePath.endsWith('.html') || filePath.endsWith('.js')) {
            res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
            res.set('Pragma', 'no-cache');
            res.set('Expires', '0');
        }
    }
}));
app.use('/api', authRoutes); // Login must be unprotected
app.use('/api/setores', authMiddleware, setoresRoutes);
app.use('/api/tipos_atendimento', authMiddleware, tiposRoutes);
app.use('/api/usuarios', authMiddleware, usuariosRoutes);
app.use('/api/atendimentos', authMiddleware, atendimentosRoutes);
app.use('/api/logs', require('./src/routes/logsRoutes'));
app.use('/api/escala', authMiddleware, escalaRoutes);
app.use('/api/observacoes', authMiddleware, observacoesRoutes);
app.use('/api/alinhamentos', authMiddleware, alinhamentosRoutes);
app.use('/api/bimer', authMiddleware, bimerRoutes);
app.use('/api/cleanup', authMiddleware, cleanupRoutes);

app.get('/api/configuracoes', authMiddleware, async (req, res) => {
    try {
        const result = await pool.query('SELECT chave, valor FROM configuracoes');
        const configMap = {};
        result.rows.forEach(r => configMap[r.chave] = r.valor);
        res.json(configMap);
    } catch (e) { res.status(500).json({erro: e.message}) }
});

app.put('/api/configuracoes', authMiddleware, async (req, res) => {
    try {
        const { webhook_geral } = req.body;
        if (webhook_geral !== undefined) {
            await pool.query('UPDATE configuracoes SET valor = $1 WHERE chave = $2', [webhook_geral, 'webhook_geral']);
        }
        res.json({sucesso: true});
    } catch (e) { res.status(500).json({erro: e.message}) }
});


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
        `ALTER TABLE setores ADD COLUMN IF NOT EXISTS webhook_url TEXT`,
        `CREATE TABLE IF NOT EXISTS alinhamentos (
            id SERIAL PRIMARY KEY,
            usuario_abertura_id INTEGER REFERENCES usuarios(id),
            numero_atendimento TEXT,
            ocorrencia TEXT,
            alinhado BOOLEAN DEFAULT FALSE,
            data_criacao TIMESTAMP DEFAULT NOW()
        )`,
        `ALTER TABLE alinhamentos ADD COLUMN IF NOT EXISTS aberto_por_texto TEXT`,
        `ALTER TABLE alinhamentos ADD COLUMN IF NOT EXISTS data_ocorrencia DATE`,
        `ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS webhook_url TEXT`,
        `ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS id_bimer TEXT`,
        `ALTER TABLE observacoes_dia ADD COLUMN IF NOT EXISTS notificado_na_hora BOOLEAN DEFAULT FALSE`,
        `CREATE TABLE IF NOT EXISTS configuracoes (
            id SERIAL PRIMARY KEY,
            chave TEXT UNIQUE NOT NULL,
            valor TEXT
        )`,
        `INSERT INTO configuracoes (chave, valor) VALUES ('webhook_geral', '') ON CONFLICT (chave) DO NOTHING`,
        `CREATE TABLE IF NOT EXISTS atendimentos_bimer_abertos (
            id SERIAL PRIMARY KEY,
            pessoa TEXT,
            numero_atendimento TEXT,
            data_proximo_contato TEXT,
            data_atualizacao TIMESTAMP DEFAULT NOW()
        )`
    ];
    for (const sql of migrations) {
        try { await pool.query(sql); } catch (e) { console.error('[Migration]', sql, e.message); }
    }
    console.log('[Migrations] Concluídas.');
}


function formatarMensagemChat(obs, nomeAnalistaDestinatario, emailAnalista, mencoesExtras = '') {
    const dataBr = obs.data ? obs.data.split('-').reverse().join('/') : '--';
    let msg = `🗓️ *LEMBRETE DE AGENDAMENTO*\n\n` +
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

async function processarAvisos(resultado, campoParaAtualizar, msgPrefixo) {
    let webhook_geral = null;
    try {
        const resConf = await pool.query("SELECT valor FROM configuracoes WHERE chave = 'webhook_geral'");
        if (resConf.rows.length > 0) webhook_geral = resConf.rows[0].valor;
    } catch (e) {}

    for (const obs of resultado.rows) {
        let mencoesExtras = '';
        let webhooksParticipantes = [];
        if (obs.participantes && Array.isArray(obs.participantes) && obs.participantes.length > 0) {
            try {
                const resPart = await pool.query('SELECT nome, webhook_url FROM usuarios WHERE id = ANY($1::int[])', [obs.participantes]);
                for (const p of resPart.rows) {
                    if (p.nome && p.nome !== obs.nome_analista) mencoesExtras += `${p.nome}, `;
                    if (p.webhook_url && p.webhook_url !== obs.webhook_usuario) webhooksParticipantes.push(p.webhook_url);
                }
                if (mencoesExtras.endsWith(', ')) mencoesExtras = mencoesExtras.slice(0, -2);
            } catch (err) { console.error('[Scheduler] Erro ao buscar participantes extras:', err.message); }
        }

        console.log(`[Scheduler] Notificando observação ID ${obs.id} — ${msgPrefixo} — ${obs.assunto || obs.observacao}`);
        const baseMsg = formatarMensagemChat(obs, obs.nome_analista, obs.email_analista, mencoesExtras);
        const mensagem = msgPrefixo ? `*${msgPrefixo}*\n\n${baseMsg}` : baseMsg;

        // Enviar para o setor
        if (obs.webhook_setor) {
            await enviarWebhook(obs.webhook_setor, mensagem);
        }
        // Enviar para o usuário
        if (obs.webhook_usuario) {
            await enviarWebhook(obs.webhook_usuario, mensagem);
        }
        // Enviar para webhook de acompanhamento geral
        if (webhook_geral) {
            await enviarWebhook(webhook_geral, mensagem);
        }
        // Enviar para os participantes
        for (const wp of webhooksParticipantes) {
            if (wp !== obs.webhook_setor && wp !== webhook_geral) {
                await enviarWebhook(wp, mensagem);
            }
        }

        await pool.query(`UPDATE observacoes_dia SET ${campoParaAtualizar} = TRUE WHERE id = $1`, [obs.id]);
    }
}

async function verificarNotificacoesPendentes() {
    try {
        const baseQuery = `
            SELECT o.id,
                   TO_CHAR(o.data, 'YYYY-MM-DD') AS data,
                   TO_CHAR(o.hora, 'HH24:MI') AS hora,
                   o.observacao, o.crm, o.numero_atendimento, o.assunto,
                   o.numero_contato, o.cliente_responsavel, o.analista_contato,
                   o.usuario_id, o.criado_por, o.participantes,
                   u_dest.nome AS nome_analista, u_dest.email AS email_analista,
                   u_dest.webhook_url AS webhook_usuario,
                   s.nome AS nome_setor, s.webhook_url AS webhook_setor
            FROM observacoes_dia o
            LEFT JOIN usuarios u_dest ON o.usuario_id = u_dest.id
            LEFT JOIN setores s ON o.setor_id = s.id
            WHERE o.hora IS NOT NULL
        `;

        // 1. Notificações 10 minutos antes (ou criadas já no intervalo de 10 min)
        const res10 = await pool.query(`
            ${baseQuery}
            AND o.notificado = FALSE
            AND (o.data + o.hora) > (NOW() AT TIME ZONE 'America/Sao_Paulo' + INTERVAL '1 minutes')
            AND (o.data + o.hora) <= (NOW() AT TIME ZONE 'America/Sao_Paulo' + INTERVAL '10 minutes')
        `);
        if (res10.rowCount > 0) {
            await processarAvisos(res10, 'notificado', 'O aviso abaixo começará em breve (menos de 10 minutos)!');
        }

        // 2. Notificações na hora exata (abrangendo até 1 hora de atraso caso o servidor estivesse desligado)
        const resHora = await pool.query(`
            ${baseQuery}
            AND o.notificado_na_hora = FALSE
            AND (o.data + o.hora) >= (NOW() AT TIME ZONE 'America/Sao_Paulo' - INTERVAL '1 hour')
            AND (o.data + o.hora) <= (NOW() AT TIME ZONE 'America/Sao_Paulo' + INTERVAL '1 minutes')
        `);
        if (resHora.rowCount > 0) {
            await processarAvisos(resHora, 'notificado_na_hora', 'O aviso abaixo está começando AGORA!');
        }

    } catch (e) { console.error('[Scheduler] Erro:', e.message); }
}

app.get('/api/cron/notificacoes', async (req, res) => {
    try {
        await verificarNotificacoesPendentes();
        res.status(200).send('Cron de notificações executado com sucesso');
    } catch (e) {
        res.status(500).send(e.message);
    }
});

app.get('/api/bimer-scraping/atendimentos-abertos', authMiddleware, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM atendimentos_bimer_abertos ORDER BY id ASC');
        res.json(result.rows);
    } catch (e) { res.status(500).json({erro: e.message}); }
});

app.post('/api/bimer-scraping/sync', authMiddleware, async (req, res) => {
    try {
        const { runBimerScraper } = require('./src/services/bimerScraper');
        runBimerScraper();
        res.json({sucesso: true, mensagem: 'Sincronização iniciada em background.'});
    } catch (e) { res.status(500).json({erro: e.message}); }
});

app.post('/api/bimer-scraping/notificar', authMiddleware, async (req, res) => {
    try {
        await enviarWebhooksBimer();
        res.json({sucesso: true, mensagem: 'Notificações enviadas com sucesso.'});
    } catch (e) { res.status(500).json({erro: e.message}); }
});

async function enviarWebhooksBimer() {
    try {
        const resAbertos = await pool.query("SELECT * FROM atendimentos_bimer_abertos");
        const tickets = resAbertos.rows;
        
        const filterQueues = {
            'analisebaseshop': 'Retaguarda',
            'layoutshop': 'Retaguarda',
            'scriptsql': 'Retaguarda',
            'segundonivelshop': 'Segundo Nível Shop',
            'segundonivel.spice': 'Segundo Nível Spice'
        };
        
        // Separa os tickets por pessoa
        const gruposTickets = {};
        for (const t of tickets) {
            const p = t.pessoa ? t.pessoa.toLowerCase() : '';
            if (p.includes('igorbelo')) continue;
            if (!gruposTickets[p]) gruposTickets[p] = [];
            gruposTickets[p].push(t);
        }
        
        const qUsers = `
            SELECT u.id, u.nome, u.login, u.webhook_url, u.id_bimer, s.nome as setor_nome, e.funcao
            FROM usuarios u
            LEFT JOIN setores s ON u.setor_id = s.id
            LEFT JOIN escala e ON u.id = e.usuario_id AND e.data = CURRENT_DATE
            WHERE u.webhook_url IS NOT NULL
        `;
        const resUsers = await pool.query(qUsers);
        const users = resUsers.rows;
        
        for (const u of users) {
            const f = u.funcao ? u.funcao.toLowerCase() : '';
            console.log(`[Webhooks] Processando ${u.nome}. Função de hoje: "${f}". ID Bimer: ${u.id_bimer}`);
            // Se estiver de férias, licença, falta, ou treinamento, não recebe absolutamente nada
            if (f.includes('férias') || f.includes('treinamento') || f.includes('licença') || f.includes('falta') || f.includes('folga')) {
                console.log(`[Webhooks] Pulando ${u.nome} devido à função: ${f}`);
                continue;
            }

            let msgPessoal = '';
            let msgFiltro = '';
            
            // 1. Pega os tickets pessoais do analista (Chat recebe, Filtro recebe, Rev Almoço recebe)
            const pessoaMatches = Object.keys(gruposTickets).filter(p => 
                !filterQueues[p] && // Nao é fila de filtro
                ((u.id_bimer && p.includes(u.id_bimer.toLowerCase())) || 
                 (u.login && p === u.login.toLowerCase()) || 
                 (u.nome && p.includes(u.nome.toLowerCase().split(' ')[0])))
            );
            
            if (pessoaMatches.length > 0) {
                console.log(`[Webhooks] ${u.nome} matchou com as pessoas:`, pessoaMatches);
            }
            
            let normaisPessoais = [];
            let atrasadosPessoais = [];
            let hojePessoais = [];
            
            for (const p of pessoaMatches) {
                for (const t of gruposTickets[p]) {
                    const isAtraso = calcularAtraso(t.data_proximo_contato, p);
                    const isHoje = isHojeData(t.data_proximo_contato);
                    if (isAtraso) atrasadosPessoais.push(t);
                    else if (isHoje) hojePessoais.push(t);
                    else normaisPessoais.push(t);
                }
            }
            
            if (hojePessoais.length > 0 || atrasadosPessoais.length > 0 || normaisPessoais.length > 0) {
                msgPessoal = `Bom dia ${u.nome.split(' ')[0]}, segue seus atendimentos:\n\n`;
                if (hojePessoais.length > 0) {
                    msgPessoal += `*📌 Atendimentos para HOJE (${hojePessoais.length}):*\n`;
                    for (const t of hojePessoais) {
                        msgPessoal += `Atendimento ${t.numero_atendimento} Data ${t.data_proximo_contato}\n`;
                    }
                    msgPessoal += `\n`;
                }
                if (atrasadosPessoais.length > 0) {
                    msgPessoal += `*🚨 Atendimentos em SLA (atraso) urgente!! (${atrasadosPessoais.length}):*\n`;
                    for (const t of atrasadosPessoais) {
                        msgPessoal += `Atendimento ${t.numero_atendimento} Data ${t.data_proximo_contato}\n`;
                    }
                    msgPessoal += `\n`;
                }
                if (normaisPessoais.length > 0) {
                    msgPessoal += `*📅 Agendados próximos (${normaisPessoais.length}):*\n`;
                    for (const t of normaisPessoais) {
                        msgPessoal += `Atendimento ${t.numero_atendimento} Data ${t.data_proximo_contato}\n`;
                    }
                }
                msgPessoal += `\nEm caso de qualquer dificuldade na realização, peço que me acione.\n`;
            }
            
            // 2. Pega os tickets do filtro se aplicável
            let recebeFiltro = false;
            if (f && (f.includes('filtro') || f.includes('rev almoço')) && !f.includes('férias') && !f.includes('chat') && !f.includes('treinamento')) {
                recebeFiltro = true;
            }
            
            if (recebeFiltro && u.setor_nome) {
                let normaisFiltro = [];
                let atrasadosFiltro = [];
                let hojeFiltro = [];
                
                const queues = Object.keys(filterQueues).filter(q => filterQueues[q] === u.setor_nome);
                for (const q of queues) {
                    if (gruposTickets[q]) {
                        for (const t of gruposTickets[q]) {
                            if (isFuturo(t.data_proximo_contato)) continue;
                            const isAtraso = calcularAtraso(t.data_proximo_contato, q);
                            const isHoje = isHojeData(t.data_proximo_contato);
                            if (isAtraso) atrasadosFiltro.push(t);
                            else if (isHoje) hojeFiltro.push(t);
                            else normaisFiltro.push(t);
                        }
                    }
                }
                
                if (hojeFiltro.length > 0 || normaisFiltro.length > 0 || atrasadosFiltro.length > 0) {
                    msgFiltro = `\n--- ATENDIMENTOS DO FILTRO (${u.setor_nome}) ---\n\n`;
                    if (hojeFiltro.length > 0) {
                        msgFiltro += `*📌 Para HOJE (${hojeFiltro.length}):*\n`;
                        for (const t of hojeFiltro) {
                            msgFiltro += `Atendimento ${t.numero_atendimento} Data ${t.data_proximo_contato}\n`;
                        }
                        msgFiltro += `\n`;
                    }
                    if (atrasadosFiltro.length > 0) {
                        msgFiltro += `*🚨 Filtros em SLA (atraso) urgente!! (${atrasadosFiltro.length}):*\n`;
                        for (const t of atrasadosFiltro) {
                            msgFiltro += `Atendimento ${t.numero_atendimento} Data ${t.data_proximo_contato}\n`;
                        }
                        msgFiltro += `\n`;
                    }
                    if (normaisFiltro.length > 0) {
                        msgFiltro += `*📅 Agendados próximos (${normaisFiltro.length}):*\n`;
                        for (const t of normaisFiltro) {
                            msgFiltro += `Atendimento ${t.numero_atendimento} Data ${t.data_proximo_contato}\n`;
                        }
                    }
                }
            }
            
            if (msgPessoal || msgFiltro) {
                const msgFinal = (msgPessoal + (msgPessoal && msgFiltro ? '\n' : '') + msgFiltro).trim();
                await enviarWebhook(u.webhook_url, msgFinal);
            }
        }
    } catch (e) {
        console.error('[WebhooksBimer] Erro:', e.message);
    }
}

function calcularAtraso(data_proximo_contato, pessoa) {
    if (!data_proximo_contato) return false;
    const partes = data_proximo_contato.split('/');
    if (partes.length !== 3) return false;
    
    const dateProx = new Date(parseInt(partes[2], 10), parseInt(partes[1], 10) - 1, parseInt(partes[0], 10));
    dateProx.setHours(0,0,0,0);
    const hoje = new Date();
    hoje.setHours(0,0,0,0);
    
    if (pessoa.includes('retaguardashop') || pessoa.includes('layoutshop') || pessoa.includes('analisebaseshop') || pessoa.includes('scriptsql')) {
        let diasUteis = 0;
        let curr = new Date(dateProx);
        while (curr < hoje) {
            curr.setDate(curr.getDate() + 1);
            if (curr.getDay() !== 0 && curr.getDay() !== 6) diasUteis++;
        }
        return diasUteis >= 4;
    } else {
        return dateProx < hoje;
    }
}

function isHojeData(data_proximo_contato) {
    if (!data_proximo_contato) return false;
    const partes = data_proximo_contato.split('/');
    if (partes.length !== 3) return false;
    const dateProx = new Date(parseInt(partes[2], 10), parseInt(partes[1], 10) - 1, parseInt(partes[0], 10));
    dateProx.setHours(0,0,0,0);
    const hoje = new Date();
    hoje.setHours(0,0,0,0);
    return dateProx.getTime() === hoje.getTime();
}

const PORT = process.env.PORT || 3000;

// Inicializar em modo serverless (Vercel) ou normal (local)
if (process.env.VERCEL || process.env.NODE_ENV === 'production' && !process.env.PGHOST) {
    // Modo serverless do Vercel - não usar app.listen()
    console.log('[Vercel] Modo serverless ativo');
    
    // Executar migrations uma vez no cold start
    runMigrations().catch(err => console.error('[Migrations] Erro:', err));
    
    // Iniciar limpeza automática (se estiver no Vercel, usar cron jobs externos)
    if (!process.env.VERCEL) {
        iniciarLimpezaAutomatica();
    }
} else {
    // Modo local - usar app.listen()
    app.listen(PORT, async () => {
        console.log(`SERVIDOR RODANDO NA PORTA ${PORT}`);
        await runMigrations();
        setInterval(verificarNotificacoesPendentes, 60 * 1000);
        console.log('[Scheduler] Iniciado.');
        
        // Inicia a limpeza automática de escalas antigas (diariamente à meia-noite)
        iniciarLimpezaAutomatica();
        
        // Configurar o cron job para rodar todo dia de manhã (08:00)
        const cron = require('node-cron');
        const { runBimerScraper } = require('./src/services/bimerScraper');
        cron.schedule('0 8 * * *', async () => {
            console.log('[Cron] Executando scraper diário do Bimer CRM (08:00)...');
            await runBimerScraper();
            // Disparo retirado do automático. Deve ser disparado via UI.
        });
    });
}

module.exports = app;