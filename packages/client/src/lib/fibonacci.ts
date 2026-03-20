export const FIBONACCI = [1, 2, 3, 5, 8, 13, 21];

/** Redondea hacia arriba al siguiente número Fibonacci. */
export function ceilToFib(n: number): number {
  for (const f of FIBONACCI) {
    if (f >= n) return f;
  }
  return FIBONACCI[FIBONACCI.length - 1];
}

/** Promedio numérico de un array de valores de voto (ignora "?"). */
export function calcRoleAverage(values: string[]): number | null {
  const numeric = values
    .filter((v) => v !== "?")
    .map(Number)
    .filter((n) => !isNaN(n));
  if (numeric.length === 0) return null;
  return Math.round((numeric.reduce((a, b) => a + b, 0) / numeric.length) * 10) / 10;
}

/** Sugiere el Fibonacci más cercano por encima del promedio. */
export function suggestFib(avg: number | null): string {
  if (avg === null) return "0";
  return String(ceilToFib(avg));
}

/** Promedio general de valores de consenso guardados (ignora null y "0"). */
export function overallAvg(values: (string | null)[]): string {
  const nums = values
    .filter((v): v is string => v !== null && v !== "0" && v !== "")
    .map(Number)
    .filter((n) => !isNaN(n) && n > 0);
  if (nums.length === 0) return "—";
  return String(Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 10) / 10);
}
