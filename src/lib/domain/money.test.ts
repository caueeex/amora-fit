import { describe, expect, it } from "vitest";
import { addCents, formatBRL, multiplyCents, parseBRLToCents } from "./money";

describe("money", () => {
  it("formata centavos em BRL", () => {
    expect(formatBRL(8990)).toBe("R$ 89,90");
    expect(formatBRL(5)).toBe("R$ 0,05");
    expect(formatBRL(129900)).toBe("R$ 1.299,00");
    expect(formatBRL(123456789)).toBe("R$ 1.234.567,89");
    expect(formatBRL(-1500)).toBe("-R$ 15,00");
  });

  it("soma sem erro de ponto flutuante", () => {
    // 0,10 + 0,20 em float daria 0.30000000000000004
    expect(addCents(10, 20)).toBe(30);
    expect(addCents(8990, 5990)).toBe(14980);
    expect(formatBRL(addCents(8990, 5990))).toBe("R$ 149,80");
  });

  it("multiplica por quantidade inteira", () => {
    expect(multiplyCents(8990, 3)).toBe(26970);
    expect(() => multiplyCents(8990, 1.5)).toThrow();
    expect(() => multiplyCents(8990, -1)).toThrow();
    expect(() => multiplyCents(89.9, 1)).toThrow();
  });

  it("converte texto digitado em centavos", () => {
    expect(parseBRLToCents("89,90")).toBe(8990);
    expect(parseBRLToCents("R$ 89,9")).toBe(8990);
    expect(parseBRLToCents("89.90")).toBe(8990);
    expect(parseBRLToCents("1.299,00")).toBe(129900);
    expect(parseBRLToCents("1,299.00")).toBe(129900);
    expect(parseBRLToCents("1.299")).toBe(129900);
    expect(parseBRLToCents("89")).toBe(8900);
    expect(parseBRLToCents("0,05")).toBe(5);
    expect(parseBRLToCents("")).toBeNull();
    expect(parseBRLToCents("abc")).toBeNull();
    expect(parseBRLToCents("-10")).toBeNull();
  });
});
