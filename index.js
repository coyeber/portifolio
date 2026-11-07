import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import pg from 'pg';

const { Pool } = pg;
const app = express();
app.use(cors());
app.use(express.json({ limit: '100kb' }));

// Um pool reutilizavel ajuda em execucoes serverless na Vercel.
let pool;
function db() {
  if (!process.env.DATABASE_URL) {
    const err = new Error('DATABASE_URL nao configurada. Configure no .env (local) e na Vercel (Production).');
    err.status = 503;
    throw err;
  }
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 3,
      idleTimeoutMillis: 10000,
      connectionTimeoutMillis: 10000
    });
  }
  return pool;
}
const run = (sql, params = []) => db().query(sql, params);

const configs = {
  pessoas: {
    fields: ['nome', 'email', 'telefone', 'cidade', 'resumo'],
    required: ['nome', 'email']
  },
  formacoes: {
    fields: ['pessoa_id', 'curso', 'instituicao', 'inicio', 'fim', 'situacao'],
    required: ['pessoa_id', 'curso', 'instituicao']
  },
  experiencias: {
    fields: ['pessoa_id', 'empresa', 'cargo', 'inicio', 'fim', 'descricao'],
    required: ['pessoa_id', 'empresa', 'cargo']
  },
  projetos: {
    fields: ['pessoa_id', 'nome', 'descricao', 'url'],
    required: ['pessoa_id', 'nome']
  },
  habilidades: {
    fields: ['nome', 'categoria'],
    required: ['nome']
  }
};

function positiveId(value) {
  if (!/^[1-9]\d*$/.test(String(value))) return null;
  const n = Number(value);
  return Number.isSafeInteger(n) ? n : null;
}
function validatePayload(body, config, isCreate) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { error: 'Envie um objeto JSON valido.' };
  }
  const keys = Object.keys(body);
  const unknown = keys.filter(key => !config.fields.includes(key));
  if (unknown.length) return { error: `Campos desconhecidos: ${unknown.join(', ')}` };
  if (!keys.length) return { error: 'Envie ao menos um campo.' };
  if (isCreate) {
    const missing = config.required.filter(key => body[key] == null || body[key] === '');
    if (missing.length) return { error: `Campos obrigatorios: ${missing.join(', ')}` };
  }
  for (const [key, value] of Object.entries(body)) {
    if (value === null) {
      if (config.required.includes(key)) return { error: `O campo ${key} nao pode ser nulo.` };
      continue;
    }
    if (key === 'pessoa_id') {
      if (positiveId(value) === null) return { error: 'pessoa_id deve ser um inteiro positivo.' };
    } else if (typeof value !== 'string') {
      return { error: `O campo ${key} deve ser texto (ou null nos opcionais).` };
    } else if (config.required.includes(key) && !value.trim()) {
      return { error: `O campo ${key} nao pode ficar vazio.` };
    }
  }
  return { payload: body };
}

// CRUD completo para as cinco entidades principais.
for (const [table, config] of Object.entries(configs)) {
  const router = express.Router();
  router.get('/', async (_req, res) => {
    const result = await run(`SELECT * FROM ${table} ORDER BY id`);
    res.json(result.rows);
  });
  router.get('/:id', async (req, res) => {
    const id = positiveId(req.params.id);
    if (id === null) return res.status(400).json({ erro: 'ID invalido' });
    const result = await run(`SELECT * FROM ${table} WHERE id = $1`, [id]);
    if (!result.rows.length) return res.status(404).json({ erro: 'Registro nao encontrado' });
    res.json(result.rows[0]);
  });
  router.post('/', async (req, res) => {
    const checked = validatePayload(req.body, config, true);
    if (checked.error) return res.status(400).json({ erro: checked.error });
    const columns = Object.keys(checked.payload);
    const values = columns.map(col => checked.payload[col]);
    const placeholders = columns.map((_col, i) => `$${i + 1}`);
    const result = await run(
      `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders.join(', ')}) RETURNING *`, values
    );
    res.status(201).json(result.rows[0]);
  });
  router.put('/:id', async (req, res) => {
    const id = positiveId(req.params.id);
    if (id === null) return res.status(400).json({ erro: 'ID invalido' });
    const checked = validatePayload(req.body, config, false);
    if (checked.error) return res.status(400).json({ erro: checked.error });
    const columns = Object.keys(checked.payload);
    const assignments = columns.map((col, i) => `${col} = $${i + 1}`);
    const values = [...columns.map(col => checked.payload[col]), id];
    const result = await run(
      `UPDATE ${table} SET ${assignments.join(', ')} WHERE id = $${values.length} RETURNING *`, values
    );
    if (!result.rows.length) return res.status(404).json({ erro: 'Registro nao encontrado' });
    res.json(result.rows[0]);
  });
  router.delete('/:id', async (req, res) => {
    const id = positiveId(req.params.id);
    if (id === null) return res.status(400).json({ erro: 'ID invalido' });
    const result = await run(`DELETE FROM ${table} WHERE id = $1 RETURNING *`, [id]);
    if (!result.rows.length) return res.status(404).json({ erro: 'Registro nao encontrado' });
    res.json({ mensagem: 'Registro excluido', registro: result.rows[0] });
  });
  app.use(`/${table}`, router);
}

// Relacionamento N:N com CRUD completo; chave composta (pessoa_id, habilidade_id).
app.get('/pessoa-habilidades', async (_req, res) => {
  const result = await run(`
    SELECT ph.pessoa_id, p.nome AS pessoa, ph.habilidade_id, h.nome AS habilidade, ph.nivel
    FROM pessoa_habilidades ph
    JOIN pessoas p ON p.id = ph.pessoa_id
    JOIN habilidades h ON h.id = ph.habilidade_id
    ORDER BY ph.pessoa_id, ph.habilidade_id
  `);
  res.json(result.rows);
});
app.get('/pessoa-habilidades/:pessoaId/:habilidadeId', async (req, res) => {
  const pessoaId = positiveId(req.params.pessoaId);
  const habilidadeId = positiveId(req.params.habilidadeId);
  if (!pessoaId || !habilidadeId) return res.status(400).json({ erro: 'IDs invalidos' });
  const result = await run(
    'SELECT * FROM pessoa_habilidades WHERE pessoa_id = $1 AND habilidade_id = $2',
    [pessoaId, habilidadeId]
  );
  if (!result.rows.length) return res.status(404).json({ erro: 'Relacionamento nao encontrado' });
  res.json(result.rows[0]);
});
app.post('/pessoa-habilidades', async (req, res) => {
  const { pessoa_id, habilidade_id, nivel } = req.body || {};
  const pessoaId = positiveId(pessoa_id);
  const habilidadeId = positiveId(habilidade_id);
  if (!pessoaId || !habilidadeId || !['Basico', 'Intermediario', 'Avancado'].includes(nivel)) {
    return res.status(400).json({ erro: 'Informe pessoa_id e habilidade_id positivos e nivel Basico, Intermediario ou Avancado.' });
  }
  const result = await run(
    'INSERT INTO pessoa_habilidades (pessoa_id, habilidade_id, nivel) VALUES ($1, $2, $3) RETURNING *',
    [pessoaId, habilidadeId, nivel]
  );
  res.status(201).json(result.rows[0]);
});
app.put('/pessoa-habilidades/:pessoaId/:habilidadeId', async (req, res) => {
  const pessoaId = positiveId(req.params.pessoaId);
  const habilidadeId = positiveId(req.params.habilidadeId);
  const { nivel } = req.body || {};
  if (!pessoaId || !habilidadeId || !['Basico', 'Intermediario', 'Avancado'].includes(nivel)) {
    return res.status(400).json({ erro: 'IDs validos e nivel Basico, Intermediario ou Avancado obrigatorios.' });
  }
  const result = await run(
    'UPDATE pessoa_habilidades SET nivel = $1 WHERE pessoa_id = $2 AND habilidade_id = $3 RETURNING *',
    [nivel, pessoaId, habilidadeId]
  );
  if (!result.rows.length) return res.status(404).json({ erro: 'Relacionamento nao encontrado' });
  res.json(result.rows[0]);
});
app.delete('/pessoa-habilidades/:pessoaId/:habilidadeId', async (req, res) => {
  const pessoaId = positiveId(req.params.pessoaId);
  const habilidadeId = positiveId(req.params.habilidadeId);
  if (!pessoaId || !habilidadeId) return res.status(400).json({ erro: 'IDs invalidos' });
  const result = await run(
    'DELETE FROM pessoa_habilidades WHERE pessoa_id = $1 AND habilidade_id = $2 RETURNING *',
    [pessoaId, habilidadeId]
  );
  if (!result.rows.length) return res.status(404).json({ erro: 'Relacionamento nao encontrado' });
  res.json({ mensagem: 'Relacionamento excluido', registro: result.rows[0] });
});

// Recurso extra: exibe o curriculo de uma pessoa com todas as suas relacoes.
app.get('/curriculos/:id', async (req, res) => {
  const id = positiveId(req.params.id);
  if (!id) return res.status(400).json({ erro: 'ID invalido' });
  const pessoa = await run('SELECT * FROM pessoas WHERE id = $1', [id]);
  if (!pessoa.rows.length) return res.status(404).json({ erro: 'Pessoa nao encontrada' });
  const [formacoes, experiencias, projetos, habilidades] = await Promise.all([
    run('SELECT * FROM formacoes WHERE pessoa_id = $1 ORDER BY id', [id]),
    run('SELECT * FROM experiencias WHERE pessoa_id = $1 ORDER BY id', [id]),
    run('SELECT * FROM projetos WHERE pessoa_id = $1 ORDER BY id', [id]),
    run(`SELECT h.id, h.nome, h.categoria, ph.nivel
         FROM pessoa_habilidades ph JOIN habilidades h ON h.id = ph.habilidade_id
         WHERE ph.pessoa_id = $1 ORDER BY h.nome`, [id])
  ]);
  res.json({
    pessoa: pessoa.rows[0],
    formacoes: formacoes.rows,
    experiencias: experiencias.rows,
    projetos: projetos.rows,
    habilidades: habilidades.rows
  });
});

app.get('/health', async (_req, res) => {
  await run('SELECT 1');
  res.json({ status: 'ok', banco: 'conectado' });
});
app.get('/', (_req, res) => res.json({
  mensagem: 'API REST de Curriculos - Express + PostgreSQL (Neon)',
  rotas: ['/health', '/pessoas', '/formacoes', '/experiencias', '/projetos', '/habilidades', '/pessoa-habilidades', '/curriculos/:id']
}));
app.use((_req, res) => res.status(404).json({ erro: 'Rota nao encontrada' }));
app.use((err, _req, res, _next) => {
  console.error(err);
  if (err.type === 'entity.parse.failed') return res.status(400).json({ erro: 'JSON invalido' });
  if (err.code === '23505') return res.status(409).json({ erro: 'Registro duplicado (violacao de campo unico)' });
  if (err.code === '23503') return res.status(400).json({ erro: 'Relacionamento invalido: ID relacionado nao existe' });
  if (err.code === '23514' || err.code === '23502' || err.code === '22P02' || err.code === '22007' || err.code === '22008') {
    return res.status(400).json({ erro: 'Dados invalidos ou campo obrigatorio ausente', detalhe: err.detail || undefined });
  }
  res.status(err.status || 500).json({ erro: err.status ? err.message : 'Erro interno no servidor' });
});

// A Vercel identifica automaticamente o app Express neste arquivo raiz.
export default app;
