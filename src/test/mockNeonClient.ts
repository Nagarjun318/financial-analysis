/**
 * Shared fake for `../services/neonClient` in component/hook tests.
 * Mimics the PostgREST chainable (`from().select().eq().order()` etc.) with
 * per-table scripted results. Awaiting a chain resolves the scripted result.
 */
export interface MockResult {
  data?: unknown;
  error?: { message: string } | null;
  count?: number;
}

interface Chain {
  select: (...args: unknown[]) => Chain;
  eq: (...args: unknown[]) => Chain;
  order: (...args: unknown[]) => Chain;
  insert: (...args: unknown[]) => Chain;
  update: (...args: unknown[]) => Chain;
  delete: (...args: unknown[]) => Chain;
  in: (...args: unknown[]) => Chain;
  single: () => Promise<MockResult>;
  then: (resolve: (v: MockResult) => unknown) => Promise<unknown>;
}

export function chainFor(result: MockResult): Chain {
  const chain = {} as Chain;
  chain.select = () => chain;
  chain.eq = () => chain;
  chain.order = () => chain;
  chain.insert = () => chain;
  chain.update = () => chain;
  chain.delete = () => chain;
  chain.in = () => chain;
  chain.single = async () => result;
  chain.then = (resolve) => Promise.resolve(result).then(resolve);
  return chain;
}

export interface MockClientState {
  /** result per table for terminal select chains */
  tables: Record<string, MockResult>;
  /** result for `.insert().select().single()` / `.update()…single()` */
  singleResult: MockResult;
  calls: { table: string; op: string; args: unknown[] }[];
}

export function createMockClient(state: MockClientState): {
  from: (table: string) => Chain;
} {
  const record = (table: string, op: string, args: unknown[]) => {
    state.calls.push({ table, op, args });
  };
  return {
    from: (table: string) => {
      const result = state.tables[table] ?? { data: [], error: null };
      const single = state.singleResult ?? result;
      const chain = {} as Chain & { __table: string };
      chain.select = (...args: unknown[]) => (record(table, 'select', args), chain);
      chain.eq = (...args: unknown[]) => (record(table, 'eq', args), chain);
      chain.order = (...args: unknown[]) => (record(table, 'order', args), chain);
      chain.insert = (...args: unknown[]) => (record(table, 'insert', args), chain);
      chain.update = (...args: unknown[]) => (record(table, 'update', args), chain);
      chain.delete = (...args: unknown[]) => (record(table, 'delete', args), chain);
      chain.in = (...args: unknown[]) => (record(table, 'in', args), chain);
      chain.single = async () => single;
      chain.then = (resolve) => Promise.resolve(result).then(resolve);
      return chain;
    },
  };
}
