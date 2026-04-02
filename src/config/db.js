const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false // <--- ADICIONE ISSO SE NÃO TIVER
  }
});

module.exports = pool;