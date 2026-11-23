import { expect, test } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { adminClient, cleanupTestUser, createTestUser } from "./helpers";

/**
 * Painel: pedido chega em tempo real, admin confirma pagamento, prepara,
 * fatura, envia e conclui. Fluxos 13, 14, 15, 16 e 18 do plano de testes.
 */
test.describe("painel administrativo — pedidos", () => {
  const service = adminClient();
  test.skip(!service, "Defina SUPABASE_SECRET_KEY no .env.local para rodar o E2E.");
  test.skip(({ isMobile }) => isMobile, "Fluxo do painel validado no desktop.");

  let customer: { id: string; email: string; password: string };
  let adminUser: { id: string; email: string; password: string };

  /** Cria um pedido como a cliente (mesmo caminho do checkout: RPC create_order). */
  async function placeOrder(qty = 1) {
    const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, { auth: { persistSession: false } });
    await sb.auth.signInWithPassword({ email: customer.email, password: customer.password });
    let { data: addr } = await sb.from("addresses").select("id").limit(1).maybeSingle();
    if (!addr) {
      ({ data: addr } = await sb
        .from("addresses")
        .insert({ user_id: customer.id, recipient_name: "Cliente Teste", cep: "01310100", street: "Av. Paulista", number: "1000", district: "Bela Vista", city: "São Paulo", state: "SP", is_default: true })
        .select("id")
        .single());
    }
    const { data: variant } = await service!
      .from("product_variants")
      .select("id, product:products!inner(slug), inventory!inner(available)")
      .eq("product.slug", "demo-short-modelador")
      .gt("inventory.available", 3)
      .limit(1)
      .single();
    const { data, error } = await sb.rpc("create_order", {
      p_items: [{ variant_id: variant!.id, quantity: qty }],
      p_address_id: addr!.id,
      p_idempotency_key: crypto.randomUUID(),
    });
    if (error) throw new Error(error.message);
    return data as { order_id: string; order_number: number };
  }

  test.beforeAll(async () => {
    customer = await createTestUser(service!);
    adminUser = await createTestUser(service!, { role: "admin" });
  });

  test.afterAll(async () => {
    if (customer) await cleanupTestUser(service!, customer.id);
    if (adminUser) await service!.auth.admin.deleteUser(adminUser.id);
  });

  test("cliente comum não vê o painel", async ({ page }) => {
    await page.goto("/entrar?next=/admin");
    await page.getByLabel("E-mail").fill(customer.email);
    await page.getByLabel("Senha").fill(customer.password);
    await page.getByRole("button", { name: "Entrar" }).click();
    await expect(page.getByRole("heading", { name: "Página não encontrada" })).toBeVisible();
  });

  test("pedido chega em tempo real e percorre todo o fluxo", async ({ page }, testInfo) => {
    const first = await placeOrder(1);

    await page.goto("/entrar?next=/admin/pedidos");
    await page.getByLabel("E-mail").fill(adminUser.email);
    await page.getByLabel("Senha").fill(adminUser.password);
    await page.getByRole("button", { name: "Entrar" }).click();
    await expect(page.getByRole("heading", { name: "Pedidos" })).toBeVisible();
    await expect(page.getByText(`#${String(first.order_number).padStart(6, "0")}`).first()).toBeVisible();
    await expect(page.getByText("Pedidos ao vivo")).toBeVisible({ timeout: 20_000 });

    // Novo pedido com o painel aberto: aviso + lista atualizam sozinhos
    const second = await placeOrder(2);
    const num = `#${String(second.order_number).padStart(6, "0")}`;
    await expect(page.getByText(`Novo pedido ${num}`)).toBeVisible({ timeout: 20_000 });
    await expect(page.getByRole("link", { name: num })).toBeVisible({ timeout: 20_000 });
    await page.screenshot({ path: testInfo.outputPath("pedidos-ao-vivo.png"), fullPage: true });

    // Detalhe + fluxo de status
    await page.getByRole("link", { name: num }).click();
    await expect(page.getByRole("heading", { name: `Pedido ${num}` })).toBeVisible();

    const step = async (button: string, expected: string, fill?: () => Promise<void>) => {
      await page.getByRole("button", { name: button, exact: true }).click();
      if (fill) await fill();
      await page.getByRole("button", { name: "Confirmar", exact: true }).click();
      await expect(page.getByText(`${button}: feito.`)).toBeVisible();
      await expect(page.locator("header").getByText(expected)).toBeVisible();
    };

    await step("Confirmar pagamento", "Pagamento confirmado", async () => {
      await page.getByLabel("Forma de pagamento").selectOption("pix");
    });
    await step("Iniciar preparação", "Em preparação");
    await step("Marcar como faturado", "Faturado");
    await step("Registrar envio", "Enviado", async () => {
      await page.getByLabel("Transportadora").fill("Correios");
      await page.getByLabel("Código de rastreio").fill("BR123456789");
    });
    await step("Marcar como concluído", "Concluído");
    await page.screenshot({ path: testInfo.outputPath("pedido-concluido.png"), fullPage: true });

    const { data: order } = await service!
      .from("orders")
      .select("status, payments(method, status), shipments(carrier, tracking_code), history:order_status_history(to_status)")
      .eq("id", second.order_id)
      .single();
    expect(order!.status).toBe("COMPLETED");
    expect(order!.payments).toEqual([{ method: "pix", status: "confirmed" }]);
    expect(order!.history.map((h: { to_status: string }) => h.to_status).sort()).toEqual(
      ["PENDING", "PAID", "PROCESSING", "INVOICED", "SHIPPED", "COMPLETED"].sort(),
    );

    // Cancelamento exige motivo
    await page.goto(`/admin/pedidos/${first.order_id}`);
    await page.getByRole("button", { name: "Cancelar pedido" }).click();
    page.once("dialog", (d) => d.accept());
    await page.getByRole("button", { name: "Confirmar", exact: true }).click();
    await expect(page.getByText("Informe o motivo do cancelamento.")).toBeVisible();
    await page.getByLabel(/Motivo do cancelamento/).fill("Teste automatizado");
    page.once("dialog", (d) => d.accept());
    await page.getByRole("button", { name: "Confirmar", exact: true }).click();
    await expect(page.locator("header").getByText("Cancelado")).toBeVisible();
  });
});
