-- =============================================================================
-- ⚠️  DADOS DE DEMONSTRAÇÃO — SOMENTE PARA DESENVOLVIMENTO
-- Não rode no projeto de produção. Os produtos usam o prefixo de slug "demo-"
-- para serem removidos facilmente (veja o final do arquivo).
-- Sem fotos: a vitrine mostra "foto em breve" até as imagens serem enviadas.
-- Pode ser executado mais de uma vez (não duplica).
-- =============================================================================
do $$
declare
  r record;
  v_product_id uuid;
  v_color record;
  v_size text;
  v_variant_id uuid;
  v_pos integer;
begin
  for r in
    select * from (values
      -- slug,                      nome,                          categoria,     preço, promo, novo,  destaque, cores (nome:hex|...),                                  tamanhos,            estoque base, descrição
      ('demo-legging-cintura-alta', 'Legging Cintura Alta',        'leggings',    8990,  null,  true,  true,  'Preto:#0A0A0A|Vinho:#6B1544|Verde Oliva:#5B6B3A',           'P,M,G,GG',          8,  'Legging de cintura alta com compressão na medida certa. Tecido com toque gelado, não fica transparente no agachamento.'),
      ('demo-legging-amora',        'Legging Amora Texturizada',   'leggings',    9990,  8490,  true,  false, 'Amora:#560832|Preto:#0A0A0A',                               'P,M,G',             5,  'Textura canelada que valoriza as curvas. Cós duplo que não enrola durante o treino.'),
      ('demo-top-alca-cruzada',     'Top Alça Cruzada',            'tops',        5990,  null,  true,  true,  'Preto:#0A0A0A|Vinho:#6B1544|Off-white:#F3EDE2',             'P,M,G',             10, 'Top com alças cruzadas nas costas e bojo removível. Sustentação média, ideal para musculação.'),
      ('demo-top-nadador',          'Top Nadador Essencial',       'tops',        4990,  3990,  false, false, 'Preto:#0A0A0A|Rosa Seco:#C98F9B',                           'PP,P,M,G',          6,  'O básico que combina com tudo. Costas nadador e tecido de secagem rápida.'),
      ('demo-short-modelador',      'Short Modelador',             'shorts',      6490,  null,  false, true,  'Preto:#0A0A0A|Vinho:#6B1544',                               'P,M,G,GG',          7,  'Short de cintura alta com efeito modelador. Comprimento médio que não sobe durante o treino.'),
      ('demo-short-saia',           'Short Saia Leve',             'shorts',      6990,  null,  true,  false, 'Off-white:#F3EDE2|Preto:#0A0A0A',                           'P,M,G',             4,  'Short saia com bermuda interna. Leve, fresco e perfeito para corrida ou beach tennis.'),
      ('demo-conjunto-amora',       'Conjunto Amora (Top + Legging)', 'conjuntos', 14990, 12990, true,  true,  'Amora:#560832|Preto:#0A0A0A',                               'P,M,G',             5,  'Conjunto completo com top de alça fina e legging cintura alta no mesmo tom. Peças vendidas juntas.'),
      ('demo-conjunto-short-top',   'Conjunto Short + Top',        'conjuntos',   11990, null,  false, false, 'Verde Oliva:#5B6B3A|Vinho:#6B1544',                         'P,M,G',             3,  'Short modelador e top cruzado combinando. Ideal para os dias mais quentes.'),
      ('demo-macaquinho-decote-v',  'Macaquinho Decote V',         'macaquinhos', 13990, null,  true,  true,  'Preto:#0A0A0A|Vinho:#6B1544',                               'P,M,G',             4,  'Macaquinho de peça única com decote V nas costas e bojo embutido. Praticidade com muito estilo.'),
      ('demo-macaquinho-alcinha',   'Macaquinho Alcinha',          'macaquinhos', 12990, 10990, false, false, 'Off-white:#F3EDE2|Rosa Seco:#C98F9B',                       'P,M',               2,  'Alças finas reguláveis e tecido com compressão leve. Confortável do treino ao café.')
    ) as t(slug, name, category, price, promo, is_new, featured, colors, sizes, stock, description)
  loop
    insert into public.products (category_id, slug, name, description, price_cents, promo_price_cents, status, is_new, is_featured)
    values ((select id from public.categories where slug = r.category), r.slug, r.name, r.description,
            r.price, r.promo, 'active', r.is_new, r.featured)
    on conflict (slug) do update set
      name = excluded.name, description = excluded.description, price_cents = excluded.price_cents,
      promo_price_cents = excluded.promo_price_cents, status = 'active',
      is_new = excluded.is_new, is_featured = excluded.is_featured, category_id = excluded.category_id
    returning id into v_product_id;

    v_pos := 0;
    for v_color in
      select split_part(c, ':', 1) as name, split_part(c, ':', 2) as hex
      from unnest(string_to_array(r.colors, '|')) as c
    loop
      foreach v_size in array string_to_array(r.sizes, ',') loop
        v_pos := v_pos + 1;
        insert into public.product_variants (product_id, color_name, color_hex, size, position)
        values (v_product_id, v_color.name, v_color.hex, v_size, v_pos)
        on conflict (product_id, color_name, size) do update set color_hex = excluded.color_hex
        returning id into v_variant_id;

        -- Estoque variado (alguns tamanhos esgotados, para testar a vitrine).
        update public.inventory
           set on_hand = greatest(reserved, case when (v_pos % 5) = 0 then 0 else r.stock + (v_pos % 3) end)
         where variant_id = v_variant_id;
      end loop;
    end loop;
  end loop;
end;
$$;

-- Conferência
select p.name, count(v.id) as variacoes, sum(i.available) as disponiveis
  from public.products p
  join public.product_variants v on v.product_id = p.id
  join public.inventory i on i.variant_id = v.id
 where p.slug like 'demo-%'
 group by p.name
 order by p.name;

-- Para REMOVER os produtos de demonstração depois:
-- delete from public.products where slug like 'demo-%';
