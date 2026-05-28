const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Liga o SSL automaticamente na web e desliga no seu PC local
  ssl: process.env.NODE_ENV === 'development' ? false : { rejectUnauthorized: false }
});

module.exports = pool;