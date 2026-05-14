import { fmtMoney, fmtNum, fmtPct, fmtRate } from "@/lib/format";

interface ComputedMetrics {
  sales: number;
  qty: number;
  exposure: number;
  uv: number;
  ctr: number | null;
  cvr: number | null;
  uvOutput: number | null;
  exposureOutput: number | null;
}

interface PlatformEntry {
  cur: ComputedMetrics;
  cmp: ComputedMetrics;
  share: number | null;
  shareCmp?: number | null;
  uvShare?: number | null;
  uvShareCmp?: number | null;
}

interface Props {
  weeks: { cur: string; prev: string; yoy: string };
  wow: { app: PlatformEntry; web: PlatformEntry };
  yoy: { app: PlatformEntry; web: PlatformEntry };
}

function ChangeCell({ cur, cmp }: { cur: number | null; cmp: number | null }) {
  if (cur === null || cmp === null || !cmp) return <td className="val-neutral">-</td>;
  const ch = cur / cmp - 1;
  const abs = Math.abs(ch * 100).toFixed(1);
  if (ch > 0.0001) return <td className="val-up"><strong>+{abs}%</strong></td>;
  if (ch < -0.0001) return <td className="val-down"><strong>-{abs}%</strong></td>;
  return <td className="val-neutral">{(ch * 100).toFixed(1)}%</td>;
}

function RateChangeCell({ cur, cmp }: { cur: number | null; cmp: number | null }) {
  if (cur === null || cmp === null || !cmp) return <td className="val-neutral">-</td>;
  const ch = cur / cmp - 1;
  const pct = Math.abs(ch * 100).toFixed(1) + "%";
  if (ch > 0.0001) return <td className="val-up"><strong>+{pct}</strong></td>;
  if (ch < -0.0001) return <td className="val-down"><strong>-{pct}</strong></td>;
  return <td className="val-neutral">{pct}</td>;
}

function PlatformRow({ label, entry, chgLabel }: { label: string; entry: PlatformEntry; chgLabel: string }) {
  const { cur, cmp, share, shareCmp, uvShare, uvShareCmp } = entry;
  return (
    <tr>
      <td className="cat-name">{label}</td>
      {/* 销售额 */}
      <td>{fmtMoney(cur.sales)}</td>
      <td className="text-muted-foreground">{fmtMoney(cmp.sales)}</td>
      <ChangeCell cur={cur.sales} cmp={cmp.sales} />
      {/* 销售占比：本期 + 对比期 */}
      <td>{share !== null && share !== undefined ? fmtPct(share) : "-"}</td>
      <td className="text-muted-foreground">{shareCmp !== null && shareCmp !== undefined ? fmtPct(shareCmp) : "-"}</td>
      {/* 曝光 */}
      <td>{fmtNum(cur.exposure)}</td>
      <td className="text-muted-foreground">{fmtNum(cmp.exposure)}</td>
      <ChangeCell cur={cur.exposure} cmp={cmp.exposure} />
      {/* 曝光产出 */}
      <td>{fmtRate(cur.exposureOutput, 4)}</td>
      <td className="text-muted-foreground">{fmtRate(cmp.exposureOutput, 4)}</td>
      <ChangeCell cur={cur.exposureOutput} cmp={cmp.exposureOutput} />
      {/* UV */}
      <td>{fmtNum(cur.uv)}</td>
      <td className="text-muted-foreground">{fmtNum(cmp.uv)}</td>
      <ChangeCell cur={cur.uv} cmp={cmp.uv} />
      {/* UV占比：本期 + 对比期 */}
      <td>{uvShare !== null && uvShare !== undefined ? fmtPct(uvShare) : "-"}</td>
      <td className="text-muted-foreground">{uvShareCmp !== null && uvShareCmp !== undefined ? fmtPct(uvShareCmp) : "-"}</td>
      {/* UV产出 */}
      <td>{fmtRate(cur.uvOutput, 2)}</td>
      <td className="text-muted-foreground">{fmtRate(cmp.uvOutput, 2)}</td>
      <ChangeCell cur={cur.uvOutput} cmp={cmp.uvOutput} />
      {/* CTR */}
      <td>{fmtPct(cur.ctr, 2)}</td>
      <td className="text-muted-foreground">{fmtPct(cmp.ctr, 2)}</td>
      <RateChangeCell cur={cur.ctr} cmp={cmp.ctr} />
      {/* CVR */}
      <td>{fmtPct(cur.cvr, 2)}</td>
      <td className="text-muted-foreground">{fmtPct(cmp.cvr, 2)}</td>
      <RateChangeCell cur={cur.cvr} cmp={cmp.cvr} />
    </tr>
  );
}

function SubTable({
  title,
  curWeek,
  cmpWeek,
  chgLabel,
  app,
  web,
}: {
  title: string;
  curWeek: string;
  cmpWeek: string;
  chgLabel: string;
  app: PlatformEntry;
  web: PlatformEntry;
}) {
  return (
    <div>
      <div className="subsec-title">双端{title}（{curWeek} vs {cmpWeek}）</div>
      <div className="table-scroll">
        <table className="report-table">
          <thead>
            <tr>
              <th rowSpan={2} style={{ textAlign: "left", paddingLeft: 12 }}>端口</th>
              <th colSpan={3} className="col-group">销售额</th>
              <th colSpan={2} className="col-group">销售占比</th>
              <th colSpan={3} className="col-group">曝光</th>
              <th colSpan={3} className="col-group">曝光产出</th>
              <th colSpan={3} className="col-group">UV</th>
              <th colSpan={2} className="col-group">UV占比</th>
              <th colSpan={3} className="col-group">UV产出</th>
              <th colSpan={3} className="col-group">CTR</th>
              <th colSpan={3} className="col-group">CVR(uv)</th>
            </tr>
            <tr>
              {/* 销售额 3列 */}
              <th className="text-[9px]">{curWeek}</th>
              <th className="text-[9px] text-muted-foreground">{cmpWeek}</th>
              <th className="text-[9px]">{chgLabel}</th>
              {/* 销售占比 2列 */}
              <th className="text-[9px]">{curWeek}</th>
              <th className="text-[9px] text-muted-foreground">{cmpWeek}</th>
              {/* 曝光 3列 */}
              <th className="text-[9px]">{curWeek}</th>
              <th className="text-[9px] text-muted-foreground">{cmpWeek}</th>
              <th className="text-[9px]">{chgLabel}</th>
              {/* 曝光产出 3列 */}
              <th className="text-[9px]">{curWeek}</th>
              <th className="text-[9px] text-muted-foreground">{cmpWeek}</th>
              <th className="text-[9px]">{chgLabel}</th>
              {/* UV 3列 */}
              <th className="text-[9px]">{curWeek}</th>
              <th className="text-[9px] text-muted-foreground">{cmpWeek}</th>
              <th className="text-[9px]">{chgLabel}</th>
              {/* UV占比 2列 */}
              <th className="text-[9px]">{curWeek}</th>
              <th className="text-[9px] text-muted-foreground">{cmpWeek}</th>
              {/* UV产出 3列 */}
              <th className="text-[9px]">{curWeek}</th>
              <th className="text-[9px] text-muted-foreground">{cmpWeek}</th>
              <th className="text-[9px]">{chgLabel}</th>
              {/* CTR 3列 */}
              <th className="text-[9px]">{curWeek}</th>
              <th className="text-[9px] text-muted-foreground">{cmpWeek}</th>
              <th className="text-[9px]">{chgLabel}</th>
              {/* CVR 3列 */}
              <th className="text-[9px]">{curWeek}</th>
              <th className="text-[9px] text-muted-foreground">{cmpWeek}</th>
              <th className="text-[9px]">{chgLabel}</th>
            </tr>
          </thead>
          <tbody>
            <PlatformRow label="APP端" entry={app} chgLabel={chgLabel} />
            <PlatformRow label="WEB端" entry={web} chgLabel={chgLabel} />
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function DualPlatformTable({ weeks, wow, yoy }: Props) {
  return (
    <div>
      <SubTable title="环比" curWeek={weeks.cur} cmpWeek={weeks.prev} chgLabel="环比" app={wow.app} web={wow.web} />
      <SubTable title="同比" curWeek={weeks.cur} cmpWeek={weeks.yoy} chgLabel="同比" app={yoy.app} web={yoy.web} />
    </div>
  );
}
