import { fmtMoney, fmtNum, fmtPct, fmtRate } from "@/lib/format";
import React from "react";

interface ComputedMetrics {
  sales: number;
  qty: number;
  exposure: number;
  collectionClick: number;
  uv: number;
  addCart: number;
  checkout: number;
  ctr: number | null;
  cvr: number | null;
  uvOutput: number | null;
  addCartRate: number | null;
  checkoutRate: number | null;
  avgPrice: number | null;
  exposureOutput: number | null;
}

interface SalesCatRow {
  category: string;
  cur: ComputedMetrics;
  cmp: ComputedMetrics;
  salesShare: number | null;
  salesShareCmp?: number | null;
  salesChange: number | null;
}

interface Props {
  label: string;
  curWeek: string;
  cmpWeek: string;
  overall: SalesCatRow;
  multiTotal: SalesCatRow;
  swimRow?: SalesCatRow | null;
  categories: SalesCatRow[];
}

function metricChange(cur: number | null, cmp: number | null) {
  if (cur === null || cmp === null || !cmp) return null;
  return cur / cmp - 1;
}

/** 变化率单元格：+X.X% 加粗红色，-X.X% 加粗绿色 */
function ChgCell({ cur, cmp }: { cur: number | null; cmp: number | null }) {
  const ch = metricChange(cur, cmp);
  if (ch === null) return <td className="val-neutral">-</td>;
  const abs = Math.abs(ch * 100).toFixed(1);
  if (ch > 0.0001) return <td className="val-up"><strong>+{abs}%</strong></td>;
  if (ch < -0.0001) return <td className="val-down"><strong>-{abs}%</strong></td>;
  return <td className="val-neutral">{(ch * 100).toFixed(1)}%</td>;
}

/** 率指标变化（CTR/CVR/加车率/结账率）：用 (cur/cmp)-1，如 2.5%/3%-1=-16.67% */
function RateChgCell({ cur, cmp }: { cur: number | null; cmp: number | null }) {
  if (cur === null || cmp === null || !cmp) return <td className="val-neutral">-</td>;
  const ch = cur / cmp - 1;
  const pct = Math.abs(ch * 100).toFixed(1) + "%";
  if (ch > 0.0001) return <td className="val-up"><strong>+{pct}</strong></td>;
  if (ch < -0.0001) return <td className="val-down"><strong>-{pct}</strong></td>;
  return <td className="val-neutral">{pct}</td>;
}

/** 销售占比变化：统一用 %，加粗着色 */
function ShareChgCell({ cur, cmp }: { cur: number | null; cmp: number | null }) {
  if (cur === null || cmp === null) return <td className="val-neutral">-</td>;
  const diff = cur - cmp;
  const pct = Math.abs(diff * 100).toFixed(1) + "%";
  if (diff > 0.0001) return <td className="val-up"><strong>+{pct}</strong></td>;
  if (diff < -0.0001) return <td className="val-down"><strong>-{pct}</strong></td>;
  return <td className="val-neutral">{(diff * 100).toFixed(1)}%</td>;
}

function DataRow({ row, isTotal, isGrandTotal }: { row: SalesCatRow; isTotal?: boolean; isGrandTotal?: boolean }) {
  const { cur, cmp, category, salesShare, salesShareCmp } = row;
  const trClass = isGrandTotal ? "row-grand-total" : isTotal ? "row-total" : "";

  return (
    <tr className={trClass}>
      <td className="cat-name">{category}</td>
      {/* 销售额 */}
      <td>{fmtMoney(cur.sales)}</td>
      <td>{fmtMoney(cmp.sales)}</td>
      <ChgCell cur={cur.sales} cmp={cmp.sales} />
      {/* 销售占比 */}
      <td>{salesShare !== null && salesShare !== undefined ? fmtPct(salesShare) : "-"}</td>
      <td>{salesShareCmp !== null && salesShareCmp !== undefined ? fmtPct(salesShareCmp) : "-"}</td>
      <ShareChgCell cur={salesShare ?? null} cmp={salesShareCmp ?? null} />
      {/* 销量 */}
      <td>{fmtNum(cur.qty)}</td>
      <td>{fmtNum(cmp.qty)}</td>
      <ChgCell cur={cur.qty} cmp={cmp.qty} />
      {/* 曝光 */}
      <td>{fmtNum(cur.exposure)}</td>
      <td>{fmtNum(cmp.exposure)}</td>
      <ChgCell cur={cur.exposure} cmp={cmp.exposure} />
      {/* 曝光产出 */}
      <td>{fmtRate(cur.exposureOutput, 2)}</td>
      <td>{fmtRate(cmp.exposureOutput, 2)}</td>
      <ChgCell cur={cur.exposureOutput} cmp={cmp.exposureOutput} />
      {/* UV */}
      <td>{fmtNum(cur.uv)}</td>
      <td>{fmtNum(cmp.uv)}</td>
      <ChgCell cur={cur.uv} cmp={cmp.uv} />
      {/* UV产出 */}
      <td>{fmtRate(cur.uvOutput, 2)}</td>
      <td>{fmtRate(cmp.uvOutput, 2)}</td>
      <ChgCell cur={cur.uvOutput} cmp={cmp.uvOutput} />
      {/* CTR */}
      <td>{fmtPct(cur.ctr, 2)}</td>
      <td>{fmtPct(cmp.ctr, 2)}</td>
      <RateChgCell cur={cur.ctr} cmp={cmp.ctr} />
      {/* CVR */}
      <td>{fmtPct(cur.cvr, 2)}</td>
      <td>{fmtPct(cmp.cvr, 2)}</td>
      <RateChgCell cur={cur.cvr} cmp={cmp.cvr} />
      {/* 加车率 */}
      <td>{fmtPct(cur.addCartRate, 2)}</td>
      <td>{fmtPct(cmp.addCartRate, 2)}</td>
      <RateChgCell cur={cur.addCartRate} cmp={cmp.addCartRate} />
      {/* 结账率 */}
      <td>{fmtPct(cur.checkoutRate, 2)}</td>
      <td>{fmtPct(cmp.checkoutRate, 2)}</td>
      <RateChgCell cur={cur.checkoutRate} cmp={cmp.checkoutRate} />
      {/* 销售均价 */}
      <td>{fmtMoney(cur.avgPrice, 2)}</td>
      <td>{fmtMoney(cmp.avgPrice, 2)}</td>
      <ChgCell cur={cur.avgPrice} cmp={cmp.avgPrice} />
    </tr>
  );
}

export function SalesComparisonTable({ label, curWeek, cmpWeek, overall, multiTotal, categories }: Props) {
  const L = label;
  return (
    <div>
      <div className="subsec-title">
        销售{L}（{curWeek} vs {cmpWeek}）
      </div>
      <div className="table-scroll">
        <table className="report-table compact-table">
          <thead>
            <tr>
              <th rowSpan={2} className="cat-name" style={{ textAlign: "left", paddingLeft: 10 }}>二级品类</th>
              <th colSpan={3} className="col-group">销售额</th>
              <th colSpan={3} className="col-group">销售占比</th>
              <th colSpan={3} className="col-group">销量</th>
              <th colSpan={3} className="col-group">曝光</th>
              <th colSpan={3} className="col-group">曝光产出</th>
              <th colSpan={3} className="col-group">UV</th>
              <th colSpan={3} className="col-group">UV产出</th>
              <th colSpan={3} className="col-group">CTR</th>
              <th colSpan={3} className="col-group">CVR(uv)</th>
              <th colSpan={3} className="col-group">加车率</th>
              <th colSpan={3} className="col-group">结账率</th>
              <th colSpan={3} className="col-group">销售均价</th>
            </tr>
            <tr>
              {["销售额","销售占比","销量","曝光","曝光产出","UV","UV产出","CTR","CVR","加车率","结账率","均价"].map((m) => (
                <React.Fragment key={m}>
                  <th className="text-[9px]">{curWeek}</th>
                  <th className="text-[9px] text-muted-foreground">{cmpWeek}</th>
                  <th className="text-[9px]">{L}</th>
                </React.Fragment>
              ))}
            </tr>
          </thead>
          <tbody>
            {categories.map((row) => (
              <DataRow key={row.category} row={row} />
            ))}
            <DataRow row={multiTotal} isTotal />
            <DataRow row={overall} isGrandTotal />
          </tbody>
        </table>
      </div>
    </div>
  );
}
