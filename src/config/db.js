const { Pool } = require('pg');
require('dotenv').config({ override: true });

const config = {};

// Priorizar Supabase para produção (Vercel)
if (process.env.SUPABASE_CONNECTION_STRING) {
    // Usar Transaction Mode para Vercel (serverless)
    const connectionString = process.env.SUPABASE_CONNECTION_STRING.replace(':6543/', ':5432/');
    config.connectionString = connectionString;
    config.ssl = { rejectUnauthorized: false };
    
    // Configurações para serverless
    config.max = 1; // Mínimo de conexões para serverless
    config.idleTimeoutMillis = 0;
    config.connectionTimeoutMillis = 10000;
} else if (process.env.PGHOST && process.env.PGUSER) {
    // Configuração local
    config.user = process.env.PGUSER;
    config.password = process.env.PGPASSWORD;
    config.host = process.env.PGHOST;
    config.port = parseInt(process.env.PGPORT, 10) || 5433;
    config.database = process.env.PGDATABASE;
} else if (process.env.POSTGRES_URL || process.env.DATABASE_URL) {
    config.connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL;
}

if (process.env.NODE_ENV === 'production' && config.host !== 'localhost' && config.host !== '127.0.0.1') {
    // Only force SSL in production if we are NOT connecting to a local database
    if (!config.connectionString || !config.connectionString.includes('localhost')) {
        config.ssl = { rejectUnauthorized: false };
    }
}

const pool = new Pool(config);

// Log de conexão (sem expor credenciais)
pool.on('connect', () => {
    if (process.env.NODE_ENV === 'development') {
        console.log('[DB] Conectado ao banco de dados');
    }
});

pool.on('error', (err) => {
    console.error('[DB] Erro inesperado:', err.message);
});

module.exports = pool;