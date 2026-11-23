import { describe, expect, it } from "vitest";
import { formatBrazilianPhone, normalizeBrazilianPhone } from "./phone";

describe("phone", () => {
  it("normaliza o WhatsApp da loja", () => {
    expect(normalizeBrazilianPhone("12991992477")).toBe("5512991992477");
    expect(normalizeBrazilianPhone("(12) 99199-2477")).toBe("5512991992477");
    expect(normalizeBrazilianPhone("+55 12 99199-2477")).toBe("5512991992477");
  });

  it("rejeita números inválidos", () => {
    expect(normalizeBrazilianPhone("99199-2477")).toBeNull();
    expect(normalizeBrazilianPhone("12891992477")).toBeNull(); // celular sem 9
    expect(normalizeBrazilianPhone("+1 415 555 0100")).toBeNull();
    expect(normalizeBrazilianPhone("")).toBeNull();
  });

  it("formata para exibição", () => {
    expect(formatBrazilianPhone("5512991992477")).toBe("(12) 99199-2477");
  });
});
