/**
 * 从数据库读取月度 SKC 数据，返回与 Google Sheets fetchSheet 相同的 RawRow 格式
 * 列名与 SKC 基础数据表（周度）完全对齐，方便 sheetsData.ts 中的函数直接复用
 */
import mysql from "mysql2/promise";
import type { RawRow } from "./sheetsData";

let _conn: mysql.Connection | null = null;

async function getConn(): Promise<mysql.Connection> {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL not set");
  // 每次创建新连接（避免连接超时问题）
  return mysql.createConnection(url);
}

// 内存缓存，避免同一请求内重复查询
let _cache: { data: RawRow[]; ts: number } | null = null;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export function clearMonthlyDbCache() {
  _cache = null;
}

export async function fetchMonthlyFromDb(forceRefresh = false): Promise<RawRow[]> {
  const now = Date.now();
  if (!forceRefresh && _cache && now - _cache.ts < CACHE_TTL) {
    return _cache.data;
  }

  const conn = await getConn();
  try {
    const [rows] = await conn.execute(
      `SELECT
        country,
        business_year_and_week,
        skc,
        second_category,
        third_category,
        first_list_date,
        occasion,
        first_second_color,
        sales,
        qty,
        collection_exposure,
        collection_click,
        pdp_exposure,
        add_cart,
        checkout,
        on_shelf_days,
        on_shelf_range,
        new_old_flag
       FROM \`skc_monthly_data\`
       ORDER BY business_year_and_week, country, skc`
    ) as [Array<Record<string, unknown>>, unknown];

    // 将数据库列名映射回 Google Sheets 列名（与 aggRows 函数期望的字段名一致）
    const result: RawRow[] = (rows as Array<Record<string, unknown>>).map((r) => ({
      "country": r["country"] as string,
      "business_year_and_week": r["business_year_and_week"] as string,
      "skc": r["skc"] as string,
      "second_category": r["second_category"] as string | null,
      "third_category": r["third_category"] as string | null,
      "首次上架日期": r["first_list_date"] as string | null,
      "场合": r["occasion"] as string | null,
      "首复色": r["first_second_color"] as string | null,
      "销售额": r["sales"] as number | null,
      "销量": r["qty"] as number | null,
      // 同时提供两种字段名（兼容 aggRows 中的 ?? 写法）
      "Collection页面商品曝光用户数": r["collection_exposure"] as number | null,
      "Collection曝光用户数": r["collection_exposure"] as number | null,
      "Collection页面商品点击用户数": r["collection_click"] as number | null,
      "Collection点击用户数": r["collection_click"] as number | null,
      "PDP页面曝光用户数": r["pdp_exposure"] as number | null,
      "PDP曝光用户数": r["pdp_exposure"] as number | null,
      "PDP页面加车按钮点击用户数": r["add_cart"] as number | null,
      "加车按钮点击用户数": r["add_cart"] as number | null,
      "Checkout按钮点击用户数": r["checkout"] as number | null,
      "Checkout点击用户数": r["checkout"] as number | null,
      "在架天数": r["on_shelf_days"] as number | null,
      "在架天数区间": r["on_shelf_range"] as string | null,
      "周度新老品": r["new_old_flag"] as string | null,
    }));

    _cache = { data: result, ts: now };
    return result;
  } finally {
    await conn.end();
  }
}

/** 获取数据库中已有的月度周期列表 */
export async function getMonthlyPeriodsFromDb(): Promise<string[]> {
  const conn = await getConn();
  try {
    const [rows] = await conn.execute(
      "SELECT DISTINCT business_year_and_week FROM `skc_monthly_data` ORDER BY business_year_and_week DESC"
    ) as [Array<{ business_year_and_week: string }>, unknown];
    return (rows as Array<{ business_year_and_week: string }>).map((r) => r["business_year_and_week"]);
  } finally {
    await conn.end();
  }
}
