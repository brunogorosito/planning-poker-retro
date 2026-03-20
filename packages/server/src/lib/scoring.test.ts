import { describe, it, expect } from "vitest";
import { calcAverage } from "./scoring";

describe("calcAverage", () => {
  it("retorna null para array vacío", () => {
    expect(calcAverage([])).toBeNull();
  });

  it("retorna null cuando todos son '?'", () => {
    expect(calcAverage(["?", "?", "?"])).toBeNull();
  });

  it("ignora los valores '?'", () => {
    expect(calcAverage(["3", "?", "5"])).toBe(4);
  });

  it("calcula el promedio correctamente", () => {
    expect(calcAverage(["2", "4"])).toBe(3);
    expect(calcAverage(["1", "2", "3"])).toBe(2);
    expect(calcAverage(["5", "8", "13"])).toBe(8.7);
  });

  it("redondea a 1 decimal", () => {
    expect(calcAverage(["1", "2"])).toBe(1.5);
  });

  it("maneja un solo valor numérico", () => {
    expect(calcAverage(["8"])).toBe(8);
    expect(calcAverage(["21"])).toBe(21);
  });

  it("maneja valores del mazo Fibonacci", () => {
    expect(calcAverage(["1", "2", "3", "5", "8", "13", "21"])).toBe(7.6);
  });

  it("mezcla de '?' y numéricos retorna solo promedio de numéricos", () => {
    expect(calcAverage(["?", "5", "?", "5"])).toBe(5);
  });
});
