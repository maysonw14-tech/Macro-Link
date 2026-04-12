/** Best-effort map arbitrary header text to YYYY-MM for macro alignment. */
export function normalizePeriodLabels(labels: string[]): string[] {
  const base = new Date();
  base.setUTCDate(1);
  base.setUTCHours(0, 0, 0, 0);
  let cursor = 0;
  return labels.map((raw) => {
    const parsed = parseToIsoMonth(String(raw).trim());
    if (parsed) return parsed;
    const d = new Date(base);
    d.setUTCMonth(base.getUTCMonth() + cursor);
    cursor += 1;
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
  });
}

function parseToIsoMonth(s: string): string | null {
  const iso = /^(\d{4})-(\d{2})$/.exec(s);
  if (iso) return `${iso[1]}-${iso[2]}`;
  const mdy = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s);
  if (mdy) {
    const mm = mdy[1]!.padStart(2, "0");
    return `${mdy[3]}-${mm}`;
  }
  const mon = s.toLowerCase();
  const months: Record<string, string> = {
    jan: "01",
    feb: "02",
    mar: "03",
    apr: "04",
    may: "05",
    jun: "06",
    jul: "07",
    aug: "08",
    sep: "09",
    oct: "10",
    nov: "11",
    dec: "12",
  };
  const mshort = /^([a-z]{3})[\s.-]*(\d{2}|\d{4})$/i.exec(mon.replace(/\s+/g, ""));
  if (mshort) {
    const mKey = mshort[1]!.toLowerCase().slice(0, 3);
    const mNum = months[mKey];
    if (!mNum) return null;
    let y = Number(mshort[2]);
    if (y < 100) y += 2000;
    return `${y}-${mNum}`;
  }
  return null;
}
