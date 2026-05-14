import React from "react";
import { fmtMoney, fmtNum, fmtPct, fmtRate } from "@/lib/format";

interface Summary {
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
  skcCount: number;
  salesShare?: number | null;
  cmpSalesShare?: number | null;
  salesShareChg?: number | null;
}

interface Props {
  label: string;
  summary: Summary;
  curWeek: string;
  cmpWeek: string;
  cmpLabel: string; // "环比" or "同比"
}

function Chg({ val }: { val: number | null | undefined }) {
  if (val == null) return <span className="text-gray-400">-</span>;
  const pct = (val * 100).toFixed(1);
  const isPos = val > 0;
  const isNeg = val < 0;
  return (
    <span className={`font-bold text-xs ${isPos ? "text-red-600" : isNeg ? "text-green-600" : "text-gray-500"}`}>
      {isPos ? "+" : ""}{pct}%
    </span>
  );
}

// For share diff: display as percentage points (pp), e.g. +1.2pp
function ShareChg({ val }: { val: number | null | undefined }) {
  if (val == null) return <span className="text-gray-400">-</span>;
  const pp = (val * 100).toFixed(2);
  const isPos = val > 0;
  const isNeg = val < 0;
  return (
    <span className={`font-bold text-xs ${isPos ? "text-red-600" : isNeg ? "text-green-600" : "text-gray-500"}`}>
      {isPos ? "+" : ""}{pp}%
    </span>
  );
}

type MetricDef = {
  label: string;
  cur: (s: Summary) => React.ReactNode;
  cmp: (s: Summary) => React.ReactNode;
  chg: (s: Summary) => React.ReactNode;
};

const METRICS: MetricDef[] = [
  { label: "销售额", cur: s => fmtMoney(s.sales), cmp: s => fmtMoney(s.cmpSales), chg: s => <Chg val={s.salesChg} /> },
  {
    label: "销售占比（多品类）",
    cur: s => s.salesShare != null ? (s.salesShare * 100).toFixed(2) + "%" : "-",
    cmp: s => s.cmpSalesShare != null ? (s.cmpSalesShare * 100).toFixed(2) + "%" : "-",
    chg: s => <ShareChg val={s.salesShareChg} />,
  },
  { label: "单价", cur: s => fmtMoney(s.avgPrice, 2), cmp: s => fmtMoney(s.cmpAvgPrice, 2), chg: s => <Chg val={s.avgPriceChg} /> },
  { label: "销量", cur: s => fmtNum(s.qty), cmp: s => fmtNum(s.cmpQty), chg: s => <Chg val={s.qtyChg} /> },
  { label: "曝光", cur: s => fmtNum(s.exposure), cmp: s => fmtNum(s.cmpExposure), chg: s => <Chg val={s.exposureChg} /> },
  { label: "千次曝光产出", cur: s => s.exposureOutput != null ? s.exposureOutput.toFixed(1) : "-", cmp: s => s.cmpExposureOutput != null ? s.cmpExposureOutput.toFixed(1) : "-", chg: s => <Chg val={s.exposureOutputChg} /> },
  { label: "UV", cur: s => fmtNum(s.uv), cmp: s => fmtNum(s.cmpUv), chg: s => <Chg val={s.uvChg} /> },
  { label: "CTR", cur: s => fmtPct(s.ctr, 2), cmp: s => fmtPct(s.cmpCtr, 2), chg: s => <Chg val={s.ctrChg} /> },
  { label: "CVR", cur: s => fmtPct(s.cvr, 2), cmp: s => fmtPct(s.cmpCvr, 2), chg: s => <Chg val={s.cvrChg} /> },
  { label: "UV产出", cur: s => fmtRate(s.uvOutput, 2), cmp: s => fmtRate(s.cmpUvOutput, 2), chg: s => <Chg val={s.uvOutputChg} /> },
  { label: "加车率", cur: s => fmtPct(s.addCartRate, 2), cmp: s => fmtPct(s.cmpAddCartRate, 2), chg: s => <Chg val={s.addCartRateChg} /> },
];

export function KeySkcSummaryRow({ label, summary, curWeek, cmpWeek, cmpLabel }: Props) {
  return (
    <div className="rounded-lg border border-[oklch(0.85_0_0)] bg-[oklch(0.97_0_0)] overflow-x-auto mb-4">
      {/* Header */}
      <div className="flex items-center gap-3 px-3 py-2 border-b border-[oklch(0.88_0_0)] bg-[oklch(0.93_0_0)]">
        <span className="font-semibold text-xs text-gray-700">{label} 整体汇总</span>
        <span className="text-[10px] text-gray-500">共 {summary.skcCount} 个 SKC</span>
        <span className="text-[10px] text-gray-700 font-semibold ml-auto">{curWeek} vs {cmpWeek}（{cmpLabel}）</span>
      </div>
      {/* Metrics grid */}
      <div className="grid grid-cols-5 gap-0 divide-x divide-[oklch(0.88_0_0)]">
        {METRICS.map(({ label: mLabel, cur, cmp, chg }) => (
          <div key={mLabel} className="px-3 py-2 flex flex-col gap-0.5">
            <span className="text-[10px] text-gray-500 font-medium">{mLabel}</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-sm font-bold text-gray-950">{cur(summary)}</span>
              <span className="text-[10px] text-gray-600 font-medium">{cmp(summary)}</span>
            </div>
            <div className="text-[11px]">{chg(summary)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
