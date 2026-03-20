/** Promedio numérico de votos (ignora "?"). Retorna null si no hay valores numéricos. */
export function calcAverage(voteValues: string[]): number | null {
  const numeric = voteValues
    .filter((v) => v !== "?")
    .map(Number)
    .filter((n) => !isNaN(n));
  if (numeric.length === 0) return null;
  const sum = numeric.reduce((a, b) => a + b, 0);
  return Math.round((sum / numeric.length) * 10) / 10;
}
