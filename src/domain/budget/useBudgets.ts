import { useCallback, useEffect, useState } from 'react';
import { CategoryBudget, BudgetVariance, Transaction } from '../../types';

const STORAGE_KEY = 'fa_budgets_v1';

function readStoredBudgets(): CategoryBudget[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed.filter(b => b && typeof b.category === 'string');
    return [];
  } catch { return []; }
}

function writeStoredBudgets(budgets: CategoryBudget[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(budgets));
}

export function useBudgets() {
  const [budgets, setBudgets] = useState<CategoryBudget[]>(() => readStoredBudgets());

  useEffect(() => { writeStoredBudgets(budgets); }, [budgets]);

  const upsertBudget = useCallback((category: string, monthlyTarget: number) => {
    setBudgets((prev: CategoryBudget[]) => {
      const existing = prev.find((b: CategoryBudget) => b.category === category);
      if (existing) return prev.map((b: CategoryBudget) => b.category === category ? { ...b, monthlyTarget } : b);
      return [...prev, { category, monthlyTarget }];
    });
  }, []);

  const removeBudget = useCallback((category: string) => {
    setBudgets((prev: CategoryBudget[]) => prev.filter((b: CategoryBudget) => b.category !== category));
  }, []);

  return { budgets, upsertBudget, removeBudget };
}

export function computeBudgetVariance(
  transactions: Transaction[],
  budgets: CategoryBudget[],
  monthKey: string,
  category: string
): BudgetVariance | null {
  const budget = budgets.find(b => b.category === category);
  if (!budget) return null;
  // Sum expense (debit) for category in specified month
  let actual = 0;
  for (const t of transactions) {
    if (t.type === 'debit' && t.category.split('-').includes(category) && t.date.startsWith(monthKey)) {
      actual += Math.abs(t.amount);
    }
  }
  const variance: BudgetVariance = {
    category,
    monthKey,
    actual,
    target: budget.monthlyTarget,
    variance: actual - budget.monthlyTarget,
    percent: budget.monthlyTarget > 0 ? actual / budget.monthlyTarget : undefined,
  };
  return variance;
}
