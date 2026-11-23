# Amora Fit — e-commerce

Loja virtual de moda fitness feminina com área do cliente e painel administrativo.
Pedidos são registrados no banco e finalizados pelo WhatsApp da loja.

**Stack:** Next.js 16 (App Router, Cache Components) · React 19 · TypeScript · Tailwind CSS v4 ·
Supabase (Postgres, Auth, Storage, Realtime) · Vercel.

## Rodando localmente

Requisitos: Node 22+.

```bash
npm install
cp .env.example .env.local   # preencha com o projeto Supabase de desenvolvimento
npm run dev                  # http://localhost:3000
```

Veja [docs/SETUP-SUPABASE.md](docs/SETUP-SUPABASE.md) para criar e conectar o projeto Supabase.

## Scripts

| Comando | O que faz |
|---|---|
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Build de produção |
| `npm run typecheck` | Verificação de tipos |
| `npm run lint` | ESLint |
| `npm test` | Testes unitários (Vitest) |
| `npm run db:push` | Aplica as migrations em `supabase/migrations` no projeto vinculado |
| `npm run db:types` | Gera os tipos TypeScript do banco |

## Estrutura

```
src/
  app/                 rotas (loja, auth, minha-conta, admin)
  components/          componentes reutilizáveis (brand/, ui/, loja/, admin/, conta/)
  lib/
    domain/            regras puras e testadas (dinheiro, telefone, status, WhatsApp)
    supabase/          clientes: client (navegador), server (sessão/público), proxy, admin (server-only)
  proxy.ts             renova a sessão e protege rotas privadas
supabase/
  migrations/          schema, RLS e funções SQL versionados
scripts/               utilitários de desenvolvimento
```

## Princípios

- Valores monetários em **centavos inteiros** (sem ponto flutuante).
- Regras críticas (criação de pedido, estoque, status) em **funções Postgres transacionais**.
- **RLS** em todas as tabelas; a chave secreta nunca vai para o navegador.
- Informações da loja (WhatsApp, textos, banner) vêm de `store_settings`, não do código.

## Observação (Windows)

`npm test` usa `scripts/vitest.mjs` para contornar um bug do Vitest quando o terminal abre o
projeto com a letra da unidade em minúscula (`c:\`), comum no VS Code.
