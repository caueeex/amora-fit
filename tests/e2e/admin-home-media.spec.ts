import { expect, test, type Page } from "@playwright/test";
import { adminClient, createTestUser } from "./helpers";

/** Página inicial: cards com imagem, atalhos em texto e vídeos com produto. */
const service = adminClient();

test.describe("painel — novas seções da página inicial", () => {
  test.skip(!service, "Defina SUPABASE_SECRET_KEY no .env.local para rodar o E2E.");
  test.skip(({ isMobile }) => isMobile, "Fluxo do painel validado no desktop.");

  let admin: { id: string; email: string; password: string };
  const created: string[] = [];

  test.beforeAll(async () => {
    const probe = await service!.from("home_sections").insert({ type: "videos", title: "probe", is_active: false }).select("id").single();
    test.skip(Boolean(probe.error), "Migration 0013 ainda não aplicada no Supabase.");
    await service!.from("home_sections").delete().eq("id", probe.data!.id);
    admin = await createTestUser(service!, { role: "admin" });
  });

  test.afterAll(async () => {
    for (const id of created) {
      const { data } = await service!.from("home_sections").select("config").eq("id", id).maybeSingle();
      const json = JSON.stringify(data?.config ?? {});
      const videos = json.match(/videos\/[0-9a-f-]{36}\.(mp4|webm)/g) ?? [];
      if (videos.length) await service!.storage.from("store-videos").remove(videos);
      await service!.from("home_sections").delete().eq("id", id);
    }
    if (admin) await service!.auth.admin.deleteUser(admin.id);
  });

  async function login(page: Page) {
    await page.goto("/entrar?next=/admin/pagina-inicial");
    await page.getByLabel("E-mail").fill(admin.email);
    await page.getByLabel("Senha").fill(admin.password);
    await page.getByRole("button", { name: "Entrar" }).click();
    await expect(page.getByRole("button", { name: "+ Adicionar seção" })).toBeVisible({ timeout: 30_000 });
    await page.waitForLoadState("networkidle");
  }

  async function addSection(page: Page, typeLabel: RegExp) {
    await page.goto("/admin/pagina-inicial");
    await page.getByRole("button", { name: "+ Adicionar seção" }).click();
    await page.getByRole("button", { name: typeLabel }).click();
    await expect(page).toHaveURL(/\/admin\/pagina-inicial\/[0-9a-f-]{36}\?nova=1/, { timeout: 30_000 });
    created.push(page.url().match(/inicial\/([0-9a-f-]{36})/)![1]);
    await page.waitForLoadState("networkidle");
  }

  async function activateAndSave(page: Page) {
    await page.getByLabel("Seção ativa").check();
    await page.getByRole("button", { name: "Salvar seção" }).click();
    await expect(page.getByText("Seção salva. A página inicial já foi atualizada.")).toBeVisible();
  }

  test("cards por tamanho e atalhos por preço aparecem na loja", async ({ page }) => {
    await login(page);

    await addSection(page, /Cards com imagem/);
    await page.getByLabel("Título", { exact: true }).fill("Compre por tamanho E2E");
    await activateAndSave(page);

    await addSection(page, /Atalhos em texto/);
    await page.getByLabel("Título", { exact: true }).fill("Compre do seu jeito E2E");
    await page.getByLabel("Link").first().fill("javascript:alert(1)");
    await page.getByLabel("Seção ativa").check();
    await page.getByRole("button", { name: "Salvar seção" }).click();
    await expect(page.getByText(/Link inválido/)).toBeVisible();
    await page.getByLabel("Link").first().fill("/produtos?max=80");
    await page.getByRole("button", { name: "Salvar seção" }).click();
    await expect(page.getByText("Seção salva. A página inicial já foi atualizada.")).toBeVisible();

    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Compre por tamanho E2E" })).toBeVisible();
    for (const t of ["PP", "P", "M", "G", "GG"]) await expect(page.locator(`a[href="/produtos?tamanho=${t}"]`).first()).toBeVisible();
    await expect(page.getByRole("heading", { name: "Compre do seu jeito E2E" })).toBeVisible();
    await expect(page.locator('a[href="/produtos?max=80"]', { hasText: "Até R$ 80" })).toBeVisible();

    // o atalho leva à listagem filtrada
    await page.locator('a[href="/produtos?max=80"]').click();
    await expect(page).toHaveURL(/\/produtos\?max=80/);
  });

  test("vídeo com produto ligado toca na loja", async ({ page }) => {
    await login(page);
    await addSection(page, /Vídeos com produtos/);

    // Gera um vídeo WebM curtinho no próprio navegador (sem arquivo externo).
    const webm: number[] = await page.evaluate(async () => {
      const canvas = Object.assign(document.createElement("canvas"), { width: 180, height: 320 });
      const ctx = canvas.getContext("2d")!;
      const rec = new MediaRecorder(canvas.captureStream(15), { mimeType: "video/webm" });
      const chunks: Blob[] = [];
      rec.ondataavailable = (e) => chunks.push(e.data);
      const done = new Promise((r) => (rec.onstop = r));
      rec.start();
      for (let f = 0; f < 15; f++) {
        ctx.fillStyle = f % 2 ? "#560832" : "#FFEC9E";
        ctx.fillRect(0, 0, 180, 320);
        await new Promise((r) => setTimeout(r, 60));
      }
      rec.stop();
      await done;
      return Array.from(new Uint8Array(await new Blob(chunks, { type: "video/webm" }).arrayBuffer()));
    });

    await page.getByRole("button", { name: "+ Adicionar vídeo" }).click();
    await page.locator('input[type="file"][accept="video/mp4,video/webm"]').first().setInputFiles({ name: "clip.webm", mimeType: "video/webm", buffer: Buffer.from(webm) });
    await expect(page.getByRole("button", { name: "Trocar vídeo" })).toBeVisible({ timeout: 30_000 });
    await page.getByLabel("Produto ligado").selectOption({ label: "Top Alça Cruzada" });
    await activateAndSave(page);

    await page.goto("/");
    const card = page.locator("video").locator("..").filter({ hasText: "Top Alça Cruzada" }).first();
    await card.scrollIntoViewIfNeeded();
    await expect(card.getByRole("link", { name: "Comprar" })).toHaveAttribute("href", "/produto/demo-top-alca-cruzada");
    await expect.poll(() => card.locator("video").evaluate((v: HTMLVideoElement) => Boolean(v.src) && !v.paused), { timeout: 15_000 }).toBe(true);
  });
});
