-- =============================================================================
-- Promover um usuário a ADMINISTRADOR (procedimento seguro)
--
-- Por que é seguro: o site/API NUNCA consegue alterar profiles.role
-- (privilégio de coluna revogado + trigger de proteção). Somente o dono do
-- banco consegue, e o SQL Editor do Supabase roda como dono ("postgres").
--
-- Como usar:
--   1. A pessoa cria a conta normalmente pelo site (/cadastro) e confirma o e-mail.
--   2. Quem tem acesso ao painel do Supabase abre SQL Editor, troca o e-mail
--      abaixo e executa.
-- =============================================================================

update public.profiles
   set role = 'admin'
 where email = lower('EMAIL-DA-PESSOA@exemplo.com')
returning id, email, full_name, role;

-- Para remover o acesso de admin:
-- update public.profiles set role = 'customer' where email = lower('EMAIL@exemplo.com');

-- Listar administradores:
-- select id, email, full_name, created_at from public.profiles where role = 'admin';
