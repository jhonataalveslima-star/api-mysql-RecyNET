// server.js
require('dotenv').config();
const express = require('express');
const helmet  = require('helmet');
const cors    = require('cors');
const { pool, testarConexao } = require('./db');

const app  = express();
const PORT = process.env.PORT || 3000;

// ─── Validação de variáveis de ambiente ──────────────────────────────────────
const REQUIRED_ENV = ['DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME'];
const missingEnv   = REQUIRED_ENV.filter((key) => !process.env[key]);
if (missingEnv.length) {
  console.error(`❌ Variáveis de ambiente ausentes: ${missingEnv.join(', ')}`);
  process.exit(1);
}

// ─── Logger simples ───────────────────────────────────────────────────────────
function logger(req, res, next) {
  const start = Date.now();
  res.on('finish', () => {
    const ms = Date.now() - start;
    console.log(
      `[${new Date().toISOString()}] ${req.method} ${req.originalUrl} → ${res.statusCode} (${ms}ms)`
    );
  });
  next();
}

// ─── Wrapper para rotas assíncronas (elimina try/catch repetitivo) ────────────
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

// ─── Middlewares globais ──────────────────────────────────────────────────────
app.use(helmet());          // headers de segurança HTTP
app.use(cors());            // libera CORS (configure origens em produção)
app.use(express.json());    // parse de JSON no body
app.use(logger);            // log de todas as requisições

// ─── Rotas de saúde ───────────────────────────────────────────────────────────

app.get('/', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/health/db', asyncHandler(async (req, res) => {
  const [rows] = await pool.query('SELECT NOW() AS agora');
  res.json({ conectado: true, horaDoBanco: rows[0].agora });
}));

// ─── CRUD de Usuários ─────────────────────────────────────────────────────────

// GET /usuarios – lista todos
app.get('/usuarios', asyncHandler(async (req, res) => {
  const [rows] = await pool.query(
    'SELECT id, nome, email, criado_em FROM usuarios ORDER BY id'
  );
  res.json({ total: rows.length, dados: rows });
}));

// GET /usuarios/:id – busca por ID
app.get('/usuarios/:id', asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0)
    return res.status(400).json({ erro: 'ID inválido' });

  const [rows] = await pool.query(
    'SELECT id, nome, email, criado_em FROM usuarios WHERE id = ?',
    [id]
  );
  if (!rows.length)
    return res.status(404).json({ erro: 'Usuário não encontrado' });

  res.json(rows[0]);
}));

// POST /usuarios – cria novo
app.post('/usuarios', asyncHandler(async (req, res) => {
  const { nome, email } = req.body ?? {};

  if (!nome?.trim() || !email?.trim())
    return res.status(400).json({ erro: '"nome" e "email" são obrigatórios' });

  const [result] = await pool.query(
    'INSERT INTO usuarios (nome, email) VALUES (?, ?)',
    [nome.trim(), email.trim().toLowerCase()]
  );
  res.status(201).json({ mensagem: 'Usuário criado', id: result.insertId });
}));

// PUT /usuarios/:id – atualiza parcialmente
app.put('/usuarios/:id', asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0)
    return res.status(400).json({ erro: 'ID inválido' });

  const { nome, email } = req.body ?? {};
  if (!nome?.trim() && !email?.trim())
    return res.status(400).json({ erro: 'Informe ao menos um campo para atualizar' });

  const campos  = [];
  const valores = [];
  if (nome?.trim())  { campos.push('nome = ?');  valores.push(nome.trim()); }
  if (email?.trim()) { campos.push('email = ?'); valores.push(email.trim().toLowerCase()); }
  valores.push(id);

  const [result] = await pool.query(
    `UPDATE usuarios SET ${campos.join(', ')} WHERE id = ?`,
    valores
  );
  if (result.affectedRows === 0)
    return res.status(404).json({ erro: 'Usuário não encontrado' });

  res.json({ mensagem: 'Usuário atualizado' });
}));

// DELETE /usuarios/:id – remove
app.delete('/usuarios/:id', asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0)
    return res.status(400).json({ erro: 'ID inválido' });

  const [result] = await pool.query('DELETE FROM usuarios WHERE id = ?', [id]);
  if (result.affectedRows === 0)
    return res.status(404).json({ erro: 'Usuário não encontrado' });

  res.json({ mensagem: 'Usuário removido' });
}));

// ─── Rota não encontrada ──────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ erro: `Rota "${req.method} ${req.path}" não existe` });
});

// ─── Tratamento centralizado de erros ────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(`[ERRO] ${err.message}\n`, err.stack);
  res.status(500).json({ erro: 'Erro interno do servidor' });
});

// ─── Inicialização e desligamento gracioso ────────────────────────────────────
async function iniciar() {
  await testarConexao();

  const server = app.listen(PORT, () => {
    console.log(`🚀 API rodando na porta ${PORT}`);
  });

  async function desligar(sinal) {
    console.log(`\n🛑 Sinal ${sinal} recebido – encerrando...`);
    server.close(async () => {
      await pool.end();
      console.log('✅ Conexões encerradas. Bye!');
      process.exit(0);
    });
  }

  process.on('SIGTERM', () => desligar('SIGTERM'));
  process.on('SIGINT',  () => desligar('SIGINT'));
}

iniciar().catch((err) => {
  console.error('❌ Falha ao iniciar a API:', err.message);
  process.exit(1);
});
