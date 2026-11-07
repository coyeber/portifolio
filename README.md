# API REST de Currículos — Express + PostgreSQL (NeonDB) + Vercel

Projeto de back-end para representar currículos de várias pessoas usando relacionamentos e CRUD completo.

> **Atenção:** os currículos iniciais (Ana Silva e Bruno Costa) são fictícios, para demonstração. Personalize-os para sua entrega conforme a orientação do professor. Não use senhas reais, documentos ou informações sensíveis em uma API pública sem autenticação.

## 1. Modelo de dados

```text
pessoas (1) ----- (N) formacoes
   |   (1) ----- (N) experiencias
   |   (1) ----- (N) projetos
   |
   |   (1) ----- (N) pessoa_habilidades (N) ----- (1) habilidades
```

Todas as entidades têm os quatro métodos do CRUD: GET, POST, PUT e DELETE.

Rotas:

| Método | Caminho | Ação |
|---|---|---|
| GET | `/` | Informações da API |
| GET | `/health` | Testa conexão com o Neon |
| GET | `/pessoas` | Lista todas as pessoas |
| GET | `/pessoas/:id` | Busca uma pessoa |
| POST | `/pessoas` | Cadastra pessoa |
| PUT | `/pessoas/:id` | Atualiza pessoa |
| DELETE | `/pessoas/:id` | Exclui pessoa (relações são apagadas por cascade) |
| GET, POST | `/formacoes`, `/experiencias`, `/projetos`, `/habilidades` | Lista e cria |
| GET, PUT, DELETE | `/<entidade>/:id` | Busca, atualiza e exclui |
| GET, POST | `/pessoa-habilidades` | Lista e cria vínculos |
| GET, PUT, DELETE | `/pessoa-habilidades/:pessoaId/:habilidadeId` | Busca, atualiza e exclui um vínculo |
| GET | `/curriculos/:id` | Currículo inteiro, com todos os relacionamentos |

## 2. Crie o banco no NeonDB

1. Acesse https://console.neon.tech/ e crie um projeto PostgreSQL.
2. No painel do projeto, abra **SQL Editor**.
3. Copie **todo o conteúdo de `schema.sql`** e execute.
4. Copie **todo o conteúdo de `seed.sql`** e execute. Ele preenche dados de **DUAS pessoas**, com formações, experiências, projetos e habilidades.
5. Execute `SELECT * FROM pessoas;` e confirme as duas pessoas.
6. Clique em **Connect** no Neon e copie a **connection string** (recomenda-se a string com pooler para API serverless). Ela se parece com `postgresql://usuario:senha@.../neondb?sslmode=require`.
7. **NUNCA** publique a connection string no GitHub ou no vídeo.

## 3. Execute no seu computador

Instale Node.js 20+ e abra um terminal na pasta deste projeto:

```bash
npm install
```

Duplique `.env.example` para `.env`:

- No Windows (CMD): `copy .env.example .env`
- No macOS/Linux: `cp .env.example .env`

Edite `.env` e cole a URL real do Neon em `DATABASE_URL`. Depois rode:

```bash
npm run dev
```

Abra no navegador:

- http://localhost:3000/ — mensagem inicial
- http://localhost:3000/health — deve mostrar `{ "status": "ok", "banco": "conectado" }`
- http://localhost:3000/pessoas — lista duas pessoas
- http://localhost:3000/curriculos/1 — currículo completo, se o primeiro ID for 1

> Se seu banco já tem dados e o ID não for 1, consulte `/pessoas` e use o ID correto.

## 4. Publique no GitHub

Crie um repositório público vazio no https://github.com/new (por exemplo `api-curriculos`).

Na pasta do projeto:

```bash
git init
git add .
git commit -m "API REST de curriculos com NeonDB"
git branch -M main
git remote add origin https://github.com/SEU-USUARIO/api-curriculos.git
git push -u origin main
```

Substitua `SEU-USUARIO` pelo seu usuário do GitHub. Se necessário, faça login no GitHub antes do push. O arquivo `.env` está no `.gitignore` e **não será enviado**.

## 5. Publique na Vercel

1. Abra https://vercel.com/new, entre com GitHub e importe o repositório criado.
2. A Vercel identifica automaticamente o Express no arquivo `index.js`, que exporta `app` — **não precisa de `vercel.json`**.
3. Antes de publicar, em **Environment Variables**, crie `DATABASE_URL` com a mesma connection string do Neon. Use o ambiente **Production**.
4. Clique em **Deploy**. Se colocou a variável depois de publicar, faça um **Redeploy**.
5. Acesse `https://SEU-PROJETO.vercel.app/health` para confirmar que o banco responde.
6. Anote o endereço final da API.

## 6. Configure o Postman

1. Abra o Postman e clique em **Import**.
2. Escolha o arquivo `API_Curriculos_Postman.json` desta pasta.
3. Abra a coleção importada e vá na aba **Variables**.
4. Edite `baseUrl`: **troque** `https://SEU-PROJETO.vercel.app` pela URL que a Vercel forneceu (sem barra no final). Salve.
5. Execute `00 - Verificacao > 01 - Health com banco` e `Pessoas (CRUD) > 01 - Listar`.
6. Confirme os IDs das duas pessoas em `/pessoas` e ajuste `pessoaId` e `pessoaId2` nas variáveis, se necessário.
7. **Atenção ao teste sequencial:** criar uma pessoa altera automaticamente a variável `pessoaId` para o novo ID (há script de teste no POST). Criar formação, experiência, projeto e habilidade também guarda os IDs criados. Use esses IDs nos GET/PUT/DELETE.
8. Para demonstrar relacionamento N:N, crie primeiro uma pessoa e uma habilidade; depois faça POST, GET, PUT e DELETE em `Relacionamentos N:N (CRUD)`.
9. Como o professor pediu coleção **configurada com a URL publicada**, exporte **novamente** a coleção após editar/salvar `baseUrl`. Abra o JSON exportado e confirme que ele não contém `SEU-PROJETO`.

> Não execute DELETE na pessoa fictícia do banco se quiser manter duas pessoas cadastradas. Faça a demonstração de exclusão em um registro extra criado pelo Postman.

### Exemplo manual de POST de pessoa

**POST** `{{baseUrl}}/pessoas`

```json
{
  "nome": "Camila Lima",
  "email": "camila.lima.2026@example.com",
  "telefone": "(81) 90000-0999",
  "cidade": "Recife - PE",
  "resumo": "Estudante de desenvolvimento web."
}
```

## 7. Vídeo de até 2 minutos para o YouTube

**Roteiro sugerido (aproximadamente 1min45s):**

- **0:00–0:15:** apresente rapidamente as seis tabelas e relacionamentos no Neon SQL Editor.
- **0:15–0:30:** Postman > Variables: mostre `baseUrl` com sua URL da Vercel; altere e volte à URL correta para evidenciar o uso de variáveis.
- **0:30–0:50:** GET `/pessoas` (duas pessoas) e GET `/curriculos/{{pessoaId}}` (todas as seções).
- **0:50–1:15:** POST, GET, PUT e DELETE de uma **habilidade extra** ou pessoa extra (não apague as duas pessoas originais).
- **1:15–1:40:** crie uma nova habilidade, vincule a uma das pessoas com POST `/pessoa-habilidades`, depois GET, PUT e DELETE do vínculo; aponte a variável de IDs.
- **1:40–1:55:** mostre as outras pastas CRUD (formações, experiências, projetos) no Postman e feche.

Faça upload no **YouTube** como **Público** ou **Não listado**. Não use Privado. Não anexe diretamente o vídeo, nem envie link do Drive no lugar do YouTube.

## 8. Checklist de entrega

- [ ] `schema.sql` executado no NeonDB
- [ ] `seed.sql` executado; **duas pessoas** com dados associados
- [ ] `https://SEU-PROJETO.vercel.app/health` retorna `status: ok`
- [ ] Todas as entidades possuem GET, POST, PUT e DELETE
- [ ] Vínculo pessoa-habilidade possui GET, POST, PUT e DELETE
- [ ] Código publicado no GitHub, sem `.env`
- [ ] Postman exportado com `baseUrl` real da Vercel
- [ ] Vídeo no YouTube de **até 2 minutos**, Público ou Não listado
- [ ] Entrega contém links GitHub, Vercel, YouTube e arquivo do Postman

## Observação de segurança

Esta é uma **API demonstrativa sem autenticação** para avaliação acadêmica. Quem conhecer a URL pode inserir, alterar ou apagar registros. Use somente dados públicos ou fictícios, não compartilhe credenciais e, após a avaliação, considere adicionar autenticação/autorização ou desativar o projeto.
