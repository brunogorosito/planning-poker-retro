import { describe, it, expect } from "vitest";
import { generateRoomCode, generateId } from "./id";

describe("generateRoomCode", () => {
  it("genera un código de 6 caracteres", () => {
    expect(generateRoomCode()).toHaveLength(6);
  });

  it("solo contiene letras mayúsculas y dígitos", () => {
    const code = generateRoomCode();
    expect(code).toMatch(/^[A-Z0-9]{6}$/);
  });

  it("genera códigos distintos en llamadas sucesivas", () => {
    const codes = new Set(Array.from({ length: 20 }, () => generateRoomCode()));
    expect(codes.size).toBeGreaterThan(1);
  });
});

describe("generateId", () => {
  it("genera un string hexadecimal de 32 caracteres", () => {
    const id = generateId();
    expect(id).toHaveLength(32);
    expect(id).toMatch(/^[0-9a-f]{32}$/);
  });

  it("genera IDs únicos en llamadas sucesivas", () => {
    const ids = new Set(Array.from({ length: 20 }, () => generateId()));
    expect(ids.size).toBe(20);
  });
});
