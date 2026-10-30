const { Pool } = require('pg');
require('dotenv').config({ override: true });

const config = {};

// Priorizar variáveis de conexão (qualquer uma que existir)
const connectionString = 
    process.env.SUPABASE_CONNECTION_STRING || 
    process.env.POSTGRES_URL || 
    process.env.POSTGRES_URL_NON_POOLING ||
    process.env.DATABASE_URL;

if (connectionString) {
    // Garantir que usa porta 5432 (Transaction Mode) para serverless
    const adjustedConnectionString = connectionString.replace(':6543/', ':5432/');
    config.connectionString = adjustedConnectionString;
    config.ssl = { rejectUnauthorized: false };
    
    // Configurações otimizadas para serverless (Vercel)
    config.max = 1; // Mínimo de conexões para serverless
    config.idleTimeoutMillis = 0;
    config.connectionTimeoutMillis = 10000;
    
    console.log('[DB] Usando connection string (Supabase/Vercel)');
} else if (process.env.PGHOST && process.env.PGUSER) {
    // Configuração local tradicional
    config.user = process.env.PGUSER;
    config.password = process.env.PGPASSWORD;
    config.host = process.env.PGHOST;
    config.port = parseInt(process.env.PGPORT, 10) || 5433;
    config.database = process.env.PGDATABASE;
    
    console.log('[DB] Usando configuração local');
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