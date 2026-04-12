export function Disclaimer() {
  return (
    <aside className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-100">
      <p className="font-medium">Important</p>
      <p className="mt-1">
        Macro Link is a <strong>scenario tool</strong>, not financial, tax, or investment advice. Outputs depend on your
        mappings, simplified Retail assumptions, and cached public-data proxies. Always verify against authoritative ABS
        releases and your own models.
      </p>
      <p className="mt-2 text-xs opacity-90">
        ABS data © Commonwealth of Australia; use is subject to ABS licensing terms.
      </p>
    </aside>
  );
}
