// server.js
require('dotenv').config();
const express = require('express');
const { pool, testarConexao } = require('./db');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

// Rota raiz só para confirmar que a API está de pé
app.get('/', (req, res) => {
  res.json({ status: 'API rodando!' });
});

// Rota de teste que faz uma consulta simples no banco
app.get('/teste-db', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT NOW() AS agora');
    res.json({ conectado: true, horaDoBanco: rows[0].agora });
  } catch (err) {
    res.status(500).json({ conectado: false, erro: err.message });
  }
});

// Exemplo de rota usando uma tabela "usuarios" (crie a tabela antes de testar)
app.get('/usuarios', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM usuarios');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

app.listen(PORT, async () => {
  console.log(`🚀 API rodando na porta ${PORT}`);
  await testarConexao();
});
