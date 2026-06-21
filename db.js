// db.js
// Responsável por criar e exportar o "pool" de conexões com o MySQL.
// Um pool é mais eficiente do que abrir uma conexão nova a cada requisição.

const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'meubanco',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// Função auxiliar só para testar se a conexão está funcionando
async function testarConexao() {
  try {
    const connection = await pool.getConnection();
    console.log('✅ Conectado ao MySQL com sucesso!');
    connection.release();
  } catch (err) {
    console.error('❌ Erro ao conectar ao MySQL:', err.message);
  }
}

module.exports = { pool, testarConexao };
