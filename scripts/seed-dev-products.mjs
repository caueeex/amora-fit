// ⚠️ SOMENTE DESENVOLVIMENTO: cria 10 produtos de demonstração (slug "demo-...").
// Mesmo conteúdo de supabase/snippets/dev-seed-products.sql, via API com a chave secreta.
// Uso: node --env-file=.env.local scripts/seed-dev-products.mjs --confirm-dev
// Remover depois: node --env-file=.env.local scripts/seed-dev-products.mjs --confirm-dev --remove
import { createClient } from "@supabase/supabase-js";

if (!process.argv.includes("--confirm-dev")) {
  console.error("Recusado: passe --confirm-dev para confirmar que este é o projeto de DESENVOLVIMENTO.");
  process.exit(1);
}
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secret = process.env.SUPABASE_SECRET_KEY;
if (!url || !secret) {
  console.error("Defina NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SECRET_KEY no .env.local.");
  process.exit(1);
}
const sb = createClient(url, secret, { auth: { persistSession: false } });

if (process.argv.includes("--remove")) {
  const { error, count } = await sb.from("products").delete({ count: "exact" }).like("slug", "demo-%");
  if (error) throw error;
  console.log(`Removidos ${count} produtos de demonstração.`);
  process.exit(0);
}

const C = {
  preto: ["Preto", "#0A0A0A"],
  vinho: ["Vinho", "#6B1544"],
  oliva: ["Verde Oliva", "#5B6B3A"],
  amora: ["Amora", "#560832"],
  off: ["Off-white", "#F3EDE2"],
  rosa: ["Rosa Seco", "#C98F9B"],
};

const PRODUCTS = [
  ["demo-legging-cintura-alta", "Legging Cintura Alta", "leggings", 8990, null, true, true, [C.preto, C.vinho, C.oliva], ["P", "M", "G", "GG"], 8, "Legging de cintura alta com compressão na medida certa. Tecido com toque gelado, não fica transparente no agachamento."],
  ["demo-legging-amora", "Legging Amora Texturizada", "leggings", 9990, 8490, true, false, [C.amora, C.preto], ["P", "M", "G"], 5, "Textura canelada que valoriza as curvas. Cós duplo que não enrola durante o treino."],
  ["demo-top-alca-cruzada", "Top Alça Cruzada", "tops", 5990, null, true, true, [C.preto, C.vinho, C.off], ["P", "M", "G"], 10, "Top com alças cruzadas nas costas e bojo removível. Sustentação média, ideal para musculação."],
  ["demo-top-nadador", "Top Nadador Essencial", "tops", 4990, 3990, false, false, [C.preto, C.rosa], ["PP", "P", "M", "G"], 6, "O básico que combina com tudo. Costas nadador e tecido de secagem rápida."],
  ["demo-short-modelador", "Short Modelador", "shorts", 6490, null, false, true, [C.preto, C.vinho], ["P", "M", "G", "GG"], 7, "Short de cintura alta com efeito modelador. Comprimento médio que não sobe durante o treino."],
  ["demo-short-saia", "Short Saia Leve", "shorts", 6990, null, true, false, [C.off, C.preto], ["P", "M", "G"], 4, "Short saia com bermuda interna. Leve, fresco e perfeito para corrida ou beach tennis."],
  ["demo-conjunto-amora", "Conjunto Amora (Top + Legging)", "conjuntos", 14990, 12990, true, true, [C.amora, C.preto], ["P", "M", "G"], 5, "Conjunto completo com top de alça fina e legging cintura alta no mesmo tom. Peças vendidas juntas."],
  ["demo-conjunto-short-top", "Conjunto Short + Top", "conjuntos", 11990, null, false, false, [C.oliva, C.vinho], ["P", "M", "G"], 3, "Short modelador e top cruzado combinando. Ideal para os dias mais quentes."],
  ["demo-macaquinho-decote-v", "Macaquinho Decote V", "macaquinhos", 13990, null, true, true, [C.preto, C.vinho], ["P", "M", "G"], 4, "Macaquinho de peça única com decote V nas costas e bojo embutido. Praticidade com muito estilo."],
  ["demo-macaquinho-alcinha", "Macaquinho Alcinha", "macaquinhos", 12990, 10990, false, false, [C.off, C.rosa], ["P", "M"], 2, "Alças finas reguláveis e tecido com compressão leve. Confortável do treino ao café."],
];

const { data: cats, error: catErr } = await sb.from("categories").select("id, slug");
if (catErr) throw catErr;
const catId = Object.fromEntries(cats.map((c) => [c.slug, c.id]));

let variantsTotal = 0;
for (const [slug, name, category, price, promo, isNew, featured, colors, sizes, stock, description] of PRODUCTS) {
  const { data: product, error } = await sb
    .from("products")
    .upsert(
      { slug, name, description, category_id: catId[category], price_cents: price, promo_price_cents: promo, status: "active", is_new: isNew, is_featured: featured },
      { onConflict: "slug" },
    )
    .select("id")
    .single();
  if (error) throw new Error(`${slug}: ${error.message}`);

  let pos = 0;
  for (const [colorName, colorHex] of colors) {
    for (const size of sizes) {
      pos += 1;
      const { data: variant, error: vErr } = await sb
        .from("product_variants")
        .upsert({ product_id: product.id, color_name: colorName, color_hex: colorHex, size, position: pos }, { onConflict: "product_id,color_name,size" })
        .select("id")
        .single();
      if (vErr) throw new Error(`${slug}/${colorName}/${size}: ${vErr.message}`);

      // Estoque variado (alguns esgotados, para testar a vitrine).
      const onHand = pos % 5 === 0 ? 0 : stock + (pos % 3);
      const { data: inv } = await sb.from("inventory").select("reserved").eq("variant_id", variant.id).single();
      const { error: iErr } = await sb
        .from("inventory")
        .update({ on_hand: Math.max(onHand, inv?.reserved ?? 0) })
        .eq("variant_id", variant.id);
      if (iErr) throw new Error(`estoque ${slug}: ${iErr.message}`);
      variantsTotal += 1;
    }
  }
  console.log(`✓ ${name}`);
}
console.log(`\nPronto: ${PRODUCTS.length} produtos, ${variantsTotal} variações. Recarregue a loja (até 1 min de cache).`);
