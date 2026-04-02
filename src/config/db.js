const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ 
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false } 
});

pool.on('connect', client => {
    client.query("SET TIMEZONE='America/Sao_Paulo'");
});

module.exports = pool;