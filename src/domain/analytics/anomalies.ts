import { Transaction, AnomalyResult } from '../../types';

// Detect anomalies using z-score within each category (separate credit vs debit contexts).
// Only considers expense (negative amounts) by absolute value currently.

interface CategoryStats { mean: number; std: number; }

function computeStats(values: number[]): CategoryStats | null {
  if (values.length < 5) return null; // Need minimum sample size
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / values.length;
  const std = Math.sqrt(variance);
  if (std === 0) return null; // No variability
  return { mean, std };
}

export function detectAnomalies(transactions: Transaction[], zThresholdModerate = 2.0, zThresholdSevere = 3.0): AnomalyResult[] {
  // Group by category (expenses only: amount < 0) using abs values.
  const categoryValues = new Map<string, number[]>();
  for (const t of transactions) {
    if (t.amount < 0) {
      const list = categoryValues.get(t.category) || [];
      list.push(Math.abs(t.amount));
      categoryValues.set(t.category, list);
    }
  }

  const categoryStats = new Map<string, CategoryStats>();
  for (const [cat, vals] of categoryValues.entries()) {
    const stats = computeStats(vals);
    if (stats) categoryStats.set(cat, stats);
  }

  const anomalies: AnomalyResult[] = [];
  for (const t of transactions) {
    if (t.amount < 0) {
      const stats = categoryStats.get(t.category);
      if (!stats) continue;
      const value = Math.abs(t.amount);
      const z = (value - stats.mean) / stats.std;
      if (z >= zThresholdModerate) {
        anomalies.push({
          transactionId: t.id,
          date: t.date,
          description: t.description,
          amount: t.amount,
          category: t.category,
          zScore: z,
          severity: z >= zThresholdSevere ? 'severe' : 'moderate'
        });
      }
    }
  }
  return anomalies.sort((a, b) => b.zScore - a.zScore);
}
