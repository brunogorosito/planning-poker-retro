import { describe, it, expect } from "vitest";
import { FIBONACCI, ceilToFib, calcRoleAverage, suggestFib, overallAvg } from "./fibonacci";

describe("FIBONACCI", () => {
  it("contiene la secuencia correcta", () => {
    expect(FIBONACCI).toEqual([1, 2, 3, 5, 8, 13, 21]);
  });
});

describe("ceilToFib", () => {
  it("devuelve 1 para n=0", () => {
    expect(ceilToFib(0)).toBe(1);
  });

  it("devuelve 1 para n=1", () => {
    expect(ceilToFib(1)).toBe(1);
  });

  it("devuelve el mismo valor cuando cae exacto en Fibonacci", () => {
    expect(ceilToFib(2)).toBe(2);
    expect(ceilToFib(5)).toBe(5);
    expect(ceilToFib(13)).toBe(13);
    expect(ceilToFib(21)).toBe(21);
  });

  it("redondea hacia arriba al siguiente Fibonacci", () => {
    expect(ceilToFib(4)).toBe(5);   // entre 3 y 5
    expect(ceilToFib(6)).toBe(8);   // entre 5 y 8
    expect(ceilToFib(7)).toBe(8);
    expect(ceilToFib(9)).toBe(13);  // entre 8 y 13
    expect(ceilToFib(14)).toBe(21); // entre 13 y 21
  });

  it("caso real: Dev 3 + QA 4 = 7 → 8", () => {
    expect(ceilToFib(7)).toBe(8);
  });

  it("devuelve 21 para valores mayores a 21", () => {
    expect(ceilToFib(22)).toBe(21);
    expect(ceilToFib(100)).toBe(21);
  });

  it("maneja decimales redondeando hacia arriba", () => {
    expect(ceilToFib(3.5)).toBe(5);
    expect(ceilToFib(1.1)).toBe(2);
  });
});

describe("calcRoleAverage", () => {
  it("retorna null para array vacío", () => {
    expect(calcRoleAverage([])).toBeNull();
  });

  it("retorna null cuando todos los valores son '?'", () => {
    expect(calcRoleAverage(["?", "?"])).toBeNull();
  });

  it("ignora los valores '?'", () => {
    expect(calcRoleAverage(["3", "?", "5"])).toBe(4);
  });

  it("calcula el promedio correctamente", () => {
    expect(calcRoleAverage(["2", "4"])).toBe(3);
    expect(calcRoleAverage(["1", "2", "3"])).toBe(2);
    expect(calcRoleAverage(["5", "8", "13"])).toBe(8.7);
  });

  it("redondea a 1 decimal", () => {
    expect(calcRoleAverage(["1", "2"])).toBe(1.5);
    expect(calcRoleAverage(["1", "3"])).toBe(2);
  });

  it("maneja un solo valor", () => {
    expect(calcRoleAverage(["8"])).toBe(8);
  });
});

describe("suggestFib", () => {
  it("retorna '0' para null", () => {
    expect(suggestFib(null)).toBe("0");
  });

  it("retorna el Fibonacci exacto si el promedio cae en la escala", () => {
    expect(suggestFib(5)).toBe("5");
    expect(suggestFib(8)).toBe("8");
  });

  it("redondea hacia arriba al siguiente Fibonacci", () => {
    expect(suggestFib(3.5)).toBe("5");
    expect(suggestFib(6)).toBe("8");
  });

  it("retorna string", () => {
    expect(typeof suggestFib(3)).toBe("string");
  });
});

describe("overallAvg", () => {
  it("retorna '—' para array vacío", () => {
    expect(overallAvg([])).toBe("—");
  });

  it("retorna '—' cuando todos son null", () => {
    expect(overallAvg([null, null])).toBe("—");
  });

  it("retorna '—' cuando todos son '0'", () => {
    expect(overallAvg(["0", "0"])).toBe("—");
  });

  it("ignora valores null y '0'", () => {
    expect(overallAvg(["5", null, "0", "3"])).toBe("4");
  });

  it("calcula el promedio correctamente", () => {
    expect(overallAvg(["2", "4", "6"])).toBe("4");
    expect(overallAvg(["5", "8"])).toBe("6.5");
  });

  it("retorna string", () => {
    expect(typeof overallAvg(["3", "5"])).toBe("string");
  });
});
