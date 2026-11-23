import { expect, test, type Page } from "@playwright/test";
import { adminClient, createTestUser } from "./helpers";

/**
 * Painel: estoque (entrada/saída com motivo, histórico) e cadastro de produto
 * com variações e foto. Fluxos 9 (validação de estoque) e 18 (proteção).
 */
const service = adminClient();
// 1x1 PNG
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==", "base64");

test.describe("painel — estoque e produtos", () => {
  test.skip(!service, "Defina SUPABASE_SECRET_KEY no .env.local para rodar o E2E.");
  test.skip(({ isMobile }) => isMobile, "Fluxo do painel validado no desktop.");

  let admin: { id: string; email: string; password: string };

  test.beforeAll(async () => {
    admin = await createTestUser(service!, { role: "admin" });
  });

  test.afterAll(async () => {
    await service!.from("inventory_movements").delete().like("note", "E2E%");
    if (admin) await service!.auth.admin.deleteUser(admin.id);
  });

  async function login(page: Page, next: string) {
    await page.goto(`/entrar?next=${encodeURIComponent(next)}`);
    await page.getByLabel("E-mail").fill(admin.email);
    await page.getByLabel("Senha").fill(admin.password);
    await page.getByRole("button", { name: "Entrar" }).click();
  }

  test("ajusta estoque com motivo e registra no histórico", async ({ page }) => {
    const { data: v } = await service!
      .from("product_variants")
      .select("id, color_name, size, product:products!inner(name, slug), inventory!inner(on_hand, reserved)")
      .eq("product.slug", "demo-legging-cintura-alta")
      .eq("color_name", "Vinho")
      .eq("size", "M")
      .single();
    const before = (v!.inventory as unknown as { on_hand: number }).on_hand;

    await login(page, "/admin/estoque?q=Legging%20Cintura%20Alta%20Vinho%20M");
    await expect(page.getByRole("heading", { name: "Estoque" })).toBeVisible();
    const row = page.locator("li", { hasText: "Vinho · M" }).first();

    await row.getByRole("button", { name: "Ajustar" }).click();
    await row.getByLabel("Quantidade").fill("3");
    await row.getByLabel("Motivo").fill("E2E entrada");
    await row.getByRole("button", { name: "Confirmar" }).click();
    await expect(row.getByText(`+3 un. Estoque agora: ${before + 3}.`)).toBeVisible();

    // Saída sem motivo é bloqueada
    await row.getByRole("button", { name: "Ajustar" }).click();
    await row.getByRole("button", { name: /Saída/ }).click();
    await row.getByLabel("Quantidade").fill("3");
    await row.getByRole("button", { name: "Confirmar" }).click();
    await expect(row.getByText(/Informe o motivo/)).toBeVisible();
    await row.getByLabel("Motivo").fill("E2E saída");
    await row.getByRole("button", { name: "Confirmar" }).click();
    await expect(row.getByText(`-3 un. Estoque agora: ${before}.`)).toBeVisible();

    await page.goto("/admin/estoque/movimentacoes?tipo=restock");
    await expect(page.getByText("E2E entrada").first()).toBeVisible();
  });

  test("cria produto com variações e foto", async ({ page }) => {
    const probe = await service!.rpc("admin_save_product", { p_product: {}, p_variants: [] });
    test.skip(probe.error?.code === "PGRST202", "Migration 0011 ainda não aplicada no Supabase.");

    const name = `E2E Produto ${Date.now()}`;
    await login(page, "/admin/produtos/novo");
    await expect(page.getByRole("heading", { name: "Novo produto" })).toBeVisible();
    await page.getByLabel("Nome do produto").fill(name);
    await page.getByLabel("Categoria").selectOption({ label: "Tops" });
    await page.getByLabel("Preço (R$)").fill("79,90");
    await page.getByLabel("Promocional (R$)").fill("69,90");
    await expect(page.getByText("-13%")).toBeVisible();
    await page.getByRole("button", { name: "+ Preto" }).click();
    await page.getByLabel("Estoque inicial Preto P").fill("4");
    await page.getByRole("button", { name: "Criar produto" }).click();

    await expect(page).toHaveURL(/\/admin\/produtos\/[0-9a-f-]{36}\?criado=1/);
    await expect(page.getByText("Produto criado!")).toBeVisible();
    const id = page.url().match(/produtos\/([0-9a-f-]{36})/)![1];

    try {
      await page.locator('input[type="file"]').setInputFiles({ name: "foto.png", mimeType: "image/png", buffer: PNG });
      await expect(page.getByText("Capa")).toBeVisible({ timeout: 20_000 });

      const { data: p } = await service!
        .from("products")
        .select("status, price_cents, promo_price_cents, images:product_images(storage_path), variants:product_variants(size, inventory(on_hand))")
        .eq("id", id)
        .single();
      expect(p).toMatchObject({ status: "draft", price_cents: 7990, promo_price_cents: 6990 });
      expect(p!.images).toHaveLength(1);
      const p_ = p!.variants.find((v: { size: string }) => v.size === "P") as unknown as { inventory: { on_hand: number } };
      expect(p_.inventory.on_hand).toBe(4);
    } finally {
      const { data: imgs } = await service!.from("product_images").select("storage_path").eq("product_id", id);
      if (imgs?.length) await service!.storage.from("product-images").remove(imgs.map((i) => i.storage_path));
      await service!.from("products").delete().eq("id", id);
    }
  });
});
