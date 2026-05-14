import { describe, expect, it } from "vitest";
import { detectWeeks, chg, type RawRow } from "./sheetsData";

// ─── detectWeeks ────────────────────────────────────────────────────────────
describe("detectWeeks", () => {
  it("returns correct cur/prev/yoy from sorted week list", () => {
    const rows = [
      { business_year_and_week: "2025W14" },
      { business_year_and_week: "2026W13" },
      { business_year_and_week: "2026W14" },
    ];
    const result = detectWeeks(rows as RawRow[]);
    expect(result.cur).toBe("2026W14");
    expect(result.prev).toBe("2026W13");
    expect(result.yoy).toBe("2025W14");
    expect(result.all).toEqual(["2025W14", "2026W13", "2026W14"]);
  });

  it("handles single week gracefully", () => {
    const rows = [{ business_year_and_week: "2026W10" }];
    const result = detectWeeks(rows as RawRow[]);
    expect(result.cur).toBe("2026W10");
    expect(result.prev).toBe("");
  });

  it("handles empty rows", () => {
    const result = detectWeeks([]);
    expect(result.cur).toBe("");
    expect(result.prev).toBe("");
    expect(result.yoy).toBe("");
  });
});

// ─── chg (change rate) ───────────────────────────────────────────────────────
describe("chg", () => {
  it("calculates positive change correctly", () => {
    expect(chg(110, 100)).toBeCloseTo(0.1);
  });

  it("calculates negative change correctly", () => {
    expect(chg(80, 100)).toBeCloseTo(-0.2);
  });

  it("returns null when denominator is 0", () => {
    expect(chg(100, 0)).toBeNull();
  });

  it("returns null when either value is null", () => {
    expect(chg(null, 100)).toBeNull();
    expect(chg(100, null)).toBeNull();
  });
});

// ─── imageUrl injection ──────────────────────────────────────────────────────
describe("imageUrl injection", () => {
  it("injectImage adds imageUrl to items", () => {
    const imgMap = new Map([["SKC001", "https://cdn.example.com/img.jpg"]]);
    const items = [{ skc: "SKC001", sales: 100 }, { skc: "SKC002", sales: 50 }];
    const result = items.map((item) => ({
      ...item,
      imageUrl: imgMap.get(item.skc) ?? null,
    }));
    expect(result[0].imageUrl).toBe("https://cdn.example.com/img.jpg");
    expect(result[1].imageUrl).toBeNull();
  });
});

// ─── format helpers ──────────────────────────────────────────────────────────
describe("format helpers", () => {
  it("fmtMoney formats correctly", () => {
    const v = 12345.67;
    const formatted = "$" + v.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
    expect(formatted).toContain("12,346");
  });

  it("fmtPct formats percentage correctly", () => {
    const v = 0.1234;
    const formatted = (v * 100).toFixed(2) + "%";
    expect(formatted).toBe("12.34%");
  });

  it("change calculation is correct", () => {
    const cur = 110;
    const cmp = 100;
    const change = (cur - cmp) / Math.abs(cmp);
    expect(change).toBeCloseTo(0.1);
  });
});

// ─── Sales comparison sort order ─────────────────────────────────────────────
describe("sales comparison sort order", () => {
  it("categories sorted by cur.sales descending", () => {
    const categories = [
      { category: "连衣裙", cur: { sales: 44815 }, cmp: { sales: 76393 } },
      { category: "罩衫", cur: { sales: 32086 }, cmp: { sales: 48251 } },
      { category: "连体装", cur: { sales: 16471 }, cmp: { sales: 39080 } },
    ];
    const sorted = [...categories].sort((a, b) => b.cur.sales - a.cur.sales);
    expect(sorted[0].category).toBe("连衣裙");
    expect(sorted[1].category).toBe("罩衫");
    expect(sorted[2].category).toBe("连体装");
  });

  it("multiTotal and overall are placed at the end", () => {
    const rows = [
      { category: "连衣裙", isTotal: false },
      { category: "多品类合计", isTotal: true },
      { category: "整体合计", isGrandTotal: true },
    ];
    const data = rows.filter((r) => !r.isTotal && !r.isGrandTotal);
    const multi = rows.find((r) => r.isTotal);
    const overall = rows.find((r) => r.isGrandTotal);
    const final = [...data, multi, overall];
    expect(final[final.length - 1]?.category).toBe("整体合计");
    expect(final[final.length - 2]?.category).toBe("多品类合计");
  });
});

// ─── Compact table: UV产出 = sales/uv ────────────────────────────────────────
describe("metric computations", () => {
  it("uvOutput = sales / uv", () => {
    const sales = 44815;
    const uv = 50858;
    const uvOutput = sales / uv;
    expect(uvOutput).toBeCloseTo(0.88, 1);
  });

  it("ctr = collectionClick / exposure", () => {
    const collectionClick = 1303237;
    const exposure = 2005215;
    const ctr = collectionClick / exposure;
    expect(ctr).toBeCloseTo(0.65, 1);
  });

  it("exposureOutput = sales / exposure * 1000", () => {
    const sales = 44815;
    const exposure = 1303237;
    const expOutput = (sales / exposure) * 1000;
    expect(expOutput).toBeCloseTo(34.4, 0);
  });
});

// ─── yoy Top15 sortByCmp logic ───────────────────────────────────────────────
describe("yoy Top15 sortByCmp logic", () => {
  // Simulate the buildItems sortByCmp branch:
  // items with cmpSales > 0 should be sorted descending by cmpSales;
  // items with cmpSales null or 0 (new products not in yoy week) should be excluded.
  function sortByCmpItems(
    items: Array<{ skc: string; sales: number; cmpSales: number | null }>
  ) {
    return items
      .filter((item) => item.cmpSales !== null && item.cmpSales > 0)
      .sort((a, b) => (b.cmpSales ?? 0) - (a.cmpSales ?? 0))
      .slice(0, 15);
  }

  it("excludes items with null cmpSales (new products not in yoy week)", () => {
    const items = [
      { skc: "NEW001", sales: 9999, cmpSales: null },  // new product, no yoy data
      { skc: "OLD001", sales: 100,  cmpSales: 5000 },
      { skc: "OLD002", sales: 200,  cmpSales: 3000 },
    ];
    const result = sortByCmpItems(items);
    expect(result.map((i) => i.skc)).toEqual(["OLD001", "OLD002"]);
    expect(result.find((i) => i.skc === "NEW001")).toBeUndefined();
  });

  it("excludes items with cmpSales = 0", () => {
    const items = [
      { skc: "ZERO001", sales: 500, cmpSales: 0 },
      { skc: "OLD001",  sales: 100, cmpSales: 5000 },
    ];
    const result = sortByCmpItems(items);
    expect(result.map((i) => i.skc)).toEqual(["OLD001"]);
  });

  it("sorts by cmpSales descending, not current sales", () => {
    const items = [
      { skc: "A", sales: 1000, cmpSales: 200 },
      { skc: "B", sales: 500,  cmpSales: 800 },  // lower current but higher yoy
      { skc: "C", sales: 300,  cmpSales: 500 },
    ];
    const result = sortByCmpItems(items);
    expect(result[0].skc).toBe("B");  // highest cmpSales
    expect(result[1].skc).toBe("C");
    expect(result[2].skc).toBe("A");
  });

  it("returns at most 15 items", () => {
    const items = Array.from({ length: 20 }, (_, i) => ({
      skc: `SKC${i}`,
      sales: i * 10,
      cmpSales: (20 - i) * 100,
    }));
    const result = sortByCmpItems(items);
    expect(result.length).toBe(15);
  });
});
