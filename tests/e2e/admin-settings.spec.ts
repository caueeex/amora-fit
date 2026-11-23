import { expect, test, type Page } from "@playwright/test";
import { adminClient, cleanupTestUser, createTestUser } from "./helpers";

/** Painel: clientes (busca, detalhe, CPF mascarado) e configurações refletindo na loja. */
const service = adminClient();
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==", "base64");

test.describe("painel — clientes e configurações", () => {
  test.skip(!service, "Defina SUPABASE_SECRET_KEY no .env.local para rodar o E2E.");
  test.skip(({ isMobile }) => isMobile, "Fluxo do painel validado no desktop.");

  let admin: { id: string; email: string; password: string };
  let customer: { id: string; email: string; password: string };

  test.beforeAll(async () => {
    admin = await createTestUser(service!, { role: "admin" });
    customer = await createTestUser(service!);
    await service!.from("profiles").update({ full_name: "Cliente Busca E2E", phone: "5512988887777", cpf: "12345678909" }).eq("id", customer.id);
  });

  test.afterAll(async () => {
    if (customer) await cleanupTestUser(service!, customer.id);
    if (admin) await service!.auth.admin.deleteUser(admin.id);
  });

  async function login(page: Page, next: string) {
    await page.goto(`/entrar?next=${encodeURIComponent(next)}`);
    await page.getByLabel("E-mail").fill(admin.email);
    await page.getByLabel("Senha").fill(admin.password);
    await page.getByRole("button", { name: "Entrar" }).click();
  }

  test("busca cliente e protege o CPF", async ({ page }) => {
    await login(page, "/admin/clientes?q=Busca%20E2E");
    await expect(page.getByRole("heading", { name: "Clientes" })).toBeVisible();
    await page.getByRole("link", { name: /Cliente Busca E2E/ }).click();
    await expect(page.getByRole("heading", { name: "Cliente Busca E2E" })).toBeVisible();
    await expect(page.getByText("***.***.***-09")).toBeVisible();
    await expect(page.getByText("123.456.789-09")).toHaveCount(0);
    await page.getByRole("button", { name: "mostrar" }).click();
    await expect(page.getByText("123.456.789-09")).toBeVisible();
    await expect(page.getByRole("link", { name: "Conversar no WhatsApp" })).toHaveAttribute("href", /wa\.me\/5512988887777/);

    // busca por telefone
    await page.goto("/admin/clientes?q=98888-7777");
    await expect(page.getByRole("link", { name: /Cliente Busca E2E/ })).toBeVisible();
  });

  test("configurações salvam e a loja atualiza na hora", async ({ page }) => {
    const { data: original } = await service!.from("store_settings").select("*").eq("id", 1).single();
    let uploadedLogo: string | null = null;
    try {
      await login(page, "/admin/configuracoes");
      await expect(page.getByRole("heading", { name: "Configurações da loja" })).toBeVisible();

      // validação
      await page.getByLabel("WhatsApp da loja (recebe os pedidos)").fill("123");
      await page.getByRole("button", { name: "Salvar configurações" }).click();
      await expect(page.getByText(/WhatsApp inválido/).first()).toBeVisible();
      await page.getByLabel("WhatsApp da loja (recebe os pedidos)").fill("(12) 99199-2477");

      const stamp = `Teste E2E ${Date.now()}`;
      await page.getByLabel("Texto", { exact: true }).fill(stamp);
      await page.getByLabel("Abertura").fill("Oi, Amora! Quero confirmar meu pedido");
      await expect(page.locator("pre")).toContainText("Oi, Amora! Quero confirmar meu pedido\n\nPedido: #000123");

      await page.locator('input[type="file"]').setInputFiles({ name: "logo.png", mimeType: "image/png", buffer: PNG });
      await expect(page.getByRole("button", { name: "Trocar logo" })).toBeVisible({ timeout: 15_000 });

      await page.getByRole("button", { name: "Salvar configurações" }).click();
      await expect(page.getByText("Configurações salvas. A loja já foi atualizada.")).toBeVisible();

      const { data: saved } = await service!.from("store_settings").select("banner_text, whatsapp_order_greeting, logo_path").eq("id", 1).single();
      uploadedLogo = saved!.logo_path;
      expect(saved!.banner_text).toBe(stamp);
      expect(uploadedLogo).toMatch(/^logo\/[0-9a-f-]{36}\.png$/);

      // Loja reflete na hora (sem esperar cache)
      await page.goto("/carrinho");
      await expect(page.getByText(stamp)).toBeVisible();
      await expect(page.locator(`header img[src*="${uploadedLogo}"]`).first()).toBeAttached();
    } finally {
      // Restaura PELO PAINEL (a action atualiza o cache da loja na hora).
      if (original) {
        await page.goto("/admin/configuracoes");
        await page.getByLabel("Texto", { exact: true }).fill(original.banner_text);
        await page.getByLabel("Abertura").fill(original.whatsapp_order_greeting);
        if (!original.logo_path && (await page.getByRole("button", { name: "Usar logo em texto" }).count())) {
          await page.getByRole("button", { name: "Usar logo em texto" }).click();
        }
        await page.getByRole("button", { name: "Salvar configurações" }).click();
        await expect(page.getByText("Configurações salvas. A loja já foi atualizada.")).toBeVisible();
      }
      // Garantia extra: valores exatos de antes do teste.
      if (original) {
        const { id: _id, updated_at: _u, ...rest } = original;
        void _id;
        void _u;
        await service!.from("store_settings").update(rest).eq("id", 1);
      }
      if (uploadedLogo && uploadedLogo !== original?.logo_path) await service!.storage.from("store-assets").remove([uploadedLogo]);
    }
  });
});
