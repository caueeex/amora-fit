# Configurando o Supabase (desenvolvimento)

Esta máquina não tem Docker, então usamos um **projeto Supabase remoto só para desenvolvimento**.
Em produção será criado um projeto separado (ver documentação de deploy na Fase 11).

## 1. Criar o projeto

1. Acesse https://supabase.com/dashboard e crie um projeto (ex.: `amora-fit-dev`).
2. Região: **South America (São Paulo)**.
3. Guarde a senha do banco num gerenciador de senhas — ela é pedida pelo `supabase link`.

## 2. Preencher o `.env.local`

Em **Project Settings → API Keys** (ou **API**):

| Variável | Onde encontrar |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL (`https://xxxx.supabase.co`) |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Chave *publishable* (`sb_publishable_...`) ou a legada *anon* |
| `SUPABASE_SECRET_KEY` | Chave *secret* (`sb_secret_...`) ou a legada *service_role* — **só no `.env.local`, nunca no código nem no navegador** |

Depois de salvar, reinicie o `npm run dev`. A página inicial mostra "Supabase: configurado".

## 3. Criar o banco (escolha UM caminho)

### Caminho A — CLI (recomendado: registra quais migrations já foram aplicadas)

```bash
npx supabase login                       # abre o navegador
npx supabase link --project-ref SEU_REF  # o ref é o "xxxx" da URL; pede a senha do banco
npm run db:push                          # aplica supabase/migrations
```

### Caminho B — SQL Editor (sem CLI)

```bash
npm run db:bundle    # gera supabase/bundle/amora-fit-migrations.sql
```

Abra **SQL Editor → New query**, cole o conteúdo do arquivo e clique em **Run**.
Tudo roda numa transação: se der erro, nada é aplicado.

> Se depois passar a usar a CLI, marque as migrations como já aplicadas antes do primeiro `db push`:
> `npx supabase migration repair --status applied 20261122000001 20261122000002 20261122000003 20261122000004 20261122000005 20261122000006 20261122000007`

### Conferindo

Em **Table Editor** devem aparecer 14 tabelas (profiles, products, orders…), todas com RLS
habilitado, 5 categorias e 1 linha em `store_settings` com o WhatsApp da loja.

## 4. Primeiro administrador

1. Crie sua conta pelo site (tela de cadastro — Fase 3) **ou** em
   **Authentication → Users → Add user** (marque "Auto confirm").
2. No SQL Editor, rode [`supabase/snippets/promote-admin.sql`](../supabase/snippets/promote-admin.sql)
   trocando o e-mail.

O site nunca permite mudar o papel de um usuário; só o dono do banco consegue.

## Migrations futuras

As migrations revogam os privilégios padrão de `anon`/`authenticated` em `public`.
**Toda tabela nova** precisa, na própria migration: `enable row level security`,
políticas e `grant` explícitos — senão ficará inacessível (falha segura).

## 5. Autenticação (URLs)

Em **Authentication → URL Configuration**:

- **Site URL:** `http://localhost:3000`
- **Redirect URLs:** `http://localhost:3000/**`

## Limites do plano gratuito (importante)

- Projeto é **pausado após 7 dias sem atividade** (é só reativar no painel em dev).
- E-mails do Auth com servidor embutido têm **limite muito baixo por hora** — suficiente para testes,
  insuficiente para produção (lá configuraremos SMTP próprio).
- 500 MB de banco, 1 GB de Storage, 200 conexões Realtime simultâneas.