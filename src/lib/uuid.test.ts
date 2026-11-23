import { afterEach, describe, expect, it, vi } from "vitest";
import { uuidv4 } from "./uuid";

describe("uuidv4", () => {
  afterEach(() => vi.unstubAllGlobals());
  it("gera UUID v4 válido mesmo sem crypto.randomUUID", () => {
    const real = globalThis.crypto;
    vi.stubGlobal("crypto", { getRandomValues: (a: Uint8Array) => real.getRandomValues(a) });
    const ids = new Set(Array.from({ length: 200 }, uuidv4));
    expect(ids.size).toBe(200);
    for (const id of ids) expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });
});
