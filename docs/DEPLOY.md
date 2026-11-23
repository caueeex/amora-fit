# Publicando a Amora Fit na Vercel

## Antes de começar

- **Plano Vercel:** o Hobby (grátis) **proíbe uso comercial**. Para testar, serve; para a loja vender de verdade, use o **Pro (US$ 20/mês)**.
- **Supabase:** no plano Free o projeto **pausa após 7 dias sem acesso** e o e-mail de autenticação tem limite baixo por hora. Para a loja no ar: Supabase Pro (US$ 25/mês) e SMTP próprio (ex.: Resend, Brevo) em *Authentication → Emails → SMTP Settings*.
- **Produtos de demonstração:** antes de abrir a loja, remova-os:
  `delete from public.products where slug like 'demo-%';`

## 1. Enviar o código para o GitHub

1. Crie um repositório **privado** em https://github.com/new (ex.: `amora-fit`), sem README.
2. No terminal, na pasta do projeto:

```bash
git add .
git commit -m "Amora Fit: loja, autenticação, catálogo e checkout"
git remote add origin https://github.com/SEU-USUARIO/amora-fit.git
git push -u origin main
```

O `.env.local` (com as chaves) **não** vai para o GitHub — ele está no `.gitignore`.

## 2. Criar o projeto na Vercel

1. https://vercel.com/new → **Import** o repositório `amora-fit`.
2. Framework: **Next.js** (detectado automaticamente). Não altere os comandos de build.
3. Em **Environment Variables**, adicione:

| Nome | Valor |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | a mesma do `.env.local` |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | a mesma do `.env.local` |
| `NEXT_PUBLIC_SITE_URL` | a URL do site, ex.: `https://amora-fit.vercel.app` (ou seu domínio) |

> **Não** coloque `SUPABASE_SECRET_KEY` na Vercel: o site não usa essa chave.

4. Clique em **Deploy**. Ao terminar, a Vercel mostra a URL (ex.: `https://amora-fit.vercel.app`).
   Se a URL final for diferente da que você colocou em `NEXT_PUBLIC_SITE_URL`, corrija a variável e faça **Redeploy**.

## 3. Liberar a URL no Supabase (obrigatório para login/cadastro)

Supabase → **Authentication → URL Configuration**:

- **Site URL:** `https://amora-fit.vercel.app` (ou seu domínio)
- **Redirect URLs** (mantenha também a do localhost para desenvolver):
  - `https://amora-fit.vercel.app/**`
  - `http://localhost:3000/**`

Sem isso, os links de confirmação de e-mail e "esqueci minha senha" não funcionam.

## 4. Domínio próprio (opcional)

Vercel → projeto → **Settings → Domains** → adicione `www.suaLoja.com.br` e siga as instruções de DNS.
Depois atualize `NEXT_PUBLIC_SITE_URL` (Redeploy) e a **Site URL / Redirect URLs** do Supabase.

## 5. Atualizações

Cada `git push` na branch `main` publica automaticamente. Pushes em outras branches geram *preview* (URL de teste).

Mudanças no **banco** (novos arquivos em `supabase/migrations`) não são aplicadas pela Vercel:
rode-as no SQL Editor (ou `npm run db:push` com a CLI vinculada) **antes** do deploy que depende delas.

## Conferência rápida após publicar

- [ ] Home carrega com produtos
- [ ] Cadastro envia e-mail e o link de confirmação abre o site publicado
- [ ] Login → checkout → abre o WhatsApp da loja
- [ ] `/admin` abre para a conta admin e dá 404 para clientes
