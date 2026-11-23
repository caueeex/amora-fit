-- =============================================================================
-- Amora Fit — 0005: configuração inicial da loja (não são dados de demonstração)
-- Tudo aqui pode ser editado depois pelo painel administrativo.
-- =============================================================================

insert into public.categories (slug, name, position) values
  ('tops',        'Tops',        1),
  ('shorts',      'Shorts',      2),
  ('conjuntos',   'Conjuntos',   3),
  ('macaquinhos', 'Macaquinhos', 4),
  ('leggings',    'Leggings',    5)
on conflict (slug) do nothing;

insert into public.store_settings (
  id, store_name, tagline, whatsapp_phone,
  banner_active, banner_title, banner_text,
  shipping_policy_text,
  whatsapp_order_greeting, whatsapp_order_closing,
  reservation_hours
) values (
  1,
  'Amora Fit',
  'Peças que te valorizam em movimento 💜',
  '5512991992477',
  true,
  'Lançamento',
  'As 10 primeiras compras ganham um sachê de whey de brinde (contém leite). Todo pedido leva um mimo de amora.',
  'O frete é combinado pelo WhatsApp após a confirmação do pedido.',
  'Olá! Gostaria de confirmar meu pedido na Amora Fit 💜',
  'Gostaria de confirmar a disponibilidade e as informações para pagamento!',
  48
)
on conflict (id) do nothing;
