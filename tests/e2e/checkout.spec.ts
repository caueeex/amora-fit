import { expect, test } from "@playwright/test";
import { adminClient, cleanupTestUser, createTestUser } from "./helpers";

/**
 * Fluxo principal: login → produto → carrinho → checkout → pedido gravado → WhatsApp.
 * Fluxos 2, 6, 7, 10, 11, 12 e 17 do plano de testes.
 */
test.describe("compra com finalização pelo WhatsApp", () => {
  const admin = adminClient();
  test.skip(!admin, "Defina SUPABASE_SECRET_KEY no .env.local para rodar o E2E.");

  let user: { id: string; email: string; password: string };

  test.beforeAll(async () => {
    user = await createTestUser(admin!);
  });

  test.afterAll(async () => {
    if (user) await cleanupTestUser(admin!, user.id);
  });

  test("cliente compra e o pedido é registrado antes de abrir o WhatsApp", async ({ page, context }, testInfo) => {
    // Rota privada exige login e preserva o destino
    await page.goto("/checkout");
    await expect(page).toHaveURL(/\/entrar\?next=%2Fcheckout/);

    await page.getByLabel("E-mail").fill(user.email);
    await page.getByLabel("Senha").fill(user.password);
    await page.getByRole("button", { name: "Entrar" }).click();
    await expect(page).toHaveURL(/\/checkout/);

    // Escolhe um produto com estoque
    await page.goto("/produto/demo-top-alca-cruzada");
    await expect(page.getByRole("heading", { level: 1, name: "Top Alça Cruzada" })).toBeVisible();
    await page.getByRole("button", { name: "Adicionar ao carrinho" }).click();
    await expect(page.getByText("Escolha um tamanho.")).toBeVisible(); // validação de variação

    const sizeButton = page.locator('button[aria-label^="Tamanho "]:not([disabled])').first();
    const size = (await sizeButton.textContent())?.trim();
    await sizeButton.click();
    await page.getByRole("button", { name: "Aumentar quantidade" }).click();
    await page.getByRole("button", { name: "Adicionar ao carrinho" }).click();
    await expect(page.getByText("Adicionado ao carrinho")).toBeVisible();

    // Carrinho persiste entre páginas e calcula valores
    await page.goto("/carrinho");
    await expect(page.getByText("Top Alça Cruzada")).toBeVisible();
    await expect(page.getByText("R$ 119,80").first()).toBeVisible(); // 2 × 59,90
    await page.getByRole("link", { name: "Finalizar pedido" }).click();

    // Checkout
    await expect(page.getByRole("heading", { name: "Finalizar pedido" })).toBeVisible();
    await page.getByLabel("WhatsApp", { exact: true }).fill("(12) 99199-2477");
    await page.getByLabel("CEP").fill("01310-100");
    await page.getByLabel("Rua").fill("Avenida Paulista");
    await page.getByLabel("Número").fill("1000");
    await page.getByLabel("Bairro").fill("Bela Vista");
    await page.getByLabel("Cidade").fill("São Paulo");
    await page.getByLabel("UF").selectOption("SP");
    await page.getByRole("button", { name: "Salvar endereço" }).click();
    await expect(page.getByText("Avenida Paulista, 1000").first()).toBeVisible();
    await expect(page.getByText("R$ 119,80").first()).toBeVisible(); // preço vindo do servidor

    await page.screenshot({ path: testInfo.outputPath("checkout.png"), fullPage: true });

    // Confirma: abre a aba do WhatsApp e navega para o pedido
    const popupPromise = context.waitForEvent("page");
    await page.getByRole("button", { name: "Confirmar e enviar no WhatsApp" }).click();
    const popup = await popupPromise;
    await expect.poll(() => popup.url(), { timeout: 20_000 }).toMatch(/wa\.me\/5512991992477|api\.whatsapp\.com|whatsapp\.com/);

    await expect(page).toHaveURL(/\/minha-conta\/pedidos\/[0-9a-f-]{36}\?novo=1/);
    await expect(page.getByText(/Pedido #\d{6} registrado/)).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath("pedido.png"), fullPage: true });

    // Pedido persistido no banco, com preço calculado no servidor
    const orderId = page.url().match(/pedidos\/([0-9a-f-]{36})/)![1];
    const { data: order } = await admin!
      .from("orders")
      .select("status, subtotal_cents, total_cents, customer_phone, items:order_items(product_name, size, quantity, unit_price_cents)")
      .eq("id", orderId)
      .single();
    expect(order).toMatchObject({ status: "PENDING", subtotal_cents: 11980, total_cents: 11980, customer_phone: "5512991992477" });
    expect(order!.items).toEqual([{ product_name: "Top Alça Cruzada", size, quantity: 2, unit_price_cents: 5990 }]);

    // Mensagem do WhatsApp gerada a partir do pedido gravado
    const waLink = await page.getByRole("link", { name: "Enviar pedido no WhatsApp" }).getAttribute("href");
    const text = decodeURIComponent(new URL(waLink!).searchParams.get("text")!);
    expect(text).toContain("Olá! Gostaria de confirmar meu pedido na Amora Fit 💜");
    expect(text).toMatch(/Pedido: #\d{6}/);
    expect(text).toContain("Cliente: Cliente Teste E2E");
    expect(text).toContain(`1. Top Alça Cruzada\nTamanho: ${size}`);
    expect(text).toContain("Quantidade: 2\nValor: R$ 59,90 cada (R$ 119,80)");
    expect(text).toContain("Subtotal: R$ 119,80");

    // Carrinho foi esvaziado; pedido aparece em Minha conta
    await page.goto("/minha-conta");
    await expect(page.getByText("Aguardando atendimento")).toBeVisible();
    await page.goto("/carrinho");
    await expect(page.getByText("Seu carrinho está vazio")).toBeVisible();
  });
});
