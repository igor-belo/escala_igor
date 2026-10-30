// Endpoint de health check para diagnóstico
const { Pool } = require('pg');

module.exports = async (req, res) => {
    const results = {
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV,
        vercel: !!process.env.VERCEL,
        checks: {}
    };

    // Verificar variáveis de ambiente (sem expor valores)
    results.checks.env_vars = {
        NODE_ENV: !!process.env.NODE_ENV,
        CRYPTO_KEY: !!process.env.CRYPTO_KEY,
        SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        SUPABASE_KEY: !!process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
        SUPABASE_CONNECTION: !!process.env.SUPABASE_CONNECTION_STRING
    };

    // Testar conexão com banco
    try {
        const connectionString = process.env.SUPABASE_CONNECTION_STRING;
        
        if (!connectionString) {
            throw new Error('SUPABASE_CONNECTION_STRING não configurado');
        }

        // Usar porta Transaction Mode (5432) para serverless
        const adjustedConnectionString = connectionString.replace(':6543/', ':5432/');
        
        const pool = new Pool({
            connectionString: adjustedConnectionString,
            ssl: { rejectUnauthorized: false },
            max: 1,
            idleTimeoutMillis: 0,
            connectionTimeoutMillis: 10000
        });

        const result = await pool.query('SELECT NOW() as time, current_database() as db');
        
        results.checks.database = {
            status: 'connected',
            time: result.rows[0].time,
            database: result.rows[0].db,
            port: adjustedConnectionString.includes(':5432') ? '5432 (Transaction Mode)' : 'unknown'
        };

        await pool.end();
    } catch (error) {
        results.checks.database = {
            status: 'error',
            message: error.message,
            hint: 'Verifique SUPABASE_CONNECTION_STRING nas variáveis de ambiente'
        };
    }

    // Testar CRYPTO_KEY
    try {
        const crypto_key = process.env.CRYPTO_KEY;
        if (!crypto_key) {
            throw new Error('CRYPTO_KEY não configurado');
        }
        if (crypto_key.length !== 32) {
            throw new Error('CRYPTO_KEY deve ter 32 caracteres');
        }
        results.checks.crypto_key = {
            status: 'ok',
            length: crypto_key.length
        };
    } catch (error) {
        results.checks.crypto_key = {
            status: 'error',
            message: error.message
        };
    }

    // Status geral
    const allOk = results.checks.database?.status === 'connected' && 
                  results.checks.crypto_key?.status === 'ok' &&
                  results.checks.env_vars.SUPABASE_CONNECTION;

    res.status(allOk ? 200 : 500).json({
        status: allOk ? 'healthy' : 'unhealthy',
        ...results
    });
};
