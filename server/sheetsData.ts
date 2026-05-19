import axios from "axios";
import { fetchMonthlyFromDb, getMonthlyPeriodsFromDb, clearMonthlyDbCache } from "./monthlyDb";
import { getHengshiSkcTags, type HengshiSkcTag } from "./_core/hengshi";

const SHEET_ID = "13k-7NiJNTJmz_1drk8a_bAyOnpnsfVKC3NSaWjwJyD4";

// Sheet GIDs
const GID = {
  image: "0",              // image表（A=skc, J=Variant Image）
  target: "1593654520",    // 国家达成明细表
  category: "477317228",   // 品类基础数据表
  skc: "411219756",        // SKC基础数据表（周度）
  skcMonthly: "966245154", // SKC基础数据表-月度
  channel: "271061634",    // 品类×渠道数据表
  aov: "558004586",        // AOV连带分析表
  skcLabels: "1412145099", // SKC标签管理表
};

// Cache
let cache: Record<string, { data: RawRow[]; ts: number }> = {};
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export type RawRow = Record<string, string | number | null>;

async function fetchSheet(gid: string, forceRefresh = false): Promise<RawRow[]> {
  const key = gid;
  const now = Date.now();
  if (!forceRefresh && cache[key] && now - cache[key].ts < CACHE_TTL) {
    return cache[key].data;
  }

  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${gid}`;
  const resp = await axios.get(url, { responseType: "text", timeout: 30000 });
  const text: string = resp.data;

  const lines = text.split("\n").filter((l) => l.trim());
  if (lines.length < 2) return [];

  const headers = parseCSVLine(lines[0]);
  const rows: RawRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const vals = parseCSVLine(lines[i]);
    const row: RawRow = {};
    headers.forEach((h, idx) => {
      row[h.trim()] = vals[idx]?.trim() ?? null;
    });
    rows.push(row);
  }

  cache[key] = { data: rows, ts: now };
  return rows;
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let cur = "";
  let inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuote && line[i + 1] === '"') { cur += '"'; i++; }
      else inQuote = !inQuote;
    } else if (ch === "," && !inQuote) {
      result.push(cur); cur = "";
    } else {
      cur += ch;
    }
  }
  result.push(cur);
  return result;
}

export function clearCache() {
  cache = {};
}

// ─── Numeric helpers ───────────────────────────────────────────────────────────
function n(v: string | number | null | undefined): number {
  if (v === null || v === undefined || v === "" || v === "-") return 0;
  const s = String(v).replace(/,/g, "").replace(/£/g, "").replace(/%/g, "").trim();
  const num = parseFloat(s);
  return isNaN(num) ? 0 : num;
}

function safe(num: number, den: number): number | null {
  if (!den) return null;
  return num / den;
}

// ─── Aggregate a list of rows into metric totals ────────────────────────────
export interface MetricRow {
  sales: number;
  qty: number;
  exposure: number;        // Collection曝光用户数
  collectionClick: number; // Collection点击用户数
  uv: number;              // PDP曝光用户数
  addCart: number;         // 加车按钮点击用户数
  checkout: number;        // Checkout点击用户数
}

export interface ComputedMetrics extends MetricRow {
  ctr: number | null;           // CTR = collectionClick/exposure
  cvr: number | null;           // CVR = qty/uv
  uvOutput: number | null;      // UV产出 = sales/uv
  addCartRate: number | null;   // 加车率 = addCart/uv
  checkoutRate: number | null;  // 结账率 = checkout/addCart
  avgPrice: number | null;      // 均价 = sales/qty
  exposureOutput: number | null;// 千次曝光产出 = sales/exposure*1000
}

function aggRows(rows: RawRow[]): MetricRow {
  const m: MetricRow = { sales: 0, qty: 0, exposure: 0, collectionClick: 0, uv: 0, addCart: 0, checkout: 0 };
  for (const r of rows) {
    m.sales += n(r["销售额"]);
    m.qty += n(r["销量"]);
    m.exposure += n(r["Collection曝光用户数"] ?? r["Collection页面商品曝光用户数"]);
    m.collectionClick += n(r["Collection点击用户数"] ?? r["Collection页面商品点击用户数"]);
    m.uv += n(r["PDP曝光用户数"] ?? r["PDP页面曝光用户数"]);
    m.addCart += n(r["加车按钮点击用户数"] ?? r["PDP页面加车按钮点击用户数"]);
    m.checkout += n(r["Checkout点击用户数"] ?? r["Checkout按钮点击用户数"]);
  }
  return m;
}

function compute(m: MetricRow): ComputedMetrics {
  return {
    ...m,
    ctr: safe(m.collectionClick, m.exposure),
    cvr: safe(m.qty, m.uv),
    uvOutput: safe(m.sales, m.uv),
    addCartRate: safe(m.addCart, m.uv),
    checkoutRate: safe(m.checkout, m.addCart),
    avgPrice: safe(m.sales, m.qty),
    // 千次曝光产出 = 销售额 / 曝光 * 1000
    exposureOutput: m.exposure ? (m.sales / m.exposure) * 1000 : null,
  };
}

// change rate helper
export function chg(cur: number | null, cmp: number | null): number | null {
  if (cur === null || cmp === null || !cmp) return null;
  return cur / cmp - 1;
}

// ─── Filter helpers ─────────────────────────────────────────────────────────
function filterRows(rows: RawRow[], country: string, week: string, platform?: string): RawRow[] {
  return rows.filter((r) => {
    const cMatch = !country || !r["country"] || String(r["country"]).toUpperCase() === country.toUpperCase();
    const wMatch = String(r["business_year_and_week"]) === week;
    const pMatch = !platform || String(r["platform"]).toUpperCase() === platform.toUpperCase();
    return cMatch && wMatch && pMatch;
  });
}

// ─── Period helpers ─────────────────────────────────────────────────────────
/** 判断是否为月度格式：202604 (6位纯数字) 或 2026年4月 (中文年月) */
export function isMonthlyPeriod(period: string): boolean {
  return /^\d{6}$/.test(period) || /^\d{4}年\d{1,2}月$/.test(period);
}

/** 推算对比期（上一周/上一月）和同比期（去年同周/同月） */
function derivePrevYoy(cur: string, all: string[]): { prev: string; yoy: string } {
  if (isMonthlyPeriod(cur)) {
    // 月度：支持中文格式 "2026年4月" 和数字格式 "202604"
    let year: number, month: number;
    const chineseMatch = cur.match(/^(\d{4})年(\d{1,2})月$/);
    if (chineseMatch) {
      year = parseInt(chineseMatch[1]);
      month = parseInt(chineseMatch[2]);
    } else {
      year = parseInt(cur.slice(0, 4));
      month = parseInt(cur.slice(4, 6));
    }
    const prevMonth = month === 1 ? 12 : month - 1;
    const prevYear = month === 1 ? year - 1 : year;
    // 同时尝试中文格式和数字格式匹配
    const prevChinese = `${prevYear}年${prevMonth}月`;
    const yoyChinese = `${year - 1}年${month}月`;
    const prevNumeric = `${prevYear}${String(prevMonth).padStart(2, "0")}`;
    const yoyNumeric = `${year - 1}${String(month).padStart(2, "0")}`;
    const prevActual = all.find((w) => w === prevChinese || w === prevNumeric) ?? "";
    const yoyActual = all.find((w) => w === yoyChinese || w === yoyNumeric) ?? "";
    return { prev: prevActual, yoy: yoyActual };
  } else {
    // 周度：2026W17 → prev=2026W16, yoy=2025W17
    const yoy = cur.replace(/^(\d{4})/, (_, y) => String(parseInt(y) - 1));
    const idx = all.indexOf(cur);
    const prev = idx > 0 ? all[idx - 1] : "";
    const yoyActual = all.find((w) => w === yoy) ?? (all.length >= 3 ? all[0] : "");
    return { prev, yoy: yoyActual };
  }
}

// ─── Detect current/prev/yoy weeks ──────────────────────────────────────────
export function detectWeeks(
  rows: RawRow[],
  specifiedPeriod?: string
): { cur: string; prev: string; yoy: string; all: string[] } {
  const all = Array.from(new Set(rows.map((r) => String(r["business_year_and_week"])))).sort();
  const cur = specifiedPeriod && all.includes(specifiedPeriod)
    ? specifiedPeriod
    : (all[all.length - 1] ?? "");
  const { prev, yoy } = derivePrevYoy(cur, all);
  return { cur, prev, yoy, all };
}

/** 获取所有可用的周次/月份列表（周度+月度合并，降序排列） */
export async function getAvailablePeriods(forceRefresh = false): Promise<string[]> {
  const [catRows, monthlyPeriods] = await Promise.all([
    fetchSheet(GID.category, forceRefresh),
    getMonthlyPeriodsFromDb().catch(() => [] as string[]),
  ]);
  const weeklyPeriods = Array.from(new Set(catRows.map((r) => String(r["business_year_and_week"] ?? "")).filter(Boolean)));
  const all = Array.from(new Set([...weeklyPeriods, ...monthlyPeriods])).sort().reverse();
  return all;
}

// ─── 1. Target progress ──────────────────────────────────────────────────────
export async function getTargetData(forceRefresh = false) {
  const rows = await fetchSheet(GID.target, forceRefresh);
  return rows.map((r) => ({
    country: r["国家"],
    target: n(r["目标"]),
    actual: n(r["当前实际销售额"]),   // D列：当前实际销售额
    progress: r["达成进度"],              // E列：达成进度%
    diff: r["进度差"],
    cutoff: Object.entries(r).find(([k]) => k.includes("截止"))?.[1] ?? null,
  }));
}

// ─── 2. Sales comparison (YoY / WoW) ────────────────────────────────────────
export interface SalesCatRow {
  category: string;
  cur: ComputedMetrics;
  cmp: ComputedMetrics;
  salesShare: number | null;    // 当期在多品类合计中的占比
  salesShareCmp: number | null; // 对比期占比
  salesChange: number | null;   // 销售额变化率
}

async function buildSalesComparison(
  country: string,
  curWeek: string,
  cmpWeek: string,
  forceRefresh = false
): Promise<{ overall: SalesCatRow; multiTotal: SalesCatRow; swimRow: SalesCatRow; categories: SalesCatRow[] }> {
  const rows = await fetchSheet(GID.category, forceRefresh);

  const SWIMWEAR = ["泳衣", "泳装"];

  const curAll = filterRows(rows, country, curWeek);
  const cmpAll = filterRows(rows, country, cmpWeek);

  // 多品类（剔除泳衣）
  const curMulti = curAll.filter((r) => !SWIMWEAR.includes(String(r["second_category"])));
  const cmpMulti = cmpAll.filter((r) => !SWIMWEAR.includes(String(r["second_category"])));

  // 整体（含泳衣）
  const curOverallAgg = compute(aggRows(curAll));
  const cmpOverallAgg = compute(aggRows(cmpAll));

  const curMultiAgg = compute(aggRows(curMulti));
  const cmpMultiAgg = compute(aggRows(cmpMulti));

  // 泳衣品类单独聚合
  const curSwim = curAll.filter((r) => SWIMWEAR.includes(String(r["second_category"])));
  const cmpSwim = cmpAll.filter((r) => SWIMWEAR.includes(String(r["second_category"])));
  const curSwimAgg = compute(aggRows(curSwim));
  const cmpSwimAgg = compute(aggRows(cmpSwim));
  const swimRow: SalesCatRow = {
    category: "泳衣",
    cur: curSwimAgg,
    cmp: cmpSwimAgg,
    salesShare: curOverallAgg.sales ? curSwimAgg.sales / curOverallAgg.sales : null,
    salesShareCmp: cmpOverallAgg.sales ? cmpSwimAgg.sales / cmpOverallAgg.sales : null,
    salesChange: cmpSwimAgg.sales ? curSwimAgg.sales / cmpSwimAgg.sales - 1 : null,
  };

  // 各品类（含泳衣），按当期销售额降序
  // 泳衣参与正常排序，不单独固定在底部
  const cats = Array.from(new Set(curAll.map((r) => String(r["second_category"]))));

  const categories: SalesCatRow[] = cats.map((cat) => {
    const isSwim = SWIMWEAR.includes(cat);
    const curCat = compute(aggRows(curAll.filter((r) => r["second_category"] === cat)));
    const cmpCat = compute(aggRows(cmpAll.filter((r) => r["second_category"] === cat)));
    // 销售占比：所有品类统一用整体合计作分母（整体合计 = 多品类 + 泳衣）
    return {
      category: cat,
      cur: curCat,
      cmp: cmpCat,
      salesShare: curOverallAgg.sales ? curCat.sales / curOverallAgg.sales : null,
      salesShareCmp: cmpOverallAgg.sales ? cmpCat.sales / cmpOverallAgg.sales : null,
      salesChange: cmpCat.sales ? curCat.sales / cmpCat.sales - 1 : null,
    };
  }).sort((a, b) => b.cur.sales - a.cur.sales); // 按当期销售额降序（泳衣参与排序）

  const multiTotal: SalesCatRow = {
    category: "多品类合计",
    cur: curMultiAgg,
    cmp: cmpMultiAgg,
    salesShare: curOverallAgg.sales ? curMultiAgg.sales / curOverallAgg.sales : null,
    salesShareCmp: cmpOverallAgg.sales ? cmpMultiAgg.sales / cmpOverallAgg.sales : null,
    salesChange: cmpMultiAgg.sales ? curMultiAgg.sales / cmpMultiAgg.sales - 1 : null,
  };

  const overall: SalesCatRow = {
    category: "整体合计",
    cur: curOverallAgg,
    cmp: cmpOverallAgg,
    salesShare: 1,
    salesShareCmp: 1,
    salesChange: cmpOverallAgg.sales ? curOverallAgg.sales / cmpOverallAgg.sales - 1 : null,
  };

  // swimRow 保留以兼容前端，但 categories 已包含泳衣并参与排序
  return { overall, multiTotal, swimRow, categories };
}

export async function getSalesYoY(country: string, forceRefresh = false, period?: string) {
  const rows = await fetchSheet(GID.category, forceRefresh);
  const { cur, yoy } = detectWeeks(rows, period);
  return { weeks: { cur, yoy }, ...(await buildSalesComparison(country, cur, yoy, forceRefresh)) };
}

export async function getSalesWoW(country: string, forceRefresh = false, period?: string) {
  const rows = await fetchSheet(GID.category, forceRefresh);
  const { cur, prev } = detectWeeks(rows, period);
  return { weeks: { cur, prev }, ...(await buildSalesComparison(country, cur, prev, forceRefresh)) };
}

// ─── 3. Dual-platform (APP/WEB) ──────────────────────────────────────────────
export async function getDualPlatform(country: string, forceRefresh = false, period?: string) {
  const rows = await fetchSheet(GID.category, forceRefresh);
  const { cur, prev, yoy } = detectWeeks(rows, period);

  const SWIMWEAR = ["泳衣", "泳装"];

  const buildPlatform = (week: string, platform: string) => {
    const r = filterRows(rows, country, week, platform).filter(
      (r) => !SWIMWEAR.includes(String(r["second_category"]))
    );
    return compute(aggRows(r));
  };

  const curApp = buildPlatform(cur, "APP");
  const curWeb = buildPlatform(cur, "WEB");
  const prevApp = buildPlatform(prev, "APP");
  const prevWeb = buildPlatform(prev, "WEB");
  const yoyApp = buildPlatform(yoy, "APP");
  const yoyWeb = buildPlatform(yoy, "WEB");

  const curTotal = compute(aggRows(filterRows(rows, country, cur).filter(r => !SWIMWEAR.includes(String(r["second_category"])))));
  const prevTotal = compute(aggRows(filterRows(rows, country, prev).filter(r => !SWIMWEAR.includes(String(r["second_category"])))));
  const yoyTotal = compute(aggRows(filterRows(rows, country, yoy).filter(r => !SWIMWEAR.includes(String(r["second_category"])))));

  return {
    weeks: { cur, prev, yoy },
    wow: {
      app: { cur: curApp, cmp: prevApp, share: curTotal.sales ? curApp.sales / curTotal.sales : null, shareCmp: prevTotal.sales ? prevApp.sales / prevTotal.sales : null, uvShare: curTotal.uv ? curApp.uv / curTotal.uv : null, uvShareCmp: prevTotal.uv ? prevApp.uv / prevTotal.uv : null },
      web: { cur: curWeb, cmp: prevWeb, share: curTotal.sales ? curWeb.sales / curTotal.sales : null, shareCmp: prevTotal.sales ? prevWeb.sales / prevTotal.sales : null, uvShare: curTotal.uv ? curWeb.uv / curTotal.uv : null, uvShareCmp: prevTotal.uv ? prevWeb.uv / prevTotal.uv : null },
    },
    yoy: {
      app: { cur: curApp, cmp: yoyApp, share: curTotal.sales ? curApp.sales / curTotal.sales : null, shareCmp: yoyTotal.sales ? yoyApp.sales / yoyTotal.sales : null, uvShare: curTotal.uv ? curApp.uv / curTotal.uv : null, uvShareCmp: yoyTotal.uv ? yoyApp.uv / yoyTotal.uv : null },
      web: { cur: curWeb, cmp: yoyWeb, share: curTotal.sales ? curWeb.sales / curTotal.sales : null, shareCmp: yoyTotal.sales ? yoyWeb.sales / yoyTotal.sales : null, uvShare: curTotal.uv ? curWeb.uv / curTotal.uv : null, uvShareCmp: yoyTotal.uv ? yoyWeb.uv / yoyTotal.uv : null },
    },
  };
}

// ─── 4. Channel performance (WoW + YoY) ─────────────────────────────────────
function buildChannelRows(
  rows: RawRow[],
  country: string,
  curWeek: string,
  cmpWeek: string
) {
  const channels = Array.from(new Set(rows.map((r) => String(r["ad_channel"])))).filter(Boolean).sort();

  // 整体合计行
  const allCurRows = rows.filter(
    (r) =>
      String(r["business_year_and_week"]) === curWeek &&
      (!country || !r["country"] || String(r["country"]).toUpperCase() === country.toUpperCase())
  );
  const allCmpRows = rows.filter(
    (r) =>
      String(r["business_year_and_week"]) === cmpWeek &&
      (!country || !r["country"] || String(r["country"]).toUpperCase() === country.toUpperCase())
  );
  const totalCur = compute(aggRows(allCurRows));
  const totalCmp = compute(aggRows(allCmpRows));

  const channelRows = channels.map((ch) => {
    const curRows = rows.filter(
      (r) =>
        String(r["business_year_and_week"]) === curWeek &&
        String(r["ad_channel"]) === ch &&
        (!country || !r["country"] || String(r["country"]).toUpperCase() === country.toUpperCase())
    );
    const cmpRows = rows.filter(
      (r) =>
        String(r["business_year_and_week"]) === cmpWeek &&
        String(r["ad_channel"]) === ch &&
        (!country || !r["country"] || String(r["country"]).toUpperCase() === country.toUpperCase())
    );
    const curM = compute(aggRows(curRows));
    const cmpM = compute(aggRows(cmpRows));
    return {
      channel: ch,
      cur: curM,
      cmp: cmpM,
      salesChange: chg(curM.sales, cmpM.sales),
      salesShare: totalCur.sales ? curM.sales / totalCur.sales : null,
      salesShareCmp: totalCmp.sales ? cmpM.sales / totalCmp.sales : null,
      exposureShare: totalCur.exposure ? (curM.exposure ?? 0) / totalCur.exposure : null,
      exposureShareCmp: totalCmp.exposure ? (cmpM.exposure ?? 0) / totalCmp.exposure : null,
    };
  }).sort((a, b) => b.cur.sales - a.cur.sales);

  channelRows.push({
    channel: "整体合计",
    cur: totalCur,
    cmp: totalCmp,
    salesChange: chg(totalCur.sales, totalCmp.sales),
    salesShare: 1,
    salesShareCmp: 1,
    exposureShare: 1,
    exposureShareCmp: 1,
  });

  return channelRows;
}

export async function getChannelData(country: string, forceRefresh = false, period?: string) {
  const rows = await fetchSheet(GID.channel, forceRefresh);
  const { cur, prev, yoy } = detectWeeks(rows, period);

  return {
    weeks: { cur, prev, yoy },
    wow: buildChannelRows(rows, country, cur, prev),
    yoy: buildChannelRows(rows, country, cur, yoy),
  };
}

//// ─── 5. New vs Old products ──────────────────────────────────────────────
export async function getNewOldData(country: string, forceRefresh = false, period?: string) {
  const rows = period && isMonthlyPeriod(period)
    ? await fetchMonthlyFromDb(forceRefresh)
    : await fetchSheet(GID.skc, forceRefresh);
  const { cur, prev, yoy } = detectWeeks(rows, period);

  const filterCountryWeek = (week: string) =>
    rows.filter(
      (r) =>
        String(r["business_year_and_week"]) === week &&
        (!country || !r["country"] || String(r["country"]).toUpperCase() === country.toUpperCase())
    );

  const curRows = filterCountryWeek(cur);
  const prevRows = filterCountryWeek(prev);
  const yoyRows = filterCountryWeek(yoy);

  // 兼容月度新老品和周度新老品字段名
  const getNewOldFlag = (r: RawRow) => String(r["月度新老品"] ?? r["周度新老品"] ?? "");
  // 新品判断：周报用"新品"，月报用"当月新品"，两者都识别为新品
  const isNewProduct = (flag: string) => flag === "新品" || flag === "当月新品";
  const newRows = curRows.filter((r) => isNewProduct(getNewOldFlag(r)));
  const oldRows = curRows.filter((r) => !isNewProduct(getNewOldFlag(r)));

  // Aggregate by onShelfRange for new/old
  const aggByRange = (skcRows: RawRow[]) => {
    const rangeMap = new Map<string, RawRow[]>();
    for (const r of skcRows) {
      const range = String(r["在架天数区间"] ?? "未知");
      if (!rangeMap.has(range)) rangeMap.set(range, []);
      rangeMap.get(range)!.push(r);
    }
    return Array.from(rangeMap.entries()).map(([range, rs]) => ({
      range,
      ...compute(aggRows(rs)),
      skcCount: new Set(rs.map((r) => r["skc"])).size,
    })).sort((a, b) => b.sales - a.sales);
  };

  // aggByRange with wow/yoy comparison
  const aggByRangeWithCmp = (curSkcRows: RawRow[], prevSkcRows: RawRow[], yoySkcRows: RawRow[]) => {
    const allRanges = Array.from(new Set([
      ...curSkcRows.map((r) => String(r["在架天数区间"] ?? "未知")),
      ...prevSkcRows.map((r) => String(r["在架天数区间"] ?? "未知")),
    ]));
    const getRangeRows = (rows: RawRow[], range: string) => rows.filter((r) => String(r["在架天数区间"] ?? "未知") === range);
    return allRanges.map((range) => {
      const cr = getRangeRows(curSkcRows, range);
      const pr = getRangeRows(prevSkcRows, range);
      const yr = getRangeRows(yoySkcRows, range);
      return {
        range,
        cur: { ...compute(aggRows(cr)), skcCount: new Set(cr.map((r) => r["skc"])).size },
        prev: { ...compute(aggRows(pr)), skcCount: new Set(pr.map((r) => r["skc"])).size },
        yoy: { ...compute(aggRows(yr)), skcCount: new Set(yr.map((r) => r["skc"])).size },
      };
    }).sort((a, b) => b.cur.sales - a.cur.sales);
  };

  // Top15 by sales with image placeholder
  const skcAgg = (skcRows: RawRow[]) => {
    const map = new Map<string, RawRow[]>();
    for (const r of skcRows) {
      const skc = String(r["skc"]);
      if (!map.has(skc)) map.set(skc, []);
      map.get(skc)!.push(r);
    }
    return Array.from(map.entries())
      .map(([skc, rs]) => {
        const m = compute(aggRows(rs));
        const r0 = rs[0];
        const newOldFlag = getNewOldFlag(r0);
        return {
          skc,
          category: r0["second_category"],
          thirdCategory: r0["third_category"],
          occasion: r0["场合"],
          firstSecondColor: r0["首复色"] ?? null,
          onShelfDays: n(r0["在架天数"]),
          onShelfRange: r0["在架天数区间"],
          firstListDate: r0["首次上架日期"],
          isNew: isNewProduct(newOldFlag),
          newOldLabel: newOldFlag || null,
          ...m,
        };
      })
      .sort((a, b) => b.sales - a.sales);
  };

  const newSkcs = skcAgg(newRows);
  const oldSkcs = skcAgg(oldRows);

  // 上周（环比期）Top15
  const prevNewRows = prevRows.filter((r) => isNewProduct(getNewOldFlag(r)));
  const prevOldRows = prevRows.filter((r) => !isNewProduct(getNewOldFlag(r)));
  const prevNewSkcs = skcAgg(prevNewRows);
  const prevOldSkcs = skcAgg(prevOldRows);

  // Summary with wow/yoy
  const curNewAgg = compute(aggRows(newRows));
  const curOldAgg = compute(aggRows(oldRows));
  const prevNewAgg = compute(aggRows(prevRows.filter((r) => isNewProduct(getNewOldFlag(r)))));
  const prevOldAgg = compute(aggRows(prevRows.filter((r) => !isNewProduct(getNewOldFlag(r)))));
  const yoyNewAgg = compute(aggRows(yoyRows.filter((r) => isNewProduct(getNewOldFlag(r)))));
  const yoyOldAgg = compute(aggRows(yoyRows.filter((r) => !isNewProduct(getNewOldFlag(r)))));

  // ─── 月报专用：按品类维度的新老品汇总（多品类整体 + 五个重点品类）────────────────
  const MONTHLY_KEY_CATS = ["连衣裙", "罩衫", "连体装", "上衣", "下装"];
  const SWIMWEAR_CATS = ["泳衣", "泳装"];
  const buildCatNewOld = (catCur: RawRow[], catPrev: RawRow[], catYoy: RawRow[]) => {
    const cNew = catCur.filter((r) => isNewProduct(getNewOldFlag(r)));
    const cOld = catCur.filter((r) => !isNewProduct(getNewOldFlag(r)));
    const pNew = catPrev.filter((r) => isNewProduct(getNewOldFlag(r)));
    const pOld = catPrev.filter((r) => !isNewProduct(getNewOldFlag(r)));
    const yNew = catYoy.filter((r) => isNewProduct(getNewOldFlag(r)));
    const yOld = catYoy.filter((r) => !isNewProduct(getNewOldFlag(r)));
    const cAll = compute(aggRows(catCur));
    const pAll = compute(aggRows(catPrev));
    const yAll = compute(aggRows(catYoy));
    return {
      new: { cur: compute(aggRows(cNew)), prev: compute(aggRows(pNew)), yoy: compute(aggRows(yNew)) },
      old: { cur: compute(aggRows(cOld)), prev: compute(aggRows(pOld)), yoy: compute(aggRows(yOld)) },
      total: { cur: cAll, prev: pAll, yoy: yAll },
      newSkcCount: new Set(cNew.map((r) => r["skc"])).size,
      oldSkcCount: new Set(cOld.map((r) => r["skc"])).size,
    };
  };
  const multiCurRows = curRows.filter((r) => !SWIMWEAR_CATS.includes(String(r["second_category"])));
  const multiPrevRows = prevRows.filter((r) => !SWIMWEAR_CATS.includes(String(r["second_category"])));
  const multiYoyRows = yoyRows.filter((r) => !SWIMWEAR_CATS.includes(String(r["second_category"])));
  const monthlyCatBreakdown: Record<string, ReturnType<typeof buildCatNewOld>> = {
    "多品类整体": buildCatNewOld(multiCurRows, multiPrevRows, multiYoyRows),
  };
  for (const cat of MONTHLY_KEY_CATS) {
    monthlyCatBreakdown[cat] = buildCatNewOld(
      curRows.filter((r) => String(r["second_category"]) === cat),
      prevRows.filter((r) => String(r["second_category"]) === cat),
      yoyRows.filter((r) => String(r["second_category"]) === cat)
    );
  }
  // 整体合计（新品+老品）从所有行重新 compute，确保比率字段正确
  const curAllAgg = compute(aggRows(curRows));
  const prevAllAgg = compute(aggRows(prevRows));
  const yoyAllAgg = compute(aggRows(yoyRows));
  const curAllSales = curAllAgg.sales;
  const prevAllSales = prevAllAgg.sales;
  const yoyAllSales = yoyAllAgg.sales;

  return {
    weeks: { cur, prev, yoy },
    summary: {
      new: { cur: curNewAgg, prev: prevNewAgg, yoy: yoyNewAgg },
      old: { cur: curOldAgg, prev: prevOldAgg, yoy: yoyOldAgg },
    },
    newByRange: aggByRange(newRows),
    oldByRange: aggByRange(oldRows),
    newByRangeCmp: aggByRangeWithCmp(
      newRows,
      prevRows.filter((r) => isNewProduct(getNewOldFlag(r))),
      yoyRows.filter((r) => isNewProduct(getNewOldFlag(r)))
    ),
    oldByRangeCmp: aggByRangeWithCmp(
      oldRows,
      prevRows.filter((r) => !isNewProduct(getNewOldFlag(r))),
      yoyRows.filter((r) => !isNewProduct(getNewOldFlag(r)))
    ),
    newRangeTotal: {
      cur: { ...curNewAgg, skcCount: new Set(newRows.map((r) => r["skc"])).size },
      prev: { ...prevNewAgg, skcCount: new Set(prevRows.filter((r) => isNewProduct(getNewOldFlag(r))).map((r) => r["skc"])).size },
      yoy: { ...yoyNewAgg, skcCount: new Set(yoyRows.filter((r) => isNewProduct(getNewOldFlag(r))).map((r) => r["skc"])).size },
      salesShare: curAllSales ? curNewAgg.sales / curAllSales : null,
      salesSharePrev: prevAllSales ? prevNewAgg.sales / prevAllSales : null,
      salesShareYoy: yoyAllSales ? yoyNewAgg.sales / yoyAllSales : null,
      uvShare: curAllAgg.uv ? curNewAgg.uv / curAllAgg.uv : null,
      uvSharePrev: prevAllAgg.uv ? prevNewAgg.uv / prevAllAgg.uv : null,
      uvShareYoy: yoyAllAgg.uv ? yoyNewAgg.uv / yoyAllAgg.uv : null,
      exposureShare: curAllAgg.exposure ? curNewAgg.exposure / curAllAgg.exposure : null,
      exposureSharePrev: prevAllAgg.exposure ? prevNewAgg.exposure / prevAllAgg.exposure : null,
      exposureShareYoy: yoyAllAgg.exposure ? yoyNewAgg.exposure / yoyAllAgg.exposure : null,
    },
    oldRangeTotal: {
      cur: { ...curOldAgg, skcCount: new Set(oldRows.map((r) => r["skc"])).size },
      prev: { ...prevOldAgg, skcCount: new Set(prevRows.filter((r) => !isNewProduct(getNewOldFlag(r))).map((r) => r["skc"])).size },
      yoy: { ...yoyOldAgg, skcCount: new Set(yoyRows.filter((r) => !isNewProduct(getNewOldFlag(r))).map((r) => r["skc"])).size },
      salesShare: curAllSales ? curOldAgg.sales / curAllSales : null,
      salesSharePrev: prevAllSales ? prevOldAgg.sales / prevAllSales : null,
      salesShareYoy: yoyAllSales ? yoyOldAgg.sales / yoyAllSales : null,
      uvShare: curAllAgg.uv ? curOldAgg.uv / curAllAgg.uv : null,
      uvSharePrev: prevAllAgg.uv ? prevOldAgg.uv / prevAllAgg.uv : null,
      uvShareYoy: yoyAllAgg.uv ? yoyOldAgg.uv / yoyAllAgg.uv : null,
      exposureShare: curAllAgg.exposure ? curOldAgg.exposure / curAllAgg.exposure : null,
      exposureSharePrev: prevAllAgg.exposure ? prevOldAgg.exposure / prevAllAgg.exposure : null,
      exposureShareYoy: yoyAllAgg.exposure ? yoyOldAgg.exposure / yoyAllAgg.exposure : null,
    },
    overallRangeTotal: {
      cur: { ...curAllAgg, skcCount: new Set(curRows.map((r) => r["skc"])).size },
      prev: { ...prevAllAgg, skcCount: new Set(prevRows.map((r) => r["skc"])).size },
      yoy: { ...yoyAllAgg, skcCount: new Set(yoyRows.map((r) => r["skc"])).size },
      salesShare: 1,
      salesSharePrev: 1,
      salesShareYoy: 1,
      uvShare: 1,
      uvSharePrev: 1,
      uvShareYoy: 1,
      exposureShare: 1,
      exposureSharePrev: 1,
      exposureShareYoy: 1,
    },
    newTop15: newSkcs.slice(0, 15),
    oldTop15: oldSkcs.slice(0, 15),
    prevNewTop15: prevNewSkcs,  // full list for wow lookup (not sliced)
    prevOldTop15: prevOldSkcs,   // full list for wow lookup (not sliced)
    monthlyCatBreakdown,
  };
}

// ─── 6. Scene performance (WoW + YoY) ────────────────────────────────────────────
export async function getSceneData(country: string, forceRefresh = false, period?: string) {
  const rows = period && isMonthlyPeriod(period)
    ? await fetchMonthlyFromDb(forceRefresh)
    : await fetchSheet(GID.skc, forceRefresh);
  const { cur, prev, yoy } = detectWeeks(rows, period);

  const filterCW = (week: string) =>
    rows.filter(
      (r) =>
        String(r["business_year_and_week"]) === week &&
        (!country || !r["country"] || String(r["country"]).toUpperCase() === country.toUpperCase())
    );

  const curRows = filterCW(cur);
  const prevRows = filterCW(prev);
  const yoyRows = filterCW(yoy);

  const scenes = Array.from(
    new Set([
      ...curRows.map((r) => String(r["场合"] ?? "未标注")),
    ])
  ).filter(Boolean).sort();

  const curTotal = compute(aggRows(curRows));
  const prevTotal = compute(aggRows(prevRows));
  const yoyTotal = compute(aggRows(yoyRows));

  const totalSalesSharePrev = prevTotal.sales ? prevTotal.sales / prevTotal.sales : 1;

  return {
    weeks: { cur, prev, yoy },
    total: {
      scene: "整体合计",
      cur: curTotal,
      prev: prevTotal,
      yoy: yoyTotal,
      salesShare: 1,
      salesSharePrev: 1,
      salesShareYoy: 1,
      uvShare: 1,
      uvSharePrev: 1,
      uvShareYoy: 1,
      skcCount: new Set(curRows.map((r) => r["skc"])).size,
    },
    scenes: scenes.map((scene) => {
      const cr = curRows.filter((r) => String(r["场合"] ?? "未标注") === scene);
      const pr = prevRows.filter((r) => String(r["场合"] ?? "未标注") === scene);
      const yr = yoyRows.filter((r) => String(r["场合"] ?? "未标注") === scene);
      const curM = compute(aggRows(cr));
      const prevM = compute(aggRows(pr));
      const yoyM = compute(aggRows(yr));
      return {
        scene,
        cur: curM,
        prev: prevM,
        yoy: yoyM,
        salesShare: curTotal.sales ? curM.sales / curTotal.sales : null,
        salesSharePrev: prevTotal.sales ? prevM.sales / prevTotal.sales : null,
        salesShareYoy: yoyTotal.sales ? yoyM.sales / yoyTotal.sales : null,
        uvShare: curTotal.uv ? curM.uv / curTotal.uv : null,
        uvSharePrev: prevTotal.uv ? prevM.uv / prevTotal.uv : null,
        uvShareYoy: yoyTotal.uv ? yoyM.uv / yoyTotal.uv : null,
        exposureShare: curTotal.exposure ? curM.exposure / curTotal.exposure : null,
        exposureSharePrev: prevTotal.exposure ? prevM.exposure / prevTotal.exposure : null,
        exposureShareYoy: yoyTotal.exposure ? yoyM.exposure / yoyTotal.exposure : null,
        skcCount: new Set(cr.map((r) => r["skc"])).size,
      };
    }).sort((a, b) => b.cur.sales - a.cur.sales),
  };
}

// ─── 7. Scene × Category breakdown ─────────────────────────────────────────
export async function getSceneByCategoryData(country: string, forceRefresh = false, period?: string) {
  const rows = period && isMonthlyPeriod(period)
    ? await fetchMonthlyFromDb(forceRefresh)
    : await fetchSheet(GID.skc, forceRefresh);
  const { cur, prev, yoy } = detectWeeks(rows, period);
  const SWIMWEAR = ["泳衣", "泳装"];

  const filterCW = (week: string) =>
    rows.filter(
      (r) =>
        String(r["business_year_and_week"]) === week &&
        (!country || !r["country"] || String(r["country"]).toUpperCase() === country.toUpperCase()) &&
        !SWIMWEAR.includes(String(r["second_category"]))
    );

  const curRows = filterCW(cur);
  const prevRows = filterCW(prev);
  const yoyRows = filterCW(yoy);

  // Get all scenes from current week
  const scenes = Array.from(
    new Set(curRows.map((r) => String(r["场合"] ?? "未标注")))
  ).filter(Boolean).sort();

  // Get all categories from current week
  const categories = Array.from(
    new Set(curRows.map((r) => String(r["second_category"])))
  ).filter(Boolean);

  // Total sales per scene (cur) for share calculation
  const sceneTotals: Record<string, { cur: ReturnType<typeof compute>; prev: ReturnType<typeof compute>; yoy: ReturnType<typeof compute> }> = {};
  for (const scene of scenes) {
    const cr = curRows.filter((r) => String(r["场合"] ?? "未标注") === scene);
    const pr = prevRows.filter((r) => String(r["场合"] ?? "未标注") === scene);
    const yr = yoyRows.filter((r) => String(r["场合"] ?? "未标注") === scene);
    sceneTotals[scene] = {
      cur: compute(aggRows(cr)),
      prev: compute(aggRows(pr)),
      yoy: compute(aggRows(yr)),
    };
  }

  // Build scene × category matrix
  const result: Array<{
    scene: string;
    sceneTotal: { cur: ReturnType<typeof compute>; prev: ReturnType<typeof compute>; yoy: ReturnType<typeof compute> };
    categories: Array<{
      category: string;
      cur: ReturnType<typeof compute>;
      prev: ReturnType<typeof compute>;
      yoy: ReturnType<typeof compute>;
      salesShare: number | null;      // category sales / scene total sales (cur)
      salesSharePrev: number | null;
      exposureShare: number | null;   // category exposure / scene total exposure (cur)
      exposureSharePrev: number | null;
      salesWoW: number | null;
      salesYoY: number | null;
      exposureWoW: number | null;
      uvWoW: number | null;
    }>;
  }> = [];

  for (const scene of scenes) {
    const st = sceneTotals[scene];
    const catRows: typeof result[0]["categories"] = [];

    for (const cat of categories) {
      const cr = curRows.filter((r) => String(r["场合"] ?? "未标注") === scene && String(r["second_category"]) === cat);
      if (cr.length === 0) continue; // skip if no data for this scene×category combo
      const pr = prevRows.filter((r) => String(r["场合"] ?? "未标注") === scene && String(r["second_category"]) === cat);
      const yr = yoyRows.filter((r) => String(r["场合"] ?? "未标注") === scene && String(r["second_category"]) === cat);
      const curM = compute(aggRows(cr));
      const prevM = compute(aggRows(pr));
      const yoyM = compute(aggRows(yr));

      catRows.push({
        category: cat,
        cur: curM,
        prev: prevM,
        yoy: yoyM,
        salesShare: st.cur.sales ? curM.sales / st.cur.sales : null,
        salesSharePrev: st.prev.sales ? prevM.sales / st.prev.sales : null,
        exposureShare: st.cur.exposure ? (curM.exposure ?? 0) / (st.cur.exposure ?? 1) : null,
        exposureSharePrev: st.prev.exposure ? (prevM.exposure ?? 0) / (st.prev.exposure ?? 1) : null,
        salesWoW: chg(curM.sales, prevM.sales),
        salesYoY: chg(curM.sales, yoyM.sales),
        exposureWoW: chg(curM.exposure, prevM.exposure),
        uvWoW: chg(curM.uv, prevM.uv),
      });
    }

    // Sort by current sales descending
    catRows.sort((a, b) => b.cur.sales - a.cur.sales);

    result.push({
      scene,
      sceneTotal: st,
      categories: catRows,
    });
  }

  // Sort scenes by current sales descending
  result.sort((a, b) => b.sceneTotal.cur.sales - a.sceneTotal.cur.sales);

  return { weeks: { cur, prev, yoy }, scenes: result };
}

export async function getOccasionData(country: string, forceRefresh = false, period?: string) {
  const rows = period && isMonthlyPeriod(period)
    ? await fetchMonthlyFromDb(forceRefresh)
    : await fetchSheet(GID.skc, forceRefresh);
  const { cur, prev, yoy } = detectWeeks(rows, period);
  const TARGET_CATEGORIES = ["多品类", "连衣裙", "罩衫", "连体装", "上衣", "下装", "针织服装", "外套"];

  const filterCW = (week: string) =>
    rows.filter(
      (r) =>
        String(r["business_year_and_week"]) === week &&
        (!country || !r["country"] || String(r["country"]).toUpperCase() === country.toUpperCase())
    );

  const curRows = filterCW(cur);
  const prevRows = filterCW(prev);
  const yoyRows = filterCW(yoy);

  const allSkcs = Array.from(
    new Set([...curRows, ...prevRows, ...yoyRows].map((row) => String(row["skc"])).filter(Boolean)),
  );
  const tagMap = await getHengshiSkcTags(allSkcs);

  const attachOccasion = (inputRows: RawRow[]) =>
    inputRows.map((row) => {
      const skc = String(row["skc"]);
      const tag = tagMap.get(skc);
      return {
        row,
        category: String(row["second_category"] ?? ""),
        occasion:
          tag?.occasion && tag?.occasionZh
            ? `${tag.occasion} / ${tag.occasionZh}`
            : tag?.occasionZh ?? "未标注",
      };
    });

  const curTagged = attachOccasion(curRows);
  const prevTagged = attachOccasion(prevRows);
  const yoyTagged = attachOccasion(yoyRows);

  const occasions = Array.from(new Set(curTagged.map((item) => item.occasion))).filter(Boolean).sort();

  const computeFor = (items: typeof curTagged, occasion: string, category: string) => {
    const filtered = items.filter((item) => item.occasion === occasion && (category === "多品类" || item.category === category)).map((item) => item.row);
    return compute(aggRows(filtered));
  };

  const totalFor = (items: typeof curTagged, category: string) =>
    compute(aggRows(items.filter((item) => category === "多品类" || item.category === category).map((item) => item.row)));

  const categories = TARGET_CATEGORIES.filter((category) =>
    category === "多品类" || curTagged.some((item) => item.category === category),
  );

  return {
    weeks: { cur, prev, yoy },
    categories,
    occasions: occasions.map((occasion) => {
      const byCategory = categories.map((category) => {
        const curMetric = computeFor(curTagged, occasion, category);
        const prevMetric = computeFor(prevTagged, occasion, category);
        const yoyMetric = computeFor(yoyTagged, occasion, category);
        const curTotal = totalFor(curTagged, category);
        const prevTotal = totalFor(prevTagged, category);
        const yoyTotal = totalFor(yoyTagged, category);

        return {
          category,
          cur: curMetric,
          prev: prevMetric,
          yoy: yoyMetric,
          salesShare: curTotal.sales ? curMetric.sales / curTotal.sales : null,
          salesSharePrev: prevTotal.sales ? prevMetric.sales / prevTotal.sales : null,
          salesShareYoy: yoyTotal.sales ? yoyMetric.sales / yoyTotal.sales : null,
          exposureShare: curTotal.exposure ? curMetric.exposure / curTotal.exposure : null,
          exposureSharePrev: prevTotal.exposure ? prevMetric.exposure / prevTotal.exposure : null,
          exposureShareYoy: yoyTotal.exposure ? yoyMetric.exposure / yoyTotal.exposure : null,
          uvShare: curTotal.uv ? curMetric.uv / curTotal.uv : null,
          uvSharePrev: prevTotal.uv ? prevMetric.uv / prevTotal.uv : null,
          uvShareYoy: yoyTotal.uv ? yoyMetric.uv / yoyTotal.uv : null,
          skcCount: new Set(curTagged.filter((item) => item.occasion === occasion && (category === "多品类" || item.category === category)).map((item) => item.row["skc"])).size,
        };
      });

      return {
        occasion,
        categories: byCategory,
      };
    }),
  };
}

// ─── Fetch SKC → image URL map from image Sheet ────────────────────────────
async function fetchImageMap(forceRefresh = false): Promise<Map<string, string>> {
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${GID.image}`;
  const cacheKey = "image_map";
  const now = Date.now();
  const cached = (cache as any)[cacheKey];
  if (!forceRefresh && cached && now - cached.ts < CACHE_TTL) {
    return cached.map;
  }

  try {
    const resp = await axios.get(url, { responseType: "text", timeout: 30000 });
    const text: string = resp.data;
    const lines = text.split("\n").filter((l) => l.trim());
    let headerIdx = 0;
    for (let i = 0; i < Math.min(3, lines.length); i++) {
      if (lines[i].toLowerCase().includes("skc")) { headerIdx = i; break; }
    }
    const headers = parseCSVLine(lines[headerIdx]);
    const skcIdx = headers.findIndex((h) => h.trim().toLowerCase() === "skc");
    const imgIdx = 9; // J column (0-indexed)

    const map = new Map<string, string>();
    for (let i = headerIdx + 1; i < lines.length; i++) {
      const vals = parseCSVLine(lines[i]);
      const skc = vals[skcIdx]?.trim();
      const img = vals[imgIdx]?.trim();
      if (skc && img && img.startsWith("http")) {
        if (!map.has(skc)) map.set(skc, img);
      }
    }
    (cache as any)[cacheKey] = { map, ts: now };
    return map;
  } catch (e) {
    console.warn("[fetchImageMap] failed:", e);
    return new Map();
  }
}

// ─── 7. Bestseller elements (Top15 SKC with images) ─────────────────────────
export async function getBestsellerElements(country: string, forceRefresh = false, period?: string) {
  const isMonthly = period ? isMonthlyPeriod(period) : false;

  const [rows, imgMap] = await Promise.all([
    period && isMonthlyPeriod(period)
      ? fetchMonthlyFromDb(forceRefresh)
      : fetchSheet(GID.skc, forceRefresh),
    fetchImageMap(forceRefresh),
  ]);

  const { cur, prev, yoy } = detectWeeks(rows, period);

  const filterCW = (week: string) =>
    rows.filter(
      (r) =>
        String(r["business_year_and_week"]) === week &&
        (!country || !r["country"] || String(r["country"]).toUpperCase() === country.toUpperCase())
    );

  const curRows = filterCW(cur);
  // 月报用 yoy（去年同月），周报用 prev（上周）
  const cmpRows = isMonthly ? filterCW(yoy) : filterCW(prev);

  const getNewOldFlag = (r: RawRow) => String(r["月度新老品"] ?? r["周度新老品"] ?? "");
  const isNewProduct = (flag: string) => flag === "新品" || flag === "当月新品";

  // ─── SKC aggregation helper ───────────────────────────────────────────────
  const skcAgg = (skcRows: RawRow[]) => {
    const map = new Map<string, RawRow[]>();
    for (const r of skcRows) {
      const skc = String(r["skc"]);
      if (!map.has(skc)) map.set(skc, []);
      map.get(skc)!.push(r);
    }
    return Array.from(map.entries())
      .map(([skc, rs]) => {
        const m = compute(aggRows(rs));
        const r0 = rs[0];
        const flag = getNewOldFlag(r0);
        return {
          skc,
          imageUrl: imgMap.get(skc) ?? null,
          category: r0["second_category"],
          thirdCategory: r0["third_category"],
          occasion: r0["场合"],
          firstSecondColor: r0["首复色"] ?? null,
          onShelfDays: n(r0["在架天数"]),
          firstListDate: r0["首次上架日期"] ?? null,
          isNew: isNewProduct(flag),
          newOldLabel: flag || null,
          ...m,
        };
      })
      .sort((a, b) => b.sales - a.sales);
  };

  const chgVal = (cur: number | null | undefined, prev: number | null | undefined): number | null => {
    if (cur == null || prev == null || prev === 0) return null;
    return (cur - prev) / Math.abs(prev);
  };

  const enrichWithHengshiTags = <T extends { skc: string; occasion?: unknown }>(
    items: T[],
    tagMap: Map<string, HengshiSkcTag>,
  ) =>
    items.map((item) => {
      const tag = tagMap.get(item.skc);
      if (!tag) return item;
      return {
        ...item,
        primaryColorSystem: tag.primaryColorSystem,
        primaryPattern: tag.primaryPattern,
        designDetails: tag.designDetails,
        shape: tag.shape,
        collarShape: tag.collarShape,
        sleeveLength: tag.sleeveLength,
        dressLength: tag.dressLength,
        fabricTypes: tag.fabricTypes,
        strapType: tag.strapType,
        skirtType: tag.skirtType,
        occasionTag: tag.occasion,
        occasionZh: tag.occasionZh ?? item.occasion ?? null,
      };
    });

  // ─── Build cmp lookup map ─────────────────────────────────────────────────
  const cmpSkcMap = new Map(skcAgg(cmpRows).map((it) => [it.skc, it]));

  const injectWithCmp = (items: ReturnType<typeof skcAgg>) =>
    items.map((item) => {
      const p = cmpSkcMap.get(item.skc);
      return {
        ...item,
        // cmp period metrics
        prevSales: p?.sales ?? null,
        prevQty: p?.qty ?? null,
        prevUv: p?.uv ?? null,
        prevExposure: p?.exposure ?? null,
        prevCtr: p?.ctr ?? null,
        prevCvr: p?.cvr ?? null,
        prevUvOutput: p?.uvOutput ?? null,
        prevAvgPrice: p?.avgPrice ?? null,
        prevExposureOutput: p?.exposureOutput ?? null,
        prevAddCartRate: p?.addCartRate ?? null,
        // change rates
        salesChg: chgVal(item.sales, p?.sales),
        qtyChg: chgVal(item.qty, p?.qty),
        uvChg: chgVal(item.uv, p?.uv),
        exposureChg: chgVal(item.exposure, p?.exposure),
        ctrChg: chgVal(item.ctr, p?.ctr),
        cvrChg: chgVal(item.cvr, p?.cvr),
        uvOutputChg: chgVal(item.uvOutput, p?.uvOutput),
        avgPriceChg: chgVal(item.avgPrice, p?.avgPrice),
        exposureOutputChg: chgVal(item.exposureOutput, p?.exposureOutput),
        addCartRateChg: chgVal(item.addCartRate, p?.addCartRate),
      };
    });

  // ─── Overall new/old Top15 ────────────────────────────────────────────────
  const newRows = curRows.filter((r) => isNewProduct(getNewOldFlag(r)));
  const oldRows = curRows.filter((r) => !isNewProduct(getNewOldFlag(r)));
  const newTop15 = injectWithCmp(skcAgg(newRows).slice(0, 15));
  const oldTop15 = injectWithCmp(skcAgg(oldRows).slice(0, 15));

  // ─── Per-category Top15 (本期 + 同期/同比) ────────────────────────────────
  const KEY_CATS = ["连衣裙", "连体装", "罩衫", "上衣", "下装"];
  const categoryTop15: Array<{
    category: string;
    curTop15: ReturnType<typeof injectWithCmp>;
    cmpTop15: ReturnType<typeof skcAgg>;
  }> = KEY_CATS.map((cat) => {
    const catCurRows = curRows.filter((r) => String(r["second_category"]) === cat);
    const catCmpRows = cmpRows.filter((r) => String(r["second_category"]) === cat);
    const catCurSkcs = skcAgg(catCurRows);
    const catCmpSkcs = skcAgg(catCmpRows);
    // Build per-category cmp map for this category
    const catCmpMap = new Map(catCmpSkcs.map((it) => [it.skc, it]));
    const injectCatCmp = (items: ReturnType<typeof skcAgg>) =>
      items.map((item) => {
        const p = catCmpMap.get(item.skc);
        return {
          ...item,
          prevSales: p?.sales ?? null,
          prevQty: p?.qty ?? null,
          prevUv: p?.uv ?? null,
          prevExposure: p?.exposure ?? null,
          prevCtr: p?.ctr ?? null,
          prevCvr: p?.cvr ?? null,
          prevUvOutput: p?.uvOutput ?? null,
          prevAvgPrice: p?.avgPrice ?? null,
          prevExposureOutput: p?.exposureOutput ?? null,
          prevAddCartRate: p?.addCartRate ?? null,
          salesChg: chgVal(item.sales, p?.sales),
          qtyChg: chgVal(item.qty, p?.qty),
          uvChg: chgVal(item.uv, p?.uv),
          exposureChg: chgVal(item.exposure, p?.exposure),
          ctrChg: chgVal(item.ctr, p?.ctr),
          cvrChg: chgVal(item.cvr, p?.cvr),
          uvOutputChg: chgVal(item.uvOutput, p?.uvOutput),
          avgPriceChg: chgVal(item.avgPrice, p?.avgPrice),
          exposureOutputChg: chgVal(item.exposureOutput, p?.exposureOutput),
          addCartRateChg: chgVal(item.addCartRate, p?.addCartRate),
        };
      });
    return {
      category: cat,
      curTop15: injectCatCmp(catCurSkcs.slice(0, 15)),
      cmpTop15: catCmpSkcs.slice(0, 15),
    };
  });

  const allSkcs = [
    ...newTop15,
    ...oldTop15,
    ...categoryTop15.flatMap((item) => [...item.curTop15, ...item.cmpTop15]),
  ].map((item) => item.skc);
  const hengshiTagMap = await getHengshiSkcTags(allSkcs);

  const cmpLabel = isMonthly ? yoy : prev;

  return {
    weeks: { cur, prev, yoy, cmpLabel },
    isMonthly,
    newTop15: enrichWithHengshiTags(newTop15, hengshiTagMap),
    oldTop15: enrichWithHengshiTags(oldTop15, hengshiTagMap),
    categoryTop15: categoryTop15.map((item) => ({
      ...item,
      curTop15: enrichWithHengshiTags(item.curTop15, hengshiTagMap),
      cmpTop15: enrichWithHengshiTags(item.cmpTop15, hengshiTagMap),
    })),
  };
}

// ─── 8. New/Old products - Top15 by shelf-day range ────────────────────────────
const SHELF_RANGES = [
  { key: "2-8天",  label: "2-8天",  min: 2,  max: 8 },
  { key: "9-30天", label: "9-30天", min: 9,  max: 30 },
  { key: "31-60天", label: "31-60天", min: 31, max: 60 },
  { key: "61-90天", label: "61-90天", min: 61, max: 90 },
  { key: "91天+",  label: "91天+",  min: 91, max: Infinity },
] as const;

export async function getNewOldRangeTop15(country: string, forceRefresh = false, period?: string) {
  const [rows, imgMap] = await Promise.all([
    period && isMonthlyPeriod(period)
      ? fetchMonthlyFromDb(forceRefresh)
      : fetchSheet(GID.skc, forceRefresh),
    fetchImageMap(forceRefresh),
  ]);
  const { cur, prev } = detectWeeks(rows, period);

  const filterCountry = (r: RawRow) => !country || !r["country"] || String(r["country"]).toUpperCase() === country.toUpperCase();
  const curRows = rows.filter((r) => String(r["business_year_and_week"]) === cur && filterCountry(r));
  const prevRows = rows.filter((r) => String(r["business_year_and_week"]) === prev && filterCountry(r));

  // Aggregate by SKC
  const skcAggFn = (skcRows: RawRow[]) => {
    const map = new Map<string, RawRow[]>();
    for (const r of skcRows) {
      const skc = String(r["skc"]);
      if (!map.has(skc)) map.set(skc, []);
      map.get(skc)!.push(r);
    }
    return Array.from(map.entries())
      .map(([skc, rs]) => {
        const m = compute(aggRows(rs));
        const r0 = rs[0];
        const days = n(r0["在架天数"]);
        return {
          skc,
          imageUrl: imgMap.get(skc) ?? null,
          category: r0["second_category"],
          firstSecondColor: r0["首复色"] ?? null,
          onShelfDays: days,
          firstListDate: r0["首次上架日期"],
          isNew: (() => { const f = String(r0["月度新老品"] ?? r0["周度新老品"] ?? ""); return f === "新品" || f === "当月新品"; })(),
          ...m,
        };
      })
      .sort((a, b) => b.sales - a.sales);
  };

  const allSkcs = skcAggFn(curRows);
  // Build prev week SKC map for WoW comparison
  const prevSkcMap = new Map(skcAggFn(prevRows).map((s) => [s.skc, s]));

  // Attach wow (prev week) *Chg fields to each SKC
  const withWow = allSkcs.map((s) => {
    const p = prevSkcMap.get(s.skc);
    return {
      ...s,
      salesChg: chg(s.sales, p?.sales ?? null),
      qtyChg: chg(s.qty, p?.qty ?? null),
      exposureChg: chg(s.exposure, p?.exposure ?? null),
      uvChg: chg(s.uv, p?.uv ?? null),
      ctrChg: chg(s.ctr, p?.ctr ?? null),
      cvrChg: chg(s.cvr, p?.cvr ?? null),
      uvOutputChg: chg(s.uvOutput, p?.uvOutput ?? null),
      addCartRateChg: chg(s.addCartRate, p?.addCartRate ?? null),
      avgPriceChg: chg(s.avgPrice, p?.avgPrice ?? null),
      exposureOutputChg: chg(s.exposureOutput, p?.exposureOutput ?? null),
    };
  });

  // Build result: for each range, new top15 + old top15
  const result = SHELF_RANGES.map(({ key, label, min, max }) => {
    const inRange = withWow.filter((s) => {
      const d = s.onShelfDays ?? 0;
      return d >= min && d <= max;
    });
    const newItems = inRange.filter((s) => s.isNew).slice(0, 15);
    const oldItems = inRange.filter((s) => !s.isNew).slice(0, 15);
    return { key, label, newTop15: newItems, oldTop15: oldItems };
  });

  return { weeks: { cur, prev }, ranges: result };
}

// ─── 9. Available countries ──────────────────────────────────────────────────
export async function getAvailableCountries(forceRefresh = false): Promise<string[]> {
  const rows = await fetchSheet(GID.category, forceRefresh);
  const countries = Array.from(new Set(rows.map((r) => String(r["country"] ?? "")).filter(Boolean))).sort();
  return countries.length ? countries : ["UK"];
}

// ─── 10. Key SKC module (skc_labels driven) ─────────────────────────────────
export interface KeySkcItem {
  skc: string;
  imageUrl: string | null;
  category: string | null;
  firstSecondColor: string | null;
  onShelfDays: number;
  // cur week metrics
  sales: number;
  qty: number;
  exposure: number;
  uv: number;
  addCart: number;
  ctr: number | null;
  cvr: number | null;
  uvOutput: number | null;
  addCartRate: number | null;
  avgPrice: number | null;
  exposureOutput: number | null;
  // comparison (prev week for test group, yoy for 26H1捞回款, prev for others)
  cmpSales: number | null;
  cmpQty: number | null;
  cmpExposure: number | null;
  cmpUv: number | null;
  cmpCtr: number | null;
  cmpCvr: number | null;
  cmpUvOutput: number | null;
  cmpAddCartRate: number | null;
  cmpAvgPrice: number | null;
  cmpExposureOutput: number | null;
  // change rates
  salesChg: number | null;
  qtyChg: number | null;
  exposureChg: number | null;
  uvChg: number | null;
  ctrChg: number | null;
  cvrChg: number | null;
  uvOutputChg: number | null;
  addCartRateChg: number | null;
  avgPriceChg: number | null;
  exposureOutputChg: number | null;
}

export interface KeySkcSummary {
  // Aggregated totals for all SKCs in this label group
  sales: number; cmpSales: number | null; salesChg: number | null;
  qty: number; cmpQty: number | null; qtyChg: number | null;
  exposure: number; cmpExposure: number | null; exposureChg: number | null;
  uv: number; cmpUv: number | null; uvChg: number | null;
  ctr: number | null; cmpCtr: number | null; ctrChg: number | null;
  cvr: number | null; cmpCvr: number | null; cvrChg: number | null;
  uvOutput: number | null; cmpUvOutput: number | null; uvOutputChg: number | null;
  addCartRate: number | null; cmpAddCartRate: number | null; addCartRateChg: number | null;
  avgPrice: number | null; cmpAvgPrice: number | null; avgPriceChg: number | null;
  exposureOutput: number | null; cmpExposureOutput: number | null; exposureOutputChg: number | null;
  skcCount: number; // total SKC count in this label
  salesShare: number | null;    // label total sales / multi-category total sales (cur)
  cmpSalesShare: number | null; // same for comparison period
  salesShareChg: number | null; // difference (cur - cmp), not ratio
}

export interface KeySkcLabelGroup {
  label: string; // dynamic, from sheet
  cmpType: "wow" | "yoy" | "both";
  summary: KeySkcSummary; // aggregated totals
  summaryYoy?: KeySkcSummary; // only when cmpType === "both"
  items: KeySkcItem[]; // top 15 by sales
  itemsYoy?: KeySkcItem[]; // only when cmpType === "both"
}

export async function getKeySkcData(country: string, forceRefresh = false, period?: string): Promise<{
  weeks: { cur: string; prev: string; yoy: string };
  labels: KeySkcLabelGroup[];
}> {
  const [skcRows, labelRows, imgMap] = await Promise.all([
    fetchSheet(GID.skc, forceRefresh),
    fetchSheet(GID.skcLabels, forceRefresh),
    fetchImageMap(forceRefresh),
  ]);

  const { cur, prev, yoy } = detectWeeks(skcRows);

  // Build label → [{ skc, note, cmpType }] map from skc_labels sheet (dynamic, no preset)
  const labelOrder: string[] = []; // preserve insertion order
  const labelMap = new Map<string, Array<{ skc: string; cmpType: "wow" | "yoy" | "both" }>>();
  for (const r of labelRows) {
    const skc = String(r["skc"] ?? "").trim();
    const label = String(r["label"] ?? "").trim();
    const rawCmpType = String(r["cmp_type"] ?? "wow").trim().toLowerCase();
    const cmpType: "wow" | "yoy" | "both" =
      rawCmpType === "yoy" ? "yoy" : rawCmpType === "both" ? "both" : "wow";
    if (!skc || !label) continue;
    if (!labelMap.has(label)) {
      labelMap.set(label, []);
      labelOrder.push(label);
    }
    labelMap.get(label)!.push({ skc, cmpType });
  }

  // Filter SKC rows by country
  const countryFilter = (r: RawRow) =>
    !country || !r["country"] || String(r["country"]).toUpperCase() === country.toUpperCase();

  // Aggregate SKC rows for a given week
  const aggBySkcForWeek = (week: string): Map<string, { metrics: ComputedMetrics; r0: RawRow }> => {
    const weekRows = skcRows.filter((r) => String(r["business_year_and_week"]) === week && countryFilter(r));
    const map = new Map<string, RawRow[]>();
    for (const r of weekRows) {
      const skc = String(r["skc"] ?? "").trim();
      if (!skc) continue;
      if (!map.has(skc)) map.set(skc, []);
      map.get(skc)!.push(r);
    }
    const result = new Map<string, { metrics: ComputedMetrics; r0: RawRow }>();
    for (const [skc, rs] of Array.from(map.entries())) {
      result.set(skc, { metrics: compute(aggRows(rs)), r0: rs[0] });
    }
    return result;
  };

  const curMap = aggBySkcForWeek(cur);
  const prevMap = aggBySkcForWeek(prev);
  const yoyMap = aggBySkcForWeek(yoy);

  // Compute multi-category (non-swimwear) total sales for each week (for salesShare calculation)
  const SWIMWEAR_CATS = ["泳衣", "泳装"];
  const multiSales = (week: string): number => {
    const rows = skcRows.filter((r) => String(r["business_year_and_week"]) === week && countryFilter(r));
    // Exclude swimwear - same logic as getSalesData (uses second_category)
    const nonSwim = rows.filter((r) => !SWIMWEAR_CATS.includes(String(r["second_category"] ?? "").trim()));
    return nonSwim.reduce((s, r) => s + n(r["销售额"]), 0);
  };
  const curMultiSales = multiSales(cur);
  const prevMultiSales = multiSales(prev);
  const yoyMultiSales = multiSales(yoy);

  // Build aggregated summary for a list of SKCs
  const buildSummary = (
    skcList: Array<{ skc: string; cmpType: string }>,
    cmpMap: Map<string, { metrics: ComputedMetrics; r0: RawRow }>,
    cmpMultiSales: number
  ): KeySkcSummary => {
    let sales = 0, qty = 0, exposure = 0, uv = 0, addCart = 0, collectionClick = 0, checkout = 0;
    let cmpSales = 0, cmpQty = 0, cmpExposure = 0, cmpUv = 0, cmpAddCart = 0, cmpCollectionClick = 0, cmpCheckout = 0;
    let hasCmp = false;
    for (const { skc } of skcList) {
      const curEntry = curMap.get(skc);
      if (!curEntry) continue;
      const { metrics: cm } = curEntry;
      sales += cm.sales; qty += cm.qty; exposure += cm.exposure; uv += cm.uv;
      addCart += cm.addCart; collectionClick += cm.collectionClick; checkout += cm.checkout;
      const cmpEntry = cmpMap.get(skc);
      if (cmpEntry) {
        hasCmp = true;
        const pm = cmpEntry.metrics;
        cmpSales += pm.sales; cmpQty += pm.qty; cmpExposure += pm.exposure; cmpUv += pm.uv;
        cmpAddCart += pm.addCart; cmpCollectionClick += pm.collectionClick; cmpCheckout += pm.checkout;
      }
    }
    const cmpSalesN = hasCmp ? cmpSales : null;
    const cmpQtyN = hasCmp ? cmpQty : null;
    const cmpExposureN = hasCmp ? cmpExposure : null;
    const cmpUvN = hasCmp ? cmpUv : null;
    const cmpAddCartN = hasCmp ? cmpAddCart : null;
    const curMetrics = compute({ sales, qty, exposure, uv, addCart, collectionClick, checkout });
    const cmpMetrics = hasCmp ? compute({ sales: cmpSales, qty: cmpQty, exposure: cmpExposure, uv: cmpUv, addCart: cmpAddCart, collectionClick: cmpCollectionClick, checkout: cmpCheckout }) : null;
    return {
      sales, cmpSales: cmpSalesN, salesChg: chg(sales, cmpSalesN),
      qty, cmpQty: cmpQtyN, qtyChg: chg(qty, cmpQtyN),
      exposure, cmpExposure: cmpExposureN, exposureChg: chg(exposure, cmpExposureN),
      uv, cmpUv: cmpUvN, uvChg: chg(uv, cmpUvN),
      ctr: curMetrics.ctr, cmpCtr: cmpMetrics?.ctr ?? null, ctrChg: chg(curMetrics.ctr, cmpMetrics?.ctr ?? null),
      cvr: curMetrics.cvr, cmpCvr: cmpMetrics?.cvr ?? null, cvrChg: chg(curMetrics.cvr, cmpMetrics?.cvr ?? null),
      uvOutput: curMetrics.uvOutput, cmpUvOutput: cmpMetrics?.uvOutput ?? null, uvOutputChg: chg(curMetrics.uvOutput, cmpMetrics?.uvOutput ?? null),
      addCartRate: curMetrics.addCartRate, cmpAddCartRate: cmpMetrics?.addCartRate ?? null, addCartRateChg: chg(curMetrics.addCartRate, cmpMetrics?.addCartRate ?? null),
      avgPrice: curMetrics.avgPrice, cmpAvgPrice: cmpMetrics?.avgPrice ?? null, avgPriceChg: chg(curMetrics.avgPrice, cmpMetrics?.avgPrice ?? null),
      exposureOutput: curMetrics.exposureOutput, cmpExposureOutput: cmpMetrics?.exposureOutput ?? null, exposureOutputChg: chg(curMetrics.exposureOutput, cmpMetrics?.exposureOutput ?? null),
      skcCount: skcList.filter(({ skc }) => curMap.has(skc)).length,
      salesShare: curMultiSales ? sales / curMultiSales : null,
      cmpSalesShare: (hasCmp && cmpMultiSales) ? cmpSales / cmpMultiSales : null,
      salesShareChg: (curMultiSales && hasCmp && cmpMultiSales)
        ? (sales / curMultiSales) - (cmpSales / cmpMultiSales)
        : null,
    };
  };

  const buildItems = (
    skcList: Array<{ skc: string; cmpType: string }>,
    cmpMap: Map<string, { metrics: ComputedMetrics; r0: RawRow }>,
    sortByCmp = false // when true, sort by cmp period sales (for yoy-only Top15)
  ): KeySkcItem[] => {
    const items: KeySkcItem[] = [];
    for (const { skc } of skcList) {
      const curEntry = curMap.get(skc);
      const cmpEntry = cmpMap.get(skc);
      // For sortByCmp mode, allow SKCs that only exist in cmp period
      if (!curEntry && !cmpEntry) continue;
      const cm = curEntry?.metrics ?? null;
      const r0 = curEntry?.r0 ?? cmpEntry?.r0; // fallback to cmp row for metadata
      if (!r0) continue;
      const pm = cmpEntry?.metrics ?? null;

      items.push({
        skc,
        imageUrl: imgMap.get(skc) ?? null,
        category: r0["second_category"] ? String(r0["second_category"]) : null,
        firstSecondColor: r0["首复色"] ? String(r0["首复色"]) : null,
        onShelfDays: n(r0["在架天数"]),
        sales: cm?.sales ?? 0,
        qty: cm?.qty ?? 0,
        exposure: cm?.exposure ?? 0,
        uv: cm?.uv ?? 0,
        addCart: cm?.addCart ?? 0,
        ctr: cm?.ctr ?? null,
        cvr: cm?.cvr ?? null,
        uvOutput: cm?.uvOutput ?? null,
        addCartRate: cm?.addCartRate ?? null,
        avgPrice: cm?.avgPrice ?? null,
        exposureOutput: cm?.exposureOutput ?? null,
        cmpSales: pm?.sales ?? null,
        cmpQty: pm?.qty ?? null,
        cmpExposure: pm?.exposure ?? null,
        cmpUv: pm?.uv ?? null,
        cmpCtr: pm?.ctr ?? null,
        cmpCvr: pm?.cvr ?? null,
        cmpUvOutput: pm?.uvOutput ?? null,
        cmpAddCartRate: pm?.addCartRate ?? null,
        cmpAvgPrice: pm?.avgPrice ?? null,
        cmpExposureOutput: pm?.exposureOutput ?? null,
        salesChg: chg(cm?.sales ?? null, pm?.sales ?? null),
        qtyChg: chg(cm?.qty ?? null, pm?.qty ?? null),
        exposureChg: chg(cm?.exposure ?? null, pm?.exposure ?? null),
        uvChg: chg(cm?.uv ?? null, pm?.uv ?? null),
        ctrChg: chg(cm?.ctr ?? null, pm?.ctr ?? null),
        cvrChg: chg(cm?.cvr ?? null, pm?.cvr ?? null),
        uvOutputChg: chg(cm?.uvOutput ?? null, pm?.uvOutput ?? null),
        addCartRateChg: chg(cm?.addCartRate ?? null, pm?.addCartRate ?? null),
        avgPriceChg: chg(cm?.avgPrice ?? null, pm?.avgPrice ?? null),
        exposureOutputChg: chg(cm?.exposureOutput ?? null, pm?.exposureOutput ?? null),
      });
    }
    // Sort by cmp period sales (yoy Top15) or current sales (default), take top 15
    if (sortByCmp) {
      // For yoy Top15: only include SKCs that have data in the comparison period (yoy week).
      // SKCs that didn't exist last year (cmpSales is null) are excluded entirely,
      // because the purpose of yoy Top15 is "how are last year's top sellers doing this year".
      return items
        .filter((item) => item.cmpSales !== null && item.cmpSales > 0)
        .sort((a, b) => (b.cmpSales ?? 0) - (a.cmpSales ?? 0))
        .slice(0, 15);
    }
    return items.sort((a, b) => b.sales - a.sales).slice(0, 15);
  };

  // Build label groups dynamically from sheet order
  const labels: KeySkcLabelGroup[] = [];
  for (const labelKey of labelOrder) {
    const skcList = labelMap.get(labelKey) ?? [];
    // All SKCs in a label share the same cmp_type (use first entry's value)
    const cmpType = skcList[0]?.cmpType ?? "wow";

    if (cmpType === "both") {
      // Build both wow and yoy
      labels.push({
        label: labelKey,
        cmpType: "both",
        summary: buildSummary(skcList, prevMap, prevMultiSales),
        summaryYoy: buildSummary(skcList, yoyMap, yoyMultiSales),
        items: buildItems(skcList, prevMap),
        itemsYoy: buildItems(skcList, yoyMap, true), // sort by yoy (cmp) sales for yoy Top15
      });
    } else {
      const cmpMap = cmpType === "yoy" ? yoyMap : prevMap;
      labels.push({
        label: labelKey,
        cmpType,
        summary: buildSummary(skcList, cmpMap, cmpType === "yoy" ? yoyMultiSales : prevMultiSales),
        items: buildItems(skcList, cmpMap),
      });
    }
  }

  return { weeks: { cur, prev, yoy }, labels };
}
