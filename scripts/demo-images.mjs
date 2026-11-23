// ⚠️ SOMENTE DESENVOLVIMENTO: gera imagens ILUSTRATIVAS para os produtos "demo-"
// e envia ao Supabase Storage (bucket product-images), ligando-as em product_images.
//
// Uso:
//   node --env-file=.env.local scripts/demo-images.mjs --confirm-dev            (gera + envia)
//   node --env-file=.env.local scripts/demo-images.mjs --confirm-dev --preview  (só gera em ./tmp-demo-images)
//   node --env-file=.env.local scripts/demo-images.mjs --confirm-dev --remove   (remove imagens demo)
import { chromium } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { mkdirSync, writeFileSync } from "node:fs";

if (!process.argv.includes("--confirm-dev")) {
  console.error("Recusado: passe --confirm-dev (projeto de DESENVOLVIMENTO).");
  process.exit(1);
}
const preview = process.argv.includes("--preview");
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secret = process.env.SUPABASE_SECRET_KEY;
if (!url || !secret) {
  console.error("Defina NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SECRET_KEY no .env.local.");
  process.exit(1);
}
const sb = createClient(url, secret, { auth: { persistSession: false } });
const BUCKET = "product-images";

// ---------------------------------------------------------------------------
// Silhuetas (viewBox 400x500), preenchidas com a cor da variação
// ---------------------------------------------------------------------------
const SHAPES = {
  legging: `
    <path d="M132 58 H268 L271 98 H129 Z" class="g"/>
    <path d="M129 98 H271 L262 468 H212 L200 196 L188 468 H138 Z" class="g"/>
    <path d="M200 98 V196" class="seam"/><path d="M134 430 H186 M214 430 H266" class="seam"/>`,
  top: `
    <path d="M152 86 C160 140 168 176 176 210" class="strap"/><path d="M248 86 C240 140 232 176 224 210" class="strap"/>
    <path d="M118 236 C148 196 184 192 200 214 C216 192 252 196 282 236 L288 300 C230 322 170 322 112 300 Z" class="g"/>
    <path d="M114 284 C170 304 230 304 286 284" class="seam"/>`,
  shorts: `
    <path d="M118 120 H282 L284 160 H116 Z" class="g"/>
    <path d="M116 160 H284 L306 360 L216 374 L200 252 L184 374 L94 360 Z" class="g"/>
    <path d="M200 160 V252" class="seam"/>`,
  macaquinho: `
    <path d="M158 70 C162 110 166 145 168 184" class="strap"/><path d="M242 70 C238 110 234 145 232 184" class="strap"/>
    <path d="M132 170 C176 196 224 196 268 170 L272 292 L298 404 L214 416 L200 334 L186 416 L102 404 L128 292 Z" class="g"/>
    <path d="M130 290 C176 306 224 306 270 290" class="seam"/>`,
  conjunto: `
    <path d="M168 40 C172 66 176 88 180 108" class="strap"/><path d="M232 40 C228 66 224 88 220 108" class="strap"/>
    <path d="M140 116 C164 94 188 92 200 106 C212 92 236 94 260 116 L264 156 C222 170 178 170 136 156 Z" class="g"/>
    <path d="M142 196 H258 L260 222 H140 Z" class="g"/>
    <path d="M140 222 H260 L253 476 H212 L200 290 L188 476 H147 Z" class="g"/>
    <path d="M200 222 V290" class="seam"/>`,
};

function shapeFor(category) {
  return { leggings: SHAPES.legging, tops: SHAPES.top, shorts: SHAPES.shorts, macaquinhos: SHAPES.macaquinho, conjuntos: SHAPES.conjunto }[category] ?? SHAPES.legging;
}

function html({ hex, category, angle }) {
  // Fundo de "estúdio" claro; leve variação por ângulo para a 2ª foto parecer outra tomada.
  const bgA = angle === 0 ? "#F7F1E8" : "#F3E9EC";
  const bgB = angle === 0 ? "#E9DCCB" : "#E6D3DA";
  const rotate = angle === 0 ? 0 : -4;
  return `<!doctype html><html><body style="margin:0">
  <svg id="img" xmlns="http://www.w3.org/2000/svg" width="800" height="1000" viewBox="0 0 400 500">
    <defs>
      <radialGradient id="bg" cx="50%" cy="38%" r="75%"><stop offset="0" stop-color="${bgA}"/><stop offset="1" stop-color="${bgB}"/></radialGradient>
      <linearGradient id="shade" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#fff" stop-opacity=".22"/><stop offset=".5" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".22"/>
      </linearGradient>
      <filter id="soft" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="10" stdDeviation="10" flood-color="#3d0623" flood-opacity=".18"/></filter>
      <style>
        .g { fill: ${hex}; stroke: rgba(0,0,0,.14); stroke-width: 1.2; }
        .strap { fill: none; stroke: ${hex}; stroke-width: 9; stroke-linecap: round; }
        .seam { fill: none; stroke: rgba(255,255,255,.28); stroke-width: 1.4; stroke-dasharray: 3 3; }
        .shade .g { fill: url(#shade); stroke: none; }
        .shade .strap, .shade .seam { display: none; }
      </style>
    </defs>
    <rect width="400" height="500" fill="url(#bg)"/>
    <ellipse cx="200" cy="482" rx="120" ry="10" fill="#3d0623" opacity=".08"/>
    <g transform="rotate(${rotate} 200 250)" filter="url(#soft)">${shapeFor(category)}</g>
    <g class="shade" transform="rotate(${rotate} 200 250)">${shapeFor(category)}</g>
    <text x="22" y="482" font-family="Georgia, serif" font-size="13" font-weight="700" fill="#560832" opacity=".35">Amora</text>
    <text x="378" y="482" text-anchor="end" font-family="system-ui, sans-serif" font-size="8" letter-spacing="1.5" fill="#560832" opacity=".35">IMAGEM ILUSTRATIVA</text>
  </svg></body></html>`;
}

// ---------------------------------------------------------------------------
const { data: products, error } = await sb
  .from("products")
  .select("id, slug, name, category:categories(slug), variants:product_variants(color_name, color_hex, position)")
  .like("slug", "demo-%")
  .order("slug");
if (error) throw error;
if (!products.length) {
  console.error("Nenhum produto demo-… encontrado. Rode antes o seed de produtos.");
  process.exit(1);
}

if (process.argv.includes("--remove")) {
  for (const p of products) {
    const { data: files } = await sb.storage.from(BUCKET).list(`demo/${p.slug}`);
    if (files?.length) await sb.storage.from(BUCKET).remove(files.map((f) => `demo/${p.slug}/${f.name}`));
    await sb.from("product_images").delete().eq("product_id", p.id).like("storage_path", "demo/%");
  }
  console.log("Imagens de demonstração removidas.");
  process.exit(0);
}

const browser = await chromium.launch({ channel: "msedge" });
const page = await browser.newPage({ viewport: { width: 800, height: 1000 } });
if (preview) mkdirSync("tmp-demo-images", { recursive: true });

let total = 0;
for (const p of products) {
  const colors = [];
  for (const v of [...p.variants].sort((a, b) => a.position - b.position)) {
    if (!colors.some((c) => c.name === v.color_name)) colors.push({ name: v.color_name, hex: v.color_hex });
  }
  const shots = colors.map((c, i) => ({ ...c, angle: i === 0 ? 0 : 1 }));

  const rows = [];
  for (const [i, shot] of shots.entries()) {
    await page.setContent(html({ hex: shot.hex, category: p.category?.slug, angle: shot.angle }));
    const buf = await page.locator("#img").screenshot({ type: "jpeg", quality: 86 });
    const slugColor = shot.name.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const path = `demo/${p.slug}/${i + 1}-${slugColor}.jpg`;

    if (preview) {
      writeFileSync(`tmp-demo-images/${p.slug}-${i + 1}-${slugColor}.jpg`, buf);
    } else {
      const { error: upErr } = await sb.storage.from(BUCKET).upload(path, buf, { contentType: "image/jpeg", upsert: true, cacheControl: "31536000" });
      if (upErr) throw new Error(`upload ${path}: ${upErr.message}`);
    }
    rows.push({ product_id: p.id, storage_path: path, alt_text: `${p.name} na cor ${shot.name} (imagem ilustrativa)`, color_name: shot.name, position: i });
    total += 1;
  }

  if (!preview) {
    await sb.from("product_images").delete().eq("product_id", p.id).like("storage_path", "demo/%");
    const { error: insErr } = await sb.from("product_images").insert(rows);
    if (insErr) throw new Error(`product_images ${p.slug}: ${insErr.message}`);
  }
  console.log(`✓ ${p.name}: ${shots.map((s) => s.name).join(", ")}`);
}
await browser.close();
console.log(`\n${total} imagens ${preview ? "geradas em ./tmp-demo-images" : "enviadas e ligadas aos produtos"}.`);
