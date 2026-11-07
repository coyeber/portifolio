-- Execute APOS schema.sql no Neon SQL Editor.
-- Dados de exemplo ficticios de DUAS pessoas. Troque pelos dados autorizados/reais da equipe.
-- Idempotente: pode executar mais de uma vez sem duplicar estes exemplos.

INSERT INTO pessoas (nome, email, telefone, cidade, resumo) VALUES
('Ana Silva', 'ana.silva@example.com', '(81) 90000-0001', 'Recife - PE', 'Desenvolvedora em formacao com foco em back-end.'),
('Bruno Costa', 'bruno.costa@example.com', '(81) 90000-0002', 'Recife - PE', 'Estudante de tecnologia interessado em APIs e bancos de dados.')
ON CONFLICT (email) DO NOTHING;

INSERT INTO formacoes (pessoa_id, curso, instituicao, inicio, fim, situacao)
SELECT id, 'Sistemas para Internet', 'Universidade Exemplo', '2024-02-01', NULL, 'Cursando'
FROM pessoas p WHERE p.email = 'ana.silva@example.com'
AND NOT EXISTS (SELECT 1 FROM formacoes f WHERE f.pessoa_id = p.id AND f.curso = 'Sistemas para Internet');

INSERT INTO formacoes (pessoa_id, curso, instituicao, inicio, fim, situacao)
SELECT id, 'Ciencia da Computacao', 'Faculdade Exemplo', '2023-02-01', NULL, 'Cursando'
FROM pessoas p WHERE p.email = 'bruno.costa@example.com'
AND NOT EXISTS (SELECT 1 FROM formacoes f WHERE f.pessoa_id = p.id AND f.curso = 'Ciencia da Computacao');

INSERT INTO experiencias (pessoa_id, empresa, cargo, inicio, fim, descricao)
SELECT id, 'Empresa Exemplo A', 'Estagiaria de Desenvolvimento', '2025-03-01', NULL, 'Apoio em APIs e documentacao tecnica.'
FROM pessoas p WHERE p.email = 'ana.silva@example.com'
AND NOT EXISTS (SELECT 1 FROM experiencias e WHERE e.pessoa_id = p.id AND e.empresa = 'Empresa Exemplo A');

INSERT INTO experiencias (pessoa_id, empresa, cargo, inicio, fim, descricao)
SELECT id, 'Empresa Exemplo B', 'Assistente de TI', '2024-08-01', '2025-12-15', 'Suporte tecnico e consultas SQL.'
FROM pessoas p WHERE p.email = 'bruno.costa@example.com'
AND NOT EXISTS (SELECT 1 FROM experiencias e WHERE e.pessoa_id = p.id AND e.empresa = 'Empresa Exemplo B');

INSERT INTO projetos (pessoa_id, nome, descricao, url)
SELECT id, 'Portfolio Web', 'Portfolio de projetos pessoais.', 'https://example.com/portfolio-ana'
FROM pessoas p WHERE p.email = 'ana.silva@example.com'
AND NOT EXISTS (SELECT 1 FROM projetos pr WHERE pr.pessoa_id = p.id AND pr.nome = 'Portfolio Web');

INSERT INTO projetos (pessoa_id, nome, descricao, url)
SELECT id, 'API de Tarefas', 'API REST com banco PostgreSQL.', 'https://example.com/api-bruno'
FROM pessoas p WHERE p.email = 'bruno.costa@example.com'
AND NOT EXISTS (SELECT 1 FROM projetos pr WHERE pr.pessoa_id = p.id AND pr.nome = 'API de Tarefas');

INSERT INTO habilidades (nome, categoria) VALUES
('JavaScript', 'Linguagem'),
('PostgreSQL', 'Banco de Dados'),
('Express', 'Framework'),
('Git', 'Ferramenta')
ON CONFLICT (nome) DO NOTHING;

INSERT INTO pessoa_habilidades (pessoa_id, habilidade_id, nivel)
SELECT p.id, h.id, 'Avancado'
FROM pessoas p CROSS JOIN habilidades h
WHERE p.email = 'ana.silva@example.com' AND h.nome = 'JavaScript'
ON CONFLICT DO NOTHING;

INSERT INTO pessoa_habilidades (pessoa_id, habilidade_id, nivel)
SELECT p.id, h.id, 'Intermediario'
FROM pessoas p CROSS JOIN habilidades h
WHERE p.email = 'ana.silva@example.com' AND h.nome = 'PostgreSQL'
ON CONFLICT DO NOTHING;

INSERT INTO pessoa_habilidades (pessoa_id, habilidade_id, nivel)
SELECT p.id, h.id, 'Intermediario'
FROM pessoas p CROSS JOIN habilidades h
WHERE p.email = 'bruno.costa@example.com' AND h.nome = 'Express'
ON CONFLICT DO NOTHING;

INSERT INTO pessoa_habilidades (pessoa_id, habilidade_id, nivel)
SELECT p.id, h.id, 'Avancado'
FROM pessoas p CROSS JOIN habilidades h
WHERE p.email = 'bruno.costa@example.com' AND h.nome = 'Git'
ON CONFLICT DO NOTHING;

-- Confira os curriculos preenchidos e seus relacionamentos:
SELECT p.id, p.nome, COUNT(DISTINCT f.id) AS formacoes,
       COUNT(DISTINCT e.id) AS experiencias,
       COUNT(DISTINCT pr.id) AS projetos,
       COUNT(DISTINCT ph.habilidade_id) AS habilidades
FROM pessoas p
LEFT JOIN formacoes f ON f.pessoa_id = p.id
LEFT JOIN experiencias e ON e.pessoa_id = p.id
LEFT JOIN projetos pr ON pr.pessoa_id = p.id
LEFT JOIN pessoa_habilidades ph ON ph.pessoa_id = p.id
GROUP BY p.id, p.nome ORDER BY p.id;
