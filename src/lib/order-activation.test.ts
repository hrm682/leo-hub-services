import { describe, it, expect } from "vitest";

import { computeExpiration } from "./order-activation.server";

describe("computeExpiration", () => {
  const now = new Date("2026-08-18T00:00:00Z");

  it("compra: suma la duración desde ahora", () => {
    expect(computeExpiration("compra", null, 30, now).toISOString()).toBe(
      new Date("2026-09-17T00:00:00Z").toISOString(),
    );
  });

  it("renovación con servicio vigente: extiende desde el vencimiento futuro", () => {
    const exp = "2026-09-01T00:00:00Z";
    expect(computeExpiration("renovacion", exp, 30, now).toISOString()).toBe(
      new Date("2026-10-01T00:00:00Z").toISOString(),
    );
  });

  it("renovación con servicio ya vencido: extiende desde ahora", () => {
    const exp = "2026-08-01T00:00:00Z";
    expect(computeExpiration("renovacion", exp, 30, now).toISOString()).toBe(
      new Date("2026-09-17T00:00:00Z").toISOString(),
    );
  });

  it("compra ignora un vencimiento previo", () => {
    const exp = "2027-01-01T00:00:00Z";
    expect(computeExpiration("compra", exp, 30, now).toISOString()).toBe(
      new Date("2026-09-17T00:00:00Z").toISOString(),
    );
  });
});
