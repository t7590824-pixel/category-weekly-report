// ─── Formatting utilities for report tables ──────────────────────────────────

export function fmtMoney(v: number | null | undefined, decimals = 0): string {
  if (v === null || v === undefined) return "-";
  return "$" + v.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

export function fmtNum(v: number | null | undefined, decimals = 0): string {
  if (v === null || v === undefined) return "-";
  return v.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

export function fmtPct(v: number | null | undefined, decimals = 2): string {
  if (v === null || v === undefined) return "-";
  return (v * 100).toFixed(decimals) + "%";
}

export function fmtRate(v: number | null | undefined, decimals = 2): string {
  if (v === null || v === undefined) return "-";
  return v.toFixed(decimals);
}

export function fmtChange(v: number | null | undefined, decimals = 1): { text: string; cls: string } {
  if (v === null || v === undefined) return { text: "-", cls: "val-neutral" };
  const pct = (v * 100).toFixed(decimals) + "%";
  if (v > 0.0001) return { text: "▲" + pct, cls: "val-up" };
  if (v < -0.0001) return { text: "▼" + pct.replace("-", ""), cls: "val-down" };
  return { text: pct, cls: "val-neutral" };
}

export function fmtPctChange(v: number | null | undefined, decimals = 1): { text: string; cls: string } {
  // For percentage-type metrics (CTR, CVR), show absolute change in pp
  if (v === null || v === undefined) return { text: "-", cls: "val-neutral" };
  const pp = (v * 100).toFixed(decimals) + "pp";
  if (v > 0.0001) return { text: "▲" + pp, cls: "val-up" };
  if (v < -0.0001) return { text: "▼" + pp.replace("-", ""), cls: "val-down" };
  return { text: pp, cls: "val-neutral" };
}
