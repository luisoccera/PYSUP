export async function collectPages<T>(
  readPage: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>,
  maxRows = 50_000,
  pageSize = 500,
): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += pageSize) {
    const result = await readPage(from, from + pageSize - 1);
    if (result.error) throw result.error;
    const page = result.data ?? [];
    if (rows.length + page.length > maxRows) throw new Error('export_too_large');
    rows.push(...page);
    if (page.length < pageSize) return rows;
  }
}
