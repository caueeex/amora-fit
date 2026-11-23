import { expect, test, type Page } from "@playwright/test";
import { adminClient, createTestUser } from "./helpers";

/** Painel: página inicial (seções) e categorias com foto refletindo na loja. */
const service = adminClient();
// PNG 1x1 válido
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==", "base64");

test.describe("painel — página inicial", () => {
  test.skip(!service, "Defina SUPABASE_SECRET_KEY no .env.local para rodar o E2E.");
  test.skip(({ isMobile }) => isMobile, "Fluxo do painel validado no desktop.");

  let admin: { id: string; email: string; password: string };
  test.beforeAll(async () => {
    admin = await createTestUser(service!, { role: "admin" });
  });
  test.afterAll(async () => {
    if (admin) await service!.auth.admin.deleteUser(admin.id);
  });

  async function login(page: Page, next: string) {
    await page.goto(`/entrar?next=${encodeURIComponent(next)}`);
    await page.getByLabel("E-mail").fill(admin.email);
    await page.getByLabel("Senha").fill(admin.password);
    await page.getByRole("button", { name: "Entrar" }).click();
  }

  test("foto da categoria aparece no círculo da loja", async ({ page }) => {
    const { data: cat } = await service!.from("categories").select("id, name, image_path").eq("slug", "shorts").single();
    let uploaded: string | null = null;
    try {
      await login(page, "/admin/pagina-inicial?aba=categorias");
      await expect(page.locator('input[aria-label="Nome da categoria"]').first()).toBeVisible({ timeout: 30_000 });
      await page.waitForLoadState("networkidle"); // JS ativo antes de escolher o arquivo
      const row = page.locator("li", { has: page.locator('input[aria-label="Nome da categoria"][value="Shorts"]') });
      await row.locator('input[type="file"]').setInputFiles({ name: "shorts.png", mimeType: "image/png", buffer: PNG });
      await expect(row.getByText("remover foto")).toBeVisible({ timeout: 15_000 });
      await row.getByRole("button", { name: "Salvar" }).click();
      await expect(row.getByText("Salvo.")).toBeVisible();

      const { data: saved } = await service!.from("categories").select("image_path").eq("id", cat!.id).single();
      uploaded = saved!.image_path;
      expect(uploaded).toMatch(/^categories\/[0-9a-f-]{36}\.webp$/);

      await page.goto("/");
      await expect(page.locator(`a[href="/produtos?categoria=shorts"] img[src*="${encodeURIComponent(uploaded!).replace(/%2F/g, "%2F")}"], a[href="/produtos?categoria=shorts"] img[src*="categories"]`).first()).toBeAttached();
    } finally {
      // restaura pelo painel (atualiza o cache da loja)
      await page.goto("/admin/pagina-inicial?aba=categorias");
      await expect(page.locator('input[aria-label="Nome da categoria"]').first()).toBeVisible({ timeout: 30_000 });
      const row = page.locator("li", { has: page.locator('input[aria-label="Nome da categoria"][value="Shorts"]') });
      if (await row.getByText("remover foto").count()) {
        await row.getByText("remover foto").click();
        await row.getByRole("button", { name: "Salvar" }).click();
        await expect(row.getByText("Salvo.")).toBeVisible();
      }
      if (uploaded) await service!.storage.from("store-assets").remove([uploaded]);
    }
  });

  test("seções: cria carrossel, publica e aparece na loja", async ({ page }) => {
    const probe = await service!.from("home_sections").select("id").limit(1);
    test.skip(Boolean(probe.error), "Migration 0012 ainda não aplicada no Supabase.");

    let sectionId: string | null = null;
    try {
      await login(page, "/admin/pagina-inicial");
      await page.getByRole("button", { name: "+ Adicionar seção" }).click();
      await page.getByRole("button", { name: /Carrossel de banners/ }).click();
      await expect(page).toHaveURL(/\/admin\/pagina-inicial\/[0-9a-f-]{36}\?nova=1/);
      sectionId = page.url().match(/inicial\/([0-9a-f-]{36})/)![1];

      const stamp = `Banner E2E ${Date.now()}`;
      await page.getByLabel("Título", { exact: true }).first().fill("Carrossel E2E");
      await page.locator("li", { hasText: "Slide 1" }).getByLabel("Título").fill(stamp);
      await page.getByLabel("Link (o banner inteiro é clicável)").fill("javascript:alert(1)");
      await page.getByLabel("Seção ativa").check();
      await page.getByRole("button", { name: "Salvar seção" }).click();
      await expect(page.getByText(/Link inválido/)).toBeVisible();

      await page.getByLabel("Link (o banner inteiro é clicável)").fill("/produtos?oferta=1");
      await page.getByRole("button", { name: "Salvar seção" }).click();
      await expect(page.getByText("Seção salva. A página inicial já foi atualizada.")).toBeVisible();

      await page.goto("/");
      await expect(page.getByRole("heading", { name: stamp })).toBeVisible();
      await expect(page.locator(`a[href="/produtos?oferta=1"]`, { hasText: stamp })).toBeVisible();
    } finally {
      if (sectionId) {
        await page.goto("/admin/pagina-inicial");
        const row = page.locator("li", { hasText: "Carrossel E2E" });
        if (await row.count()) {
          page.once("dialog", (d) => d.accept());
          await row.getByRole("button", { name: "Excluir seção" }).click();
          await expect(row).toHaveCount(0);
        }
      }
    }
  });
});
