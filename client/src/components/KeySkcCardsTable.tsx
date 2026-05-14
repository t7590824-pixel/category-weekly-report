import React from "react";
import { fmtMoney, fmtNum, fmtPct, fmtRate } from "@/lib/format";

interface KeySkcItem {
  skc: string;
  imageUrl?: string | null;
  category?: string | null;
  firstSecondColor?: string | null;
  onShelfDays?: number | null;
  sales: number;
  qty: number;
  exposure: number;
  uv: number;
  ctr: number | null;
  cvr: number | null;
  uvOutput: number | null;
  addCartRate: number | null;
  avgPrice: number | null;
  exposureOutput: number | null;
  cmpSales?: number | null;
  cmpQty?: number | null;
  cmpExposure?: number | null;
  cmpUv?: number | null;
  cmpCtr?: number | null;
  cmpCvr?: number | null;
  cmpUvOutput?: number | null;
  cmpAddCartRate?: number | null;
  cmpAvgPrice?: number | null;
  cmpExposureOutput?: number | null;
  salesChg?: number | null;
  qtyChg?: number | null;
  exposureChg?: number | null;
  uvChg?: number | null;
  ctrChg?: number | null;
  cvrChg?: number | null;
  uvOutputChg?: number | null;
  addCartRateChg?: number | null;
  avgPriceChg?: number | null;
  exposureOutputChg?: number | null;
}

interface Props {
  label: string;
  items: KeySkcItem[];
  curWeek: string;
  cmpWeek: string;
  cmpType: "wow" | "yoy";
  /** Whether to show the comparison period column (default: true) */
  showCmpCol?: boolean;
  /** Whether to show the change rate column (default: true) */
  showChg?: boolean;
  /**
   * When true, the main (first) data column shows the CMP period values instead of CUR.
   * Used for yoy-only display where we want to show last year's data as the primary column.
   */
  showCmpAsMain?: boolean;
}

function ChgBadge({ val }: { val: number | null | undefined }) {
  if (val == null) return <span className="text-gray-400">-</span>;
  const pct = (val * 100).toFixed(1);
  const isPos = val > 0;
  const isNeg = val < 0;
  return (
    <span className={`font-semibold ${isPos ? "text-red-600" : isNeg ? "text-green-600" : "text-gray-500"}`}>
      {isPos ? "+" : ""}{pct}%
    </span>
  );
}

type RowDef = {
  label: string;
  cur: (it: KeySkcItem) => React.ReactNode;
  cmp: (it: KeySkcItem) => React.ReactNode;
  chg: (it: KeySkcItem) => React.ReactNode;
};

const ROWS: RowDef[] = [
  { label: "销售额", cur: (it) => <>{fmtMoney(it.sales)}</>, cmp: (it) => <>{fmtMoney(it.cmpSales)}</>, chg: (it) => <ChgBadge val={it.salesChg} /> },
  { label: "单价", cur: (it) => <>{fmtMoney(it.avgPrice, 2)}</>, cmp: (it) => <>{fmtMoney(it.cmpAvgPrice, 2)}</>, chg: (it) => <ChgBadge val={it.avgPriceChg} /> },
  { label: "销量", cur: (it) => <>{fmtNum(it.qty)}</>, cmp: (it) => <>{fmtNum(it.cmpQty)}</>, chg: (it) => <ChgBadge val={it.qtyChg} /> },
  { label: "曝光", cur: (it) => <>{fmtNum(it.exposure)}</>, cmp: (it) => <>{fmtNum(it.cmpExposure)}</>, chg: (it) => <ChgBadge val={it.exposureChg} /> },
  { label: "千次曝光产出", cur: (it) => <>{it.exposureOutput != null ? it.exposureOutput.toFixed(1) : "-"}</>, cmp: (it) => <>{it.cmpExposureOutput != null ? it.cmpExposureOutput.toFixed(1) : "-"}</>, chg: (it) => <ChgBadge val={it.exposureOutputChg} /> },
  { label: "UV", cur: (it) => <>{fmtNum(it.uv)}</>, cmp: (it) => <>{fmtNum(it.cmpUv)}</>, chg: (it) => <ChgBadge val={it.uvChg} /> },
  { label: "CTR", cur: (it) => <>{fmtPct(it.ctr, 2)}</>, cmp: (it) => <>{fmtPct(it.cmpCtr, 2)}</>, chg: (it) => <ChgBadge val={it.ctrChg} /> },
  { label: "CVR", cur: (it) => <>{fmtPct(it.cvr, 2)}</>, cmp: (it) => <>{fmtPct(it.cmpCvr, 2)}</>, chg: (it) => <ChgBadge val={it.cvrChg} /> },
  { label: "UV产出", cur: (it) => <>{fmtRate(it.uvOutput, 2)}</>, cmp: (it) => <>{fmtRate(it.cmpUvOutput, 2)}</>, chg: (it) => <ChgBadge val={it.uvOutputChg} /> },
  { label: "加车率", cur: (it) => <>{fmtPct(it.addCartRate, 2)}</>, cmp: (it) => <>{fmtPct(it.cmpAddCartRate, 2)}</>, chg: (it) => <ChgBadge val={it.addCartRateChg} /> },
];

const INFO_ROWS: { label: string; render: (it: KeySkcItem) => React.ReactNode }[] = [
  { label: "skc", render: (it) => <span className="font-mono text-[10px]">{it.skc}</span> },
  { label: "二级品类", render: (it) => <>{String(it.category ?? "-")}</> },
  {
    label: "首复色",
    render: (it) => {
      const val = it.firstSecondColor ?? "-";
      const isFirst = val === "首色";
      const isRepeat = val === "复色";
      return (
        <span className={`inline-block px-1 rounded text-[10px] font-semibold ${isFirst ? "bg-orange-100 text-orange-700 border border-orange-300" : isRepeat ? "bg-blue-100 text-blue-700 border border-blue-300" : "text-gray-500"}`}>
          {val}
        </span>
      );
    },
  },
  { label: "上架天数", render: (it) => <>{it.onShelfDays != null ? `${it.onShelfDays}天` : "-"}</> },
];

export function KeySkcCardsTable({
  label, items, curWeek, cmpWeek, cmpType,
  showCmpCol = true,
  showChg = true,
  showCmpAsMain = false,
}: Props) {
  if (!items || !items.length) {
    return <div className="text-xs text-muted-foreground py-2">暂无数据（该标签下本周无 SKC 数据）</div>;
  }

  const cmpLabel = cmpType === "yoy" ? "同比" : "环比";

  // Determine grid columns for metric cells
  const colCount = 1 + (showCmpCol ? 1 : 0) + (showChg ? 1 : 0);
  const gridCols = colCount === 3 ? "grid-cols-3" : colCount === 2 ? "grid-cols-2" : "grid-cols-1";

  // When showCmpAsMain=true, the primary column shows cmp data (e.g. last year's week for yoy Top15)
  const primaryWeekLabel = showCmpAsMain ? cmpWeek : curWeek;
  const secondaryWeekLabel = showCmpAsMain ? curWeek : cmpWeek;

  return (
    <div className="w-full">
      <div className="subsec-title">
        {label}
      </div>
      <div className="overflow-x-auto">
        <table
          className="border-collapse text-[11px] text-foreground"
          style={{ minWidth: items.length * 110 + 140 }}
        >
          <thead>
            {/* Image row */}
            <tr>
              <th
                className="sticky left-0 z-10 bg-[oklch(0.92_0_0)] text-gray-700 text-[10px] font-semibold px-2 py-1 text-left border border-[oklch(0.85_0_0)] whitespace-nowrap"
                style={{ minWidth: 90 }}
              >
                {label}（Top {items.length}）
              </th>
              {items.map((item, i) => (
                <td
                  key={item.skc}
                  className="border border-[oklch(0.85_0_0)] p-0 align-bottom bg-[oklch(0.97_0_0)]"
                  style={{ minWidth: 110, maxWidth: 140 }}
                >
                  {item.imageUrl ? (
                    <a href={item.imageUrl} target="_blank" rel="noopener noreferrer">
                      <img
                        src={item.imageUrl}
                        alt={item.skc}
                        className="w-full object-cover"
                        style={{ height: 180, display: "block" }}
                        onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                      />
                    </a>
                  ) : (
                    <div className="flex items-center justify-center text-gray-400 bg-[oklch(0.95_0_0)]" style={{ height: 130, fontSize: 10 }}>
                      #{i + 1}
                    </div>
                  )}
                </td>
              ))}
            </tr>
          </thead>
          <tbody>
            {/* Info rows */}
            {INFO_ROWS.map(({ label: rowLabel, render }) => (
              <tr key={rowLabel} className="hover:bg-[oklch(0.93_0_0)]">
                <td className="sticky left-0 z-10 bg-[oklch(0.92_0_0)] text-gray-700 text-[10px] font-semibold px-2 py-[3px] border border-[oklch(0.85_0_0)] whitespace-nowrap" style={{ minWidth: 90 }}>
                  {rowLabel}
                </td>
                {items.map((item) => (
                  <td key={item.skc} className="border border-[oklch(0.85_0_0)] px-1 py-[3px] text-center align-middle text-gray-800 bg-white">
                    {render(item)}
                  </td>
                ))}
              </tr>
            ))}

            {/* Metric header row */}
            <tr className="bg-[oklch(0.90_0_0)]">
              <td className="sticky left-0 z-10 bg-[oklch(0.88_0_0)] text-gray-600 text-[10px] font-semibold px-2 py-[3px] border border-[oklch(0.85_0_0)] whitespace-nowrap" style={{ minWidth: 90 }}>
                指标
              </td>
              {items.map((item) => (
                <td key={item.skc} className="border border-[oklch(0.85_0_0)] px-1 py-[2px] text-center align-middle bg-[oklch(0.90_0_0)]">
                  <div className={`grid ${gridCols} gap-0 text-[9px] text-gray-500 font-semibold`}>
                    <span>{primaryWeekLabel}</span>
                    {showCmpCol && <span>{secondaryWeekLabel}</span>}
                    {showChg && <span>{cmpLabel}</span>}
                  </div>
                </td>
              ))}
            </tr>

            {/* Metric data rows */}
            {ROWS.map(({ label: rowLabel, cur: curRender, cmp: cmpRender, chg: chgRender }) => (
              <tr key={rowLabel} className="hover:bg-[oklch(0.93_0_0)]">
                <td className="sticky left-0 z-10 bg-[oklch(0.92_0_0)] text-gray-700 text-[10px] font-semibold px-2 py-[3px] border border-[oklch(0.85_0_0)] whitespace-nowrap" style={{ minWidth: 90 }}>
                  {rowLabel}
                </td>
                {items.map((item) => (
                  <td key={item.skc} className="border border-[oklch(0.85_0_0)] px-1 py-[3px] align-middle bg-white">
                    <div className={`grid ${gridCols} gap-0 text-center text-[10px]`}>
                      {/* When showCmpAsMain=true: primary column shows cmp data (last year), secondary shows cur */}
                      <span className="text-gray-800">
                        {showCmpAsMain ? cmpRender(item) : curRender(item)}
                      </span>
                      {showCmpCol && (
                        <span className="text-gray-500">
                          {showCmpAsMain ? curRender(item) : cmpRender(item)}
                        </span>
                      )}
                      {showChg && <span>{chgRender(item)}</span>}
                    </div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
