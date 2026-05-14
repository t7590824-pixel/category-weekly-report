import React, { useState, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { SalesComparisonTable } from "@/components/SalesComparisonTable";
import { DualPlatformTable } from "@/components/DualPlatformTable";
import { BestsellerCardsTable } from "@/components/BestsellerCardsTable";
import { KeySkcCardsTable } from "@/components/KeySkcCardsTable";
import { KeySkcSummaryRow } from "@/components/KeySkcSummaryRow";
import { fmtMoney, fmtNum, fmtPct, fmtRate } from "@/lib/format";
import {
  RefreshCw, ChevronRight, TrendingUp, BarChart2, Users,
  ShoppingBag, Globe, Layers, Search, Cpu
} from "lucide-react";

// ─── Sidebar nav ──────────────────────────────────────────────────────────────
const NAV = [
  { id: "target",     label: "1. 整体达成进度",   icon: TrendingUp },
  { id: "yoy",        label: "2. 销售同比",        icon: BarChart2 },
  { id: "wow",        label: "3. 销售环比",        icon: BarChart2 },
  { id: "dual",       label: "4. 双端情况",        icon: Layers },
  { id: "channel",    label: "5. 渠道表现",        icon: Globe },
  { id: "newold",     label: "6. 新老品表现",      icon: ShoppingBag },
  { id: "scene",      label: "7. 场景表现",        icon: Users },
  { id: "competitor", label: "8. 竞品探查",        icon: Search },
  { id: "elements",   label: "9. 畅销元素",        icon: TrendingUp },
  { id: "keyskc",     label: "10. 上周重点SKC",    icon: Cpu },
];

function scrollTo(id: string) {
  document.getElementById("sec-" + id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function Skeleton() {
  return (
    <div className="animate-pulse space-y-2">
      <div className="h-3 bg-white/10 rounded w-1/3" />
      <div className="h-24 bg-white/5 rounded" />
    </div>
  );
}

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <div id={"sec-" + id} className="section-card scroll-mt-4">
      <div className="section-title">
        <ChevronRight size={13} />
        {title}
      </div>
      {children}
    </div>
  );
}

function SubTitle({ children }: { children: React.ReactNode }) {
  return <div className="subsec-title">{children}</div>;
}

// ─── Scene × Category Table ───────────────────────────────────────────────────
type MetricSet = { sales: number; exposure: number | null; uv: number; ctr: number | null; cvr: number | null; uvOutput: number | null; exposureOutput: number | null };
type SceneByCatData = {
  weeks: { cur: string; prev: string; yoy: string };
  scenes: Array<{
    scene: string;
    sceneTotal: {
      cur: MetricSet;
      prev: MetricSet;
      yoy: MetricSet;
    };
    categories: Array<{
      category: string;
      cur: MetricSet;
      prev: MetricSet;
      yoy: MetricSet;
      salesShare: number | null;
      salesSharePrev: number | null;
      exposureShare: number | null;
      exposureSharePrev: number | null;
      salesWoW: number | null;
      salesYoY: number | null;
      exposureWoW: number | null;
      uvWoW: number | null;
    }>;
  }>;
};

function SceneByCategoryTable({ data }: { data: SceneByCatData }) {
  const [activeScene, setActiveScene] = useState<string>("");

  const sceneNames = data.scenes.map((s) => s.scene);
  const selected = activeScene || sceneNames[0] || "";
  const sceneData = data.scenes.find((s) => s.scene === selected);

  return (
    <div>
      {/* Scene tabs */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {sceneNames.map((name) => (
          <button
            key={name}
            onClick={() => setActiveScene(name)}
            className={`text-[10px] px-2.5 py-1 rounded-full border transition-colors ${
              selected === name
                ? "bg-primary/20 border-primary/60 text-primary font-semibold"
                : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
            }`}
          >
            {name}
          </button>
        ))}
      </div>

      {sceneData && (
        <div className="table-scroll">
          <table className="report-table compact-table">
            <thead>
              <tr>
                <th rowSpan={2} style={{ textAlign: "left", paddingLeft: 8 }}>二级品类</th>
                <th colSpan={3} className="col-group">销售额</th>
                <th colSpan={3} className="col-group">场景内销售占比</th>
                <th colSpan={3} className="col-group">曝光</th>
                <th colSpan={3} className="col-group">场景内曝光占比</th>
                <th colSpan={3} className="col-group">UV</th>
                <th colSpan={3} className="col-group">千次曝光产出</th>
                <th colSpan={3} className="col-group">UV产出</th>
                <th colSpan={3} className="col-group">CTR</th>
                <th colSpan={3} className="col-group">CVR</th>
              </tr>
              <tr>
                <th className="text-[9px]">{data.weeks.cur}</th>
                <th className="text-[9px] text-muted-foreground">环比</th>
                <th className="text-[9px] text-muted-foreground">同比</th>
                <th className="text-[9px]">{data.weeks.cur}</th>
                <th className="text-[9px] text-muted-foreground">{data.weeks.prev}</th>
                <th className="text-[9px] text-muted-foreground">变化</th>
                <th className="text-[9px]">{data.weeks.cur}</th>
                <th className="text-[9px] text-muted-foreground">环比</th>
                <th className="text-[9px] text-muted-foreground">同比</th>
                <th className="text-[9px]">{data.weeks.cur}</th>
                <th className="text-[9px] text-muted-foreground">{data.weeks.prev}</th>
                <th className="text-[9px] text-muted-foreground">变化</th>
                <th className="text-[9px]">{data.weeks.cur}</th>
                <th className="text-[9px] text-muted-foreground">环比</th>
                <th className="text-[9px] text-muted-foreground">同比</th>
                <th className="text-[9px]">{data.weeks.cur}</th>
                <th className="text-[9px] text-muted-foreground">环比</th>
                <th className="text-[9px] text-muted-foreground">同比</th>
                <th className="text-[9px]">{data.weeks.cur}</th>
                <th className="text-[9px] text-muted-foreground">环比</th>
                <th className="text-[9px] text-muted-foreground">同比</th>
                <th className="text-[9px]">{data.weeks.cur}</th>
                <th className="text-[9px] text-muted-foreground">环比</th>
                <th className="text-[9px] text-muted-foreground">同比</th>
                <th className="text-[9px]">{data.weeks.cur}</th>
                <th className="text-[9px] text-muted-foreground">环比</th>
                <th className="text-[9px] text-muted-foreground">同比</th>
              </tr>
            </thead>
            <tbody>
              {/* Scene total row */}
              <tr className="row-grand-total">
                <td className="cat-name">{selected}场景合计</td>
                <td>{fmtMoney(sceneData.sceneTotal.cur.sales)}</td>
                <ChgCellInline cur={sceneData.sceneTotal.cur.sales} cmp={sceneData.sceneTotal.prev.sales} />
                <ChgCellInline cur={sceneData.sceneTotal.cur.sales} cmp={(sceneData.sceneTotal as any).yoy?.sales} />
                <td>100%</td>
                <td className="text-muted-foreground text-[9px]">100%</td>
                <td>-</td>
                <td>{fmtNum(sceneData.sceneTotal.cur.exposure)}</td>
                <ChgCellInline cur={sceneData.sceneTotal.cur.exposure} cmp={sceneData.sceneTotal.prev.exposure} />
                <ChgCellInline cur={sceneData.sceneTotal.cur.exposure} cmp={(sceneData.sceneTotal as any).yoy?.exposure} />
                <td>100%</td>
                <td className="text-muted-foreground text-[9px]">100%</td>
                <td>-</td>
                <td>{fmtNum(sceneData.sceneTotal.cur.uv)}</td>
                <ChgCellInline cur={sceneData.sceneTotal.cur.uv} cmp={sceneData.sceneTotal.prev.uv} />
                <ChgCellInline cur={sceneData.sceneTotal.cur.uv} cmp={(sceneData.sceneTotal as any).yoy?.uv} />
                <td>{fmtRate(sceneData.sceneTotal.cur.exposureOutput, 2)}</td>
                <ChgCellInline cur={sceneData.sceneTotal.cur.exposureOutput} cmp={sceneData.sceneTotal.prev.exposureOutput} isRate />
                <ChgCellInline cur={sceneData.sceneTotal.cur.exposureOutput} cmp={(sceneData.sceneTotal as any).yoy?.exposureOutput} isRate />
                <td>{fmtRate(sceneData.sceneTotal.cur.uvOutput, 2)}</td>
                <ChgCellInline cur={sceneData.sceneTotal.cur.uvOutput} cmp={sceneData.sceneTotal.prev.uvOutput} isRate />
                <ChgCellInline cur={sceneData.sceneTotal.cur.uvOutput} cmp={(sceneData.sceneTotal as any).yoy?.uvOutput} isRate />
                <td>{fmtPct(sceneData.sceneTotal.cur.ctr, 2)}</td>
                <ChgCellInline cur={sceneData.sceneTotal.cur.ctr} cmp={sceneData.sceneTotal.prev.ctr} isRate />
                <ChgCellInline cur={sceneData.sceneTotal.cur.ctr} cmp={(sceneData.sceneTotal as any).yoy?.ctr} isRate />
                <td>{fmtPct(sceneData.sceneTotal.cur.cvr, 2)}</td>
                <ChgCellInline cur={sceneData.sceneTotal.cur.cvr} cmp={sceneData.sceneTotal.prev.cvr} isRate />
                <ChgCellInline cur={sceneData.sceneTotal.cur.cvr} cmp={(sceneData.sceneTotal as any).yoy?.cvr} isRate />
              </tr>
              {/* Category rows */}
              {sceneData.categories.map((c) => (
                <tr key={c.category}>
                  <td className="cat-name">{c.category}</td>
                  <td>{fmtMoney(c.cur.sales)}</td>
                  <ChgCellInline cur={c.cur.sales} cmp={c.prev.sales} />
                  <ChgCellInline cur={c.cur.sales} cmp={c.yoy?.sales} />
                  {/* 场景内销售占比 */}
                  <td className={c.salesShare !== null && c.salesSharePrev !== null && c.salesShare > c.salesSharePrev ? "val-up" : c.salesShare !== null && c.salesSharePrev !== null && c.salesShare < c.salesSharePrev ? "val-down" : ""}>
                    {fmtPct(c.salesShare)}
                  </td>
                  <td className="text-muted-foreground text-[9px]">{fmtPct(c.salesSharePrev)}</td>
                  <td className={c.salesShare !== null && c.salesSharePrev !== null ?
                    (c.salesShare - c.salesSharePrev > 0.001 ? "val-up" : c.salesShare - c.salesSharePrev < -0.001 ? "val-down" : "") : ""}>
                    {c.salesShare !== null && c.salesSharePrev !== null
                      ? ((c.salesShare - c.salesSharePrev) >= 0 ? "+" : "") + ((c.salesShare - c.salesSharePrev) * 100).toFixed(1) + "%"
                      : "-"}
                  </td>
                  {/* 曝光 */}
                  <td>{fmtNum(c.cur.exposure)}</td>
                  <ChgCellInline cur={c.cur.exposure} cmp={c.prev.exposure} />
                  <ChgCellInline cur={c.cur.exposure} cmp={c.yoy?.exposure} />
                  {/* 场景内曝光占比 */}
                  <td className={c.exposureShare !== null && c.exposureSharePrev !== null && c.exposureShare > c.exposureSharePrev ? "val-up" : c.exposureShare !== null && c.exposureSharePrev !== null && c.exposureShare < c.exposureSharePrev ? "val-down" : ""}>
                    {fmtPct(c.exposureShare)}
                  </td>
                  <td className="text-muted-foreground text-[9px]">{fmtPct(c.exposureSharePrev)}</td>
                  <td className={c.exposureShare !== null && c.exposureSharePrev !== null ?
                    (c.exposureShare - c.exposureSharePrev > 0.001 ? "val-up" : c.exposureShare - c.exposureSharePrev < -0.001 ? "val-down" : "") : ""}>
                    {c.exposureShare !== null && c.exposureSharePrev !== null
                      ? ((c.exposureShare - c.exposureSharePrev) >= 0 ? "+" : "") + ((c.exposureShare - c.exposureSharePrev) * 100).toFixed(1) + "%"
                      : "-"}
                  </td>
                  {/* UV */}
                  <td>{fmtNum(c.cur.uv)}</td>
                  <ChgCellInline cur={c.cur.uv} cmp={c.prev.uv} />
                  <ChgCellInline cur={c.cur.uv} cmp={c.yoy?.uv} />
                  {/* 千次曝光产出 */}
                  <td>{fmtRate(c.cur.exposureOutput, 2)}</td>
                  <ChgCellInline cur={c.cur.exposureOutput} cmp={c.prev.exposureOutput} isRate />
                  <ChgCellInline cur={c.cur.exposureOutput} cmp={c.yoy?.exposureOutput} isRate />
                  {/* UV产出 */}
                  <td>{fmtRate(c.cur.uvOutput, 2)}</td>
                  <ChgCellInline cur={c.cur.uvOutput} cmp={c.prev.uvOutput} isRate />
                  <ChgCellInline cur={c.cur.uvOutput} cmp={c.yoy?.uvOutput} isRate />
                  {/* CTR */}
                  <td>{fmtPct(c.cur.ctr, 2)}</td>
                  <ChgCellInline cur={c.cur.ctr} cmp={c.prev.ctr} isRate />
                  <ChgCellInline cur={c.cur.ctr} cmp={c.yoy?.ctr} isRate />
                  {/* CVR */}
                  <td>{fmtPct(c.cur.cvr, 2)}</td>
                  <ChgCellInline cur={c.cur.cvr} cmp={c.prev.cvr} isRate />
                  <ChgCellInline cur={c.cur.cvr} cmp={c.yoy?.cvr} isRate />
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// Inline change cell (returns <td>) for SceneByCategoryTable
function ChgCellInline({ cur, cmp, isRate = false }: { cur: number | null | undefined; cmp: number | null | undefined; isRate?: boolean }) {
  if (cur == null || cmp == null || !cmp) return <td className="val-neutral">-</td>;
  const ch = cur / cmp - 1;
  const pct = Math.abs(ch * 100).toFixed(1) + "%";
  if (ch > 0.0001) return <td className="val-up"><strong>+{pct}</strong></td>;
  if (ch < -0.0001) return <td className="val-down"><strong>-{pct}</strong></td>;
  return <td className="val-neutral">{pct}</td>;
}

// ─── Change cells ────────────────────────────────────────────────────
function ChgCell({ cur, cmp, isRate = false, isShare = false, isDiff = false }: { cur: number | null; cmp: number | null; isRate?: boolean; isShare?: boolean; isDiff?: boolean }) {
  if (cur === null || cmp === null) return <td className="val-neutral">-</td>;
  if (isDiff) {
    // 差值类（均价等）直接相减，显示 +$x.xx / -$x.xx
    const diff = cur - cmp;
    const abs = Math.abs(diff).toFixed(2);
    if (diff > 0.005) return <td className="val-up"><strong>+${abs}</strong></td>;
    if (diff < -0.005) return <td className="val-down"><strong>-${abs}</strong></td>;
    return <td className="val-neutral">$0.00</td>;
  }
  if (isShare) {
    // 占比类（销售占比/UV占比）用减法，直接显示百分点差，如 38%-40% = -2%
    const diff = cur - cmp;
    const pct = (Math.abs(diff) * 100).toFixed(1) + "%";
    if (diff > 0.00001) return <td className="val-up"><strong>+{pct}</strong></td>;
    if (diff < -0.00001) return <td className="val-down"><strong>-{pct}</strong></td>;
    return <td className="val-neutral">0%</td>;
  }
  if (isRate) {
    // 率指标（CTR/CVR/加车率/UV产出等）用 (cur/cmp)-1，如 2.5%/3%-1 = -16.67%
    if (!cmp) return <td className="val-neutral">-</td>;
    const ch = cur / cmp - 1;
    const pct = Math.abs(ch * 100).toFixed(1) + "%";
    if (ch > 0.0001) return <td className="val-up"><strong>+{pct}</strong></td>;
    if (ch < -0.0001) return <td className="val-down"><strong>-{pct}</strong></td>;
    return <td className="val-neutral">{pct}</td>;
  }
  // 量指标（销售额/销量/UV/曝光等）用 (cur/cmp)-1
  if (!cmp) return <td className="val-neutral">-</td>;
  const ch = cur / cmp - 1;
  const pct = Math.abs(ch * 100).toFixed(1) + "%";
  if (ch > 0.0001) return <td className="val-up"><strong>+{pct}</strong></td>;
  if (ch < -0.0001) return <td className="val-down"><strong>-{pct}</strong></td>;
  return <td className="val-neutral">{pct}</td>;
}

// ─── Sales YoY/WoW stats pre-computation (for AI analysis) ─────────────────
// 把原始小数字段格式化成 AI 可直接引用的字符串，避免 AI 自行计算变化率
function fmtChgStr(cur: number | null, cmp: number | null): string {
  if (cur === null || cmp === null || !cmp) return "-";
  const v = cur / cmp - 1;
  const pct = (Math.abs(v) * 100).toFixed(2) + "%";
  return v > 0.00001 ? "+" + pct : v < -0.00001 ? "-" + pct : pct;
}
function fmtShareStr(v: number | null): string {
  if (v === null) return "-";
  return (v * 100).toFixed(2) + "%";
}
function fmtShareChgStr(cur: number | null, cmp: number | null): string {
  // 占比变化用百分点差（pp），直接相减，不用变化率
  if (cur === null || cmp === null) return "-";
  const diff = cur - cmp;
  const pp = (Math.abs(diff) * 100).toFixed(2) + "pp";
  return diff > 0.00001 ? "+" + pp : diff < -0.00001 ? "-" + pp : "0pp";
}

function buildSalesStats(
  label: string,
  weeks: { cur: string; cmp: string },
  multiTotal: any,
  categories: any[]
) {
  const fmtRow = (row: any) => ({
    category: row.category,
    salesChg: fmtChgStr(row.cur?.sales, row.cmp?.sales),
    exposureChg: fmtChgStr(row.cur?.exposure, row.cmp?.exposure),
    uvChg: fmtChgStr(row.cur?.uv, row.cmp?.uv),
    uvOutputChg: fmtChgStr(row.cur?.uvOutput, row.cmp?.uvOutput),
    ctrChg: fmtChgStr(row.cur?.ctr, row.cmp?.ctr),
    cvrChg: fmtChgStr(row.cur?.cvr, row.cmp?.cvr),
    salesShare: fmtShareStr(row.salesShare),
    salesShareCmp: fmtShareStr(row.salesShareCmp),
    salesShareChg: fmtShareChgStr(row.salesShare, row.salesShareCmp),
  });
  return {
    label,
    curWeek: weeks.cur,
    cmpWeek: weeks.cmp,
    multiTotal: fmtRow(multiTotal),
    categories: categories.map(fmtRow),
    note: "salesShare/salesShareCmp 为本期/对比期占比，salesShareChg 为百分点差（pp），已预计算，请直接引用，不要自行计算变化率。",
  };
}

// ─── Elements stats pre-computation (for AI analysis) ───────────────────────
type SkcItem = {
  skc: string;
  category?: string | null;
  occasion?: string | null;
  firstSecondColor?: string | null;
  avgPrice?: number | null;
  onShelfDays?: number | null;
  firstListDate?: string | null;
  isNew?: boolean;
  newOldLabel?: string | null;
  sales?: number | null;
  uv?: number | null;
  uvOutput?: number | null;
  ctr?: number | null;
  cvr?: number | null;
  exposureOutput?: number | null;
  salesChg?: number | null;
  ctrChg?: number | null;
  cvrChg?: number | null;
  exposureOutputChg?: number | null;
};

function groupCount(items: SkcItem[], key: keyof SkcItem): { name: string; count: number; pct: string }[] {
  const map = new Map<string, number>();
  for (const it of items) {
    const val = String(it[key] ?? "未知");
    map.set(val, (map.get(val) ?? 0) + 1);
  }
  const total = items.length || 1;
  return Array.from(map.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => ({ name, count, pct: `${((count / total) * 100).toFixed(1)}%` }));
}

function priceBand(price: number | null | undefined): string {
  if (price == null) return "未知";
  if (price < 20) return "0-20美元";
  if (price < 30) return "20-30美元";
  if (price < 40) return "30-40美元";
  return "40+美元";
}

function avgOf(items: SkcItem[], key: keyof SkcItem): string {
  const vals = items.map((it) => it[key]).filter((v): v is number => typeof v === "number" && !isNaN(v));
  if (!vals.length) return "-";
  const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
  return avg.toFixed(2);
}

function buildElementsStats(
  newTop15: SkcItem[], oldTop15: SkcItem[],
  weeks: { cur: string; prev: string; yoy?: string; cmpLabel?: string },
  cmpNewTop15?: SkcItem[], cmpOldTop15?: SkcItem[]
) {
  const summarize = (items: SkcItem[], label: string) => ({
    label,
    total: items.length,
    byCategory: groupCount(items, "category"),
    byOccasion: groupCount(items, "occasion"),
    byFirstSecondColor: groupCount(items, "firstSecondColor"),
    byPriceBand: groupCount(items.map((it) => ({ ...it, _pb: priceBand(it.avgPrice) })) as any, "_pb" as any),
    avgCtr: avgOf(items, "ctr"),
    avgCvr: avgOf(items, "cvr"),
    avgExposureOutput: avgOf(items, "exposureOutput"),
  });

  // 新老品占比计算（本期 Top15 中新品 vs 老品）
  const allCur = [...newTop15, ...oldTop15];
  const allCmp = [...(cmpNewTop15 ?? []), ...(cmpOldTop15 ?? [])];
  const curNewCount = newTop15.length;
  const curOldCount = oldTop15.length;
  const cmpNewCount = cmpNewTop15?.length ?? 0;
  const cmpOldCount = cmpOldTop15?.length ?? 0;
  const curTotal = allCur.length || 1;
  const cmpTotal = allCmp.length || 1;

  const cmpLabel = weeks.cmpLabel ?? weeks.yoy ?? weeks.prev;

  return {
    weeks,
    cmpLabel,
    newRatio: {
      cur: { count: curNewCount, pct: `${((curNewCount / curTotal) * 100).toFixed(1)}%` },
      cmp: { count: cmpNewCount, pct: `${((cmpNewCount / cmpTotal) * 100).toFixed(1)}%` },
    },
    oldRatio: {
      cur: { count: curOldCount, pct: `${((curOldCount / curTotal) * 100).toFixed(1)}%` },
      cmp: { count: cmpOldCount, pct: `${((cmpOldCount / cmpTotal) * 100).toFixed(1)}%` },
    },
    curStats: {
      new: summarize(newTop15, `本期新品Top15（${weeks.cur}）`),
      old: summarize(oldTop15, `本期老品Top15（${weeks.cur}）`),
    },
    cmpStats: {
      new: summarize(cmpNewTop15 ?? [], `同期新品Top15（${cmpLabel}）`),
      old: summarize(cmpOldTop15 ?? [], `同期老品Top15（${cmpLabel}）`),
    },
    note: "占比已预计算，请直接引用。分析主体是爆款元素组合，不是单个SKC。",
    curNewTop15: newTop15.map(({ skc, category, occasion, firstSecondColor, sales, uv, ctr, cvr, uvOutput }) => ({ skc, secondCategory: category, thirdCategory: occasion, firstSecondColor, sales, uv, ctr, cvr, uvOutput })),
    curOldTop15: oldTop15.map(({ skc, category, occasion, firstSecondColor, sales, uv, ctr, cvr, uvOutput }) => ({ skc, secondCategory: category, thirdCategory: occasion, firstSecondColor, sales, uv, ctr, cvr, uvOutput })),
    cmpNewTop15: (cmpNewTop15 ?? []).map(({ skc, category, occasion, firstSecondColor, sales, uv, ctr, cvr, uvOutput }) => ({ skc, secondCategory: category, thirdCategory: occasion, firstSecondColor, sales, uv, ctr, cvr, uvOutput })),
    cmpOldTop15: (cmpOldTop15 ?? []).map(({ skc, category, occasion, firstSecondColor, sales, uv, ctr, cvr, uvOutput }) => ({ skc, secondCategory: category, thirdCategory: occasion, firstSecondColor, sales, uv, ctr, cvr, uvOutput })),
  };
}

// ─── AI Analysis box ─────────────────────────────────────────────────────────
function AnalysisBox({ moduleKey, data }: { moduleKey: string; data: unknown }) {
  const [text, setText] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const analysisMut = trpc.report.generateAnalysis.useMutation();

  const generate = useCallback(async () => {
    setLoading(true);
    try {
      const res = await analysisMut.mutateAsync({ moduleKey, data: JSON.stringify(data) });
      setText(typeof res.analysis === "string" ? res.analysis : String(res.analysis));
    } finally {
      setLoading(false);
    }
  }, [moduleKey, data, analysisMut]);

  return (
    <div className="analysis-box">
      <div className="flex items-center justify-between mb-2">
        <span className="flex items-center gap-1.5 text-[11px] font-semibold text-[oklch(0.75_0.12_240)]">
          <Cpu size={11} /> AI 数据分析
        </span>
        <button
          onClick={generate}
          disabled={loading}
          className="text-[10px] bg-primary/20 hover:bg-primary/30 border border-primary/40 rounded px-2 py-0.5 text-[oklch(0.75_0.12_240)] transition-colors disabled:opacity-50"
        >
          {loading ? "生成中..." : text ? "重新生成" : "生成分析"}
        </button>
      </div>
      {text && (
        <div className="text-[11px] text-foreground/90 leading-relaxed whitespace-pre-wrap">{text}</div>
      )}
      {!text && !loading && (
        <div className="text-[10px] text-muted-foreground">点击"生成分析"，AI 将自动总结本模块数据要点</div>
      )}
    </div>
  );
}

// ─── Channel table (reusable for WoW and YoY) ────────────────────────────────
type ChannelRow = {
  channel: string;
  cur: { sales: number; qty: number; exposure: number; uv: number; ctr: number | null; cvr: number | null; uvOutput: number | null; addCartRate: number | null; checkoutRate: number | null; avgPrice: number | null; exposureOutput: number | null };
  cmp: { sales: number; qty: number; exposure: number; uv: number; ctr: number | null; cvr: number | null; uvOutput: number | null; addCartRate: number | null; checkoutRate: number | null; avgPrice: number | null; exposureOutput: number | null };
  salesChange: number | null;
  salesShare?: number | null;
  salesShareCmp?: number | null;
  exposureShare?: number | null;
  exposureShareCmp?: number | null;
};

function ChannelTable({ rows, curWeek, cmpWeek, label }: { rows: ChannelRow[]; curWeek: string; cmpWeek: string; label: string }) {
  return (
    <div className="table-scroll">
      <table className="report-table compact-table">
        <thead>
          <tr>
            <th rowSpan={2} style={{ textAlign: "left", paddingLeft: 10 }}>渠道</th>
            <th colSpan={3} className="col-group">销售额</th>
            <th colSpan={2} className="col-group">销售占比</th>
            <th colSpan={3} className="col-group">销量</th>
            <th colSpan={3} className="col-group">曝光</th>
            <th colSpan={2} className="col-group">曝光占比</th>
            <th colSpan={3} className="col-group">UV</th>
            <th colSpan={3} className="col-group">UV产出</th>
            <th colSpan={3} className="col-group">千次曝光产出</th>
            <th colSpan={3} className="col-group">CTR</th>
            <th colSpan={3} className="col-group">CVR(uv)</th>
            <th colSpan={3} className="col-group">加车率</th>
            <th colSpan={3} className="col-group">结账率</th>
          </tr>
          <tr>
            <th className="text-[9px]">{curWeek}</th>
            <th className="text-[9px] text-muted-foreground">{cmpWeek}</th>
            <th className="text-[9px]">{label}</th>
            {/* 销售占比 */}
            <th className="text-[9px]">{curWeek}</th>
            <th className="text-[9px] text-muted-foreground">{cmpWeek}</th>
            {/* 销量 */}
            <th className="text-[9px]">{curWeek}</th>
            <th className="text-[9px] text-muted-foreground">{cmpWeek}</th>
            <th className="text-[9px]">{label}</th>
            {/* 曝光 */}
            <th className="text-[9px]">{curWeek}</th>
            <th className="text-[9px] text-muted-foreground">{cmpWeek}</th>
            <th className="text-[9px]">{label}</th>
            {/* 曝光占比 */}
            <th className="text-[9px]">{curWeek}</th>
            <th className="text-[9px] text-muted-foreground">{cmpWeek}</th>
            {/* UV */}
            <th className="text-[9px]">{curWeek}</th>
            <th className="text-[9px] text-muted-foreground">{cmpWeek}</th>
            <th className="text-[9px]">{label}</th>
            {/* UV产出 */}
            <th className="text-[9px]">{curWeek}</th>
            <th className="text-[9px] text-muted-foreground">{cmpWeek}</th>
            <th className="text-[9px]">{label}</th>
            {/* 千次曝光产出 */}
            <th className="text-[9px]">{curWeek}</th>
            <th className="text-[9px] text-muted-foreground">{cmpWeek}</th>
            <th className="text-[9px]">{label}</th>
            {/* CTR */}
            <th className="text-[9px]">{curWeek}</th>
            <th className="text-[9px] text-muted-foreground">{cmpWeek}</th>
            <th className="text-[9px]">{label}</th>
            {/* CVR */}
            <th className="text-[9px]">{curWeek}</th>
            <th className="text-[9px] text-muted-foreground">{cmpWeek}</th>
            <th className="text-[9px]">{label}</th>
            {/* 加车率 */}
            <th className="text-[9px]">{curWeek}</th>
            <th className="text-[9px] text-muted-foreground">{cmpWeek}</th>
            <th className="text-[9px]">{label}</th>
            {/* 结账率 */}
            <th className="text-[9px]">{curWeek}</th>
            <th className="text-[9px] text-muted-foreground">{cmpWeek}</th>
            <th className="text-[9px]">{label}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((ch) => {
            const isTotal = ch.channel === "整体合计";
            const rowCls = isTotal ? "row-grand-total" : "";
            return (
            <tr key={ch.channel} className={rowCls}>
              <td className="cat-name">{ch.channel}</td>
              <td>{fmtMoney(ch.cur.sales)}</td><td>{fmtMoney(ch.cmp.sales)}</td>
              <ChgCell cur={ch.cur.sales} cmp={ch.cmp.sales} />
              <td>{ch.salesShare != null ? fmtPct(ch.salesShare) : "-"}</td>
              <td>{ch.salesShareCmp != null ? fmtPct(ch.salesShareCmp) : "-"}</td>
              <td>{fmtNum(ch.cur.qty)}</td><td>{fmtNum(ch.cmp.qty)}</td>
              <ChgCell cur={ch.cur.qty} cmp={ch.cmp.qty} />
              <td>{fmtNum(ch.cur.exposure)}</td><td>{fmtNum(ch.cmp.exposure)}</td>
              <ChgCell cur={ch.cur.exposure} cmp={ch.cmp.exposure} />
              <td>{ch.exposureShare != null ? fmtPct(ch.exposureShare) : "-"}</td>
              <td>{ch.exposureShareCmp != null ? fmtPct(ch.exposureShareCmp) : "-"}</td>
              <td>{fmtNum(ch.cur.uv)}</td><td>{fmtNum(ch.cmp.uv)}</td>
              <ChgCell cur={ch.cur.uv} cmp={ch.cmp.uv} />
              <td>{fmtRate(ch.cur.uvOutput, 2)}</td><td>{fmtRate(ch.cmp.uvOutput, 2)}</td>
              <ChgCell cur={ch.cur.uvOutput} cmp={ch.cmp.uvOutput} />
              <td>{ch.cur.exposureOutput !== null ? ch.cur.exposureOutput.toFixed(1) : "-"}</td>
              <td>{ch.cmp.exposureOutput !== null ? ch.cmp.exposureOutput.toFixed(1) : "-"}</td>
              <ChgCell cur={ch.cur.exposureOutput} cmp={ch.cmp.exposureOutput} />
              <td>{fmtPct(ch.cur.ctr, 2)}</td><td>{fmtPct(ch.cmp.ctr, 2)}</td>
              <ChgCell cur={ch.cur.ctr} cmp={ch.cmp.ctr} isRate />
              <td>{fmtPct(ch.cur.cvr, 2)}</td><td>{fmtPct(ch.cmp.cvr, 2)}</td>
              <ChgCell cur={ch.cur.cvr} cmp={ch.cmp.cvr} isRate />
              <td>{fmtPct(ch.cur.addCartRate, 2)}</td><td>{fmtPct(ch.cmp.addCartRate, 2)}</td>
              <ChgCell cur={ch.cur.addCartRate} cmp={ch.cmp.addCartRate} isRate />
              <td>{fmtPct(ch.cur.checkoutRate, 2)}</td><td>{fmtPct(ch.cmp.checkoutRate, 2)}</td>
              <ChgCell cur={ch.cur.checkoutRate} cmp={ch.cmp.checkoutRate} isRate />
            </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── Main Report Page ─────────────────────────────────────────────────────────
export default function Report() {
  const [country, setCountry] = useState("UK");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [rangeTab, setRangeTab] = useState("2-8天");
  const [period, setPeriod] = useState<string | undefined>(undefined); // undefined = 自动取最新

  // 获取当前登录用户
  const meQ = trpc.auth.me.useQuery(undefined, { retry: false, refetchOnWindowFocus: false });
  const user = meQ.data;

  // 退出登录
  const handleLogout = useCallback(async () => {
    try {
      await fetch("/api/auth/feishu/logout", { method: "POST" });
    } finally {
      window.location.reload();
    }
  }, []);

  const queryOpts = { country, forceRefresh: false, period };

  const countriesQ  = trpc.report.countries.useQuery();
  const periodsQ    = trpc.report.availablePeriods.useQuery();
  const targetQ     = trpc.report.targetProgress.useQuery({ forceRefresh: false });
  const yoyQ        = trpc.report.salesYoY.useQuery(queryOpts);

  // 是否月报模式（格式 202604 或 2026年4月）
  // 当 period=undefined（自动）时，使用 yoyQ.data.weeks.cur 判断实际加载的数据是否为月度
  const isMonthlyCheck = (p: string) => /^\d{6}$/.test(p) || /^\d{4}年\d{1,2}月$/.test(p);
  const effectivePeriod = period ?? yoyQ.data?.weeks?.cur ?? "";
  const isMonthly = isMonthlyCheck(effectivePeriod);

  const wowQ        = trpc.report.salesWoW.useQuery(queryOpts);
  const dualQ       = trpc.report.dualPlatform.useQuery(queryOpts);
  const channelQ    = trpc.report.channelPerformance.useQuery(queryOpts);
  const newOldQ     = trpc.report.newOldProducts.useQuery(queryOpts);
  const sceneQ      = trpc.report.scenePerformance.useQuery(queryOpts);
  const sceneByCatQ = trpc.report.sceneByCategoryData.useQuery(queryOpts);
  const competitorQ = trpc.report.competitors.useQuery({ forceRefresh: false });
  const elementsQ   = trpc.report.bestsellerElements.useQuery(queryOpts);
  const rangeTop15Q  = trpc.report.newOldRangeTop15.useQuery(queryOpts);
  const keySkcQ      = trpc.report.keySkc.useQuery(queryOpts);

  const refreshMut = trpc.report.refreshAll.useMutation();
  const utils = trpc.useUtils();

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await refreshMut.mutateAsync({ country });
      // invalidate + refetch 确保前端缓存立即更新
      await utils.report.invalidate();
      await Promise.all([
        targetQ.refetch(),
        yoyQ.refetch(),
        wowQ.refetch(),
        dualQ.refetch(),
        channelQ.refetch(),
        newOldQ.refetch(),
        sceneQ.refetch(),
        sceneByCatQ.refetch(),
        competitorQ.refetch(),
        elementsQ.refetch(),
        rangeTop15Q.refetch(),
        keySkcQ.refetch(),
      ]);
    } finally {
      setIsRefreshing(false);
    }
  }, [country, refreshMut, utils]);

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      {/* ── Sidebar ── */}
      <aside className="w-40 shrink-0 bg-[oklch(0.96_0.005_240)] border-r border-border flex flex-col sticky top-0 h-screen overflow-y-auto">
        <div className="px-4 py-4 border-b border-border">
          <div className="text-sm font-bold text-[oklch(0.25_0.08_240)]">品类运营周报</div>
          <div className="text-[10px] text-muted-foreground mt-0.5">Category Weekly Report</div>
        </div>
        <div className="px-3 py-2.5 border-b border-border">
          <label className="text-[10px] text-muted-foreground block mb-1">国家/站点</label>
          <select
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            className="w-full text-xs bg-white border border-border rounded px-2 py-1 text-foreground"
          >
            {(countriesQ.data ?? ["UK"]).map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <div className="px-3 py-2.5 border-b border-border">
          <label className="text-[10px] text-muted-foreground block mb-1">周次/月份</label>
          <select
            value={period ?? ""}
            onChange={(e) => setPeriod(e.target.value || undefined)}
            className="w-full text-xs bg-white border border-border rounded px-2 py-1 text-foreground"
          >
            <option value="">自动（最新）</option>
            {(periodsQ.data ?? []).map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>
        <div className="px-3 py-2.5 border-b border-border">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="w-full flex items-center justify-center gap-2 text-xs bg-blue-600 hover:bg-blue-700 rounded px-3 py-1.5 text-white transition-colors disabled:opacity-50"
          >
            <RefreshCw size={11} className={isRefreshing ? "animate-spin" : ""} />
            {isRefreshing ? "刷新中..." : "刷新数据"}
          </button>
        </div>
        <nav className="flex-1 py-1">
          {NAV.filter(n => !(isMonthly && n.id === "target")).map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => scrollTo(id)}
              className="w-full flex items-center gap-2 px-2 py-1.5 text-[10px] text-muted-foreground hover:text-foreground hover:bg-[oklch(0.90_0.005_240)] transition-colors text-left"
            >
              <Icon size={11} className="shrink-0" />
              <span>{label}</span>
            </button>
          ))}
        </nav>
        <div className="px-3 py-2 border-t border-border">
          <a
            href="/monthly-import"
            className="flex items-center gap-1.5 text-[10px] text-muted-foreground hover:text-foreground transition-colors py-1"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>
            月度数据导入
          </a>
          <div className="text-[10px] text-muted-foreground/60 mt-0.5">数据源: Google Sheets · 缓存5min</div>
        </div>
      </aside>

      {/* ── Main content ── */}
      <main className="flex-1 overflow-y-auto p-3 space-y-0">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h1 className="text-base font-bold text-foreground">品类运营周报</h1>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              站点: <span className="text-[oklch(0.75_0.12_240)] font-semibold">{country}</span>
              {(period || yoyQ.data) && <span className="ml-3">{isMonthly ? "当前月份" : "当前周次"}: <span className="text-[oklch(0.75_0.12_240)] font-semibold">{period ?? yoyQ.data?.weeks.cur}</span></span>}
            </p>
          </div>
          {/* 右上角用户信息 */}
          {user && (
            <div className="flex items-center gap-2">
              {/* 头像圆 */}
              <div className="w-7 h-7 rounded-full bg-[oklch(0.55_0.15_240)] flex items-center justify-center text-white text-[11px] font-bold shrink-0">
                {(user.name ?? "U").charAt(0).toUpperCase()}
              </div>
              {/* 姓名 */}
              <span className="text-[11px] text-foreground font-medium max-w-[80px] truncate">{user.name ?? user.email ?? "用户"}</span>
              {/* 退出按钮 */}
              <button
                onClick={handleLogout}
                className="text-[10px] text-muted-foreground hover:text-red-500 border border-border hover:border-red-300 rounded px-2 py-0.5 transition-colors"
                title="退出登录"
              >
                退出
              </button>
            </div>
          )}
        </div>

        {/* 1.2 Target Progress - 月报时隐藏 */}
        {!isMonthly && <Section id="target" title="1.2 整体达成进度">
          {targetQ.isLoading ? <Skeleton /> : targetQ.data ? (
            <>
              <div className="table-scroll">
                <table className="report-table compact-table">
                  <thead>
                    <tr>
                      <th>国家</th><th>月度目标</th><th>当前实际销售额</th><th>达成进度</th><th>进度差</th><th style={{ minWidth: 100 }}>进度条</th>
                    </tr>
                  </thead>
                  <tbody>
                    {targetQ.data.map((row) => {
                      // 用 actual/target 计算真实进度比（表格 progress 列可能是原始数值）
                      const targetNum = typeof row.target === "number" ? row.target : parseFloat(String(row.target ?? "0").replace(/[^0-9.-]/g, ""));
                      const actualNum = typeof row.actual === "number" ? row.actual : parseFloat(String(row.actual ?? "0").replace(/[^0-9.-]/g, ""));
                      const progNum = targetNum > 0 ? actualNum / targetNum : 0;
                      const progStr = (progNum * 100).toFixed(1) + "%";
                      // 深红色系：达成>=100%用深绿，>=80%用橙色，其余深红
                      const barColor = progNum >= 1 ? "#8B0000" : progNum >= 0.8 ? "#c0392b" : "#8B0000";
                      const barW = Math.min(Math.round(progNum * 100), 100);
                      const diffStr = String(row.diff ?? "-");
                      const diffColor = diffStr.startsWith("-") ? "val-down" : "val-up";
                      return (
                        <tr key={String(row.country)}>
                          <td className="cat-name font-bold">{String(row.country)}</td>
                          <td>{fmtMoney(row.target)}</td>
                          <td>{fmtMoney(row.actual)}</td>
                          <td style={{ color: barColor, fontWeight: 700 }}>{progStr}</td>
                          <td className={diffColor}>{diffStr}</td>
                          <td>
                            <div className="progress-bar-wrap">
                              <div className="progress-bar-fill" style={{ width: barW + "%", background: barColor }} />
                              <span className="progress-label">{progStr}</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
          </div>
          <AnalysisBox moduleKey="targetProgress" data={targetQ.data} />
            </>
          ) : <div className="text-xs text-muted-foreground">暂无数据</div>}
        </Section>}

        {/* 1.2 Sales YoY */}
        <Section id="yoy" title="1.2 销售同比">
          {yoyQ.isLoading ? <Skeleton /> : yoyQ.data ? (
            <>
              <SalesComparisonTable
                label="同比"
                curWeek={yoyQ.data.weeks.cur}
                cmpWeek={yoyQ.data.weeks.yoy}
                overall={yoyQ.data.overall}
                multiTotal={yoyQ.data.multiTotal}
                swimRow={yoyQ.data.swimRow}
                categories={yoyQ.data.categories}
              />
              <AnalysisBox moduleKey="salesYoY" data={buildSalesStats(
                "同比",
                { cur: yoyQ.data.weeks.cur, cmp: yoyQ.data.weeks.yoy },
                yoyQ.data.multiTotal,
                yoyQ.data.categories.filter((c: any) => ["连衣裙","连体装","罩衫","上衣","下装"].includes(c.category))
              )} />
            </>
          ) : <div className="text-xs text-muted-foreground">暂无数据</div>}
        </Section>

        {/* 1.2 Sales WoW */}
        <Section id="wow" title="1.2 销售环比">
          {wowQ.isLoading ? <Skeleton /> : wowQ.data ? (
            <>
              <SalesComparisonTable
                label="环比"
                curWeek={wowQ.data.weeks.cur}
                cmpWeek={wowQ.data.weeks.prev}
                overall={wowQ.data.overall}
                multiTotal={wowQ.data.multiTotal}
                swimRow={wowQ.data.swimRow}
                categories={wowQ.data.categories}
              />
              <AnalysisBox moduleKey="salesWoW" data={buildSalesStats(
                "环比",
                { cur: wowQ.data.weeks.cur, cmp: wowQ.data.weeks.prev },
                wowQ.data.multiTotal,
                wowQ.data.categories.filter((c: any) => ["连衣裙","连体装","罩衫","上衣","下装","牛仔"].includes(c.category))
              )} />
            </>
          ) : <div className="text-xs text-muted-foreground">暂无数据</div>}
        </Section>

        {/* 1.2 Dual Platform */}
        <Section id="dual" title="1.2 双端情况（APP/WEB）">
          {dualQ.isLoading ? <Skeleton /> : dualQ.data ? (
            <>
              <DualPlatformTable weeks={dualQ.data.weeks} wow={dualQ.data.wow} yoy={dualQ.data.yoy} />
              <AnalysisBox moduleKey="dualPlatform" data={{
                ...dualQ.data,
                categoryWoW: wowQ.data ? {
                  multiTotal: wowQ.data.multiTotal,
                  categories: wowQ.data.categories.filter((c: any) => ["连衣裙","连体装","罩衫","上衣","下装","牛仔"].includes(c.category))
                } : null,
                categoryYoY: yoyQ.data ? {
                  multiTotal: yoyQ.data.multiTotal,
                  categories: yoyQ.data.categories.filter((c: any) => ["连衣裙","连体装","罩衫","上衣","下装"].includes(c.category))
                } : null,
              }} />
            </>
          ) : <div className="text-xs text-muted-foreground">暂无数据</div>}
        </Section>

        {/* 1.3 Channel */}
        <Section id="channel" title="1.3 渠道表现">
          {channelQ.isLoading ? <Skeleton /> : channelQ.data ? (
            <>
              <SubTitle>渠道环比（{channelQ.data.weeks.cur} vs {channelQ.data.weeks.prev}）</SubTitle>
              <ChannelTable
                rows={channelQ.data.wow as ChannelRow[]}
                curWeek={channelQ.data.weeks.cur}
                cmpWeek={channelQ.data.weeks.prev}
                label="环比"
              />
              <SubTitle>渠道同比（{channelQ.data.weeks.cur} vs {channelQ.data.weeks.yoy}）</SubTitle>
              <ChannelTable
                rows={channelQ.data.yoy as ChannelRow[]}
                curWeek={channelQ.data.weeks.cur}
                cmpWeek={channelQ.data.weeks.yoy}
                label="同比"
              />
              <AnalysisBox moduleKey="channel" data={{
                weeks: channelQ.data.weeks,
                wow: (channelQ.data.wow as ChannelRow[]).filter((r) => !r.channel.toLowerCase().includes('affiliate')),
                yoy: (channelQ.data.yoy as ChannelRow[]).filter((r) => !r.channel.toLowerCase().includes('affiliate')),
              }} />
            </>
          ) : <div className="text-xs text-muted-foreground">暂无数据</div>}
        </Section>

        {/* 1.4 New/Old Products */}
        <Section id="newold" title="1.4 新老品表现">
          {newOldQ.isLoading ? <Skeleton /> : newOldQ.data ? (
            <>
              {/* Summary WoW/YoY */}
              <SubTitle>新老品汇总（{newOldQ.data.weeks.cur}）</SubTitle>
              <div className="table-scroll">
                <table className="report-table compact-table">
                  <thead>
                    <tr>
                      <th rowSpan={2}>新老品</th>
                      <th colSpan={3} className="col-group">销售额</th>
                      <th colSpan={3} className="col-group">销售占比</th>
                      <th colSpan={3} className="col-group">曝光</th>
                      <th colSpan={3} className="col-group">曝光占比</th>
                      <th colSpan={3} className="col-group">千次曝光产出</th>
                      <th colSpan={3} className="col-group">销量</th>
                      <th colSpan={3} className="col-group">UV</th>
                      <th colSpan={3} className="col-group">UV产出</th>
                      <th colSpan={3} className="col-group">CTR</th>
                      <th colSpan={3} className="col-group">CVR</th>
                      <th colSpan={3} className="col-group">加车率</th>
                      <th colSpan={3} className="col-group">均价</th>
                    </tr>
                    <tr>
                      {["销售额","销售占比","曝光","曝光占比","千次曝光产出","销量","UV","UV产出","CTR","CVR","加车率","均价"].map((m) => (
                        <React.Fragment key={m}>
                          <th className="text-[9px]">本期</th>
                          <th className="text-[9px] text-muted-foreground">环比</th>
                          <th className="text-[9px] text-muted-foreground">同比</th>
                        </React.Fragment>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(["new", "old"] as const).map((type) => {
                      const label = type === "new" ? "新品" : "老品";
                      const cur = newOldQ.data!.summary[type].cur;
                      const prev = newOldQ.data!.summary[type].prev;
                      const yoy = newOldQ.data!.summary[type].yoy;
                      // 占比字段从 newRangeTotal/oldRangeTotal 取
                      const rangeTotal = (newOldQ.data as any)[type === "new" ? "newRangeTotal" : "oldRangeTotal"];
                      return (
                        <tr key={type}>
                          <td className="cat-name">{label}</td>
                          {/* 销售额 */}
                          <td>{fmtMoney(cur.sales)}</td>
                          <ChgCell cur={cur.sales} cmp={prev.sales} />
                          <ChgCell cur={cur.sales} cmp={yoy.sales} />
                          {/* 销售占比 */}
                          <td>{fmtPct(rangeTotal?.salesShare)}</td>
                          <td className="text-muted-foreground">{fmtPct(rangeTotal?.salesSharePrev)}</td>
                          <td className="text-muted-foreground">{fmtPct(rangeTotal?.salesShareYoy)}</td>
                          {/* 曝光 */}
                          <td>{fmtNum(cur.exposure)}</td>
                          <ChgCell cur={cur.exposure} cmp={prev.exposure} />
                          <ChgCell cur={cur.exposure} cmp={yoy.exposure} />
                          {/* 曝光占比 */}
                          <td>{fmtPct(rangeTotal?.exposureShare)}</td>
                          <td className="text-muted-foreground">{fmtPct(rangeTotal?.exposureSharePrev)}</td>
                          <td className="text-muted-foreground">{fmtPct(rangeTotal?.exposureShareYoy)}</td>
                          {/* 千次曝光产出 */}
                          <td>{cur.exposureOutput !== null && cur.exposureOutput !== undefined ? cur.exposureOutput.toFixed(1) : "-"}</td>
                          <ChgCell cur={cur.exposureOutput} cmp={prev.exposureOutput} />
                          <ChgCell cur={cur.exposureOutput} cmp={yoy.exposureOutput} />
                          {/* 销量 */}
                          <td>{fmtNum(cur.qty)}</td>
                          <ChgCell cur={cur.qty} cmp={prev.qty} />
                          <ChgCell cur={cur.qty} cmp={yoy.qty} />
                          {/* UV */}
                          <td>{fmtNum(cur.uv)}</td>
                          <ChgCell cur={cur.uv} cmp={prev.uv} />
                          <ChgCell cur={cur.uv} cmp={yoy.uv} />
                          {/* UV产出 */}
                          <td>{fmtRate(cur.uvOutput, 2)}</td>
                          <ChgCell cur={cur.uvOutput} cmp={prev.uvOutput} />
                          <ChgCell cur={cur.uvOutput} cmp={yoy.uvOutput} />
                          {/* CTR */}
                          <td>{fmtPct(cur.ctr, 2)}</td>
                          <ChgCell cur={cur.ctr} cmp={prev.ctr} isRate />
                          <ChgCell cur={cur.ctr} cmp={yoy.ctr} isRate />
                          {/* CVR */}
                          <td>{fmtPct(cur.cvr, 2)}</td>
                          <ChgCell cur={cur.cvr} cmp={prev.cvr} isRate />
                          <ChgCell cur={cur.cvr} cmp={yoy.cvr} isRate />
                          {/* 加车率 */}
                          <td>{fmtPct(cur.addCartRate, 2)}</td>
                          <ChgCell cur={cur.addCartRate} cmp={prev.addCartRate} isRate />
                          <ChgCell cur={cur.addCartRate} cmp={yoy.addCartRate} isRate />
                          {/* 均价 */}
                          <td>{fmtMoney(cur.avgPrice, 2)}</td>
                          <ChgCell cur={cur.avgPrice} cmp={prev.avgPrice} />
                          <ChgCell cur={cur.avgPrice} cmp={yoy.avgPrice} />
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* 月报模式：按品类维度的新老品汇总 */}
              {isMonthly && (() => {
                const catBreakdown = (newOldQ.data as any).monthlyCatBreakdown as Record<string, {
                  new: { cur: any; prev: any; yoy: any };
                  old: { cur: any; prev: any; yoy: any };
                  total: { cur: any; prev: any; yoy: any };
                  newSkcCount: number;
                  oldSkcCount: number;
                }> ?? {};
                const weeks = newOldQ.data!.weeks;
                const cats = Object.keys(catBreakdown);
                const fmt = (v: number | null | undefined) => v == null ? "-" : `$${v.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
                const fmtPct = (v: number | null | undefined) => v == null ? "-" : `${(v * 100).toFixed(1)}%`;
                const chgPct = (cur: number | null | undefined, cmp: number | null | undefined) => {
                  if (!cur || !cmp) return "-";
                  const r = cur / cmp - 1;
                  const s = (r >= 0 ? "+" : "") + (r * 100).toFixed(1) + "%";
                  return s;
                };
                const chgCls = (cur: number | null | undefined, cmp: number | null | undefined) => {
                  if (!cur || !cmp) return "";
                  return cur >= cmp ? "text-red-500 font-bold" : "text-green-600 font-bold";
                };
                return (
                  <div className="mt-4">
                    <SubTitle>品类新老品汇总（{weeks.cur} vs 环比{weeks.prev} / 同比{weeks.yoy}）</SubTitle>
                    <div className="table-scroll">
                      <table className="report-table compact-table">
                        <thead>
                          <tr>
                            <th rowSpan={2}>品类</th>
                            <th rowSpan={2}>新老品</th>
                            <th colSpan={3} className="col-group">销售额</th>
                            <th colSpan={3} className="col-group">销量</th>
                            <th colSpan={3} className="col-group">UV</th>
                            <th colSpan={3} className="col-group">CTR</th>
                            <th colSpan={3} className="col-group">CVR</th>
                            <th colSpan={3} className="col-group">UV产出</th>
                            <th colSpan={3} className="col-group">加车率</th>
                          </tr>
                          <tr>
                            {["销售额","销量","UV","CTR","CVR","UV产出","加车率"].map(m => (
                              <React.Fragment key={m}>
                                <th className="text-xs">{weeks.cur}</th>
                                <th className="text-xs">环比</th>
                                <th className="text-xs">同比</th>
                              </React.Fragment>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {cats.map((cat) => {
                            const d = catBreakdown[cat];
                            if (!d) return null;
                            const rows: Array<{ label: string; data: { cur: any; prev: any; yoy: any }; skcCount: number }> = [
                              { label: "当月新品", data: d.new, skcCount: d.newSkcCount },
                              { label: "老品", data: d.old, skcCount: d.oldSkcCount },
                              { label: "合计", data: d.total, skcCount: d.newSkcCount + d.oldSkcCount },
                            ];
                            return rows.map(({ label, data, skcCount }, idx) => (
                              <tr key={cat + label} className={label === "合计" ? "font-semibold bg-muted/30" : ""}>
                                {idx === 0 && <td rowSpan={3} className="font-medium">{cat}</td>}
                                <td>{label}</td>
                                <td className="text-right">{fmt(data.cur?.sales)}</td>
                                <td className={`text-right ${chgCls(data.cur?.sales, data.prev?.sales)}`}>{chgPct(data.cur?.sales, data.prev?.sales)}</td>
                                <td className={`text-right ${chgCls(data.cur?.sales, data.yoy?.sales)}`}>{chgPct(data.cur?.sales, data.yoy?.sales)}</td>
                                <td className="text-right">{data.cur?.qty?.toLocaleString() ?? "-"}</td>
                                <td className={`text-right ${chgCls(data.cur?.qty, data.prev?.qty)}`}>{chgPct(data.cur?.qty, data.prev?.qty)}</td>
                                <td className={`text-right ${chgCls(data.cur?.qty, data.yoy?.qty)}`}>{chgPct(data.cur?.qty, data.yoy?.qty)}</td>
                                <td className="text-right">{data.cur?.uv?.toLocaleString() ?? "-"}</td>
                                <td className={`text-right ${chgCls(data.cur?.uv, data.prev?.uv)}`}>{chgPct(data.cur?.uv, data.prev?.uv)}</td>
                                <td className={`text-right ${chgCls(data.cur?.uv, data.yoy?.uv)}`}>{chgPct(data.cur?.uv, data.yoy?.uv)}</td>
                                <td className="text-right">{fmtPct(data.cur?.ctr)}</td>
                                <td className={`text-right ${chgCls(data.cur?.ctr, data.prev?.ctr)}`}>{chgPct(data.cur?.ctr, data.prev?.ctr)}</td>
                                <td className={`text-right ${chgCls(data.cur?.ctr, data.yoy?.ctr)}`}>{chgPct(data.cur?.ctr, data.yoy?.ctr)}</td>
                                <td className="text-right">{fmtPct(data.cur?.cvr)}</td>
                                <td className={`text-right ${chgCls(data.cur?.cvr, data.prev?.cvr)}`}>{chgPct(data.cur?.cvr, data.prev?.cvr)}</td>
                                <td className={`text-right ${chgCls(data.cur?.cvr, data.yoy?.cvr)}`}>{chgPct(data.cur?.cvr, data.yoy?.cvr)}</td>
                                <td className="text-right">{data.cur?.uvOutput != null ? `$${data.cur.uvOutput.toFixed(2)}` : "-"}</td>
                                <td className={`text-right ${chgCls(data.cur?.uvOutput, data.prev?.uvOutput)}`}>{chgPct(data.cur?.uvOutput, data.prev?.uvOutput)}</td>
                                <td className={`text-right ${chgCls(data.cur?.uvOutput, data.yoy?.uvOutput)}`}>{chgPct(data.cur?.uvOutput, data.yoy?.uvOutput)}</td>
                                <td className="text-right">{fmtPct(data.cur?.addCartRate)}</td>
                                <td className={`text-right ${chgCls(data.cur?.addCartRate, data.prev?.addCartRate)}`}>{chgPct(data.cur?.addCartRate, data.prev?.addCartRate)}</td>
                                <td className={`text-right ${chgCls(data.cur?.addCartRate, data.yoy?.addCartRate)}`}>{chgPct(data.cur?.addCartRate, data.yoy?.addCartRate)}</td>
                              </tr>
                            ));
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })()}

              {/* By shelf range - combined new+old into one table with sales/UV share (周报模式) */}
              {!isMonthly && (() => {
                const newRangeData = (newOldQ.data as any).newByRangeCmp as Array<{ range: string; cur: any; prev: any; yoy: any }> ?? [];
                const oldRangeData = (newOldQ.data as any).oldByRangeCmp as Array<{ range: string; cur: any; prev: any; yoy: any }> ?? [];
                const newTotal = (newOldQ.data as any).newRangeTotal as { cur: any; prev: any; yoy: any; salesShare?: number | null; salesSharePrev?: number | null; salesShareYoy?: number | null; uvShare?: number | null; uvSharePrev?: number | null; uvShareYoy?: number | null };
                const oldTotal = (newOldQ.data as any).oldRangeTotal as { cur: any; prev: any; yoy: any; salesShare?: number | null; salesSharePrev?: number | null; salesShareYoy?: number | null; uvShare?: number | null; uvSharePrev?: number | null; uvShareYoy?: number | null };
                const overallTotal = (newOldQ.data as any).overallRangeTotal as { cur: any; prev: any; yoy: any; salesShare?: number | null; salesSharePrev?: number | null; salesShareYoy?: number | null; uvShare?: number | null; uvSharePrev?: number | null; uvShareYoy?: number | null };
                const weeks = newOldQ.data!.weeks;
                const grandTotalSales = overallTotal?.cur?.sales ?? 0;
                const grandTotalSalesPrev = overallTotal?.prev?.sales ?? 0;
                const grandTotalSalesYoy = overallTotal?.yoy?.sales ?? 0;
                const grandTotalUv = overallTotal?.cur?.uv ?? 0;
                const grandTotalUvPrev = overallTotal?.prev?.uv ?? 0;
                const grandTotalUvYoy = overallTotal?.yoy?.uv ?? 0;
                const renderRow = (label: string, r: { range: string; cur: any; prev: any; yoy: any } | null, total: { cur: any; prev: any; yoy: any; salesShare?: number | null; salesSharePrev?: number | null; salesShareYoy?: number | null; uvShare?: number | null; uvSharePrev?: number | null; uvShareYoy?: number | null }, isTotal = false, isGrandTotal = false) => {
                  const d = r ?? total;
                  // 占比：合计行/整体合计行用后端传来的字段，区间行用实时计算
                  const salesShare = (isTotal || isGrandTotal) ? (total.salesShare ?? null) : (grandTotalSales ? d.cur.sales / grandTotalSales : null);
                  const salesSharePrev = (isTotal || isGrandTotal) ? (total.salesSharePrev ?? null) : (grandTotalSalesPrev ? d.prev.sales / grandTotalSalesPrev : null);
                  const salesShareYoy = (isTotal || isGrandTotal) ? (total.salesShareYoy ?? null) : (grandTotalSalesYoy ? d.yoy.sales / grandTotalSalesYoy : null);
                  const uvShare = (isTotal || isGrandTotal) ? (total.uvShare ?? null) : (grandTotalUv ? d.cur.uv / grandTotalUv : null);
                  const uvSharePrev = (isTotal || isGrandTotal) ? (total.uvSharePrev ?? null) : (grandTotalUvPrev ? d.prev.uv / grandTotalUvPrev : null);
                  const uvShareYoy = (isTotal || isGrandTotal) ? (total.uvShareYoy ?? null) : (grandTotalUvYoy ? d.yoy.uv / grandTotalUvYoy : null);
                  const rowKey = (isGrandTotal ? "grand" : label) + (r ? r.range : "合计");
                  const rowCls = isGrandTotal ? "row-grand-total" : isTotal ? "row-subtotal" : "";
                  return (
                    <tr key={rowKey} className={rowCls}>
                      <td className="cat-name font-medium">{isGrandTotal ? "整体合计" : label}</td>
                      <td className="cat-name">{isGrandTotal ? "" : (r ? r.range : "合计")}</td>
                      <td>{fmtMoney(d.cur.sales)}</td><td className="text-muted-foreground">{fmtMoney(d.prev.sales)}</td><td className="text-muted-foreground">{fmtMoney(d.yoy.sales)}</td>
                      <td>{salesShare != null ? fmtPct(salesShare) : "-"}</td>
                      <td className="text-muted-foreground">{salesSharePrev != null ? fmtPct(salesSharePrev) : "-"}</td>
                      <td className="text-muted-foreground">{salesShareYoy != null ? fmtPct(salesShareYoy) : "-"}</td>
                      <td>{fmtNum(d.cur.qty)}</td><td className="text-muted-foreground">{fmtNum(d.prev.qty)}</td><td className="text-muted-foreground">{fmtNum(d.yoy.qty)}</td>
                      <td>{fmtNum(d.cur.uv)}</td><td className="text-muted-foreground">{fmtNum(d.prev.uv)}</td><td className="text-muted-foreground">{fmtNum(d.yoy.uv)}</td>
                      <td>{uvShare != null ? fmtPct(uvShare) : "-"}</td>
                      <td className="text-muted-foreground">{uvSharePrev != null ? fmtPct(uvSharePrev) : "-"}</td>
                      <td className="text-muted-foreground">{uvShareYoy != null ? fmtPct(uvShareYoy) : "-"}</td>
                      <td>{fmtRate(d.cur.uvOutput, 2)}</td><td className="text-muted-foreground">{fmtRate(d.prev.uvOutput, 2)}</td><td className="text-muted-foreground">{fmtRate(d.yoy.uvOutput, 2)}</td>
                      <td>{d.cur.exposureOutput != null ? d.cur.exposureOutput.toFixed(1) : "-"}</td><td className="text-muted-foreground">{d.prev.exposureOutput != null ? d.prev.exposureOutput.toFixed(1) : "-"}</td><td className="text-muted-foreground">{d.yoy.exposureOutput != null ? d.yoy.exposureOutput.toFixed(1) : "-"}</td>
                      <td>{fmtPct(d.cur.ctr, 2)}</td><td className="text-muted-foreground">{fmtPct(d.prev.ctr, 2)}</td><td className="text-muted-foreground">{fmtPct(d.yoy.ctr, 2)}</td>
                      <td>{fmtPct(d.cur.cvr, 2)}</td><td className="text-muted-foreground">{fmtPct(d.prev.cvr, 2)}</td><td className="text-muted-foreground">{fmtPct(d.yoy.cvr, 2)}</td>
                      <td>{fmtPct(d.cur.addCartRate, 2)}</td><td className="text-muted-foreground">{fmtPct(d.prev.addCartRate, 2)}</td><td className="text-muted-foreground">{fmtPct(d.yoy.addCartRate, 2)}</td>
                      <td>{fmtMoney(d.cur.avgPrice, 2)}</td><td className="text-muted-foreground">{fmtMoney(d.prev.avgPrice, 2)}</td><td className="text-muted-foreground">{fmtMoney(d.yoy.avgPrice, 2)}</td>
                    </tr>
                  );
                };
                // overallTotal 来自后端，包含正确的比率字段
                const grandTotal = overallTotal ?? {
                  cur: { sales: 0, qty: 0, uv: 0, uvOutput: null, ctr: null, cvr: null, addCartRate: null, avgPrice: null },
                  prev: { sales: 0, qty: 0, uv: 0, uvOutput: null, ctr: null, cvr: null, addCartRate: null, avgPrice: null },
                  yoy: { sales: 0, qty: 0, uv: 0, uvOutput: null, ctr: null, cvr: null, addCartRate: null, avgPrice: null },
                  salesShare: 1, salesSharePrev: 1, salesShareYoy: 1, uvShare: 1, uvSharePrev: 1, uvShareYoy: 1,
                };
                return (
                  <div>
                    <SubTitle>新老品在架天数区间分析</SubTitle>
                    <div className="table-scroll">
                      <table className="report-table compact-table">
                        <thead>
                          <tr>
                            <th rowSpan={2}>新老品</th>
                            <th rowSpan={2}>在架天数区间</th>
                            <th colSpan={3} className="col-group">销售额</th>
                            <th colSpan={3} className="col-group">销售占比</th>
                            <th colSpan={3} className="col-group">销量</th>
                            <th colSpan={3} className="col-group">UV</th>
                            <th colSpan={3} className="col-group">UV占比</th>
                            <th colSpan={3} className="col-group">UV产出</th>
                            <th colSpan={3} className="col-group">千次曝光产出</th>
                            <th colSpan={3} className="col-group">CTR</th>
                            <th colSpan={3} className="col-group">CVR</th>
                            <th colSpan={3} className="col-group">加车率</th>
                            <th colSpan={3} className="col-group">均价</th>
                          </tr>
                          <tr>
                            {["销售额","销售占比","销量","UV","UV占比","UV产出","千次曝光产出","CTR","CVR","加车率","均价"].map((m) => (
                              <React.Fragment key={m}>
                                <th className="text-[9px]">{weeks.cur}</th>
                                <th className="text-[9px] text-muted-foreground">{weeks.prev}</th>
                                <th className="text-[9px] text-muted-foreground">{weeks.yoy}</th>
                              </React.Fragment>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {newRangeData.map((r) => renderRow("新品", r, newTotal))}
                          {newTotal && renderRow("新品", null, newTotal, true)}
                          {oldRangeData.map((r) => renderRow("老品", r, oldTotal))}
                          {oldTotal && renderRow("老品", null, oldTotal, true)}
                          {renderRow("", null, grandTotal, false, true)}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })()}

              {/* 在架天数区间 Top15 SKC（仅周报模式） */}
              {!isMonthly && rangeTop15Q.isLoading && <Skeleton />}
              {!isMonthly && !rangeTop15Q.isLoading && rangeTop15Q.data && (
                <div className="mt-4">
                  <SubTitle>各在架天数区间 Top15 SKC（{rangeTop15Q.data.weeks.cur}）</SubTitle>
                  {/* Tab bar */}
                  <div className="flex gap-1 mb-3 flex-wrap">
                    {rangeTop15Q.data.ranges.map((r) => (
                      <button
                        key={r.key}
                        onClick={() => setRangeTab(r.key)}
                        className={`text-[11px] px-3 py-1 rounded border transition-colors ${
                          rangeTab === r.key
                            ? "bg-primary text-white border-primary font-semibold"
                            : "bg-transparent text-muted-foreground border-border hover:border-primary/50"
                        }`}
                      >
                        {r.label}
                      </button>
                    ))}
                  </div>
                  {rangeTop15Q.data.ranges
                    .filter((r) => r.key === rangeTab)
                    .map((r) => (
                      <div key={r.key} className="space-y-4">
                        {r.newTop15.length > 0 && (
                          <BestsellerCardsTable
                            label={`新品Top15（${r.label}）`}
                            items={r.newTop15 as any[]}
                            week={rangeTop15Q.data!.weeks.cur}
                            cmpWeek={rangeTop15Q.data!.weeks.prev}
                          />
                        )}
                        {r.oldTop15.length > 0 && (
                          <BestsellerCardsTable
                            label={`老品Top15（${r.label}）`}
                            items={r.oldTop15 as any[]}
                            week={rangeTop15Q.data!.weeks.cur}
                            cmpWeek={rangeTop15Q.data!.weeks.prev}
                          />
                        )}
                        {r.newTop15.length === 0 && r.oldTop15.length === 0 && (
                          <div className="text-xs text-muted-foreground py-2">该区间暂无数据</div>
                        )}
                      </div>
                    ))}
                </div>
              )}

              <AnalysisBox moduleKey="newOld" data={(() => {
                const d = newOldQ.data as any;
                // 只传汇总指标，避免 Top15/Range 明细超出 LLM token 上限
                const catSummary = d.monthlyCatBreakdown
                  ? Object.fromEntries(
                      Object.entries(d.monthlyCatBreakdown).map(([cat, v]: [string, any]) => [
                        cat,
                        {
                          new: { cur: v.new?.cur, prev: v.new?.prev, yoy: v.new?.yoy },
                          old: { cur: v.old?.cur, prev: v.old?.prev, yoy: v.old?.yoy },
                          total: { cur: v.total?.cur, prev: v.total?.prev, yoy: v.total?.yoy },
                        },
                      ])
                    )
                  : undefined;
                return {
                  weeks: d.weeks,
                  summary: d.summary,
                  ...(catSummary ? { monthlyCatBreakdown: catSummary } : {}),
                };
              })()} />
            </>
          ) : <div className="text-xs text-muted-foreground">暂无数据</div>}
        </Section>

        {/* 1.5 Scene */}
        <Section id="scene" title="1.5 场景表现">
          {sceneQ.isLoading ? <Skeleton /> : sceneQ.data ? (
            <>
              <SubTitle>场景同环比（{sceneQ.data.weeks.cur} vs {sceneQ.data.weeks.prev} / {sceneQ.data.weeks.yoy}）</SubTitle>
              <div className="table-scroll">
                <table className="report-table compact-table">
                  <thead>
                    <tr>
                      <th rowSpan={2}>场合/场景</th>
                      <th colSpan={3} className="col-group">销售额</th>
                      <th colSpan={3} className="col-group">销售占比</th>
                      <th colSpan={3} className="col-group">曝光</th>
                      <th colSpan={3} className="col-group">曝光占比</th>
                      <th colSpan={3} className="col-group">UV占比</th>
                      <th colSpan={3} className="col-group">销量</th>
                      <th colSpan={3} className="col-group">UV</th>
                      <th colSpan={3} className="col-group">UV产出</th>
                      <th colSpan={3} className="col-group">千次曝光产出</th>
                      <th colSpan={3} className="col-group">CTR</th>
                      <th colSpan={3} className="col-group">CVR</th>
                      <th colSpan={3} className="col-group">加车率</th>
                      <th colSpan={3} className="col-group">均价</th>
                    </tr>
                    <tr>
                      {["销售额","销售占比","曝光","曝光占比","UV占比","销量","UV","UV产出","千次曝光产出","CTR","CVR","加车率","均价"].map((m) => (
                        <React.Fragment key={m}>
                          <th className="text-[9px]">{sceneQ.data!.weeks.cur}</th>
                          <th className="text-[9px] text-muted-foreground">环比</th>
                          <th className="text-[9px] text-muted-foreground">同比</th>
                        </React.Fragment>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[...sceneQ.data.scenes, (sceneQ.data as any).total].filter(Boolean).map((s: any) => {
                      const isTotal = s.scene === "整体合计";
                      return (
                      <tr key={s.scene} className={isTotal ? "row-grand-total" : ""}>
                        <td className="cat-name">{s.scene}</td>
                        {/* 销售额 */}
                        <td>{fmtMoney(s.cur.sales)}</td>
                        <ChgCell cur={s.cur.sales} cmp={s.prev.sales} />
                        <ChgCell cur={s.cur.sales} cmp={s.yoy.sales} />
                        {/* 销售占比 */}
                        <td>{fmtPct(s.salesShare)}</td>
                        <ChgCell cur={s.salesShare} cmp={s.salesSharePrev} isShare />
                        <ChgCell cur={s.salesShare} cmp={s.salesShareYoy} isShare />
                        {/* 曝光 */}
                        <td>{fmtNum(s.cur.exposure)}</td>
                        <ChgCell cur={s.cur.exposure} cmp={s.prev.exposure} />
                        <ChgCell cur={s.cur.exposure} cmp={s.yoy.exposure} />
                        {/* 曝光占比 */}
                        <td>{fmtPct(s.exposureShare)}</td>
                        <ChgCell cur={s.exposureShare} cmp={s.exposureSharePrev} isShare />
                        <ChgCell cur={s.exposureShare} cmp={s.exposureShareYoy} isShare />
                        
                        <td>{fmtPct(s.uvShare)}</td>
                        <ChgCell cur={s.uvShare} cmp={s.uvSharePrev} isShare />
                        <ChgCell cur={s.uvShare} cmp={s.uvShareYoy} isShare />
                        {/* 销量 */}
                        <td>{fmtNum(s.cur.qty)}</td>
                        <ChgCell cur={s.cur.qty} cmp={s.prev.qty} />
                        <ChgCell cur={s.cur.qty} cmp={s.yoy.qty} />
                        {/* UV */}
                        <td>{fmtNum(s.cur.uv)}</td>
                        <ChgCell cur={s.cur.uv} cmp={s.prev.uv} />
                        <ChgCell cur={s.cur.uv} cmp={s.yoy.uv} />
                        {/* UV产出 */}
                        <td>{fmtRate(s.cur.uvOutput, 2)}</td>
                        <ChgCell cur={s.cur.uvOutput} cmp={s.prev.uvOutput} />
                        <ChgCell cur={s.cur.uvOutput} cmp={s.yoy.uvOutput} />
                        {/* 千次曝光产出 */}
                        <td>{s.cur.exposureOutput !== null ? s.cur.exposureOutput.toFixed(1) : "-"}</td>
                        <ChgCell cur={s.cur.exposureOutput} cmp={s.prev.exposureOutput} />
                        <ChgCell cur={s.cur.exposureOutput} cmp={s.yoy.exposureOutput} />
                        {/* CTR */}
                        <td>{fmtPct(s.cur.ctr, 2)}</td>
                        <ChgCell cur={s.cur.ctr} cmp={s.prev.ctr} isRate />
                        <ChgCell cur={s.cur.ctr} cmp={s.yoy.ctr} isRate />
                        {/* CVR */}
                        <td>{fmtPct(s.cur.cvr, 2)}</td>
                        <ChgCell cur={s.cur.cvr} cmp={s.prev.cvr} isRate />
                        <ChgCell cur={s.cur.cvr} cmp={s.yoy.cvr} isRate />
                        {/* 加车率 */}
                        <td>{fmtPct(s.cur.addCartRate, 2)}</td>
                        <ChgCell cur={s.cur.addCartRate} cmp={s.prev.addCartRate} isRate />
                        <ChgCell cur={s.cur.addCartRate} cmp={s.yoy.addCartRate} isRate />
                        {/* 均价 */}
                        <td>{fmtMoney(s.cur.avgPrice, 2)}</td>
                        <ChgCell cur={s.cur.avgPrice} cmp={s.prev.avgPrice} isDiff />
                        <ChgCell cur={s.cur.avgPrice} cmp={s.yoy.avgPrice} isDiff />
                      </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <AnalysisBox moduleKey="scene" data={sceneQ.data} />

              {/* Scene × Category breakdown */}
              <SubTitle>场景×品类拆解（多品类，剥除泳衣）</SubTitle>
              {sceneByCatQ.isLoading ? <Skeleton /> : sceneByCatQ.data ? (
                <SceneByCategoryTable data={sceneByCatQ.data} />
              ) : <div className="text-xs text-muted-foreground">暂无数据</div>}
            </>
          ) : <div className="text-xs text-muted-foreground">暂无数据</div>}
        </Section>

        {/* 2.4 Competitor - 月报模式隐藏 */}
        {!isMonthly && <Section id="competitor" title="2.4 竞品探查（UK）">
          {competitorQ.isLoading ? <Skeleton /> : competitorQ.data ? (
            <div className="grid grid-cols-1 gap-3">
              {competitorQ.data.map((brand) => (
                <div key={brand.name} className="competitor-card">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xs font-bold text-gray-900">{brand.name}</h3>
                    <a href={brand.url} target="_blank" rel="noopener noreferrer"
                      className="text-[10px] text-primary hover:underline">{brand.url}</a>
                  </div>
                  <div className="mb-2">
                    <div className="text-[10px] font-semibold text-gray-600 mb-1">首页 Banner / 活动力度</div>
                    <div className="text-[11px] text-gray-800 bg-[oklch(0.90_0_0)] rounded p-2 leading-relaxed">
                      {brand.bannerInfo}
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { label: "连衣裙新品方向", val: brand.newArrivals.dresses },
                      { label: "下装新品方向",   val: brand.newArrivals.bottoms },
                      { label: "罩衫新品方向",   val: brand.newArrivals.blouses },
                    ].map(({ label, val }) => (
                      <div key={label} className="bg-[oklch(0.90_0_0)] rounded p-2">
                        <div className="text-[10px] font-semibold text-gray-600 mb-1">{label}</div>
                        <div className="text-[11px] text-gray-900">{val}</div>
                      </div>
                    ))}
                  </div>
                  <div className="text-[10px] text-gray-500 mt-1.5">
                    抓取时间: {new Date(brand.scrapedAt).toLocaleString("zh-CN")}
                  </div>
                </div>
              ))}
            </div>
          ) : <div className="text-xs text-muted-foreground">暂无数据</div>}
        </Section>}

        {/* 2.5 Bestseller Elements */}
        <Section id="elements" title="2.5 畅销元素分析">
          {elementsQ.isLoading ? <Skeleton /> : elementsQ.data ? (() => {
            const ed = elementsQ.data as any;
            const cmpLabel = ed.weeks?.cmpLabel ?? ed.weeks?.yoy ?? ed.weeks?.prev ?? "";
            const isMonthlyEl = !!ed.isMonthly;

            // 收集同期新老品 Top15（从 categoryTop15 中提取）
            // 同期新老品需要从 cmpTop15 中按 isNew 分类
            const cmpAll: SkcItem[] = (ed.categoryTop15 ?? []).flatMap((c: any) => c.cmpTop15 ?? []);
            const cmpNewAll = cmpAll.filter((it: any) => it.isNew);
            const cmpOldAll = cmpAll.filter((it: any) => !it.isNew);

            return (
            <div className="space-y-6">
              {/* 整体新品 Top15 */}
              <div className="space-y-2">
                <BestsellerCardsTable
                  label={`新品Top15（${ed.weeks.cur}${isMonthlyEl ? ` vs 同期${cmpLabel}` : ` vs ${cmpLabel}`}）`}
                  items={ed.newTop15 as any[]}
                  week={ed.weeks.cur}
                  cmpWeek={cmpLabel}
                  isMonthly={isMonthlyEl}
                />
              </div>

              {/* 整体老品 Top15 */}
              <div className="space-y-2">
                <BestsellerCardsTable
                  label={`老品Top15（${ed.weeks.cur}${isMonthlyEl ? ` vs 同期${cmpLabel}` : ` vs ${cmpLabel}`}）`}
                  items={ed.oldTop15 as any[]}
                  week={ed.weeks.cur}
                  cmpWeek={cmpLabel}
                  isMonthly={isMonthlyEl}
                />
              </div>

              {/* 新老品整体 AI 分析 */}
              <AnalysisBox moduleKey="elements" data={
                buildElementsStats(
                  ed.newTop15 as SkcItem[],
                  ed.oldTop15 as SkcItem[],
                  ed.weeks,
                  cmpNewAll,
                  cmpOldAll
                )
              } />

              {/* 二级品类 Top15 对比 */}
              {(ed.categoryTop15 ?? []).length > 0 && (
                <div className="space-y-4">
                  <div className="subsec-title">二级品类 Top15 对比（{ed.weeks.cur} vs 同期{cmpLabel}）</div>
                  {(ed.categoryTop15 as any[]).map((catData: any) => {
                    const catCurNew = (catData.curTop15 as any[]).filter((it: any) => it.isNew);
                    const catCurOld = (catData.curTop15 as any[]).filter((it: any) => !it.isNew);
                    const catCmpNew = (catData.cmpTop15 as any[] ?? []).filter((it: any) => it.isNew);
                    const catCmpOld = (catData.cmpTop15 as any[] ?? []).filter((it: any) => !it.isNew);
                    return (
                    <div key={catData.category} className="space-y-3">
                      <div className="text-[11px] font-bold text-primary border-b border-primary/20 pb-1">
                        {catData.category}
                      </div>
                      {/* 本期 Top15 */}
                      <BestsellerCardsTable
                        label={`${catData.category} 本期 Top15（${ed.weeks.cur}）`}
                        items={catData.curTop15 as any[]}
                        week={ed.weeks.cur}
                        cmpWeek={cmpLabel}
                        isMonthly={isMonthlyEl}
                      />
                      {/* 同期 Top15 */}
                      {catData.cmpTop15?.length > 0 && (
                        <BestsellerCardsTable
                          label={`${catData.category} 同期 Top15（${cmpLabel}）`}
                          items={catData.cmpTop15 as any[]}
                          week={cmpLabel}
                          isMonthly={isMonthlyEl}
                          forceWide
                        />
                      )}
                      {/* 品类独立 AI 分析 */}
                      <AnalysisBox
                        moduleKey={`elements_cat_${catData.category}`}
                        data={(() => {
                          // 传入 SKC 属性字段（款式/颜色/场合），供 AI 分析设计元素
                          const pickAttrs = (items: any[]) => items.map((it: any) => ({
                            skc: it.skc,
                            thirdCategory: it.thirdCategory ?? null,
                            occasion: it.occasion ?? null,
                            firstSecondColor: it.firstSecondColor ?? null,
                            isNew: it.isNew,
                            sales: it.sales,
                            uvOutput: it.uvOutput,
                            ctr: it.ctr,
                            cvr: it.cvr,
                          }));
                          const stats = buildElementsStats(catCurNew, catCurOld, ed.weeks, catCmpNew, catCmpOld);
                          return {
                            ...stats,
                            curTop15: pickAttrs(catData.curTop15 ?? []),
                            cmpTop15: pickAttrs(catData.cmpTop15 ?? []),
                          };
                        })()}
                      />
                    </div>
                    );
                  })}
                </div>
              )}

            </div>
            );
          })() : <div className="text-xs text-muted-foreground">暂无数据</div>}
        </Section>


        <Section id="keyskc" title="10. 上周重点 SKC">
          {keySkcQ.isLoading ? <Skeleton /> : keySkcQ.data && keySkcQ.data.labels.length > 0 ? (
            <div className="space-y-10">
              {keySkcQ.data.labels.map((g: any) => {
                const wks = keySkcQ.data!.weeks;
                const wowCmpWeek = wks.prev;
                const yoyCmpWeek = wks.yoy;

                if (g.cmpType === "both") {
                  return (
                    <div key={g.label} className="space-y-4">
                      <div className="text-xs font-bold text-primary border-b border-primary/20 pb-1">{g.label}</div>
                      {/* 环比汇总 */}
                      <KeySkcSummaryRow label={g.label} summary={g.summary} curWeek={wks.cur} cmpWeek={wowCmpWeek} cmpLabel="环比" />
                      {/* 同比汇总 */}
                      {g.summaryYoy && (
                        <KeySkcSummaryRow label={g.label} summary={g.summaryYoy} curWeek={wks.cur} cmpWeek={yoyCmpWeek} cmpLabel="同比" />
                      )}
                      {/* Top15 环比卡片：只显示本期 + 环比率 */}
                      <KeySkcCardsTable label={g.label} items={g.items} curWeek={wks.cur} cmpWeek={wowCmpWeek} cmpType="wow" showCmpCol={false} />
                      {/* Top15 同比卡片：只显示本期数据，无对比列 */}
                      {g.itemsYoy && g.itemsYoy.length > 0 && (
                        <KeySkcCardsTable label={g.label + "（同比）"} items={g.itemsYoy} curWeek={wks.cur} cmpWeek={yoyCmpWeek} cmpType="yoy" showCmpCol={false} showChg={false} showCmpAsMain={true} />
                      )}
                    </div>
                  );
                }

                const cmpWeek = g.cmpType === "yoy" ? yoyCmpWeek : wowCmpWeek;
                const cmpLabel = g.cmpType === "yoy" ? "同比" : "环比";
                return (
                  <div key={g.label} className="space-y-4">
                    <div className="text-xs font-bold text-primary border-b border-primary/20 pb-1">{g.label}</div>
                    {/* 整体汇总行 */}
                    <KeySkcSummaryRow label={g.label} summary={g.summary} curWeek={wks.cur} cmpWeek={cmpWeek} cmpLabel={cmpLabel} />
                    {/* Top15 卡片：只显示本期 + 环比率，去掉对比期列 */}
                    <KeySkcCardsTable label={g.label} items={g.items} curWeek={wks.cur} cmpWeek={cmpWeek} cmpType={g.cmpType === "yoy" ? "yoy" : "wow"} showCmpCol={false} />
                  </div>
                );
              })}
            </div>
          ) : <div className="text-xs text-muted-foreground">暂无数据，请先在 Google Sheets skc_labels 表中登记 SKC 标签（需包含 skc / label / start_week / note / cmp_type 列）</div>}
        </Section>

      </main>
    </div>
  );
}
