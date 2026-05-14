import { fmtMoney, fmtNum, fmtPct, fmtRate } from "@/lib/format";

interface SkcItem {
  skc: string;
  imageUrl?: string | null;
  category?: string | null;
  thirdCategory?: string | null;
  firstSecondColor?: string | null;
  occasion?: string | null;
  onShelfDays?: number | null;
  firstListDate?: string | null;
  isNew?: boolean;
  newOldLabel?: string | null;
  sales: number;
  qty: number;
  uv: number;
  uvOutput: number | null;
  ctr: number | null;
  cvr: number | null;
  addCartRate?: number | null;
  checkoutRate?: number | null;
  avgPrice?: number | null;
  exposureOutput?: number | null;
  exposure?: number;
  // wow change rates (optional)
  salesChg?: number | null;
  qtyChg?: number | null;
  uvChg?: number | null;
  exposureChg?: number | null;
  ctrChg?: number | null;
  cvrChg?: number | null;
  uvOutputChg?: number | null;
  avgPriceChg?: number | null;
  exposureOutputChg?: number | null;
  addCartRateChg?: number | null;
}

interface Props {
  label: string;
  items: SkcItem[];
  week: string;
  cmpWeek?: string; // if provided, show wow column
  isMonthly?: boolean; // if true, show firstListDate instead of onShelfDays
  forceWide?: boolean; // force wide column layout even without cmpWeek
}

function fmtChg(v: number | null | undefined): React.ReactNode {
  if (v == null) return <span className="text-gray-400">-</span>;
  const pct = (v * 100).toFixed(1);
  const isPos = v > 0;
  const isNeg = v < 0;
  return (
    <span className={`text-[10px] font-semibold ${isPos ? "text-green-600" : isNeg ? "text-red-500" : "text-gray-500"}`}>
      {isPos ? "+" : ""}{pct}%
    </span>
  );
}

function getHighlightSet(items: SkcItem[], field: keyof SkcItem): Set<string> {
  const sorted = [...items]
    .filter((it) => it[field] != null && (it[field] as number) > 0)
    .sort((a, b) => (b[field] as number) - (a[field] as number));
  return new Set(sorted.slice(0, 3).map((it) => it.skc));
}

type RowDef = {
  label: string;
  render: (item: SkcItem, highlight: boolean) => React.ReactNode;
  chgKey?: keyof SkcItem;
};

// ROWS is now a function to support isMonthly toggle
function buildRows(isMonthly?: boolean): RowDef[] {
  return [
  { label: "skc", render: (it) => <span className="font-mono text-[10px]">{it.skc}</span> },
  { label: "二级品类", render: (it) => <>{String(it.category ?? "-")}</> },
  {
    label: "首复色",
    render: (it) => {
      const val = it.firstSecondColor ?? "-";
      const isFirst = val === "首色";
      const isRepeat = val === "复色";
      return (
        <span
          className={`inline-block px-1 rounded text-[10px] font-semibold ${
            isFirst
              ? "bg-orange-100 text-orange-700 border border-orange-300"
              : isRepeat
              ? "bg-blue-100 text-blue-700 border border-blue-300"
              : "text-gray-500"
          }`}
        >
          {val}
        </span>
      );
    },
  },
  {
    label: "当月新老品",
    render: (it) => {
      const label = it.newOldLabel ?? (it.isNew ? "新品" : it.isNew === false ? "老品" : "-");
      const isNew = it.isNew === true || label === "新品" || label === "当月新品";
      return (
        <span className={`inline-block px-1 rounded text-[10px] font-semibold ${
          isNew ? "bg-green-100 text-green-700 border border-green-300" : "bg-gray-100 text-gray-600 border border-gray-300"
        }`}>
          {label || "-"}
        </span>
      );
    },
  },
  isMonthly
    ? { label: "首次上架时间", render: (it) => <>{it.firstListDate ?? "-"}</> }
    : { label: "上架天数", render: (it) => <>{it.onShelfDays != null ? `${it.onShelfDays}天` : "-"}</> },
  { label: "销售额", render: (it) => <>{fmtMoney(it.sales)}</>, chgKey: "salesChg" },
  { label: "单价", render: (it) => <>{fmtMoney(it.avgPrice, 2)}</>, chgKey: "avgPriceChg" },
  { label: "销量", render: (it) => <>{fmtNum(it.qty)}</>, chgKey: "qtyChg" },
  { label: "曝光", render: (it) => <>{fmtNum(it.exposure)}</>, chgKey: "exposureChg" },
  {
    label: "千次曝光产出",
    render: (it) => {
      const v = it.exposure && it.exposure > 0 ? (it.sales / it.exposure) * 1000 : null;
      return <>{v != null ? v.toFixed(1) : "-"}</>;
    },
    chgKey: "exposureOutputChg",
  },
  { label: "UV", render: (it) => <>{fmtNum(it.uv)}</>, chgKey: "uvChg" },
  { label: "CTR", render: (it) => <>{fmtPct(it.ctr, 2)}</>, chgKey: "ctrChg" },
  { label: "CVR", render: (it) => <>{fmtPct(it.cvr, 2)}</>, chgKey: "cvrChg" },
  {
    label: "UV产出",
    render: (it, hl) => (
      <span className={hl ? "font-bold text-red-600" : ""}>
        {fmtRate(it.uvOutput, 2)}
      </span>
    ),
    chgKey: "uvOutputChg",
  },
  { label: "加车率", render: (it) => <>{fmtPct(it.addCartRate, 2)}</>, chgKey: "addCartRateChg" },
  ];
}

export function BestsellerCardsTable({ label, items, week, cmpWeek, isMonthly, forceWide }: Props) {
  const ROWS = buildRows(isMonthly);
  if (!items || !items.length) {
    return <div className="text-xs text-muted-foreground py-2">暂无数据</div>;
  }

  const uvHighlight = getHighlightSet(items, "uvOutput");
  const showWow = !!cmpWeek;
  const isWide = showWow || !!forceWide;

  return (
    <div className="w-full">
      <div className="subsec-title">{label}</div>
      <div className="overflow-x-auto">
        <table
          className="border-collapse text-[11px] text-foreground"
          style={{ minWidth: items.length * (isWide ? 160 : 110) + 140 }}
        >
          <thead>
            <tr>
              <th
                className="sticky left-0 z-10 bg-[oklch(0.92_0_0)] text-gray-700 text-[10px] font-semibold px-2 py-1 text-left border border-[oklch(0.85_0_0)] whitespace-nowrap"
                style={{ minWidth: 90 }}
              >
                指标
              </th>
              {items.map((item, i) => (
                <td
                  key={item.skc}
                  className="border border-[oklch(0.85_0_0)] p-0 align-bottom bg-[oklch(0.97_0_0)]"
                  style={{ minWidth: isWide ? 160 : 120, maxWidth: isWide ? 200 : 150 }}
                  colSpan={1}
                >
                  {item.imageUrl ? (
                    <a href={item.imageUrl} target="_blank" rel="noopener noreferrer">
                      <img
                        src={item.imageUrl}
                        alt={item.skc}
                        className="w-full object-cover"
                        style={{ height: isWide ? 180 : 180, display: "block", imageRendering: "auto" }}
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none";
                        }}
                      />
                    </a>
                  ) : (
                    <div
                      className="flex items-center justify-center text-gray-400 bg-[oklch(0.95_0_0)]"
                      style={{ height: isWide ? 130 : 130, fontSize: 10 }}
                    >
                      #{i + 1}
                    </div>
                  )}
                </td>
              ))}
            </tr>
            {/* Week header row */}
            <tr>
              <th
                className="sticky left-0 z-10 bg-[oklch(0.92_0_0)] text-gray-700 text-[10px] font-semibold px-2 py-1 text-left border border-[oklch(0.85_0_0)] whitespace-nowrap"
              >
                指标
              </th>
              {items.map((item) => (
                <td
                  key={item.skc}
                  className="border border-[oklch(0.85_0_0)] bg-[oklch(0.95_0_0)] text-center"
                >
                  <div className="flex items-center justify-center gap-1 py-[2px]">
                    <span className="text-[10px] font-semibold text-gray-700">{week}</span>
                    {showWow && !isMonthly && (
                      <span className="text-[10px] text-gray-400">环比</span>
                    )}
                  </div>
                </td>
              ))}
            </tr>
          </thead>
          <tbody>
            {ROWS.map(({ label: rowLabel, render, chgKey }) => (
              <tr key={rowLabel} className="hover:bg-[oklch(0.93_0_0)]">
                <td
                  className="sticky left-0 z-10 bg-[oklch(0.92_0_0)] text-gray-700 text-[10px] font-semibold px-2 py-[3px] border border-[oklch(0.85_0_0)] whitespace-nowrap"
                  style={{ minWidth: 90 }}
                >
                  {rowLabel}
                </td>
                {items.map((item) => {
                  const isUvHl = rowLabel === "UV产出" && uvHighlight.has(item.skc);
                  const chgVal = chgKey ? (item[chgKey] as number | null | undefined) : null;
                  return (
                    <td
                      key={item.skc}
                      className={`border border-[oklch(0.85_0_0)] px-1 py-[3px] text-center align-middle text-gray-800 ${
                        isUvHl ? "bg-red-50" : "bg-white"
                      }`}
                    >
                      {showWow && chgKey ? (
                        <div className="flex items-center justify-center gap-1">
                          <span>{render(item, isUvHl)}</span>
                          {fmtChg(chgVal)}
                        </div>
                      ) : (
                        render(item, isUvHl)
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
